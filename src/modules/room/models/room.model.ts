// src/models/room.model.ts
import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({ tableName: 'rooms', timestamps: true })
export class RoomModel extends Model<RoomModel> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  id: string;

  @Column(DataType.INTEGER)
  max_users_allowed: number;

  @Column(DataType.UUID)
  host_id: string;
}
