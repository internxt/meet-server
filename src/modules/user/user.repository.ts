import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserModel } from '../../models/user.model';
import { User } from './user.domain';
import { UserAttributes } from './user.attributes';
import { Op } from 'sequelize';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(UserModel, 'drive')
    private readonly userModel: typeof UserModel,
  ) {}

  async findByUuid(uuid: UserAttributes['uuid']): Promise<User | null> {
    const user = await this.userModel.findOne({ where: { uuid } });
    return user ? User.build(user) : null;
  }

  async findManyByUuid(uuids: UserAttributes['uuid'][]): Promise<User[]> {
    const users = await this.userModel.findAll({
      where: { uuid: { [Op.in]: uuids } },
    });
    return users.map((user) => User.build(user));
  }
}
