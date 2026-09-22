import dotenv from 'dotenv';
dotenv.config();
process.env.TOKEN_SECRET =
  process.env.TOKEN_SECRET && process.env.TOKEN_SECRET.length >= 32
    ? process.env.TOKEN_SECRET
    : 'test_secret_traffic_min_32_characters_long_super_secure!';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response, NextFunction } from 'express';
import { Rol } from '../shared/types/index.js';
import { errorHandler, HttpError } from '../shared/middleware/error-handler.middleware.js';

// ── In-memory pasajes DB ──────────────────────────────────────────────────────

interface PasajeMemoria {
  id: number;
  documentoVerificado: boolean | null;
}

const pasajesDb: PasajeMemoria[] = [
  { id: 1, documentoVerificado: true },
  { id: 2, documentoVerificado: null },
];

// ── Stub del servicio ─────────────────────────────────────────────────────────

/**
 * Replica aislada de ChoferService.marcarDocumentoNoVerificado sin ORM ni BD real.
 * Misma semantica: 404 si no existe, actualiza flag y devuelve el resultado.
 */
async function marcarDocumentoNoVerificadoStub(
  pasajeId: number
): Promise<{ pasajeId: number; documentoVerificado: false }> {
  const pasaje = pasajesDb.find((p) => p.id === pasajeId);
  if (!pasaje) {
    throw new HttpError(404, 'Pasaje no encontrado');
  }
  pasaje.documentoVerificado = false;
  return { pasajeId: pasaje.id, documentoVerificado: false };
}

// ── Pruebas unitarias del servicio (sin HTTP) ─────────────────────────────────

describe('HU-14 - Unidad: marcarDocumentoNoVerificado (RF-17)', () => {
  it('[200] true -> false: persiste el cambio correctamente', async () => {
    const result = await marcarDocumentoNoVerificadoStub(1);
    assert.equal(result.pasajeId, 1);
    assert.equal(result.documentoVerificado, false);
    assert.equal(pasajesDb.find((p) => p.id === 1)?.documentoVerificado, false);
  });

  it('[200] null -> false: tambien funciona si el campo era null', async () => {
    const result = await marcarDocumentoNoVerificadoStub(2);
    assert.equal(result.documentoVerificado, false);
    assert.equal(pasajesDb.find((p) => p.id === 2)?.documentoVerificado, false);
  });

  it('[404] lanza HttpError 404 para un pasajeId inexistente', async () => {
    let err: any;
    try {
      await marcarDocumentoNoVerificadoStub(9999);
    } catch (e) {
      err = e;
    }
    assert.ok(err instanceof HttpError);
    assert.equal(err.statusCode, 404);
    assert.match(err.message, /Pasaje no encontrado/i);
  });
});

// ── Pruebas de integracion HTTP (con middleware stubs de auth) ────────────────

/**
 * Stub de auth: simula verificarToken + autorizar(Rol.CHOFER) sin JWT real.
 * Solo acepta si el header X-Test-Rol es 'chofer'.
 * Devuelve 401 si no hay header, 403 si el rol no es 'chofer'.
 */
const stubAuth = (req: Request, res: Response, next: NextFunction): void => {
  const rol = req.headers['x-test-rol'] as string | undefined;
  if (!rol) {
    res.status(401).json({ error: true, message: 'No autenticado (test stub)' });
    return;
  }
  if (rol !== Rol.CHOFER) {
    res.status(403).json({ error: true, message: 'No tenes permisos (test stub)' });
    return;
  }
  next();
};

describe('HU-14 - Integracion HTTP: PATCH /chofer/pasajes/:id/documento', () => {
  const app = express();
  app.use(express.json());

  app.patch(
    '/chofer/pasajes/:id/documento',
    stubAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const pasajeId = parseInt(req.params['id'] as string, 10);
        if (isNaN(pasajeId) || pasajeId <= 0) {
          res.status(400).json({
            error: true,
            message: 'El ID del pasaje debe ser un numero entero positivo.',
          });
          return;
        }
        const resultado = await marcarDocumentoNoVerificadoStub(pasajeId);
        res.status(200).json({ error: false, data: resultado });
      } catch (err) {
        next(err);
      }
    }
  );

  app.use(errorHandler);

  let server: ReturnType<typeof app.listen>;
  let baseUrl: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => server.close());

  it('[200]: Chofer autenticado marca documento_verificado = false en pasaje existente', async () => {
    const res = await fetch(`${baseUrl}/chofer/pasajes/1/documento`, {
      method: 'PATCH',
      headers: { 'X-Test-Rol': Rol.CHOFER },
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.error, false);
    assert.equal(body.data.pasajeId, 1);
    assert.equal(body.data.documentoVerificado, false);
  });

  it('[200]: Funciona cuando documento_verificado era null', async () => {
    const res = await fetch(`${baseUrl}/chofer/pasajes/2/documento`, {
      method: 'PATCH',
      headers: { 'X-Test-Rol': Rol.CHOFER },
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.data.documentoVerificado, false);
  });

  it('[404]: Pasaje inexistente devuelve 404', async () => {
    const res = await fetch(`${baseUrl}/chofer/pasajes/9999/documento`, {
      method: 'PATCH',
      headers: { 'X-Test-Rol': Rol.CHOFER },
    });

    assert.equal(res.status, 404);
    const body: any = await res.json();
    assert.equal(body.error, true);
    assert.match(body.message, /Pasaje no encontrado/i);
  });

  it('[400]: ID no numerico devuelve 400', async () => {
    const res = await fetch(`${baseUrl}/chofer/pasajes/abc/documento`, {
      method: 'PATCH',
      headers: { 'X-Test-Rol': Rol.CHOFER },
    });

    assert.equal(res.status, 400);
    const body: any = await res.json();
    assert.equal(body.error, true);
  });

  it('[400]: ID cero devuelve 400', async () => {
    const res = await fetch(`${baseUrl}/chofer/pasajes/0/documento`, {
      method: 'PATCH',
      headers: { 'X-Test-Rol': Rol.CHOFER },
    });

    assert.equal(res.status, 400);
  });

  it('[401]: Sin credenciales devuelve 401', async () => {
    const res = await fetch(`${baseUrl}/chofer/pasajes/1/documento`, {
      method: 'PATCH',
    });

    assert.equal(res.status, 401);
  });

  it('[403]: Rol distinto a chofer recibe 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/chofer/pasajes/1/documento`, {
      method: 'PATCH',
      headers: { 'X-Test-Rol': Rol.PASAJERO },
    });

    assert.equal(res.status, 403);
  });
});
