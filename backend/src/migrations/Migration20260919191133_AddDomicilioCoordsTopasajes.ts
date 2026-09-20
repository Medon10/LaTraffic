import { Migration } from '@mikro-orm/migrations';

export class Migration20260919191133_AddDomicilioCoordsTopasajes extends Migration {

  override name = 'Migration20260919191133_AddDomicilioCoordsTopasajes';

  override up(): void | Promise<void> {
    this.addSql(`alter table "pasajes" add "lat_origen" numeric(10,7) null, add "lon_origen" numeric(10,7) null, add "lat_destino" numeric(10,7) null, add "lon_destino" numeric(10,7) null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "pasajes" drop column "lat_origen", drop column "lon_origen", drop column "lat_destino", drop column "lon_destino";`);
  }

}
