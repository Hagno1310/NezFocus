import {
  normalizeUsernameQuery,
  REQUEST_MESSAGE_MAX,
  type UserLookupResponse,
} from '@nezfocus/shared';
import { randomUUID } from 'expo-crypto';
import { AtSign, UserCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ApiError } from '../../../data/api/client';
import { friendActions } from '../../../data/friends';
import {
  addFriendError,
  mutualLine,
  primaryAction,
  type AddFriendErrorKey,
} from '../../../domain/friends/addFriend';
import { nameOf } from '../../../domain/friends/friends';
import { radius, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { Avatar } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { useMe } from '../../me/hooks/useMe';

type Problem = { key: AddFriendErrorKey | 'self'; until?: number };

// Chốt 20/11/2026: after 40029 on send, "Gửi lời mời" stays off until the window ends, even
// if the sheet is closed and opened again.
let sendBlockedUntil = 0;

// S-DM-05 Thêm bạn (REQ-FRIEND-01 v1.9): look up, see the card, then send. The caller gives it a
// new `key` on each opening, so it starts empty.
export function AddFriendSheet({
  visible,
  onDismiss,
  onSent,
  onBecameFriends,
  onOpenDm,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSent: () => void;
  onBecameFriends: () => void;
  onOpenDm: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const me = useMe().data;
  const [input, setInput] = useState('');
  const [card, setCard] = useState<UserLookupResponse | null>(null);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState<Problem | null>(null);
  const [busy, setBusy] = useState<'lookup' | 'send' | 'inline' | null>(null);
  const [now, setNow] = useState(Date.now);
  // The same press, retried, is the same request (REQ-MSG-09).
  const key = useRef(randomUUID());

  const limitedUntil = problem?.until ?? 0;
  useEffect(() => {
    if (limitedUntil <= Date.now() && sendBlockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [limitedUntil]);

  const lookupLimited = problem?.key === 'lookupLimited' && limitedUntil > now;
  const secondsLeft = Math.max(0, Math.ceil((limitedUntil - now) / 1000));
  const fail = (err: unknown, step: 'lookup' | 'send') => {
    const e = addFriendError(
      err instanceof ApiError ? err : { code: 0, retry_after: null },
      step,
    );
    const until = e.seconds ? Date.now() + e.seconds * 1000 : undefined;
    if (e.key === 'dailyLimit' && until) sendBlockedUntil = until;
    setProblem({ key: e.key, until });
    setNow(Date.now());
  };

  const lookup = async () => {
    const username = normalizeUsernameQuery(input);
    if (!username || busy) return;
    if (me && username === me.username) return setProblem({ key: 'self' });
    setBusy('lookup');
    setProblem(null);
    try {
      setCard(await friendActions.lookup(username));
      setMessage('');
      key.current = randomUUID();
    } catch (err) {
      setCard(null);
      fail(err, 'lookup');
    } finally {
      setBusy(null);
    }
  };

  const friendsToast = (name: string) =>
    showToast({
      message: t('friends.toast.friends', { name }),
      icon: UserCheck,
    });

  const send = async () => {
    if (!card) return;
    setBusy('send');
    setProblem(null);
    try {
      const msg = message.trim();
      const r = await friendActions.send(
        { user_id: card.user.id, ...(msg ? { message: msg } : {}) },
        key.current,
      );
      if (r.type === 'friend') {
        // AC5: they invited me after I looked them up.
        friendsToast(nameOf(r.user));
        onBecameFriends();
      } else {
        showToast({
          message: t('friends.toast.sent', { username: r.user.username }),
          icon: UserCheck,
        });
        onSent();
      }
    } catch (err) {
      fail(err, 'send');
    } finally {
      setBusy(null);
    }
  };

  const accept = async () => {
    if (!card) return;
    setBusy('send');
    try {
      await friendActions.accept(card.user.id);
      friendsToast(nameOf(card.user));
      onBecameFriends();
    } catch (err) {
      fail(err, 'send');
    } finally {
      setBusy(null);
    }
  };

  const unblock = async () => {
    if (!card) return;
    setBusy('inline');
    try {
      await friendActions.remove(card.user.id);
      setCard({ ...card, relationship: 'none' });
    } catch (err) {
      fail(err, 'send');
    } finally {
      setBusy(null);
    }
  };

  const action = card ? primaryAction(card.relationship) : null;
  const dailyLimited = sendBlockedUntil > now;
  const errorText = problem
    ? problem.key === 'self'
      ? t('friends.addSheet.errors.self')
      : t(`friends.addSheet.errors.${problem.key}`, {
          seconds: secondsLeft,
          username: card?.user.username ?? '',
        })
    : null;
  const name = card ? nameOf(card.user) : '';
  const relationLine =
    card &&
    {
      friend: t('friends.addSheet.isFriend'),
      outgoing: t('friends.addSheet.sentTo', { name }),
      incoming: t('friends.addSheet.receivedFrom', { name }),
      blocked: t('friends.addSheet.blocked', { name }),
      none: null,
    }[card.relationship];
  const mutual = card && mutualLine(card.mutual_servers);

  return (
    <BottomSheet
      visible={visible}
      title={t('friends.add')}
      onDismiss={onDismiss}
      action={
        !card || lookupLimited || !action
          ? {
              label: t('friends.addSheet.find'),
              disabled: !normalizeUsernameQuery(input) || lookupLimited,
              loading: busy === 'lookup',
              onPress: lookup,
            }
          : action.kind === 'accept'
            ? {
                label: t('friends.accept'),
                loading: busy === 'send',
                onPress: accept,
              }
            : {
                label: t('friends.addSheet.send'),
                disabled: !action.enabled || dailyLimited,
                loading: busy === 'send',
                onPress: send,
              }
      }
    >
      <View style={styles.form}>
        <Text color="text-secondary">{t('friends.addSheet.intro')}</Text>
        <TextField
          label={t('friends.addSheet.username')}
          hideLabel
          icon={AtSign}
          value={input}
          placeholder={t('friends.addSheet.placeholder')}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          readonly={busy === 'send'}
          error={errorText}
          onSubmitEditing={lookup}
          onChangeText={(text) => {
            setInput(text);
            // Another username: the card and the message go, the button is "Tìm" again.
            setCard(null);
            setMessage('');
            if (!lookupLimited) setProblem(null);
          }}
        />
        {card && (
          <View style={[styles.card, { backgroundColor: colors['surface-2'] }]}>
            <Avatar name={name} uri={card.user.avatar?.['128']} size={48} />
            <View style={styles.cardBody}>
              <View style={styles.nameLine}>
                <Text weight="600" numberOfLines={1} style={styles.shrink}>
                  {name}
                </Text>
                <Text
                  variant="label"
                  color="text-tertiary"
                  numberOfLines={1}
                  style={styles.username}
                >
                  {card.user.username}
                </Text>
              </View>
              {card.user.bio && (
                <Text
                  variant="body-sm"
                  color="text-secondary"
                  numberOfLines={2}
                >
                  {card.user.bio}
                </Text>
              )}
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
              {relationLine && (
                <Text variant="label" weight="600">
                  {relationLine}
                </Text>
              )}
              {mutual && (
                <Text variant="label" weight="500" color="text-secondary">
                  {t(`friends.addSheet.${mutual.key}`, mutual.params)}
                </Text>
              )}
              {card.relationship === 'friend' && (
                <Button
                  label={t('friends.message')}
                  variant="text"
                  size="S"
                  onPress={() => onOpenDm(card.user.id)}
                  style={styles.inline}
                />
              )}
              {card.relationship === 'blocked' && (
                <Button
                  label={t('friends.unblock')}
                  variant="text"
                  size="S"
                  loading={busy === 'inline'}
                  onPress={unblock}
                  style={styles.inline}
                />
              )}
            </View>
          </View>
        )}
        {card?.relationship === 'none' && (
          <TextField
            label={t('friends.addSheet.messageLabel')}
            value={message}
            onChangeText={setMessage}
            counterMax={REQUEST_MESSAGE_MAX}
            multiline
            maxLines={3}
            readonly={busy === 'send'}
          />
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[3] },
  card: {
    flexDirection: 'row',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.input,
  },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  shrink: { flexShrink: 1 },
  username: { flexShrink: 1000 },
  divider: { height: 1, marginVertical: space[2] },
  inline: { alignSelf: 'flex-start' },
});
