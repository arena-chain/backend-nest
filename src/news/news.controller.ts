import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsAgentService } from './news-agent.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly newsAgentService: NewsAgentService,
  ) {}

  @Post('fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger news agent to fetch latest articles (Admin)',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async triggerFetch() {
    await this.newsAgentService.fetchAndPublish();
    return { message: 'Fetch cycle triggered successfully' };
  }

  @Post()
  @ApiOperation({ summary: 'Create news article (Admin or Agent)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // We can add an AGENT role later if needed
  create(@Body() createNewsDto: CreateNewsDto) {
    return this.newsService.create(createNewsDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all news articles with filtering' })
  findAll(
    @Query('game') game?: string,
    @Query('category') category?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.newsService.findAll({
      game,
      category,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get a single news article by ID or Slug' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.newsService.findOne(idOrSlug);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update news article (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateNewsDto: UpdateNewsDto) {
    return this.newsService.update(id, updateNewsDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete news article (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
