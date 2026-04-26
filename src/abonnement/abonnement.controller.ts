import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AbonnementService } from './abonnement.service';
import { CreateAbonnementDto } from './dto/create-abonnement.dto';
import { UpdateAbonnementDto } from './dto/update-abonnement.dto';

@ApiTags('Subscription Plans')
@Controller('abonnements')
export class AbonnementController {
  constructor(private readonly abonnementService: AbonnementService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new subscription plan' })
  @ApiResponse({ status: 201, description: 'The subscription plan has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createAbonnementDto: CreateAbonnementDto) {
    return this.abonnementService.create(createAbonnementDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscription plans' })
  findAll() {
    return this.abonnementService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription plan by ID' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  findOne(@Param('id') id: string) {
    return this.abonnementService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  update(@Param('id') id: string, @Body() updateAbonnementDto: UpdateAbonnementDto) {
    return this.abonnementService.update(id, updateAbonnementDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subscription plan' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  remove(@Param('id') id: string) {
    return this.abonnementService.remove(id);
  }
}
