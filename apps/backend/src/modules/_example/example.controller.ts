import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SnowflakeId } from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CreateExampleBody, toExampleJson } from './example.dto.js';
import { ExampleService } from './example.service.js';

// Thin: validate input, call the service, shape the JSON. Business rules live in the service.
@Controller('examples')
export class ExampleController {
  constructor(private readonly service: ExampleService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateExampleBody)) body: CreateExampleBody,
  ) {
    return toExampleJson(await this.service.create(body));
  }

  @Get(':id')
  async get(@Param('id', new ZodValidationPipe(SnowflakeId)) id: string) {
    return toExampleJson(await this.service.get(BigInt(id)));
  }
}
