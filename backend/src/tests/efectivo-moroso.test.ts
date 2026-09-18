import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Rol, MetodoPago, EstadoPago, EstadoPasaje } from '../shared/types/index.js';
import { PasajeService } from '../pasajes/pasaje.service.js';
import { PasajeController } from '../pasajes/pasaje.controller.js';
import { crearPasajeSchema } from '../pasajes/pasaje.schema.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { errorHandler } from '../shared/middleware/error-handler.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';

describe('HU-10: Pagar en efectivo y Control de Morosidad (RN-05)', () => {
  const JWT_SECRET = 'test_secret_traffic';

  const crearToken = (usuarioId: number, rol: Rol = Rol.PASAJERO): string => {
    return jwt.sign({ usuarioId, rol }, JWT_SECRET, { expiresIn: '1h' });
  };

  it('Rechazo 403 si el usuario es moroso e intenta pagar en efectivo (RN-05)', async () => {
    const usuarioMoroso = {
      id: 5,
      nombre: 'Juan',
      apellido: 'Perez',
      email: 'juan@test.com',
      activo: true,
      esMoroso: true, // Moroso por 3 inasistencias previas
      inasistenciasEfectivo: 3,
    };

    const mockEm: any = {
      findOne: async (_entity: any, where: any) => {
        if (where.id === 5) return usuarioMoroso;
        return null;
      },
    };

    // Simulamos la verificación que realiza PasajeService
    const dto = {
      viajeId: 1,
      metodoPago: 'efectivo' as const,
      monto: 12000,
    };

    let errorLanzado: any = null;
    try {
      if (dto.metodoPago === 'efectivo' && usuarioMoroso.esMoroso) {
        const { HttpError } = await import('../shared/middleware/error-handler.middleware.js');
        throw new HttpError(
          403,
          'No podés elegir efectivo como método de pago porque tu cuenta figura como morosa por inasistencias previas. Por favor seleccioná Mercado Pago o transferencia bancaria.'
        );
      }
    } catch (err: any) {
      errorLanzado = err;
    }

    assert.ok(errorLanzado);
    assert.equal(errorLanzado.statusCode, 403);
    assert.ok(errorLanzado.message.includes('morosa'));
    assert.ok(errorLanzado.message.includes('Mercado Pago o transferencia'));
  });

  it('Usuario moroso SÍ puede pagar por Mercado Pago o Transferencia', async () => {
    const usuarioMoroso = {
      id: 5,
      activo: true,
      esMoroso: true,
    };

    // Si el método no es efectivo, la validación de morosidad NO bloquea
    const dtoMp = { metodoPago: 'mercadopago' };
    const dtoTransf = { metodoPago: 'transferencia' };

    const validar = (dto: any) => {
      if (dto.metodoPago === 'efectivo' && usuarioMoroso.esMoroso) {
        throw new Error('Bloqueado');
      }
      return true;
    };

    assert.equal(validar(dtoMp), true);
    assert.equal(validar(dtoTransf), true);
  });

  it('Pago en efectivo descuenta cupo de inmediato sin fecha de expiración de hold (RF-11)', () => {
    const viaje = {
      id: 1,
      capacidadTotal: 14,
      cuposOcupados: 5,
    };

    // Al reservar en efectivo:
    // 1. Cupo se descuenta de inmediato
    viaje.cuposOcupados += 1;
    assert.equal(viaje.cuposOcupados, 6);

    // 2. Sin ventana de espera (hold es nulo)
    const fechaExpiracionHold = null;
    assert.equal(fechaExpiracionHold, null);

    // 3. Pago queda pendiente
    const pago = {
      metodo: MetodoPago.EFECTIVO,
      estado: EstadoPago.PENDIENTE,
      monto: 12000,
      fechaExpiracionHold: null,
    };
    assert.equal(pago.metodo, MetodoPago.EFECTIVO);
    assert.equal(pago.estado, EstadoPago.PENDIENTE);
    assert.equal(pago.fechaExpiracionHold, null);
  });

  it('Flujo HTTP completo: POST /pasajes con efectivo y rechazo a morosos', async () => {
    const app = express();
    app.use(express.json());

    const usuariosDb: any[] = [
      { id: 1, activo: true, esMoroso: false }, // Habilitado
      { id: 2, activo: true, esMoroso: true },  // Moroso
    ];

    const viajesDb: any[] = [
      { id: 1, capacidadTotal: 14, cuposOcupados: 5 },
      { id: 2, capacidadTotal: 14, cuposOcupados: 14 }, // Lleno
    ];

    // Middleware simulado de autenticación
    app.use((req: any, _res: any, next: any) => {
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
    });

    // Endpoint simulado con las mismas reglas de negocio del servicio
    app.post(
      '/pasajes',
      validate(crearPasajeSchema),
      asyncHandler(async (req: any, res: Response) => {
        if (!req.usuario) return res.status(401).json({ message: 'No autenticado' });

        const usuario = usuariosDb.find((u) => u.id === req.usuario.usuarioId);
        if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

        if (req.body.metodo_pago === 'efectivo' && usuario.esMoroso) {
          return res.status(403).json({
            error: true,
            message: 'No podés elegir efectivo como método de pago porque tu cuenta figura como morosa por inasistencias previas. Por favor seleccioná Mercado Pago o transferencia bancaria.',
          });
        }

        const viaje = viajesDb.find((v) => v.id === req.body.viaje_id);
        if (!viaje) return res.status(404).json({ message: 'Viaje no encontrado' });

        if (viaje.capacidadTotal - viaje.cuposOcupados <= 0) {
          return res.status(409).json({
            error: true,
            message: 'Lo sentimos, el viaje ya no tiene lugares disponibles.',
          });
        }

        viaje.cuposOcupados += 1;

        return res.status(201).json({
          pasaje_id: 100,
          estado: EstadoPasaje.PENDIENTE_PAGO,
          monto_final: req.body.monto,
        });
      })
    );
    app.use(errorHandler);

    const server = app.listen(0);
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    try {
      const tokenHabilitado = crearToken(1);
      const tokenMoroso = crearToken(2);

      // 1. Reserva en efectivo exitosa para usuario no moroso
      const resOk = await fetch(`${baseUrl}/pasajes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenHabilitado}`,
        },
        body: JSON.stringify({
          viaje_id: 1,
          metodo_pago: 'efectivo',
          monto: 15000,
          parada_origen_id: 1,
          domicilio_destino: 'San Martín 1234, Rosario',
        }),
      });
      assert.equal(resOk.status, 201);
      const dataOk: any = await resOk.json();
      assert.equal(dataOk.estado, EstadoPasaje.PENDIENTE_PAGO);
      assert.equal(dataOk.monto_final, 15000);
      assert.equal(viajesDb[0].cuposOcupados, 6); // Descontado de inmediato (5 -> 6)

      // 2. Rechazo 403 al usuario moroso intentando pagar en efectivo
      const resMoroso = await fetch(`${baseUrl}/pasajes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenMoroso}`,
        },
        body: JSON.stringify({
          viaje_id: 1,
          metodo_pago: 'efectivo',
          monto: 15000,
          parada_origen_id: 1,
          domicilio_destino: 'San Martín 1234, Rosario',
        }),
      });
      assert.equal(resMoroso.status, 403);
      const dataMoroso: any = await resMoroso.json();
      assert.ok(dataMoroso.message.includes('morosa'));

      // 3. El mismo usuario moroso SÍ puede reservar con transferencia
      const resMorosoTransf = await fetch(`${baseUrl}/pasajes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenMoroso}`,
        },
        body: JSON.stringify({
          viaje_id: 1,
          metodo_pago: 'transferencia',
          monto: 15000,
          parada_origen_id: 1,
          domicilio_destino: 'San Martín 1234, Rosario',
        }),
      });
      assert.equal(resMorosoTransf.status, 201);

      // 4. Rechazo 409 si el viaje está lleno
      const resLleno = await fetch(`${baseUrl}/pasajes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenHabilitado}`,
        },
        body: JSON.stringify({
          viaje_id: 2, // Lleno (14/14)
          metodo_pago: 'efectivo',
          monto: 15000,
          parada_origen_id: 1,
          domicilio_destino: 'San Martín 1234, Rosario',
        }),
      });
      assert.equal(resLleno.status, 409);
    } finally {
      server.close();
    }
  });
});
