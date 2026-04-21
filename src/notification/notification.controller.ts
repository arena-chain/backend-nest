import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  NotificationPreferencesDto,
  RegisterDeviceTokenDto,
} from './dto/notification-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationsGateway,
  ) {}

  // ─── Internal: create a notification (called by other services/admin) ──
  @Post()
  async create(@Body() dto: CreateNotificationDto) {
    const notif = await this.notificationService.createForUser(dto);
    if (notif) {
      // Push real-time event to user's browser/desktop
      this.gateway.emitToUser(dto.userId, notif);
    }
    return notif;
  }

  // ─── List current user's notifications ─────────────────────────────────
  @Get()
  findAll(
    @Req() req: { user: { userId: string } },
    @Query('archived') archived?: string,
  ) {
    return this.notificationService.findAllForUser(
      req.user.userId,
      archived === 'true',
    );
  }

  // ─── Unread count ───────────────────────────────────────────────────────
  @Get('unread-count')
  getUnreadCount(@Req() req: { user: { userId: string } }) {
    return this.notificationService.getUnreadCount(req.user.userId);
  }

  // ─── Preferences ────────────────────────────────────────────────────────
  @Get('preferences')
  getPreferences(@Req() req: { user: { userId: string } }) {
    return this.notificationService.getPreferences(req.user.userId);
  }

  @Patch('preferences')
  savePreferences(
    @Req() req: { user: { userId: string } },
    @Body() dto: NotificationPreferencesDto,
  ) {
    return this.notificationService.savePreferences(req.user.userId, dto);
  }

  // ─── Device Token (NOTIF-103) ───────────────────────────────────────────
  @Post('device-token')
  registerDeviceToken(
    @Req() req: { user: { userId: string } },
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.notificationService.registerDeviceToken(req.user.userId, dto);
  }

  // ─── Mark as read ────────────────────────────────────────────────────────
  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: { user: { userId: string } }) {
    return this.notificationService.markAllAsRead(req.user.userId);
  }

  // ─── Delete ──────────────────────────────────────────────────────────────
  @Delete('clear-all')
  clearAll(@Req() req: { user: { userId: string } }) {
    return this.notificationService.clearAll(req.user.userId);
  }

  @Delete(':id')
  deleteOne(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.notificationService.deleteOne(id, req.user.userId);
  }
}
