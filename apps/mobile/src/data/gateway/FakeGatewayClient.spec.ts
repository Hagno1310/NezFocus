import type { DispatchEvent } from '@nezfocus/shared';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  gatewayStore,
  onGatewayEvent,
} from '../../domain/gateway/gatewayStore';
import { createFakeGatewayClient } from './FakeGatewayClient';

const an = {
  id: '1',
  email: 'an.nguyen@gmail.com',
  username: 'an.nguyen',
  display_name: 'An',
  bio: null,
  avatar: null,
  account_completed: true,
  created_at: '2026-10-01T08:00:00.000Z',
};

let events: DispatchEvent[];
let off: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  events = [];
  off = onGatewayEvent((e) => events.push(e));
});
afterEach(() => {
  off();
  vi.useRealTimers();
});

it('sends READY, then plays the scenario at its times', () => {
  const client = createFakeGatewayClient([
    { after: 3000, t: 'USER_UPDATE', d: { ...an, display_name: 'An Nguyễn' } },
  ]);
  client.start();
  expect(gatewayStore.getState().status).toBe('connected');
  expect(events.map((e) => [e.t, e.s])).toEqual([['READY', 1]]);
  vi.advanceTimersByTime(2999);
  expect(events).toHaveLength(1);
  vi.advanceTimersByTime(1);
  expect(events[1]).toMatchObject({
    t: 'USER_UPDATE',
    s: 2,
    d: { display_name: 'An Nguyễn' },
  });
});

it('stop() cancels what has not played yet', () => {
  const client = createFakeGatewayClient([
    { after: 3000, t: 'USER_UPDATE', d: an },
  ]);
  client.start();
  client.stop();
  vi.advanceTimersByTime(5000);
  expect(events.map((e) => e.t)).toEqual(['READY']);
  expect(gatewayStore.getState().status).toBe('idle');
});
