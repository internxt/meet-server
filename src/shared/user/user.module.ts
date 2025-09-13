import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserModel } from './models/user.model';
import { UserRepository } from './user.repository';

@Module({
  imports: [SequelizeModule.forFeature([UserModel], 'drive')],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
