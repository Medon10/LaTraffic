import dotenv from 'dotenv';
dotenv.config();
process.env.TOKEN_SECRET =
  process.env.TOKEN_SECRET && process.env.TOKEN_SECRET.length >= 32
    ? process.env.TOKEN_SECRET
    : 'test_secret_traffic_min_32_characters_long_super_secure!';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response, NextFunction } from 'express';
import {
  Rol,
  MetodoPago,
  EstadoPago,
  EstadoPasaje,
} from '../shared/types/index.js';
import { HttpError, errorHandler } from '../shared/middleware/error-handler.middleware.js';
import { validarPagoSchema } from '../admin/admin.schema.js';

// ── Tipos auxiliares ──────────────────────────────────────────────────────────

interface ViajeMemoria {
  id: number;
  cuposOcupados: number;
  capacidadTotal: number;
}

interface PasajeMemoria {
  id: number;
  estado: EstadoPasaje;
  viaje: ViajeMemoria;
  usuario: { id: number; nombre: string; apellido: string; dni: string };
}

interface PagoMemoria {
  id: number;
  estado: EstadoPago;
  metodo: MetodoPago;
  monto: number;
  comprobanteUrl: string | null;
  fechaExpiracionHold: Date | null;
  fechaPago: Date | null;
  pasaje: PasajeMemoria;
}

// ── Base de datos en memoria ──────────────────────────────────────────────────

const viajeA: ViajeMemoria = { id: 10, cuposOcupados: 3, capacidadTotal: 14 };
const viajeB: ViajeMemoria = { id: 11, cuposOcupados: 5, capacidadTotal: 14 };

const pagosDb: PagoMemoria[] = [
  {
    id: 1,
    estado: EstadoPago.PENDIENTE,
    metodo: MetodoPago.TRANSFERENCIA,
    monto: 12000,
    comprobanteUrl: 'https://comprobantes.example.com/p1.png',
    fechaExpiracionHold: new Date(Date.now() + 1000 * 60 * 60 * 3), // vigente (+3h)
    fechaPago: null,
    pasaje: {
      id: 100,
      estado: EstadoPasaje.PENDIENTE_PAGO,
      viaje: viajeA,
      usuario: { id: 1, nombre: 'Juan', apellido: 'Pérez', dni: '12345678' },
    },
  },
  {
    id: 2,
    estado: EstadoPago.PENDIENTE,
    metodo: MetodoPago.TRANSFERENCIA,
    monto: 15000,
    comprobanteUrl: 'https://comprobantes.example.com/p2.png',
    fechaExpiracionHold: new Date(Date.now() + 1000 * 60 * 60 * 2), // vigente (+2h)
    fechaPago: null,
    pasaje: {
      id: 101,
      estado: EstadoPasaje.PENDIENTE_PAGO,
      viaje: viajeB,
      usuario: { id: 2, nombre: 'Ana', apellido: 'García', dni: '87654321' },
    },
  },
  {
    id: 3,
    estado: EstadoPago.APROBADO, // ya procesado → no debe aparecer en pendientes
    metodo: MetodoPago.TRANSFERENCIA,
    monto: 9000,
    comprobanteUrl: 'https://comprobantes.example.com/p3.png',
    fechaExpiracionHold: null,
    fechaPago: new Date(),
    pasaje: {
      id: 102,
      estado: EstadoPasaje.CONFIRMADA,
      viaje: viajeA,
      usuario: { id: 3, nombre: 'Pedro', apellido: 'López', dni: '11111111' },
    },
  },
  {
    id: 4,
    estado: EstadoPago.PENDIENTE,
    metodo: MetodoPago.MERCADOPAGO, // método distinto → no debe aparecer en pendientes de transferencia
    monto: 20000,
    comprobanteUrl: null,
    fechaExpiracionHold: new Date(Date.now() + 1000 * 60 * 25),
    fechaPago: null,
    pasaje: {
      id: 103,
      estado: EstadoPasaje.PENDIENTE_PAGO,
      viaje: viajeB,
      usuario: { id: 4, nombre: 'María', apellido: 'Rodríguez', dni: '22222222' },
    },
  },
];

// ── Stubs de servicio (sin ORM ni BD real) ────────────────────────────────────

/**
 * Replica de AdminService.listarPagosPendientes:
 * filtra pagos con metodo=TRANSFERENCIA y estado=PENDIENTE.
 */
function listarPendientesStub(): PagoMemoria[] {
  return pagosDb.filter(
    (p) => p.metodo === MetodoPago.TRANSFERENCIA && p.estado === EstadoPago.PENDIENTE
  );
}

/**
 * Replica de AdminService.validarPago:
 * Aprobar → estado=APROBADO, fechaPago=now(), pasaje→CONFIRMADA.
 * Rechazar → estado=RECHAZADO, pasaje→CANCELADA, cuposOcupados--.
 * Hold vencido → estado=VENCIDO, pasaje→VENCIDA, cuposOcupados--, lanza 400.
 */
async function validarPagoStub(
  pagoId: number,
  accion: 'aprobar' | 'rechazar'
): Promise<{ pagoId: number; estadoPago: string; estadoPasaje: string; mensaje: string }> {
  const pago = pagosDb.find((p) => p.id === pagoId);

  if (!pago) {
    throw new HttpError(404, 'Pago no encontrado');
  }

  if (pago.estado !== EstadoPago.PENDIENTE) {
    throw new HttpError(
      400,
      `El pago ya se encuentra en estado '${pago.estado}' y no puede ser validado nuevamente`
    );
  }

  const ahora = new Date();
  if (pago.fechaExpiracionHold && pago.fechaExpiracionHold < ahora) {
    pago.estado = EstadoPago.VENCIDO;
    pago.pasaje.estado = EstadoPasaje.VENCIDA;
    const viaje = pago.pasaje.viaje;
    if (viaje.cuposOcupados > 0) viaje.cuposOcupados -= 1;
    throw new HttpError(400, 'El plazo de 4 horas del hold ha expirado. La reserva ya fue dada de baja.');
  }

  if (accion === 'aprobar') {
    pago.estado = EstadoPago.APROBADO;
    pago.fechaPago = new Date();
    pago.pasaje.estado = EstadoPasaje.CONFIRMADA;
    return {
      pagoId: pago.id,
      estadoPago: pago.estado,
      estadoPasaje: pago.pasaje.estado,
      mensaje: 'Pago aprobado con éxito. El pasaje ha quedado confirmado.',
    };
  } else {
    pago.estado = EstadoPago.RECHAZADO;
    pago.pasaje.estado = EstadoPasaje.CANCELADA;
    const viaje = pago.pasaje.viaje;
    if (viaje.cuposOcupados > 0) viaje.cuposOcupados -= 1;
    return {
      pagoId: pago.id,
      estadoPago: pago.estado,
      estadoPasaje: pago.pasaje.estado,
      mensaje: 'Pago rechazado. El pasaje fue cancelado y el cupo liberado.',
    };
  }
}

// ── Pruebas unitarias de los stubs (sin HTTP) ─────────────────────────────────

describe('HU-15 - Unidad: listarPagosPendientes', () => {
  it('[OK] solo retorna transferencias en estado PENDIENTE', () => {
    const pendientes = listarPendientesStub();
    assert.equal(pendientes.length, 2);
    for (const p of pendientes) {
      assert.equal(p.metodo, MetodoPago.TRANSFERENCIA);
      assert.equal(p.estado, EstadoPago.PENDIENTE);
    }
  });

  it('[OK] no incluye pagos ya aprobados ni de otro metodo', () => {
    const pendientes = listarPendientesStub();
    const ids = pendientes.map((p) => p.id);
    assert.ok(!ids.includes(3), 'No debe incluir el pago APROBADO (id=3)');
    assert.ok(!ids.includes(4), 'No debe incluir el pago de MercadoPago (id=4)');
  });

  it('[OK] cada pago expone comprobanteUrl y datos del pasajero', () => {
    const pendientes = listarPendientesStub();
    for (const p of pendientes) {
      assert.ok(p.comprobanteUrl, 'comprobanteUrl no debe ser null para transferencias con comprobante');
      assert.ok(p.pasaje.usuario, 'debe incluir datos del usuario/pasajero');
      assert.ok(p.pasaje.viaje, 'debe incluir datos del viaje');
    }
  });
});

describe('HU-15 - Unidad: validarPago', () => {
  it('[APROBAR] aprueba pago: estado=APROBADO, pasaje=CONFIRMADA, cupo sin liberar', async () => {
    const cuposAntes = viajeA.cuposOcupados;
    const result = await validarPagoStub(1, 'aprobar');

    assert.equal(result.estadoPago, EstadoPago.APROBADO);
    assert.equal(result.estadoPasaje, EstadoPasaje.CONFIRMADA);
    assert.match(result.mensaje, /aprobado/i);

    const pago = pagosDb.find((p) => p.id === 1)!;
    assert.equal(pago.estado, EstadoPago.APROBADO);
    assert.ok(pago.fechaPago instanceof Date, 'fechaPago debe ser una fecha');
    assert.equal(pago.pasaje.estado, EstadoPasaje.CONFIRMADA);
    assert.equal(viajeA.cuposOcupados, cuposAntes, 'Al aprobar, el cupo NO se libera');
  });

  it('[APROBAR] intentar aprobar el mismo pago dos veces lanza HttpError 400', async () => {
    let err: any;
    try {
      await validarPagoStub(1, 'aprobar'); // ya esta APROBADO
    } catch (e) {
      err = e;
    }
    assert.ok(err instanceof HttpError);
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /ya se encuentra en estado/i);
  });

  it('[RECHAZAR] rechaza pago: estado=RECHAZADO, pasaje=CANCELADA, cupo liberado', async () => {
    const cuposAntes = viajeB.cuposOcupados; // pago id=2 usa viajeB
    const result = await validarPagoStub(2, 'rechazar');

    assert.equal(result.estadoPago, EstadoPago.RECHAZADO);
    assert.equal(result.estadoPasaje, EstadoPasaje.CANCELADA);
    assert.match(result.mensaje, /rechazado/i);

    const pago = pagosDb.find((p) => p.id === 2)!;
    assert.equal(pago.estado, EstadoPago.RECHAZADO);
    assert.equal(pago.pasaje.estado, EstadoPasaje.CANCELADA);
    assert.equal(viajeB.cuposOcupados, cuposAntes - 1, 'Al rechazar, cuposOcupados debe decrementarse en 1');
  });

  it('[404] pago inexistente lanza HttpError 404', async () => {
    let err: any;
    try {
      await validarPagoStub(9999, 'aprobar');
    } catch (e) {
      err = e;
    }
    assert.ok(err instanceof HttpError);
    assert.equal(err.statusCode, 404);
    assert.match(err.message, /Pago no encontrado/i);
  });

  it('[HOLD VENCIDO] lanza 400 y libera cupo si el hold de 4h expiro', async () => {
    const viajeVencido: ViajeMemoria = { id: 99, cuposOcupados: 2, capacidadTotal: 14 };
    const pagoVencido: PagoMemoria = {
      id: 99,
      estado: EstadoPago.PENDIENTE,
      metodo: MetodoPago.TRANSFERENCIA,
      monto: 5000,
      comprobanteUrl: 'https://comprobantes.example.com/vencido.png',
      fechaExpiracionHold: new Date(Date.now() - 1000 * 60 * 60 * 5), // hace 5h - vencido
      fechaPago: null,
      pasaje: {
        id: 999,
        estado: EstadoPasaje.PENDIENTE_PAGO,
        viaje: viajeVencido,
        usuario: { id: 9, nombre: 'Test', apellido: 'Vencido', dni: '99999999' },
      },
    };
    pagosDb.push(pagoVencido);

    let err: any;
    try {
      await validarPagoStub(99, 'aprobar');
    } catch (e) {
      err = e;
    }

    assert.ok(err instanceof HttpError);
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /plazo de 4 horas/i);
    assert.equal(viajeVencido.cuposOcupados, 1, 'cuposOcupados debe decrementarse al vencer el hold');
    assert.equal(pagoVencido.estado, EstadoPago.VENCIDO);
    assert.equal(pagoVencido.pasaje.estado, EstadoPasaje.VENCIDA);
  });
});

// ── Stub de autenticacion admin ───────────────────────────────────────────────

/**
 * Simula verificarToken + autorizar(Rol.ADMINISTRADOR) sin JWT real.
 * Acepta si el header X-Test-Rol es 'administrador'.
 * Devuelve 401 si no hay header, 403 si el rol no es administrador.
 */
const stubAuthAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const rol = req.headers['x-test-rol'] as string | undefined;
  if (!rol) {
    res.status(401).json({ error: true, message: 'No autenticado (test stub)' });
    return;
  }
  if (rol !== Rol.ADMINISTRADOR) {
    res.status(403).json({ error: true, message: 'No tenes permisos (test stub)' });
    return;
  }
  next();
};

// ── Middleware de validacion Zod inline ───────────────────────────────────────

const validateBody =
  (schema: typeof validarPagoSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res
        .status(400)
        .json({ error: true, message: 'Validacion fallida', issues: result.error.issues });
      return;
    }
    req.body = result.data;
    next();
  };

// ── Pruebas de integracion HTTP: GET /admin/pagos/pendientes ──────────────────

describe('HU-15 - Integracion HTTP: GET /admin/pagos/pendientes', () => {
  const app = express();
  app.use(express.json());

  // Pago fresco aislado para este bloque
  const viajeGet: ViajeMemoria = { id: 50, cuposOcupados: 1, capacidadTotal: 14 };
  const pagoGet: PagoMemoria = {
    id: 50,
    estado: EstadoPago.PENDIENTE,
    metodo: MetodoPago.TRANSFERENCIA,
    monto: 8000,
    comprobanteUrl: 'https://comprobantes.example.com/get.png',
    fechaExpiracionHold: new Date(Date.now() + 1000 * 60 * 60 * 4),
    fechaPago: null,
    pasaje: {
      id: 500,
      estado: EstadoPasaje.PENDIENTE_PAGO,
      viaje: viajeGet,
      usuario: { id: 50, nombre: 'Fresco', apellido: 'Test', dni: '55555555' },
    },
  };

  app.get(
    '/admin/pagos/pendientes',
    stubAuthAdmin,
    (_req: Request, res: Response, next: NextFunction) => {
      try {
        const pendientes = listarPendientesStub();
        res.status(200).json({ error: false, data: pendientes });
      } catch (err) {
        next(err);
      }
    }
  );

  app.use(errorHandler);

  let server: ReturnType<typeof app.listen>;
  let baseUrl: string;

  before(async () => {
    pagosDb.push(pagoGet);
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => server.close());

  it('[200] Admin autenticado recibe la lista de pagos pendientes de transferencia', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/pendientes`, {
      headers: { 'X-Test-Rol': Rol.ADMINISTRADOR },
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.error, false);
    assert.ok(Array.isArray(body.data));
    for (const p of body.data) {
      assert.equal(p.metodo, MetodoPago.TRANSFERENCIA);
      assert.equal(p.estado, EstadoPago.PENDIENTE);
    }
  });

  it('[200] La respuesta incluye comprobanteUrl y datos del pasajero', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/pendientes`, {
      headers: { 'X-Test-Rol': Rol.ADMINISTRADOR },
    });
    assert.equal(res.status, 200);
    const body: any = await res.json();
    const freshPago = body.data.find((p: any) => p.id === 50);
    assert.ok(freshPago, 'Debe aparecer el pago id=50');
    assert.equal(freshPago.comprobanteUrl, 'https://comprobantes.example.com/get.png');
    assert.ok(freshPago.pasaje, 'Debe incluir datos del pasaje');
    assert.ok(freshPago.pasaje.usuario, 'Debe incluir datos del usuario');
  });

  it('[200] Pagos APROBADOS o de MercadoPago NO aparecen en la lista', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/pendientes`, {
      headers: { 'X-Test-Rol': Rol.ADMINISTRADOR },
    });
    const body: any = await res.json();
    const ids = body.data.map((p: any) => p.id);
    assert.ok(!ids.includes(3), 'Pago APROBADO (id=3) no debe aparecer');
    assert.ok(!ids.includes(4), 'Pago de MercadoPago (id=4) no debe aparecer');
  });

  it('[401] Sin autenticacion devuelve 401', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/pendientes`);
    assert.equal(res.status, 401);
  });

  it('[403] Rol pasajero recibe 403', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/pendientes`, {
      headers: { 'X-Test-Rol': Rol.PASAJERO },
    });
    assert.equal(res.status, 403);
  });

  it('[403] Rol chofer recibe 403', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/pendientes`, {
      headers: { 'X-Test-Rol': Rol.CHOFER },
    });
    assert.equal(res.status, 403);
  });
});

// ── Pruebas de integracion HTTP: PATCH /admin/pagos/:id/validar ───────────────

describe('HU-15 - Integracion HTTP: PATCH /admin/pagos/:id/validar', () => {
  const app = express();
  app.use(express.json());

  // Pagos frescos para este bloque
  const viajeAprobar: ViajeMemoria = { id: 200, cuposOcupados: 7, capacidadTotal: 14 };
  const pagoAprobar: PagoMemoria = {
    id: 201,
    estado: EstadoPago.PENDIENTE,
    metodo: MetodoPago.TRANSFERENCIA,
    monto: 13000,
    comprobanteUrl: 'https://comprobantes.example.com/aprobar.png',
    fechaExpiracionHold: new Date(Date.now() + 1000 * 60 * 60 * 3),
    fechaPago: null,
    pasaje: {
      id: 2001,
      estado: EstadoPasaje.PENDIENTE_PAGO,
      viaje: viajeAprobar,
      usuario: { id: 20, nombre: 'HTTP', apellido: 'Aprobar', dni: '20000001' },
    },
  };
  const viajeRechazar: ViajeMemoria = { id: 201, cuposOcupados: 4, capacidadTotal: 14 };
  const pagoRechazar: PagoMemoria = {
    id: 202,
    estado: EstadoPago.PENDIENTE,
    metodo: MetodoPago.TRANSFERENCIA,
    monto: 11000,
    comprobanteUrl: 'https://comprobantes.example.com/rechazar.png',
    fechaExpiracionHold: new Date(Date.now() + 1000 * 60 * 60 * 2),
    fechaPago: null,
    pasaje: {
      id: 2002,
      estado: EstadoPasaje.PENDIENTE_PAGO,
      viaje: viajeRechazar,
      usuario: { id: 21, nombre: 'HTTP', apellido: 'Rechazar', dni: '20000002' },
    },
  };

  app.patch(
    '/admin/pagos/:id/validar',
    stubAuthAdmin,
    validateBody(validarPagoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const pagoId = parseInt(req.params['id'] as string, 10);
        if (isNaN(pagoId) || pagoId <= 0) {
          res.status(400).json({ error: true, message: 'ID de pago invalido' });
          return;
        }
        const { accion } = req.body as { accion: 'aprobar' | 'rechazar'; motivo?: string };
        const resultado = await validarPagoStub(pagoId, accion);
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
    pagosDb.push(pagoAprobar, pagoRechazar);
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => server.close());

  it('[200] Admin aprueba pago: estadoPago=aprobado, estadoPasaje=confirmada', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/201/validar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-Rol': Rol.ADMINISTRADOR },
      body: JSON.stringify({ accion: 'aprobar' }),
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.error, false);
    assert.equal(body.data.estadoPago, EstadoPago.APROBADO);
    assert.equal(body.data.estadoPasaje, EstadoPasaje.CONFIRMADA);
    assert.match(body.data.mensaje, /aprobado/i);
  });

  it('[200] Al aprobar el cupo NO se libera (el lugar sigue ocupado)', () => {
    assert.equal(viajeAprobar.cuposOcupados, 7, 'cuposOcupados no debe cambiar al aprobar');
  });

  it('[200] Admin rechaza pago: estadoPago=rechazado, estadoPasaje=cancelada, cupo liberado', async () => {
    const cuposAntes = viajeRechazar.cuposOcupados;
    const res = await fetch(`${baseUrl}/admin/pagos/202/validar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-Rol': Rol.ADMINISTRADOR },
      body: JSON.stringify({ accion: 'rechazar', motivo: 'Monto incorrecto en transferencia' }),
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.error, false);
    assert.equal(body.data.estadoPago, EstadoPago.RECHAZADO);
    assert.equal(body.data.estadoPasaje, EstadoPasaje.CANCELADA);
    assert.match(body.data.mensaje, /rechazado/i);
    assert.equal(viajeRechazar.cuposOcupados, cuposAntes - 1, 'cuposOcupados debe decrementarse al rechazar');
  });

  it('[400] Intentar validar un pago ya procesado devuelve 400', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/201/validar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-Rol': Rol.ADMINISTRADOR },
      body: JSON.stringify({ accion: 'aprobar' }),
    });

    assert.equal(res.status, 400);
    const body: any = await res.json();
    assert.equal(body.error, true);
    assert.match(body.message, /ya se encuentra en estado/i);
  });

  it('[400] Body sin campo "accion" devuelve 400 de validacion Zod', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/201/validar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-Rol': Rol.ADMINISTRADOR },
      body: JSON.stringify({ motivo: 'sin accion' }),
    });

    assert.equal(res.status, 400);
  });

  it('[400] Accion invalida ("cancelar") devuelve 400 de validacion Zod', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/999/validar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-Rol': Rol.ADMINISTRADOR },
      body: JSON.stringify({ accion: 'cancelar' }),
    });

    assert.equal(res.status, 400);
  });

  it('[404] Pago inexistente devuelve 404', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/9999/validar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-Rol': Rol.ADMINISTRADOR },
      body: JSON.stringify({ accion: 'aprobar' }),
    });

    assert.equal(res.status, 404);
    const body: any = await res.json();
    assert.equal(body.error, true);
    assert.match(body.message, /Pago no encontrado/i);
  });

  it('[400] ID no numerico en la URL devuelve 400', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/abc/validar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-Rol': Rol.ADMINISTRADOR },
      body: JSON.stringify({ accion: 'aprobar' }),
    });

    assert.equal(res.status, 400);
  });

  it('[400] ID cero en la URL devuelve 400', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/0/validar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-Rol': Rol.ADMINISTRADOR },
      body: JSON.stringify({ accion: 'aprobar' }),
    });

    assert.equal(res.status, 400);
  });

  it('[401] Sin autenticacion devuelve 401', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/201/validar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'aprobar' }),
    });

    assert.equal(res.status, 401);
  });

  it('[403] Rol pasajero recibe 403', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/201/validar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-Rol': Rol.PASAJERO },
      body: JSON.stringify({ accion: 'aprobar' }),
    });

    assert.equal(res.status, 403);
  });

  it('[403] Rol chofer recibe 403', async () => {
    const res = await fetch(`${baseUrl}/admin/pagos/201/validar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-Rol': Rol.CHOFER },
      body: JSON.stringify({ accion: 'aprobar' }),
    });

    assert.equal(res.status, 403);
  });
});
