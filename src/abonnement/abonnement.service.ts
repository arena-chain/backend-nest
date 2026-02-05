import { Injectable } from '@nestjs/common';
import { CreateAbonnementDto } from './dto/create-abonnement.dto';
import { UpdateAbonnementDto } from './dto/update-abonnement.dto';

@Injectable()
export class AbonnementService {
  create(createAbonnementDto: CreateAbonnementDto) {
    return 'This action adds a new abonnement';
  }

  findAll() {
    return `This action returns all abonnement`;
  }

  findOne(id: number) {
    return `This action returns a #${id} abonnement`;
  }

  update(id: number, updateAbonnementDto: UpdateAbonnementDto) {
    return `This action updates a #${id} abonnement`;
  }

  remove(id: number) {
    return `This action removes a #${id} abonnement`;
  }
}
