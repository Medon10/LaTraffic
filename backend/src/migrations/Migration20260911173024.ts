import { Migration } from '@mikro-orm/migrations';

export class Migration20260911173024 extends Migration {

  override name = 'Migration20260911173024';

  override up(): void | Promise<void> {
    this.addSql(`create table "cupones" ("id" serial primary key, "codigo" varchar(50) not null, "tipo" text not null, "valor" numeric(10,2) not null, "fecha_inicio" timestamptz null, "fecha_fin" timestamptz null, "uso_unico_por_persona" boolean not null default true, "activo" boolean not null default true);`);
    this.addSql(`alter table "cupones" add constraint "cupones_codigo_unique" unique ("codigo");`);

    this.addSql(`create table "cupon_usos" ("id" serial primary key, "cupon_id" int not null, "usuario_id" int not null, "pasaje_id" int not null, "fecha_uso" timestamptz not null default 'now()');`);
    this.addSql(`alter table "cupon_usos" add constraint "cupon_usos_pasaje_id_unique" unique ("pasaje_id");`);
    this.addSql(`create index "idx_cupon_usos_cupon_usuario" on "cupon_usos" ("cupon_id", "usuario_id");`);

    this.addSql(`alter table "usuarios" drop column "promo_primer_viaje_usada";`);
    this.addSql(`alter table "usuarios" alter column "fecha_registro" set default 'now()';`);

    this.addSql(`alter table "pasajes" alter column "fecha_reserva" set default 'now()';`);

    this.addSql(`alter table "cupones" add constraint "cupones_tipo_check" check ("tipo" in ('monto_fijo', 'porcentaje'));`);

    this.addSql(`alter table "cupon_usos" add constraint "cupon_usos_cupon_id_foreign" foreign key ("cupon_id") references "cupones" ("id");`);
    this.addSql(`alter table "cupon_usos" add constraint "cupon_usos_usuario_id_foreign" foreign key ("usuario_id") references "usuarios" ("id");`);
    this.addSql(`alter table "cupon_usos" add constraint "cupon_usos_pasaje_id_foreign" foreign key ("pasaje_id") references "pasajes" ("id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "cupon_usos" drop constraint "cupon_usos_cupon_id_foreign";`);

    this.addSql(`drop table if exists "cupones" cascade;`);
    this.addSql(`drop table if exists "cupon_usos" cascade;`);

    this.addSql(`alter table "pasajes" alter column "fecha_reserva" set default '2026-09-10 13:48:40.011869-03';`);

    this.addSql(`alter table "usuarios" add "promo_primer_viaje_usada" boolean not null default false;`);
    this.addSql(`alter table "usuarios" alter column "fecha_registro" set default '2026-09-10 13:48:40.011869-03';`);
  }

}
