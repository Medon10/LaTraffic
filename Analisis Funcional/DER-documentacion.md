# Diagrama Entidad-Relación (DER)
## Sistema de Reservas — Traffic Colón–Rosario

| | |
|---|---|
| **Proyecto** | Aplicación web de reserva y venta de pasajes para traffic (combi) |
| **Basado en** | Documento de Requisitos v2 + Historias de Usuario v1 |
| **Preparado por** | Mateo (desarrollador) |
| **Fase del proceso** | 4 de 7 — Minuta → Requerimientos → HU → **DER** → Diseño → Kanban → Código |

Este documento acompaña a `der-diagrama.mermaid` con el detalle de cada entidad, las decisiones de modelado y los puntos a confirmar. Las entidades **Horario** y **Parada** son una propuesta del desarrollador (no fueron mencionadas explícitamente por el cliente); el resto surge directo de lo relevado.

---

## 1. Entidades

### 1.1 Usuario (pasajero, chofer y administrador)
Tabla única para los tres roles, con un campo `rol` que define permisos y panel (RNF-02). Se decidió así en lugar de separar una entidad `Empleado` — es un patrón habitual y ya usado por el desarrollador en otros proyectos.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| dni | string, único | Obligatorio y único si `rol = pasajero` (RF-02, RN-01); opcional para chofer/administrador |
| nombre / apellido | string | |
| email | string, único | Recuperación de contraseña y futuras ofertas (RF-25) |
| password_hash | string | Nunca texto plano |
| rol | enum: `pasajero` / `chofer` / `administrador` | |
| activo | boolean | Para deshabilitar cuentas (RF-18) |
| es_moroso | boolean | Solo aplica a `pasajero`. Bloquea el pago en efectivo (RN-05) |
| inasistencias_efectivo | int | Solo aplica a `pasajero`. Contador hacia el límite de 3 (RF-19) |
| promo_primer_viaje_usada | boolean | Solo aplica a `pasajero`. Controla el descuento de primera vez (RN-02) |
| fecha_registro | datetime | |

> **Nota de seguridad:** el endpoint público de registro debe forzar siempre `rol = 'pasajero'` en el servidor y nunca leer ese campo desde el formulario que completa el usuario — así se evita que alguien se autoasigne el rol de administrador. Las cuentas de chofer/administrador se cargan directo en la base por el desarrollador, dado que van a ser 1-2 en total.

### 1.2 Horario — *propuesta*
Plantilla recurrente: define el sentido, día de la semana y hora del viaje fijo. Es lo que edita el administrador (RF-23) sin tocar código.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| sentido | enum: `colon_rosario` / `rosario_colon` | |
| dia_semana | string | |
| hora | time | |
| activo | boolean | Permite dar de baja un horario sin borrar el histórico |

### 1.3 Viaje
Una fecha concreta generada a partir de un Horario. Es sobre esto que se reservan los pasajes de ese día puntual — tiene su propio cupo y su propia lista de pasajes.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| horario_id | FK → Horario | |
| fecha | date | |
| hora | time | Copiada del Horario al generarse el viaje — si más adelante se edita el Horario (RF-23), no altera retroactivamente los viajes ya generados |
| capacidad_total | int | 14 por defecto (Minuta §4) |
| cupos_ocupados | int | Agregado en la fase de Diseño — contador para controlar la concurrencia (ver `diseno-arquitectura.md`) |
| estado | enum: `programado` / `en_curso` / `finalizado` / `cancelado` | |

### 1.4 Parada — *propuesta*
Catálogo de puntos fijos de encuentro (Colón y pueblos intermedios), usados tanto para origen como para destino cuando no aplica domicilio libre.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| nombre | string | Ej. "Base Colón", "Ugues - Ruta 9" |
| pueblo | string | |
| latitud / longitud | float | Para la integración con Google Maps (RF-16) |

### 1.5 Pasaje
La reserva en sí (nominativa — no existe un "boleto" aparte, ver Minuta §5). Un Usuario reserva un lugar en un Viaje.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| usuario_id | FK → Usuario | |
| viaje_id | FK → Viaje | |
| parada_origen_id | FK → Parada, nullable | Solo si el origen es un punto fijo |
| domicilio_origen | string, nullable | Solo si el origen es un domicilio (ej. Rosario en la vuelta) |
| parada_destino_id | FK → Parada, nullable | Solo si el destino es un punto fijo |
| domicilio_destino | string, nullable | Solo si el destino es un domicilio (ej. Rosario en la ida) |
| estado | enum: `pendiente_pago` / `confirmada` / `vencida` / `cancelada` / `completada` / `no_show` | |
| documento_verificado | boolean, nullable | Solo relevante si es el primer viaje del usuario; por defecto `true` (RF-17) |
| fecha_reserva | datetime | |

> **Regla de validación (a nivel aplicación, no de base de datos):** cada Pasaje debe tener exactamente uno de `parada_origen_id` / `domicilio_origen` completo (no ambos, no ninguno), y lo mismo para destino.

### 1.6 Pago
Registro histórico de precio y estado de pago de cada Pasaje.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| pasaje_id | FK → Pasaje (1:1) | Ver nota abajo sobre reintentos |
| metodo | enum: `mercadopago` / `transferencia` / `efectivo` | |
| monto | decimal | Precio final ya aplicado el descuento por método de pago |
| estado | enum: `pendiente` / `aprobado` / `rechazado` / `vencido` | |
| comprobante_url | string, nullable | Solo transferencia |
| fecha_pago | datetime, nullable | |
| fecha_expiracion_hold | datetime, nullable | Solo transferencia — momento en que vence el hold de 4hs (RF-10) |

> **Nota de diseño:** modelé Pago como 1:1 con Pasaje (no 1:N) — si una reserva vence o se rechaza, se asume que el pasajero inicia una reserva nueva en vez de reintentar sobre la misma. Es más simple de mantener (RNF-06) y evita casos raros de "reserva con dos pagos distintos". Confirmame si esto no encaja con cómo lo pensás vos.

---

## 2. Relaciones

| Relación | Cardinalidad | Descripción |
|---|---|---|
| Horario → Viaje | 1 a N | Un horario genera muchos viajes (uno por fecha) |
| Viaje → Pasaje | 1 a N | Un viaje tiene muchas reservas (hasta 14) |
| Usuario → Pasaje | 1 a N | Un usuario puede tener muchas reservas a lo largo del tiempo |
| Parada → Pasaje (origen) | 1 a N | Una parada puede ser origen de muchas reservas |
| Parada → Pasaje (destino) | 1 a N | Una parada puede ser destino de muchas reservas |
| Pasaje → Pago | 1 a 1 | Cada reserva tiene un único registro de pago |

Si en el futuro hay más de un chofer, se podría agregar una relación entre Usuario (rol chofer) y Viaje para asignar quién maneja cada viaje; no hace falta ahora porque el cliente mencionó un solo chofer.

---

## 3. Puntos a confirmar

1. **Pago 1:1 vs 1:N con Pasaje** (ver nota en la sección 1.6): ¿te parece bien que una reserva vencida/rechazada implique iniciar una reserva nueva, en vez de reintentar el pago sobre la misma?
2. **Horario / Viaje**: separados para poder tener cupo y estado por fecha concreta sin perder la regla recurrente que edita el administrador (RF-23). Confirmar si esta separación cierra o si preferís simplificarla.
3. **Parada**: catálogo de puntos fijos (Colón y pueblos intermedios). Confirmar si el nombre/alcance te cierra.

**Resuelto en esta revisión:** Usuario y Empleado se fusionaron en una sola tabla `Usuario` con campo `rol` (pasajero / chofer / administrador).

---
*Documento vivo: acompaña a `der-diagrama.mermaid`, que se actualiza en conjunto.*
