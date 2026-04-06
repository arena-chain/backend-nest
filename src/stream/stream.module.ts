import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { Stream, StreamSchema } from './entities/stream.entity';
import { ChannelModule } from '../channel/channel.module';
import { StreamGateway } from './stream.gateway';
import { ChatModule } from '../chat/chat.module.js';
import { UsersModule } from '../user/user.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'yourSecretKey',
      }),
      inject: [ConfigService],
    }),
    ChannelModule,
    ChatModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: Stream.name, schema: StreamSchema },
    ]),
  ],
  controllers: [StreamController],
  providers: [StreamService, StreamGateway],
  exports: [StreamService],
})
export class StreamModule { }
