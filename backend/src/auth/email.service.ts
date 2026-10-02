import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  // Primary: SMTP (e.g. Gmail App Password — works for any recipient immediately)
  private smtpTransport = (process.env.SMTP_USER && process.env.SMTP_PASS)
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null;

  // Fallback: Resend (only delivers to Resend account owner without custom domain)
  private resend = (!this.smtpTransport && process.env.RESEND_API_KEY)
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    this.logger.log(`[VERIFICATION CODE] email=${email} code=${code}`);

    const html = this.buildEmailHtml(code);

    if (this.smtpTransport) {
      try {
        await this.smtpTransport.sendMail({
          from: `"noAlone" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Your noAlone verification code',
          html,
        });
        this.logger.log(`Verification email sent via SMTP to ${email}`);
        return;
      } catch (err: any) {
        this.logger.error(`SMTP failed for ${email}: ${err?.message}`);
      }
    }

    if (this.resend) {
      try {
        const result = await this.resend.emails.send({
          from: process.env.RESEND_FROM || 'noAlone <onboarding@resend.dev>',
          to: email,
          subject: 'Your noAlone verification code',
          html,
        });
        if ((result as any)?.error) {
          this.logger.warn(`Resend error for ${email}: ${JSON.stringify((result as any).error)}`);
          return;
        }
        this.logger.log(`Verification email sent via Resend to ${email}`);
        return;
      } catch (err: any) {
        this.logger.error(`Resend failed for ${email}: ${err?.message}`);
      }
    }

    this.logger.warn('No email transport configured (SMTP_USER/SMTP_PASS or RESEND_API_KEY required)');
  }

  private buildEmailHtml(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0f0f1a;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:40px 20px;">
            <table width="400" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:16px;overflow:hidden;">
              <tr><td align="center" style="padding:32px 40px 0;">
                <div style="font-size:40px;margin-bottom:8px;">🤝</div>
                <h1 style="color:#7c3aed;margin:0;font-size:28px;">noAlone</h1>
              </td></tr>
              <tr><td align="center" style="padding:24px 40px 0;">
                <h2 style="color:#ffffff;margin:0 0 8px;font-size:20px;">Verify your email</h2>
                <p style="color:#9ca3af;margin:0;font-size:15px;">Enter this code in the app to confirm your account</p>
              </td></tr>
              <tr><td align="center" style="padding:32px 40px;">
                <div style="background:#0f0f1a;border-radius:12px;padding:20px 40px;display:inline-block;">
                  <span style="font-size:42px;font-weight:bold;letter-spacing:14px;color:#7c3aed;">${code}</span>
                </div>
              </td></tr>
              <tr><td align="center" style="padding:0 40px 32px;">
                <p style="color:#6b7280;font-size:13px;margin:0;">This code expires in <strong style="color:#9ca3af;">10 minutes</strong>.<br>If you didn't create a noAlone account, ignore this email.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;
  }
}
