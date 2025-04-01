import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

interface RoomModelAttributes {
  id: string;
  max_users_allowed: number;
  host_id: string;
}

@Table({ tableName: 'rooms', timestamps: true })
export class RoomModel extends Model<RoomModel> implements RoomModelAttributes {
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
