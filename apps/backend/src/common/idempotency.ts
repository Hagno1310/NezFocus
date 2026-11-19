import { createHash } from 'node:crypto';
import {
  Injectable,
  UseInterceptors,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import {
  ClientRequestId,
  ErrorCode,
  IDEMPOTENCY_KEY_HEADER,
} from '@nezfocus/shared';
import { catchError, from, of, switchMap, type Observable } from 'rxjs';
import { KeyValueStore } from '../redis/key-value-store.js';
import { AppError } from './app-error.js';

const TTL_SECONDS = 24 * 60 * 60; // REQ-MSG-09: 24 hours per (user, key)
const RUNNING = 'running';

type Saved = { hash: string; status: number; body: unknown };

type IdempotentRequest = {
  method: string;
  originalUrl: string;
  body: unknown;
  user?: { userId: bigint };
  header(name: string): string | undefined;
};
type IdempotentResponse = { statusCode: number; status(code: number): unknown };

// REQ-MSG-09 AC2: a create endpoint with @Idempotent() replays its first result for a repeated
// Idempotency-Key; another body under the same key, or a repeat while the first still runs,
// is 40907. A failed request frees the key so the app's retry runs again.
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly store: KeyValueStore) {}

  async intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = ctx.switchToHttp().getRequest<IdempotentRequest>();
    const res = ctx.switchToHttp().getResponse<IdempotentResponse>();
    const header = req.header(IDEMPOTENCY_KEY_HEADER);
    if (header === undefined || !req.user) return next.handle();
    if (!ClientRequestId.safeParse(header).success)
      throw new AppError(ErrorCode.ValidationError, 'bad Idempotency-Key');

    const key = `idem:${req.user.userId}:${header}`;
    const hash = createHash('sha256')
      .update(`${req.method} ${req.originalUrl} ${JSON.stringify(req.body)}`)
      .digest('hex');

    if (!(await this.store.setIfAbsent(key, RUNNING, TTL_SECONDS))) {
      const raw = await this.store.get(key);
      const saved = raw && raw !== RUNNING ? (JSON.parse(raw) as Saved) : null;
      if (saved?.hash !== hash)
        throw new AppError(
          ErrorCode.IdempotencyKeyReused,
          'Idempotency-Key already used',
        );
      res.status(saved.status);
      return of(saved.body);
    }

    return next.handle().pipe(
      switchMap((body) => {
        const saved: Saved = { hash, status: res.statusCode, body };
        return from(
          this.store
            .set(key, JSON.stringify(saved), TTL_SECONDS)
            .then(() => body),
        );
      }),
      catchError((err: unknown) =>
        from(
          this.store.delete(key).then(() => {
            throw err;
          }),
        ),
      ),
    );
  }
}

export const Idempotent = () => UseInterceptors(IdempotencyInterceptor);
