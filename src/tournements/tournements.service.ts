import { Injectable } from '@nestjs/common';
import { CreateTournementDto } from './dto/create-tournement.dto';
import { UpdateTournementDto } from './dto/update-tournement.dto';

@Injectable()
export class TournementsService {
  create(createTournementDto: CreateTournementDto) {
    return 'This action adds a new tournement';
  }

  findAll() {
    return `This action returns all tournements`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tournement`;
  }

  update(id: number, updateTournementDto: UpdateTournementDto) {
    return `This action updates a #${id} tournement`;
  }

  remove(id: number) {
    return `This action removes a #${id} tournement`;
  }
}
