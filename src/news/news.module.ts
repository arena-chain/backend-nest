import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { News, NewsSchema } from './schemas/news.schema';
import { NewsAgentService } from './news-agent.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: News.name, schema: NewsSchema }]),
        HttpModule,
    ],
    controllers: [NewsController],
    providers: [NewsService, NewsAgentService],
    exports: [NewsService],
})
export class NewsModule { }
