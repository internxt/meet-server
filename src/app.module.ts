/* eslint-disable @typescript-eslint/require-await */
import { Logger, Module } from '@nestjs/common';
import { CallModule } from './modules/call/call.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { format } from 'sql-formatter';
import { ReplicationOptions } from 'sequelize';
import { UserModule } from './modules/user/user.module';

const defaultDbConfig = (
  configService: ConfigService,
): SequelizeModuleOptions => ({
  dialect: 'postgres' as const,
  autoLoadModels: true,
  synchronize: false,
  replication: !configService.get<boolean>('isDevelopment')
    ? configService.get<ReplicationOptions>('database.replication')
    : (false as const),
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
          rejectUnauthorized: false,
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
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        ...defaultDbConfig(configService),
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
        ...defaultDbConfig(configService),
      }),
    }),
    CallModule,
    UserModule,
  ],
  controllers: [],
})
export class AppModule {}
