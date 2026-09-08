import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,

  // Entidades — descubiertas automáticamente en todos los subdirectorios
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],

  // Metadatos via ts-morph (evita problemas de reflect-metadata)
  metadataProvider: TsMorphMetadataProvider,

  // Migraciones
  extensions: [Migrator],
  migrations: {
    path: './src/migrations',
    pathTs: './src/migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    allOrNothing: true,
    snapshot: true,
  },

  // Debug: mostrar queries en desarrollo
  debug: process.env.NODE_ENV === 'development',
});
