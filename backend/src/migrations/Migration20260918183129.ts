import { Migration } from '@mikro-orm/migrations';

/**
 * Agrega mp_payment_id a pagos (ya incluido en migración anterior).
 * No hay cambios de esquema nuevos en HU-08 — todo opera sobre tablas existentes.
 *
 * Nota: si mp_payment_id ya existe (Migration20260918004516), esta migración
 * es una no-op que solo sirve de marcador histórico.
 */
export class Migration20260918183129 extends Migration {
  override name = 'Migration20260918183129';

  override up(): void | Promise<void> {
    // Sin cambios estructurales: HU-08 solo añade lógica de negocio sobre el esquema
    // existente (pasajes + pagos + viajes con cupos_ocupados ya presente).
  }

  override down(): void | Promise<void> {
    // noop
  }
}
