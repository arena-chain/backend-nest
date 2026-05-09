import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PartnershipsService } from './partnerships.service';
import { CreatePartnershipDto } from './dto/create-partnership.dto';
import { UpdatePartnershipDto } from './dto/update-partnership.dto';

@Controller('partnerships')
export class PartnershipsController {
  constructor(private readonly partnershipsService: PartnershipsService) {}

  @Post()
  create(@Body() createPartnershipDto: CreatePartnershipDto) {
    return this.partnershipsService.create(createPartnershipDto);
  }

  @Get()
  findAll() {
    return this.partnershipsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partnershipsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePartnershipDto: UpdatePartnershipDto,
  ) {
    return this.partnershipsService.update(id, updatePartnershipDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.partnershipsService.remove(id);
  }
}
