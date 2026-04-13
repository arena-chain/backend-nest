import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetPreset, AssetPresetSchema } from './schemas/asset-preset.schema';
import { AssetPresetService } from './asset-preset.service';
import { AssetPresetController } from './asset-preset.controller';

@Module({
    imports: [MongooseModule.forFeature([{ name: AssetPreset.name, schema: AssetPresetSchema }])],
    controllers: [AssetPresetController],
    providers: [AssetPresetService],
    exports: [AssetPresetService],
})
export class AssetPresetModule {}
