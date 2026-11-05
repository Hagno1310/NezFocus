import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthRoutes, type HealthResponse } from '@nezfocus/shared';
import { sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { Public } from '../auth/auth.decorators.js';

@Public()
@Controller()
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get(HealthRoutes.check)
  async check(): Promise<HealthResponse> {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
    return { status: 'ok', db: 'up' };
  }
}
