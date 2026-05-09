import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { LigueService } from './ligue.service';
import { CreateLigueDto } from './dto/create-ligue.dto';
import { UpdateLigueDto } from './dto/update-ligue.dto';

@ApiTags('ligues')
@Controller('ligues')
export class LigueController {
  constructor(private readonly ligueService: LigueService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ligue' })
  @ApiResponse({
    status: 201,
    description: 'The ligue has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createLigueDto: CreateLigueDto) {
    return this.ligueService.create(createLigueDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ligues' })
  @ApiResponse({ status: 200, description: 'Return all ligues.' })
  findAll() {
    return this.ligueService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ligue by ID' })
  @ApiParam({ name: 'id', description: 'Ligue ID' })
  @ApiResponse({ status: 200, description: 'Return the ligue.' })
  @ApiResponse({ status: 404, description: 'Ligue not found.' })
  findOne(@Param('id') id: string) {
    return this.ligueService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ligue' })
  @ApiParam({ name: 'id', description: 'Ligue ID' })
  @ApiResponse({
    status: 200,
    description: 'The ligue has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Ligue not found.' })
  update(@Param('id') id: string, @Body() updateLigueDto: UpdateLigueDto) {
    return this.ligueService.update(id, updateLigueDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ligue' })
  @ApiParam({ name: 'id', description: 'Ligue ID' })
  @ApiResponse({
    status: 200,
    description: 'The ligue has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Ligue not found.' })
  remove(@Param('id') id: string) {
    return this.ligueService.remove(id);
  }
}
