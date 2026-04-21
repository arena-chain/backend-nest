// src/friendship/friendship.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FriendshipService } from './friendship.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';

@ApiTags('Friendship')
@Controller('friendship')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is fully implemented
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Post('send-request')
  @ApiOperation({ summary: 'Send a friend request' })
  @ApiResponse({ status: 201, description: 'Friend request sent successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data or already friends',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Friend request already exists',
  })
  async sendFriendRequest(@Body() dto: SendFriendRequestDto) {
    return this.friendshipService.sendFriendRequest(
      dto.requesterId,
      dto.recipientId,
    );
  }

  @Post('accept/:friendshipId')
  @ApiOperation({ summary: 'Accept a friend request' })
  @ApiParam({ name: 'friendshipId', description: 'Friendship ID' })
  @ApiResponse({ status: 200, description: 'Friend request accepted' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async acceptFriendRequest(
    @Param('friendshipId') friendshipId: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendshipService.acceptFriendRequest(dto.userId, friendshipId);
  }

  @Post('reject/:friendshipId')
  @ApiOperation({ summary: 'Reject a friend request' })
  @ApiParam({ name: 'friendshipId', description: 'Friendship ID' })
  @ApiResponse({ status: 200, description: 'Friend request rejected' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async rejectFriendRequest(
    @Param('friendshipId') friendshipId: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendshipService.rejectFriendRequest(dto.userId, friendshipId);
  }

  @Delete('remove')
  @ApiOperation({ summary: 'Remove a friend (unfriend)' })
  @ApiResponse({ status: 200, description: 'Friend removed successfully' })
  @ApiResponse({ status: 404, description: 'Friendship not found' })
  @HttpCode(HttpStatus.OK)
  async removeFriend(
    @Body('userId') userId: string,
    @Body('friendId') friendId: string,
  ) {
    await this.friendshipService.removeFriend(userId, friendId);
    return { message: 'Friend removed successfully' };
  }

  @Post('block')
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked successfully' })
  async blockUser(
    @Body('userId') userId: string,
    @Body('blockedUserId') blockedUserId: string,
  ) {
    return this.friendshipService.blockUser(userId, blockedUserId);
  }

  @Delete('unblock')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  @ApiResponse({ status: 404, description: 'Blocked relationship not found' })
  @HttpCode(HttpStatus.OK)
  async unblockUser(
    @Body('userId') userId: string,
    @Body('blockedUserId') blockedUserId: string,
  ) {
    await this.friendshipService.unblockUser(userId, blockedUserId);
    return { message: 'User unblocked successfully' };
  }

  @Get('friends/:userId')
  @ApiOperation({ summary: 'Get all friends of a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of friends with populated user data',
  })
  async getFriends(@Param('userId') userId: string) {
    return this.friendshipService.getFriends(userId);
  }

  @Get('pending-requests/:userId')
  @ApiOperation({ summary: 'Get pending friend requests received by user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns list of pending requests' })
  async getPendingRequests(@Param('userId') userId: string) {
    return this.friendshipService.getPendingRequests(userId);
  }

  @Get('sent-requests/:userId')
  @ApiOperation({ summary: 'Get friend requests sent by user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns list of sent requests' })
  async getSentRequests(@Param('userId') userId: string) {
    return this.friendshipService.getSentRequests(userId);
  }

  @Get('blocked/:userId')
  @ApiOperation({ summary: 'Get blocked users' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns list of blocked users' })
  async getBlockedUsers(@Param('userId') userId: string) {
    return this.friendshipService.getBlockedUsers(userId);
  }

  @Get('are-friends/:userId1/:userId2')
  @ApiOperation({ summary: 'Check if two users are friends' })
  @ApiParam({ name: 'userId1', description: 'First User ID' })
  @ApiParam({ name: 'userId2', description: 'Second User ID' })
  @ApiResponse({ status: 200, description: 'Returns friendship status' })
  async areFriends(
    @Param('userId1') userId1: string,
    @Param('userId2') userId2: string,
  ) {
    const areFriends = await this.friendshipService.areFriends(
      userId1,
      userId2,
    );
    return { areFriends };
  }

  @Get('status/:userId1/:userId2')
  @ApiOperation({ summary: 'Get friendship status between two users' })
  @ApiParam({ name: 'userId1', description: 'First User ID' })
  @ApiParam({ name: 'userId2', description: 'Second User ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns status: NONE, PENDING, ACCEPTED, REJECTED, BLOCKED',
  })
  async getFriendshipStatus(
    @Param('userId1') userId1: string,
    @Param('userId2') userId2: string,
  ) {
    const status = await this.friendshipService.getFriendshipStatus(
      userId1,
      userId2,
    );
    return { status };
  }
}
