import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import { AvatarService } from '../../externals/avatar/avatar.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let sequelize: DeepMocked<Sequelize>;
  let avatarService: DeepMocked<AvatarService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<HealthService>(HealthService);
    avatarService = module.get<DeepMocked<AvatarService>>(AvatarService)
    sequelize = module.get<DeepMocked<Sequelize>>(Sequelize);
  });

  describe('check', () => {
    it('When DB and S3 succeed, then it returns ok payload', async () => {
      avatarService.checkBucket.mockResolvedValue({ status: 'ok', ping: 1 });
      sequelize.authenticate.mockResolvedValue(undefined);

      const result = await service.check();

      expect(result).toStrictEqual({
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        status: 'ok',
        db: {
          status: 'ok',
          ping: expect.any(Number)
        },
        s3: {
          status: 'ok',
          ping: 1
        }
      })
    });

    it('When DB fails, then it marks degraded and retains S3', async () => {
      sequelize.authenticate.mockRejectedValue(new Error('db-down'));
      avatarService.checkBucket.mockResolvedValue({ status: 'ok', ping: 1 });

      const result = await service.check();

      expect(result).toStrictEqual({
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        status: 'degraded',
        s3: {
          status: 'ok',
          ping: 1
        }
      })
    });

    it('When S3 fails, then it marks degraded and retains DB', async () => {
      avatarService.checkBucket.mockRejectedValue(new Error('failing'));
      sequelize.authenticate.mockResolvedValue(undefined);

      const result = await service.check();

      expect(result).toStrictEqual({
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        status: 'degraded',
        db: {
          status: 'ok',
          ping: expect.any(Number)
        },
      });
    });
  });
});
