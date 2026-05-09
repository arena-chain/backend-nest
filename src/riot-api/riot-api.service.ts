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
