# Documento de Requisitos
## Sistema de Reservas — Traffic Colón–Rosario

| | |
|---|---|
| **Proyecto** | Aplicación web de reserva y venta de pasajes para traffic (combi) |
| **Basado en** | Minuta de Relevamiento v3 (28/08/2026) |
| **Preparado por** | Mateo (desarrollador) |
| **Fase del proceso** | 2 de 7 — Minuta → **Requerimientos** → HU → DER → Diseño → Kanban → Código |

---

## 1. Alcance

El sistema cubre tres frentes: la **compra de pasajes** por parte del pasajero, la **operación del viaje** por parte del chofer, y la **gestión del negocio** por parte del administrador (dueño). Quedan fuera de alcance (ver Minuta §10): diseño visual definitivo, integración de WhatsApp con la plataforma, reservas manuales fuera de la app y notificaciones al pasajero.

Cada requisito referencia la sección de la Minuta de la que se desprende (columna **Origen**), para mantener la trazabilidad entre relevamiento y requisitos.

---

## 2. Requisitos funcionales

### 2.1 Módulo Pasajero / Compra

| ID | Descripción | Origen |
|---|---|---|
| RF-01 | El sistema debe permitir navegar el catálogo de viajes sin necesidad de iniciar sesión. | Minuta §5 |
| RF-02 | El sistema debe requerir el número de documento (DNI) como identificador único al registrarse, bloqueando el alta de una cuenta con un DNI ya registrado. | Minuta §5 — mecanismo definido en §5 de este documento |
| RF-03 | El sistema debe permitir seleccionar sentido del viaje (Colón→Rosario / Rosario→Colón), fecha, punto de origen/parada y destino. | Minuta §3, §6 |
| RF-04 | El sistema debe mostrar el precio del pasaje, aplicando el descuento de "primera vez" cuando corresponda. | Minuta §5, §6, §7 |
| RF-05 | El sistema debe exigir inicio de sesión o registro recién al momento de confirmar la compra, no antes. | Minuta §6 |
| RF-06 | El sistema debe capturar el punto de origen/parada y el domicilio al confirmar la reserva (nombre, apellido y DNI ya se conocen desde la cuenta, al usarse el DNI como identificador de registro). | Minuta §6 — ajustado tras definir RF-02 |
| RF-07 | El sistema debe permitir elegir método de pago: Mercado Pago (QR), transferencia bancaria o efectivo. | Minuta §6, §7 |
| RF-08 | El sistema debe procesar el pago con Mercado Pago y confirmar el cupo de forma inmediata al aprobarse. | Minuta §7 |
| RF-09 | El sistema debe permitir adjuntar el comprobante de transferencia al momento de reservar. | Minuta §7 |
| RF-10 | El sistema debe reservar ("hold") el cupo por 4 horas cuando el pago es por transferencia, liberándolo automáticamente si no se valida en ese plazo. | Minuta §7 |
| RF-11 | El sistema debe permitir reservar pagando en efectivo, descontando el cupo de forma inmediata al confirmar la reserva. | Minuta §7 — confirmado |
| RF-12 | El sistema debe impedir que se reserven más de 14 lugares por viaje, incluso ante reservas simultáneas. | Minuta §4, §7 |
| RF-13 | El sistema debe registrar el historial de viajes de cada pasajero. | Minuta §5 |
| RF-14 | El sistema debe aplicar el descuento de "primera vez" mediante un cupón de uso único por persona, no por cuenta. *(actualizado — ver revisión de esta fecha)* | Minuta §5, §8 |
| RF-25 | El sistema debe asociar un email a la cuenta, utilizado para recuperar la contraseña y, opcionalmente, para enviar en el futuro ofertas o promociones. | Confirmado por el cliente (28/08/2026) |
| RF-26 | El sistema debe permitir al pasajero ingresar un código de cupón al confirmar la reserva, validando vigencia y que no haya sido usado antes por esa persona si el cupón es de uso único, y aplicando el descuento correspondiente. | Propuesta del usuario — reemplaza el mecanismo anterior de RF-14 |

### 2.2 Módulo Chofer

| ID | Descripción | Origen |
|---|---|---|
| RF-15 | El sistema debe mostrarle al chofer la lista de pasajeros del viaje del día, con su punto de origen/parada y domicilio o punto de destino. | Minuta §9.1 |
| RF-16 | El sistema debe integrar la ruta del día con la API de Google Maps, calculando el orden óptimo de paradas automáticamente. | Minuta §9.1 |
| RF-17 | El sistema debe asumir el documento de cada pasajero como verificado por defecto en su primer viaje; el chofer solo debe poder marcarlo como "no verificado" si detecta una inconsistencia con el DNI físico presentado. | Minuta §8, §9.1 — confirmado por el cliente (28/08/2026) |

### 2.3 Módulo Administrador

| ID | Descripción | Origen |
|---|---|---|
| RF-18 | El sistema debe permitirle al administrador deshabilitar y reactivar cuentas de usuario. | Minuta §9.2 |
| RF-19 | El sistema debe marcar automáticamente como "moroso" a un pasajero que haya reservado en efectivo y no se haya presentado 3 veces, bloqueándole la opción de pago en efectivo. | Minuta §7 |
| RF-20 | El sistema debe permitirle al administrador reactivar manualmente a un pasajero marcado como moroso. | Minuta §7, §9.2 |
| RF-21 | El sistema debe permitirle al administrador validar o rechazar comprobantes de transferencia dentro de la ventana de 4 horas. | Minuta §7, §9.2 |
| RF-22 | El sistema debe mostrarle al administrador estadísticas de recaudación y uso por método de pago. | Minuta §9.2 |
| RF-23 | El sistema debe permitirle al administrador editar los horarios de los viajes. | Minuta §4, §9.2 |
| RF-24 | El sistema debe permitirle al administrador configurar el monto del descuento por transferencia/efectivo. | Minuta §7, §9.2, §12 |
| RF-27 | El sistema debe permitirle al administrador crear y gestionar cupones de descuento (código, tipo, valor, vigencia, uso único o no), para poder lanzar promociones futuras sin depender de un cambio de código. | Propuesta del usuario — generaliza RF-14 |

---

## 3. Requisitos no funcionales

| ID | Descripción | Justificación |
|---|---|---|
| RNF-01 | **Seguridad**: los datos de pago y personales (DNI, domicilio) deben viajar cifrados (HTTPS) y las contraseñas deben almacenarse con hash. No se deben guardar datos sensibles de tarjetas. | Manejo de datos personales y pagos reales. |
| RNF-02 | **Control de acceso por rol**: el sistema debe implementar permisos diferenciados para pasajero, chofer y administrador, impidiendo que el chofer acceda a información reservada al administrador (dinero, estadísticas, gestión de usuarios). | Minuta §2 (corrección de roles). |
| RNF-03 | **Consistencia de datos**: el descuento de cupo debe ser una operación atómica, para evitar overselling cuando dos personas reservan el mismo lugar casi al mismo tiempo. | Minuta §4, §7 (14 asientos, distintos métodos de pago). |
| RNF-04 | **Usabilidad / mobile-first**: el flujo de compra debe ser simple y utilizable cómodamente desde el celular, dado que gran parte de los pasajeros va a comprar desde ahí. | Perfil de usuario final (pasajeros de pueblos, no necesariamente muy tecnológicos). |
| RNF-05 | **Disponibilidad**: el sistema debe estar operativo de forma confiable, ya que la venta depende de la disponibilidad de cupo en tiempo real. | Naturaleza transaccional del sistema (venta de cupos limitados). |
| RNF-06 | **Mantenibilidad**: priorizar una arquitectura simple y bien documentada por sobre patrones complejos, dado que el desarrollo y mantenimiento está a cargo de una sola persona. | Desarrollo individual, no en equipo. |
| RNF-07 | **Escalabilidad moderada**: el modelo de horarios/recorridos debe poder crecer (más horarios, más recorridos) sin requerir un rediseño completo, aunque hoy se lance con un solo horario fijo por sentido. | Minuta §4 (posible evolución futura). |

---

## 4. Reglas de negocio

| ID | Regla | Origen |
|---|---|---|
| RN-01 | Una persona solo puede tener una cuenta registrada en el sistema; se garantiza mediante el DNI como identificador único de cuenta. | Minuta §5 |
| RN-02 | Un cupón marcado como "uso único por persona" no puede aplicarse más de una vez a la misma persona (verificado por usuario_id en CuponUso). El descuento de "primera vez" es la primera aplicación concreta de esta regla, mediante el cupón `PRIMERVIAJE`. | Minuta §5 |
| RN-03 | La capacidad máxima por viaje es de 14 pasajeros. | Minuta §4 |
| RN-04 | El precio base del pasaje es único por recorrido, pero varía según el método de pago elegido. | Minuta §7 |
| RN-05 | Un pasajero que reserva en efectivo y no se presenta 3 veces queda marcado como moroso de forma permanente, hasta que el administrador lo reactive. | Minuta §7 |
| RN-06 | Un cupo reservado por transferencia se libera automáticamente si no es validado por el administrador dentro de las 4 horas. | Minuta §7 |
| RN-07 | El documento de identidad se controla físicamente solo en el primer viaje de cada pasajero. | Minuta §8 |

---

## 5. Supuestos y puntos a resolver

**Resueltos en esta revisión (28/08/2026):**
- Mecanismo "una persona = una cuenta" → el DNI es el identificador único de registro (ver RF-02, RN-01).
- Cupo en efectivo → se descuenta de inmediato al reservar (ver RF-11).
- RF-17 → lógica invertida: verificado por defecto, el chofer marca la excepción.
- RF-25 → confirmado: se guarda un email por cuenta, para recuperación de contraseña y futuras comunicaciones de ofertas.
- Consecuencia de marcar "no verificado" (RF-17) → ninguna acción automática; queda registrado como dato informativo para referencia futura, sin bloqueo ni alerta.

**Resuelto en revisión posterior:**
- El mecanismo del descuento de primera vez (RF-14) cambió de una bandera en Usuario a un sistema de **cupones** (RF-26, RF-27) — decisión del usuario, pensada para soportar promociones futuras sin rediseñar el modelo. Ver DER sección 1.7-1.8 para el detalle de las nuevas entidades `Cupon` y `CuponUso`.

**Pendiente:**
1. **Monto del descuento por transferencia/efectivo (RF-24)**: aún no definido por el cliente (heredado de Minuta §12). No bloquea el modelado ni el desarrollo de las Historias de Usuario, solo la implementación final del cálculo de precio.

---
*Documento vivo: los IDs (RF/RNF/RN) se mantienen estables a lo largo del proyecto para trazabilidad; si un requisito se elimina, se marca como "dado de baja" en vez de reutilizar su ID.*