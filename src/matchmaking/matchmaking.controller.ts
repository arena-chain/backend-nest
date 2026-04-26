import {
    Controller,
    Post,
    Delete,
    Get,
    Param,
    Body,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
    Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MatchmakingService } from './matchmaking.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { RespondMatchDto } from './dto/respond-match.dto';
import { CompleteMatchDto } from './dto/complete-match.dto';
import { SteamVerificationGuard } from '../steam/guards/steam-verification.guard';

@Controller('matchmaking')
@UseGuards(JwtAuthGuard)
export class MatchmakingController {
    constructor(private readonly matchmakingService: MatchmakingService) {}

    @Post('queue')
    @UseGuards(SteamVerificationGuard)
    async joinQueue(@Req() req, @Body() dto: JoinQueueDto) {
        const userId = req.user.userId;
        console.log(`[Matchmaking] User ${userId} joining queue for game: ${dto.game}`);
        const ticket = await this.matchmakingService.joinQueue(userId, dto);
        return {
            id: ticket._id,
            game: ticket.game,
            mode: ticket.mode,
            server: ticket.server,
            region: ticket.region,
            elo: ticket.elo,
            status: ticket.status,
            scheduledAt: ticket.scheduledAt ?? null,
        };
    }

    @Delete('queue/:ticketId')
    @HttpCode(HttpStatus.OK)
    async cancelQueue(@Req() req, @Param('ticketId') ticketId: string) {
        const userId = req.user.userId;
        await this.matchmakingService.cancelQueue(ticketId, userId);
        return { message: 'Queue cancelled' };
    }

    @Post('games/:gameId/response')
    async respondToMatch(
        @Req() req,
        @Param('gameId') gameId: string,
        @Body() dto: RespondMatchDto,
    ) {
        const userId = req.user.userId;
        return this.matchmakingService.respondToMatch(
            gameId,
            userId,
            dto.accept,
        );
    }

    @Post('games/:gameId/complete')
    async completeMatch(
        @Param('gameId') gameId: string,
        @Body() dto: CompleteMatchDto,
    ) {
        return this.matchmakingService.completeMatch(gameId, dto.winningTeam);
    }

    @Post('games/:gameId/acknowledge')
    async acknowledgeGame(@Req() req, @Param('gameId') gameId: string) {
        const userId = req.user.userId;
        return this.matchmakingService.acknowledgeGame(gameId, userId);
    }

    @Get('games/:gameId')
    async getGame(@Param('gameId') gameId: string) {
        return this.matchmakingService.getGame(gameId);
    }

    @Get('my-active-ticket')
    async getActiveTicket(@Req() req) {
        const userId = req.user.userId;
        const ticket = await this.matchmakingService.getActiveTicket(userId);
        if (!ticket) {
            return { ticket: null };
        }
        return {
            ticket: {
                id: ticket._id,
                game: ticket.game,
                mode: ticket.mode,
                server: ticket.server,
                region: ticket.region,
                elo: ticket.elo,
                status: ticket.status,
                gameId: ticket.gameId,
                scheduledAt: ticket.scheduledAt ?? null,
            },
        };
    }

    @Get('my-active-game')
    async getActiveGame(@Req() req) {
        const userId = req.user.userId;
        const game = await this.matchmakingService.getActiveGame(userId);
        if (!game) {
            return { game: null };
        }
        return { game };
    }

    @Get('my-scheduled-tickets')
    async getScheduledTickets(@Req() req) {
        const userId = req.user.userId;
        const tickets = await this.matchmakingService.getScheduledTickets(userId);
        return {
            tickets: tickets.map((t) => ({
                id: t._id,
                game: t.game,
                mode: t.mode,
                server: t.server,
                region: t.region,
                elo: t.elo,
                status: t.status,
                scheduledAt: t.scheduledAt ?? null,
            })),
        };
    }
    @Patch('games/:gameId/lobby')
    async updateLobby(
        @Param('gameId') gameId: string,
        @Body('lobbyId') lobbyId: string,
    ) {
        return this.matchmakingService.updateLobbyId(gameId, lobbyId);
    }
}
