import type { TypingRepository } from '../../domain/typing/TypingRepository';

// EXPO_PUBLIC_FAKE=typing: nobody else is listening; Chi's typing comes from FakeGatewayClient.
export const fakeTypingRepository: TypingRepository = {
  start: async () => {},
};
