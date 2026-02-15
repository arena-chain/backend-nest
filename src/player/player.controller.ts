import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlayerService } from './player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { Types } from 'mongoose';

@ApiTags('player')
@Controller('player')
export class PlayerController {
    constructor(private readonly playerService: PlayerService) { }

    @Get()
    @ApiOperation({ summary: 'Get all players' })
    @ApiResponse({ status: 200, description: 'Return all players' })
    findAll() {
        return this.playerService.findAll();
    }

    @Post()
    @ApiOperation({ summary: 'Create a player profile' })
    @ApiResponse({ status: 201, description: 'Player profile created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data' })
    create(@Body() createPlayerDto: CreatePlayerDto, @Body('userId') userId: string) {
        return this.playerService.create(new Types.ObjectId(userId), createPlayerDto);
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
