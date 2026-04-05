// src/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Req, Res, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterPlayerDto } from './dto/register-player.dto';
import { RegisterTeamManagerDto } from './dto/register-team-manager.dto';
import { RegisterRefereeDto } from './dto/register-referee.dto';
import { RegisterScouterDto } from './dto/register-scouter.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) { }

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

  @Post('register/scouter')
  @ApiOperation({ summary: 'Register a new scouter' })
  @ApiResponse({ status: 201, description: 'Scouter successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  registerScouter(@Body() dto: RegisterScouterDto) {
    return this.authService.registerScouter(dto);
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with OTP' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend verification OTP' })
  @ApiResponse({ status: 200, description: 'OTP resent' })
  resendOtp(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendOtp(dto.email);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Reset OTP sent' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-reset-otp')
  @ApiOperation({ summary: 'Verify reset password OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  verifyResetOtp(@Body() dto: { email: string; otp: string }) {
    return this.authService.verifyResetOtp(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Login with Google' })
  async googleAuth(@Req() req) { }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google Auth callback' })
  async googleAuthRedirect(@Req() req, @Res() res) {
    const tokens = await this.authService.googleLogin(req);
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

    return res.send(`
      <html>
        <head>
          <title>Auth Success</title>
        </head>
        <body>
          <script>
            const urlParams = "?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&source=google";
            window.location.href = "arenachain://success" + urlParams;
            setTimeout(() => {
              window.location.href = "${frontendUrl}/login" + urlParams;
            }, 500);
          </script>
          <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h2>Connection Successful!</h2>
            <p>Redirecting you back to the arena...</p>
          </div>
        </body>
      </html>
    `);
  }

  @Get('steam')
  @UseGuards(AuthGuard('steam'))
  @ApiOperation({ summary: 'Login with Steam' })
  async steamAuth(@Req() req) { }

  @Get('steam/return')
  @UseGuards(AuthGuard('steam'))
  @ApiOperation({ summary: 'Steam Auth callback' })
  async steamAuthRedirect(@Req() req, @Res() res) {
    const tokens = await this.authService.steamLogin(req);
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

    return res.send(`
      <html>
        <head>
          <title>Auth Success</title>
        </head>
        <body>
          <script>
            const urlParams = "?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&source=steam";
            window.location.href = "arenachain://success" + urlParams;
            setTimeout(() => {
              window.location.href = "${frontendUrl}/login" + urlParams;
            }, 500);
          </script>
          <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h2>Connection Successful!</h2>
            <p>Redirecting you back to the arena...</p>
          </div>
        </body>
      </html>
    `);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req) {
    return this.authService.getProfile(req.user.email);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Req() req, @Body() updateData: { nickname?: string; country?: string; avatar?: string; region?: string; bio?: string }) {
    return this.authService.updateProfile(req.user.email, updateData);
  }

  @Post('google/mobile')
  @ApiOperation({ summary: 'Google Sign-In for mobile apps (Flutter)' })
  @ApiResponse({
    status: 200,
    description: 'User authenticated with Google',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'user@gmail.com',
          nickname: 'John Doe',
          role: 'player',
          isEmailVerified: true
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  googleMobileAuth(@Body() body: { idToken: string }) {
    return this.authService.googleMobileLogin(body.idToken);
  }
}
