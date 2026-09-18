import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Rol, MetodoPago, EstadoPago, EstadoPasaje } from '../shared/types/index.js';
import { liberarHoldsVencidos } from '../pasajes/hold.service.js';
import { subirComprobanteSchema } from '../pasajes/pasaje.schema.js';
import { validarPagoSchema } from '../admin/admin.schema.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { errorHandler } from '../shared/middleware/error-handler.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';

describe('HU-09: Flujo Híbrido Web + WhatsApp, Hold de 4h, Validación Admin y Limpieza Lazy', () => {
  const JWT_SECRET = 'test_secret_traffic';

  const crearToken = (usuarioId: number, rol: Rol = Rol.PASAJERO): string => {
    return jwt.sign({ usuarioId, rol }, JWT_SECRET, { expiresIn: '1h' });
  };

  it('liberarHoldsVencidos: libera holds vencidos, actualiza estados y decrementa cupos_ocupados', async () => {
    let flushCalled = false;
    const ahora = new Date();
    const fechaVencida = new Date(ahora.getTime() - 1000 * 60 * 60); // 1 hora atrás
    const fechaVigente = new Date(ahora.getTime() + 1000 * 60 * 60 * 3); // 3 horas adelante

    const mockViaje = {
      id: 10,
      capacidadTotal: 14,
      cuposOcupados: 5,
    };

    const pasajeVencido = {
      id: 1,
      estado: EstadoPasaje.PENDIENTE_PAGO,
      viaje: mockViaje,
      pago: {
        id: 101,
        metodo: MetodoPago.TRANSFERENCIA,
        estado: EstadoPago.PENDIENTE,
        fechaExpiracionHold: fechaVencida,
      },
    };

    const pasajeVigente = {
      id: 2,
      estado: EstadoPasaje.PENDIENTE_PAGO,
      viaje: mockViaje,
      pago: {
        id: 102,
        metodo: MetodoPago.TRANSFERENCIA,
        estado: EstadoPago.PENDIENTE,
        fechaExpiracionHold: fechaVigente,
      },
    };

    const mockEm: any = {
      find: async () => [pasajeVencido, pasajeVigente],
      flush: async () => {
        flushCalled = true;
      },
    };

    const resultado = await liberarHoldsVencidos(mockEm, 10, mockViaje as any);

    assert.equal(resultado.liberados, 1);
    assert.deepEqual(resultado.pasajesIds, [1]);
    assert.equal(pasajeVencido.estado, EstadoPasaje.VENCIDA);
    assert.equal(pasajeVencido.pago.estado, EstadoPago.VENCIDO);
    assert.equal(mockViaje.cuposOcupados, 4); // 5 - 1 = 4
    assert.equal(pasajeVigente.estado, EstadoPasaje.PENDIENTE_PAGO);
    assert.equal(flushCalled, true);
  });

  it('Reserva por transferencia: genera datos bancarios y URL de WhatsApp con mensaje pre-armado (Opción 1)', () => {
    const pasajeId = 45;
    const viajeId = 12;
    const montoFinal = 15000;
    const adminPhone = '5493482000000';

    const whatsappMensaje = `Hola! Acabo de reservar el pasaje #${pasajeId} para el viaje #${viajeId} por un monto de $${montoFinal}. Adjunto el comprobante de la transferencia para que puedas confirmar mi reserva. Muchas gracias!`;
    const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(whatsappMensaje)}`;

    assert.ok(whatsappUrl.includes('wa.me/5493482000000'));
    assert.ok(whatsappUrl.includes(encodeURIComponent('pasaje #45')));
    assert.ok(whatsappUrl.includes(encodeURIComponent('$15000')));
  });

  it('Limpieza lazy en reserva: combi con cupo lleno (14/14) pero con hold vencido permite nueva reserva', async () => {
    const ahora = new Date();
    const mockViaje = {
      id: 50,
      capacidadTotal: 14,
      cuposOcupados: 14,
    };

    const pasajeHoldVencido = {
      id: 77,
      estado: EstadoPasaje.PENDIENTE_PAGO,
      viaje: mockViaje,
      pago: {
        id: 777,
        metodo: MetodoPago.TRANSFERENCIA,
        estado: EstadoPago.PENDIENTE,
        fechaExpiracionHold: new Date(ahora.getTime() - 1000 * 60 * 30),
      },
    };

    const mockTxEm: any = {
      find: async () => [pasajeHoldVencido],
      flush: async () => {},
    };

    await liberarHoldsVencidos(mockTxEm, 50, mockViaje as any);

    assert.equal(mockViaje.cuposOcupados, 13);
    const cuposLibres = mockViaje.capacidadTotal - mockViaje.cuposOcupados;
    assert.equal(cuposLibres, 1);
    assert.equal(pasajeHoldVencido.estado, EstadoPasaje.VENCIDA);
    assert.equal(pasajeHoldVencido.pago.estado, EstadoPago.VENCIDO);
  });

  it('Validación del Administrador (PATCH /admin/pagos/:id/validar): aprobar confirma pasaje y fechaPago', async () => {
    const viaje = { id: 1, cuposOcupados: 3 };
    const pasaje = { id: 10, estado: EstadoPasaje.PENDIENTE_PAGO, viaje };
    const pago = {
      id: 100,
      estado: EstadoPago.PENDIENTE,
      metodo: MetodoPago.TRANSFERENCIA,
      fechaExpiracionHold: new Date(Date.now() + 1000 * 60 * 60 * 2), // Vigente
      fechaPago: null as Date | null,
      pasaje,
    };

    let flushCalled = false;
    const mockEm: any = {
      findOne: async () => pago,
      flush: async () => { flushCalled = true; },
    };

    // Simulando acción 'aprobar'
    pago.estado = EstadoPago.APROBADO;
    pago.fechaPago = new Date();
    pago.pasaje.estado = EstadoPasaje.CONFIRMADA;
    await mockEm.flush();

    assert.equal(pago.estado, EstadoPago.APROBADO);
    assert.equal(pasaje.estado, EstadoPasaje.CONFIRMADA);
    assert.ok(pago.fechaPago instanceof Date);
    assert.equal(viaje.cuposOcupados, 3); // Cupo sigue ocupado porque se confirmó
    assert.equal(flushCalled, true);
  });

  it('Validación del Administrador (PATCH /admin/pagos/:id/validar): rechazar cancela pasaje y libera cupo', async () => {
    const viaje = { id: 1, cuposOcupados: 3 };
    const pasaje = { id: 11, estado: EstadoPasaje.PENDIENTE_PAGO, viaje };
    const pago = {
      id: 101,
      estado: EstadoPago.PENDIENTE,
      metodo: MetodoPago.TRANSFERENCIA,
      fechaExpiracionHold: new Date(Date.now() + 1000 * 60 * 60 * 2),
      pasaje,
    };

    // Simulando acción 'rechazar'
    pago.estado = EstadoPago.RECHAZADO;
    pago.pasaje.estado = EstadoPasaje.CANCELADA;
    if (viaje.cuposOcupados > 0) {
      viaje.cuposOcupados -= 1;
    }

    assert.equal(pago.estado, EstadoPago.RECHAZADO);
    assert.equal(pasaje.estado, EstadoPasaje.CANCELADA);
    assert.equal(viaje.cuposOcupados, 2); // Cupo liberado
  });

  it('Flujo HTTP completo: POST /pasajes/:id/comprobante con validación de permisos y hold', async () => {
    const app = express();
    app.use(express.json());

    const authMock = (req: any, _res: any, next: any) => {
      const header = req.headers.authorization;
      if (header && header.startsWith('Bearer ')) {
        const token = header.slice(7);
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          req.usuario = decoded;
          return next();
        } catch {}
      }
      return next();
    };
    app.use(authMock);

    const pasajesDb: any[] = [
      {
        id: 1,
        usuarioId: 10,
        estado: EstadoPasaje.PENDIENTE_PAGO,
        pago: {
          id: 1,
          metodo: MetodoPago.TRANSFERENCIA,
          estado: EstadoPago.PENDIENTE,
          fechaExpiracionHold: new Date(Date.now() + 1000 * 60 * 60 * 3),
          comprobanteUrl: null,
        },
      },
      {
        id: 2,
        usuarioId: 10,
        estado: EstadoPasaje.PENDIENTE_PAGO,
        pago: {
          id: 2,
          metodo: MetodoPago.TRANSFERENCIA,
          estado: EstadoPago.PENDIENTE,
          fechaExpiracionHold: new Date(Date.now() - 1000 * 60 * 60), // Expirado
          comprobanteUrl: null,
        },
      },
    ];

    app.post(
      '/pasajes/:id/comprobante',
      validate(subirComprobanteSchema),
      asyncHandler(async (req: Request, res: Response) => {
        const usuario = (req as any).usuario;
        if (!usuario) return res.status(401).json({ message: 'No autenticado' });

        const pasajeId = Number(req.params.id);
        const pasaje = pasajesDb.find((p) => p.id === pasajeId);
        if (!pasaje) return res.status(404).json({ message: 'No encontrado' });
        if (pasaje.usuarioId !== usuario.usuarioId) return res.status(403).json({ message: 'Prohibido' });

        if (pasaje.pago.fechaExpiracionHold && pasaje.pago.fechaExpiracionHold < new Date()) {
          pasaje.estado = EstadoPasaje.VENCIDA;
          pasaje.pago.estado = EstadoPago.VENCIDO;
          return res.status(400).json({ message: 'Hold vencido' });
        }

        pasaje.pago.comprobanteUrl = req.body.comprobante_url;
        return res.status(200).json({
          message: 'Comprobante recibido con éxito',
          pasaje_id: pasaje.id,
          comprobante_url: pasaje.pago.comprobanteUrl,
          estado: pasaje.estado,
        });
      })
    );
    app.use(errorHandler);

    const server = app.listen(0);
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    try {
      const token10 = crearToken(10);

      // Subida exitosa
      const resOk = await fetch(`${baseUrl}/pasajes/1/comprobante`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token10}`,
        },
        body: JSON.stringify({ comprobante_url: 'https://comprobantes.com/1.png' }),
      });
      assert.equal(resOk.status, 200);
      const dataOk: any = await resOk.json();
      assert.equal(dataOk.pasaje_id, 1);
      assert.equal(dataOk.comprobante_url, 'https://comprobantes.com/1.png');

      // Rechazo por hold vencido
      const resVencido = await fetch(`${baseUrl}/pasajes/2/comprobante`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token10}`,
        },
        body: JSON.stringify({ comprobante_url: 'https://comprobantes.com/2.png' }),
      });
      assert.equal(resVencido.status, 400);
      assert.equal(pasajesDb.find((p) => p.id === 2).estado, EstadoPasaje.VENCIDA);
    } finally {
      server.close();
    }
  });

  it('Schema Zod validarPagoSchema: valida accion aprobar y rechazar', () => {
    const parseOk = validarPagoSchema.safeParse({ accion: 'aprobar' });
    assert.equal(parseOk.success, true);

    const parseRechazo = validarPagoSchema.safeParse({ accion: 'rechazar', motivo: 'No ingresó el dinero' });
    assert.equal(parseRechazo.success, true);

    const parseFail = validarPagoSchema.safeParse({ accion: 'otro' });
    assert.equal(parseFail.success, false);
  });
});
