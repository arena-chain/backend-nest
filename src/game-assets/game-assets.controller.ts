import { BadRequestException, Body, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GameAssetsService } from './game-assets.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync, readFileSync, unlinkSync } from 'fs';

@ApiTags('game-assets')
@Controller('game-assets')
export class GameAssetsController {
    constructor(private readonly gameAssetsService: GameAssetsService) {}

    private static readonly MODEL_EXTENSIONS = new Set(['.glb', '.gltf']);
    private static readonly JSON_CHUNK_TYPE = 0x4e4f534a; // "JSON"

    private ensureModelHasRenderableMeshes(absPath: string, ext: string): void {
        try {
            if (ext === '.glb') {
                const buf = readFileSync(absPath);
                if (buf.length < 20) throw new Error('GLB file is too small');
                const magic = buf.toString('utf8', 0, 4);
                if (magic !== 'glTF') throw new Error('Invalid GLB header');
                const jsonChunkLength = buf.readUInt32LE(12);
                const jsonChunkType = buf.readUInt32LE(16);
                if (jsonChunkType !== GameAssetsController.JSON_CHUNK_TYPE) {
                    throw new Error('Invalid GLB JSON chunk');
                }
                const jsonStart = 20;
                const jsonEnd = jsonStart + jsonChunkLength;
                const jsonText = buf.toString('utf8', jsonStart, jsonEnd).replace(/\u0000+$/g, '').trim();
                const doc = JSON.parse(jsonText) as { meshes?: unknown[] };
                const meshes = Array.isArray(doc.meshes) ? doc.meshes : [];
                if (meshes.length === 0) {
                    throw new Error('Model has no meshes (nothing to render)');
                }
                return;
            }

            if (ext === '.gltf') {
                const txt = readFileSync(absPath, 'utf8');
                const doc = JSON.parse(txt) as { meshes?: unknown[] };
                const meshes = Array.isArray(doc.meshes) ? doc.meshes : [];
                if (meshes.length === 0) {
                    throw new Error('Model has no meshes (nothing to render)');
                }
            }
        } catch (e) {
            throw new BadRequestException(
                `Invalid 3D model: ${(e as Error)?.message || 'cannot parse mesh data'}`,
            );
        }
    }

    @Get()
    @ApiOperation({
        summary: 'List raw inventory files',
        description:
            'Scans `uploads/inventory` and/or `src/inventory`. URLs use `/uploads/inventory/...` or `/inventory-files/...` (not under `/api`).',
    })
    @ApiResponse({ status: 200, description: 'Flat list of asset files with URL hints' })
    async listFiles() {
        const { roots, files } = await this.gameAssetsService.scanInventoryFiles();
        return {
            inventoryRoots: roots,
            hint: 'Each file has `urlPath`: use `${origin}${urlPath}` in the browser. With Vite dev, proxy `/uploads` and `/inventory-files` to the API.',
            count: files.length,
            files,
        };
    }

    @Post('upload-model')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const gameId = String(req.body?.gameId || 'misc').toLowerCase();
                    const mode = String(req.body?.mode || 'avatar').toLowerCase(); // avatar | weapon
                    const bucket = mode === 'weapon' ? 'weapens' : 'avatar';
                    const dir = join(process.cwd(), 'uploads', 'inventory', bucket, gameId);
                    mkdirSync(dir, { recursive: true });
                    cb(null, dir);
                },
                filename: (req, file, cb) => {
                    const ext = extname(file.originalname).toLowerCase();
                    const base = (req.body?.name || file.originalname.replace(ext, '') || 'model')
                        .toString()
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9-_]+/g, '-')
                        .replace(/^-+|-+$/g, '')
                        .slice(0, 80) || 'model';
                    cb(null, `${base}${ext}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                const ext = extname(file.originalname).toLowerCase();
                if (!GameAssetsController.MODEL_EXTENSIONS.has(ext)) {
                    cb(new BadRequestException('Only .glb and .gltf files are allowed'), false);
                    return;
                }
                cb(null, true);
            },
        }),
    )
    @ApiOperation({ summary: 'Upload a 3D model (.glb/.gltf) for studio use' })
    @ApiResponse({ status: 201, description: 'Model uploaded and ready for frontend use' })
    uploadModel(
        @UploadedFile() file: Express.Multer.File,
        @Body('name') name?: string,
        @Body('gameId') gameId?: string,
        @Body('mode') mode?: 'avatar' | 'weapon',
    ) {
        if (!file) {
            throw new BadRequestException('Missing file');
        }
        const ext = extname(file.filename).toLowerCase();
        try {
            this.ensureModelHasRenderableMeshes(file.path, ext);
        } catch (e) {
            try {
                unlinkSync(file.path);
            } catch {
                /* ignore cleanup failures */
            }
            throw e;
        }
        const safeGameId = (gameId || 'misc').toLowerCase();
        const safeMode = mode === 'weapon' ? 'weapon' : 'avatar';
        const bucket = safeMode === 'weapon' ? 'weapens' : 'avatar';
        const urlPath = `/uploads/inventory/${bucket}/${safeGameId}/${file.filename}`;
        return {
            ok: true,
            name: name || file.filename,
            gameId: safeGameId,
            mode: safeMode,
            filename: file.filename,
            urlPath,
        };
    }
}
