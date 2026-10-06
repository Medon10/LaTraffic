import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { Parada } from '../paradas/parada.entity.js';
import { Horario } from '../horarios/horario.entity.js';
import { Viaje } from '../viajes/viaje.entity.js';
import { Cupon } from '../cupones/cupon.entity.js';
import { EstadoViaje, Sentido, TipoCupon } from './types/index.js';

/**
 * Puebla datos iniciales mínimos en la base de datos si las tablas están vacías.
 * Garantiza paradas, horarios semanales, viajes para próximas semanas y cupón inicial.
 */
export async function seedInitialDefaults(orm: MikroORM): Promise<void> {
  const em = orm.em.fork();

  // 1. Paradas iniciales
  const cantParadas = await em.count(Parada);
  if (cantParadas === 0) {
    const paradasData = [
      { id: 1, nombre: 'Terminal / Base', pueblo: 'Colón', latitud: '-33.896700', longitud: '-61.100900' },
      { id: 2, nombre: 'Parada sobre Ruta 8', pueblo: 'Hughes', latitud: '-33.798100', longitud: '-61.334400' },
      { id: 3, nombre: 'Parada sobre Ruta 8', pueblo: 'Wheelwright', latitud: '-33.792800', longitud: '-61.213300' },
    ];
    for (const p of paradasData) {
      const parada = em.create(Parada, p);
      em.persist(parada);
    }
    await em.flush();
    console.log('✓ Se inicializaron 3 paradas fijas por defecto');
  }

  // 2. Horarios iniciales
  const cantHorarios = await em.count(Horario);
  if (cantHorarios === 0) {
    const horariosData = [
      { sentido: Sentido.COLON_ROSARIO, diaSemana: 'viernes', hora: '18:00:00', activo: true },
      { sentido: Sentido.ROSARIO_COLON, diaSemana: 'domingo', hora: '21:30:00', activo: true },
    ];
    for (const h of horariosData) {
      const horario = em.create(Horario, h);
      em.persist(horario);
    }
    await em.flush();
    console.log('✓ Se inicializaron 2 horarios fijos por defecto (Viernes 18hs y Domingo 21:30hs)');
  }

  // 3. Cupón inicial PRIMERVIAJE (HU-22 / T-07)
  const cantCupones = await em.count(Cupon);
  if (cantCupones === 0) {
    const cupon = em.create(Cupon, {
      codigo: 'PRIMERVIAJE',
      tipo: TipoCupon.PORCENTAJE,
      valor: '20.00',
      fechaInicio: new Date(),
      fechaFin: null,
      usoUnicoPorPersona: true,
      activo: true,
    });
    em.persist(cupon);
    await em.flush();
    console.log('✓ Se inicializó el cupón "PRIMERVIAJE" (20% OFF)');
  }

  // 4. Generación de viajes para las próximas 4 semanas
  const cantViajes = await em.count(Viaje);
  if (cantViajes === 0) {
    const horariosActivos = await em.find(Horario, { activo: true });
    const diasMapa: Record<string, number> = {
      domingo: 0,
      lunes: 1,
      martes: 2,
      miercoles: 3,
      jueves: 4,
      viernes: 5,
      sabado: 6,
    };

    const hoy = new Date();
    for (const horario of horariosActivos) {
      const targetDia = diasMapa[horario.diaSemana.toLowerCase()];
      if (targetDia === undefined) continue;

      const cursor = new Date(hoy);
      let creados = 0;
      let diasRecorridos = 0;

      while (creados < 4 && diasRecorridos < 35) {
        if (cursor.getDay() === targetDia) {
          const y = cursor.getFullYear();
          const m = String(cursor.getMonth() + 1).padStart(2, '0');
          const d = String(cursor.getDate()).padStart(2, '0');
          const fechaISO = `${y}-${m}-${d}`;

          const viaje = em.create(Viaje, {
            horario,
            fecha: fechaISO,
            hora: horario.hora,
            capacidadTotal: 14,
            cuposOcupados: 0,
            estado: EstadoViaje.PROGRAMADO,
          });
          em.persist(viaje);
          creados++;
        }
        cursor.setDate(cursor.getDate() + 1);
        diasRecorridos++;
      }
    }
    await em.flush();
    console.log('✓ Se generaron los viajes iniciales programados para las próximas 4 semanas');
  }
}
