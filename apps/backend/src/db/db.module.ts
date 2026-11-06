import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { SnowflakeGenerator } from '../common/snowflake.js';
import * as schema from './schema.js';

export const DB = Symbol('DB');
export type Db = NodePgDatabase<typeof schema> & {
  $client: { end(): Promise<void> };
};
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        drizzle(config.getOrThrow<string>('DATABASE_URL'), {
          schema,
          casing: 'snake_case',
        }),
    },
    {
      provide: SnowflakeGenerator,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SnowflakeGenerator(config.get<number>('WORKER_ID', 0)),
    },
  ],
  exports: [DB, SnowflakeGenerator],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(DB) private readonly db: Db) {}

  async onApplicationShutdown() {
    await this.db.$client.end();
  }
}
