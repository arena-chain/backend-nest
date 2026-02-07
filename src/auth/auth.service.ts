// src/auth/auth.service.ts
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Registration, RegistrationDocument } from './schemas/registration.schema';
import { UsersService } from '../user/user.service';
import { PlayerService } from '../player/player.service';
import { TeamManagerService } from '../team-manager/team-manager.service';
import { RefereeService } from '../referee/referee.service';
import { AdminService } from '../admin/admin.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterPlayerDto } from './dto/register-player.dto';
import { RegisterTeamManagerDto } from './dto/register-team-manager.dto';
import { RegisterRefereeDto } from './dto/register-referee.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../common/enums/role.enum';
import { MailService } from '../mail/mail.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Registration.name) private registrationModel: Model<RegistrationDocument>,
    private usersService: UsersService,
    private playerService: PlayerService,
    private teamManagerService: TeamManagerService,
    private refereeService: RefereeService,
    private adminService: AdminService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) { }

  private async sendRegistrationOtp(email: string) {
    const otp = this.generateOtp();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10);

    const user = await this.usersService.findByEmail(email);
    if (user) {
      await this.usersService.update(user._id.toString(), {
        emailVerificationOtp: otp,
        emailVerificationOtpExpires: otpExpires,
      });
      await this.mailService.sendVerificationEmail(email, otp);
    }
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(dto: RegisterDto) {
    if (!dto.role) {
      throw new BadRequestException('Role is required for registration');
    }

    let result;
    switch (dto.role) {
      case UserRole.PLAYER:
        result = await this.registerPlayer(dto as RegisterPlayerDto);
        break;
      case UserRole.TEAM_MANAGER:
        result = await this.registerTeamManager(dto as RegisterTeamManagerDto);
        break;
      case UserRole.REFEREE:
        result = await this.registerReferee(dto as RegisterRefereeDto);
        break;
      case UserRole.ADMIN:
        result = await this.registerAdmin(dto as RegisterAdminDto);
        break;
      default:
        throw new BadRequestException('Invalid role');
    }

    // Send verification email
    await this.sendRegistrationOtp(dto.email);

    return result;
  }

  async registerPlayer(dto: RegisterPlayerDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('User already exists');

    const hash = await bcrypt.hash(dto.password, 10);
    const otp = this.generateOtp();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10);

    await this.registrationModel.findOneAndUpdate(
      { email: dto.email },
      {
        email: dto.email,
        passwordHash: hash,
        nickname: dto.nickname,
        role: UserRole.PLAYER,
        roleData: { isPro: dto.isPro, isVerified: dto.isVerified },
        otp,
        otpExpires,
      },
      { upsert: true, new: true }
    );

    await this.mailService.sendVerificationEmail(dto.email, otp);

    return { message: 'Verification code sent to your email' };
  }

  async registerTeamManager(dto: RegisterTeamManagerDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('User already exists');

    const hash = await bcrypt.hash(dto.password, 10);
    const otp = this.generateOtp();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10);

    await this.registrationModel.findOneAndUpdate(
      { email: dto.email },
      {
        email: dto.email,
        passwordHash: hash,
        nickname: dto.nickname,
        role: UserRole.TEAM_MANAGER,
        roleData: { organizationName: dto.organizationName },
        otp,
        otpExpires,
      },
      { upsert: true, new: true }
    );

    await this.mailService.sendVerificationEmail(dto.email, otp);

    return { message: 'Verification code sent to your email' };
  }

  async registerReferee(dto: RegisterRefereeDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('User already exists');

    const hash = await bcrypt.hash(dto.password, 10);
    const otp = this.generateOtp();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10);

    await this.registrationModel.findOneAndUpdate(
      { email: dto.email },
      {
        email: dto.email,
        passwordHash: hash,
        nickname: dto.nickname,
        role: UserRole.REFEREE,
        roleData: { level: dto.level },
        otp,
        otpExpires,
      },
      { upsert: true, new: true }
    );

    await this.mailService.sendVerificationEmail(dto.email, otp);

    return { message: 'Verification code sent to your email' };
  }

  async registerAdmin(dto: RegisterAdminDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('User already exists');

    const hash = await bcrypt.hash(dto.password, 10);
    const otp = this.generateOtp();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10);

    await this.registrationModel.findOneAndUpdate(
      { email: dto.email },
      {
        email: dto.email,
        passwordHash: hash,
        nickname: dto.nickname,
        role: UserRole.ADMIN,
        roleData: { adminLevel: dto.adminLevel, permissions: dto.permissions },
        otp,
        otpExpires,
      },
      { upsert: true, new: true }
    );

    await this.mailService.sendVerificationEmail(dto.email, otp);

    return { message: 'Verification code sent to your email' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Determine user's role
    let role: UserRole;
    let profile: any;

    try {
      profile = await this.playerService.findByUserId(user._id);
      role = UserRole.PLAYER;
    } catch {
      try {
        profile = await this.teamManagerService.findByUserId(user._id);
        role = UserRole.TEAM_MANAGER;
      } catch {
        try {
          profile = await this.refereeService.findByUserId(user._id);
          role = UserRole.REFEREE;
        } catch {
          try {
            profile = await this.adminService.findByUserId(user._id);
            role = UserRole.ADMIN;
          } catch {
            throw new UnauthorizedException('No profile found for user');
          }
        }
      }
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email, role);

    return {
      ...tokens,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        role,
        profile,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async verifyEmail(dto: VerifyOtpDto) {
    // 1. Check pending registrations
    const pending = await this.registrationModel.findOne({ email: dto.email });

    if (pending) {
      if (pending.otp !== dto.otp) throw new BadRequestException('Invalid OTP');
      if (pending.otpExpires < new Date()) throw new BadRequestException('OTP expired');

      // Create user
      const user = await this.usersService.create({
        email: pending.email,
        password: pending.passwordHash,
        nickname: pending.nickname,
      });

      // Create profile based on role
      let profile;
      switch (pending.role) {
        case UserRole.PLAYER:
          profile = await this.playerService.create(user._id as Types.ObjectId, pending.roleData);
          break;
        case UserRole.TEAM_MANAGER:
          profile = await this.teamManagerService.create(user._id as Types.ObjectId, pending.roleData);
          break;
        case UserRole.REFEREE:
          profile = await this.refereeService.create(user._id as Types.ObjectId, pending.roleData);
          break;
        case UserRole.ADMIN:
          profile = await this.adminService.create(user._id as Types.ObjectId, pending.roleData);
          break;
      }

      // Mark verified
      await this.usersService.update(user._id.toString(), { isEmailVerified: true });

      // Clean up
      await this.registrationModel.deleteOne({ _id: pending._id });

      const tokens = await this.generateTokens(user._id.toString(), user.email, pending.role as UserRole);

      return {
        message: 'Registration complete',
        ...tokens,
        user: {
          id: user._id,
          email: user.email,
          nickname: user.nickname,
          role: pending.role,
          profile,
          isEmailVerified: true,
        }
      };
    }

    // 2. Check existing unverified users (fallback)
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new NotFoundException('Registration or user not found');

    if (user.emailVerificationOtp !== dto.otp) throw new BadRequestException('Invalid OTP');
    if (!user.emailVerificationOtpExpires || user.emailVerificationOtpExpires < new Date()) throw new BadRequestException('OTP expired');

    await this.usersService.update(user._id.toString(), {
      isEmailVerified: true,
      emailVerificationOtp: undefined,
      emailVerificationOtpExpires: undefined,
    });

    return { message: 'Email verified successfully' };
  }

  async resendOtp(email: string) {
    const otp = this.generateOtp();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10);

    // Check pending first
    const pending = await this.registrationModel.findOne({ email });
    if (pending) {
      await this.registrationModel.updateOne({ _id: pending._id }, { otp, otpExpires });
      await this.mailService.sendVerificationEmail(email, otp);
      return { message: 'OTP resent' };
    }

    // Check existing
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    await this.usersService.update(user._id.toString(), {
      emailVerificationOtp: otp,
      emailVerificationOtpExpires: otpExpires,
    });
    await this.mailService.sendVerificationEmail(email, otp);
    return { message: 'OTP resent' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    const otp = this.generateOtp();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10);

    await this.usersService.update(user._id.toString(), {
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: otpExpires,
    });

    await this.mailService.sendPasswordResetEmail(email, otp);

    return { message: 'Reset password OTP sent successfully' };
  }

  async verifyResetOtp(dto: { email: string; otp: string }) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');

    if (user.resetPasswordOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (!user.resetPasswordOtpExpires || user.resetPasswordOtpExpires < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    return { message: 'OTP verified successfully' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');

    if (user.resetPasswordOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (!user.resetPasswordOtpExpires || user.resetPasswordOtpExpires < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    const hash = await bcrypt.hash(dto.newPassword, 10);

    await this.usersService.update(user._id.toString(), {
      passwordHash: hash,
      resetPasswordOtp: undefined,
      resetPasswordOtpExpires: undefined,
    });

    return { message: 'Password reset successfully' };
  }

  async googleLogin(req: any) {
    if (!req.user) {
      throw new BadRequestException('No user from google');
    }

    const { email, firstName, lastName, picture, id } = req.user;
    let user = await this.usersService.findByGoogleId(id);

    if (!user) {
      // Check if user exists with same email but no googleId
      user = await this.usersService.findByEmail(email);
      if (user) {
        // Link google account
        user = await this.usersService.update(user._id.toString(), { googleId: id });
      } else {
        // Create new user (default to PLAYER role for google login?)
        user = await this.usersService.createWithGoogle({
          email,
          nickname: `${firstName} ${lastName}`,
          googleId: id,
        });

        // Create player profile by default
        await this.playerService.create(user._id as Types.ObjectId, {
          isPro: false,
          isVerified: false,
        });
      }
    }

    // Determine role (simplified, assuming we check profiles)
    let role = UserRole.PLAYER; // Default
    try {
      await this.adminService.findByUserId(user._id);
      role = UserRole.ADMIN;
    } catch {
      // keep default
    }

    return this.generateTokens(user._id.toString(), user.email, role);
  }

  async googleMobileLogin(token: string) {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    let email: string;
    let name: string;
    let googleId: string;
    let picture: string;

    try {
      // 1. Try to verify as ID Token
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) throw new Error('No payload');

      email = payload.email;
      name = payload.name;
      googleId = payload.sub;
      picture = payload.picture;
    } catch (error) {
      // 2. Fallback: Try to verify as Access Token by calling Google UserInfo API
      try {
        client.setCredentials({ access_token: token });
        const response: any = await client.request({
          url: 'https://www.googleapis.com/oauth2/v3/userinfo',
        });
        const data = response.data;

        email = data.email;
        name = data.name || data.email.split('@')[0];
        googleId = data.sub;
        picture = data.picture;
      } catch (innerError) {
        console.error('Google token verification failed:', error.message, innerError.message);
        throw new UnauthorizedException('Invalid Google token');
      }
    }

    // Find or create user
    let user = await this.usersService.findByGoogleId(googleId);

    if (!user) {
      // Check if user exists with same email
      user = await this.usersService.findByEmail(email);

      if (user) {
        // Link Google account to existing user
        user = await this.usersService.update(user._id.toString(), {
          googleId,
          isEmailVerified: true, // Google emails are verified
        });
      } else {
        // Create new user
        user = await this.usersService.createWithGoogle({
          email,
          nickname: name || email.split('@')[0],
          googleId,
        });

        // Create player profile by default
        await this.playerService.create(user._id as Types.ObjectId, {
          isPro: false,
          isVerified: false,
        });
      }
    }

    // Determine role
    let role = UserRole.PLAYER;
    let profile: any;

    try {
      profile = await this.playerService.findByUserId(user._id);
      role = UserRole.PLAYER;
    } catch {
      try {
        profile = await this.teamManagerService.findByUserId(user._id);
        role = UserRole.TEAM_MANAGER;
      } catch {
        try {
          profile = await this.refereeService.findByUserId(user._id);
          role = UserRole.REFEREE;
        } catch {
          try {
            profile = await this.adminService.findByUserId(user._id);
            role = UserRole.ADMIN;
          } catch {
            // Default to player if no profile found
            role = UserRole.PLAYER;
          }
        }
      }
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email, role);

    return {
      ...tokens,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        role,
        profile,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    await this.usersService.saveRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }
}
