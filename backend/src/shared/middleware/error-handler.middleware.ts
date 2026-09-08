import { Request, Response, NextFunction } from 'express';

/**
 * Middleware global de manejo de errores.
 * Captura cualquier error no manejado y responde con un JSON uniforme.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(`[Error] ${err.message}`, err.stack);

  const statusCode =
    'statusCode' in err && typeof err.statusCode === 'number'
      ? err.statusCode
      : 500;
  const message =
    statusCode === 500 ? 'Error interno del servidor' : err.message;

  res.status(statusCode).json({
    error: true,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Error personalizado con código de estado HTTP.
 */
export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}
