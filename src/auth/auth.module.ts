import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../user/user.module';
import { PlayerModule } from '../player/player.module';
import { TeamManagerModule } from '../team-manager/team-manager.module';
import { RefereeModule } from '../referee/referee.module';
import { ScouterModule } from '../scouter/scouter.module';
import { AdminModule } from '../admin/admin.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { SteamStrategy } from './steam.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Registration, RegistrationSchema } from './schemas/registration.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Registration.name, schema: RegistrationSchema }]),
    UsersModule,
    PlayerModule,
    TeamManagerModule,
    RefereeModule,
    ScouterModule,
    AdminModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'yourSecretKey', // proper env var handling
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, SteamStrategy],
  exports: [AuthService],
})
export class AuthModule { }
