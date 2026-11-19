import { describe, expect, it } from 'vitest';
import { inviteUrl, parseInviteInput } from './invite.contract.js';

describe('parseInviteInput (S-HOME-06 join-by-code, SRV-07)', () => {
  it('takes a bare code of 8–10 letters and digits', () => {
    expect(parseInviteInput('k7Qm2xPa')).toEqual({ code: 'k7Qm2xPa' });
    expect(parseInviteInput('  Rt4nW8eqZ1 ')).toEqual({ code: 'Rt4nW8eqZ1' });
  });

  it('pulls the code out of a pasted link, with or without https://', () => {
    expect(parseInviteInput('https://nezfocus.app/invite/k7Qm2xPa')).toEqual({
      code: 'k7Qm2xPa',
    });
    expect(parseInviteInput('nezfocus.app/invite/k7Qm2xPa')).toEqual({
      code: 'k7Qm2xPa',
    });
  });

  it('keeps the ?channel= target of a room invite (STUDY-16)', () => {
    expect(
      parseInviteInput(
        'https://nezfocus.app/invite/k7Qm2xPa?channel=1234567890123',
      ),
    ).toEqual({ code: 'k7Qm2xPa', channelId: '1234567890123' });
  });

  it('refuses anything else', () => {
    for (const text of [
      '',
      'k7Qm2x',
      'k7Qm2xPa123',
      'k7Qm-2xPa',
      'https://example.com/invite/k7Qm2xPa',
      'https://nezfocus.app/channels/1/2',
    ])
      expect(parseInviteInput(text)).toBeNull();
  });
});

describe('inviteUrl', () => {
  it('builds the link the sheet shares', () => {
    expect(inviteUrl('k7Qm2xPa')).toBe('https://nezfocus.app/invite/k7Qm2xPa');
    expect(inviteUrl('k7Qm2xPa', '42')).toBe(
      'https://nezfocus.app/invite/k7Qm2xPa?channel=42',
    );
  });
});
