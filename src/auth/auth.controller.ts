// src/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterPlayerDto } from './dto/register-player.dto';
import { RegisterTeamManagerDto } from './dto/register-team-manager.dto';
import { RegisterRefereeDto } from './dto/register-referee.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user (generic - requires role)' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed or role missing' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('register/player')
  @ApiOperation({ summary: 'Register a new player' })
  @ApiResponse({ status: 201, description: 'Player successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  registerPlayer(@Body() dto: RegisterPlayerDto) {
    return this.authService.registerPlayer(dto);
  }

  @Post('register/team-manager')
  @ApiOperation({ summary: 'Register a new team manager' })
  @ApiResponse({ status: 201, description: 'Team manager successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  registerTeamManager(@Body() dto: RegisterTeamManagerDto) {
    return this.authService.registerTeamManager(dto);
  }

  @Post('register/referee')
  @ApiOperation({ summary: 'Register a new referee' })
  @ApiResponse({ status: 201, description: 'Referee successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  registerReferee(@Body() dto: RegisterRefereeDto) {
    return this.authService.registerReferee(dto);
  }

  @Post('register/admin')
  @ApiOperation({ summary: 'Register a new admin' })
  @ApiResponse({ status: 201, description: 'Admin successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  registerAdmin(@Body() dto: RegisterAdminDto) {
    return this.authService.registerAdmin(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in with profile data',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'user@example.com',
          nickname: 'PlayerOne',
          role: 'player',
          profile: {
            isPro: false,
            isVerified: false,
            elo: 1000,
            rank: 'Unranked'
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
