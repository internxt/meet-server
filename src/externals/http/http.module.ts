/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HttpsAgent } from 'agentkeepalive';

import { HttpClient } from './http.service';

HttpModule.register({
  httpsAgent: new HttpsAgent({
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 10000,
    freeSocketTimeout: 30000,
  }),
});

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [HttpClient],
  exports: [HttpClient],
})
export class HttpClientModule {}
