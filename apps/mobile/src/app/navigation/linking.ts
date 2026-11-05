import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

// ponytail: SRS 3.1 deep link frame on placeholders; real handling + App Links intent filter in P2.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['https://nezfocus.app', 'nezfocus://'],
  config: {
    screens: {
      Invite: 'invite/:code',
      ChannelLink: 'channels/:serverId/:channelId/:messageId?',
    },
  },
};
