import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HighlightsService } from './highlights.service';
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { UpdateHighlightDto } from './dto/update-highlight.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Highlights')
@Controller('highlights')
export class HighlightsController {
  constructor(private readonly highlightsService: HighlightsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new highlight' })
  @ApiResponse({ status: 201, description: 'The highlight has been successfully created.' })
  create(@Body() createHighlightDto: CreateHighlightDto) {
    return this.highlightsService.create(createHighlightDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all highlights' })
  findAll() {
    return this.highlightsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a highlight by ID' })
  findOne(@Param('id') id: string) {
    return this.highlightsService.findOne(id);
  }

  @Get('video/:videoId')
  @ApiOperation({ summary: 'Get highlights for a specific video' })
  findByVideo(@Param('videoId') videoId: string) {
    return this.highlightsService.findByVideo(videoId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a highlight' })
  update(@Param('id') id: string, @Body() updateHighlightDto: UpdateHighlightDto) {
    return this.highlightsService.update(id, updateHighlightDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a highlight' })
  remove(@Param('id') id: string) {
    return this.highlightsService.remove(id);
  }
}
