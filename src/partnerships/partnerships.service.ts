import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePartnershipDto } from './dto/create-partnership.dto';
import { UpdatePartnershipDto } from './dto/update-partnership.dto';
import { Partnership, PartnershipDocument } from './schemas/partnership.schema';

@Injectable()
export class PartnershipsService {
  constructor(
    @InjectModel(Partnership.name) private partnershipModel: Model<PartnershipDocument>,
  ) { }

  async create(createPartnershipDto: CreatePartnershipDto): Promise<Partnership> {
    const createdPartnership = new this.partnershipModel(createPartnershipDto);
    return createdPartnership.save();
  }

  async findAll(): Promise<Partnership[]> {
    return this.partnershipModel.find().exec();
  }

  async findOne(id: string): Promise<Partnership> {
    const partnership = await this.partnershipModel.findById(id).exec();
    if (!partnership) {
      throw new NotFoundException(`Partnership with ID ${id} not found`);
    }
    return partnership;
  }

  async update(id: string, updatePartnershipDto: UpdatePartnershipDto): Promise<Partnership> {
    const updatedPartnership = await this.partnershipModel
      .findByIdAndUpdate(id, updatePartnershipDto, { new: true })
      .exec();
    if (!updatedPartnership) {
      throw new NotFoundException(`Partnership with ID ${id} not found`);
    }
    return updatedPartnership;
  }

  async remove(id: string): Promise<Partnership> {
    const deletedPartnership = await this.partnershipModel.findByIdAndDelete(id).exec();
    if (!deletedPartnership) {
      throw new NotFoundException(`Partnership with ID ${id} not found`);
    }
    return deletedPartnership;
  }
}
