import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { Request } from 'express';
import { AppLoggerService } from './pino-logger.service';

const isDevelopment = process.env.NODE_ENV === 'development';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: isDevelopment ? 'debug' : 'info',
        transport: isDevelopment
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: false,
                ignore: 'pid,hostname',
                messageFormat: '{context} {msg}',
                errorLikeObjectKeys: ['err', 'error'],
              },
            }
          : undefined,
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        serializers: {
          req: (req: Request) => ({
            id: req.id,
          }),
          res: undefined,
        },
        autoLogging: false,
      },
    }),
  ],
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}
