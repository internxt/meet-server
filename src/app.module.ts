/* eslint-disable @typescript-eslint/require-await */
import { Logger, Module } from '@nestjs/common';
import { CallModule } from './modules/call/call.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { SequelizeModule } from '@nestjs/sequelize';
import { format } from 'sql-formatter';

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
        dialect: 'postgres',
        autoLoadModels: true,
        synchronize: false,
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        replication: !configService.get('isDevelopment')
          ? configService.get('database.replication')
          : false,
        pool: {
          maxConnections: Number.MAX_SAFE_INTEGER,
          maxIdleTime: 30000,
          max: 20,
          min: 0,
          idle: 20000,
          acquire: 20000,
        },
        dialectOptions: configService.get('isProduction')
          ? {
              ssl: {
                require: true,
                rejectUnauthorized: false,
              },
              application_name: 'meet-server',
            }
          : {},
        logging: !configService.get('database.debug')
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
      }),
    }),
    CallModule,
  ],
  controllers: [],
})
export class AppModule {}
