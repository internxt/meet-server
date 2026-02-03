import {
  Catch,
  HttpException,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseError as SequelizeError } from 'sequelize';
import { AxiosError } from 'axios';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';

export interface RequestWithUser {
  id: string;
  url: string;
  method: string;
  body: Record<string, unknown>;
  user?: {
    email?: string;
    uuid?: string;
    id?: number;
  };
}

@Catch()
export class HttpGlobalExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(HttpGlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithUser>();
    const response = ctx.getResponse<Response>();
    const requestId = request.id;

    try {
      if (exception instanceof HttpException) {
        const status = exception.getStatus();

        this.logHttpException(exception, request, status);

        const res = exception.getResponse();
        const message =
          typeof res === 'object' && res !== null
            ? res
            : { statusCode: status, message: res, requestId };

        httpAdapter.reply(response, message, status);
        return;
      }

      const error =
        exception instanceof Error ? exception : new Error('Unknown error');

      if (this.isDatabaseConnectionError(exception)) {
        this.logDatabaseConnectionError(error, request);

        httpAdapter.reply(
          response,
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Service temporarily unavailable',
            requestId,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
        return;
      }

      this.logUnexpectedError(error, request);

      httpAdapter.reply(
        response,
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal Server Error',
          requestId,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error('Unknown error in filter');
      this.logger.error(
        {
          errorType: 'EXCEPTION_FILTER_ERROR',
          method: request.method,
          path: request.url,
          user: {
            uuid: request?.user?.uuid,
          },
          error: {
            message: err.message,
            stack: err.stack,
          },
        },
        'EXCEPTION_FILTER_ERROR',
      );

      super.catch(err, host);
    }
  }

  private static readonly IGNORED_HTTP_STATUSES = new Set([
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  ]);

  private logHttpException(
    exception: HttpException,
    request: RequestWithUser,
    status: number,
  ) {
    if (HttpGlobalExceptionFilter.IGNORED_HTTP_STATUSES.has(status)) {
      return;
    }

    const logPayload = {
      errorType: 'HTTP_ERROR',
      requestId: request.id,
      statusCode: status,
      method: request.method,
      path: request.url,
      user: {
        uuid: request.user?.uuid,
      },
      error: {
        message: exception.message,
      },
    };

    const logMessage = `${request.method} ${request.url} ${status}`;

    if (status >= 500) {
      this.logger.error(logPayload, logMessage);
    } else if (status >= 400) {
      this.logger.warn(logPayload, logMessage);
    }
  }

  private isDatabaseConnectionError(exception: unknown): boolean {
    const connectionErrorNames = [
      'SequelizeConnectionAcquireTimeoutError',
      'SequelizeConnectionError',
      'SequelizeConnectionRefusedError',
      'SequelizeConnectionTimedOutError',
    ];

    return connectionErrorNames.includes(
      (exception as { name?: string })?.name ?? '',
    );
  }

  private logDatabaseConnectionError(
    exception: Error,
    request: RequestWithUser,
  ) {
    this.logger.error(
      {
        errorType: 'DATABASE_CONNECTION_ERROR',
        requestId: request.id,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        name: exception.name,
        method: request.method,
        path: request.url,
        user: {
          uuid: request.user?.uuid,
        },
        error: {
          message: exception.message,
        },
      },
      `${request.method} ${request.url} 503 - ${exception.name}`,
    );
  }

  private logUnexpectedError(exception: Error, request: RequestWithUser) {
    let errorSubtype = '';
    if (exception instanceof SequelizeError) {
      errorSubtype = 'DATABASE';
    } else if (exception instanceof AxiosError) {
      errorSubtype = 'EXTERNAL_SERVICE';
    }

    const errorType = errorSubtype
      ? `UNEXPECTED_ERROR/${errorSubtype}`
      : 'UNEXPECTED_ERROR';

    this.logger.error(
      {
        errorType,
        requestId: request.id,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        name: exception.name,
        method: request.method,
        path: request.url,
        user: {
          uuid: request.user?.uuid,
          id: request.user?.id,
        },
        error: {
          message: exception.message,
          stack: exception.stack,
        },
      },
      `${request.method} ${request.url} 500 - ${errorType}`,
    );
  }
}
