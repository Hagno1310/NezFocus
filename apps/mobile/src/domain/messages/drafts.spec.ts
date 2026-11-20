import { describe, expect, it } from 'vitest';
import { createDrafts } from './drafts';

describe('drafts (7.3.2, C-11: kept per channel until the app exits)', () => {
  it('keeps one draft per channel', () => {
    const d = createDrafts();
    d.set('7', 'câu 3');
    d.set('8', 'câu 5');
    expect(d.state.getState()).toEqual({ '7': 'câu 3', '8': 'câu 5' });
  });

  it('an empty draft is dropped, not stored', () => {
    const d = createDrafts();
    d.set('7', 'x');
    d.set('7', '');
    expect(d.state.getState()).toEqual({});
  });

  it('channel-removed drops that draft only; sign-out drops all', () => {
    const d = createDrafts();
    d.set('7', 'a');
    d.set('8', 'b');
    d.drop('7');
    expect(d.state.getState()).toEqual({ '8': 'b' });
    d.reset();
    expect(d.state.getState()).toEqual({});
  });
});
