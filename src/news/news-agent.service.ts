import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as https from 'https';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/news.dto';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';

@Injectable()
export class NewsAgentService implements OnModuleInit {
    private readonly logger = new Logger(NewsAgentService.name);
    private readonly insecureAgent = new https.Agent({ rejectUnauthorized: false });

    constructor(
        private readonly httpService: HttpService,
        private readonly newsService: NewsService,
    ) { }

    async onModuleInit() {
        this.logger.log('NewsAgentService initialized. Triggering initial scraping...');
        // Run in background so it doesn't block startup
        this.fetchAndPublish().catch(err => {
            this.logger.error('Initial news scraping failed', err.stack);
        });
    }

    @Cron(CronExpression.EVERY_12_HOURS)
    async handleCron() {
        this.logger.log('Starting News Agent scraping cycle...');
        await this.fetchAndPublish();
    }

    async fetchAndPublish() {
        this.logger.log('Executing multi-source gaming news scraping...');
        try {
            const allArticles: CreateNewsDto[] = [];

            // Execute scrapers for different sources
            const scrapers = [
                { name: 'Esports.net', fn: this.scrapeEsportsNet.bind(this) },
                { name: 'Fragster', fn: this.scrapeFragster.bind(this) },
                { name: 'Dexerto', fn: this.scrapeDexerto.bind(this) },
                { name: 'GosuGamers', fn: this.scrapeGosuGamers.bind(this) },
                { name: 'TalkEsport', fn: this.scrapeTalkEsport.bind(this) },
                { name: 'IGN', fn: this.scrapeIGN.bind(this) },
                { name: 'Kotaku', fn: this.scrapeKotaku.bind(this) },
            ];

            for (const scraper of scrapers) {
                try {
                    const articles = await scraper.fn();
                    if (articles.length > 0) {
                        this.logger.log(`Successfully scraped ${articles.length} articles from ${scraper.name}`);
                        allArticles.push(...articles);
                    }
                } catch (err) {
                    this.logger.error(`Scraper ${scraper.name} failed: ${err.message}`);
                }
            }

            if (allArticles.length === 0) {
                this.logger.warn('No articles fetched from any source. Check logs for errors.');
                return;
            }

            let publishedCount = 0;
            let duplicateCount = 0;

            for (const article of allArticles) {
                try {
                    if (!article.sourceUrl) continue;
                    
                    const exists = await this.newsService.existsBySourceUrl(article.sourceUrl);
                    if (exists) {
                        duplicateCount++;
                        continue;
                    }

                    await this.newsService.create(article);
                    publishedCount++;
                } catch (err) {
                    if (err.status !== 409) {
                        this.logger.error(`Failed to publish article: ${article.title}`, err.stack);
                    }
                }
            }

            this.logger.log(`Scraping cycle complete: ${publishedCount} new articles published, ${duplicateCount} duplicates skipped.`);
        } catch (error) {
            this.logger.error('Error in News Agent cycle', error.stack);
        }
    }

    private async scrapeEsportsNet(): Promise<CreateNewsDto[]> {
        const articles: CreateNewsDto[] = [];
        const pages = [1, 2]; // Scrape first 2 pages

        for (const page of pages) {
            const targetUrl = `https://www.esports.net/news/${page > 1 ? `page/${page}/` : ''}`;
            try {
                const response = await this.makeRequest(targetUrl);
                const $ = cheerio.load(response.data);

                $('.news-entry, .entry, .news-card').each((_, element) => {
                    const titleElement = $(element).find('h3 a, h2 a, .title a').first();
                    const title = titleElement.text().trim();
                    const sourceUrl = titleElement.attr('href') || '';
                    const summaryText = $(element).find('.excerpt, .summary, .text').text().trim() || title;

                    let coverImageUrl = $(element).find('img').first().attr('data-src') 
                        || $(element).find('img').first().attr('data-lazy-src')
                        || $(element).find('img').first().attr('src');
                    
                    if (coverImageUrl?.startsWith('data:image')) coverImageUrl = undefined;
                    if (coverImageUrl && !coverImageUrl.startsWith('http')) coverImageUrl = `https://www.esports.net${coverImageUrl}`;

                    if (title && sourceUrl) {
                        articles.push({
                            title,
                            summary: this.summarize(summaryText),
                            content: summaryText,
                            coverImageUrl,
                            sourceName: 'Esports.net',
                            sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `https://www.esports.net${sourceUrl}`,
                            publishedAt: new Date(),
                            language: 'en',
                            category: this.detectCategory(title),
                            game: this.detectGame(title + ' ' + summaryText),
                            tags: this.extractTags(title),
                            status: 'published',
                        });
                    }
                });
            } catch (error) {
                this.logger.error(`Error scraping Esports.net page ${page}: ${error.message}`);
                break;
            }
        }
        return articles;
    }

    private async scrapeFragster(): Promise<CreateNewsDto[]> {
        const targetUrl = 'https://www.fragster.com/news/';
        const articles: CreateNewsDto[] = [];

        try {
            const response = await this.makeRequest(targetUrl);
            const $ = cheerio.load(response.data);

            $('article, .post, .anderson-category-posts-widget-big-item, .item-inner').each((_, element) => {
                const titleElement = $(element).find('.entry-title a, h2 a, h3 a, .title a').first();
                const title = titleElement.text().trim();
                const sourceUrl = titleElement.attr('href') || '';
                
                let coverImageUrl = $(element).find('img').first().attr('src') || $(element).find('img').first().attr('data-src');

                if (title && sourceUrl) {
                    articles.push({
                        title,
                        summary: title,
                        content: title,
                        coverImageUrl,
                        sourceName: 'Fragster',
                        sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `https://www.fragster.com${sourceUrl}`,
                        publishedAt: new Date(),
                        language: 'en',
                        category: this.detectCategory(title),
                        game: this.detectGame(title),
                        tags: this.extractTags(title),
                        status: 'published',
                    });
                }
            });
        } catch (error) {
            this.logger.error(`Error scraping Fragster: ${error.message}`);
        }
        return articles;
    }

    private async scrapeDexerto(): Promise<CreateNewsDto[]> {
        const targetUrl = 'https://www.dexerto.com/esports/';
        const articles: CreateNewsDto[] = [];

        try {
            const response = await this.makeRequest(targetUrl);
            const $ = cheerio.load(response.data);

            $('article, [role="listitem"]').each((_, element) => {
                const titleElement = $(element).find('h1 a, h2 a, h3 a, h4 a, .sc-title a').first();
                const title = titleElement.text().trim();
                const sourceUrl = titleElement.attr('href') || '';
                
                let coverImageUrl = $(element).find('img').first().attr('src');

                if (title && sourceUrl) {
                    articles.push({
                        title,
                        summary: title,
                        content: title,
                        coverImageUrl,
                        sourceName: 'Dexerto',
                        sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `https://www.dexerto.com${sourceUrl}`,
                        publishedAt: new Date(),
                        language: 'en',
                        category: this.detectCategory(title),
                        game: this.detectGame(title),
                        tags: this.extractTags(title),
                        status: 'published',
                    });
                }
            });
        } catch (error) {
            this.logger.error(`Error scraping Dexerto: ${error.message}`);
        }
        return articles;
    }

    private async scrapeGosuGamers(): Promise<CreateNewsDto[]> {
        const targetUrl = 'https://www.gosugamers.net/news';
        const articles: CreateNewsDto[] = [];

        try {
            const response = await this.makeRequest(targetUrl);
            const $ = cheerio.load(response.data);

            $('.news-item, .article-card, article').each((_, element) => {
                const titleElement = $(element).find('.title, h2, h3').find('a').first();
                const title = titleElement.text().trim();
                const sourceUrl = titleElement.attr('href') || '';
                
                let coverImageUrl = $(element).find('img').first().attr('src') || $(element).find('img').first().attr('data-src');

                if (title && sourceUrl) {
                    articles.push({
                        title,
                        summary: title,
                        content: title,
                        coverImageUrl: coverImageUrl?.startsWith('http') ? coverImageUrl : (coverImageUrl ? `https://www.gosugamers.net${coverImageUrl}` : undefined),
                        sourceName: 'GosuGamers',
                        sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `https://www.gosugamers.net${sourceUrl}`,
                        publishedAt: new Date(),
                        language: 'en',
                        category: this.detectCategory(title),
                        game: this.detectGame(title),
                        tags: this.extractTags(title),
                        status: 'published',
                    });
                }
            });
        } catch (error) {
            this.logger.error(`Error scraping GosuGamers: ${error.message}`);
        }
        return articles;
    }

    private async scrapeTalkEsport(): Promise<CreateNewsDto[]> {
        const targetUrl = 'https://www.talkesport.com/news/';
        const articles: CreateNewsDto[] = [];

        try {
            const response = await this.makeRequest(targetUrl);
            const $ = cheerio.load(response.data);

            $('.td-block-span6, .td-module-container, article').each((_, element) => {
                const titleElement = $(element).find('.entry-title a, h3 a').first();
                const title = titleElement.text().trim();
                const sourceUrl = titleElement.attr('href') || '';
                
                let coverImageUrl = $(element).find('img').first().attr('src') || $(element).find('img').first().attr('data-src');

                if (title && sourceUrl) {
                    articles.push({
                        title,
                        summary: title,
                        content: title,
                        coverImageUrl,
                        sourceName: 'TalkEsport',
                        sourceUrl,
                        publishedAt: new Date(),
                        language: 'en',
                        category: this.detectCategory(title),
                        game: this.detectGame(title),
                        tags: this.extractTags(title),
                        status: 'published',
                    });
                }
            });
        } catch (error) {
            this.logger.error(`Error scraping TalkEsport: ${error.message}`);
        }
        return articles;
    }

    private async scrapeIGN(): Promise<CreateNewsDto[]> {
        const targetUrl = 'https://www.ign.com/news';
        const articles: CreateNewsDto[] = [];

        try {
            const response = await this.makeRequest(targetUrl);
            const $ = cheerio.load(response.data);

            $('.content-item, .ign-news-item, article').each((_, element) => {
                const titleElement = $(element).find('a[class*="item-title"], h3 a, h2 a').first();
                const title = titleElement.text().trim();
                const sourceUrl = titleElement.attr('href') || '';
                
                let coverImageUrl = $(element).find('img').first().attr('src');

                if (title && sourceUrl) {
                    articles.push({
                        title,
                        summary: title,
                        content: title,
                        coverImageUrl,
                        sourceName: 'IGN',
                        sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `https://www.ign.com${sourceUrl}`,
                        publishedAt: new Date(),
                        language: 'en',
                        category: this.detectCategory(title),
                        game: this.detectGame(title),
                        tags: this.extractTags(title),
                        status: 'published',
                    });
                }
            });
        } catch (error) {
            this.logger.error(`Error scraping IGN: ${error.message}`);
        }
        return articles;
    }

    private async scrapeKotaku(): Promise<CreateNewsDto[]> {
        const targetUrl = 'https://kotaku.com'; // Base URL is safer for Kotaku
        const articles: CreateNewsDto[] = [];

        try {
            const response = await this.makeRequest(targetUrl);
            const $ = cheerio.load(response.data);

            $('article').each((_, element) => {
                const titleElement = $(element).find('h2 a, h3 a, h1 a').first();
                const title = titleElement.text().trim();
                const sourceUrl = titleElement.attr('href') || '';
                
                let coverImageUrl = $(element).find('img').first().attr('src') || $(element).find('img').first().attr('data-src');

                if (title && sourceUrl) {
                    articles.push({
                        title,
                        summary: title,
                        content: title,
                        coverImageUrl,
                        sourceName: 'Kotaku',
                        sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `https://kotaku.com${sourceUrl}`,
                        publishedAt: new Date(),
                        language: 'en',
                        category: this.detectCategory(title),
                        game: this.detectGame(title),
                        tags: this.extractTags(title),
                        status: 'published',
                    });
                }
            });
        } catch (error) {
            this.logger.error(`Error scraping Kotaku: ${error.message}`);
        }
        return articles;
    }

    private async makeRequest(url: string) {
        return firstValueFrom(
            this.httpService.get(url, {
                httpsAgent: this.insecureAgent,
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.google.com/',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'Upgrade-Insecure-Requests': '1',
                }
            })
        );
    }

    private detectGame(text: string): string {
        const t = text.toLowerCase();
        if (t.includes('valorant') || t.includes('vct')) return 'valorant';
        if (t.includes('league of legends') || t.includes('riot games') || t.includes(' lol ')) return 'lol';
        if (t.includes('cs2') || t.includes('counter-strike')) return 'cs2';
        if (t.includes('fortnite')) return 'fortnite';
        if (t.includes('dota')) return 'dota-2';
        return 'other';
    }

    private detectCategory(title: string): string {
        const t = title.toLowerCase();
        if (t.includes('patch') || t.includes('update') || t.includes('notes')) return 'patch_notes';
        if (t.includes('tournament') || t.includes('esports') || t.includes('pro league') || t.includes('win')) return 'esports';
        if (t.includes('community') || t.includes('fan')) return 'community';
        if (t.includes('tech') || t.includes('graphics') || t.includes('ps5') || t.includes('xbox')) return 'tech';
        return 'general';
    }

    private extractTags(title: string): string[] {
        const commonTags = ['vct', 'msi', 'lcs', 'patch', 'ranked', 'agent', 'skin', 'update', 'major', 'pro'];
        const t = title.toLowerCase();
        return commonTags.filter(tag => t.includes(tag));
    }

    private summarize(text: string): string {
        if (!text) return 'No summary available.';
        const cleaned = text.replace(/<[^>]*>?/gm, '').trim();
        if (cleaned.length <= 160) return cleaned;
        return cleaned.substring(0, 157) + '...';
    }
}
