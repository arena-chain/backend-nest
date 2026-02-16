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

    return this.generateTokens(user._id.toString(), user.email, [UserRole.PLAYER]);
  }

  async registerTeamManager(dto: RegisterTeamManagerDto) {
    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      email: dto.email,
      password: hash,
      nickname: dto.nickname,
    });

    // Create team manager profile with all fields
    await this.teamManagerService.create(user._id as Types.ObjectId, {
      organizationName: dto.organizationName,
      teamId: dto.teamId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      cin: dto.cin,
      age: dto.age,
      gender: dto.gender,
      description: dto.description,
      phoneNumber: dto.phoneNumber,
    });

    return this.generateTokens(user._id.toString(), user.email, [UserRole.TEAM_MANAGER]);
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

    return this.generateTokens(user._id.toString(), user.email, [UserRole.REFEREE]);
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

    return this.generateTokens(user._id.toString(), user.email, [UserRole.ADMIN]);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Check all profiles to determine roles
    const roles: UserRole[] = [];
    const profiles: any = {};

    // Check Player
    try {
      const playerProfile = await this.playerService.findByUserId(user._id);
      if (playerProfile) {
        roles.push(UserRole.PLAYER);
        profiles.player = playerProfile;
      }
    } catch (e) { }

    // Check Team Manager
    try {
      const teamManagerProfile = await this.teamManagerService.findByUserId(user._id);
      if (teamManagerProfile) {
        // Block login if team manager is still pending approval
        if (teamManagerProfile.status === 'pending') {
          throw new UnauthorizedException(
            'Your account is pending verification. Please wait for admin approval before logging in.'
          );
        }
        // Block login if team manager was rejected
        if (teamManagerProfile.status === 'rejected') {
          throw new UnauthorizedException(
            'Your account registration was rejected. Please contact support for more information.'
          );
        }
        // Only allow approved team managers
        if (teamManagerProfile.status === 'approved') {
          roles.push(UserRole.TEAM_MANAGER);
          profiles.teamManager = teamManagerProfile;
        }
      }
    } catch (e) {
      // Re-throw UnauthorizedException (our custom errors)
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      // Ignore NotFoundException (profile doesn't exist)
    }

    // Check Referee
    try {
      const refereeProfile = await this.refereeService.findByUserId(user._id);
      if (refereeProfile) {
        roles.push(UserRole.REFEREE);
        profiles.referee = refereeProfile;
      }
    } catch (e) { }

    // Check Admin
    try {
      const adminProfile = await this.adminService.findByUserId(user._id);
      if (adminProfile) {
        roles.push(UserRole.ADMIN);
        profiles.admin = adminProfile;
      }
    } catch (e) { }

    if (roles.length === 0) {
      throw new UnauthorizedException('No profile found for user');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email, roles);

    return {
      ...tokens,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        roles, // Return array of roles
        profiles, // Return object with all profiles
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      // Verify the refresh token is a valid JWT
      const payload = await this.jwtService.verifyAsync(refreshToken);

      // Check that the user exists and the stored refresh token matches
      const user = await this.usersService.findById(payload.sub);
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Determine the user's current roles (they may have changed)
      const roles: UserRole[] = payload.roles ?? [];

      // Generate fresh token pair
      return this.generateTokens(user._id.toString(), user.email, roles);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(userId: string, email: string, roles: UserRole[]) {
    const payload = { sub: userId, email, roles };

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
