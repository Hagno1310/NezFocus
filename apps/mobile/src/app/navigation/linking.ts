import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

// SRS 3.1 deep links. /invite/<code>?channel= → S-MOD-01 (REQ-SRV-07; App Link in app.config.ts).
// ponytail: ChannelLink is a placeholder until message / channel links, P3-A1.3 (#122); their App
// Link path joins the intent filter then.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['https://nezfocus.app', 'nezfocus://'],
  config: {
    screens: {
      Invite: 'invite/:code',
      ChannelLink: 'channels/:serverId/:channelId/:messageId?',
    },
  },
};
