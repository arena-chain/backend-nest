import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
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
import { FriendshipModule } from './friendship/friendship.module';
import { VideoModule } from './video/video.module';
import { HighlightsModule } from './highlights/highlights.module';
import { TicketsModule } from './tickets/tickets.module';
import { ReservationModule } from './reservation/reservation.module';
import { TeamModule } from './team/team.module';
import { RiotApiModule } from './riot-api/riot-api.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost/arenachain'),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    MailModule,
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
    FriendshipModule,
    VideoModule,
    HighlightsModule,
    TicketsModule,
    ReservationModule,
    TeamModule,
    RiotApiModule,
    MatchmakingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
