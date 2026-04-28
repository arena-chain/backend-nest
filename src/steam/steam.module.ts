import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/schemas/user.schema';
import { SteamVerificationService } from './steam-verification.service';
import { SteamController } from './steam.controller';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MatchmakingModule,
  ],
  providers: [SteamVerificationService],
  controllers: [SteamController],
  exports: [SteamVerificationService],
})
export class SteamModule {}
