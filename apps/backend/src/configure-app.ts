import { RequestMethod, type INestApplication } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter.js';

// Shared by main.ts and e2e tests so both run the same pipeline.
export const configureApp = (app: INestApplication) => {
  // SRS 5.2. REQ-SRV-07: the invite redirect page and assetlinks.json live at the site root.
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'invite/:code', method: RequestMethod.GET },
      { path: '.well-known/assetlinks.json', method: RequestMethod.GET },
    ],
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  // One proxy hop (Caddy, SRS 7.1.1): req.ip is the client, so per-IP limits (REQ-AUTH-02) work.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
};
