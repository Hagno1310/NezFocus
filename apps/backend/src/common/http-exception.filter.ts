import { randomUUID } from 'node:crypto';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiErrorBody, ErrorCode } from '@nezfocus/shared';
import type { Request, Response } from 'express';
import { AppError } from './app-error.js';

// Every error leaves the API in the SRS 5.2 shape.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = req.header('x-request-id') ?? randomUUID();

    let status = 500;
    let body: ApiErrorBody = {
      code: ErrorCode.InternalError,
      message: 'Internal error',
    };

    if (exception instanceof AppError) {
      status = exception.status;
      const { retryAfter, attemptsLeft, reason } = exception.details;
      body = {
        code: exception.code,
        message: exception.message,
        errors: exception.errors,
        retry_after: retryAfter,
        attempts_left: attemptsLeft,
        reason,
      };
      if (retryAfter !== undefined) res.setHeader('Retry-After', retryAfter);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const code =
        status === 404
          ? ErrorCode.NotFound
          : status < 500
            ? ErrorCode.ValidationError
            : ErrorCode.InternalError;
      body = { code, message: exception.message };
    } else {
      this.logger.error({ requestId, err: exception });
    }

    res.status(status).json({
      ...body,
      request_id: requestId,
      retry_after: body.retry_after ?? null,
    });
  }
}
