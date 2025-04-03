/* eslint-disable @typescript-eslint/unbound-method */
import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { CallController } from './call.controller';
import { CallUseCase } from './call.usecase';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { createMockUserToken } from './fixtures';

describe('Testing Call Endpoints', () => {
  let callController: CallController;
  let callUseCase: jest.Mocked<CallUseCase>;

  beforeEach(async () => {
    callUseCase = createMock<CallUseCase>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallController],
      providers: [
        {
          provide: CallUseCase,
          useValue: callUseCase,
        },
      ],
    }).compile();

    callController = module.get<CallController>(CallController);
  });

  describe('Creating a call', () => {
    it('When the user id is not provided (uuid), then an error indicating so is thrown', async () => {
      await expect(
        callController.createCall(
          createMockUserToken({
            payload: { ...createMockUserToken().payload, uuid: undefined },
          }).payload,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('When the user id exists and has meet enabled, then should create the call and the room', async () => {
      const mockUserToken = createMockUserToken();
      const mockResponse = {
        token: 'test-token',
        room: 'room-123',
        paxPerCall: 5,
      };

      callUseCase.validateUserHasNoActiveRoom.mockResolvedValueOnce(undefined);
      callUseCase.createCallAndRoom.mockResolvedValueOnce(mockResponse);

      const result = await callController.createCall(mockUserToken.payload);

      expect(callUseCase.validateUserHasNoActiveRoom).toHaveBeenCalledWith(
        mockUserToken.payload.uuid,
        mockUserToken.payload.email,
      );
      expect(callUseCase.createCallAndRoom).toHaveBeenCalledWith(
        mockUserToken.payload.uuid,
        mockUserToken.payload.email,
      );
      expect(result).toEqual(mockResponse);
    });

    it('When the room already exists, then an error indicating so is thrown', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.validateUserHasNoActiveRoom.mockRejectedValueOnce(
        new ConflictException('User already has an active room as host'),
      );

      await expect(
        callController.createCall(mockUserToken.payload),
      ).rejects.toThrow(ConflictException);
    });

    it('When an unexpected error occurs, then an error indicating so is thrown', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.validateUserHasNoActiveRoom.mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      await expect(
        callController.createCall(mockUserToken.payload),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
