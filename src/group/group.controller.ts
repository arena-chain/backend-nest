import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import {
  UpdateGroupDto,
  AddTeamToGroupDto,
  RemoveTeamFromGroupDto,
  BulkAssignTeamsDto,
} from './dto/update-group.dto';

@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  create(@Body() dto: CreateGroupDto) {
    return this.groupService.create(dto);
  }

  @Get()
  findAll(
    @Query('stageId') stageId?: string,
    @Query('seasonId') seasonId?: string,
  ) {
    if (stageId) return this.groupService.findByStage(stageId);
    if (seasonId) return this.groupService.findBySeason(seasonId);
    return [];
  }

  @Get('by-stage/:stageId')
  findByStage(@Param('stageId') stageId: string) {
    return this.groupService.findByStage(stageId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupService.update(id, dto);
  }

  @Post(':id/teams')
  addTeam(@Param('id') id: string, @Body() body: AddTeamToGroupDto) {
    return this.groupService.addTeam(id, body.teamId);
  }

  @Delete(':id/teams')
  removeTeam(@Param('id') id: string, @Body() body: RemoveTeamFromGroupDto) {
    return this.groupService.removeTeam(id, body.teamId);
  }

  @Patch(':id/teams/bulk')
  bulkAssignTeams(@Param('id') id: string, @Body() body: BulkAssignTeamsDto) {
    return this.groupService.bulkAssignTeams(id, body.teamIds);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupService.remove(id);
  }
}
