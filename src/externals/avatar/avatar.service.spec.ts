import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AvatarService } from './avatar.service';
import configuration from '../../config/configuration';
import { v4 } from 'uuid';
import * as s3RequestPresigner from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/s3-request-presigner');

describe('Avatar Service', () => {
  let service: AvatarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: [`.env.${process.env.NODE_ENV}`],
          load: [configuration],
          isGlobal: true,
        }),
      ],
      providers: [
        {
          provide: AvatarService,
          useFactory: (configService: ConfigService) => {
            return new AvatarService(configService);
          },
          inject: [ConfigService],
        },
      ],
    }).compile();

    service = module.get<AvatarService>(AvatarService);
  });

  describe('Get avatar download url', () => {
    it('When avatar key is null then it should throw an error', async () => {
      const avatarKey = 'key';
      jest
        .spyOn(s3RequestPresigner, 'getSignedUrl')
        .mockRejectedValueOnce(new Error());
      await expect(service.getDownloadUrl(avatarKey)).rejects.toThrow();
    });
    it('When avatar key is not null then it should return an url', async () => {
      const avatarKey = v4();
      const expectedUrl = `https://avatar.network.com/${avatarKey}`;
      jest
        .spyOn(s3RequestPresigner, 'getSignedUrl')
        .mockResolvedValueOnce(expectedUrl);
      const response = await service.getDownloadUrl(avatarKey);
      expect(response).toBe(expectedUrl);
    });
  });
});
