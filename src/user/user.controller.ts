import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './user.service';
import { User } from './schemas/user.schema';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'Return all users' })
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'Return user' })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Patch(':id/block')
    @ApiOperation({ summary: 'Block a user' })
    @ApiResponse({ status: 200, description: 'User blocked' })
    block(@Param('id') id: string) {
        return this.usersService.update(id, { isActive: false });
    }

    @Patch(':id/unblock')
    @ApiOperation({ summary: 'Unblock a user' })
    @ApiResponse({ status: 200, description: 'User unblocked' })
    unblock(@Param('id') id: string) {
        return this.usersService.update(id, { isActive: true });
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a user' })
    @ApiResponse({ status: 200, description: 'User deleted' })
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
