# Backlog inicial — Kanban
## Sistema de Reservas — Traffic Colón–Rosario

| | |
|---|---|
| **Proyecto** | Aplicación web de reserva y venta de pasajes para traffic (combi) |
| **Basado en** | Historias de Usuario v2 + Documento de Diseño (arquitectura) |
| **Preparado por** | Mateo (desarrollador) |
| **Fase del proceso** | 6 de 7 — Minuta → Requerimientos → HU → DER → Diseño → **Kanban** → Código |

Acompaña a `kanban-backlog.csv`, pensado para importar directo a Trello, GitHub Projects o Notion (columnas: ID, Título, Tipo, Etapa, Prioridad, Relacionado, Estado — todas las tarjetas arrancan en "Por hacer").

Tablero simple de 3 columnas, ya que trabajás solo: **Por hacer → En progreso → Hecho**. No hace falta más ceremonia que esa.

---

## Por qué este orden

El backlog no sigue el orden de las Historias de Usuario tal cual estaban numeradas — lo reordené por **dependencias técnicas** (no podés reservar sin login, no podés cobrar sin el modelo de pagos) y por **qué necesitás mínimamente para vender el primer pasaje real**, agrupado en 3 etapas:

- **Etapa 1 — Fundacional**: todo lo necesario para que un pasajero pueda entrar, elegir un viaje y pagarlo con cualquiera de los 3 métodos. Es el corazón del negocio; sin esto no hay nada que lanzar.
- **Etapa 2 — Operar el primer viaje**: lo que necesita el chofer para efectivamente salir a la ruta el día del primer viaje, y lo que necesita el administrador para no perder plata (validar transferencias).
- **Etapa 3 — Gestión y pulido**: todo lo que mejora la operación pero no bloquea el lanzamiento. Podés arrancar a vender pasajes sin esto y sumarlo con el negocio ya funcionando.

Las tareas técnicas (prefijo **T-**) no vienen de una Historia de Usuario porque son infraestructura, pero están para que no se te escapen del tablero.

---

## Etapa 1 — Fundacional (vender el primer pasaje)

| ID | Tarjeta | Tipo |
|---|---|---|
| T-01 | Setup del proyecto backend (carpetas, MikroORM + PostgreSQL) | Técnica |
| T-02 | Setup del proyecto frontend (carpetas, React + routing) | Técnica |
| T-03 | Migraciones de base de datos (todas las tablas del esquema) | Técnica |
| T-04 | Autenticación JWT + middleware de roles | Técnica |
| T-05 | Cargar manualmente las cuentas de chofer y administrador | Técnica |
| T-07 | Sembrar el cupón inicial PRIMERVIAJE directo en la base | Técnica |
| HU-01 | Registrarme (DNI, contraseña, email) | HU |
| HU-02 | Iniciar sesión | HU |
| HU-04 | Ver viajes disponibles sin loguearme | HU |
| HU-05 | Elegir sentido, fecha y puntos del viaje | HU |
| HU-06 | Ver el precio antes de confirmar | HU |
| HU-07 | Completar datos de la reserva | HU |
| HU-22 | Ingresar código de cupón | HU |
| T-06 | Integrar Mercado Pago (modo sandbox) | Técnica |
| HU-08 | Pagar con Mercado Pago | HU |
| HU-09 | Pagar por transferencia | HU |
| HU-10 | Pagar en efectivo | HU |

## Etapa 2 — Operar el primer viaje

| ID | Tarjeta | Tipo |
|---|---|---|
| T-08 | Integrar Google Maps API | Técnica |
| HU-12 | Ver pasajeros del día (chofer) | HU |
| HU-13 | Ver ruta óptima del día (chofer) | HU |
| HU-14 | Marcar documento no verificado (chofer) | HU |
| HU-15 | Validar comprobantes de transferencia (administrador) | HU |

## Etapa 3 — Gestión y pulido

| ID | Tarjeta | Tipo |
|---|---|---|
| HU-03 | Recuperar contraseña | HU |
| HU-11 | Ver historial de viajes | HU |
| HU-16 | Marcado automático de moroso | HU |
| HU-17 | Reactivar a un pasajero moroso | HU |
| HU-18 | Deshabilitar cuentas | HU |
| HU-19 | Ver estadísticas | HU |
| HU-20 | Editar horarios | HU |
| HU-23 | Gestionar cupones de descuento (crear/editar más allá del PRIMERVIAJE inicial) | HU |
| HU-21 | Configurar el descuento por transferencia/efectivo — **bloqueada**: falta que el cliente defina el monto (pendiente desde el Documento de Requisitos) | HU |

---

## Notas

- El **diseño visual** ya definido (home minimalista + cabecera de confianza mínima) aplica de forma transversal a cada tarjeta de frontend — no es una tarjeta aparte, es el criterio con el que se construye cada pantalla.
- Los paneles de **chofer** y **administrador** todavía no tienen bocetos propios (solo el flujo de compra del pasajero). Si querés, los armamos antes de empezar Etapa 2, o sobre la marcha.
- HU-21 va a quedar frenada en "Por hacer" hasta que el cliente defina el monto del descuento — no la muevas a "En progreso" antes de eso.
- El descuento de primera vez ahora se implementa como cupón (`PRIMERVIAJE`), no como una bandera automática — por eso se sumaron T-07 y HU-22 a la Etapa 1, y HU-23 a la Etapa 3.

---
*Documento vivo: acompaña a `kanban-backlog.csv`, que es la fuente de verdad para importar al tablero real.*