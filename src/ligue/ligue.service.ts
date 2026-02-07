import { Injectable } from '@nestjs/common';
import { CreateLigueDto } from './dto/create-ligue.dto';
import { UpdateLigueDto } from './dto/update-ligue.dto';

@Injectable()
export class LigueService {
  create(createLigueDto: CreateLigueDto) {
    return 'This action adds a new ligue';
  }

  findAll() {
    return `This action returns all ligue`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ligue`;
  }

  update(id: number, updateLigueDto: UpdateLigueDto) {
    return `This action updates a #${id} ligue`;
  }

  remove(id: number) {
    return `This action removes a #${id} ligue`;
  }
}
