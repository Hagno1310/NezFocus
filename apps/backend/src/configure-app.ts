import type { INestApplication } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter.js';

// Shared by main.ts and e2e tests so both run the same pipeline.
export const configureApp = (app: INestApplication) => {
  app.setGlobalPrefix('api/v1'); // SRS 5.2
  app.useGlobalFilters(new HttpExceptionFilter());
  // One proxy hop (Caddy, SRS 7.1.1): req.ip is the client, so per-IP limits (REQ-AUTH-02) work.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
};
