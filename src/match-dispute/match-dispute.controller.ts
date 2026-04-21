import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { MatchDisputeService } from './match-dispute.service';
import {
  CreateMatchDisputeDto,
  ResolveDisputeDto,
} from './dto/create-match-dispute.dto';
import { DisputeStatus } from './schemas/match-dispute.schema';

@Controller('match-disputes')
export class MatchDisputeController {
  constructor(private readonly disputeService: MatchDisputeService) {}

  @Post()
  submit(@Body() dto: CreateMatchDisputeDto) {
    return this.disputeService.submit(dto);
  }

  @Get('pending')
  findPending() {
    return this.disputeService.findPending();
  }

  @Get('by-match/:matchId')
  findByMatch(@Param('matchId') matchId: string) {
    return this.disputeService.findByMatch(matchId);
  }

  @Get('by-season')
  findBySeason(
    @Query('seasonId') seasonId: string,
    @Query('status') status?: DisputeStatus,
  ) {
    return this.disputeService.findBySeason(seasonId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.disputeService.findOne(id);
  }

  @Patch(':id/review')
  markUnderReview(@Param('id') id: string) {
    return this.disputeService.markUnderReview(id);
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputeService.resolve(id, dto);
  }
}
