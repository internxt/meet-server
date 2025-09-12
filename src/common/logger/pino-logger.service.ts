import { Injectable, LoggerService } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Injectable()
export class AppLoggerService extends Logger implements LoggerService {}
