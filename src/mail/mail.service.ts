import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    if (host && user && pass) {
      const port = this.configService.get<number>('MAIL_PORT', 587);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      });
      this.logger.log('Mail transporter configured');
    } else {
      this.logger.warn(
        'MAIL_HOST / MAIL_USER / MAIL_PASS not set — emails will be logged to console instead of sent.',
      );
    }
  }

  async sendVerificationEmail(email: string, otp: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[MAIL STUB] Verification OTP for ${email}: ${otp}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to: email,
        subject: 'Verify Your Email - Arena-Chain',
        text: `Welcome to Arena-Chain! Your verification code is: ${otp}`,
        html: this.verificationHtml(otp),
      });
    } catch (err) {
      this.logger.error(
        `Failed to send verification email to ${email}: ${err}`,
      );
      this.logger.warn(`[MAIL FALLBACK] Verification OTP for ${email}: ${otp}`);
    }
  }

  async sendPasswordResetEmail(email: string, otp: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[MAIL STUB] Password-reset OTP for ${email}: ${otp}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to: email,
        subject: 'Reset Your Password - Arena-Chain',
        text: `Your password reset code is: ${otp}`,
        html: this.resetHtml(otp),
      });
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${email}: ${err}`);
      this.logger.warn(
        `[MAIL FALLBACK] Password-reset OTP for ${email}: ${otp}`,
      );
    }
  }

  private verificationHtml(otp: string): string {
    return `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d1117; color: #ffffff; padding: 40px; text-align: center; border-radius: 10px; max-width: 600px; margin: auto; border: 1px solid #30363d;">
            <div style="margin-bottom: 20px;"><span style="font-size: 32px; font-weight: bold; color: #00ff00;">Arena-Chain</span></div>
            <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Email Verification</h1>
            <p style="color: #8b949e; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                Welcome to the ultimate gaming ecosystem! Use the verification code below.
            </p>
            <div style="background-color: #161b22; border-radius: 8px; padding: 20px; border: 1px solid #30363d; display: inline-block; margin-bottom: 30px;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #00ff00;">${otp}</span>
            </div>
            <p style="color: #8b949e; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes.</p>
            <hr style="border: 0; border-top: 1px solid #30363d; margin: 30px 0;">
            <p style="color: #484f58; font-size: 12px;">&copy; ${new Date().getFullYear()} Arena-Chain. All rights reserved.</p>
        </div>`;
  }

  private resetHtml(otp: string): string {
    return `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d1117; color: #ffffff; padding: 40px; text-align: center; border-radius: 10px; max-width: 600px; margin: auto; border: 1px solid #30363d;">
            <div style="margin-bottom: 20px;"><span style="font-size: 32px; font-weight: bold; color: #00ff00;">Arena-Chain</span></div>
            <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h1>
            <p style="color: #8b949e; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                Use the code below to reset your password.
            </p>
            <div style="background-color: #161b22; border-radius: 8px; padding: 20px; border: 1px solid #30363d; display: inline-block; margin-bottom: 30px;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #00ff00;">${otp}</span>
            </div>
            <p style="color: #8b949e; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes.</p>
            <hr style="border: 0; border-top: 1px solid #30363d; margin: 30px 0;">
            <p style="color: #484f58; font-size: 12px;">&copy; ${new Date().getFullYear()} Arena-Chain. All rights reserved.</p>
        </div>`;
  }
}
