import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { Stream, StreamSchema } from './entities/stream.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Stream.name, schema: StreamSchema },
    ]),
  ],
  controllers: [StreamController],
  providers: [StreamService],
  exports: [StreamService],
})
export class StreamModule { }
