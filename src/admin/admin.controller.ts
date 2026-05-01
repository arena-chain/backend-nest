import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UsersService } from '../user/user.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Types } from 'mongoose';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { CreateCheckInAgentDto } from './dto/create-check-in-agent.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  @Get('users/reported')
  @ApiOperation({ summary: 'Get all reported users (admin view)' })
  @ApiResponse({
    status: 200,
    description:
      'Returns users with at least one report, sorted by report count',
  })
  getReportedUsers() {
    return this.usersService.getReportedUsers();
  }

  @Get()
  @ApiOperation({ summary: 'Get all admins' })
  @ApiResponse({ status: 200, description: 'Return all admins' })
  findAll() {
    return this.adminService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create an admin profile' })
  @ApiResponse({
    status: 201,
    description: 'Admin profile created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  create(
    @Body() createAdminDto: CreateAdminDto,
    @Body('userId') userId: string,
  ) {
    return this.adminService.create(new Types.ObjectId(userId), createAdminDto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get admin profile by user ID' })
  @ApiResponse({ status: 200, description: 'Admin profile found' })
  @ApiResponse({ status: 404, description: 'Admin profile not found' })
  findByUserId(@Param('userId') userId: string) {
    return this.adminService.findByUserId(userId);
  }

  @Post('check-in-agents')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a check-in agent account (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Check-in agent account created successfully',
  })
  createCheckInAgent(@Body() dto: CreateCheckInAgentDto) {
    return this.adminService.createCheckInAgent(dto);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update admin profile' })
  @ApiResponse({
    status: 200,
    description: 'Admin profile updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Admin profile not found' })
  update(
    @Param('userId') userId: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    return this.adminService.update(userId, updateAdminDto);
  }
}
