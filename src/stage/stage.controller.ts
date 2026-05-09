import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { StageService } from './stage.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Controller('stages')
export class StageController {
  constructor(private readonly stageService: StageService) {}

  @Post()
  create(@Body() dto: CreateStageDto) {
    return this.stageService.create(dto);
  }

  @Get()
  findAll(
    @Query('seasonId') seasonId?: string,
    @Query('leagueId') leagueId?: string,
  ) {
    return this.stageService.findAll(seasonId, leagueId);
  }

  @Get('by-season/:seasonId')
  findBySeason(@Param('seasonId') seasonId: string) {
    return this.stageService.findBySeason(seasonId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stageService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.stageService.update(id, dto);
  }

  @Patch(':id/bracket')
  linkBracket(@Param('id') id: string, @Body() body: { bracketId: string }) {
    return this.stageService.linkBracket(id, body.bracketId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.stageService.updateStatus(id, body.status as any);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stageService.remove(id);
  }
}
