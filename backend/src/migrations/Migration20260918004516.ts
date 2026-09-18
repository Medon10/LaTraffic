import { Migration } from '@mikro-orm/migrations';

export class Migration20260918004516 extends Migration {

  override name = 'Migration20260918004516';

  override up(): void | Promise<void> {
    this.addSql(`alter table "usuarios" alter column "fecha_registro" set default now();`);

    this.addSql(`alter table "pasajes" alter column "fecha_reserva" set default now();`);

    this.addSql(`alter table "pagos" add "mp_payment_id" varchar(100) null;`);

    this.addSql(`alter table "cupon_usos" alter column "fecha_uso" set default now();`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "cupon_usos" alter column "fecha_uso" set default '2026-09-14 20:53:01.540358-03';`);

    this.addSql(`alter table "pagos" drop column "mp_payment_id";`);

    this.addSql(`alter table "pasajes" alter column "fecha_reserva" set default '2026-09-14 20:53:01.540358-03';`);

    this.addSql(`alter table "usuarios" alter column "fecha_registro" set default '2026-09-14 20:53:01.540358-03';`);
  }

}
