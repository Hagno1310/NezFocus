import { PipeTransform } from '@nestjs/common';
import { ErrorCode } from '@nezfocus/shared';
import type { ZodType } from 'zod';
import { AppError, type FieldErrors } from './app-error.js';

// Usage: @Body(new ZodValidationPipe(CreateFooBody)) body: CreateFooBody
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || '_';
      // Shared rules (checkUsername / checkPassword) put their own code in params.
      const ruleCode =
        issue.code === 'custom'
          ? (issue.params as { code?: unknown } | undefined)?.code
          : undefined;
      (errors[field] ??= []).push({
        code:
          typeof ruleCode === 'string' ? ruleCode : issue.code.toUpperCase(),
        message: issue.message,
      });
    }
    throw new AppError(ErrorCode.ValidationError, 'Invalid request', errors);
  }
}
