import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LigueService } from './ligue.service';
import { CreateLigueDto } from './dto/create-ligue.dto';
import { UpdateLigueDto } from './dto/update-ligue.dto';

@Controller('ligue')
export class LigueController {
  constructor(private readonly ligueService: LigueService) {}

  @Post()
  create(@Body() createLigueDto: CreateLigueDto) {
    return this.ligueService.create(createLigueDto);
  }

  @Get()
  findAll() {
    return this.ligueService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ligueService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLigueDto: UpdateLigueDto) {
    return this.ligueService.update(+id, updateLigueDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ligueService.remove(+id);
  }
}
