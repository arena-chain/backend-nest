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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MatchmakingService } from './matchmaking.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { RespondMatchDto } from './dto/respond-match.dto';

@Controller('matchmaking')
@UseGuards(JwtAuthGuard)
export class MatchmakingController {
    constructor(private readonly matchmakingService: MatchmakingService) {}

    @Post('queue')
    async joinQueue(@Req() req, @Body() dto: JoinQueueDto) {
        const userId = req.user.userId;
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
        const game = await this.matchmakingService.respondToMatch(
            gameId,
            userId,
            dto.accept,
        );
        return game;
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
}
