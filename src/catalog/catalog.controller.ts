import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { imageUploadOptions } from 'src/common/utils/file-upload.utils';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new catalog item', description: 'Add a new game to the catalog with optional cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'genre'],
      properties: {
        title: { type: 'string', example: 'League of Legends' },
        description: { type: 'string', example: 'A 5v5 team-based strategy game' },
        genre: { type: 'string', example: 'MOBA' },
        publisher: { type: 'string', example: 'Riot Games' },
        platforms: { type: 'array', items: { type: 'string' }, example: ['PC'] },
        isActive: { type: 'boolean', example: true },
        releaseDate: { type: 'string', format: 'date', example: '2009-10-27' },
        file: { type: 'string', format: 'binary', description: 'Cover image file (JPG, JPEG, PNG, GIF)' },
        metadata: { type: 'object', example: { gameEngine: 'Custom' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Catalog item created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  create(@Body() createCatalogDto: CreateCatalogDto, @UploadedFile() file: Express.Multer.File) {
    if (file) {
      createCatalogDto.coverImageUrl = `/uploads/${file.filename}`;
    }
    return this.catalogService.create(createCatalogDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all catalog items', description: 'Retrieve all games in the catalog' })
  @ApiResponse({ status: 200, description: 'List of all catalog items' })
  findAll() {
    return this.catalogService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a catalog item by ID', description: 'Retrieve a specific game from the catalog' })
  @ApiParam({ name: 'id', description: 'Catalog item ID' })
  @ApiResponse({ status: 200, description: 'Catalog item found' })
  @ApiResponse({ status: 404, description: 'Catalog item not found' })
  findOne(@Param('id') id: string) {
    return this.catalogService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a catalog item', description: 'Update an existing game in the catalog with optional new cover image' })
  @ApiParam({ name: 'id', description: 'Catalog item ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'League of Legends' },
        description: { type: 'string', example: 'A 5v5 team-based strategy game' },
        genre: { type: 'string', example: 'MOBA' },
        publisher: { type: 'string', example: 'Riot Games' },
        platforms: { type: 'array', items: { type: 'string' }, example: ['PC'] },
        isActive: { type: 'boolean', example: true },
        releaseDate: { type: 'string', format: 'date', example: '2009-10-27' },
        file: { type: 'string', format: 'binary', description: 'Cover image file (JPG, JPEG, PNG, GIF)' },
        metadata: { type: 'object', example: { gameEngine: 'Custom' } },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Catalog item updated successfully' })
  @ApiResponse({ status: 404, description: 'Catalog item not found' })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  update(@Param('id') id: string, @Body() updateCatalogDto: UpdateCatalogDto, @UploadedFile() file: Express.Multer.File) {
    if (file) {
      updateCatalogDto.coverImageUrl = `/uploads/${file.filename}`;
    }
    return this.catalogService.update(id, updateCatalogDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a catalog item', description: 'Remove a game from the catalog' })
  @ApiParam({ name: 'id', description: 'Catalog item ID' })
  @ApiResponse({ status: 200, description: 'Catalog item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Catalog item not found' })
  remove(@Param('id') id: string) {
    return this.catalogService.remove(id);
  }
}
