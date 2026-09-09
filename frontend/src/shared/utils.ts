/**
 * Formatea un número como moneda argentina (ARS).
 * Ejemplo: 12500 -> "$ 12.500" o "$ 12.500,00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea una fecha a formato local legible (ej: "9 de septiembre de 2026" o "09/09/2026")
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-AR', options || {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formatea un string horario HH:mm:ss a HH:mm
 */
export function formatTime(time: string): string {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]} hs`;
  }
  return `${time} hs`;
}

/**
 * Une clases condicionales en un solo string
 */
export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
