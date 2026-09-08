import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload, AuthRequest, Rol } from '../types/index.js';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'dev_secret';

/**
 * Verifica que el request tenga un JWT válido en el header Authorization.
 * Extrae usuario_id y rol, y los adjunta a req.usuario.
 */
export const verificarToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, TOKEN_SECRET) as AuthPayload;
    req.usuario = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

/**
 * Middleware factory: restringe el acceso a los roles indicados.
 * Debe usarse DESPUÉS de verificarToken.
 *
 * Ejemplo: autorizar([Rol.ADMINISTRADOR])
 */
export const autorizar = (rolesPermitidos: Rol[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      res.status(403).json({ message: 'No tenés permisos para esta acción' });
      return;
    }

    next();
  };
};
