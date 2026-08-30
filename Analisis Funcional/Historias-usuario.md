# Historias de Usuario
## Sistema de Reservas — Traffic Colón–Rosario

| | |
|---|---|
| **Proyecto** | Aplicación web de reserva y venta de pasajes para traffic (combi) |
| **Basado en** | Documento de Requisitos v2 (28/08/2026) |
| **Preparado por** | Mateo (desarrollador) |
| **Fase del proceso** | 3 de 7 — Minuta → Requerimientos → **Historias de Usuario** → DER → Diseño → Kanban → Código |

Formato: *Como \<rol\>, quiero \<acción\>, para \<objetivo\>*, con criterios de aceptación y trazabilidad a los requisitos (RF/RN) de origen. La columna **Prioridad** (Alta/Media/Baja) sirve como insumo directo para ordenar el backlog en la fase de Kanban.

---

## Épica 1 — Registro y cuenta

### HU-01 — Registrarme
**Como** pasajero, **quiero** registrarme con mi DNI, una contraseña y un email, **para** poder comprar pasajes y recuperar mi cuenta si olvido la contraseña.

**Criterios de aceptación:**
- El sistema rechaza el registro si el DNI ingresado ya está asociado a una cuenta existente.
- El DNI, la contraseña y el email son obligatorios.
- La contraseña se almacena de forma segura (hash), nunca en texto plano.

**Trazabilidad:** RF-02, RF-25, RN-01 · **Prioridad:** Alta

### HU-02 — Iniciar sesión
**Como** pasajero, **quiero** iniciar sesión con mi DNI y contraseña, **para** acceder a mi cuenta y comprar un pasaje.

**Criterios de aceptación:**
- El login solo se exige al momento de comprar, no para navegar el catálogo de viajes.
- Ante credenciales incorrectas, el sistema muestra un mensaje claro sin indicar cuál de los dos datos falló (por seguridad).

**Trazabilidad:** RF-02, RF-05 · **Prioridad:** Alta

### HU-03 — Recuperar contraseña
**Como** pasajero, **quiero** recuperar mi contraseña usando mi email, **para** volver a acceder a mi cuenta si la olvido.

**Criterios de aceptación:**
- El sistema envía un enlace o código de recuperación al email registrado.
- El enlace/código tiene un tiempo de expiración razonable.

**Trazabilidad:** RF-25 · **Prioridad:** Baja

---

## Épica 2 — Navegación y selección de viaje

### HU-04 — Ver viajes disponibles
**Como** visitante (sin necesidad de loguearme), **quiero** ver los viajes disponibles, **para** decidir si quiero comprar un pasaje.

**Criterios de aceptación:**
- El catálogo de viajes es accesible sin iniciar sesión.
- Se muestran los horarios fijos disponibles según el sentido del viaje.

**Trazabilidad:** RF-01, RF-03 · **Prioridad:** Alta

### HU-05 — Elegir sentido, fecha y puntos del viaje
**Como** pasajero, **quiero** elegir el sentido del viaje (Colón→Rosario o Rosario→Colón), la fecha, y mi punto de origen/parada y destino, **para** reservar el trayecto que necesito.

**Criterios de aceptación:**
- Si elijo un pueblo intermedio como origen/destino, el sistema me indica que el punto de encuentro es fijo, al costado de la ruta (no puerta a puerta).
- Si el destino es Rosario, se solicita el domicilio; si el origen es Rosario (viaje de vuelta), también se solicita el domicilio de partida y destino(Colon - Pueblo intermedio).

**Trazabilidad:** RF-03 · **Prioridad:** Alta

### HU-06 — Ver el precio antes de confirmar
**Como** pasajero, **quiero** ver el precio del pasaje, incluyendo el descuento de "primera vez" si corresponde, **para** saber cuánto voy a pagar antes de confirmar la compra.

**Criterios de aceptación:**
- El precio mostrado refleja si es mi primer viaje (según mi DNI) o no.
- El precio final puede variar según el método de pago que elija más adelante (ver Épica 3).

**Trazabilidad:** RF-04, RF-14 · **Prioridad:** Alta

---

## Épica 3 — Compra y pago

### HU-07 — Completar datos de la reserva
**Como** pasajero, **quiero** confirmar mi compra indicando mi punto de origen/parada y domicilio de destino, **para** que el chofer sepa dónde subirme y bajarme.

**Criterios de aceptación:**
- No se vuelven a pedir nombre, apellido ni DNI (ya se conocen desde la cuenta).
- Si no estoy logueado al momento de confirmar, el sistema me pide iniciar sesión o registrarme antes de continuar.

**Trazabilidad:** RF-05, RF-06 · **Prioridad:** Alta

### HU-08 — Pagar con Mercado Pago
**Como** pasajero, **quiero** pagar con Mercado Pago (checkout), **para** que mi lugar se confirme al instante.

**Criterios de aceptación:**
- Al aprobarse el pago, el cupo se descuenta de inmediato y la reserva queda confirmada.
- Si el cupo se agotó mientras completaba el pago, el sistema informa el error y no permite continuar (evita vender de más).

**Trazabilidad:** RF-07, RF-08, RF-12 · **Prioridad:** Alta

### HU-09 — Pagar por transferencia
**Como** pasajero, **quiero** pagar por transferencia bancaria y subir el comprobante, **para** reservar mi lugar mientras se valida el pago.

**Criterios de aceptación:**
- Al elegir transferencia, el cupo queda reservado ("hold") por 4 horas.
- Si el administrador no valida el comprobante dentro de las 4 horas, el cupo se libera automáticamente y la reserva queda como vencida.
- Puedo ver el estado de mi reserva (pendiente/confirmada/vencida) desde mi cuenta.

**Trazabilidad:** RF-07, RF-09, RF-10 · **Prioridad:** Alta

### HU-10 — Pagar en efectivo
**Como** pasajero, **quiero** reservar mi lugar pagando en efectivo, **para** no tener que pagar por adelantado.

**Criterios de aceptación:**
- Al confirmar con efectivo, el cupo se descuenta de inmediato (no hay ventana de espera).
- Si ya fui marcado como moroso, el sistema no me permite elegir efectivo como método de pago.

**Trazabilidad:** RF-07, RF-11 · **Prioridad:** Alta

### HU-11 — Ver historial de viajes
**Como** pasajero, **quiero** ver el historial de mis viajes anteriores, **para** tener un registro de mis compras.

**Criterios de aceptación:**
- Se listan mis reservas pasadas y futuras, con fecha, sentido del viaje y estado.

**Trazabilidad:** RF-13 · **Prioridad:** Media

---

## Épica 4 — Chofer

### HU-12 — Ver pasajeros del día
**Como** chofer, **quiero** ver la lista de pasajeros del viaje del día con sus puntos de origen/parada y destino, **para** saber a quién y dónde llevar.

**Criterios de aceptación:**
- La lista solo muestra información operativa (nombre, punto de origen/parada, destino), sin datos sensibles del negocio (dinero, estadísticas).
- Se actualiza si hay cambios de último momento en las reservas del día.

**Trazabilidad:** RF-15, RNF-02 · **Prioridad:** Alta

### HU-13 — Ver ruta óptima del día
**Como** chofer, **quiero** ver la ruta del día calculada automáticamente con el orden óptimo de paradas, **para** no perder tiempo planificando el recorrido.

**Criterios de aceptación:**
- La ruta se genera integrando la API de Google Maps con las paradas confirmadas del día.
- Se puede abrir directamente en la app de mapas del celular.

**Trazabilidad:** RF-16 · **Prioridad:** Alta

### HU-14 — Marcar documento no verificado
**Como** chofer, **quiero** poder marcar a un pasajero como "documento no verificado" si detecto una inconsistencia con el DNI físico en su primer viaje, **para** dejar registro de la situación.

**Criterios de aceptación:**
- Por defecto, todo pasajero en su primer viaje figura como verificado; el chofer solo actúa para marcar la excepción.
- La marca queda guardada como dato informativo (sin bloqueos ni alertas automáticas).

**Trazabilidad:** RF-17 · **Prioridad:** Media

---

## Épica 5 — Administrador

### HU-15 — Validar comprobantes de transferencia
**Como** administrador, **quiero** validar o rechazar comprobantes de transferencia dentro de las 4 horas, **para** confirmar o liberar el cupo reservado.

**Criterios de aceptación:**
- El comprobante del pasajero lo veo por whatsapp (fuera de alcance del sistema), admin solo aprueba.
- Al aprobar, el cupo queda confirmado; al rechazar (o si se vence el plazo), el cupo se libera.

**Trazabilidad:** RF-21, RN-06 · **Prioridad:** Alta

### HU-16 — Marcado automático de moroso
**Como** administrador, **quiero** que el sistema marque automáticamente como moroso a quien no se presente 3 veces habiendo pagado en efectivo, **para** evitar reservas fantasma futuras.

**Criterios de aceptación:**
- El sistema lleva un contador de inasistencias en efectivo por pasajero.
- Al llegar a 3, el pasajero queda marcado como moroso y no puede volver a elegir efectivo (ver HU-10).

**Trazabilidad:** RF-19, RN-05 · **Prioridad:** Media

### HU-17 — Reactivar a un pasajero moroso
**Como** administrador, **quiero** poder reactivar manualmente a un pasajero marcado como moroso, **para** darle una segunda oportunidad si corresponde.

**Criterios de aceptación:**
- Puedo ver la lista de pasajeros morosos y reactivarlos individualmente.

**Trazabilidad:** RF-20 · **Prioridad:** Media

### HU-18 — Deshabilitar cuentas
**Como** administrador, **quiero** poder deshabilitar la cuenta de un usuario, **para** bloquear su acceso en casos excepcionales.

**Criterios de aceptación:**
- Un usuario deshabilitado no puede iniciar sesión ni comprar.

**Trazabilidad:** RF-18 · **Prioridad:** Baja

### HU-19 — Ver estadísticas
**Como** administrador, **quiero** ver estadísticas de recaudación y uso por método de pago, **para** entender cómo va el negocio.

**Criterios de aceptación:**
- Puedo ver totales recaudados por período y desglosados por método de pago (Mercado Pago, transferencia, efectivo).

**Trazabilidad:** RF-22 · **Prioridad:** Baja

### HU-20 — Editar horarios
**Como** administrador, **quiero** poder editar los horarios de los viajes, **para** ajustar la operación sin depender del desarrollador.

**Criterios de aceptación:**
- Puedo modificar día y horario de los viajes fijos existentes.

**Trazabilidad:** RF-23 · **Prioridad:** Baja

### HU-21 — Configurar el descuento por transferencia/efectivo
**Como** administrador, **quiero** poder configurar el monto del descuento por pagar en transferencia o efectivo, **para** poder cambiarlo sin depender de una modificación de código.

**Criterios de aceptación:**
- Puedo definir el descuento como un monto fijo o un porcentaje (a definir junto con el cliente cuando se determine el monto).

**Trazabilidad:** RF-24 · **Prioridad:** Baja

---

## Resumen de trazabilidad

Todas las historias cubren los requisitos funcionales del documento de Requisitos, salvo los puramente no funcionales (RNF-01, RNF-03 a RNF-07), que no generan una historia propia porque son atributos de calidad transversales — se van a validar como criterios de aceptación dentro de las historias de compra y en las decisiones de diseño técnico de la fase 5.

---
*Documento vivo: los IDs de HU se mantienen estables a lo largo del proyecto.*
