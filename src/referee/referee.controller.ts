import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RefereeService } from './referee.service';
import { CreateRefereeDto } from './dto/create-referee.dto';
import { UpdateRefereeDto } from './dto/update-referee.dto';
import { Types } from 'mongoose';

@ApiTags('referee')
@Controller('referee')
export class RefereeController {
    constructor(private readonly refereeService: RefereeService) { }

    @Get()
    @ApiOperation({ summary: 'Get all referee profiles' })
    @ApiResponse({ status: 200, description: 'Return all referee profiles' })
    findAll() {
        return this.refereeService.findAll();
    }

    @Post()
    @ApiOperation({ summary: 'Create a referee profile' })
    @ApiResponse({ status: 201, description: 'Referee profile created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data' })
    create(@Body() createRefereeDto: CreateRefereeDto, @Body('userId') userId: string) {
        return this.refereeService.create(new Types.ObjectId(userId), createRefereeDto);
    }

    @Get(':userId')
    @ApiOperation({ summary: 'Get referee profile by user ID' })
    @ApiResponse({ status: 200, description: 'Referee profile found' })
    @ApiResponse({ status: 404, description: 'Referee profile not found' })
    findByUserId(@Param('userId') userId: string) {
        return this.refereeService.findByUserId(userId);
    }

    @Patch(':userId')
    @ApiOperation({ summary: 'Update referee profile' })
    @ApiResponse({ status: 200, description: 'Referee profile updated successfully' })
    @ApiResponse({ status: 404, description: 'Referee profile not found' })
    update(@Param('userId') userId: string, @Body() updateRefereeDto: UpdateRefereeDto) {
        return this.refereeService.update(userId, updateRefereeDto);
    }
}
