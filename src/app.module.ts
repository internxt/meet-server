import { Module } from '@nestjs/common';
import { CallModule } from './modules/call/call.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV}`],
      load: [configuration],
      isGlobal: true,
    }),
    CallModule,
  ],
  controllers: [],
})
export class AppModule {}
