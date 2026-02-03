import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { ValidationError } from 'sequelize';
import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import {
  HttpGlobalExceptionFilter,
  RequestWithUser,
} from './http-exception-filter';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { v4 } from 'uuid';

interface LogPayload {
  errorType: string;
  requestId: string;
  statusCode: number;
  method: string;
  path: string;
  name?: string;
  user?: RequestWithUser['user'];
  error?: {
    message: string;
    stack?: string;
  };
}

describe('HttpGlobalExceptionFilter', () => {
  let filter: HttpGlobalExceptionFilter;
  let mockHttpAdapter: DeepMocked<HttpAdapterHost['httpAdapter']>;
  let mockHttpAdapterHost: DeepMocked<HttpAdapterHost>;
  let loggerMock: DeepMocked<Logger>;

  beforeEach(async () => {
    mockHttpAdapter = createMock<HttpAdapterHost['httpAdapter']>();
    mockHttpAdapterHost = createMock<HttpAdapterHost>({
      httpAdapter: mockHttpAdapter,
    });
    loggerMock = createMock<Logger>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpGlobalExceptionFilter,
        {
          provide: HttpAdapterHost,
          useValue: mockHttpAdapterHost,
        },
      ],
    })
      .setLogger(loggerMock)
      .compile();
    filter = module.get<HttpGlobalExceptionFilter>(HttpGlobalExceptionFilter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HttpException handling', () => {
    it('When a 4xx HttpException is thrown, it should reply with its status and log a warning', () => {
      const requestId = v4();
      const exception = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );
      const host = createMockArgumentsHost(
        '/call/123',
        'GET',
        null,
        {},
        requestId,
      );

      filter.catch(exception, host);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        expect.anything(),
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Bad Request',
          requestId,
        },
        HttpStatus.BAD_REQUEST,
      );
      expect(loggerMock.warn).toHaveBeenCalled();
      const [payload, message] = loggerMock.warn.mock.calls[0] as [
        LogPayload,
        string,
      ];
      expect(payload).toMatchObject({
        errorType: 'HTTP_ERROR',
        requestId,
        statusCode: 400,
        method: 'GET',
        path: '/call/123',
      });
      expect(message).toBe('GET /call/123 400');
    });

    it.each([
      HttpStatus.UNAUTHORIZED,
      HttpStatus.FORBIDDEN,
      HttpStatus.NOT_FOUND,
    ])(
      'When a %s HttpException is thrown, it should reply but not log',
      (status) => {
        const exception = new HttpException('Ignored', status);
        const host = createMockArgumentsHost('/call', 'GET');

        filter.catch(exception, host);

        expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          status,
        );
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
      },
    );

    it('When a 5xx HttpException is thrown, it should reply with its status and log an error', () => {
      const requestId = v4();
      const exception = new HttpException(
        'Something broke',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      const host = createMockArgumentsHost(
        '/call',
        'POST',
        { uuid: 'user-uuid' },
        {},
        requestId,
      );

      filter.catch(exception, host);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        expect.anything(),
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Something broke',
          requestId,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(loggerMock.error).toHaveBeenCalled();
      const [payload, message] = loggerMock.error.mock.calls[0] as [
        LogPayload,
        string,
      ];
      expect(payload).toMatchObject({
        errorType: 'HTTP_ERROR',
        requestId,
        statusCode: 500,
        method: 'POST',
        path: '/call',
        user: { uuid: 'user-uuid' },
      });
      expect(message).toBe('POST /call 500');
    });

    it('When a 3xx or lower HttpException is thrown, it should not log', () => {
      const exception = new HttpException(
        'Redirect',
        HttpStatus.MOVED_PERMANENTLY,
      );
      const host = createMockArgumentsHost('/old-path', 'GET');

      filter.catch(exception, host);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        HttpStatus.MOVED_PERMANENTLY,
      );
      expect(loggerMock.error).not.toHaveBeenCalled();
      expect(loggerMock.warn).not.toHaveBeenCalled();
    });

    it('When HttpException has an object response, it should pass it through', () => {
      const responseBody = {
        statusCode: 400,
        message: ['field must be a string'],
        error: 'Bad Request',
      };
      const exception = new HttpException(responseBody, HttpStatus.BAD_REQUEST);
      const host = createMockArgumentsHost('/call', 'POST');

      filter.catch(exception, host);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        expect.anything(),
        responseBody,
        HttpStatus.BAD_REQUEST,
      );
    });
  });

  describe('Unexpected errors', () => {
    it('When a generic Error is thrown, it should log with UNEXPECTED_ERROR and return 500', () => {
      const requestId = v4();
      const exception = new Error('Something unexpected');
      const host = createMockArgumentsHost(
        '/call/123/users/join',
        'POST',
        { email: 'user@test.com', uuid: 'user-uuid', id: 1 },
        { name: 'John' },
        requestId,
      );

      filter.catch(exception, host);

      expect(loggerMock.error).toHaveBeenCalled();
      const [payload, message] = loggerMock.error.mock.calls[0] as [
        LogPayload,
        string,
      ];
      expect(payload).toMatchObject({
        errorType: 'UNEXPECTED_ERROR',
        requestId,
        statusCode: 500,
        name: 'Error',
        method: 'POST',
        path: '/call/123/users/join',
        user: { uuid: 'user-uuid', id: 1 },
        error: {
          message: 'Something unexpected',
        },
      });
      expect(payload.error?.stack).toBeDefined();
      expect(message).toBe('POST /call/123/users/join 500 - UNEXPECTED_ERROR');

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        expect.anything(),
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal Server Error',
          requestId,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });

    it('When a SequelizeError is thrown, it should log with DATABASE subtype', () => {
      const exception = new ValidationError('Database validation error', []);
      const host = createMockArgumentsHost('/call', 'POST', {
        uuid: 'user-uuid',
      });

      filter.catch(exception, host);

      expect(loggerMock.error).toHaveBeenCalled();
      const [payload, message] = loggerMock.error.mock.calls[0] as [
        LogPayload,
        string,
      ];
      expect(payload.errorType).toBe('UNEXPECTED_ERROR/DATABASE');
      expect(message).toBe('POST /call 500 - UNEXPECTED_ERROR/DATABASE');
    });

    it('When an AxiosError is thrown, it should log with EXTERNAL_SERVICE subtype', () => {
      const config = {
        headers: new AxiosHeaders(),
      } as InternalAxiosRequestConfig;
      const exception = new AxiosError(
        'External service error',
        'ETIMEDOUT',
        config,
        {},
        {
          status: 500,
          data: 'Error',
          statusText: 'Error',
          headers: {},
          config,
        },
      );
      const host = createMockArgumentsHost('/call', 'POST', {
        uuid: 'user-uuid',
      });

      filter.catch(exception, host);

      expect(loggerMock.error).toHaveBeenCalled();
      const [payload, message] = loggerMock.error.mock.calls[0] as [
        LogPayload,
        string,
      ];
      expect(payload.errorType).toBe('UNEXPECTED_ERROR/EXTERNAL_SERVICE');
      expect(message).toBe(
        'POST /call 500 - UNEXPECTED_ERROR/EXTERNAL_SERVICE',
      );
    });

    it('When request has no user, it should handle it gracefully', () => {
      const exception = new Error('Unexpected error');
      const host = createMockArgumentsHost('/call', 'GET', null);

      filter.catch(exception, host);

      expect(loggerMock.error).toHaveBeenCalled();
      const [payload] = loggerMock.error.mock.calls[0] as [LogPayload];
      expect(payload.user).toEqual({
        uuid: undefined,
        id: undefined,
      });
      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        }),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });
  });

  describe('Database connection errors', () => {
    it('When a Sequelize connection error is thrown, it should return 503 and log', () => {
      const exception = new Error('Connection refused');
      exception.name = 'SequelizeConnectionRefusedError';
      const host = createMockArgumentsHost('/call', 'GET', {
        uuid: 'user-uuid',
      });

      filter.catch(exception, host);

      expect(loggerMock.error).toHaveBeenCalled();
      const [payload, message] = loggerMock.error.mock.calls[0] as [
        LogPayload,
        string,
      ];
      expect(payload).toMatchObject({
        errorType: 'DATABASE_CONNECTION_ERROR',
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        name: 'SequelizeConnectionRefusedError',
        method: 'GET',
        path: '/call',
      });
      expect(message).toContain('GET /call 503');

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Service temporarily unavailable',
        }),
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    });

    it.each([
      'SequelizeConnectionAcquireTimeoutError',
      'SequelizeConnectionError',
      'SequelizeConnectionRefusedError',
      'SequelizeConnectionTimedOutError',
    ])('should detect %s as a database connection error', (errorName) => {
      const exception = new Error('db error');
      exception.name = errorName;
      const host = createMockArgumentsHost('/call', 'GET');

      filter.catch(exception, host);

      const [payload] = loggerMock.error.mock.calls[0] as [LogPayload];
      expect(payload.errorType).toBe('DATABASE_CONNECTION_ERROR');
    });
  });

  describe('Filter self-protection', () => {
    it('When the filter itself throws, it should fallback to the parent BaseExceptionFilter', () => {
      const exception = new Error('Original error');
      const host = createMockArgumentsHost('/call', 'GET', {
        uuid: 'user-uuid',
      });

      loggerMock.error.mockImplementationOnce(() => {
        throw new Error('Error in filter');
      });

      const superCatchSpy = jest.spyOn(BaseExceptionFilter.prototype, 'catch');

      filter.catch(exception, host);

      expect(superCatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error in filter' }),
        host,
      );

      superCatchSpy.mockRestore();
    });
  });
});

const createMockArgumentsHost = (
  url: string,
  method: string,
  user: RequestWithUser['user'] | null = null,
  body: RequestWithUser['body'] = {},
  id: string = v4(),
) =>
  createMock<ArgumentsHost>({
    switchToHttp: () => ({
      getRequest: () => ({
        url,
        method,
        user,
        body,
        id,
      }),
      getResponse: () => ({}),
    }),
  });
