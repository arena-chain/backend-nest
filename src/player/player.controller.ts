import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PlayerService } from './player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('player')
@Controller('player')
export class PlayerController {
    constructor(private readonly playerService: PlayerService) { }

    @Get()
    @ApiOperation({ summary: 'Discover player profiles with search and filters' })
    @ApiQuery({ name: 'query', required: false, description: 'Search by nickname' })
    @ApiQuery({ name: 'rank', required: false, description: 'Filter by rank' })
    @ApiQuery({ name: 'isPro', required: false, description: 'Filter by pro status' })
    @ApiResponse({ status: 200, description: 'Return matching player profiles' })
    findAll(
        @Query('query') query?: string,
        @Query('rank') rank?: string,
        @Query('isPro') isPro?: string,
    ) {
        return this.playerService.findAll({
            query,
            rank,
            isPro: isPro === 'true' ? true : isPro === 'false' ? false : undefined,
        });
    }

    @Post()
    @ApiOperation({ summary: 'Create a player profile' })
    @ApiResponse({ status: 201, description: 'Player profile created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data' })
    create(@Body() createPlayerDto: CreatePlayerDto, @Body('userId') userId: string) {
        return this.playerService.create(new Types.ObjectId(userId), createPlayerDto);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Current user player profile (creates default if missing)' })
    @ApiResponse({ status: 200, description: 'Player profile' })
    getMe(@Request() req: { user: { userId: string } }) {
        return this.playerService.findOrCreateByUserId(req.user.userId);
    }

    @Get(':userId')
    @ApiOperation({ summary: 'Get player profile by user ID' })
    @ApiResponse({ status: 200, description: 'Player profile found' })
    @ApiResponse({ status: 404, description: 'Player profile not found' })
    findByUserId(@Param('userId') userId: string) {
        return this.playerService.findByUserId(userId);
    }

    @Patch(':userId')
    @ApiOperation({ summary: 'Update player profile' })
    @ApiResponse({ status: 200, description: 'Player profile updated successfully' })
    @ApiResponse({ status: 404, description: 'Player profile not found' })
    update(@Param('userId') userId: string, @Body() updatePlayerDto: UpdatePlayerDto) {
        return this.playerService.update(userId, updatePlayerDto);
    }
}
