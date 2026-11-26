import { describe, expect, it } from 'vitest';
import { permissionStep } from './mediaPermission';

describe('S-MOD-05 flow', () => {
  it.each([
    [{ granted: true, asked: true, canAskAgain: false }, 'granted'],
    [{ granted: false, asked: false, canAskAgain: true }, 'explain'],
    [{ granted: false, asked: true, canAskAgain: true }, 'ask'],
    [{ granted: false, asked: true, canAskAgain: false }, 'blocked'],
  ] as const)('%o → %s', (p, step) => {
    expect(permissionStep(p)).toBe(step);
  });
});
