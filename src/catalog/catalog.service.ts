import { Injectable } from '@nestjs/common';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Catalog, CatalogDocument } from './schemas/catalog.entity';
import { Model } from 'mongoose';

@Injectable()
export class CatalogService {
  constructor(@InjectModel(Catalog.name) private catalogModel: Model<CatalogDocument>) { }

  create(createCatalogDto: CreateCatalogDto) {
    return this.catalogModel.create(createCatalogDto);
  }

  findAll() {
    return this.catalogModel.find().exec();
  }

  findOne(id: string) {
    return this.catalogModel.findById(id).exec();
  }

  update(id: string, updateCatalogDto: UpdateCatalogDto) {
    return this.catalogModel.findByIdAndUpdate(id, updateCatalogDto, { new: true }).exec();
  }

  remove(id: string) {
    return this.catalogModel.findByIdAndDelete(id).exec();
  }
}
