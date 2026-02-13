import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HighlightsService } from './highlights.service';
import { HighlightsController } from './highlights.controller';
import { Highlight, HighlightSchema } from './schemas/highlight.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Highlight.name, schema: HighlightSchema }]),
  ],
  controllers: [HighlightsController],
  providers: [HighlightsService],
  exports: [HighlightsService],
})
export class HighlightsModule { }
