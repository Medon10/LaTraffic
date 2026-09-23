import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer/index.js';

/**
 * Servicio de email para LaTraffic.
 *
 * Modo SMTP: se activa cuando EMAIL_HOST está configurado en .env.
 * Modo consola (fallback): si EMAIL_HOST no está configurado, el link de reset
 * se imprime directamente en los logs del servidor — útil para desarrollo
 * local sin necesidad de configurar un proveedor de email real.
 *
 * Para activar SMTP, agregar al .env:
 *   EMAIL_HOST=smtp.gmail.com
 *   EMAIL_PORT=587
 *   EMAIL_USER=tu-email@gmail.com
 *   EMAIL_PASS=tu-app-password
 *   EMAIL_FROM=LaTraffic <no-reply@latraffic.com>
 */
export class EmailService {
  private transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
  private readonly fromAddress: string;
  private readonly modoConsola: boolean;

  constructor() {
    const host = process.env.EMAIL_HOST;
    this.fromAddress = process.env.EMAIL_FROM || 'LaTraffic <no-reply@latraffic.com>';

    if (host) {
      this.modoConsola = false;
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      this.modoConsola = true;
      console.warn(
        '[EmailService] EMAIL_HOST no configurado — operando en modo consola. ' +
        'Los emails se imprimirán en los logs en vez de enviarse.'
      );
    }
  }

  /**
   * Envía el email de recuperación de contraseña.
   * En modo consola, imprime el link en los logs del servidor.
   */
  async enviarRecuperacionPassword(email: string, resetLink: string): Promise<void> {
    const asunto = 'Recuperar contraseña — LaTraffic';
    const cuerpoHtml = `
      <p>Recibiste este email porque solicitaste recuperar tu contraseña en <strong>LaTraffic</strong>.</p>
      <p>Hacé clic en el siguiente enlace para crear una nueva contraseña:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Este enlace <strong>expira en 1 hora</strong>. Si no solicitaste esto, podés ignorar este email.</p>
    `;

    if (this.modoConsola) {
      console.log('─────────────────────────────────────────────');
      console.log('[EmailService] 📧 EMAIL DE RECUPERACIÓN (modo consola):');
      console.log(`  Para: ${email}`);
      console.log(`  Asunto: ${asunto}`);
      console.log(`  Link de reset: ${resetLink}`);
      console.log('─────────────────────────────────────────────');
      return;
    }

    await this.transporter!.sendMail({
      from: this.fromAddress,
      to: email,
      subject: asunto,
      html: cuerpoHtml,
      text: `Recuperar contraseña LaTraffic:\n${resetLink}\n\nEste enlace expira en 1 hora.`,
    });
  }
}
