import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateLigueDto } from './dto/create-ligue.dto';
import { UpdateLigueDto } from './dto/update-ligue.dto';
import { Ligue, LigueDocument } from './entities/ligue.entity';

@Injectable()
export class LigueService {
  constructor(@InjectModel(Ligue.name) private ligueModel: Model<LigueDocument>) { }

  async create(createLigueDto: CreateLigueDto): Promise<Ligue> {
    const createdLigue = new this.ligueModel(createLigueDto);
    return createdLigue.save();
  }

  async findAll(): Promise<Ligue[]> {
    return this.ligueModel.find().exec();
  }

  async findOne(id: string): Promise<Ligue> {
    const ligue = await this.ligueModel.findById(id).exec();
    if (!ligue) {
      throw new NotFoundException(`Ligue with ID ${id} not found`);
    }
    return ligue;
  }

  async update(id: string, updateLigueDto: UpdateLigueDto): Promise<Ligue> {
    const updatedLigue = await this.ligueModel
      .findByIdAndUpdate(id, updateLigueDto, { new: true })
      .exec();
    if (!updatedLigue) {
      throw new NotFoundException(`Ligue with ID ${id} not found`);
    }
    return updatedLigue;
  }

  async remove(id: string): Promise<Ligue> {
    const deletedLigue = await this.ligueModel.findByIdAndDelete(id).exec();
    if (!deletedLigue) {
      throw new NotFoundException(`Ligue with ID ${id} not found`);
    }
    return deletedLigue;
  }
}
