import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Types } from 'mongoose';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get()
    @ApiOperation({ summary: 'Get all admin profiles' })
    @ApiResponse({ status: 200, description: 'Return all admin profiles' })
    findAll() {
        return this.adminService.findAll();
    }

    @Post()
    @ApiOperation({ summary: 'Create an admin profile' })
    @ApiResponse({ status: 201, description: 'Admin profile created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data' })
    create(@Body() createAdminDto: CreateAdminDto, @Body('userId') userId: string) {
        return this.adminService.create(new Types.ObjectId(userId), createAdminDto);
    }

    @Get(':userId')
    @ApiOperation({ summary: 'Get admin profile by user ID' })
    @ApiResponse({ status: 200, description: 'Admin profile found' })
    @ApiResponse({ status: 404, description: 'Admin profile not found' })
    findByUserId(@Param('userId') userId: string) {
        return this.adminService.findByUserId(userId);
    }

    @Patch(':userId')
    @ApiOperation({ summary: 'Update admin profile' })
    @ApiResponse({ status: 200, description: 'Admin profile updated successfully' })
    @ApiResponse({ status: 404, description: 'Admin profile not found' })
    update(@Param('userId') userId: string, @Body() updateAdminDto: UpdateAdminDto) {
        return this.adminService.update(userId, updateAdminDto);
    }
}
