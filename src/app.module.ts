import { Module, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/user.module';
import { PlayerModule } from './player/player.module';
import { TeamManagerModule } from './team-manager/team-manager.module';
import { TeamModule } from './team/team.module';
import { RefereeModule } from './referee/referee.module';
import { ScouterModule } from './scouter/scouter.module';
import { AdminModule } from './admin/admin.module';
import { StreamModule } from './stream/stream.module';
import { ChannelModule } from './channel/channel.module';
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
import { MissionModule } from './mission/mission.module';
import { AchievementsModule } from './achievements/achievements.module';
import { PartnershipsModule } from './partnerships/partnerships.module';
import { MailModule } from './mail/mail.module';
import { LeagueModule } from './league/league.module';
import { LeagueRegistrationModule } from './league-registration/league-registration.module';
import { StandingsModule } from './standings/standings.module';
import { SeasonModule } from './season/season.module';
import { LeagueRuleModule } from './season-rule/season-rule.module';
import { RoundModule } from './round/round.module';
import { MatchModule } from './match/match.module';
import { PrizePoolModule } from './prize-pool/prize-pool.module';
import { CheckInModule } from './check-in/check-in.module';
import { SeasonRosterModule } from './season-roster/season-roster.module';
import { MatchDisputeModule } from './match-dispute/match-dispute.module';
import { BracketModule } from './bracket/bracket.module';
import { StageModule } from './stage/stage.module';
import { GroupModule } from './group/group.module';
import { InvitationModule } from './invitation/invitation.module';
import { ScoutingModule } from './scouting/scouting.module';
import { NftModule } from './nft/nft.module';
import { NewsModule } from './news/news.module';
import { ReservationModule } from './reservation/reservation.module';
import { RiotApiModule } from './riot-api/riot-api.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { PresenceModule } from './presence/presence.module';
import { TrainingModule } from './training/training.module';
import { LevelModule } from './level/level.module';
import { LiveGameModule } from './live-game/live-game.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

const mongoLogger = new Logger('MongoDB');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const uri =
          config.get<string>('MONGO_URI') || 'mongodb://localhost:27017/arenachain';
        const dbName = config.get<string>('MONGO_DB_NAME') || 'arenachain';
        mongoLogger.log(
          `Using database name "${dbName}" (set MONGO_DB_NAME in env if your Atlas DB differs)`,
        );
        return {
          uri,
          dbName,
        };
      },
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    UsersModule,
    PlayerModule,
    TeamManagerModule,
    TeamModule,
    RefereeModule,
    ScouterModule,
    AdminModule,
    StreamModule,
    ChannelModule,
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
    MissionModule,
    LevelModule,
    AchievementsModule,
    PartnershipsModule,
    MailModule,
    LeagueModule,
    LeagueRegistrationModule,
    StandingsModule,
    SeasonModule,
    LeagueRuleModule,
    RoundModule,
    MatchModule,
    PrizePoolModule,
    CheckInModule,
    SeasonRosterModule,
    MatchDisputeModule,
    BracketModule,
    StageModule,
    GroupModule,
    InvitationModule,
    ScoutingModule,
    NftModule,
    NewsModule,
    ReservationModule,
    RiotApiModule,
    MatchmakingModule,
    PresenceModule,
    TrainingModule,
    LiveGameModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
