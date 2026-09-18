# Decisiones Técnicas

Este documento registra decisiones técnicas o de diseño que no encajan directamente en otros documentos de análisis funcional (como el DER, Arquitectura o Historias de Usuario).

## 2026-09-16: Generación de fechas por defecto en MikroORM
**Contexto**: Al insertar nuevas entidades (Usuario, Pasaje, CuponUso) que tienen campos de fecha por defecto (`fechaRegistro`, `fechaReserva`, `fechaUso`), MikroORM y el driver de PostgreSQL daban error si no se enviaba el valor explícitamente desde el código, a pesar de tener configurado `.default('now()')`. El ORM no estaba resolviendo correctamente la inyección de la función SQL nativa en el statement de inserción.

**Decisión**: 
Se cambió la estrategia de definición de estos campos en los schemas de MikroORM. En lugar de usar solo `.default('now()')`, se implementó `.onCreate(() => new Date()).defaultRaw('now()')`. 
Esto asegura que:
1. A nivel de aplicación, MikroORM inyecta la fecha actual automáticamente mediante JavaScript/TypeScript justo antes de insertar el registro en la base de datos (gracias a `onCreate`).
2. A nivel de esquema de base de datos, la columna sigue teniendo el constraint `DEFAULT now()` (gracias a `defaultRaw`), manteniendo la consistencia si se insertaran datos por fuera de la aplicación.
3. Se solucionan los errores de inserción sin tener que mandar manualmente `new Date()` desde todos los servicios. En el caso del registro de usuario, se debió enviar explícitamente `fechaRegistro: new Date()` en el auth service para mantener coherencia en este flujo específico.

## 2026-09-18: HU-09 — Flujo Híbrido de Transferencia (Web + WhatsApp), Hold de 4 horas y Validación Admin
**Contexto**: Se evaluó el método de entrega del comprobante bancario. Se optó por el enfoque híbrido (Opción 1): el pasajero reserva en la web bloqueando el cupo por 4 horas (`hold`), recibe los datos bancarios y un enlace directo a WhatsApp para enviar el comprobante al administrador con un mensaje pre-cargado. El administrador valida el pago manualmente desde la app.

**Decisión**:
1. `POST /pasajes` para transferencia mantiene el bloqueo de fila `FOR UPDATE` sobre `viajes` y devuelve `fecha_expiracion_hold` (4h), `datos_transferencia` y `whatsapp_url`.
2. Se implementa la limpieza lazy de holds vencidos (§7) en `PasajeService.reservarPasaje()` (dentro del lock FOR UPDATE para liberar cupos de inmediato a nuevos pasajeros), en consultas de viajes (`ViajeService`), en reservas (`misReservas`) y en el listado de transferencias del administrador.
3. Se implementan los endpoints de administración: `GET /admin/pagos/pendientes` y `PATCH /admin/pagos/:id/validar` (aprobar confirma el pasaje y fija fechaPago; rechazar cancela el pasaje y libera el cupo).
4. Se mantiene disponible `POST /pasajes/:id/comprobante` como canal web alternativo si el usuario desea adjuntar el comprobante en la plataforma.

## 2026-09-18: HU-10 — Pagar en efectivo y Control de Morosidad (RN-05)
**Contexto**: Se implementa el flujo de reserva con pago en efectivo (RF-11). Por ser un método diferido sin cobro anticipado, se debe descontar el cupo de inmediato al confirmar sin ventana de espera, pero garantizando el cumplimiento de la regla de negocio RN-05: aquellos usuarios marcados como morosos (`es_moroso = true`, típicamente tras 3 inasistencias) no deben tener permitido seleccionar efectivo.

**Decisión**:
1. En `PasajeService.reservarPasaje()`, antes de abrir la transacción de base de datos o adquirir bloqueos, se consulta la entidad del usuario. Si `usuario.esMoroso === true` y `metodoPago === 'efectivo'`, se interrumpe la ejecución arrojando `HttpError(403)` con el mensaje: *"No podés elegir efectivo como método de pago porque tu cuenta figura como morosa por inasistencias previas. Por favor seleccioná Mercado Pago o transferencia bancaria."*.
2. Si el usuario moroso selecciona Mercado Pago o transferencia bancaria, la validación no bloquea y puede operar con normalidad.
3. Al reservar en efectivo, el cupo se incrementa de inmediato (`viaje.cuposOcupados += 1`) dentro del lock `FOR UPDATE` y `fechaExpiracionHold` queda en `null`. No caduca por el mecanismo lazy de holds.

