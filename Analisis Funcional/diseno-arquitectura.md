# Documento de Diseño Técnico (Arquitectura)
## Sistema de Reservas — Traffic Colón–Rosario

| | |
|---|---|
| **Proyecto** | Aplicación web de reserva y venta de pasajes para traffic (combi) |
| **Basado en** | Documento de Requisitos, Historias de Usuario y DER |
| **Preparado por** | Mateo (desarrollador) |
| **Fase del proceso** | 5a de 7 — Minuta → Requerimientos → HU → DER → **Diseño (arquitectura)** → Kanban → Código |

Este documento cubre el **diseño técnico** (arquitectura, base de datos, API, integraciones). El **diseño de interfaz** (UX/UI, wireframes) queda como una fase aparte (5b), a resolver con otra herramienta o más adelante acá mismo.

---

## 1. Arquitectura general

Arquitectura en capas simple — sin microservicios ni patrones complejos, porque el sistema lo desarrolla y mantiene una sola persona (RNF-06):

**Frontend (React)** → **API REST (Express)** → **Capa de servicios (lógica de negocio)** → **MikroORM** → **PostgreSQL**, con dos integraciones externas (Mercado Pago y Google Maps) llamadas desde la capa de servicios. Ver `diseno-arquitectura.mermaid`.

La separación en capas dentro del backend (routes → services → ORM) es la misma que ya usaste en [[vacationmatch]] al resolver las correcciones de esa materia (lógica de negocio en servicios, no en los controllers).

---

## 2. Stack tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Backend | Node.js + Express + TypeScript | Ya usado en VacationMatch; tipado fuerte reduce errores sin un equipo que revise el código |
| ORM | MikroORM | Ya usado en VacationMatch |
| Base de datos | PostgreSQL | Buen soporte de transacciones y locks (necesario para el control de cupo, sección 7) |
| Validación de datos | Zod | Ya usado en VacationMatch para validación centralizada |
| Autenticación | JWT | Consistente con el patrón ya usado (variable `TOKEN_SECRET`) |
| Frontend | React + TypeScript | Ya usado en VacationMatch |
| Pagos | SDK de Mercado Pago | Definido por el cliente (Minuta §7) |
| Mapas / rutas | Google Maps API (Directions, con optimización de waypoints) | RF-16 |
| Hosting / deploy | *A definir* | Fuera de alcance de este documento — se resuelve en la fase de Código si hace falta |

---

## 3. Estructura de carpetas propuesta

Sigue la misma convención usada en el proyecto anterior del desarrollador ([[petit-accesorios]]): organización por entidad de dominio, con archivos planos por capa usando notación de puntos dentro de cada módulo (backend), y `pages/` mapeando 1 a 1 con las rutas (frontend).

```
backend/
  src/
    auth/            (auth.controller.ts, auth.routes.ts, auth.service.ts)
    usuarios/        (usuario.entity.ts, usuario.controller.ts, usuario.repository.ts, usuario.routes.ts, usuario.service.ts)
    horarios/        (horario.entity.ts + controller/repository/routes/service)
    viajes/          (viaje.entity.ts + controller/repository/routes/service)
    paradas/         (parada.entity.ts + controller/repository/routes/service)
    pasajes/         (pasaje.entity.ts + controller/repository/routes/service)
    pagos/           (pago.entity.ts + controller/repository/routes/service, mercadopago.service.ts)
    cupones/         (cupon.entity.ts, cuponUso.entity.ts + controller/repository/routes/service)
    chofer/          (chofer.controller.ts, chofer.routes.ts, chofer.service.ts — reutiliza repos de viajes/pasajes)
    admin/           (admin.controller.ts, admin.routes.ts, admin.service.ts — reutiliza repos de otros módulos)
    shared/          (bdd, middleware, storage, types, utils)
    repository.ts    (repositorio base genérico, igual que en Petit)
    index.ts

frontend/
  src/
    componentes/     (compartidos: Navbar, Footer, etc.)
    pages/
      Home/ Login/ Registro/ RecuperarPassword/
      SeleccionViaje/ Checkout/ MisReservas/
      ChoferPanel/ ChoferRuta/
      AdminUsuarios/ AdminPagos/ AdminEstadisticas/ AdminHorarios/
    shared/          (api.ts, auth.ts, utils.ts)
```

`chofer` y `admin` no tienen `entity.ts` propio porque no representan una tabla — operan sobre entidades de otros módulos (Usuario, Pasaje, Viaje).

---

## 4. Esquema de base de datos

Traducción del DER a tablas concretas. Tipos orientativos para PostgreSQL.

```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  dni VARCHAR(20) UNIQUE,               -- obligatorio si rol = 'pasajero' (validado en la app + índice parcial)
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'pasajero',  -- 'pasajero' | 'chofer' | 'administrador'
  activo BOOLEAN NOT NULL DEFAULT true,
  es_moroso BOOLEAN NOT NULL DEFAULT false,
  inasistencias_efectivo INT NOT NULL DEFAULT 0,
  fecha_registro TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_usuarios_dni_pasajero ON usuarios(dni) WHERE rol = 'pasajero';

CREATE TABLE horarios (
  id SERIAL PRIMARY KEY,
  sentido VARCHAR(20) NOT NULL,          -- 'colon_rosario' | 'rosario_colon'
  dia_semana VARCHAR(15) NOT NULL,
  hora TIME NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE viajes (
  id SERIAL PRIMARY KEY,
  horario_id INT NOT NULL REFERENCES horarios(id),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,                    -- copiada del horario al generarse
  capacidad_total INT NOT NULL DEFAULT 14,
  cupos_ocupados INT NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'programado'
);
CREATE INDEX idx_viajes_fecha ON viajes(fecha);

CREATE TABLE paradas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  pueblo VARCHAR(100) NOT NULL,
  latitud DECIMAL(9,6),
  longitud DECIMAL(9,6)
);

CREATE TABLE pasajes (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  viaje_id INT NOT NULL REFERENCES viajes(id),
  parada_origen_id INT REFERENCES paradas(id),
  domicilio_origen VARCHAR(255),
  parada_destino_id INT REFERENCES paradas(id),
  domicilio_destino VARCHAR(255),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente_pago',
  documento_verificado BOOLEAN,
  fecha_reserva TIMESTAMP NOT NULL DEFAULT now(),
  CHECK ((parada_origen_id IS NOT NULL) != (domicilio_origen IS NOT NULL)),
  CHECK ((parada_destino_id IS NOT NULL) != (domicilio_destino IS NOT NULL))
);
CREATE INDEX idx_pasajes_viaje ON pasajes(viaje_id);
CREATE INDEX idx_pasajes_usuario ON pasajes(usuario_id);

CREATE TABLE pagos (
  id SERIAL PRIMARY KEY,
  pasaje_id INT NOT NULL UNIQUE REFERENCES pasajes(id),
  metodo VARCHAR(20) NOT NULL,           -- 'mercadopago' | 'transferencia' | 'efectivo'
  monto DECIMAL(10,2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  comprobante_url VARCHAR(255),
  fecha_pago TIMESTAMP,
  fecha_expiracion_hold TIMESTAMP
);

CREATE TABLE cupones (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  tipo VARCHAR(20) NOT NULL,             -- 'monto_fijo' | 'porcentaje'
  valor DECIMAL(10,2) NOT NULL,
  fecha_inicio TIMESTAMP,
  fecha_fin TIMESTAMP,
  uso_unico_por_persona BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE cupon_usos (
  id SERIAL PRIMARY KEY,
  cupon_id INT NOT NULL REFERENCES cupones(id),
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  pasaje_id INT NOT NULL UNIQUE REFERENCES pasajes(id),
  fecha_uso TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_cupon_usos_cupon_usuario ON cupon_usos(cupon_id, usuario_id);
```

---

## 5. Autenticación y autorización

- **Login**: DNI (o email) + contraseña → devuelve un JWT con `usuario_id` y `rol` como claims.
- **Middleware de autorización**: cada ruta protegida valida el JWT y chequea el `rol` contra los roles permitidos para esa ruta (ej. `/admin/*` solo acepta `rol = administrador`). El chequeo se hace siempre en el servidor, nunca confiando en lo que mande el frontend.
- **Salvaguarda de "mass assignment"**: el endpoint `POST /auth/registro` (público) ignora cualquier campo `rol` que venga en el body y fuerza `rol = 'pasajero'` en el código del backend. Las cuentas de chofer/administrador se insertan directo en la base por vos.
- **Contraseñas**: hasheadas con bcrypt (o argon2), nunca en texto plano.
- **Recuperación de contraseña**: token de un solo uso enviado por email, con expiración corta (ej. 1 hora).

---

## 6. Control de concurrencia de cupos

Para evitar vender más de 14 lugares (RF-12, RNF-03), la reserva de un cupo se hace dentro de una transacción de base de datos con **bloqueo de fila**:

```
BEGIN;
SELECT capacidad_total, cupos_ocupados FROM viajes WHERE id = :viaje_id FOR UPDATE;
-- si cupos_ocupados >= capacidad_total → abortar, informar "sin cupo"
INSERT INTO pasajes (...) VALUES (...);
INSERT INTO pagos (...) VALUES (...);
UPDATE viajes SET cupos_ocupados = cupos_ocupados + 1 WHERE id = :viaje_id;
COMMIT;
```

El `FOR UPDATE` bloquea la fila del viaje durante la transacción, así que si dos personas reservan el último lugar al mismo tiempo, la segunda transacción espera a que termine la primera y ve el cupo ya actualizado — no se vende dos veces el mismo lugar.

---

## 7. Expiración del hold de transferencia (4 horas)

Para mantenerlo simple (RNF-06), se resuelve con una verificación **al momento de leer datos**, sin necesidad de infraestructura extra:

- Cada vez que se consulta el cupo disponible de un viaje (ej. al listar viajes o antes de crear una reserva), el backend primero revisa si hay `pasajes` en estado `pendiente_pago` con método `transferencia` cuyo `fecha_expiracion_hold` ya pasó. Si los hay, los marca como `vencida` y decrementa `cupos_ocupados` del viaje correspondiente, antes de responder.
- Como refuerzo (opcional, no bloqueante para el lanzamiento), se puede sumar una tarea programada simple (`node-cron`, corriendo cada 10-15 minutos dentro del mismo proceso) que haga esta misma limpieza aunque nadie esté consultando el sitio en ese momento.

---

## 8. Integración con Mercado Pago

1. El pasajero elige "Mercado Pago" → el backend crea una **preferencia de pago** en la API de MP, con el monto y una referencia al `pasaje_id`.
2. El pasajero completa el pago en el checkout de MP.
3. MP notifica al backend mediante un **webhook** cuando el pago se aprueba o rechaza.
4. El backend recibe el webhook, actualiza `pagos.estado`, y si fue aprobado, confirma el `pasaje` de inmediato (RF-08).

---

## 9. Integración con Google Maps

Cuando el chofer pide la ruta del día (RF-16):

1. El backend junta los puntos de origen/destino de todos los `pasajes` confirmados de ese `viaje` (paradas fijas + domicilios).
2. Llama a la API de Directions de Google Maps con esos puntos como *waypoints* y `optimize_waypoints=true`.
3. Devuelve al chofer el orden sugerido, con un link para abrir directo en la app de Maps del celular.

---

## 10. Diseño de la API (endpoints principales)

| Módulo | Endpoint | Rol |
|---|---|---|
| Auth | `POST /auth/registro` | Público |
| Auth | `POST /auth/login` | Público |
| Auth | `POST /auth/recuperar-password` / `POST /auth/reset-password` | Público |
| Viajes | `GET /viajes?sentido=&fecha=` | Público |
| Viajes | `GET /viajes/:id` | Público |
| Pasajes | `POST /pasajes` (crear reserva, acepta `codigo_cupon` opcional) | Pasajero |
| Pasajes | `GET /pasajes/mis-reservas` | Pasajero |
| Pasajes | `POST /pasajes/:id/comprobante` (subir comprobante transferencia) | Pasajero |
| Pagos | `POST /pagos/mercadopago/webhook` | Mercado Pago (server-to-server) |
| Chofer | `GET /chofer/viajes/:id/pasajeros` | Chofer |
| Chofer | `GET /chofer/viajes/:id/ruta` | Chofer |
| Chofer | `PATCH /chofer/pasajes/:id/documento` (marcar no verificado) | Chofer |
| Admin | `GET /admin/usuarios` / `PATCH /admin/usuarios/:id/estado` | Administrador |
| Admin | `PATCH /admin/usuarios/:id/reactivar-moroso` | Administrador |
| Admin | `GET /admin/pagos/pendientes` / `PATCH /admin/pagos/:id/validar` | Administrador |
| Admin | `GET /admin/estadisticas` | Administrador |
| Admin | `GET /admin/horarios` / `POST /admin/horarios` / `PATCH /admin/horarios/:id` | Administrador |
| Admin | `PATCH /admin/config/descuento` | Administrador |
| Admin | `GET /admin/cupones` / `POST /admin/cupones` / `PATCH /admin/cupones/:id` | Administrador |

---

## 11. Seguridad — resumen aterrizado (RNF-01, RNF-02)

- HTTPS en toda comunicación.
- Contraseñas con hash (bcrypt/argon2), nunca en texto plano.
- Validación de todos los inputs con Zod en cada endpoint (patrón ya usado en VacationMatch).
- Autorización por rol verificada en el servidor en cada ruta protegida, nunca solo ocultando botones en el frontend.
- `rol` nunca se acepta desde el formulario público de registro (ver sección 5).
- Rate limiting en `/auth/login` y `/auth/registro` para mitigar fuerza bruta.

---

## 12. Próximos pasos

- **Fase 5b — Diseño de interfaz (UX/UI)**: wireframes de las pantallas principales (selección de viaje, checkout, panel chofer, panel admin). Puede resolverse con otra herramienta o acá mismo, cuando quieras retomarlo.
- **Fase 6 — Kanban**: convertir las Historias de Usuario en tarjetas de un tablero (Trello/GitHub Projects/Notion), usando la prioridad ya asignada en `historias-usuario.md` como orden inicial.

---
*Documento vivo: acompaña a `diseno-arquitectura.mermaid`, que se actualiza en conjunto.*