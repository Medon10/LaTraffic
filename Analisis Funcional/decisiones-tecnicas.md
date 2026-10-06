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

## 2026-09-24: Shell del Panel de Administrador (HU-15 a HU-23)

**Contexto**: La pantalla de validación de comprobantes (HU-15, `PanelAdminPage`) existía como una página aislada en `/admin/pagos`, sin layout compartido ni protección de ruta real en el frontend. Al empezar a agregar más secciones admin (morosos, cuentas, estadísticas, horarios, cupones — HU-16 a HU-23), se necesitaba un shell navegable con protección de rol consistente.

**Decisión**:

1. **`AdminGuard` (nuevo — `componentes/AdminGuard.tsx`)**: Componente React que envuelve todas las rutas `/admin/*`. Lee el estado de sesión desde `localStorage` (patrón existente: `getUser()` + `isAuthenticated()`) y escucha el evento `auth-change`. Sin sesión → redirige a `/login` preservando `state.from` para volver después del login. Con sesión pero rol distinto de `'administrador'` → redirige a `/403`. Este guard es UX (evita flash); la autorización real sigue siendo responsabilidad del backend (`verificarToken + autorizar(Rol.ADMINISTRADOR)` en `admin.routes.ts`, T-04).

2. **`AdminLayout` (nuevo — `pages/PanelAdmin/AdminLayout.tsx`)**: Wrapper con sidebar izquierdo fijo en desktop (256 px) y colapsable vía overlay en móvil. Topbar visible solo en mobile. Sin Navbar/Footer globales — el panel admin tiene su propio chrome. Usa `<Outlet />` de react-router para renderizar la sección activa. Maneja el logout vía `authService.logout()` (ya limpia cookie + localStorage + dispara `auth-change`).

3. **Migración de `PanelAdminPage` → `TransferenciasPage`**: El componente de validación de comprobantes se renombró para seguir la convención de secciones (`<NombreSeccion>Page`). Se quitó `page-container` del div raíz (el `admin-content` del layout ya provee el padding). Sin cambios en lógica.

4. **Placeholders (`AdminPlaceholder.tsx`)**: Componente genérico con ícono, badge de HU y descripción de la sección. Las secciones futuras (morosos, cuentas, estadísticas, horarios, cupones) se declaran como rutas en `App.tsx` con `<AdminPlaceholder>` — tienen URL funcional pero sin lógica de negocio. Se completan en HU-16 a HU-23.

5. **Routing (`App.tsx`)**: Las rutas `/admin/*` se definen como hijas de `<AdminGuard><AdminLayout /></AdminGuard>`. La ruta índice `/admin` redirige a `/admin/transferencias`. La URL legacy `/admin/pagos` redirige a `/admin/transferencias` con `<Navigate replace>`.

6. **Por qué no usar un `<ProtectedRoute>` genérico**: Se optó por un guard específico para admin (`AdminGuard`) en lugar de un componente genérico de `ProtectedRoute` parametrizado por rol. Razón: el panel admin tiene su propio layout (sin Navbar global), lo que ya obliga a un wrapper dedicado. Unificar guard + layout en un solo árbol de rutas es más claro que combinar un ProtectedRoute genérico con un AdminLayout separado.

## 2026-09-28: HU-16 — Marcado automático de moroso al cerrar viaje (RN-05)

**Contexto**: Al finalizar un viaje, el sistema debe detectar los pasajes con estado `no_show` cuyo pago fue en efectivo, incrementar el contador `inasistenciasEfectivo` del usuario correspondiente y activar `esMoroso = true` si llega a 3. Esta es lógica de backend automática, disparada exclusivamente por el cierre del viaje; no tiene UI propia en el panel admin (esa parte es HU-17).

**Decisión**:

1. **Dónde vive la lógica**: se implementó como método `cerrarViaje(viajeId)` en `ViajeService` (`src/viajes/viaje.service.ts`). Se decidió no colocarla en `AdminService` porque el cierre de un viaje es una responsabilidad de dominio del viaje en sí, no una acción exclusiva del módulo de administración de usuarios.

2. **Endpoint**: `PATCH /viajes/:id/finalizar`, protegido con `verificarToken + autorizar(Rol.ADMINISTRADOR)` directamente en `viaje.routes.ts`. Las rutas GET de viajes siguen siendo públicas; solo este PATCH requiere autenticación. Se añadieron los imports de `auth.middleware` y `Rol` al archivo de rutas.

3. **Transacción única**: todo el cierre — cambiar el estado del viaje a `FINALIZADO`, buscar los `no_show` en efectivo e incrementar los contadores de usuario — se ejecuta dentro de `em.transactional()` para garantizar consistencia. Si cualquier parte falla, ningún cambio queda parcialmente persistido.

4. **Filtro de pasajes**: la query busca explícitamente `{ estado: NO_SHOW, pago: { metodo: EFECTIVO } }` sobre el viaje. Pasajes confirmados, cancelados o con otro método de pago no se tocan.

5. **Idempotencia del flag `esMoroso`**: la condición `!usuario.esMoroso && inasistenciasEfectivo >= 3` garantiza que el flag solo se activa una vez y que el contador sigue acumulándose en viajes futuros sin pisar el estado ya marcado.

6. **Respuesta**: el endpoint retorna `{ viajeId, noShowsEfectivo, nuevosMorosos, mensaje }`. Esto permite al frontend (HU-17) o a cualquier integración futura saber cuántos usuarios se impactaron sin tener que hacer queries adicionales.

7. **Guardas de estado**: el método rechaza con 400 si el viaje ya es `FINALIZADO` (doble cierre) o `CANCELADO`. Cualquier estado intermedio (PROGRAMADO, EN_CURSO) es válido para cerrar.

## 2026-09-28: HU-17 — Reactivar pasajero moroso (RF-20)

**Contexto**: El administrador necesita poder reactivar manualmente a un pasajero marcado como moroso, reseteando su flag y contador para que vuelva a poder reservar en efectivo.

**Decisión**:

1. **Endpoints en `AdminService`**: se agregaron `listarMorosos()` (`GET /admin/usuarios`) y `reactivarMoroso(id)` (`PATCH /admin/usuarios/:id/reactivar-moroso`). Conviven con los endpoints de pagos en `admin.routes.ts` y `admin.controller.ts`; no se creó un router separado porque el módulo admin es único y la cantidad de rutas es manejable.

2. **`GET /admin/usuarios` sin filtro de query en el backend**: el backend devuelve todos los usuarios morosos directamente (sin parsear `?moroso=true`). El query param se envía desde el frontend por claridad de semántica REST, pero el backend lo ignora ya que el único caso de uso actual es listar morosos. Si en el futuro se agrega gestión general de usuarios (HU-18), se extenderá el filtrado allí.

3. **`reactivarMoroso` es idempotente en la guarda**: si el usuario ya no es moroso, el endpoint devuelve 400 en vez de silenciar la operación. Evita que una doble llamada rápida del frontend pase sin control.

4. **Reset completo**: al reactivar, se pone `esMoroso = false` e `inasistenciasEfectivo = 0`. No se conserva el contador histórico; si el administrador tomó la decisión de reactivar, se asume que le da la pizarra en blanco. Es la interpretación más simple y consistente con la descripción de HU-17.

5. **Frontend — `MorososPage.tsx`**: sigue exactamente el mismo patrón de `TransferenciasPage` (carga inicial con `useRef` para evitar doble fetch en Strict Mode, estado `idle/loading/success/error`, `refrescando` silencioso, procesados en sesión). La tarjeta `TarjetaMoroso` muestra nombre, DNI, email e inasistencias, con un botón "Reactivar" que da feedback inline inmediato y mueve la fila a la sección "Reactivados en esta sesión".

6. **Sidebar activado**: se cambió `disponible: false → true` en la entrada `morosos` del array `SECCIONES` de `AdminLayout.tsx`, lo que convierte el ítem de "Pronto" a `<NavLink>` funcional en el panel.


## 2026-09-29: HU-18 — Deshabilitar/Habilitar cuentas de usuario

**Contexto**: El administrador necesita poder deshabilitar una cuenta (`activo = false`) para que el usuario no pueda iniciar sesión, o volver a habilitarla. El campo `activo` ya existía en la entidad Usuario y el servicio de login ya lo chequeaba (lanzaba 403 si !activo), por lo que no se requirió migración de base de datos.

**Decisión**:

1. **PATCH /admin/usuarios/:id/estado**: body `{ activo: boolean }`. Validado con Zod (`cambiarEstadoSchema`). Devuelve 403 si se intenta aplicar sobre una cuenta con `rol = 'administrador'`. El check de `activo` en el login ya estaba implementado en `auth.service.ts` — no necesitó cambios.

2. **GET /admin/cuentas/usuarios**: endpoint separado del GET /admin/usuarios (morosos) para no mezclar semántica. Devuelve todos los usuarios con `rol != 'administrador'` ordenados por apellido/nombre. La ruta `/cuentas/usuarios` evita colisión con el endpoint de morosos.

3. **Frontend — CuentasPage.tsx**: lista con filtros locales (por rol, por estado activo/inactivo, búsqueda por nombre/email/DNI). Toggle optimista: actualiza el estado local inmediatamente; si hay error de backend, se muestra inline en la tarjeta. Sigue el mismo patrón que MorososPage.tsx.

4. **Sidebar activado**: `disponible: false → true` para la entrada `cuentas` en `AdminLayout.tsx`; el placeholder fue reemplazado por `CuentasPage` en `App.tsx`.

5. **Bug corregido de paso**: en `admin.routes.ts` había un `router.get('/usuarios')` duplicado (uno devolvía un mensaje estático vacío, el otro el handler de morosos). Se eliminó el primero.

## 2026-09-29: HU-19 — Estadísticas de recaudación (RF-22)

**Contexto**: El administrador necesita ver la recaudación total y desglosada por método de pago, con ingresos mensuales históricos (RF-22). No hay entidad nueva — los datos ya existen en pagos, pasajes, viajes y usuarios.

**Decisión**:

1. **GET /admin/estadisticas**: endpoint de solo lectura, sin parámetros. Devuelve un objeto con 5 secciones: `recaudacion` (total + por método), `pasajes` (total + por estado), `ingresosMensuales` (últimos 12 meses), `usuarios` (totales pasajeros/choferes/inactivos/morosos) y `ocupacion` (viajes finalizados + % promedio).

2. **SQL nativo vía em.getConnection().execute()**: se eligió sobre las APIs de MikroORM porque las queries usan FILTER, TO_CHAR, INTERVAL y NULLIF — construcciones de PostgreSQL que el QueryBuilder no maneja bien sin volverse ilegible. Las 5 queries corren en Promise.all() para minimizar latencia.

3. **Solo pagos aprobado** para los totales de dinero: los pagos `pendiente`, `rechazado` o `vencido` no representan dinero cobrado y podrían distorsionar los números operativos del negocio.

4. **Frontend — EstadisticasPage.tsx**: 4 tarjetas KPI, barras proporcionales por método de pago, gráfico de barras verticales CSS-only para los 12 meses (sin librería externa), tabla compacta con los mismos datos, y chips por estado de pasaje. CSS propio en `estadisticas.css` para no inflar `panelAdmin.css`.

5. **Sidebar activado**: `disponible: false → true` para la entrada `estadisticas` en `AdminLayout.tsx`.

## 2026-09-30: HU-20 — Editar horarios (GET/POST/PATCH /admin/horarios)
**Contexto**: Se implementó la gestión de horarios (plantillas recurrentes) desde el panel de administrador, conforme a RF-23. Los viajes ya generados guardan su propia `hora` copiada al momento de creación (DER §1.3), por lo que editar un horario no los afecta retroactivamente.

**Decisiones**:

1. **Rutas en `horario.admin.routes.ts`** (distinto de `horario.routes.ts` existente): las rutas admin se montaron en un archivo separado para no mezclar con las rutas públicas, siguiendo el patrón de `admin.routes.ts`.

2. **Validación de duplicados a nivel servicio**: al crear o editar se verifica que no exista otro horario con la misma combinación (sentido + diaSemana + hora). Conflicto devuelve 409. No se agrega índice único en BD porque el volumen es pequeño y la validación en servicio es suficiente.

3. **diaSemana como string enum cerrado**: validado contra lista fija en español (`lunes`...`domingo`) para mantener legibilidad en la BD y la API, consistente con el campo existente en la entidad.

4. **No genera viajes**: `crearHorario` y `editarHorario` solo tocan la tabla `horarios`. La generación de viajes a partir de horarios es responsabilidad de un proceso separado (futuro HU-21).

5. **Frontend — HorariosPage.tsx + horariosPage.css**: tarjetas en CSS Grid (auto-fill 280px), formulario inline con scroll automático, chips de filtro por sentido y estado, toggle switch para `activo`, nota informativa al editar sobre la integridad de viajes generados.

6. **Sidebar activado**: `disponible: false → true` para la entrada `horarios` en `AdminLayout.tsx`.

## 2026-09-30: T-14 — Mapa interactivo de domicilio (Maps JavaScript API + Places API)
**Contexto**: Los pasajeros necesitan poder indicar su domicilio de origen/destino en Rosario de forma precisa. T-09 construyó el componente MapaPicker y los campos de coordenadas en la entidad Pasaje, pero no terminó de conectar el circuito completo (schema Zod sin coordenadas, controller sin pasarlas, useCheckout con placeholder).

**Decisión**:
1. **API Key separada por tipo**: La key del backend (Directions API, restringida por IP) se mantiene como GOOGLE_MAPS_API_KEY en `backend/.env`. La key del frontend (Maps JavaScript API + Places API) vive como VITE_GOOGLE_MAPS_API_KEY en `frontend/.env` y debe restringirse por HTTP referrer al dominio de producción, no por IP. Ambas coexisten en el mismo proyecto de Google Cloud.
2. **Schema Zod**: Se agregan `lat_origen`, `lon_origen`, `lat_destino`, `lon_destino` (todos `z.number().finite().optional()`) al schema `crearPasajeSchema`. Son opcionales — si el usuario usó texto libre sin el mapa, simplemente no vienen.
3. **Controller**: Se pasan los cuatro campos de coordenadas del DTO al `ReservarPasajeDto` del service. El service ya manejaba `null` correctamente (ya existía desde T-09).
4. **Frontend service**: `pasajesService.crearPasaje()` añade los campos de coordenadas al tipo `CrearPasajePayload` y los incluye en el `POST /pasajes` solo si son distintos de `null` (spread condicional).
5. **useCheckout**: Se reemplaza el placeholder `setTimeout` por una llamada real a `pasajesService.crearPasaje()`. El payload arma el origen/destino según el sentido del viaje (`colon-rosario` vs `rosario-colon`), incluyendo lat/lon del domicilio solo si el usuario usó el MapaPicker. El `metodo_pago` defaultea a `'efectivo'` temporalmente hasta que se implemente el step de selección de pago (HU-08/09/10).
6. **Error handling**: `handleConfirmar` captura errores de API y los expone vía `errorApiReserva`; el checkout renderiza un banner inline con el mensaje sin resetear el formulario.
7. **Fallback texto libre**: Si `VITE_GOOGLE_MAPS_API_KEY` no está configurada, el hook `useGoogleMaps` setea error y `MapaPicker` renderiza un input de texto plano — la reserva funciona igual sin coordenadas.

## 2026-10-01: HU-24 — Seleccionar domicilio con mapa (integración completa del flujo)
**Contexto**: T-14 construyó el componente MapaPicker y lo integró en el Checkout, pero el flujo no cerraba porque SeleccionViaje nunca resolvía el `viaje_id` real del backend, por lo que `POST /pasajes` siempre recibía `viaje_id = 0`.

**Decisión**:
1. **Resolución asíncrona de `viaje_id`**: `handleReservar` en `SeleccionViajePage` se convierte en `async`. Al presionar "Continuar", llama a `GET /viajes?sentido=&fecha=` para obtener el viaje real del backend, extrae `viajes[0].id` y lo pasa como `viaje_id` en los query params del checkout.
2. **Nombrado correcto de paradas**: se reemplaza el genérico `paradaId` por `parada_origen_id` (cuando sentido es `colon-rosario`, la parada es el origen) o `parada_destino_id` (cuando es `rosario-colon`, la parada es el destino). `useCheckout` ya leía estos nombres desde T-14.
3. **Fallback silencioso**: si `getViajes()` falla (backend no disponible en dev), `viaje_id` queda en 0 y la navegación igual ocurre; el checkout mostrará el error de la API al intentar confirmar.
4. **UX: botón de loading**: el CTA muestra "Buscando viaje..." y se deshabilita durante la consulta asíncrona para evitar doble click.
5. **`chofer.service.ts`**: la lógica de preferencia de coordenadas ya estaba implementada desde T-09 (`latOrigen`/`lonOrigen` → `WaypointCoords`, fallback a `WaypointAddress`). HU-24 confirma y documenta que este circuito está cerrado end-to-end.
6. **Nuevo tipo `Viaje`** en `frontend/src/types/viaje.ts` y nueva función `viajesService.getViajes()` con normalización de sentido (guión → guión bajo para el backend).
7. **Captura temprana de coordenadas**: Se reemplazó el `<input>` de texto libre en `SeleccionViajePage` por el componente `MapaPicker`. Al seleccionar el domicilio, las coordenadas se envían por query params (`lat`, `lng`) a `CheckoutPage` (`useCheckout.ts` las inicializa en su estado), asegurando que si el usuario completa el domicilio en el primer paso, no tenga que re-ubicar el pin en el Checkout.

## 2026-10-04: HU-23 — Gestión de cupones de descuento (admin)

**Contexto**: El administrador necesita poder crear y gestionar cupones de descuento desde el panel admin, sin depender de un cambio de código (RF-27). La entidad `Cupon` y la lógica de validación (HU-22) ya existían; solo faltaban los endpoints de administración y la pantalla correspondiente.

**Decisión**:
1. **Código no editable post-creación**: El `PATCH /admin/cupones/:id` no permite cambiar el campo `codigo`. Razón: ya pueden existir registros en `CuponUso` que referencian el cupón por su ID, pero el código es la clave de negocio que el pasajero conoce y que puede estar impresa o comunicada. Cambiar el código rompería la trazabilidad y confundiría a usuarios que ya lo tienen. Si se necesita un código diferente, la solución es desactivar el cupón viejo y crear uno nuevo.
2. **El código se normaliza a mayúsculas**: tanto el backend (`crearCupon` en `CuponService`) como el frontend (antes de enviar el DTO) hacen `toUpperCase()` sobre el código. Esto garantiza uniformidad y evita duplicados case-sensitive que el índice UNIQUE no captaría si hubiera colación case-sensitive.
3. **Archivos creados**:
   - `backend/src/cupones/cupon.admin.controller.ts` — controlador con `listar`, `crear`, `actualizar`.
   - `backend/src/cupones/cupon.admin.routes.ts` — router montado en `/admin/cupones`, protegido con `verificarToken + autorizar(ADMINISTRADOR)`.
   - Métodos `listarCupones`, `crearCupon`, `actualizarCupon` agregados a `CuponService`.
   - `frontend/src/pages/PanelAdmin/CuponesPage.tsx` — página con tabla de cupones + formulario de creación.
   - `frontend/src/pages/PanelAdmin/cuponesPage.css` — estilos propios.
4. **Toggle activo/inactivo inline**: La tabla de cupones permite activar/desactivar con un clic directamente (llama a `PATCH /admin/cupones/:id` con solo `{ activo: boolean }`). No hay pantalla de edición full-form — los campos de tipo, valor y vigencia se configuran al crear el cupón y raramente cambian; si cambian, el admin puede desactivar y crear uno nuevo. Esto mantiene la UI simple.
5. **Sidebar activado**: `disponible: false → true` para la entrada `cupones` en `AdminLayout.tsx`; el `AdminPlaceholder` fue reemplazado por `CuponesPage` en `App.tsx`.

## 2026-10-05: Ajustes de permisos de reserva, provisión de viajes y rediseño de Cupones

**Contexto**: Se detectaron tres inconvenientes: (1) las cuentas con rol `administrador` o `chofer` no podían reservar ni pagar pasajes por restricción de rol en middleware (HTTP 403); (2) al intentar reservar con usuario no admin, fallaba la validación de Zod con `viaje_id: "Too small: expected number to be >0"` debido a que la tabla `viajes` no contenía registros y la BD no contaba con un seed inicial de paradas y horarios; (3) la sección de "cupones" del panel admin requería una interfaz acorde al sistema visual del panel y faltaba un acceso directo para regresar a la web pública.

**Decisión**:
1. **Permisos de reserva ampliados**: en `pasaje.routes.ts` (`POST /pasajes`, `GET /pasajes/mis-reservas`, `POST /pasajes/:id/comprobante`) y `pago.routes.ts` (`POST /pagos/mercadopago/preferencia`), se amplió la guarda de roles a `autorizar(Rol.PASAJERO, Rol.ADMINISTRADOR, Rol.CHOFER)`. Cualquier usuario autenticado puede reservar y abonar sus propios viajes.
2. **Seed inicial y auto-generación de viajes**:
   - Se implementó `seedInitialDefaults` en el bootstrap del backend (`src/shared/seed-defaults.ts`) que garantiza la existencia de las 3 paradas fijas de recorrido, los 2 horarios regulares y el cupón `PRIMERVIAJE` si las tablas están vacías.
   - En `ViajeService.listar`, cuando se solicita una fecha puntual (`filtros.fecha`), si no existe aún un viaje para esa fecha pero coincide con el día de la semana de un horario activo, se genera y persiste automáticamente el viaje programado (`capacidadTotal: 14`, `cuposOcupados: 0`).
3. **Guardas en frontend**:
   - En `SeleccionViajePage.tsx`: se impide la navegación al checkout si `viajeId <= 0` y se muestra un banner explicativo al usuario.
   - En `useCheckout.ts`: se valida `viajeId > 0` antes de invocar la API, evitando envíos erróneos con `viaje_id: 0`.
4. **Botón para volver a Home**: en `AdminLayout.tsx` y `adminLayout.css`, se añadió un enlace destacado "Volver a la web" en el pie del sidebar y un botón con icono en la topbar móvil y de cabecera.
5. **Rediseño visual de Cupones**: se reescribió `cuponesPage.css` y `CuponesPage.tsx` eliminando colores oscuros desconectados del resto del sistema. La pantalla ahora implementa `.panel-admin`, tarjetas KPI de métricas, input de código con normalización a mayúsculas, filtros rápidos por estado (todos / activos / inactivos), buscador dinámico y switch interactivo para activar o pausar cupones.

