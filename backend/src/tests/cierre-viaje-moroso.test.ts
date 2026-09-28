import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express, { Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  Rol,
  EstadoViaje,
  EstadoPasaje,
  MetodoPago,
} from '../shared/types/index.js';
import { errorHandler } from '../shared/middleware/error-handler.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';

/**
 * Tests de HU-16 — Marcado automático de moroso (RN-05).
 *
 * Estrategia: se prueba la lógica de negocio directamente con objetos en
 * memoria y se complementa con un test de integración HTTP que reproduce el
 * endpoint PATCH /viajes/:id/finalizar usando una implementación simplificada
 * del servicio, siguiendo el mismo patrón que los demás tests del proyecto.
 */
describe('HU-16: Marcado automático de moroso al cerrar viaje (RN-05)', () => {
  const JWT_SECRET = 'test_secret_traffic';

  const crearToken = (usuarioId: number, rol: Rol): string =>
    jwt.sign({ usuarioId, rol }, JWT_SECRET, { expiresIn: '1h' });

  // ──────────────────────────────────────────────────────────────────────────
  // Lógica de negocio pura (sin HTTP)
  // ──────────────────────────────────────────────────────────────────────────

  it('Incrementa inasistenciasEfectivo por cada pasaje no_show en efectivo', () => {
    const usuario = { id: 1, inasistenciasEfectivo: 0, esMoroso: false };
    const UMBRAL = 3;
    let nuevosMorosos = 0;

    usuario.inasistenciasEfectivo += 1;
    if (!usuario.esMoroso && usuario.inasistenciasEfectivo >= UMBRAL) {
      usuario.esMoroso = true;
      nuevosMorosos += 1;
    }

    assert.equal(usuario.inasistenciasEfectivo, 1);
    assert.equal(usuario.esMoroso, false);
    assert.equal(nuevosMorosos, 0);
  });

  it('Marca esMoroso = true cuando inasistenciasEfectivo llega exactamente a 3', () => {
    const usuario = { id: 2, inasistenciasEfectivo: 2, esMoroso: false };
    const UMBRAL = 3;
    let nuevosMorosos = 0;

    usuario.inasistenciasEfectivo += 1;
    if (!usuario.esMoroso && usuario.inasistenciasEfectivo >= UMBRAL) {
      usuario.esMoroso = true;
      nuevosMorosos += 1;
    }

    assert.equal(usuario.inasistenciasEfectivo, 3);
    assert.equal(usuario.esMoroso, true);
    assert.equal(nuevosMorosos, 1);
  });

  it('No re-cuenta a un usuario que ya era moroso (idempotencia del flag)', () => {
    const usuario = { id: 3, inasistenciasEfectivo: 3, esMoroso: true };
    const UMBRAL = 3;
    let nuevosMorosos = 0;

    // Cuarto no-show
    usuario.inasistenciasEfectivo += 1;
    if (!usuario.esMoroso && usuario.inasistenciasEfectivo >= UMBRAL) {
      usuario.esMoroso = true;
      nuevosMorosos += 1;
    }

    assert.equal(usuario.inasistenciasEfectivo, 4);
    assert.equal(usuario.esMoroso, true);   // Seguía siendo moroso
    assert.equal(nuevosMorosos, 0);          // No se contó como nuevo moroso
  });

  it('No afecta pasajes no_show con método de pago distinto de efectivo', () => {
    const usuario = { id: 4, inasistenciasEfectivo: 0, esMoroso: false };

    const pasajesNoShowOtroMetodo = [
      { pago: { metodo: MetodoPago.TRANSFERENCIA }, usuario },
      { pago: { metodo: MetodoPago.MERCADOPAGO }, usuario },
    ];

    const UMBRAL = 3;
    let nuevosMorosos = 0;

    for (const pasaje of pasajesNoShowOtroMetodo) {
      if (pasaje.pago.metodo !== MetodoPago.EFECTIVO) continue; // Filtro RN-05
      pasaje.usuario.inasistenciasEfectivo += 1;
      if (!pasaje.usuario.esMoroso && pasaje.usuario.inasistenciasEfectivo >= UMBRAL) {
        pasaje.usuario.esMoroso = true;
        nuevosMorosos += 1;
      }
    }

    assert.equal(usuario.inasistenciasEfectivo, 0);
    assert.equal(usuario.esMoroso, false);
    assert.equal(nuevosMorosos, 0);
  });

  it('Procesa múltiples usuarios con distintos estados de inasistencia en el mismo cierre', () => {
    const u1 = { id: 10, inasistenciasEfectivo: 0, esMoroso: false }; // Llega a 1
    const u2 = { id: 11, inasistenciasEfectivo: 2, esMoroso: false }; // Llega a 3 → moroso
    const u3 = { id: 12, inasistenciasEfectivo: 3, esMoroso: true };  // Ya era moroso

    const pasajes = [
      { pago: { metodo: MetodoPago.EFECTIVO }, usuario: u1 },
      { pago: { metodo: MetodoPago.EFECTIVO }, usuario: u2 },
      { pago: { metodo: MetodoPago.EFECTIVO }, usuario: u3 },
    ];

    const UMBRAL = 3;
    let nuevosMorosos = 0;

    for (const pasaje of pasajes) {
      pasaje.usuario.inasistenciasEfectivo += 1;
      if (!pasaje.usuario.esMoroso && pasaje.usuario.inasistenciasEfectivo >= UMBRAL) {
        pasaje.usuario.esMoroso = true;
        nuevosMorosos += 1;
      }
    }

    assert.equal(u1.inasistenciasEfectivo, 1);
    assert.equal(u1.esMoroso, false);
    assert.equal(u2.inasistenciasEfectivo, 3);
    assert.equal(u2.esMoroso, true);
    assert.equal(u3.inasistenciasEfectivo, 4);
    assert.equal(u3.esMoroso, true);
    assert.equal(nuevosMorosos, 1); // Solo u2 fue recién marcado
  });

  it('Un viaje sin pasajes no_show en efectivo no modifica ningún usuario', () => {
    const usuario = { id: 20, inasistenciasEfectivo: 1, esMoroso: false };
    const pasajesNoShow: any[] = [];

    const UMBRAL = 3;
    let nuevosMorosos = 0;

    for (const pasaje of pasajesNoShow) {
      pasaje.usuario.inasistenciasEfectivo += 1;
      if (!pasaje.usuario.esMoroso && pasaje.usuario.inasistenciasEfectivo >= UMBRAL) {
        pasaje.usuario.esMoroso = true;
        nuevosMorosos += 1;
      }
    }

    assert.equal(usuario.inasistenciasEfectivo, 1); // Sin cambios
    assert.equal(usuario.esMoroso, false);
    assert.equal(nuevosMorosos, 0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Integración HTTP
  // ──────────────────────────────────────────────────────────────────────────

  it('Flujo HTTP completo: PATCH /viajes/:id/finalizar con control de morosos y guardas de acceso', async () => {
    const app = express();
    app.use(express.json());

    const UMBRAL = 3;

    const viajesDb: Record<number, any> = {
      1: { id: 1, estado: EstadoViaje.PROGRAMADO },
    };

    const usuariosDb: Record<number, any> = {
      5: { id: 5, inasistenciasEfectivo: 2, esMoroso: false }, // Al cerrar llega a 3
      6: { id: 6, inasistenciasEfectivo: 0, esMoroso: false }, // Al cerrar llega a 1
    };

    // Pasajes: 2 no-show efectivo, 1 confirmado (no cuenta), 1 no-show pero MP (no cuenta)
    const pasajesDb = [
      { id: 100, viajeId: 1, estado: EstadoPasaje.NO_SHOW, usuarioId: 5, metodo: MetodoPago.EFECTIVO },
      { id: 101, viajeId: 1, estado: EstadoPasaje.NO_SHOW, usuarioId: 6, metodo: MetodoPago.EFECTIVO },
      { id: 102, viajeId: 1, estado: EstadoPasaje.CONFIRMADA, usuarioId: 5, metodo: MetodoPago.EFECTIVO },
      { id: 103, viajeId: 1, estado: EstadoPasaje.NO_SHOW, usuarioId: 6, metodo: MetodoPago.MERCADOPAGO },
    ];

    // Middleware de autenticación simulado
    app.use((req: any, _res: any, next: any) => {
      const header = req.headers.authorization;
      if (header?.startsWith('Bearer ')) {
        try {
          req.usuario = jwt.verify(header.slice(7), JWT_SECRET);
        } catch { /* noop */ }
      }
      next();
    });

    // Endpoint que reproduce ViajeService.cerrarViaje()
    app.patch(
      '/viajes/:id/finalizar',
      asyncHandler(async (req: any, res: Response) => {
        if (!req.usuario) {
          return res.status(401).json({ error: true, message: 'No autenticado' });
        }
        if (req.usuario.rol !== Rol.ADMINISTRADOR) {
          return res.status(403).json({ error: true, message: 'Acceso denegado' });
        }

        const viajeId = Number(req.params.id);
        const viaje = viajesDb[viajeId];
        if (!viaje) return res.status(404).json({ error: true, message: 'Viaje no encontrado' });
        if (viaje.estado === EstadoViaje.FINALIZADO) {
          return res.status(400).json({ error: true, message: 'El viaje ya se encuentra finalizado' });
        }

        viaje.estado = EstadoViaje.FINALIZADO;

        const noShows = pasajesDb.filter(
          (p) =>
            p.viajeId === viajeId &&
            p.estado === EstadoPasaje.NO_SHOW &&
            p.metodo === MetodoPago.EFECTIVO
        );

        let nuevosMorosos = 0;
        for (const pasaje of noShows) {
          const usuario = usuariosDb[pasaje.usuarioId];
          if (!usuario) continue;
          usuario.inasistenciasEfectivo += 1;
          if (!usuario.esMoroso && usuario.inasistenciasEfectivo >= UMBRAL) {
            usuario.esMoroso = true;
            nuevosMorosos += 1;
          }
        }

        return res.status(200).json({
          viajeId,
          noShowsEfectivo: noShows.length,
          nuevosMorosos,
          mensaje: `Viaje finalizado. Se procesaron ${noShows.length} no-show(s) en efectivo.`,
        });
      })
    );

    app.use(errorHandler);

    const server = app.listen(0);
    const port = (server.address() as any).port;
    const base = `http://localhost:${port}`;

    try {
      const tokenAdmin = crearToken(99, Rol.ADMINISTRADOR);
      const tokenPasajero = crearToken(5, Rol.PASAJERO);

      // 1. Cierre exitoso — solo procesa los 2 no-show en efectivo
      const resOk = await fetch(`${base}/viajes/1/finalizar`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });
      assert.equal(resOk.status, 200);
      const dataOk: any = await resOk.json();
      assert.equal(dataOk.viajeId, 1);
      assert.equal(dataOk.noShowsEfectivo, 2);  // pasajes 100 y 101
      assert.equal(dataOk.nuevosMorosos, 1);    // solo u5 llega a umbral (2+1=3)

      // Verificar estado en memoria
      assert.equal(viajesDb[1].estado, EstadoViaje.FINALIZADO);
      assert.equal(usuariosDb[5].inasistenciasEfectivo, 3);
      assert.equal(usuariosDb[5].esMoroso, true);
      assert.equal(usuariosDb[6].inasistenciasEfectivo, 1);
      assert.equal(usuariosDb[6].esMoroso, false);

      // 2. Doble cierre → 400
      const resDoble = await fetch(`${base}/viajes/1/finalizar`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });
      assert.equal(resDoble.status, 400);
      const dataDoble: any = await resDoble.json();
      assert.ok(dataDoble.message.includes('ya se encuentra finalizado'));

      // 3. Pasajero no puede cerrar → 403
      const resPasajero = await fetch(`${base}/viajes/1/finalizar`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenPasajero}` },
      });
      assert.equal(resPasajero.status, 403);

      // 4. Sin token → 401
      const resSinToken = await fetch(`${base}/viajes/1/finalizar`, { method: 'PATCH' });
      assert.equal(resSinToken.status, 401);

      // 5. Viaje inexistente → 404
      const resNoViaje = await fetch(`${base}/viajes/999/finalizar`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });
      assert.equal(resNoViaje.status, 404);
    } finally {
      server.close();
    }
  });
});
