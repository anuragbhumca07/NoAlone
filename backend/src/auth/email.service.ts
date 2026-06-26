import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * Resend's `onboarding@resend.dev` sender (used here) only delivers reliably
 * to the email address that owns the Resend account — unverified recipients
 * get silently dropped. For production, verify a custom domain in Resend and
 * update RESEND_FROM accordingly. For development, sendVerificationEmail()
 * always logs the code at INFO so it is recoverable from Railway logs even
 * when delivery fails.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    // Always log first so the code is recoverable if delivery silently fails.
    this.logger.log(`[VERIFICATION CODE] email=${email} code=${code}`);

    if (!process.env.RESEND_API_KEY) {
      this.logger.warn('RESEND_API_KEY not set — skipping email send');
      return;
    }

    try {
      const result = await this.resend.emails.send({
        from: process.env.RESEND_FROM || 'noAlone <onboarding@resend.dev>',
        to: email,
        subject: 'Your noAlone verification code',
        html: `
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
        `,
      });
      if ((result as any)?.error) {
        // Resend may return 200 with an error payload (e.g. unverified recipient)
        this.logger.warn(
          `Resend returned error for ${email}: ${JSON.stringify((result as any).error)} — code stays in logs`,
        );
        return;
      }
      this.logger.log(`Verification email sent to ${email} (id=${(result as any)?.data?.id || 'n/a'})`);
    } catch (err) {
      // Non-fatal: registration must still succeed; user can recover the code
      // via the test-code endpoint or Railway logs.
      this.logger.error(
        `Failed to send verification email to ${email} — code still valid; recover via logs or POST /auth/email/recover-code`,
        err as any,
      );
    }
  }
}
