import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssetPresetService } from './asset-preset.service';
import { CreateAssetPresetDto } from './dto/create-asset-preset.dto';
import { UpdateAssetPresetDto } from './dto/update-asset-preset.dto';

@ApiTags('asset-presets')
@Controller('asset-presets')
export class AssetPresetController {
    constructor(private readonly assetPresetService: AssetPresetService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Save a normal (non-NFT) configuration preset' })
    @ApiResponse({ status: 201, description: 'Preset created' })
    create(@Req() req, @Body() dto: CreateAssetPresetDto) {
        return this.assetPresetService.create(req.user.userId, dto);
    }

    @Get('mine')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'List my saved presets' })
    findMine(@Req() req) {
        return this.assetPresetService.findMine(req.user.userId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiParam({ name: 'id' })
    @ApiOperation({ summary: 'Get one of my presets' })
    findOne(@Req() req, @Param('id') id: string) {
        return this.assetPresetService.findOne(req.user.userId, id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiParam({ name: 'id' })
    @ApiOperation({ summary: 'Update a preset' })
    update(@Req() req, @Param('id') id: string, @Body() dto: UpdateAssetPresetDto) {
        return this.assetPresetService.update(req.user.userId, id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiParam({ name: 'id' })
    @ApiOperation({ summary: 'Delete a preset' })
    remove(@Req() req, @Param('id') id: string) {
        return this.assetPresetService.remove(req.user.userId, id);
    }
}
