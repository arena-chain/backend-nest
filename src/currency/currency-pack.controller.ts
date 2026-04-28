import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { CurrencyPackService } from './currency-pack.service';
import { CreateCurrencyPackDto } from './dto/create-currency-pack.dto';
import { UpdateCurrencyPackDto } from './dto/update-currency-pack.dto';

function serializePack(p: {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  grantWholeTokens: number;
  priceCents: number;
  priceCurrency: string;
  active: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: String(p._id),
    title: p.title,
    description: p.description ?? null,
    grantWholeTokens: p.grantWholeTokens,
    priceCents: p.priceCents,
    priceCurrency: p.priceCurrency,
    active: p.active,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt?.toISOString(),
    updatedAt: p.updatedAt?.toISOString(),
  };
}

@ApiTags('currency-packs')
@Controller('currency/packs')
export class CurrencyPackController {
  constructor(private readonly currencyPackService: CurrencyPackService) {}

  @Get()
  @ApiOperation({ summary: 'List active currency packs (store)' })
  async listActive() {
    const rows = await this.currencyPackService.findActiveForStore();
    return { packs: rows.map((r) => serializePack(r as never)) };
  }

  @Get('manage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all packs (admin)' })
  async listAll() {
    const rows = await this.currencyPackService.findAllForAdmin();
    return { packs: rows.map((r) => serializePack(r as never)) };
  }

  @Get('my/purchases')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'My pack purchases (wallet / history)' })
  async myPurchases(@Req() req: { user: { userId: string } }) {
    const rows = await this.currencyPackService.listMyPurchases(
      req.user.userId,
    );
    return {
      purchases: rows.map((r) => {
        const row = r as {
          _id: Types.ObjectId;
          packId: Types.ObjectId;
          packTitleSnapshot: string;
          wholeTokensGranted: number;
          priceCentsSnapshot: number;
          priceCurrencySnapshot: string;
          status: string;
          fulfillmentTxHash?: string;
          createdAt?: Date;
        };
        return {
          id: String(row._id),
          packId: String(row.packId),
          packTitle: row.packTitleSnapshot,
          wholeTokensGranted: row.wholeTokensGranted,
          priceCents: row.priceCentsSnapshot,
          priceCurrency: row.priceCurrencySnapshot,
          status: row.status,
          fulfillmentTxHash: row.fulfillmentTxHash ?? null,
          createdAt: row.createdAt?.toISOString(),
        };
      }),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: CreateCurrencyPackDto })
  @ApiOperation({ summary: 'Create a currency pack (admin)' })
  async create(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateCurrencyPackDto,
  ) {
    const doc = await this.currencyPackService.create(req.user.userId, dto);
    return serializePack(doc.toObject() as never);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: UpdateCurrencyPackDto })
  @ApiOperation({ summary: 'Update a currency pack (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateCurrencyPackDto) {
    const doc = await this.currencyPackService.update(id, dto);
    return serializePack(doc.toObject() as never);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a currency pack (admin)' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    await this.currencyPackService.remove(id);
    return { ok: true };
  }

  @Post(':id/purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Purchase a pack (mint fulfillment)',
    description:
      'Requires linked wallet. Uses GTK_ALLOW_PURCHASE_SIMULATION + server mint (same as simulated buy). Replace with payment webhook in production.',
  })
  async purchase(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.currencyPackService.purchasePack(req.user.userId, id);
  }
}
