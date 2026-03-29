import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        const port = this.configService.get<number>('MAIL_PORT', 587);
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('MAIL_HOST'),
            port: port,
            secure: port === 465, // true for 465, false for other ports
            auth: {
                user: this.configService.get<string>('MAIL_USER'),
                pass: this.configService.get<string>('MAIL_PASS'),
            },
            tls: {
                rejectUnauthorized: false, // This allows self-signed certificates in dev
            },
        });
    }

    async sendVerificationEmail(email: string, otp: string) {
        const mailOptions = {
            from: this.configService.get<string>('MAIL_FROM'),
            to: email,
            subject: 'Verify Your Email - Arena-Chain',
            text: `Welcome to Arena-Chain! Your verification code is: ${otp}`,
            html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d1117; color: #ffffff; padding: 40px; text-align: center; border-radius: 10px; max-width: 600px; margin: auto; border: 1px solid #30363d;">
                <div style="margin-bottom: 20px;">
                    <span style="font-size: 32px; font-weight: bold; color: #00ff00;">🎮 Arena-Chain</span>
                </div>
                <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Email Verification</h1>
                <p style="color: #8b949e; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Welcome to the ultimate gaming ecosystem! To complete your registration and start your journey, please use the verification code below.
                </p>
                <div style="background-color: #161b22; border-radius: 8px; padding: 20px; border: 1px solid #30363d; display: inline-block; margin-bottom: 30px;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #00ff00;">${otp}</span>
                </div>
                <p style="color: #8b949e; font-size: 14px; margin-top: 20px;">
                    This code will expire in 10 minutes.<br>
                    If you didn't request this email, you can safely ignore it.
                </p>
                <hr style="border: 0; border-top: 1px solid #30363d; margin: 30px 0;">
                <p style="color: #484f58; font-size: 12px;">
                    &copy; ${new Date().getFullYear()} Arena-Chain. All rights reserved.
                </p>
            </div>
            `,
        };

        await this.transporter.sendMail(mailOptions);
    }

    async sendPasswordResetEmail(email: string, otp: string) {
        const mailOptions = {
            from: this.configService.get<string>('MAIL_FROM'),
            to: email,
            subject: 'Reset Your Password - Arena-Chain',
            text: `Your password reset code is: ${otp}`,
            html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d1117; color: #ffffff; padding: 40px; text-align: center; border-radius: 10px; max-width: 600px; margin: auto; border: 1px solid #30363d;">
                <div style="margin-bottom: 20px;">
                    <span style="font-size: 32px; font-weight: bold; color: #00ff00;">🎮 Arena-Chain</span>
                </div>
                <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h1>
                <p style="color: #8b949e; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    We received a request to reset your password. Use the code below to complete the process.
                </p>
                <div style="background-color: #161b22; border-radius: 8px; padding: 20px; border: 1px solid #30363d; display: inline-block; margin-bottom: 30px;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #00ff00;">${otp}</span>
                </div>
                <p style="color: #8b949e; font-size: 14px; margin-top: 20px;">
                    This code will expire in 10 minutes.<br>
                    If you didn't request a password reset, please secure your account.
                </p>
                <hr style="border: 0; border-top: 1px solid #30363d; margin: 30px 0;">
                <p style="color: #484f58; font-size: 12px;">
                    &copy; ${new Date().getFullYear()} Arena-Chain. All rights reserved.
                </p>
            </div>
            `,
        };

        await this.transporter.sendMail(mailOptions);
    }
}
