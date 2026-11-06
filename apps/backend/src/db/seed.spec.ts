import { assertNotProduction } from './seed.js';

describe('db:seed', () => {
  it('refuses to run in production', () => {
    expect(() => assertNotProduction('production')).toThrow(/production/);
  });

  it('runs in development, test, or when NODE_ENV is unset', () => {
    for (const env of ['development', 'test', undefined])
      expect(() => assertNotProduction(env)).not.toThrow();
  });
});
