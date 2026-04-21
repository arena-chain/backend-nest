import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RoundService } from './round.service';
import { CreateRoundDto, GenerateRoundsDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';

@Controller('rounds')
export class RoundController {
  constructor(private readonly roundService: RoundService) {}

  @Post()
  create(@Body() dto: CreateRoundDto) {
    return this.roundService.create(dto);
  }

  @Post('generate')
  generateRounds(@Body() dto: GenerateRoundsDto) {
    return this.roundService.generateRounds(dto);
  }

  @Get()
  findAll(
    @Query('seasonId') seasonId?: string,
    @Query('stageId') stageId?: string,
  ) {
    if (seasonId) return this.roundService.findBySeason(seasonId, stageId);
    if (stageId) return this.roundService.findByStage(stageId);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roundService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoundDto) {
    return this.roundService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roundService.remove(id);
  }
}
