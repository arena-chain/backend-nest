import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/user.module';
import { PlayerModule } from './player/player.module';
import { TeamManagerModule } from './team-manager/team-manager.module';
import { RefereeModule } from './referee/referee.module';
import { AdminModule } from './admin/admin.module';
import { StreamModule } from './stream/stream.module';
import { ChannelModule } from './channel/channel.module';
import { LigueModule } from './ligue/ligue.module';
import { GamesModule } from './games/games.module';
import { AbonnementModule } from './abonnement/abonnement.module';
import { TournementsModule } from './tournements/tournements.module';
import { RankModule } from './rank/rank.module';
import { CatalogModule } from './catalog/catalog.module';
import { ChatModule } from './chat/chat.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost/arenachain'),
    AuthModule,
    UsersModule,
    PlayerModule,
    TeamManagerModule,
    RefereeModule,
    AdminModule,
    StreamModule,
    ChannelModule,
    LigueModule,
    GamesModule,
    AbonnementModule,
    TournementsModule,
    RankModule,
    CatalogModule,
    ChatModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
