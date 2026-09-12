import { z } from 'zod';

/**
 * Esquema de validación para el registro público de usuarios (HU-01).
 *
 * CRÍTICO: Este esquema NO define ni acepta el campo `rol`.
 * El middleware de validación Zod descartará cualquier campo no declarado,
 * y el servicio de autenticación forzará siempre rol = 'pasajero' en el servidor.
 */
export const registroSchema = z.object({
  dni: z
    .string()
    .trim()
    .min(6, 'El DNI debe tener al menos 6 dígitos')
    .max(20, 'El DNI no puede exceder los 20 caracteres')
    .regex(/^[0-9]+$/, 'El DNI debe contener únicamente números'),
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder los 100 caracteres'),
  apellido: z
    .string()
    .trim()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(100, 'El apellido no puede exceder los 100 caracteres'),
  email: z
    .string()
    .trim()
    .email('El formato del email no es válido')
    .max(150, 'El email no puede exceder los 150 caracteres')
    .toLowerCase(),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100, 'La contraseña no puede exceder los 100 caracteres'),
});

export type RegistroDto = z.infer<typeof registroSchema>;

/**
 * Esquema de validación para el inicio de sesión (HU-02).
 * Acepta DNI (o email) y contraseña.
 */
export const loginSchema = z.object({
  dni: z
    .string()
    .trim()
    .min(1, 'El DNI o usuario no puede estar vacío'),
  password: z
    .string()
    .min(1, 'La contraseña no puede estar vacía'),
});

export type LoginDto = z.infer<typeof loginSchema>;
