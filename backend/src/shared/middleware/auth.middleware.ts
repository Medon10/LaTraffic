import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, Rol } from '../types/index.js';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'dev_secret';

/**
 * Middleware que verifica el JWT desde la cookie httpOnly (usando cookie-parser).
 * Valida la firma del token y extrae usuario_id y rol, adjuntándolos a req.usuario.
 * Permite fallback opcional al header Authorization: Bearer.
 */
export const verificarToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // Leer el JWT prioritariamente desde la cookie 'token'
  let token = req.cookies?.token || req.cookies?.jwt;

  // Fallback a Authorization header si no está presente en la cookie
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    res.status(401).json({
      error: true,
      message: 'Token de autenticación no proporcionado',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, TOKEN_SECRET) as any;
    const usuarioId = decoded.usuario_id ?? decoded.usuarioId;
    const rol = decoded.rol as Rol;

    if (!usuarioId || !rol) {
      res.status(401).json({
        error: true,
        message: 'Token inválido: faltan claims obligatorios',
      });
      return;
    }

    req.usuario = {
      usuario_id: Number(usuarioId),
      usuarioId: Number(usuarioId),
      rol,
    };

    next();
  } catch {
    res.status(401).json({
      error: true,
      message: 'Token inválido o expirado',
    });
  }
};

/**
 * Middleware factory: restringe el acceso a los roles indicados.
 * Valida el rol contra los roles permitidos de cada ruta.
 *
 * Ejemplos:
 *   autorizar(Rol.ADMINISTRADOR)
 *   autorizar([Rol.CHOFER, Rol.ADMINISTRADOR])
 */
export const autorizar = (
  roles: Rol | Rol[],
  ...moreRoles: Rol[]
) => {
  const rolesPermitidos: Rol[] = Array.isArray(roles)
    ? roles
    : [roles, ...moreRoles];

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({
        error: true,
        message: 'No autenticado',
      });
      return;
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      res.status(403).json({
        error: true,
        message: 'No tenés permisos para realizar esta acción',
      });
      return;
    }

    next();
  };
};
