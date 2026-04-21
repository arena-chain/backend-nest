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
import { SeasonService } from './season.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';

@Controller('seasons')
export class SeasonController {
  constructor(private readonly seasonService: SeasonService) {}

  @Post()
  create(@Body() dto: CreateSeasonDto) {
    return this.seasonService.create(dto);
  }

  @Get()
  findAll(@Query('leagueId') leagueId?: string) {
    if (leagueId) return this.seasonService.findByLeague(leagueId);
    return this.seasonService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.seasonService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSeasonDto) {
    return this.seasonService.update(id, dto);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.seasonService.activate(id);
  }

  @Patch(':id/close')
  close(@Param('id') id: string) {
    return this.seasonService.close(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.seasonService.remove(id);
  }
}
