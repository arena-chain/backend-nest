import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateAbonnementDto } from './dto/create-abonnement.dto';
import { UpdateAbonnementDto } from './dto/update-abonnement.dto';
import { Abonnement, AbonnementDocument } from './schemas/abonnement.schema';

@Injectable()
export class AbonnementService {
  constructor(
    @InjectModel(Abonnement.name) private abonnementModel: Model<AbonnementDocument>,
  ) { }

  async create(createAbonnementDto: CreateAbonnementDto): Promise<Abonnement> {
    try {
      const createdAbonnement = new this.abonnementModel(createAbonnementDto);
      return await createdAbonnement.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Subscription plan with this name already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<Abonnement[]> {
    return await this.abonnementModel.find().exec();
  }

  async findOne(id: string): Promise<Abonnement> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subscription ID');
    }
    const abonnement = await this.abonnementModel.findById(id).exec();
    if (!abonnement) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    return abonnement;
  }

  async update(id: string, updateAbonnementDto: UpdateAbonnementDto): Promise<Abonnement> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subscription ID');
    }
    const updatedAbonnement = await this.abonnementModel
      .findByIdAndUpdate(id, updateAbonnementDto, { new: true })
      .exec();

    if (!updatedAbonnement) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    return updatedAbonnement;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subscription ID');
    }
    const result = await this.abonnementModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    return { message: 'Subscription plan deleted successfully' };
  }
}
