import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserModel } from '../../models/user.model';
import { UserService } from './user.repository';

@Module({
  imports: [SequelizeModule.forFeature([UserModel], 'drive')],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
