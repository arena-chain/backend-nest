import {
    Controller, Get, Post, Body, Param, Delete, Put, Req,
    UseGuards, HttpCode,
} from '@nestjs/common';
import { MissionService } from './mission.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mission')
export class MissionController {
    constructor(private readonly missionService: MissionService) {}

    // ── Player endpoints (JWT) ─────────────────────────────────

    @UseGuards(JwtAuthGuard)
    @Get('active')
    getActiveMissions(@Req() req) {
        return this.missionService.getActiveMissionsForUser(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('active-count')
    async getActiveCount(@Req() req) {
        const count = await this.missionService.getActiveCount(req.user.userId);
        return { count };
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/progress')
    @HttpCode(200)
    incrementProgress(
        @Req() req,
        @Param('id') id: string,
        @Body('amount') amount?: number,
    ) {
        return this.missionService.incrementProgress(req.user.userId, id, amount || 1);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/claim')
    @HttpCode(200)
    claimReward(@Req() req, @Param('id') id: string) {
        return this.missionService.claimReward(req.user.userId, id);
    }

    // ── Seed ───────────────────────────────────────────────────

    @Post('seed')
    @HttpCode(200)
    seed() {
        return this.missionService.seed();
    }

    // ── Admin CRUD ─────────────────────────────────────────────

    @Post()
    create(@Body() dto: CreateMissionDto) {
        return this.missionService.create(dto);
    }

    @Get()
    findAll() {
        return this.missionService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.missionService.findOne(id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateMissionDto) {
        return this.missionService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.missionService.remove(id);
    }
}
