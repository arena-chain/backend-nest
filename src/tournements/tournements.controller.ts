import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TournementsService } from './tournements.service';
import { CreateTournementDto } from './dto/create-tournement.dto';
import { UpdateTournementDto } from './dto/update-tournement.dto';

@Controller('tournements')
export class TournementsController {
  constructor(private readonly tournementsService: TournementsService) {}

  @Post()
  create(@Body() createTournementDto: CreateTournementDto) {
    return this.tournementsService.create(createTournementDto);
  }

  @Get()
  findAll() {
    return this.tournementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tournementsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTournementDto: UpdateTournementDto) {
    return this.tournementsService.update(+id, updateTournementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tournementsService.remove(+id);
  }
}
