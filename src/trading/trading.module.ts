import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TradingService } from './trading.service';
import { TradingGateway } from './trading.gateway';
import { TradingOrder, TradingOrderSchema } from './schemas/order.schema';
import { TradingTrade, TradingTradeSchema } from './schemas/trade.schema';
import { TradingAsset, TradingAssetSchema } from './schemas/asset.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { TradingSeedService } from './trading-seed.service';

import { TradingController } from './trading.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TradingOrder.name, schema: TradingOrderSchema },
      { name: TradingTrade.name, schema: TradingTradeSchema },
      { name: TradingAsset.name, schema: TradingAssetSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [TradingController],
  providers: [TradingService, TradingGateway, TradingSeedService],
  exports: [TradingService, TradingGateway],
})
export class TradingModule {}
