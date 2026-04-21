// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import {
  AdminProfile,
  AdminProfileSchema,
} from './schemas/admin-profile.schema';
import { UsersModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminProfile.name, schema: AdminProfileSchema },
    ]),
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
