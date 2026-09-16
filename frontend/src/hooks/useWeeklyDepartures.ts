import { useMemo } from 'react';
import type { SentidoViaje, SalidaSemanal } from '../types/index.ts';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function calcularProximasSalidas(sentido: SentidoViaje, cantidad: number = 2): SalidaSemanal[] {
  const salidas: SalidaSemanal[] = [];
  const hoy = new Date();
  const targetDia = sentido === 'colon-rosario' ? 5 : 0; // Viernes / Domingo
  const horaFija = sentido === 'colon-rosario' ? '18:00 hs' : '21:30 hs';

  const cursor = new Date(hoy);
  let intentos = 0;

  while (salidas.length < cantidad && intentos < 30) {
    if (cursor.getDay() === targetDia) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      const fechaISO = `${y}-${m}-${d}`;
      const fechaFormato = `${DIAS_SEMANA[targetDia]} ${cursor.getDate()} de ${MESES[cursor.getMonth()]}`;

      salidas.push({
        id: fechaISO,
        fechaFormato,
        fechaISO,
        hora: horaFija,
        butacasLibres: salidas.length === 0 ? 6 : 11,
        precioBase: 9500,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
    intentos++;
  }

  return salidas;
}

export function useWeeklyDepartures(sentido: SentidoViaje, cantidad: number = 2) {
  return useMemo(() => calcularProximasSalidas(sentido, cantidad), [sentido, cantidad]);
}
