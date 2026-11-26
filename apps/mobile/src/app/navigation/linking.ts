import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

// SRS 3.1 / 7.3.5 deep links (App Links in app.config.ts): /invite/<code>?channel= → S-MOD-01
// (REQ-SRV-07); /channels/… and /dm/… → the channel / DM, a message highlighted (MSG-05 CR-19).
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['https://nezfocus.app', 'nezfocus://'],
  config: {
    screens: {
      Invite: 'invite/:code',
      ChannelLink: 'channels/:serverId/:channelId/:messageId?',
      DmLink: 'dm/:channelId/:messageId?',
    },
  },
};
