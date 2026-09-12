import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { Rol, UsuarioResponse } from '../shared/types/index.js';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { registroSchema, loginSchema } from '../auth/auth.schema.js';
import { AuthService } from '../auth/auth.service.js';
import { AuthController } from '../auth/auth.controller.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';
import { errorHandler } from '../shared/middleware/error-handler.middleware.js';

describe('Módulo auth/: Cookies HttpOnly, RBAC y Salvaguarda de Mass-Assignment', () => {
  // Base de datos en memoria para simular el repositorio en tests aislados
  const usuariosDb: any[] = [];
  let nextId = 1;

  const mockUsuarioRepo: any = {
    findByDni: async (dni: string) => usuariosDb.find((u) => u.dni === dni) || null,
    findByEmail: async (email: string) => usuariosDb.find((u) => u.email === email) || null,
    findByDniOrEmail: async (id: string) =>
      usuariosDb.find((u) => u.dni === id || u.email === id) || null,
    findOne: async (where: any) => usuariosDb.find((u) => u.id === where.id) || null,
    create: async (data: any) => {
      const user = {
        id: nextId++,
        ...data,
        fechaRegistro: new Date(),
      };
      usuariosDb.push(user);
      return user;
    },
  };

  const authService = new AuthService(mockUsuarioRepo);
  const authController = new AuthController(authService);

  // Crear app Express para pruebas HTTP end-to-end
  const app = express();
  const FRONTEND_ORIGIN = 'http://localhost:5173';

  app.use(
    cors({
      origin: FRONTEND_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Rutas auth
  app.post('/auth/registro', validate(registroSchema), asyncHandler(authController.registro));
  app.post('/auth/login', validate(loginSchema), asyncHandler(authController.login));
  app.post('/auth/logout', asyncHandler(authController.logout));
  app.get('/auth/me', verificarToken, asyncHandler(authController.me));

  // Rutas protegidas por rol para verificar RBAC
  app.get('/admin/usuarios', verificarToken, autorizar(Rol.ADMINISTRADOR), (_req: Request, res: Response) => {
    res.json({ error: false, message: 'Acceso admin concedido' });
  });

  app.get('/chofer/panel', verificarToken, autorizar(Rol.CHOFER), (_req: Request, res: Response) => {
    res.json({ error: false, message: 'Acceso chofer concedido' });
  });

  app.use(errorHandler);

  let server: any;
  let baseUrl: string;

  before(async () => {
    // Iniciar servidor en puerto libre
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Crear un admin y un chofer preexistentes en la base simulada
    const hash = await bcrypt.hash('admin123', 10);
    usuariosDb.push({
      id: 99,
      dni: '10000000',
      nombre: 'Admin',
      apellido: 'Principal',
      email: 'admin@latraffic.com',
      passwordHash: hash,
      rol: Rol.ADMINISTRADOR,
      activo: true,
      esMoroso: false,
      inasistenciasEfectivo: 0,
      fechaRegistro: new Date(),
    });

    usuariosDb.push({
      id: 98,
      dni: '20000000',
      nombre: 'Chofer',
      apellido: 'Ruta',
      email: 'chofer@latraffic.com',
      passwordHash: hash,
      rol: Rol.CHOFER,
      activo: true,
      esMoroso: false,
      inasistenciasEfectivo: 0,
      fechaRegistro: new Date(),
    });
  });

  after(async () => {
    if (server) {
      server.close();
    }
  });

  it('HU-01: El registro almacena la contraseña hasheada y NUNCA en texto plano', async () => {
    const res = await fetch(`${baseUrl}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: '38123456',
        nombre: 'Carlos',
        apellido: 'Gardel',
        email: 'carlos@gardel.com',
        password: 'miContraseñaSegura123',
      }),
    });

    assert.equal(res.status, 201);
    const body: any = await res.json();
    assert.equal(body.error, false);
    assert.equal(body.message, 'Usuario registrado exitosamente');

    // Verificar en la BD que passwordHash es un hash bcrypt y no texto plano
    const usuarioCreado = usuariosDb.find((u) => u.dni === '38123456');
    assert.ok(usuarioCreado);
    assert.notEqual(usuarioCreado.passwordHash, 'miContraseñaSegura123');
    assert.match(usuarioCreado.passwordHash, /^\$2[aby]\$/);
    const coincide = await bcrypt.compare('miContraseñaSegura123', usuarioCreado.passwordHash);
    assert.equal(coincide, true);
  });

  it('CRÍTICO (Mass Assignment): El registro público SIEMPRE fuerza rol = "pasajero" e ignora cualquier rol en el body', async () => {
    const res = await fetch(`${baseUrl}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: '40999888',
        nombre: 'Hacker',
        apellido: 'Malicioso',
        email: 'hacker@intentohack.com',
        password: 'password123',
        rol: 'administrador', // Intento de elevación de privilegios
      }),
    });

    assert.equal(res.status, 201);
    const body: any = await res.json();
    assert.equal(body.usuario.rol, Rol.PASAJERO);

    const usuarioDb = usuariosDb.find((u) => u.dni === '40999888');
    assert.ok(usuarioDb);
    assert.equal(usuarioDb.rol, Rol.PASAJERO, 'El servidor debió forzar rol = "pasajero"');
  });

  it('HU-01: Rechaza registro si el DNI o email ya existen', async () => {
    // Intento con DNI duplicado
    const resDniDuplicado = await fetch(`${baseUrl}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: '38123456', // ya registrado
        nombre: 'Otro',
        apellido: 'Nombre',
        email: 'otro@email.com',
        password: 'password123',
      }),
    });
    assert.equal(resDniDuplicado.status, 400);
    const bodyDni: any = await resDniDuplicado.json();
    assert.match(bodyDni.message, /DNI/);

    // Intento con Email duplicado
    const resEmailDuplicado = await fetch(`${baseUrl}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: '45000111',
        nombre: 'Otro',
        apellido: 'Nombre',
        email: 'carlos@gardel.com', // ya registrado
        password: 'password123',
      }),
    });
    assert.equal(resEmailDuplicado.status, 400);
    const bodyEmail: any = await resEmailDuplicado.json();
    assert.match(bodyEmail.message, /email/);
  });

  it('HU-02 & COOKIES: Login con DNI + contraseña setea cookie httpOnly, Secure, SameSite=Lax y NO devuelve token en el body', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: '38123456',
        password: 'miContraseñaSegura123',
      }),
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.error, false);
    assert.equal(body.message, 'Inicio de sesión exitoso');
    assert.ok(body.usuario);
    assert.equal(body.token, undefined, 'El token NO debe devolverse en el body de la respuesta');

    // Verificar la cookie Set-Cookie
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Debe incluir la cabecera Set-Cookie');
    assert.match(setCookie, /token=/);
    assert.match(setCookie, /HttpOnly/i, 'La cookie debe ser HttpOnly');
    assert.match(setCookie, /Secure/i, 'La cookie debe ser Secure');
    assert.match(setCookie, /SameSite=Lax/i, 'La cookie debe tener SameSite=Lax');

    // Extraer y validar el token dentro de la cookie
    const tokenMatch = setCookie.match(/token=([^;]+)/);
    assert.ok(tokenMatch);
    const token = tokenMatch[1];
    const decoded: any = jwt.verify(token, process.env.TOKEN_SECRET || 'dev_secret');
    assert.ok(decoded.usuario_id, 'Claim usuario_id debe existir en el JWT');
    assert.equal(decoded.rol, Rol.PASAJERO, 'Claim rol debe ser pasajero');
  });

  it('HU-02: Ante credenciales incorrectas, responde 401 con mensaje uniforme sin indicar cuál falló', async () => {
    // Contraseña errónea
    const resPassErronea = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: '38123456',
        password: 'passwordIncorrecto',
      }),
    });
    assert.equal(resPassErronea.status, 401);
    const bodyPass: any = await resPassErronea.json();
    assert.equal(bodyPass.message, 'Credenciales incorrectas');

    // DNI inexistente
    const resDniInexistente = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: '99999999',
        password: 'passwordCualquiera',
      }),
    });
    assert.equal(resDniInexistente.status, 401);
    const bodyDni: any = await resDniInexistente.json();
    assert.equal(bodyDni.message, 'Credenciales incorrectas');
  });

  it('CORS: Permite credentials: true y devuelve origin explícito (no comodín *)', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
      },
    });

    assert.equal(res.headers.get('access-control-allow-origin'), FRONTEND_ORIGIN);
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    assert.notEqual(res.headers.get('access-control-allow-origin'), '*');
  });

  it('Middleware verificarToken: lee JWT desde la cookie y autoriza endpoint protegido /auth/me', async () => {
    // 1. Obtener cookie de login
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: '38123456',
        password: 'miContraseñaSegura123',
      }),
    });
    const setCookie = loginRes.headers.get('set-cookie')!;
    const tokenMatch = setCookie.match(/token=([^;]+)/)!;
    const cookieHeader = `token=${tokenMatch[1]}`;

    // 2. Acceder a /auth/me enviando la cookie
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    assert.equal(meRes.status, 200);
    const meBody: any = await meRes.json();
    assert.equal(meBody.usuario.dni, '38123456');
    assert.equal(meBody.usuario.rol, Rol.PASAJERO);

    // 3. Acceder sin cookie -> 401
    const noAuthRes = await fetch(`${baseUrl}/auth/me`);
    assert.equal(noAuthRes.status, 401);
  });

  it('Middleware autorizar (RBAC): valida el rol contra los roles permitidos de cada ruta', async () => {
    // 1. Iniciar sesión como pasajero
    const resPasajero = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: '38123456',
        password: 'miContraseñaSegura123',
      }),
    });
    const cookiePasajero = `token=${resPasajero.headers.get('set-cookie')!.match(/token=([^;]+)/)![1]}`;

    // Pasajero intentando acceder a /admin/usuarios -> 403 Forbidden
    const resAdminForbidden = await fetch(`${baseUrl}/admin/usuarios`, {
      headers: { Cookie: cookiePasajero },
    });
    assert.equal(resAdminForbidden.status, 403);
    const bodyForbidden: any = await resAdminForbidden.json();
    assert.match(bodyForbidden.message, /permisos/i);

    // Pasajero intentando acceder a /chofer/panel -> 403 Forbidden
    const resChoferForbidden = await fetch(`${baseUrl}/chofer/panel`, {
      headers: { Cookie: cookiePasajero },
    });
    assert.equal(resChoferForbidden.status, 403);

    // 2. Iniciar sesión como Administrador
    const resAdmin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: '10000000',
        password: 'admin123',
      }),
    });
    const cookieAdmin = `token=${resAdmin.headers.get('set-cookie')!.match(/token=([^;]+)/)![1]}`;

    // Administrador accediendo a /admin/usuarios -> 200 OK
    const resAdminOk = await fetch(`${baseUrl}/admin/usuarios`, {
      headers: { Cookie: cookieAdmin },
    });
    assert.equal(resAdminOk.status, 200);
    const bodyAdmin: any = await resAdminOk.json();
    assert.equal(bodyAdmin.message, 'Acceso admin concedido');

    // 3. Iniciar sesión como Chofer
    const resChofer = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: '20000000',
        password: 'admin123',
      }),
    });
    const cookieChofer = `token=${resChofer.headers.get('set-cookie')!.match(/token=([^;]+)/)![1]}`;

    // Chofer accediendo a /chofer/panel -> 200 OK
    const resChoferOk = await fetch(`${baseUrl}/chofer/panel`, {
      headers: { Cookie: cookieChofer },
    });
    assert.equal(resChoferOk.status, 200);
    const bodyChofer: any = await resChoferOk.json();
    assert.equal(bodyChofer.message, 'Acceso chofer concedido');
  });


  it('POST /auth/logout: limpia la cookie httpOnly de sesión', async () => {
    const res = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.error, false);
    assert.equal(body.message, 'Sesión cerrada exitosamente');

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    // Verificar que la cookie fue expirada / limpiada
    assert.match(setCookie, /token=;/);
    assert.match(setCookie, /Expires=Thu, 01 Jan 1970/i);
  });
});
