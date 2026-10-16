import { ErrorCode } from '@nezfocus/shared';
import { httpStatusOf } from './app-error.js';

describe('httpStatusOf', () => {
  it.each([
    [ErrorCode.ValidationError, 400],
    [ErrorCode.TokenInvalid, 401],
    [ErrorCode.NotFound, 404],
    [ErrorCode.UpgradeRequired, 426],
    [ErrorCode.ServiceUnavailable, 503],
    [ErrorCode.FileTooLarge, 413],
    [ErrorCode.RateLimited, 429],
    [ErrorCode.InviteInvalid, 410],
    [ErrorCode.OwnershipTransferRequired, 409],
  ])('%i -> %i', (code, status) => {
    expect(httpStatusOf(code)).toBe(status);
  });
});
