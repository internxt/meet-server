// src/models/room-user.model.ts
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Room } from './room.model';

@Table({ tableName: 'room_users', timestamps: true })
export class RoomUser extends Model<RoomUser> {
  @PrimaryKey
  @Column({ type: DataType.INTEGER, autoIncrement: true })
  id: number;

  @ForeignKey(() => Room)
  @Column({ type: DataType.UUID })
  room_id: string;

  @Column(DataType.INTEGER)
  user_id: number;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  lastname: string;

  @BelongsTo(() => Room)
  room: Room;
}
