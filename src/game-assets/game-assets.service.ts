import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative, extname, basename } from 'path';

const ASSET_EXTENSIONS = new Set([
    '.glb',
    '.gltf',
    '.obj',
    '.mtl',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.tga',
]);

export interface InventoryFileEntry {
    relativePath: string;
    /** Path to use in the browser (served by Nest ServeStatic). */
    urlPath: string;
    fileName: string;
    extension: string;
    rootFolder: string;
    subFolder?: string;
    /** Where the file lives on disk (for debugging). */
    source: 'uploads/inventory' | 'src/inventory';
}

@Injectable()
export class GameAssetsService {
    private readonly logger = new Logger(GameAssetsService.name);

    constructor(private readonly configService: ConfigService) {}

    /** Legacy default; prefer `uploads/inventory` when present. */
    getInventoryRoot(): string {
        const fromEnv = this.configService.get<string>('INVENTORY_FILES_ROOT');
        if (fromEnv) {
            return join(process.cwd(), fromEnv);
        }
        const uploadsInv = join(process.cwd(), 'uploads', 'inventory');
        if (existsSync(uploadsInv)) {
            return uploadsInv;
        }
        return join(process.cwd(), 'src', 'inventory');
    }

    /**
     * Scan every inventory folder we serve:
     * - `uploads/inventory` → URL `/uploads/inventory/...` (typical for copied GLBs)
     * - `src/inventory` → URL `/inventory-files/...` (only if that static mount is registered)
     */
    async scanInventoryFiles(): Promise<{ roots: string[]; files: InventoryFileEntry[] }> {
        const files: InventoryFileEntry[] = [];
        const roots: string[] = [];

        const pairs: { abs: string; urlPrefix: string; source: InventoryFileEntry['source'] }[] = [];

        const uploadsInv = join(process.cwd(), 'uploads', 'inventory');
        if (existsSync(uploadsInv)) {
            pairs.push({ abs: uploadsInv, urlPrefix: '/uploads/inventory', source: 'uploads/inventory' });
            roots.push(uploadsInv);
        }

        const srcInv = join(process.cwd(), 'src', 'inventory');
        if (existsSync(srcInv)) {
            pairs.push({ abs: srcInv, urlPrefix: '/inventory-files', source: 'src/inventory' });
            roots.push(srcInv);
        }

        if (pairs.length === 0) {
            this.logger.warn('No inventory folder found (uploads/inventory or src/inventory)');
            return { roots: [], files: [] };
        }

        for (const { abs, urlPrefix, source } of pairs) {
            const relativePaths = await this.walkDir(abs, abs);
            for (const rel of relativePaths) {
                const ext = extname(rel).toLowerCase();
                if (!ASSET_EXTENSIONS.has(ext)) continue;
                const segments = rel.split('/').filter(Boolean);
                const entry: InventoryFileEntry = {
                    relativePath: rel,
                    urlPath: `${urlPrefix}/${rel}`.replace(/\/+/g, '/'),
                    fileName: basename(rel),
                    extension: ext,
                    rootFolder: segments[0] || '',
                    subFolder: segments.length > 2 ? segments[1] : undefined,
                    source,
                };
                files.push(entry);
            }
        }

        return { roots, files };
    }

    private async walkDir(dir: string, baseRoot: string): Promise<string[]> {
        const out: string[] = [];
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        } catch (e) {
            this.logger.warn(`Cannot read directory ${dir}`);
            return out;
        }
        for (const ent of entries) {
            const full = join(dir, ent.name);
            if (ent.isDirectory()) {
                out.push(...(await this.walkDir(full, baseRoot)));
            } else {
                out.push(relative(baseRoot, full).replace(/\\/g, '/'));
            }
        }
        return out;
    }
}
