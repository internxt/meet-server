/* eslint-disable @typescript-eslint/require-await */
import { Logger, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CallModule } from './modules/call/call.module';
import { HealthModule } from './modules/health/health.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { format } from 'sql-formatter';
import { decodeDbCaCert } from './config/db-ca-cert';
import { SharedModule } from './shared/shared.module';
import { LoggerModule } from './common/logger/logger.module';
import { HttpGlobalExceptionFilter } from './common/http-exception-filter';

const defaultDbConfig = (
  configService: ConfigService,
  caCertConfigKey: 'database.caCert' | 'driveDatabase.caCert',
): SequelizeModuleOptions => ({
  dialect: 'postgres' as const,
  autoLoadModels: true,
  synchronize: false,
  pool: {
    max: 20,
    min: 0,
    idle: 20000,
    acquire: 20000,
  },
  dialectOptions: configService.get<boolean>('isProduction')
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: true,
          ca: decodeDbCaCert(configService.get<string>(caCertConfigKey)),
        },
        application_name: 'meet-server',
      }
    : {},
  logging: !configService.get<boolean>('database.debug')
    ? false
    : (content: string) => {
        const parse = content.match(/^(Executing \(.*\):) (.*)$/);
        if (parse) {
          const prettySql = format(parse[2], { language: 'postgresql' });
          Logger.debug(`${parse[1]}\n${prettySql}`);
        } else {
          Logger.debug(`Could not parse sql content: ${content}`);
        }
      },
});

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV}`],
      load: [configuration],
      isGlobal: true,
    }),
    LoggerModule,
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        ...defaultDbConfig(configService, 'database.caCert'),
      }),
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: 'drive',
      useFactory: async (configService: ConfigService) => ({
        host: configService.get('driveDatabase.host'),
        port: configService.get('driveDatabase.port'),
        username: configService.get('driveDatabase.username'),
        password: configService.get('driveDatabase.password'),
        database: configService.get('driveDatabase.database'),
        ...defaultDbConfig(configService, 'driveDatabase.caCert'),
      }),
    }),
    CallModule,
    SharedModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpGlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
