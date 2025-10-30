import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

interface RoomModelAttributes {
  id: string;
  maxUsersAllowed: number;
  hostId: string;
  isClosed: boolean;
  removeAt?: Date;
}

@Table({ tableName: 'rooms', timestamps: true, underscored: true })
export class RoomModel extends Model<RoomModel> implements RoomModelAttributes {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  id: string;

  @Column(DataType.INTEGER)
  maxUsersAllowed: number;

  @Column(DataType.UUID)
  hostId: string;

  @Column(DataType.BOOLEAN)
  isClosed: boolean;

  @AllowNull
  @Column(DataType.DATE)
  removeAt?: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
