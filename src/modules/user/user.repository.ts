import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserModel } from '../../models/user.model';
import { User } from './user.domain';
import { UserAttributes } from './user.attributes';
import { Op } from 'sequelize';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(UserModel, 'drive')
    private readonly userModel: typeof UserModel,
  ) {}

  async findByUuid(uuid: UserAttributes['uuid']): Promise<User | null> {
    const user = await this.userModel.findOne({
      where: { uuid },
      attributes: [
        'id',
        'uuid',
        'name',
        'lastname',
        'email',
        'username',
        'avatar',
      ],
    });

    return user ? this.toDomain(user) : null;
  }

  async findManyByUuid(uuids: UserAttributes['uuid'][]): Promise<User[]> {
    const users = await this.userModel.findAll({
      where: { uuid: { [Op.in]: uuids } },
      attributes: [
        'id',
        'uuid',
        'name',
        'lastname',
        'email',
        'username',
        'avatar',
      ],
    });

    return users.map((user) => this.toDomain(user));
  }

  toDomain(model: UserModel): User {
    return User.build({
      ...model.toJSON(),
    });
  }
}
