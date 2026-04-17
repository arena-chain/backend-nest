import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { News, NewsDocument } from './schemas/news.schema';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';
import slugify from 'slugify';

@Injectable()
export class NewsService {
    constructor(
        @InjectModel(News.name) private newsModel: Model<NewsDocument>,
    ) { }

    async create(createNewsDto: CreateNewsDto): Promise<NewsDocument> {
        const slug = createNewsDto.slug || this.generateSlug(createNewsDto.title);

        // Check if sourceUrl already exists to avoid duplicates
        const existing = await this.newsModel.findOne({ sourceUrl: createNewsDto.sourceUrl });
        if (existing) {
            throw new ConflictException('News with this source URL already exists');
        }

        const news = new this.newsModel({
            ...createNewsDto,
            slug,
        });

        return news.save();
    }

    async findAll(query: { game?: string; category?: string; page?: number; limit?: number }) {
        const { game, category, page = 1, limit = 10 } = query;
        const filters: any = {};

        if (game && game !== 'undefined' && game !== 'null') filters.game = game;
        if (category && category !== 'undefined' && category !== 'null') filters.category = category;

        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            this.newsModel.find(filters).sort({ publishedAt: -1 }).skip(skip).limit(limit).exec(),
            this.newsModel.countDocuments(filters).exec(),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(idOrSlug: string): Promise<NewsDocument> {
        const news = await this.newsModel.findOne({
            $or: [{ _id: this.isValidObjectId(idOrSlug) ? idOrSlug : null }, { slug: idOrSlug }],
        }).exec();

        if (!news) {
            throw new NotFoundException('News article not found');
        }
        return news;
    }

    async update(id: string, updateNewsDto: UpdateNewsDto): Promise<NewsDocument> {
        const news = await this.newsModel.findByIdAndUpdate(id, updateNewsDto, { new: true }).exec();
        if (!news) {
            throw new NotFoundException('News article not found');
        }
        return news;
    }

    async remove(id: string): Promise<void> {
        const result = await this.newsModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException('News article not found');
        }
    }

    async existsBySourceUrl(sourceUrl: string): Promise<boolean> {
        const count = await this.newsModel.countDocuments({ sourceUrl }).exec();
        return count > 0;
    }

    private generateSlug(title: string): string {
        return slugify(title, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(2, 7);
    }

    private isValidObjectId(id: string): boolean {
        return /^[0-9a-fA-F]{24}$/.test(id);
    }
}
