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

## 2026-09-18 al 2026-09-23: T-08/T-09 — Integración Google Maps (RF-16, HU-13)
**Contexto**: El chofer necesita ver la ruta óptima del día con el orden de paradas calculado automáticamente (RF-16, HU-13).

**Decisión**:
1. El servicio `GoogleMapsService` en `src/chofer/googlemaps.service.ts` encapsula las llamadas a la Directions API con `optimize_waypoints=true`.
2. Si `GOOGLE_MAPS_API_KEY` no está configurada, el endpoint `GET /chofer/viajes/:id/ruta` devuelve HTTP 503 con mensaje claro en vez de crashear.
3. Los domicilios de Rosario (texto libre) se envían como `address` a la API de Maps; las paradas fijas de ruta (pueblos intermedios) se envían con sus coordenadas (`lat`/`lng`) si están cargadas en la tabla `paradas`.
4. El endpoint devuelve tanto el `maps_url` (link para abrir en Google Maps del celular) como el orden optimizado de paradas con sus posiciones.

## 2026-09-19 al 2026-09-23: HU-12, HU-14 — Ver pasajeros del día y marcar documento no verificado (Chofer)
**Contexto**: El chofer necesita ver quiénes viajan ese día y poder marcar excepciones de verificación de DNI (HU-12, HU-14).

**Decisión**:
1. `GET /chofer/viajes/:id/pasajeros` devuelve solo información operativa: nombre, apellido, origen, destino y estado del pasaje. No expone datos de pagos ni estadísticas (RNF-02).
2. El endpoint solo muestra pasajes en estado `confirmada` o `pendiente_pago` (efectivo) — los cancelados y vencidos se filtran.
3. `PATCH /chofer/pasajes/:id/documento` permite marcar `documentoVerificado = false` (la marca es informativa, no bloquea ni genera alertas automáticas, según HU-14).
4. Por defecto, `documentoVerificado` nace como `null` (no verificado explícitamente en ningún sentido); el chofer solo actúa para registrar la excepción negativa.

## 2026-09-23: HU-15 — Validar comprobantes de transferencia (Administrador)
**Contexto**: El administrador necesita aprobar o rechazar transferencias dentro de las 4 horas del hold (HU-15, RF-21).

**Decisión**:
1. `GET /admin/pagos/pendientes` ejecuta la limpieza lazy de holds vencidos antes de devolver resultados, para que el admin solo vea transferencias que todavía están vigentes.
2. `PATCH /admin/pagos/:id/validar` acepta `{ accion: 'aprobar' | 'rechazar' }`. Al aprobar: `pago.estado = 'aprobado'`, `pasaje.estado = 'confirmada'`, `pago.fechaPago = now()`. Al rechazar: `pago.estado = 'rechazado'`, `pasaje.estado = 'cancelada'`, se decrementa `viaje.cuposOcupados`.
3. El panel frontend de administración implementado en `/frontend/src/pages/AdminPagos/` muestra el listado con countdown de expiración y permite aprobar/rechazar con un click.

## 2026-09-23: HU-03 — Recuperación de contraseña — Token SHA-256, almacenamiento seguro, modo consola
**Contexto**: Implementar la recuperación de contraseña (HU-03, RF-25). El proveedor de email SMTP no está definido todavía; se necesita que el flujo sea completo y testeable sin SMTP configurado.

**Decisión**:
1. **Token criptográfico**: se genera con `crypto.randomBytes(32).toString('hex')` (nativo de Node.js, 64 caracteres hex). No se agrega ninguna dependencia extra para esto.
2. **Almacenamiento seguro**: el token crudo nunca se persiste en la BD. Solo se guarda su hash SHA-256 (`crypto.createHash('sha256').update(token).digest('hex')`). Esto protege contra la exfiltración de tokens si la BD es comprometida.
3. **Tabla `password_reset_tokens`**: campos `token_hash` (VARCHAR 64, UNIQUE), `usuario_id` FK, `fecha_expiracion`, `usado` (BOOLEAN). Un token marcado como usado no puede reutilizarse aunque no haya expirado.
4. **Invalidación de tokens previos**: al solicitar un nuevo reset, los tokens anteriores del mismo usuario se marcan como `usado = true` para evitar acumulación y confusión.
5. **Modo consola (fallback)**: si `EMAIL_HOST` no está configurado en `.env`, el `EmailService` imprime el link de reset en los logs del servidor en vez de intentar conectarse a un SMTP. Permite testear el flujo completo localmente sin ninguna configuración de email.
6. **Modo SMTP**: cuando `EMAIL_HOST` se configure, el `EmailService` usa nodemailer y el envío es transparente sin cambios de código.
7. **Seguridad anti-enumeración**: `POST /auth/recuperar-password` siempre responde 200 aunque el email no exista, para no revelar qué emails están registrados en el sistema.
8. **Expiración**: configurable con `PASSWORD_RESET_EXPIRES_MINUTES` (default: 60 minutos).

## 2026-09-24: HU-11 — Serialización de misReservas como DTO plano

**Contexto**: `PasajeService.misReservas()` devuelve entidades MikroORM con relaciones anidadas (Viaje → Horario). Devolver la entidad cruda al cliente expone campos internos y puede generar problemas de serialización circular o referencias no resueltas.

**Decisión**:
1. El controller `misReservas` mapea la lista de `Pasaje[]` a un array de DTOs planos antes de responder. Cada DTO incluye: `id`, `fecha_viaje`, `hora_viaje`, `sentido` (leído de `viaje.horario.sentido`), `estado`, `fecha_reserva`, `metodo_pago`, `monto`, `estado_pago`, `fecha_expiracion_hold`, `origen` y `destino` (etiquetas legibles de parada o domicilio) y `viaje_id`.
2. Se agrega `viaje.horario` al `populate` de `PasajeService.misReservas()` para que el sentido esté disponible sin una query extra.
3. El campo `sentido` es la cadena cruda del enum backend (`colon_rosario` / `rosario_colon`); el frontend lo traduce a etiqueta legible con un mapa local.
4. El filtro futuras/pasadas se resuelve íntegramente en el frontend comparando `fecha_viaje` con la fecha actual; no se agrega filtrado en el endpoint para no duplicar lógica ni romper el contrato existente.
