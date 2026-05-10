import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  FetchAccountDto,
  REGION_TO_ROUTING,
  REGION_TO_MATCH_ROUTING,
  REGION_TO_VAL_SHARD,
  RiotRegion,
} from './dto/fetch-account.dto';
import { PlayerService } from '../player/player.service';
import { RiotLinkStatus } from '../player/schemas/player-profile.schema';
import { LinkAccountDto } from './dto/link-account.dto';
import { MissionService } from '../mission/mission.service';
import { buildRiotAvatarUrl } from './riot-cdn.util';

interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface RiotSummoner {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface RiotLeagueEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface RiotMatchInfo {
  matchId: string;
  championName: string;
  championId: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  win: boolean;
  duration: number; // in seconds
  items: number[]; // item IDs
  gameMode: string;
  gameCreation: number;
}

export interface DetailedMatchInfo {
  gameInfo: {
    duration: number;
    queueType: string;
    gameMode: string;
    gameCreation: number;
  };
  playerStats: {
    championName: string;
    kills: number;
    deaths: number;
    assists: number;
    kda: string;
    cs: number;
    gold: number;
    damageDealt: number;
    visionScore: number;
    items: number[];
    spells: number[];
    runes: {
      primaryStyle: number;
      subStyle: number;
    };
  };
  teamStats: {
    blue: TeamObjectiveStats;
    red: TeamObjectiveStats;
  };
}

interface TeamObjectiveStats {
  totalKills: number;
  totalGold: number;
  towers: number;
  barons: number;
  dragons: number;
}

export interface RankedMatchSummary {
  matchId: string;
  gameDate: number; // ms epoch (Riot gameCreation)
  gameDuration: number; // seconds
  win: boolean;
  championName: string;
  individualPosition: string; // TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY | Invalid
  teamPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  goldEarned: number;
  damageDealtToChampions: number;
  damageTaken: number;
  wardsPlaced: number;
  wardsKilled: number;
  firstBloodKill: boolean;
  firstBloodAssist: boolean;
  opponentChampionName: string;
  teamWin: boolean;
}

export interface RankedAiAnalysisResponse {
  analysis: string;
  gamesAnalyzed: number;
  generatedAt: Date;
  cached: boolean;
}

export interface TftMatchInfo {
  matchId: string;
  placement: number;
  level: number;
  goldLeft: number;
  timeEliminated: number;
  win: boolean; // Top 4
  traits: any[];
  units: any[];
  gameCreation: number;
}

export interface DetailedTftMatchInfo {
  gameInfo: {
    duration: number;
    queueType: string;
    gameCreation: number;
  };
  playerStats: {
    placement: number;
    level: number;
    goldLeft: number;
    lastRound: number;
    timeEliminated: number;
    playersEliminated: number;
    totalDamageToPlayers: number;
    traits: any[];
    units: any[];
  };
}

export interface PlayerAccountInfo {
  puuid: string;
  summonerName: string;
  level: number;
  profileIconId: number;
  accountId: string;
  region: string;
  ranks: RiotLeagueEntry[];
  matchHistory: RiotMatchInfo[];
}

@Injectable()
export class RiotApiService {
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly playerService: PlayerService,
    private readonly missionService: MissionService,
  ) {
    const apiKey = this.configService.get<string>('RIOT_API_KEY');
    console.log('RiotApiService: Loading API Key from ConfigService...');
    if (!apiKey) {
      console.error('RiotApiService: RIOT_API_KEY IS MISSING!');
      throw new Error(
        'RIOT_API_KEY is not configured in environment variables',
      );
    }
    this.apiKey = apiKey;
    console.log(
      'RiotApiService: API Key loaded successfully (starts with: ' +
        apiKey.substring(0, 6) +
        '...)',
    );
  }

  async getPlayerAccount(dto: FetchAccountDto): Promise<PlayerAccountInfo> {
    console.log(
      `RiotApiService: Fetching account for ${dto.gameName}#${dto.tagLine} in ${dto.region}`,
    );
    try {
      // Step 1: Get Account Info (PUUID + Riot ID)
      const account = await this.getAccountByRiotId(
        dto.gameName,
        dto.tagLine,
        dto.region,
      );
      console.log(`RiotApiService: Found Account for PUUID: ${account.puuid}`);

      // Step 2: Get summoner info using PUUID
      const summoner = await this.getSummonerByPuuid(account.puuid, dto.region);
      console.log(`RiotApiService: Found Summoner Data for id: ${summoner.id}`);

      // Step 3: Get ranks (filter for Solo Queue only)
      const allRanks = await this.getLeagueEntriesBySummoner(
        summoner.id,
        dto.region,
      );
      const soloRank = allRanks.filter(
        (r) => r.queueType === 'RANKED_SOLO_5x5',
      );
      console.log(`RiotApiService: Found ${soloRank.length} Solo Rank entries`);

      // Step 4: Get Match History (last 10)
      const matchIds = await this.getMatchIdsByPuuid(account.puuid, dto.region);
      console.log(`RiotApiService: Found ${matchIds.length} match IDs`);

      const matchHistoryResults = await Promise.allSettled(
        matchIds.map((id) =>
          this.getMatchDetailsById(id, dto.region, account.puuid),
        ),
      );

      const matchHistory = matchHistoryResults
        .filter(
          (res): res is PromiseFulfilledResult<RiotMatchInfo> =>
            res.status === 'fulfilled',
        )
        .map((res) => res.value);

      console.log(
        `RiotApiService: Successfully fetched details for ${matchHistory.length} matches`,
      );

      return {
        puuid: account.puuid,
        summonerName: `${account.gameName}#${account.tagLine}`,
        level: summoner.summonerLevel,
        profileIconId: summoner.profileIconId,
        accountId: summoner.accountId,
        region: dto.region,
        ranks: soloRank,
        matchHistory: matchHistory,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch account information from Riot API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTftAccount(dto: FetchAccountDto): Promise<any> {
    console.log(
      `RiotApiService: Fetching TFT data for ${dto.gameName}#${dto.tagLine} in ${dto.region}`,
    );
    try {
      const account = await this.getAccountByRiotId(
        dto.gameName,
        dto.tagLine,
        dto.region,
      );
      const matchIds = await this.getTftMatchIdsByPuuid(
        account.puuid,
        dto.region,
      );

      const matchHistoryResults = await Promise.allSettled(
        matchIds.map((id) =>
          this.getDetailedTftMatchInfo(id, dto.region, account.puuid),
        ),
      );

      const matchHistory = matchHistoryResults
        .filter(
          (res): res is PromiseFulfilledResult<any> =>
            res.status === 'fulfilled',
        )
        .map((res) => res.value);

      return {
        puuid: account.puuid,
        summonerName: `${account.gameName}#${account.tagLine}`,
        region: dto.region,
        matchHistory: matchHistory,
      };
    } catch (error) {
      console.error('Error fetching TFT account:', error);
      throw new HttpException(
        'Failed to fetch TFT info',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getAccountByRiotId(
    gameName: string,
    tagLine: string,
    region: RiotRegion,
  ): Promise<RiotAccount> {
    const routing = REGION_TO_ROUTING[region];
    const url = `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    console.log(`RiotApiService: Calling Riot ID API: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<RiotAccount>(url, {
          headers: { 'X-Riot-Token': this.apiKey },
        }),
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new NotFoundException(
          `Riot account not found for ${gameName}#${tagLine}`,
        );
      }
      if (error.response?.status === 429) {
        throw new HttpException(
          'Rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (error.response?.status === 403) {
        throw new HttpException(
          'Invalid or expired Riot API key',
          HttpStatus.FORBIDDEN,
        );
      }
      throw new HttpException(
        'Failed to fetch Riot account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getSummonerByPuuid(
    puuid: string,
    region: RiotRegion,
  ): Promise<RiotSummoner> {
    const url = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<RiotSummoner>(url, {
          headers: { 'X-Riot-Token': this.apiKey },
        }),
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new NotFoundException('Summoner not found for this PUUID');
      }
      if (error.response?.status === 429) {
        throw new HttpException(
          'Rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new HttpException(
        'Failed to fetch summoner information',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getLeagueEntriesBySummoner(
    summonerId: string,
    region: RiotRegion,
  ): Promise<RiotLeagueEntry[]> {
    const url = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<RiotLeagueEntry[]>(url, {
          headers: { 'X-Riot-Token': this.apiKey },
        }),
      );

      return response.data.map((entry) => ({
        queueType: entry.queueType,
        tier: entry.tier,
        rank: entry.rank,
        leaguePoints: entry.leaguePoints,
        wins: entry.wins,
        losses: entry.losses,
      }));
    } catch (error: any) {
      console.error(`Error fetching league entries: ${error.message}`);
      return [];
    }
  }

  private async getMatchIdsByPuuid(
    puuid: string,
    region: RiotRegion,
  ): Promise<string[]> {
    const matchRouting = REGION_TO_MATCH_ROUTING[region];
    const url = `https://${matchRouting}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<string[]>(url, {
          headers: { 'X-Riot-Token': this.apiKey },
        }),
      );

      return response.data;
    } catch (error: any) {
      console.error(`Error fetching match IDs: ${error.message}`);
      return [];
    }
  }

  private async getMatchDetailsById(
    matchId: string,
    region: RiotRegion,
    puuid: string,
  ): Promise<RiotMatchInfo> {
    const matchRouting = REGION_TO_MATCH_ROUTING[region];
    const url = `https://${matchRouting}.api.riotgames.com/lol/match/v5/matches/${matchId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(url, {
          headers: { 'X-Riot-Token': this.apiKey },
        }),
      );

      const match = response.data;
      if (!match?.info?.participants) {
        throw new Error('Invalid match data structure');
      }

      const participant = match.info.participants.find(
        (p) => p.puuid === puuid,
      );

      if (!participant) {
        console.warn(
          `RiotApiService: Participant with PUUID ${puuid} not found in match ${matchId}`,
        );
        throw new Error('Participant not found in match');
      }

      const k = participant.kills ?? 0;
      const d = participant.deaths ?? 0;
      const a = participant.assists ?? 0;
      const kdaValue = d === 0 ? (k + a).toFixed(2) : ((k + a) / d).toFixed(2);

      return {
        matchId: match.metadata.matchId,
        championName: participant.championName,
        championId: participant.championId,
        kills: k,
        deaths: d,
        assists: a,
        kda: `${kdaValue}:1`,
        win: participant.win,
        duration: match.info.gameDuration,
        items: [
          participant.item0 ?? 0,
          participant.item1 ?? 0,
          participant.item2 ?? 0,
          participant.item3 ?? 0,
          participant.item4 ?? 0,
          participant.item5 ?? 0,
          participant.item6 ?? 0,
        ],
        gameMode: match.info.gameMode,
        gameCreation: match.info.gameCreation,
      };
    } catch (error: any) {
      console.error(
        `Error fetching match details for ${matchId}: ${error.message}`,
      );
      throw new HttpException(
        `Failed to fetch match details for ${matchId}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetch a single Ranked Solo/Duo match (queue 420) and extract the rich
   * field set the AI analysis needs. Distinct from getMatchDetailsById /
   * getDetailedMatchById — keeps those untouched.
   */
  private async fetchRankedMatchSummary(
    matchId: string,
    region: RiotRegion,
    puuid: string,
  ): Promise<RankedMatchSummary | null> {
    const matchRouting = REGION_TO_MATCH_ROUTING[region];
    const url = `https://${matchRouting}.api.riotgames.com/lol/match/v5/matches/${matchId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(url, {
          headers: { 'X-Riot-Token': this.apiKey },
        }),
      );

      const match = response.data;
      const info = match?.info;
      const participants = info?.participants;
      if (!info || !Array.isArray(participants)) return null;

      // Skip non-Ranked Solo/Duo just in case Riot ever returns mixed ids.
      if (info.queueId !== 420) return null;

      const me = participants.find((p: any) => p.puuid === puuid);
      if (!me) return null;

      const myTeamId: number = me.teamId;
      const myLane: string = me.teamPosition || me.individualPosition || '';

      // Best-effort lane opponent: same teamPosition, opposing teamId.
      const opponent = participants.find(
        (p: any) =>
          p.teamId !== myTeamId &&
          (p.teamPosition || p.individualPosition) === myLane &&
          myLane !== '',
      );

      const myTeam = (info.teams || []).find((t: any) => t.teamId === myTeamId);

      return {
        matchId: match.metadata?.matchId || matchId,
        gameDate: info.gameCreation ?? 0,
        gameDuration: info.gameDuration ?? 0,
        win: !!me.win,
        championName: me.championName || 'Unknown',
        individualPosition: me.individualPosition || 'Invalid',
        teamPosition: me.teamPosition || me.individualPosition || 'Invalid',
        kills: me.kills ?? 0,
        deaths: me.deaths ?? 0,
        assists: me.assists ?? 0,
        totalMinionsKilled: me.totalMinionsKilled ?? 0,
        neutralMinionsKilled: me.neutralMinionsKilled ?? 0,
        visionScore: me.visionScore ?? 0,
        goldEarned: me.goldEarned ?? 0,
        damageDealtToChampions: me.totalDamageDealtToChampions ?? 0,
        damageTaken: me.totalDamageTaken ?? 0,
        wardsPlaced: me.wardsPlaced ?? 0,
        wardsKilled: me.wardsKilled ?? 0,
        firstBloodKill: !!me.firstBloodKill,
        firstBloodAssist: !!me.firstBloodAssist,
        opponentChampionName: opponent?.championName || 'Unknown',
        teamWin: !!myTeam?.win,
      };
    } catch (err: any) {
      const status = err?.response?.status;
      // 429 = Riot rate limit. Re-throw so the caller can surface a friendly error.
      if (status === 429) {
        throw new HttpException(
          'Riot API rate limit hit while fetching ranked match details. Please try again in a minute.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      console.warn(
        `RiotApiService: fetchRankedMatchSummary failed for ${matchId}: ${err.message}`,
      );
      return null;
    }
  }

  private buildAnalysisPrompt(
    summonerName: string,
    matches: RankedMatchSummary[],
  ): string {
    const lines = matches.map((m, i) => {
      const cs = m.totalMinionsKilled + m.neutralMinionsKilled;
      const cspm =
        m.gameDuration > 0 ? (cs / (m.gameDuration / 60)).toFixed(2) : '0.00';
      const durationMin =
        m.gameDuration > 0 ? Math.round(m.gameDuration / 60) : 0;
      return [
        `Game ${i + 1} (${m.win ? 'WIN' : 'LOSS'}, ${durationMin}min, ${m.teamPosition || m.individualPosition}):`,
        `  Champion: ${m.championName} vs ${m.opponentChampionName}`,
        `  KDA: ${m.kills}/${m.deaths}/${m.assists}`,
        `  CS: ${cs} (${cspm}/min)`,
        `  Vision: ${m.visionScore}, Wards placed: ${m.wardsPlaced}, Wards killed: ${m.wardsKilled}`,
        `  Gold: ${m.goldEarned}, DMG to champs: ${m.damageDealtToChampions}, DMG taken: ${m.damageTaken}`,
        `  First blood kill: ${m.firstBloodKill}, First blood assist: ${m.firstBloodAssist}`,
      ].join('\n');
    });

    const n = matches.length;
    const basisLine =
      n >= 10
        ? `Based on your last ${n} ranked games`
        : `Based on your ${n} ranked game${n === 1 ? '' : 's'} (fewer than 10 available)`;

    return `You are a top-tier League of Legends ranked coach.
Analyze the following ${n} Ranked Solo/Duo (queue 420) games for "${summonerName}".

DATA:
${lines.join('\n\n')}

WRITE A REPORT IN MARKDOWN WITH EXACTLY THESE SECTIONS AND HEADINGS, IN THIS ORDER:

## Your Ranked Performance Analysis — ${summonerName}
${basisLine}

### 1. Champion Pool Assessment
[List specific champions played, which performed best/worst, win rate per champion when 2+ games on it.]

### 2. Lane Performance
[CS efficiency (CS/min), kill participation, early vs late game patterns. Reference specific games.]

### 3. Deaths Analysis
[When and how they die — early game deaths, getting caught, snowballing-loss patterns. Reference specific games.]

### 4. Biggest Recurring Mistake
[ONE specific, concrete mistake that appears across multiple games, with evidence from the data above.]

### 5. What You Did Well
[Specific positive patterns visible in the data.]

### 6. Priority Improvement Points
1. [Most impactful thing to fix — specific and actionable]
2. [Second priority]
3. [Third priority]

### 7. Recommended Next Steps
[2–3 concrete in-game actions to focus on next session.]

STRICT RULES:
- DO NOT give generic advice like "improve your CS". Always cite the specific game.
- DO reference specific games: "In Game 3 (Yasuo, 2/7 vs Zed) you took 7 deaths in a 24-minute loss, suggesting…".
- DO compare across champions: "You won 2/2 on Garen but 0/2 on Darius — this suggests…".
- DO reference the lane opponent when relevant.
- Keep the WHOLE report under 600 words. Every sentence must say something specific.
- Output PURE markdown. Do not wrap in code fences. Do not add any preamble before "## Your Ranked Performance Analysis".`;
  }

  async getDetailedMatchById(
    matchId: string,
    region: RiotRegion,
    puuid: string,
  ): Promise<DetailedMatchInfo> {
    const matchRouting = REGION_TO_MATCH_ROUTING[region];
    const url = `https://${matchRouting}.api.riotgames.com/lol/match/v5/matches/${matchId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(url, {
          headers: { 'X-Riot-Token': this.apiKey },
        }),
      );

      const match = response.data;
      const participant = match.info.participants.find(
        (p) => p.puuid === puuid,
      );

      if (!participant) {
        throw new NotFoundException('Participant not found in match');
      }

      const k = participant.kills ?? 0;
      const d = participant.deaths ?? 0;
      const a = participant.assists ?? 0;
      const kdaValue = d === 0 ? (k + a).toFixed(2) : ((k + a) / d).toFixed(2);

      // Aggregate Team Stats
      const blueTeam = match.info.teams.find((t) => t.teamId === 100);
      const redTeam = match.info.teams.find((t) => t.teamId === 200);

      const getTeamParticipants = (teamId: number) =>
        match.info.participants.filter((p) => p.teamId === teamId);

      const formatTeamStats = (
        team: any,
        participants: any[],
      ): TeamObjectiveStats => ({
        totalKills: participants.reduce((sum, p) => sum + (p.kills || 0), 0),
        totalGold: participants.reduce(
          (sum, p) => sum + (p.goldEarned || 0),
          0,
        ),
        towers: team?.objectives?.tower?.kills || 0,
        barons: team?.objectives?.baron?.kills || 0,
        dragons: team?.objectives?.dragon?.kills || 0,
      });

      const queueIdMap: Record<number, string> = {
        420: 'Ranked Solo',
        440: 'Ranked Flex',
        450: 'ARAM',
        400: 'Normal Draft',
        430: 'Normal Blind',
      };

      return {
        gameInfo: {
          duration: match.info.gameDuration,
          queueType: queueIdMap[match.info.queueId] || 'Other',
          gameMode: match.info.gameMode,
          gameCreation: match.info.gameCreation,
        },
        playerStats: {
          championName: participant.championName,
          kills: k,
          deaths: d,
          assists: a,
          kda: `${kdaValue}:1`,
          cs:
            (participant.totalMinionsKilled || 0) +
            (participant.neutralMinionsKilled || 0),
          gold: participant.goldEarned || 0,
          damageDealt: participant.totalDamageDealtToChampions || 0,
          visionScore: participant.visionScore || 0,
          items: [
            participant.item0 || 0,
            participant.item1 || 0,
            participant.item2 || 0,
            participant.item3 || 0,
            participant.item4 || 0,
            participant.item5 || 0,
            participant.item6 || 0,
          ],
          spells: [participant.summoner1Id, participant.summoner2Id],
          runes: {
            primaryStyle: participant.perks?.styles?.[0]?.style || 0,
            subStyle: participant.perks?.styles?.[1]?.style || 0,
          },
        },
        teamStats: {
          blue: formatTeamStats(blueTeam, getTeamParticipants(100)),
          red: formatTeamStats(redTeam, getTeamParticipants(200)),
        },
      };
    } catch (error: any) {
      console.error(
        `Error fetching detailed match for ${matchId}: ${error.message}`,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to fetch match details`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getTftMatchIdsByPuuid(
    puuid: string,
    region: RiotRegion,
  ): Promise<string[]> {
    const matchRouting = REGION_TO_MATCH_ROUTING[region];
    const url = `https://${matchRouting}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?start=0&count=10`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<string[]>(url, {
          headers: { 'X-Riot-Token': this.apiKey },
        }),
      );
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching TFT match IDs: ${error.message}`);
      return [];
    }
  }

  async getDetailedTftMatchInfo(
    matchId: string,
    region: RiotRegion,
    puuid: string,
  ): Promise<DetailedTftMatchInfo> {
    const matchRouting = REGION_TO_MATCH_ROUTING[region];
    const url = `https://${matchRouting}.api.riotgames.com/tft/match/v1/matches/${matchId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(url, {
          headers: { 'X-Riot-Token': this.apiKey },
        }),
      );

      const match = response.data;
      const participantIndex = match.metadata.participants.indexOf(puuid);
      const participant = match.info.participants[participantIndex];

      if (!participant) {
        throw new NotFoundException('Participant not found in TFT match');
      }

      const queueIdMap: Record<number, string> = {
        1090: 'Normal',
        1100: 'Ranked',
        1130: 'Hyper Roll',
        1150: 'Double Up',
      };

      return {
        gameInfo: {
          duration: Math.floor(match.info.game_length || 0),
          queueType: queueIdMap[match.info.queue_id] || 'Other',
          gameCreation: match.info.game_datetime,
        },
        playerStats: {
          placement: participant.placement,
          level: participant.level,
          goldLeft: participant.gold_left,
          lastRound: participant.last_round,
          timeEliminated: Math.floor(participant.time_eliminated || 0),
          playersEliminated: participant.players_eliminated,
          totalDamageToPlayers: participant.total_damage_to_players,
          traits: participant.traits || [],
          units: participant.units || [],
        },
      };
    } catch (error: any) {
      console.error(
        `Error fetching detailed TFT match for ${matchId}: ${error.message}`,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to fetch TFT match details`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ── Unified Match History (for Recent Games page) ─────────────────────

  async getMatchHistory(
    userId: string,
    game: 'lol' | 'val' | 'all' = 'all',
    start = 0,
    count = 10,
  ): Promise<{ linked: boolean; game: string; matches: any[]; total: number }> {
    const profile = await this.playerService.findByUserId(userId);

    if (
      !profile?.riotPuuid ||
      profile.riotLinkStatus !== RiotLinkStatus.VERIFIED
    ) {
      return { linked: false, game, matches: [], total: 0 };
    }

    const region = profile.riotRegion as RiotRegion;
    const puuid = profile.riotPuuid;
    let allMatches: any[] = [];

    if (game === 'lol' || game === 'all') {
      try {
        const lolMatches = await this.fetchLolMatchHistory(
          puuid,
          region,
          start,
          count,
        );
        allMatches.push(...lolMatches);
      } catch (e) {
        console.warn('Failed to fetch LoL matches:', e.message);
      }
    }

    if (game === 'val' || game === 'all') {
      try {
        const valMatches = await this.fetchValMatchHistory(
          puuid,
          region,
          start,
          count,
        );
        allMatches.push(...valMatches);
      } catch (e) {
        console.warn('Failed to fetch Valorant matches:', e.message);
      }
    }

    allMatches.sort((a, b) => b.gameCreation - a.gameCreation);

    if (game === 'all') {
      allMatches = allMatches.slice(0, count);
    }

    await this.syncPlayMatchMissionsFromRiotHistory(userId, allMatches);

    return {
      linked: true,
      game,
      matches: allMatches,
      total: allMatches.length,
    };
  }

  /**
   * When Recent Games (or any client) loads Riot match history, advance play_match missions
   * for each match once per Riot matchId (dedupe via MissionEventLog).
   * play_with_friends is not inferred from Riot payloads here (no reliable party metadata).
   */
  private async syncPlayMatchMissionsFromRiotHistory(
    userId: string,
    matches: any[],
  ): Promise<void> {
    for (const m of matches) {
      const matchId = m?.matchId;
      if (!matchId) continue;

      const rawType = (m.gameType || m.game || '').toString().toLowerCase();
      const missionGame =
        rawType === 'val' || rawType.includes('valorant') ? 'valorant' : 'lol';
      const dedupeKey = `riot:${missionGame}:${matchId}`;

      try {
        await this.missionService.onMatchCompleted(userId, {
          game: missionGame,
          amount: 1,
          withFriends: false,
          dedupeKey,
        });
      } catch (err) {
        console.warn(
          `[RiotApiService] Mission sync skipped for ${dedupeKey}:`,
          err?.message || err,
        );
      }
    }
  }

  private async fetchLolMatchHistory(
    puuid: string,
    region: RiotRegion,
    start: number,
    count: number,
  ): Promise<any[]> {
    const matchRouting = REGION_TO_MATCH_ROUTING[region];
    const url = `https://${matchRouting}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`;

    const resp = await firstValueFrom(
      this.httpService.get<string[]>(url, {
        headers: { 'X-Riot-Token': this.apiKey },
      }),
    );

    const results = await Promise.allSettled(
      resp.data.map((id) => this.getMatchDetailsById(id, region, puuid)),
    );

    return results
      .filter(
        (r): r is PromiseFulfilledResult<RiotMatchInfo> =>
          r.status === 'fulfilled',
      )
      .map((r) => ({ ...r.value, gameType: 'lol' }));
  }

  private async fetchValMatchHistory(
    puuid: string,
    region: RiotRegion,
    start: number,
    count: number,
  ): Promise<any[]> {
    const shard = REGION_TO_VAL_SHARD[region] || 'eu';
    const listUrl = `https://${shard}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${puuid}`;

    let matchIds: string[];
    try {
      const resp = await firstValueFrom(
        this.httpService.get<any>(listUrl, {
          headers: { 'X-Riot-Token': this.apiKey },
        }),
      );
      const history = resp.data?.history || [];
      matchIds = history.slice(start, start + count).map((h: any) => h.matchId);
    } catch (e: any) {
      if (e.response?.status === 403) {
        console.warn('Valorant API not available with current API key');
        return [];
      }
      throw e;
    }

    if (matchIds.length === 0) return [];

    const results = await Promise.allSettled(
      matchIds.map((id) => this.getValMatchDetail(id, shard, puuid)),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  private async getValMatchDetail(
    matchId: string,
    shard: string,
    puuid: string,
  ): Promise<any> {
    const url = `https://${shard}.api.riotgames.com/val/match/v1/matches/${matchId}`;

    const resp = await firstValueFrom(
      this.httpService.get<any>(url, {
        headers: { 'X-Riot-Token': this.apiKey },
      }),
    );

    const match = resp.data;
    const player = match.players?.find((p: any) => p.puuid === puuid);
    if (!player) throw new Error('Player not found in Valorant match');

    const playerTeam = match.teams?.find(
      (t: any) => t.teamId === player.teamId,
    );
    const k = player.stats?.kills ?? 0;
    const d = player.stats?.deaths ?? 0;
    const a = player.stats?.assists ?? 0;
    const kdaValue = d === 0 ? (k + a).toFixed(2) : ((k + a) / d).toFixed(2);

    const mapNames: Record<string, string> = {
      '/Game/Maps/Ascent/Ascent': 'Ascent',
      '/Game/Maps/Duality/Duality': 'Bind',
      '/Game/Maps/Triad/Triad': 'Haven',
      '/Game/Maps/Bonsai/Bonsai': 'Split',
      '/Game/Maps/Port/Port': 'Icebox',
      '/Game/Maps/Foxtrot/Foxtrot': 'Breeze',
      '/Game/Maps/Canyon/Canyon': 'Fracture',
      '/Game/Maps/Pitt/Pitt': 'Pearl',
      '/Game/Maps/Jam/Jam': 'Lotus',
      '/Game/Maps/Juliett/Juliett': 'Sunset',
      '/Game/Maps/HURM/HURM_Alley/HURM_Alley': 'District',
      '/Game/Maps/HURM/HURM_Bowl/HURM_Bowl': 'Kasbah',
      '/Game/Maps/HURM/HURM_Yard/HURM_Yard': 'Piazza',
    };

    return {
      gameType: 'val',
      matchId,
      characterId: player.characterId,
      kills: k,
      deaths: d,
      assists: a,
      kda: `${kdaValue}:1`,
      score: player.stats?.score ?? 0,
      win: playerTeam?.won ?? false,
      roundsWon: playerTeam?.roundsWon ?? 0,
      roundsLost: playerTeam?.roundsPlayed
        ? playerTeam.roundsPlayed - (playerTeam.roundsWon ?? 0)
        : 0,
      map:
        mapNames[match.matchInfo?.mapId] || match.matchInfo?.mapId || 'Unknown',
      gameMode: match.matchInfo?.gameMode || 'Unknown',
      gameLengthMs: match.matchInfo?.gameLengthMillis ?? 0,
      gameCreation: match.matchInfo?.gameStartMillis ?? 0,
    };
  }

  /**
   * Fetch the player's last 10 Ranked Solo/Duo games (queue 420) and run them
   * through a local Ollama llama3.1 instance to produce a written coaching
   * report. Cached on the player profile for 24 h.
   *
   * Throws HttpException with HTTP-friendly status codes for the desktop UI
   * to surface (Riot rate limit, Ollama unreachable, account not linked).
   */
  async getRankedAiAnalysis(
    userId: string,
  ): Promise<RankedAiAnalysisResponse> {
    const profile = await this.playerService.findByUserId(userId);

    if (
      !profile?.riotPuuid ||
      profile.riotLinkStatus !== RiotLinkStatus.VERIFIED
    ) {
      throw new HttpException(
        'Link and verify your Riot account before requesting AI analysis.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // ── 24h cache ──
    const cached = profile.lastAiAnalysis;
    if (
      cached &&
      cached.content &&
      cached.generatedAt &&
      Date.now() - new Date(cached.generatedAt).getTime() < 24 * 60 * 60 * 1000
    ) {
      return {
        analysis: cached.content,
        gamesAnalyzed: cached.gamesAnalyzed,
        generatedAt: cached.generatedAt,
        cached: true,
      };
    }

    const region = profile.riotRegion as RiotRegion;
    const puuid = profile.riotPuuid;
    const summonerName = profile.riotGameName || 'Summoner';
    const matchRouting = REGION_TO_MATCH_ROUTING[region];

    if (!matchRouting) {
      throw new HttpException(
        `Unsupported Riot region: ${region}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // ── 1. Get last 10 Ranked Solo/Duo match IDs (queue=420) ──
    const idsUrl = `https://${matchRouting}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&count=10`;
    let matchIds: string[] = [];
    try {
      const resp = await firstValueFrom(
        this.httpService.get<string[]>(idsUrl, {
          headers: { 'X-Riot-Token': this.apiKey },
        }),
      );
      matchIds = Array.isArray(resp.data) ? resp.data : [];
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        throw new HttpException(
          'Riot API rate limit hit. Please try again in a minute.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new HttpException(
        'Failed to fetch ranked match list from Riot.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (matchIds.length === 0) {
      const friendly = `## Your Ranked Performance Analysis — ${summonerName}\n\nPlay at least 1 ranked game to get analysis.`;
      return {
        analysis: friendly,
        gamesAnalyzed: 0,
        generatedAt: new Date(),
        cached: false,
      };
    }

    // ── 2. Pull rich per-match summaries ──
    const settled = await Promise.allSettled(
      matchIds.map((id) => this.fetchRankedMatchSummary(id, region, puuid)),
    );
    const summaries: RankedMatchSummary[] = settled
      .filter(
        (r): r is PromiseFulfilledResult<RankedMatchSummary | null> =>
          r.status === 'fulfilled',
      )
      .map((r) => r.value)
      .filter((s): s is RankedMatchSummary => s !== null);

    if (summaries.length === 0) {
      const friendly = `## Your Ranked Performance Analysis — ${summonerName}\n\nPlay at least 1 ranked game to get analysis.`;
      return {
        analysis: friendly,
        gamesAnalyzed: 0,
        generatedAt: new Date(),
        cached: false,
      };
    }

    // ── 3. Call Ollama ──
    const prompt = this.buildAnalysisPrompt(summonerName, summaries);
    let analysis = '';
    try {
      const ollamaResp = await firstValueFrom(
        this.httpService.post<{ response?: string }>(
          'http://localhost:11434/api/generate',
          {
            model: 'llama3.1',
            prompt,
            stream: false,
            options: {
              temperature: 0.3,
              num_predict: 800,
            },
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000, // Ollama can take up to 2 min on CPU
          },
        ),
      );
      analysis = (ollamaResp.data?.response || '').trim();
    } catch (err: any) {
      const code = err?.code || err?.cause?.code;
      if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ENOTFOUND') {
        throw new HttpException(
          'Ollama is not running on http://localhost:11434. Start it with `ollama serve` and ensure `ollama pull llama3.1` has been run.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      console.error('RiotApiService: Ollama call failed:', err?.message || err);
      throw new HttpException(
        'AI analysis service is temporarily unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!analysis) {
      throw new HttpException(
        'Ollama returned an empty response. Try again.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // ── 4. Persist 24h cache ──
    const generatedAt = new Date();
    profile.lastAiAnalysis = {
      content: analysis,
      gamesAnalyzed: summaries.length,
      generatedAt,
    };
    try {
      await profile.save();
    } catch (e: any) {
      console.warn(
        `RiotApiService: failed to persist lastAiAnalysis cache: ${e?.message || e}`,
      );
    }

    return {
      analysis,
      gamesAnalyzed: summaries.length,
      generatedAt,
      cached: false,
    };
  }

  // ── Account Linking (Icon-Change Verification) ────────────────────────

  /**
   * Step 1: Capture current profile icon and store as originalIconId.
   * Marks the player profile as pending_verification.
   */
  async linkAccount(userId: string, dto: LinkAccountDto) {
    const account = await this.getAccountByRiotId(
      dto.gameName,
      dto.tagLine,
      dto.region,
    );
    const summoner = await this.getSummonerByPuuid(account.puuid, dto.region);

    await this.playerService.findOrCreateByUserId(userId);
    await this.playerService.update(userId, {
      riotPuuid: account.puuid,
      riotGameName: dto.gameName,
      riotTagLine: dto.tagLine,
      riotRegion: dto.region,
      riotAccountId: summoner.accountId,
      originalIconId: summoner.profileIconId,
      riotLinkStatus: RiotLinkStatus.PENDING_VERIFICATION,
    });

    return {
      message:
        'Account link initiated. Please change your summoner icon in the League client, then click "Verify Game Account".',
      originalIconId: summoner.profileIconId,
      summonerName: `${account.gameName}#${account.tagLine}`,
      status: RiotLinkStatus.PENDING_VERIFICATION,
    };
  }

  /**
   * Step 2: Re-fetch the profile icon and compare with the stored original.
   * If changed → verified. If same → retry needed.
   */
  async verifyAccount(userId: string) {
    const profile = await this.playerService.findByUserId(userId);

    if (
      !profile.riotPuuid ||
      profile.riotLinkStatus !== RiotLinkStatus.PENDING_VERIFICATION
    ) {
      throw new HttpException(
        'No pending account link found. Please click "Link Game Account" first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const summoner = await this.getSummonerByPuuid(
      profile.riotPuuid,
      profile.riotRegion as RiotRegion,
    );

    const currentIconId = summoner.profileIconId;
    const originalIconId = profile.originalIconId;

    if (currentIconId !== originalIconId) {
      await this.playerService.update(userId, {
        riotLinkStatus: RiotLinkStatus.VERIFIED,
      });

      return {
        verified: true,
        message:
          'Account verified successfully! Your Riot account is now linked.',
        summonerName: `${profile.riotGameName}#${profile.riotTagLine}`,
      };
    }

    return {
      verified: false,
      message:
        'Icon has not changed yet. Please change your summoner icon in the League client and try again.',
      originalIconId,
      currentIconId,
    };
  }

  /**
   * Get the current link status for a user.
   */
  async getLinkStatus(userId: string) {
    const profile = await this.playerService.findByUserId(userId);

    const base = {
      status: profile.riotLinkStatus || RiotLinkStatus.UNLINKED,
      riotGameName: profile.riotGameName || null,
      riotTagLine: profile.riotTagLine || null,
      riotRegion: profile.riotRegion || null,
      riotPuuid: profile.riotPuuid || null,
      originalIconId: profile.originalIconId || null,
    };

    let profileIconId: number | null = null;
    let riotAvatarUrl: string | null = null;

    if (
      profile.riotPuuid &&
      profile.riotRegion &&
      profile.riotLinkStatus === RiotLinkStatus.VERIFIED
    ) {
      profileIconId = await this.tryGetSummonerProfileIconId(
        profile.riotPuuid,
        profile.riotRegion as RiotRegion,
      );
      riotAvatarUrl = await buildRiotAvatarUrl(profileIconId);
    }

    return {
      ...base,
      profileIconId,
      riotAvatarUrl,
    };
  }

  private async tryGetSummonerProfileIconId(
    puuid: string,
    region: RiotRegion,
  ): Promise<number | null> {
    try {
      const summoner = await this.getSummonerByPuuid(puuid, region);
      return summoner.profileIconId ?? null;
    } catch (e: any) {
      console.warn(
        '[RiotApiService] summoner-v4 failed for link-status avatar:',
        e?.message || e,
      );
      return null;
    }
  }

  /**
   * Disconnect / unlink the Riot account from the player profile.
   */
  async disconnectAccount(userId: string) {
    await this.playerService.update(userId, {
      riotPuuid: null,
      riotGameName: null,
      riotTagLine: null,
      riotRegion: null,
      riotAccountId: null,
      originalIconId: null,
      riotLinkStatus: RiotLinkStatus.UNLINKED,
    } as any);

    return { message: 'Game account disconnected successfully.' };
  }
}
