import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as https from 'https';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/news.dto';
import Parser from 'rss-parser';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';

@Injectable()
export class NewsAgentService implements OnModuleInit {
    private readonly logger = new Logger(NewsAgentService.name);
    private readonly rssParser = new Parser();
    private readonly insecureAgent = new https.Agent({ rejectUnauthorized: false });

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly newsService: NewsService,
    ) { }

    async onModuleInit() {
        this.logger.log('NewsAgentService initialized. Triggering initial fetch...');
        // Run in background so it doesn't block startup
        this.fetchAndPublish().catch(err => {
            this.logger.error('Initial news fetch failed', err.stack);
        });
    }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async handleCron() {
        this.logger.log('Starting News Agent fetch cycle...');
        await this.fetchAndPublish();
    }

    // Allow manual trigger if needed
    async fetchAndPublish() {
        try {
            const newsApiArticles = await this.fetchFromNewsApi();
            const rssArticles = await this.fetchFromRss();
            const rapidApiArticles = await this.fetchFromRapidApi();
            const scrapedArticles = await this.fetchFromScraping();

            const allArticles = [...newsApiArticles, ...rssArticles, ...rapidApiArticles, ...scrapedArticles];
            let publishedCount = 0;
            let duplicateCount = 0;

            for (const article of allArticles) {
                try {
                    // Deduplication
                    if (!article.sourceUrl) continue;
                    const exists = await this.newsService.existsBySourceUrl(article.sourceUrl);
                    if (exists) {
                        duplicateCount++;
                        continue;
                    }

                    await this.newsService.create(article);
                    publishedCount++;
                } catch (err) {
                    this.logger.error(`Failed to publish article: ${article.title}`, err.stack);
                }
            }

            this.logger.log(`Fetch cycle complete: ${publishedCount} published, ${duplicateCount} duplicates skipped.`);
        } catch (error) {
            this.logger.error('Error in News Agent cycle', error.stack);
        }
    }

    private async fetchFromNewsApi(): Promise<CreateNewsDto[]> {
        const apiKey = this.configService.get<string>('NEWSAPI_KEY');
        if (!apiKey) {
            this.logger.warn('NEWSAPI_KEY not found in config. Skipping NewsAPI fetch.');
            return [];
        }

        const query = '(valorant OR "league of legends" OR esports)';
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`;

        try {
            const response = await firstValueFrom(this.httpService.get(url));
            const articles = response.data.articles || [];

            return articles.map(article => ({
                title: article.title,
                summary: this.summarize(article.description || article.content),
                content: article.content,
                coverImageUrl: article.urlToImage,
                sourceName: article.source.name,
                sourceUrl: article.url,
                publishedAt: new Date(article.publishedAt),
                language: 'en',
                category: this.detectCategory(article.title),
                game: this.detectGame(article.title + ' ' + article.description),
                tags: this.extractTags(article.title),
                status: 'published',
            }));
        } catch (error) {
            this.logger.error('Error fetching from NewsAPI', error.stack);
            return [];
        }
    }

    private async fetchFromRss(): Promise<CreateNewsDto[]> {
        const rssFeeds = [
            { url: 'https://www.dexerto.com/esports/feed/', name: 'Dexerto Esports' },
            { url: 'https://blog.playstation.com/feed/', name: 'PlayStation Blog' }, // General gaming
        ];

        const allArticles: CreateNewsDto[] = [];

        for (const feed of rssFeeds) {
            try {
                this.logger.log(`Fetching RSS feed: ${feed.url}`);
                const response = await firstValueFrom(
                    this.httpService.get(feed.url, {
                        httpsAgent: this.insecureAgent,
                        timeout: 30000,
                    }),
                );

                const parsed = await this.rssParser.parseString(response.data);
                const items = (parsed.items || []).slice(0, 10);

                for (const item of items) {
                    allArticles.push({
                        title: item.title || 'Untitled',
                        summary: this.summarize(item.contentSnippet || item.content || ''),
                        content: item.content,
                        coverImageUrl: undefined, // RSS often needs extra parsing for images
                        sourceName: feed.name,
                        sourceUrl: item.link || '',
                        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                        language: 'en',
                        category: this.detectCategory(item.title || ''),
                        game: this.detectGame((item.title || '') + ' ' + (item.contentSnippet || '')),
                        tags: this.extractTags(item.title || ''),
                        status: 'published',
                    });
                }
            } catch (error) {
                this.logger.error(`Error fetching RSS feed: ${feed.url}`, error.stack);
            }
        }

        return allArticles;
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
        const commonTags = ['vct', 'msi', 'lcs', 'patch', 'ranked', 'agent', 'skin', 'update', 'major'];
        const t = title.toLowerCase();
        return commonTags.filter(tag => t.includes(tag));
    }

    private async fetchFromRapidApi(): Promise<CreateNewsDto[]> {
        const apiKey = this.configService.get<string>('RAPIDAPI_KEY');
        if (!apiKey) return [];

        // Game IDs: 3240220 (LoL), 45831 (Valorant), 730 (CS2), 570 (Dota 2)
        const gameIds = ['3240220', '45831', '730', '570'];
        const allArticles: CreateNewsDto[] = [];

        for (const gameId of gameIds) {
            try {
                const url = `https://games-details.p.rapidapi.com/news/announcements/${gameId}?limit=10&offset=0`;
                const response = await firstValueFrom(this.httpService.get(url, {
                    headers: {
                        'x-rapidapi-host': 'games-details.p.rapidapi.com',
                        'x-rapidapi-key': apiKey,
                    },
                    timeout: 20000,
                }));

                // Add a small delay between requests to avoid rate limits (429)
                await new Promise(resolve => setTimeout(resolve, 1000));

                const articles = response.data || [];
                for (const article of articles) {
                    allArticles.push({
                        title: article.title,
                        summary: this.summarize(article.description),
                        content: article.description,
                        coverImageUrl: article.image_url,
                        sourceName: 'Games Details (RapidAPI)',
                        sourceUrl: article.url || `https://games-details-rapidapi.com/${article.id}`,
                        publishedAt: new Date(article.published_at || Date.now()),
                        language: 'en',
                        category: 'general',
                        game: this.detectGame(article.title + ' ' + (article.description || '')),
                        tags: this.extractTags(article.title),
                        status: 'published',
                    });
                }
            } catch (error) {
                this.logger.error(`Error fetching from RapidAPI for game ${gameId}`, error.stack);
            }
        }
        return allArticles;
    }

    private async fetchFromScraping(): Promise<CreateNewsDto[]> {
        const targetUrl = 'https://www.esports.net/news/';
        const articles: CreateNewsDto[] = [];

        try {
            const response = await firstValueFrom(this.httpService.get(targetUrl, {
                httpsAgent: this.insecureAgent,
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }));
            const $ = cheerio.load(response.data);

            // 1. Top featured entries (.news-entry)
            $('.news-entry').each((_, element) => {
                const titleElement = $(element).find('h3 a');
                const title = titleElement.text().trim();
                const sourceUrl = titleElement.attr('href') || '';

                // Image is often in a background-image style or data-src
                const imgDiv = $(element).find('.news-image-container');
                let coverImageUrl = imgDiv.attr('data-bg-image');
                if (coverImageUrl) {
                    const match = coverImageUrl.match(/url\((.*?)\)/);
                    if (match) coverImageUrl = match[1].replace(/['"]/g, '');
                }

                if (!coverImageUrl || coverImageUrl.startsWith('data:image')) {
                    const img = $(element).find('img').first();
                    coverImageUrl = img.attr('data-src') || img.attr('src');
                }

                if (coverImageUrl && coverImageUrl.startsWith('data:image')) {
                    coverImageUrl = undefined;
                }

                if (title && sourceUrl) {
                    articles.push({
                        title,
                        summary: title,
                        content: title,
                        coverImageUrl,
                        sourceName: 'Esports.net (Scraped)',
                        sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `https://www.esports.net${sourceUrl}`,
                        publishedAt: new Date(),
                        language: 'en',
                        category: this.detectCategory(title),
                        game: this.detectGame(title),
                        tags: this.extractTags(title),
                        status: 'published',
                    });
                }
            });

            // 2. Archive entries (.entry)
            $('.entry').each((_, element) => {
                const titleElement = $(element).find('h3.title a, .content h3 a').first();
                const title = titleElement.text().trim();
                const sourceUrl = titleElement.attr('href') || '';
                const summary = $(element).find('.excerpt').text().trim();

                const img = $(element).find('.image img, img').first();
                let coverImageUrl = img.attr('data-src') || img.attr('src');

                // If it's the base64 placeholder, try to find another source
                if (coverImageUrl && coverImageUrl.startsWith('data:image')) {
                    coverImageUrl = img.attr('data-src') || img.attr('data-lazy-src') || undefined;
                }

                if (title && sourceUrl) {
                    articles.push({
                        title,
                        summary: this.summarize(summary),
                        content: summary,
                        coverImageUrl,
                        sourceName: 'Esports.net (Scraped)',
                        sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `https://www.esports.net${sourceUrl}`,
                        publishedAt: new Date(),
                        language: 'en',
                        category: this.detectCategory(title),
                        game: this.detectGame(title + ' ' + summary),
                        tags: this.extractTags(title),
                        status: 'published',
                    });
                }
            });

            this.logger.log(`Successfully parsed ${articles.length} news items from ${targetUrl}`);
        } catch (error) {
            this.logger.error(`Error scraping from ${targetUrl}`, error.stack);
        }

        return articles;
    }

    private summarize(text: string): string {
        if (!text) return 'No summary available.';
        // Simple summary: take first 2-3 sentences or first 200 chars
        const cleaned = text.replace(/<[^>]*>?/gm, ''); // Remove HTML
        const sentences = cleaned.split(/[.!?]/);
        return sentences.slice(0, 2).join('. ') + '.';
    }
}
