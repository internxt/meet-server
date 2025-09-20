import {
  Column,
  CreatedAt,
  DataType,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { RoomModel } from './room.model';

interface RoomUserModelAttributes {
  id: string;
  roomId: string;
  userId: string;
  name?: string;
  lastName?: string;
  anonymous: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({
  tableName: 'room_users',
  underscored: true,
})
export class RoomUserModel
  extends Model<RoomUserModel>
  implements RoomUserModelAttributes
{
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @ForeignKey(() => RoomModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  roomId: string;

  @BelongsTo(() => RoomModel)
  room: RoomModel;

  @Column({
    type: DataType.UUID,
  })
  userId: string;

  @Column({
    type: DataType.STRING,
  })
  name?: string;

  @Column({
    type: DataType.STRING,
  })
  lastName?: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  anonymous: boolean;

  @CreatedAt
  createdAt?: Date;

  @UpdatedAt
  updatedAt?: Date;
}
