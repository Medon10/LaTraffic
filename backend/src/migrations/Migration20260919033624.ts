import { Migration } from '@mikro-orm/migrations';

export class Migration20260919033624 extends Migration {

  override name = 'Migration20260919033624';

  override up(): void | Promise<void> {
    this.addSql(`drop index "idx_cupon_usos_cupon_usuario";`);
    this.addSql(`alter table "cupon_usos" add constraint "idx_cupon_usos_cupon_usuario" unique ("cupon_id", "usuario_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "cupon_usos" drop constraint "idx_cupon_usos_cupon_usuario";`);
    this.addSql(`create index "idx_cupon_usos_cupon_usuario" on "cupon_usos" ("cupon_id", "usuario_id");`);
  }

}
