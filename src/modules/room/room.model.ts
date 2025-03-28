// src/models/room.model.ts
import {
  Column,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { RoomUser } from './room-user.model';

@Table({ tableName: 'rooms', timestamps: true })
export class Room extends Model<Room> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  id: string;

  @Column(DataType.INTEGER)
  max_users_allowed: number;

  @Column(DataType.INTEGER)
  host_id: number;

  @HasMany(() => RoomUser)
  users: RoomUser[];
}
