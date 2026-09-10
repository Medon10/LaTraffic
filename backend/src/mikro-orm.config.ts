import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';
import dotenv from 'dotenv';

import { UsuarioSchema } from './usuarios/usuario.entity.js';
import { HorarioSchema } from './horarios/horario.entity.js';
import { ViajeSchema } from './viajes/viaje.entity.js';
import { ParadaSchema } from './paradas/parada.entity.js';
import { PasajeSchema } from './pasajes/pasaje.entity.js';
import { PagoSchema } from './pagos/pago.entity.js';

dotenv.config();

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,

  // Entidades registradas explícitamente con defineEntity
  entities: [
    UsuarioSchema,
    HorarioSchema,
    ViajeSchema,
    ParadaSchema,
    PasajeSchema,
    PagoSchema,
  ],

  // Migraciones
  extensions: [Migrator],
  migrations: {
    path: './dist/migrations',
    pathTs: './src/migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    allOrNothing: true,
    snapshot: true,
  },

  // Debug: mostrar queries en desarrollo
  debug: process.env.NODE_ENV === 'development',
});
