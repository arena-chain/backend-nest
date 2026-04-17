import { Module } from '@nestjs/common';
import { NftModule } from '../nft/nft.module';
import { CurrencyController } from './currency.controller';

@Module({
    imports: [NftModule],
    controllers: [CurrencyController],
})
export class CurrencyModule {}
