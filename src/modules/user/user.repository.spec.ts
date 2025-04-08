import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.repository';
import { UserModel } from '../../models/user.model';
import { getModelToken } from '@nestjs/sequelize';
import { User } from './user.domain';
import { Op } from 'sequelize';
import { createMockUser } from './fixtures';
import { v4 } from 'uuid';

describe('UserService', () => {
  let userService: UserService;
  let userModel: DeepMocked<typeof UserModel>;

  beforeEach(async () => {
    userModel = createMock<typeof UserModel>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(UserModel, 'drive'),
          useValue: userModel,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  describe('findByUuid', () => {
    it('should return a user when found by UUID', async () => {
      const mockUser = createMockUser();
      const findOneSpy = jest
        .spyOn(userModel, 'findOne')
        .mockResolvedValueOnce(mockUser as UserModel);

      const result = await userService.findByUuid(mockUser.uuid);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { uuid: mockUser.uuid },
      });
      expect(result).toBeInstanceOf(User);
      expect(result.uuid).toEqual(mockUser.uuid);
    });

    it('should return null when user is not found by UUID', async () => {
      const mockUser = createMockUser();
      const findOneSpy = jest
        .spyOn(userModel, 'findOne')
        .mockResolvedValueOnce(null);

      const result = await userService.findByUuid(mockUser.uuid);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { uuid: mockUser.uuid },
      });
      expect(result).toBeNull();
    });
  });

  describe('findManyByUuid', () => {
    it('should return multiple users when found by UUIDs', async () => {
      const mockUser1 = createMockUser();
      const mockUser2 = createMockUser();

      const uuids = [mockUser1.uuid, mockUser2.uuid];
      const findAllSpy = jest
        .spyOn(userModel, 'findAll')
        .mockResolvedValueOnce([
          mockUser1 as UserModel,
          mockUser2 as UserModel,
        ]);

      const result = await userService.findManyByUuid(uuids);

      expect(findAllSpy).toHaveBeenCalledWith({
        where: { uuid: { [Op.in]: uuids } },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(User);
      expect(result[0].uuid).toEqual(mockUser1.uuid);
      expect(result[1]).toBeInstanceOf(User);
      expect(result[1].uuid).toEqual(mockUser2.uuid);
    });

    it('should return empty array when no users are found by UUIDs', async () => {
      const uuids = [v4(), v4()];
      const findAllSpy = jest
        .spyOn(userModel, 'findAll')
        .mockResolvedValueOnce([]);

      const result = await userService.findManyByUuid(uuids);

      expect(findAllSpy).toHaveBeenCalledWith({
        where: { uuid: { [Op.in]: uuids } },
      });
      expect(result).toHaveLength(0);
    });
  });
});
