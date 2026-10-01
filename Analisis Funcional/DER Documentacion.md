# Diagrama Entidad-RelaciÃ³n (DER)
## Sistema de Reservas â€” Traffic ColÃ³nâ€“Rosario

| | |
|---|---|
| **Proyecto** | AplicaciÃ³n web de reserva y venta de pasajes para traffic (combi) |
| **Basado en** | Documento de Requisitos v3 + Historias de Usuario v2 |
| **Preparado por** | Mateo (desarrollador) |
| **Fase del proceso** | 4 de 7 â€” Minuta â†’ Requerimientos â†’ HU â†’ **DER** â†’ DiseÃ±o â†’ Kanban â†’ CÃ³digo |

Este documento acompaÃ±a a `der-diagrama.mermaid` con el detalle de cada entidad, las decisiones de modelado y los puntos a confirmar. Las entidades **Horario** y **Parada** son una propuesta del desarrollador (no fueron mencionadas explÃ­citamente por el cliente); el resto surge directo de lo relevado.

**RevisiÃ³n:** se reemplazÃ³ el mecanismo de descuento de primera vez (antes una bandera `promo_primer_viaje_usada` en Usuario) por un sistema de **cupones** (`Cupon` / `CuponUso`), pensado para soportar cualquier promociÃ³n futura sin rediseÃ±ar el modelo cada vez.

---

## 1. Entidades

### 1.1 Usuario (pasajero, chofer y administrador)
Tabla Ãºnica para los tres roles, con un campo `rol` que define permisos y panel (RNF-02). Se decidiÃ³ asÃ­ en lugar de separar una entidad `Empleado` â€” es un patrÃ³n habitual y ya usado por el desarrollador en otros proyectos.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| dni | string, Ãºnico | Obligatorio y Ãºnico si `rol = pasajero` (RF-02, RN-01); opcional para chofer/administrador |
| nombre / apellido | string | |
| email | string, Ãºnico | RecuperaciÃ³n de contraseÃ±a y futuras ofertas (RF-25) |
| password_hash | string | Nunca texto plano |
| rol | enum: `pasajero` / `chofer` / `administrador` | |
| activo | boolean | Para deshabilitar cuentas (RF-18) |
| es_moroso | boolean | Solo aplica a `pasajero`. Bloquea el pago en efectivo (RN-05) |
| inasistencias_efectivo | int | Solo aplica a `pasajero`. Contador hacia el lÃ­mite de 3 (RF-19) |
| fecha_registro | datetime | |

> **Nota de seguridad:** el endpoint pÃºblico de registro debe forzar siempre `rol = 'pasajero'` en el servidor y nunca leer ese campo desde el formulario que completa el usuario â€” asÃ­ se evita que alguien se autoasigne el rol de administrador. Las cuentas de chofer/administrador se cargan directo en la base por el desarrollador, dado que van a ser 1-2 en total.
>
> **Cambio en esta revisiÃ³n:** el campo `promo_primer_viaje_usada` se eliminÃ³ de acÃ¡ â€” ese control ahora vive en `CuponUso` (secciones 1.7 y 1.8).

### 1.2 Horario â€” *propuesta*
Plantilla recurrente: define el sentido, dÃ­a de la semana y hora del viaje fijo. Es lo que edita el administrador (RF-23) sin tocar cÃ³digo.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| sentido | enum: `colon_rosario` / `rosario_colon` | |
| dia_semana | string | |
| hora | time | |
| activo | boolean | Permite dar de baja un horario sin borrar el histÃ³rico |

### 1.3 Viaje
Una fecha concreta generada a partir de un Horario. Es sobre esto que se reservan los pasajes de ese dÃ­a puntual â€” tiene su propio cupo y su propia lista de pasajes.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| horario_id | FK â†’ Horario | |
| fecha | date | |
| hora | time | Copiada del Horario al generarse el viaje â€” si mÃ¡s adelante se edita el Horario (RF-23), no altera retroactivamente los viajes ya generados |
| capacidad_total | int | 14 por defecto (Minuta Â§4) |
| cupos_ocupados | int | Agregado en la fase de DiseÃ±o â€” contador para controlar la concurrencia (ver `diseno-arquitectura.md`) |
| estado | enum: `programado` / `en_curso` / `finalizado` / `cancelado` | |

### 1.4 Parada â€” *propuesta*
CatÃ¡logo de puntos fijos de encuentro (ColÃ³n y pueblos intermedios), usados tanto para origen como para destino cuando no aplica domicilio libre.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| nombre | string | Ej. "Base ColÃ³n", "Ugues - Ruta 9" |
| pueblo | string | |
| latitud / longitud | float | Para la integraciÃ³n con Google Maps (RF-16) |

### 1.5 Pasaje
La reserva en sÃ­ (nominativa â€” no existe un "boleto" aparte, ver Minuta Â§5). Un Usuario reserva un lugar en un Viaje.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| usuario_id | FK â†’ Usuario | |
| viaje_id | FK â†’ Viaje | |
| parada_origen_id | FK - Parada, nullable | Solo si el origen es un punto fijo |
| domicilio_origen | string, nullable | Solo si el origen es un domicilio (ej. Rosario en la vuelta) |
| lat_origen / lon_origen | decimal(10,7), nullable | Coordenadas del domicilio de origen (T-14: map picker). Null si se uso texto libre o parada fija. |
| parada_destino_id | FK - Parada, nullable | Solo si el destino es un punto fijo |
| domicilio_destino | string, nullable | Solo si el destino es un domicilio (ej. Rosario en la ida) |
| lat_destino / lon_destino | decimal(10,7), nullable | Coordenadas del domicilio de destino (T-14: map picker). Null si se uso texto libre o parada fija. |
| estado | enum: `pendiente_pago` / `confirmada` / `vencida` / `cancelada` / `completada` / `no_show` | |
| documento_verificado | boolean, nullable | Solo relevante si es el primer viaje del usuario; por defecto `true` (RF-17) |
| fecha_reserva | datetime | |

> **Regla de validaciÃ³n (a nivel aplicaciÃ³n, no de base de datos):** cada Pasaje debe tener exactamente uno de `parada_origen_id` / `domicilio_origen` completo (no ambos, no ninguno), y lo mismo para destino.

### 1.6 Pago
Registro histÃ³rico de precio y estado de pago de cada Pasaje.

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| pasaje_id | FK â†’ Pasaje (1:1) | Ver nota abajo sobre reintentos |
| metodo | enum: `mercadopago` / `transferencia` / `efectivo` | |
| monto | decimal | Precio final, ya aplicados el descuento por mÃ©todo de pago y el cupÃ³n si corresponde |
| estado | enum: `pendiente` / `aprobado` / `rechazado` / `vencido` | |
| comprobante_url | string, nullable | Solo transferencia |
| fecha_pago | datetime, nullable | |
| fecha_expiracion_hold | datetime, nullable | Solo transferencia â€” momento en que vence el hold de 4hs (RF-10) |

> **Nota de diseÃ±o:** modelÃ© Pago como 1:1 con Pasaje (no 1:N) â€” si una reserva vence o se rechaza, se asume que el pasajero inicia una reserva nueva en vez de reintentar sobre la misma. Es mÃ¡s simple de mantener (RNF-06) y evita casos raros de "reserva con dos pagos distintos". Confirmame si esto no encaja con cÃ³mo lo pensÃ¡s vos.

### 1.7 Cupon â€” *nuevo en esta revisiÃ³n*
Un cÃ³digo de descuento genÃ©rico, reutilizable para cualquier promociÃ³n futura (no solo la de primer viaje).

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| codigo | string, Ãºnico | Ej. `PRIMERVIAJE` |
| tipo | enum: `monto_fijo` / `porcentaje` | |
| valor | decimal | Monto o porcentaje segÃºn `tipo` |
| fecha_inicio | datetime, nullable | Vigencia â€” nullable si no tiene inicio definido |
| fecha_fin | datetime, nullable | Vigencia â€” nullable si no vence |
| uso_unico_por_persona | boolean | `true` para el cupÃ³n de primer viaje |
| activo | boolean | Permite desactivar un cupÃ³n sin borrarlo |

### 1.8 CuponUso â€” *nuevo en esta revisiÃ³n*
Registra cada vez que un cupÃ³n se aplicÃ³ a una reserva. Reemplaza la bandera `promo_primer_viaje_usada` que antes vivÃ­a en Usuario: en vez de "Â¿ya usÃ³ su descuento?", la pregunta pasa a ser "Â¿existe un CuponUso de este cupÃ³n para este usuario?".

| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| cupon_id | FK â†’ Cupon | |
| usuario_id | FK â†’ Usuario | |
| pasaje_id | FK â†’ Pasaje, Ãºnico | Un pasaje aplica a lo sumo un cupÃ³n |
| fecha_uso | datetime | |

> **CÃ³mo reemplaza al mecanismo anterior:** para validar el cupÃ³n `PRIMERVIAJE` (uso Ãºnico por persona) al confirmar una reserva, el service busca si ya existe un `CuponUso` con ese `cupon_id` y ese `usuario_id`. Si existe, rechaza. Es la misma regla de negocio (RN-02) con otro mecanismo de implementaciÃ³n â€” mÃ¡s genÃ©rico, porque sirve para cualquier cupÃ³n futuro sin tocar la tabla Usuario.

---

## 2. Relaciones

| RelaciÃ³n | Cardinalidad | DescripciÃ³n |
|---|---|---|
| Horario â†’ Viaje | 1 a N | Un horario genera muchos viajes (uno por fecha) |
| Viaje â†’ Pasaje | 1 a N | Un viaje tiene muchas reservas (hasta 14) |
| Usuario â†’ Pasaje | 1 a N | Un usuario puede tener muchas reservas a lo largo del tiempo |
| Parada â†’ Pasaje (origen) | 1 a N | Una parada puede ser origen de muchas reservas |
| Parada â†’ Pasaje (destino) | 1 a N | Una parada puede ser destino de muchas reservas |
| Pasaje â†’ Pago | 1 a 1 | Cada reserva tiene un Ãºnico registro de pago |
| Cupon â†’ CuponUso | 1 a N | Un cupÃ³n puede usarse muchas veces (por distintas personas, o varias si no es de uso Ãºnico) |
| Usuario â†’ CuponUso | 1 a N | Un usuario puede haber usado distintos cupones a lo largo del tiempo |
| Pasaje â†’ CuponUso | 1 a 0..1 | Una reserva usa a lo sumo un cupÃ³n |

Si en el futuro hay mÃ¡s de un chofer, se podrÃ­a agregar una relaciÃ³n entre Usuario (rol chofer) y Viaje para asignar quiÃ©n maneja cada viaje; no hace falta ahora porque el cliente mencionÃ³ un solo chofer.

---

## 3. Puntos a confirmar

1. **Pago 1:1 vs 1:N con Pasaje** (ver nota en la secciÃ³n 1.6): Â¿te parece bien que una reserva vencida/rechazada implique iniciar una reserva nueva, en vez de reintentar el pago sobre la misma?
2. **Horario / Viaje**: separados para poder tener cupo y estado por fecha concreta sin perder la regla recurrente que edita el administrador (RF-23). Confirmar si esta separaciÃ³n cierra o si preferÃ­s simplificarla.
3. **Parada**: catÃ¡logo de puntos fijos (ColÃ³n y pueblos intermedios). Confirmar si el nombre/alcance te cierra.

**Resuelto en esta revisiÃ³n:** Usuario y Empleado se fusionaron en una sola tabla `Usuario` con campo `rol` (pasajero / chofer / administrador). El mecanismo de descuento de primera vez pasÃ³ de una bandera en Usuario a un sistema de cupones (`Cupon` / `CuponUso`).

---
*Documento vivo: acompaÃ±a a `der-diagrama.mermaid`, que se actualiza en conjunto.*

