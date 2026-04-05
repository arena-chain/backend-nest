import { Controller, Get, Post, Patch, Delete, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
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

    // IMPORTANT: Static routes MUST come before dynamic :id routes
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

    @Get('reported')
    @ApiOperation({ summary: 'Get all reported users' })
    @ApiResponse({ status: 200, description: 'Returns users with at least one report' })
    getReportedUsers() {
        return this.usersService.getReportedUsers();
    }

    @Get('reports')
    @ApiOperation({ summary: 'Get all reported users (alias)' })
    @ApiResponse({ status: 200, description: 'Returns users with at least one report' })
    getReports() {
        return this.usersService.getReportedUsers();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a user by ID' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'Return the user' })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Post(':id/report')
    @ApiOperation({ summary: 'Report a user' })
    @ApiParam({ name: 'id', description: 'Target user ID' })
    @ApiResponse({ status: 201, description: 'User reported successfully' })
    reportUser(
        @Param('id') id: string,
        @Body('reportedBy') reportedBy: string,
        @Body('reason') reason: string,
    ) {
        return this.usersService.reportUser(id, reportedBy, reason);
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
