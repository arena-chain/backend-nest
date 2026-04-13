import { PartialType } from '@nestjs/swagger';
import { CreateAssetPresetDto } from './create-asset-preset.dto';

export class UpdateAssetPresetDto extends PartialType(CreateAssetPresetDto) {}
