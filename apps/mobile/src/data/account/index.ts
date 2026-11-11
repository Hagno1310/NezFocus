import { pickRepository } from '../fake';
import { fakeAccountRepository } from './FakeAccountRepository';
import { remoteAccountRepository } from './RemoteAccountRepository';

export const accountRepository = pickRepository('account', {
  remote: remoteAccountRepository,
  fake: fakeAccountRepository,
});
