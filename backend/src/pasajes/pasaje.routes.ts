import { Router } from 'express';
import { PasajeController } from './pasaje.controller.js';
import { crearPasajeSchema } from './pasaje.schema.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';
import { Rol } from '../shared/types/index.js';

const router = Router();
const pasajeController = new PasajeController();

/**
 * POST /pasajes
 *
 * Crea una reserva de pasaje para el pasajero autenticado (HU-08, HU-09, HU-10).
 *
 * Body:
 *   viaje_id          number   — ID del viaje seleccionado
 *   metodo_pago       string   — 'mercadopago' | 'transferencia' | 'efectivo'
 *   monto             number   — Monto en ARS (precio base sin descuento)
 *   parada_origen_id? number   — ID de parada de origen (XOR domicilio_origen)
 *   domicilio_origen? string   — Domicilio de origen (XOR parada_origen_id)
 *   parada_destino_id? number  — ID de parada de destino (XOR domicilio_destino)
 *   domicilio_destino? string  — Domicilio de destino (XOR parada_destino_id)
 *   codigo_cupon?     string   — Código de cupón de descuento (HU-22)
 *
 * Respuesta 201:
 *   pasaje_id         number
 *   estado            string   — 'pendiente_pago'
 *   monto_final       number   — Monto tras aplicar cupón
 *   descuento_aplicado? number — Solo si se usó un cupón
 *   init_point?       string   — Solo si metodo_pago = 'mercadopago'
 *   preference_id?    string   — Solo si metodo_pago = 'mercadopago'
 *
 * Respuesta 409: sin cupo disponible (RF-12)
 */
router.post(
  '/',
  verificarToken,
  autorizar(Rol.PASAJERO),
  validate(crearPasajeSchema),
  asyncHandler(pasajeController.crear)
);

// Rutas adicionales — se implementan en HU-06, HU-09
// GET  /pasajes/mis-reservas
// POST /pasajes/:id/comprobante

export { router as pasajeRoutes };
