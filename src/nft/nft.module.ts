import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Nft, NftSchema } from './schemas/nft.entity';
import { NftAttribute, NftAttributeSchema } from './schemas/nft-attribute.entity';
import { NftItem, NftItemSchema } from './schemas/nft-item.entity';
import { Inventory, InventorySchema } from './schemas/inventory.entity';
import { NftCollection, NftCollectionSchema } from './schemas/nft-collection.entity';
import { NftTransaction, NftTransactionSchema } from './schemas/nft-transaction.entity';
import { NftService } from './nft.service';
import { InventoryService } from './inventory.service';
import { BlockchainService } from './blockchain.service';
import { NftController } from './nft.controller';
import { InventoryController } from './inventory.controller';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            { name: Nft.name, schema: NftSchema },
            { name: NftAttribute.name, schema: NftAttributeSchema },
            { name: NftItem.name, schema: NftItemSchema },
            { name: Inventory.name, schema: InventorySchema },
            { name: NftCollection.name, schema: NftCollectionSchema },
            { name: NftTransaction.name, schema: NftTransactionSchema },
        ]),
    ],
    controllers: [NftController, InventoryController],
    providers: [NftService, InventoryService, BlockchainService],
    exports: [NftService, InventoryService, BlockchainService],
})
export class NftModule { }
