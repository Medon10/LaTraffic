import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodType } from 'zod';

/**
 * Middleware factory: valida req.body contra un schema Zod.
 * Si la validación falla, responde con 400 y los detalles del error.
 * Si pasa, reemplaza req.body con los datos parseados (stripped de campos extra).
 *
 * Uso: router.post('/ruta', validate(miSchema), controller.handler)
 */
export const validate = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errores = result.error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensaje: issue.message,
      }));

      res.status(400).json({
        error: true,
        message: 'Datos inválidos',
        detalles: errores,
      });
      return;
    }

    req.body = result.data;
    next();
  };
};
