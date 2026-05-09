import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TradingService } from './trading.service';
import { OrderSide, OrderType } from './schemas/order.schema';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('trading')
@Controller('trading')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Get('assets')
  @ApiOperation({ summary: 'Get all tradeable assets' })
  async getAssets() {
    // This would ideally be in a service, but for now we can use the model directly or add to service
    // Let's assume we add a method to service
    return this.tradingService.getAllAssets();
  }

  @Get('assets/:id')
  @ApiOperation({ summary: 'Get asset details and order book' })
  async getAssetDetails(@Param('id') id: string) {
    return this.tradingService.getAssetDetails(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('order')
  @ApiOperation({ summary: 'Place a new buy or sell order' })
  async placeOrder(
    @Req() req: any,
    @Body()
    body: {
      assetId: string;
      side: OrderSide;
      type: OrderType;
      price: number;
      amount: number;
    },
  ) {
    return this.tradingService.placeOrder(
      req.user.userId,
      body.assetId,
      body.side,
      body.type,
      body.price,
      body.amount,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('portfolio')
  @ApiOperation({ summary: 'Get current user portfolio and active orders' })
  async getPortfolio(@Req() req: any) {
    return this.tradingService.getUserPortfolio(req.user.userId);
  }
}
