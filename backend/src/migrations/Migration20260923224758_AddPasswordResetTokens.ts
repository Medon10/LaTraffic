import { Migration } from '@mikro-orm/migrations';

export class Migration20260923224758_AddPasswordResetTokens extends Migration {

  override name = 'Migration20260923224758_AddPasswordResetTokens';

  override up(): void | Promise<void> {
    this.addSql(`create table "password_reset_tokens" ("id" serial primary key, "token_hash" varchar(64) not null, "usuario_id" int not null, "fecha_expiracion" timestamptz not null, "usado" boolean not null default false, "fecha_creacion" timestamptz not null default now());`);
    this.addSql(`alter table "password_reset_tokens" add constraint "password_reset_tokens_token_hash_unique" unique ("token_hash");`);

    this.addSql(`alter table "password_reset_tokens" add constraint "password_reset_tokens_usuario_id_foreign" foreign key ("usuario_id") references "usuarios" ("id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "password_reset_tokens" cascade;`);
  }

}
