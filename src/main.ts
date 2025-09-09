import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import configuration from './config/configuration';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConsoleLogger } from '@nestjs/common';

const config = configuration();
const APP_PORT = config.port || 3000;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({
      colors: config.isDevelopment,
      prefix: 'meet-server',
      compact: config.isProduction,
    }),
  });

  app.enableCors();
  app.use(helmet());
  app.disable('x-powered-by');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Meet API')
    .setDescription('Meet API')
    .setVersion('1.0')
    .addBearerAuth()
    .addBearerAuth(undefined, 'gateway')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const customOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
    },
  };

  SwaggerModule.setup('api', app, document, customOptions);

  await app.listen(APP_PORT ?? 3000);
}

bootstrap().catch(() => {});
