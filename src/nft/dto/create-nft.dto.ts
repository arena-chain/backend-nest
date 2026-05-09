import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNftDto {
  @ApiProperty({
    description: 'Name of the NFT',
    example: 'Dragon Slayer Sword',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the NFT',
    example: 'A legendary sword forged in dragon fire',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Image URL for the NFT',
    example: '/uploads/nft-sword.png',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Category of the NFT game asset',
    enum: [
      'WEAPON',
      'AVATAR',
      'SKIN',
      'CHARACTER',
      'CONSUMABLE',
      'BADGE',
      'TROPHY',
      'EMOTE',
      'ARMOR',
      'ACCESSORY',
      'OTHER',
    ],
    example: 'WEAPON',
  })
  @IsEnum([
    'WEAPON',
    'AVATAR',
    'SKIN',
    'CHARACTER',
    'CONSUMABLE',
    'BADGE',
    'TROPHY',
    'EMOTE',
    'ARMOR',
    'ACCESSORY',
    'OTHER',
  ])
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Rarity level',
    enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],
    example: 'LEGENDARY',
  })
  @IsEnum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'])
  @IsNotEmpty()
  rarity: string;

  @ApiPropertyOptional({ description: 'Collection ID this NFT belongs to' })
  @IsString()
  @IsOptional()
  collectionId?: string;

  @ApiPropertyOptional({
    description: 'IDs of compatible games from the catalog',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  compatibleGames?: string[];

  @ApiPropertyOptional({
    description: 'Tags for search/filtering',
    example: ['fire', 'melee', 'legendary'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether the item can be equipped in-game',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isEquippable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the item is consumable (one-time use)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isConsumable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the item can be traded between users',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isTradeable?: boolean;

  @ApiPropertyOptional({
    description: 'Total supply of this NFT',
    example: 100,
  })
  @IsNumber()
  @IsOptional()
  supply?: number;

  @ApiPropertyOptional({
    description: 'Max supply (0 = unlimited)',
    example: 1000,
  })
  @IsNumber()
  @IsOptional()
  maxSupply?: number;

  @ApiPropertyOptional({ description: 'External URL for more info' })
  @IsString()
  @IsOptional()
  externalUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { damage: 150, element: 'fire' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
