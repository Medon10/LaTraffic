import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../src/mikro-orm.config.js';
import { Rol } from '../src/shared/types/index.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';

const SALT_ROUNDS = 10;

interface SeedUserConfig {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  passwordPlana: string;
  rol: Rol;
}

const defaultUsers: SeedUserConfig[] = [
  {
    nombre: process.env.SEED_ADMIN_NOMBRE || 'Admin',
    apellido: process.env.SEED_ADMIN_APELLIDO || 'Sistema',
    dni: process.env.SEED_ADMIN_DNI || '20111222',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@latraffic.com',
    passwordPlana: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
    rol: Rol.ADMINISTRADOR,
  },
  {
    nombre: process.env.SEED_CHOFER_NOMBRE || 'Chofer',
    apellido: process.env.SEED_CHOFER_APELLIDO || 'Principal',
    dni: process.env.SEED_CHOFER_DNI || '30111222',
    email: process.env.SEED_CHOFER_EMAIL || 'chofer@latraffic.com',
    passwordPlana: process.env.SEED_CHOFER_PASSWORD || 'Chofer123!',
    rol: Rol.CHOFER,
  },
];

async function seed() {
  console.log('───────────────────────────────────────────────────────');
  console.log('🚀 Iniciando script de seed de Chofer y Administrador...');
  console.log('───────────────────────────────────────────────────────');

  let orm: MikroORM | null = null;

  try {
    orm = await MikroORM.init(config);
    const em = orm.em.fork();

    for (const userData of defaultUsers) {
      // Verificar si ya existe por email o por DNI
      const existingUser = await em.findOne(Usuario, {
        $or: [{ email: userData.email }, { dni: userData.dni }],
      });

      const passwordHash = await bcrypt.hash(userData.passwordPlana, SALT_ROUNDS);

      if (existingUser) {
        // Si ya existe, actualizamos su rol, estado y contraseña para asegurar acceso
        console.log(`ℹ El usuario [${userData.email}] ya existía. Actualizando rol, datos y contraseña...`);
        existingUser.nombre = userData.nombre;
        existingUser.apellido = userData.apellido;
        existingUser.dni = userData.dni;
        existingUser.rol = userData.rol;
        existingUser.passwordHash = passwordHash;
        existingUser.activo = true;
        existingUser.esMoroso = false;
        await em.persist(existingUser).flush();
        console.log(`✓ Usuario actualizado: ${userData.email} (${userData.rol})`);
      } else {
        const nuevoUsuario = em.create(Usuario, {
          dni: userData.dni,
          nombre: userData.nombre,
          apellido: userData.apellido,
          email: userData.email,
          passwordHash,
          rol: userData.rol,
          activo: true,
          esMoroso: false,
          inasistenciasEfectivo: 0,
          fechaRegistro: new Date(),
        });

        await em.persist(nuevoUsuario).flush();
        console.log(`✓ Usuario creado con éxito: ${userData.email} (${userData.rol})`);
      }
    }

    console.log('───────────────────────────────────────────────────────');
    console.log('✨ Cuentas configuradas correctamente:');
    defaultUsers.forEach((u) => {
      console.log(` • Rol: ${u.rol.toUpperCase()}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   DNI:   ${u.dni}`);
      console.log(`   Pass:  ${u.passwordPlana}`);
    });
    console.log('───────────────────────────────────────────────────────');
  } catch (error: any) {
    console.error('❌ Error al ejecutar el script de seed:', error);
    process.exitCode = 1;
  } finally {
    if (orm) {
      await orm.close(true);
      console.log('🔌 Conexión a la base de datos cerrada.');
    }
  }
}

seed();
