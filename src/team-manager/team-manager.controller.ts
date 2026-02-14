import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TeamManagerService } from './team-manager.service';
import { CreateTeamManagerDto } from './dto/create-team-manager.dto';
import { UpdateTeamManagerDto } from './dto/update-team-manager.dto';
import { Types } from 'mongoose';

@ApiTags('team-manager')
@Controller('team-manager')
export class TeamManagerController {
    constructor(private readonly teamManagerService: TeamManagerService) { }

    @Get()
    @ApiOperation({ summary: 'Get all team manager profiles' })
    @ApiResponse({ status: 200, description: 'Return all team manager profiles' })
    findAll() {
        return this.teamManagerService.findAll();
    }

    @Post()
    @ApiOperation({ summary: 'Create a team manager profile' })
    @ApiResponse({ status: 201, description: 'Team manager profile created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data' })
    create(@Body() createTeamManagerDto: CreateTeamManagerDto, @Body('userId') userId: string) {
        return this.teamManagerService.create(new Types.ObjectId(userId), createTeamManagerDto);
    }

    @Get(':userId')
    @ApiOperation({ summary: 'Get team manager profile by user ID' })
    @ApiResponse({ status: 200, description: 'Team manager profile found' })
    @ApiResponse({ status: 404, description: 'Team manager profile not found' })
    findByUserId(@Param('userId') userId: string) {
        return this.teamManagerService.findByUserId(userId);
    }

    @Patch(':userId')
    @ApiOperation({ summary: 'Update team manager profile' })
    @ApiResponse({ status: 200, description: 'Team manager profile updated successfully' })
    @ApiResponse({ status: 404, description: 'Team manager profile not found' })
    update(@Param('userId') userId: string, @Body() updateTeamManagerDto: UpdateTeamManagerDto) {
        return this.teamManagerService.update(userId, updateTeamManagerDto);
    }
}
