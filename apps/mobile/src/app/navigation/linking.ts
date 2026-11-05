import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

// SRS 3.1 › Deep link. Frame only: both open placeholders; real handling (invite preview, message
// highlight, Android App Links intent filter + assetlinks.json) comes in P2.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['https://nezfocus.app', 'nezfocus://'],
  config: {
    screens: {
      Invite: 'invite/:code',
      ChannelLink: 'channels/:serverId/:channelId/:messageId?',
    },
  },
};
