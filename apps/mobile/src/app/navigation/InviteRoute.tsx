import type { InvitePreview } from '@nezfocus/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { pendingInvites } from '../../data/invites';
import { sessionStore } from '../../domain/session/sessionStore';
import { InvitePreviewScreen } from '../../features/servers/screens/InvitePreviewScreen';
import type { RootStackParamList } from './RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Invite'>;

// S-MOD-01 from a link, S-HOME-06 or a pending invite (spec 01 › Điều hướng sau khi vào được
// tài khoản). Signed out it is `guest`; the invite is kept only when a button is pressed.
export function InviteRoute({ navigation, route }: Props) {
  const { code, channel } = route.params;
  const status = useStore(sessionStore, (s) => s.status);
  // Spec 10 › Tương tác: leaving (✕ or Back) drops a pending invite, unless a button just kept it.
  const kept = useRef(false);
  useEffect(
    () => () => {
      if (!kept.current) void pendingInvites.drop(code);
    },
    [code],
  );

  const keep = (
    preview: InvitePreview | null,
    to: 'CreateAccount' | 'SignIn',
  ) => {
    kept.current = true;
    void pendingInvites.keep({
      code,
      channel,
      serverName: preview?.server.name ?? '',
    });
    // Off the stack before signing in: once the session flips, the pending invite reopens it.
    navigation.reset({ index: 1, routes: [{ name: 'Welcome' }, { name: to }] });
  };

  // `arrive` has opened the channel or the room preview (S-ROOM-01 `not-joined`) in the drawers.
  const home = () =>
    navigation.popTo('Main', {
      screen: 'Home',
      params: { screen: 'HomeRoot' },
    });

  return (
    <InvitePreviewScreen
      code={code}
      channelParam={channel}
      guest={
        status === 'signed-out'
          ? {
              onCreateAccount: (p) => keep(p, 'CreateAccount'),
              onSignIn: (p) => keep(p, 'SignIn'),
            }
          : undefined
      }
      onPreview={(p) => {
        const invite = { code, channel, serverName: p.server.name };
        // Mid sign-up (Complete account not done): keep it and go on with the form.
        if (status === 'incomplete') {
          kept.current = true;
          void pendingInvites.keep(invite);
          return navigation.canGoBack()
            ? navigation.goBack()
            : navigation.replace('CompleteAccount');
        }
        // Spec 10 › Chỉ ghi luật: a second link replaces the invite already waiting.
        const waiting = pendingInvites.current();
        if (status === 'signed-out' && waiting && waiting.code !== code)
          void pendingInvites.keep(invite);
      }}
      onClose={() => {
        // Right after Complete account ✕ lands on S-HOME-02 (unmounting drops the invite).
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.replace(status === 'signed-in' ? 'Main' : 'Welcome');
      }}
      onArrive={home}
    />
  );
}
