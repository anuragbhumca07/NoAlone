import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  // SMTP — try port 465 (SSL) first, then 587 (STARTTLS) as fallback
  // Railway blocks 587 outbound; 465 is typically open
  private smtpTransport465 = (process.env.SMTP_USER && process.env.SMTP_PASS)
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: 465,
        secure: true,
        connectionTimeout: 6000,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null;

  private smtpTransport587 = (process.env.SMTP_USER && process.env.SMTP_PASS)
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        connectionTimeout: 6000,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null;

  // Resend — always available as final fallback (onboarding@resend.dev only delivers
  // to the Resend account owner's email without a custom domain)
  private resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    this.logger.log(`[VERIFICATION CODE] email=${email} code=${code}`);

    const html = this.buildEmailHtml(code);
    const mailOptions = {
      from: `"noAlone" <${process.env.SMTP_USER || 'noreply@noalone.app'}>`,
      to: email,
      subject: 'Your noAlone verification code',
      html,
    };

    if (this.smtpTransport465) {
      try {
        await this.smtpTransport465.sendMail(mailOptions);
        this.logger.log(`Verification email sent via SMTP/465 to ${email}`);
        return;
      } catch (err: any) {
        this.logger.error(`SMTP/465 failed for ${email}: ${err?.message}`);
      }
    }

    if (this.smtpTransport587) {
      try {
        await this.smtpTransport587.sendMail(mailOptions);
        this.logger.log(`Verification email sent via SMTP/587 to ${email}`);
        return;
      } catch (err: any) {
        this.logger.error(`SMTP/587 failed for ${email}: ${err?.message}`);
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

    this.logger.warn('No email transport succeeded — code is in logs above');
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
