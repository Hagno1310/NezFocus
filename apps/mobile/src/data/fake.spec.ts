import { describe, expect, it } from 'vitest';
import { parseFakeAreas, pickRepository } from './fake';

describe('parseFakeAreas', () => {
  it('splits a comma list and ignores spaces and empty items', () => {
    expect(parseFakeAreas(' auth, servers,,')).toEqual(
      new Set(['auth', 'servers']),
    );
  });

  it('is empty when the variable is unset', () => {
    expect(parseFakeAreas(undefined).size).toBe(0);
  });
});

describe('pickRepository', () => {
  const impls = { remote: 'remote', fake: 'fake' };

  it('returns the fake only for listed areas', () => {
    const fakes = new Set(['auth']);
    expect(pickRepository('auth', impls, fakes)).toBe('fake');
    expect(pickRepository('servers', impls, fakes)).toBe('remote');
  });
});
