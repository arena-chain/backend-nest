import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NftModule } from '../nft/nft.module';
import { CurrencyController } from './currency.controller';
import { CurrencyPackController } from './currency-pack.controller';
import { CurrencyLedgerService } from './currency-ledger.service';
import { CurrencyPackService } from './currency-pack.service';
import { GameTokenLedgerEntry, GameTokenLedgerEntrySchema } from './schemas/game-token-ledger.schema';
import { CurrencyPack, CurrencyPackSchema } from './schemas/currency-pack.schema';
import { CurrencyPackPurchase, CurrencyPackPurchaseSchema } from './schemas/currency-pack-purchase.schema';

@Module({
    imports: [
        NftModule,
        MongooseModule.forFeature([
            { name: GameTokenLedgerEntry.name, schema: GameTokenLedgerEntrySchema },
            { name: CurrencyPack.name, schema: CurrencyPackSchema },
            { name: CurrencyPackPurchase.name, schema: CurrencyPackPurchaseSchema },
        ]),
    ],
    controllers: [CurrencyController, CurrencyPackController],
    providers: [CurrencyLedgerService, CurrencyPackService],
})
export class CurrencyModule {}
