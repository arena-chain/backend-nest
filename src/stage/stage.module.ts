import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Stage, StageSchema } from './schemas/stage.schema';
import { StageService } from './stage.service';
import { StageController } from './stage.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Stage.name, schema: StageSchema }]),
    ],
    controllers: [StageController],
    providers: [StageService],
    exports: [StageService],
})
export class StageModule {}
