import { pickRepository } from '../fake';
import { fakeAuthRepository } from './FakeAuthRepository';
import { remoteAuthRepository } from './RemoteAuthRepository';

export const authRepository = pickRepository('auth', {
  remote: remoteAuthRepository,
  fake: fakeAuthRepository,
});
