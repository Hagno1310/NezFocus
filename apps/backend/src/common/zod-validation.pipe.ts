import { PipeTransform } from '@nestjs/common';
import { ErrorCode } from '@nezfocus/shared';
import type { ZodType } from 'zod';
import { AppError } from './app-error.js';

// Usage: @Body(new ZodValidationPipe(CreateFooBody)) body: CreateFooBody
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const errors: Record<string, { code: string; message: string }[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || '_';
      (errors[field] ??= []).push({
        code: issue.code.toUpperCase(),
        message: issue.message,
      });
    }
    throw new AppError(ErrorCode.ValidationError, 'Invalid request', errors);
  }
}
