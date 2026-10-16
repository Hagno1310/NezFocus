import { Injectable } from '@nestjs/common';
import { ErrorCode } from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import type { CreateExampleBody } from './example.dto.js';
import { ExampleRepository } from './example.repository.js';

@Injectable()
export class ExampleService {
  constructor(
    private readonly repo: ExampleRepository,
    private readonly ids: SnowflakeGenerator,
  ) {}

  create(body: CreateExampleBody) {
    return this.repo.insert({ id: this.ids.next(), name: body.name });
  }

  async get(id: bigint) {
    const row = await this.repo.findById(id);
    if (!row) throw new AppError(ErrorCode.NotFound, 'Example not found');
    return row;
  }
}
