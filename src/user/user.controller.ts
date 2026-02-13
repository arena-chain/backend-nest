import { Controller, Get, Patch, Delete, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './user.service';

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

    @Get('search')
    @ApiOperation({ summary: 'Search users by nickname or email' })
    @ApiQuery({ name: 'q', description: 'Search query (nickname or email)', required: true })
    @ApiQuery({ name: 'excludeUserId', description: 'User ID to exclude from results', required: false })
    @ApiResponse({ status: 200, description: 'Returns matching users' })
    searchUsers(
        @Query('q') query: string,
        @Query('excludeUserId') excludeUserId?: string,
    ) {
        return this.usersService.searchUsers(query, excludeUserId);
    }

    @Patch(':id/block')
    @ApiOperation({ summary: 'Block a user' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User blocked successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    block(@Param('id') id: string) {
        return this.usersService.block(id);
    }

    @Patch(':id/unblock')
    @ApiOperation({ summary: 'Unblock a user' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User unblocked successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    unblock(@Param('id') id: string) {
        return this.usersService.unblock(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a user' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @HttpCode(HttpStatus.OK)
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
