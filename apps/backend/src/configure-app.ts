import type { INestApplication } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter.js';

// Shared by main.ts and e2e tests so both run the same pipeline.
export const configureApp = (app: INestApplication) => {
  app.setGlobalPrefix('api/v1'); // SRS 5.2
  app.useGlobalFilters(new HttpExceptionFilter());
};
