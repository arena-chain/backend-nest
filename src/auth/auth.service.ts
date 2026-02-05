// src/auth/auth.service.ts
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private playerService: PlayerService,
    private teamManagerService: TeamManagerService,
    private refereeService: RefereeService,
    private adminService: AdminService,
    private jwtService: JwtService,
  ) { }

  async register(dto: RegisterDto) {
    // Generic register - routes based on role
    if (!dto.role) {
      throw new BadRequestException('Role is required for registration');
    }

    switch (dto.role) {
      case UserRole.PLAYER:
        return this.registerPlayer(dto as RegisterPlayerDto);
      case UserRole.TEAM_MANAGER:
        return this.registerTeamManager(dto as RegisterTeamManagerDto);
      case UserRole.REFEREE:
        return this.registerReferee(dto as RegisterRefereeDto);
      case UserRole.ADMIN:
        return this.registerAdmin(dto as RegisterAdminDto);
      default:
        throw new BadRequestException('Invalid role');
    }
  }

  async registerPlayer(dto: RegisterPlayerDto) {
    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      email: dto.email,
      password: hash,
      nickname: dto.nickname,
    });

    // Create player profile
    await this.playerService.create(user._id as Types.ObjectId, {
      isPro: dto.isPro,
      isVerified: dto.isVerified,
    });

    return this.generateTokens(user._id.toString(), user.email, UserRole.PLAYER);
  }

  async registerTeamManager(dto: RegisterTeamManagerDto) {
    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      email: dto.email,
      password: hash,
      nickname: dto.nickname,
    });

    // Create team manager profile
    await this.teamManagerService.create(user._id as Types.ObjectId, {
      organizationName: dto.organizationName,
    });

    return this.generateTokens(user._id.toString(), user.email, UserRole.TEAM_MANAGER);
  }

  async registerReferee(dto: RegisterRefereeDto) {
    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      email: dto.email,
      password: hash,
      nickname: dto.nickname,
    });

    // Create referee profile
    await this.refereeService.create(user._id as Types.ObjectId, {
      level: dto.level,
    });

    return this.generateTokens(user._id.toString(), user.email, UserRole.REFEREE);
  }

  async registerAdmin(dto: RegisterAdminDto) {
    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      email: dto.email,
      password: hash,
      nickname: dto.nickname,
    });

    // Create admin profile
    await this.adminService.create(user._id as Types.ObjectId, {
      adminLevel: dto.adminLevel,
      permissions: dto.permissions,
    });

    return this.generateTokens(user._id.toString(), user.email, UserRole.ADMIN);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Determine user's role by checking which profile exists
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
      },
    };
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    await this.usersService.saveRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }
}
