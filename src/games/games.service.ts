import { Injectable } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Game, GameDocument } from './entities/game.entity';
import { Model } from 'mongoose';

@Injectable()
export class GamesService {
  constructor(@InjectModel(Game.name) private gameModel: Model<GameDocument>) { }

  create(createGameDto: CreateGameDto) {
    return this.gameModel.create(createGameDto);
  }

  findAll() {
    return this.gameModel.find().exec();
  }

  findOne(id: string) {
    return this.gameModel.findById(id).exec();
  }

  update(id: string, updateGameDto: UpdateGameDto) {
    return this.gameModel.findByIdAndUpdate(id, updateGameDto, { new: true }).exec();
  }

  remove(id: string) {
    return this.gameModel.findByIdAndDelete(id).exec();
  }
}
