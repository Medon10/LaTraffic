// Utilidades compartidas del backend
// Se irán agregando helpers a medida que se necesiten

/**
 * Wrapper para async route handlers de Express.
 * Captura errores y los pasa al middleware de error global.
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
