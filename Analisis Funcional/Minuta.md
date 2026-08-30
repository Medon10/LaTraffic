# Minuta de Relevamiento
## Sistema de Reservas — Traffic Colón–Rosario

| | |
|---|---|
| **Proyecto** | Aplicación web de reserva y venta de pasajes para traffic (combi) |
| **Cliente** | Dueño de la unidad de transporte |
| **Relevado por** | Mateo (desarrollador) |
| **Modalidad** | Entrevista con el cliente (notas tomadas por el desarrollador, sin grabación) |

**Historial de revisiones**
| Versión | Fecha | Descripción |
|---|---|---|
| 1 | 28/08/2026 | Relevamiento inicial |
| 2 | 28/08/2026 | Correcciones de roles y respuestas a preguntas abiertas |
| 3 | 28/08/2026 | Detalle de manejo de cupo por método de pago, descuento por transferencia/efectivo, resolución de paradas en pueblos intermedios |

---

## 1. Descripción general del negocio

El cliente es dueño de una traffic (combi) que realiza viajes regulares entre **Colón (Buenos Aires)** y **Rosario**, con paradas intermedias en pueblos del trayecto. Actualmente la venta de pasajes no está digitalizada. El objetivo del proyecto es una web donde los pasajeros puedan **reservar y pagar** su lugar.

## 2. Actores del sistema

| Actor | Rol |
|---|---|
| Dueño / Administrador | Define reglas del negocio y precios. Accede a un panel **con información sensible**: dinero, estadísticas, gestión de usuarios y validación de pagos. No participa del día a día operativo (vive en otra ciudad). |
| Chofer | Única persona presente en el viaje. Realiza la bienvenida, el control de documentación (cuando corresponde) y la distribución de pasajeros en Rosario. Accede a un **panel propio y separado del de administración**, limitado a información operativa del viaje del día. |
| Atención al cliente | Persona a cargo del WhatsApp del negocio para consultas fuera de la web. |
| Pasajero | Usuario final que reserva y compra su pasaje. |

## 3. Recorrido, paradas y sentidos del viaje

- Trayecto: **Colón ⇄ Rosario**.
- **Ida (Colón → Rosario)**: el pasajero aborda en la ubicación fija de la traffic en Colón (se controlan los pasajes antes de salir) y desciende en su domicilio en Rosario (se guarda el domicilio de destino).
- **Vuelta (Rosario → Colón)**: se busca al pasajero en su domicilio en Rosario y desciende en el punto fijo de Colón.
- **Pueblos intermedios** (ej. Ugues, cercano a Colón): en **ambos sentidos** el punto es **fijo, al costado de la ruta** — la traffic no entra al pueblo, es el pasajero quien se acerca hasta ese mismo lugar tanto para subir como para bajar. Aplica solo si hay algún pasajero que compró desde ese pueblo ese día.

## 4. Capacidad y programación

- Capacidad de la unidad: **14 asientos**, sin selección de asiento específico (se ocupan libremente al subir).
- **Un solo horario de viaje por día en cada sentido.**
- Los horarios son fijos y recurrentes (mismos días, misma hora cada semana). La carga inicial la hace el desarrollador; luego el administrador puede editarlos desde el panel.

## 5. Cuentas de usuario y naturaleza del pasaje

- Navegar el sitio **no** requiere login. Comprar un pasaje **sí**.
- **Regla de negocio clave**: una persona = una sola cuenta, para evitar abuso de promociones.
- **El pasaje es nominativo**: no existe un "boleto" como objeto aparte — la reserva está atada directamente a la persona que compra y viaja.
- El descuento de "primera vez" se evalúa **por persona**, no por cuenta.

## 6. Flujo de compra (pasajero)

1. Selecciona sentido del viaje (Colón→Rosario o Rosario→Colón), origen/parada y destino.
2. Selecciona la fecha del viaje (dentro del horario fijo disponible).
3. Ve el precio del pasaje (precio base único según recorrido, con el descuento de primera vez si corresponde).
4. Presiona "comprar" → si no está logueado, se le pide iniciar sesión o registrarse.
5. Completa datos: nombre, apellido, número de documento (DNI), punto de origen/parada y domicilio (según el sentido del viaje).
6. Elige método de pago: Mercado Pago (QR), transferencia o efectivo → el precio final puede variar según el método elegido (ver sección 7).
7. Confirma la reserva.

## 7. Precio y métodos de pago

- Medios disponibles: **Mercado Pago (QR)**, **transferencia bancaria**, **efectivo**.
- **Descuento por comisión de Mercado Pago**: pagar por transferencia o efectivo tiene un descuento respecto al precio con Mercado Pago (compensa la comisión que cobra MP). El monto del descuento todavía no está definido por el cliente y puede cambiar con el tiempo — debe ser configurable, no fijo en el código.
- **Manejo del cupo según método de pago**:
  - **Mercado Pago**: el cupo se descuenta en el momento del pago (confirmación inmediata).
  - **Transferencia**: el cupo se **reserva por 4 horas**. El administrador valida el comprobante dentro de ese plazo desde el panel; si lo aprueba, se confirma el descuento del cupo. Si pasan las 4 horas sin validación, el cupo se libera automáticamente.
  - **Efectivo**: *a confirmar* — se asume que el cupo se descuenta al momento de reservar (sin ventana de espera), asumiendo el riesgo de inasistencia que ya cubre la regla de morosidad (ver sección 8).
- **Riesgo identificado (efectivo)**: al no cobrarse por adelantado, puede haber reservas "fantasma" si el pasajero no se presenta.
- **Regla de negocio**: si un pasajero reserva en efectivo y no se presenta al viaje **3 veces**, queda marcado como **moroso de forma permanente**, con posibilidad de que el **administrador lo reactive manualmente** ("dar de alta").

## 8. Control de identidad (DNI)

- En el **primer viaje** de cada pasajero se solicita el documento físico al subir a la traffic, para validar la identidad asociada a la promoción de primer viaje.
- En viajes posteriores, **no** se vuelve a controlar el documento.

## 9. Paneles de gestión

### 9.1 Panel del chofer
- Lista de pasajeros del viaje del día (nombre, punto de origen/parada, domicilio de destino).
- Ruta del día integrada con la **API de Google Maps**, con **orden óptimo de paradas calculado automáticamente**.

### 9.2 Panel del administrador (dueño)
- Gestión de usuarios: posibilidad de **deshabilitar** y **reactivar** cuentas (incluye reactivar a un pasajero marcado como moroso).
- **Validación de comprobantes de transferencia** dentro de la ventana de 4 horas.
- **Estadísticas y control de dinero** (recaudación, medios de pago utilizados, etc.).
- Edición de horarios de viaje y del monto del descuento por transferencia/efectivo.

## 10. Fuera de alcance / descartado por ahora

- Diseño visual y de interfaz.
- Integración del canal de WhatsApp con la plataforma (por ahora es un canal aparte).
- **Reservas manuales cargadas por el dueño fuera de la app** — descartado: el dueño le va a pedir a sus conocidos que compren directamente por la web.
- **Notificaciones al pasajero** (mail o WhatsApp) — no se implementan por ahora.

## 11. Preguntas resueltas

| # | Pregunta | Resolución |
|---|---|---|
| 1 | ¿Pasaje nominativo o transferible? | Nominativo — no hay "boleto", es la persona. |
| 2 | ¿Descuento de primera vez por cuenta o por persona? | Por persona. |
| 3 | ¿Punto de encuentro fijo o coordinado caso a caso? | Fijo, al costado de la ruta, igual en ambos sentidos. |
| 4 | ¿Precio por tramo o único? | Único por recorrido (pero varía por método de pago). |
| 5 | ¿Contador de morosidad permanente o se resetea? | Permanente, con reactivación manual por el administrador. |
| 6 | ¿Reserva manual del dueño con o sin datos del pasajero? | Descartada por ahora. |
| 7 | ¿Uno o varios horarios por día? | Uno solo. |
| 8 | ¿Quién edita los horarios? | Carga inicial del desarrollador; edición posterior por el administrador. |
| 9 | ¿La vuelta sigue la misma lógica que la ida? | Sí, invertida (domicilio en Rosario ⇄ punto fijo en Colón). |
| 10 | ¿Orden de paradas automático u orden ya conocido? | Orden óptimo automático (Google Maps). |
| 11 | ¿Se necesitan notificaciones? | No, por ahora. |
| 12 | ¿Descenso en pueblos intermedios en la vuelta: punto fijo o domicilio? | Punto fijo, igual que en la ida. |

## 12. Puntos pendientes de confirmar

- Para pago en **efectivo**, confirmar si el cupo se descuenta inmediatamente al reservar o si también aplica algún tipo de ventana de espera.
- Monto del descuento por transferencia/efectivo (aún no definido por el cliente).

---
*Documento vivo: se irá actualizando a medida que surjan nuevas definiciones con el cliente.*