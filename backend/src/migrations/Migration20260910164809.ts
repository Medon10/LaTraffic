import { Migration } from '@mikro-orm/migrations';

export class Migration20260910164809 extends Migration {

  override name = 'Migration20260910164809';

  override up(): void | Promise<void> {
    this.addSql(`create table "horarios" ("id" serial primary key, "sentido" text not null, "dia_semana" varchar(15) not null, "hora" time(0) not null, "activo" boolean not null default true);`);
    this.addSql(`alter table "horarios" add constraint "horarios_sentido_check" check ("sentido" in ('colon_rosario', 'rosario_colon'));`);

    this.addSql(`create table "paradas" ("id" serial primary key, "nombre" varchar(100) not null, "pueblo" varchar(100) not null, "latitud" numeric(9,6) null, "longitud" numeric(9,6) null);`);

    this.addSql(`create table "usuarios" ("id" serial primary key, "dni" varchar(20) null, "nombre" varchar(100) not null, "apellido" varchar(100) not null, "email" varchar(150) not null, "password_hash" varchar(255) not null, "rol" text not null default 'pasajero', "activo" boolean not null default true, "es_moroso" boolean not null default false, "inasistencias_efectivo" int not null default 0, "promo_primer_viaje_usada" boolean not null default false, "fecha_registro" timestamptz not null default 'now()');`);
    this.addSql(`alter table "usuarios" add constraint "usuarios_email_unique" unique ("email");`);
    this.addSql(`create unique index "uq_usuarios_dni_pasajero" on "usuarios" ("dni") where "rol" = 'pasajero';`);
    this.addSql(`alter table "usuarios" add constraint "usuarios_rol_check" check ("rol" in ('pasajero', 'chofer', 'administrador'));`);

    this.addSql(`create table "viajes" ("id" serial primary key, "horario_id" int not null, "fecha" date not null, "hora" time(0) not null, "capacidad_total" int not null default 14, "cupos_ocupados" int not null default 0, "estado" text not null default 'programado');`);
    this.addSql(`create index "idx_viajes_fecha" on "viajes" ("fecha");`);
    this.addSql(`alter table "viajes" add constraint "viajes_estado_check" check ("estado" in ('programado', 'en_curso', 'finalizado', 'cancelado'));`);

    this.addSql(`create table "pasajes" ("id" serial primary key, "usuario_id" int not null, "viaje_id" int not null, "parada_origen_id" int null, "domicilio_origen" varchar(255) null, "parada_destino_id" int null, "domicilio_destino" varchar(255) null, "estado" text not null default 'pendiente_pago', "documento_verificado" boolean null, "fecha_reserva" timestamptz not null default 'now()');`);
    this.addSql(`create index "idx_pasajes_usuario" on "pasajes" ("usuario_id");`);
    this.addSql(`create index "idx_pasajes_viaje" on "pasajes" ("viaje_id");`);
    this.addSql(`alter table "pasajes" add constraint "chk_pasajes_origen" check (("parada_origen_id" is not null) != ("domicilio_origen" is not null));`);
    this.addSql(`alter table "pasajes" add constraint "chk_pasajes_destino" check (("parada_destino_id" is not null) != ("domicilio_destino" is not null));`);
    this.addSql(`alter table "pasajes" add constraint "pasajes_estado_check" check ("estado" in ('pendiente_pago', 'confirmada', 'vencida', 'cancelada', 'completada', 'no_show'));`);

    this.addSql(`create table "pagos" ("id" serial primary key, "pasaje_id" int not null, "metodo" text not null, "monto" numeric(10,2) not null, "estado" text not null default 'pendiente', "comprobante_url" varchar(255) null, "fecha_pago" timestamptz null, "fecha_expiracion_hold" timestamptz null);`);
    this.addSql(`alter table "pagos" add constraint "pagos_pasaje_id_unique" unique ("pasaje_id");`);
    this.addSql(`alter table "pagos" add constraint "pagos_metodo_check" check ("metodo" in ('mercadopago', 'transferencia', 'efectivo'));`);
    this.addSql(`alter table "pagos" add constraint "pagos_estado_check" check ("estado" in ('pendiente', 'aprobado', 'rechazado', 'vencido'));`);

    this.addSql(`alter table "viajes" add constraint "viajes_horario_id_foreign" foreign key ("horario_id") references "horarios" ("id");`);

    this.addSql(`alter table "pasajes" add constraint "pasajes_usuario_id_foreign" foreign key ("usuario_id") references "usuarios" ("id");`);
    this.addSql(`alter table "pasajes" add constraint "pasajes_viaje_id_foreign" foreign key ("viaje_id") references "viajes" ("id");`);
    this.addSql(`alter table "pasajes" add constraint "pasajes_parada_origen_id_foreign" foreign key ("parada_origen_id") references "paradas" ("id") on delete set null;`);
    this.addSql(`alter table "pasajes" add constraint "pasajes_parada_destino_id_foreign" foreign key ("parada_destino_id") references "paradas" ("id") on delete set null;`);

    this.addSql(`alter table "pagos" add constraint "pagos_pasaje_id_foreign" foreign key ("pasaje_id") references "pasajes" ("id");`);
  }

}
