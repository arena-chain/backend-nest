import { PartialType } from '@nestjs/swagger';
import { CreateNftCollectionDto } from './create-nft-collection.dto';

export class UpdateNftCollectionDto extends PartialType(
  CreateNftCollectionDto,
) {}
