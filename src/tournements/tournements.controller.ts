import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { TournementsService } from './tournements.service';
import { CreateTournementDto } from './dto/create-tournement.dto';
import { UpdateTournementDto } from './dto/update-tournement.dto';
import { imageUploadOptions } from 'src/common/utils/file-upload.utils';

@ApiTags('Tournaments')
@Controller('tournements')
export class TournementsController {
  constructor(private readonly tournementsService: TournementsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new tournament' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Tournament created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  create(@Body() createTournementDto: CreateTournementDto, @UploadedFile() file: Express.Multer.File) {
    if (file) {
      createTournementDto.bannerImageUrl = `/uploads/${file.filename}`;
    }
    return this.tournementsService.create(createTournementDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tournaments' })
  @ApiResponse({ status: 200, description: 'Returns all tournaments' })
  findAll() {
    return this.tournementsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tournament by ID' })
  @ApiParam({ name: 'id', description: 'Tournament ID' })
  @ApiResponse({ status: 200, description: 'Returns tournament details' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  findOne(@Param('id') id: string) {
    return this.tournementsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tournament' })
  @ApiParam({ name: 'id', description: 'Tournament ID' })
  @ApiResponse({ status: 200, description: 'Tournament updated successfully' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  update(@Param('id') id: string, @Body() updateTournementDto: UpdateTournementDto) {
    return this.tournementsService.update(id, updateTournementDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tournament' })
  @ApiParam({ name: 'id', description: 'Tournament ID' })
  @ApiResponse({ status: 200, description: 'Tournament deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.tournementsService.remove(id);
  }

  // Team Management Endpoints
  @Post(':id/register-team')
  @ApiOperation({ summary: 'Register a team for the tournament' })
  @ApiParam({ name: 'id', description: 'Tournament ID' })
  @ApiResponse({ status: 200, description: 'Team registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Registration closed or tournament full' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  registerTeam(@Param('id') id: string, @Body('teamId') teamId: string) {
    return this.tournementsService.registerTeam(id, teamId);
  }

  @Delete(':id/unregister-team/:teamId')
  @ApiOperation({ summary: 'Unregister a team from the tournament' })
  @ApiParam({ name: 'id', description: 'Tournament ID' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Team unregistered successfully' })
  @ApiResponse({ status: 404, description: 'Tournament or team not found' })
  @HttpCode(HttpStatus.OK)
  unregisterTeam(@Param('id') id: string, @Param('teamId') teamId: string) {
    return this.tournementsService.unregisterTeam(id, teamId);
  }

  // Phase Management Endpoints
  @Patch(':id/phases/:phaseName')
  @ApiOperation({ summary: 'Update phase status' })
  @ApiParam({ name: 'id', description: 'Tournament ID' })
  @ApiParam({ name: 'phaseName', description: 'Phase name (e.g., QUARTERFINALS)' })
  @ApiResponse({ status: 200, description: 'Phase updated successfully' })
  @ApiResponse({ status: 404, description: 'Tournament or phase not found' })
  updatePhaseStatus(
    @Param('id') id: string,
    @Param('phaseName') phaseName: string,
    @Body('status') status: string,
  ) {
    return this.tournementsService.updatePhaseStatus(id, phaseName, status);
  }

  @Post(':id/phases')
  @ApiOperation({ summary: 'Add a new phase to the tournament' })
  @ApiParam({ name: 'id', description: 'Tournament ID' })
  @ApiResponse({ status: 200, description: 'Phase added successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Phase already exists' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  addPhase(
    @Param('id') id: string,
    @Body() phaseData: { name: string; startDate?: Date; endDate?: Date },
  ) {
    return this.tournementsService.addPhase(id, phaseData);
  }
}

