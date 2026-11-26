import { ErrorCode, type Relationship } from '@nezfocus/shared';
import {
  Ban,
  EllipsisVertical,
  MessageCircle,
  UserCheck,
  UserMinus,
  UserPlus,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { ApiError } from '../../../data/api/client';
import { friendActions } from '../../../data/friends';
import {
  blockedRows,
  countOf,
  friendSections,
  friendsStore,
  incomingCount,
  nameOf,
  pendingRows,
  requestTime,
  withBusy,
} from '../../../domain/friends/friends';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { presenceStore } from '../../../domain/presence/presence';
import { space } from '../../../shared/theme';
import { ActivityLine } from '../../../shared/ui/ActivityLine';
import { Button, IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ChipGroup, FilterChip } from '../../../shared/ui/FilterChip';
import { FriendRow } from '../../../shared/ui/FriendRow';
import { badgeText } from '../../../shared/ui/logic';
import { ActionSheet, Dialog } from '../../../shared/ui/Overlay';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { SearchField } from '../../../shared/ui/TextField';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { useChatClock } from '../../chat/hooks/useChatClock';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { usePresence } from '../../presence/hooks/usePresence';
import { BlockDialog } from '../components/BlockDialog';
import { AddFriendSheet } from './AddFriendSheet';

export type FriendsTab = 'online' | 'all' | 'pending' | 'blocked';
type Chip = 'incoming' | 'outgoing';
type Person = { id: string; name: string };

type Item =
  | { kind: 'header'; key: string; text: string }
  | { kind: 'note'; key: string; text: string }
  | { kind: 'offline'; key: string }
  | { kind: 'friend'; key: string; r: Relationship }
  | { kind: 'request'; key: string; r: Relationship; firstIncoming: boolean }
  | { kind: 'blocked'; key: string; r: Relationship };

const person = (r: Relationship): Person => ({
  id: r.user.id,
  name: nameOf(r.user),
});

// S-DM-04 Bạn bè (REQ-FRIEND-02..04). Opens from the local cache (FRIEND-04 AC1).
export function FriendsScreen({
  initialTab = 'online',
  onBack,
  onOpenDm,
  onOpenProfile,
}: {
  initialTab?: FriendsTab;
  onBack: () => void;
  onOpenDm?: (userId: string) => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const state = useStore(friendsStore);
  useStore(presenceStore, (s) => s.others); // re-sort when presence changes
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const { now, timeZone } = useChatClock();
  const [tab, setTab] = useState<FriendsTab>(initialTab);
  const incoming = incomingCount(state);
  const outgoing = countOf(state, 'outgoing');
  const [chip, setChip] = useState<Chip>(incoming ? 'incoming' : 'outgoing');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const [menu, setMenu] = useState<Person | null>(null);
  const [unfriend, setUnfriend] = useState<Person | null>(null);
  const [block, setBlock] = useState<Person | null>(null);
  const [adding, setAdding] = useState(false);
  const [addKey, setAddKey] = useState(0);
  const openAdd = () => {
    setAddKey((k) => k + 1);
    setAdding(true);
  };

  const presenceOf = (id: string) =>
    presenceStore.getState().others[id] ?? {
      user_id: id,
      status: 'offline' as const,
      activity: null,
    };

  const openTab = (next: FriendsTab) => {
    // Đang chờ: "Lời mời đến" when there is one, otherwise "Đã gửi" (CR-25 #13).
    if (next === 'pending') setChip(incoming ? 'incoming' : 'outgoing');
    setTab(next);
  };

  const run = async (userId: string, action: () => Promise<unknown>) => {
    if (busy.has(userId)) return false;
    setBusy((b) => withBusy(b, userId, true));
    try {
      await action();
      return true;
    } catch (err) {
      // Accepting a request the sender cancelled meanwhile (09 › Edge case).
      if (err instanceof ApiError && err.code === ErrorCode.NotFound)
        showToast({ message: t('friends.toast.gone') });
      else showToast({ message: t('friends.addSheet.errors.generic') });
      return false;
    } finally {
      setBusy((b) => withBusy(b, userId, false));
    }
  };

  const accept = (r: Relationship) =>
    run(r.user.id, () => friendActions.accept(r.user.id)).then(
      (ok) =>
        ok &&
        showToast({
          message: t('friends.toast.friends', { name: nameOf(r.user) }),
          icon: UserCheck,
        }),
    );
  const remove = (r: Relationship) =>
    run(r.user.id, () => friendActions.remove(r.user.id));

  const searching = query.trim().length > 0;
  const friendCount = countOf(state, 'friend');
  const nothingAtAll = state.loaded && Object.keys(state.byUser).length === 0;
  const items = buildItems();
  // Chốt 20/11/2026: "Cần kết nối mạng" on every tab; under the first request's buttons when
  // there is one (frame `offline`), otherwise on top of the list.
  if (offline && !items.some((i) => i.kind === 'request' && i.firstIncoming))
    items.unshift({ kind: 'offline', key: 'offline' });

  function buildItems(): Item[] {
    const list: Item[] = [];
    const header = (key: string, text: string) =>
      list.push({ kind: 'header', key, text });
    const note = (text: string) =>
      list.push({ kind: 'note', key: 'note', text });
    if (tab === 'online' || tab === 'all') {
      const { online, offline: away } = friendSections(
        state,
        presenceOf,
        tab,
        query,
      );
      const add = (r: Relationship) =>
        list.push({ kind: 'friend', key: r.user.id, r });
      if (searching) {
        const all = [...online, ...away];
        if (all.length)
          header('h', t('friends.group.results', { count: all.length }));
        all.forEach(add);
      } else {
        if (online.length)
          header('on', t('friends.group.online', { count: online.length }));
        online.forEach(add);
        if (away.length)
          header('off', t('friends.group.offline', { count: away.length }));
        away.forEach(add);
      }
      if (!list.length)
        note(
          searching
            ? t('friends.noMatch', { query: query.trim() })
            : friendCount
              ? t('friends.empty.online')
              : t('friends.empty.all'),
        );
      return list;
    }
    if (tab === 'pending') {
      const rows = pendingRows(state, chip, query);
      if (searching && rows.length)
        header('h', t('friends.group.results', { count: rows.length }));
      rows.forEach((r, i) =>
        list.push({
          kind: 'request',
          key: r.user.id,
          r,
          firstIncoming: chip === 'incoming' && i === 0,
        }),
      );
      if (!rows.length)
        note(
          searching
            ? t('friends.noMatch', { query: query.trim() })
            : t(`friends.empty.${chip}`),
        );
      return list;
    }
    const rows = blockedRows(state, query);
    if (rows.length)
      header(
        'h',
        t(searching ? 'friends.group.results' : 'friends.group.blocked', {
          count: rows.length,
        }),
      );
    rows.forEach((r) => list.push({ kind: 'blocked', key: r.user.id, r }));
    if (!rows.length)
      note(
        searching
          ? t('friends.noMatch', { query: query.trim() })
          : t('friends.empty.blocked'),
      );
    return list;
  }

  const timeOf = (iso: string) => {
    const at = requestTime(iso, now, timeZone);
    return at.kind === 'yesterday' ? t('friends.yesterday') : at.text;
  };

  const renderItem = ({ item }: { item: Item }) => {
    if (item.kind === 'header')
      return <SectionLabel style={styles.header}>{item.text}</SectionLabel>;
    if (item.kind === 'offline')
      return (
        <Text variant="label" color="text-secondary" style={styles.note}>
          {t('friends.needNetwork')}
        </Text>
      );
    if (item.kind === 'note')
      return (
        <Text color="text-secondary" style={styles.note}>
          {item.text}
        </Text>
      );
    const r = item.r;
    const name = nameOf(r.user);
    const common = {
      name,
      username: r.user.username,
      avatar: r.user.avatar?.['128'] ?? null,
      onPressAvatar: onOpenProfile && (() => onOpenProfile(r.user.id)),
    };
    if (item.kind === 'friend')
      return (
        <FriendItem
          r={r}
          {...common}
          onOpenDm={onOpenDm}
          menuDisabled={offline}
          onMenu={() => setMenu(person(r))}
        />
      );
    if (item.kind === 'blocked')
      return (
        <FriendRow
          {...common}
          right={
            // Frame `blocked`: the button ends 16 from the edge; the row pads 8 for icon buttons.
            <View style={styles.unblock}>
              <Button
                label={t('friends.unblock')}
                variant="secondary"
                size="S"
                disabled={offline}
                loading={busy.has(r.user.id)}
                onPress={() => remove(r)}
              />
            </View>
          }
        />
      );
    const isIncoming = r.type === 'incoming';
    return (
      <View>
        <FriendRow
          {...common}
          time={timeOf(r.created_at)}
          line2={
            r.request_message ? (
              <Text variant="body-sm" color="text-secondary">
                {t('friends.quoted', { message: r.request_message })}
              </Text>
            ) : (
              <Text variant="body-sm" color="text-tertiary">
                {t('friends.noMessage')}
              </Text>
            )
          }
          below={
            isIncoming ? (
              <>
                <Button
                  label={t('friends.accept')}
                  size="S"
                  disabled={offline}
                  loading={busy.has(r.user.id)}
                  onPress={() => accept(r)}
                />
                <Button
                  label={t('friends.decline')}
                  variant="secondary"
                  size="S"
                  disabled={offline || busy.has(r.user.id)}
                  onPress={() => remove(r)}
                />
              </>
            ) : (
              <Button
                label={t('friends.cancelRequest')}
                variant="secondary"
                size="S"
                disabled={offline}
                loading={busy.has(r.user.id)}
                onPress={() => remove(r)}
              />
            )
          }
        />
        {offline && item.firstIncoming && (
          <Text
            variant="label"
            color="text-secondary"
            style={styles.offlineNote}
          >
            {t('friends.needNetwork')}
          </Text>
        )}
      </View>
    );
  };

  const header = (
    <ScreenHeader
      title={t('friends.title')}
      onBack={onBack}
      action={
        <IconButton
          icon={UserPlus}
          label={t('friends.add')}
          color="text-primary"
          disabled={offline}
          onPress={openAdd}
        />
      }
    />
  );

  return (
    <View style={styles.screen}>
      {header}
      <ConnectionBanner />
      <View style={styles.segments}>
        <SegmentedControl<FriendsTab>
          value={tab}
          onChange={openTab}
          segments={[
            { key: 'online', label: t('friends.tabs.online') },
            { key: 'all', label: t('friends.tabs.all') },
            {
              key: 'pending',
              label: t('friends.tabs.pending'),
              ...(incoming
                ? {
                    count: badgeText(incoming) ?? undefined,
                    countTone: 'danger' as const,
                  }
                : {}),
            },
            { key: 'blocked', label: t('friends.tabs.blocked') },
          ]}
        />
      </View>
      {nothingAtAll && (tab === 'online' || tab === 'all') ? (
        <View style={styles.empty}>
          <EmptyState
            mascot
            title={t('friends.empty.title')}
            body={t('friends.empty.body')}
            action={{
              label: t('friends.add'),
              disabled: offline,
              onPress: openAdd,
            }}
          />
        </View>
      ) : (
        <>
          <View style={styles.search}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={t('friends.search')}
              returnKeyType="search"
            />
          </View>
          {tab === 'pending' && (
            <View style={styles.chips}>
              <ChipGroup>
                <FilterChip
                  label={chipLabel(t('friends.chips.incoming'), incoming)}
                  selected={chip === 'incoming'}
                  onPress={() => setChip('incoming')}
                />
                <FilterChip
                  label={chipLabel(t('friends.chips.outgoing'), outgoing)}
                  selected={chip === 'outgoing'}
                  onPress={() => setChip('outgoing')}
                />
              </ChipGroup>
            </View>
          )}
          <FlatList
            data={items}
            keyExtractor={(i) => `${i.kind}:${i.key}`}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
          />
        </>
      )}

      <ActionSheet
        visible={!!menu}
        title={menu?.name}
        cancel={false}
        onDismiss={() => setMenu(null)}
        groups={[
          {
            // ponytail: "Gọi thoại" / "Gọi video" come with DMVC, P3-B6.3 (#157).
            items: [
              {
                label: t('friends.menu.unfriend'),
                icon: UserMinus,
                onPress: () => {
                  setUnfriend(menu);
                  setMenu(null);
                },
              },
              {
                label: t('friends.menu.block'),
                icon: Ban,
                destructive: true,
                onPress: () => {
                  setBlock(menu);
                  setMenu(null);
                },
              },
            ],
          },
        ]}
      />
      <Dialog
        visible={!!unfriend}
        title={t('friends.unfriend.title', { name: unfriend?.name ?? '' })}
        body={t('friends.unfriend.body', { name: unfriend?.name ?? '' })}
        row
        cancel={{
          label: t('friends.unfriend.keep'),
          onPress: () => setUnfriend(null),
        }}
        confirm={{
          label: t('friends.unfriend.confirm'),
          variant: 'danger',
          loading: !!unfriend && busy.has(unfriend.id),
          onPress: async () => {
            if (!unfriend) return;
            await run(unfriend.id, () => friendActions.remove(unfriend.id));
            setUnfriend(null);
          },
        }}
        onDismiss={() => setUnfriend(null)}
      />
      <BlockDialog user={block} onDismiss={() => setBlock(null)} />
      <AddFriendSheet
        key={addKey}
        visible={adding}
        onDismiss={() => setAdding(false)}
        onSent={() => {
          setAdding(false);
          setTab('pending');
          setChip('outgoing');
          setQuery('');
        }}
        onBecameFriends={() => {
          setAdding(false);
          setTab('all');
          setQuery('');
        }}
        onOpenDm={
          onOpenDm &&
          ((id) => {
            setAdding(false);
            onOpenDm(id);
          })
        }
      />
    </View>
  );
}

const chipLabel = (label: string, count: number) =>
  count ? `${label} · ${badgeText(count)}` : label;

function FriendItem({
  r,
  onOpenDm,
  onMenu,
  menuDisabled,
  ...common
}: {
  r: Relationship;
  name: string;
  username: string;
  avatar: string | null;
  onPressAvatar?: () => void;
  onOpenDm?: (userId: string) => void;
  menuDisabled: boolean; // offline: unfriend / block need the network
  onMenu: () => void;
}) {
  const { t } = useTranslation();
  const p = usePresence(r.user.id);
  const openDm = onOpenDm && (() => onOpenDm(r.user.id));
  return (
    <FriendRow
      {...common}
      presence={p.status}
      dim={p.status === 'offline'}
      onPress={openDm}
      line2={
        p.activity ? (
          <ActivityLine activity={p.activity} form="full" />
        ) : (
          <Text
            variant="label"
            weight="500"
            color="text-secondary"
            numberOfLines={1}
          >
            {t(`ui.presence.${p.status}`)}
          </Text>
        )
      }
      right={
        <>
          {/* ponytail: 💬 waits for S-DM-02, P2-B3.3 (#116); hidden until a DM can open. */}
          {openDm && (
            <IconButton
              icon={MessageCircle}
              label={t('friends.message')}
              onPress={openDm}
            />
          )}
          <IconButton
            icon={EllipsisVertical}
            label={t('friends.more')}
            disabled={menuDisabled}
            onPress={onMenu}
          />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  unblock: { paddingRight: space[2] },
  segments: {
    paddingTop: space[1],
    paddingBottom: space[2],
    paddingHorizontal: space[3],
  },
  search: { paddingBottom: space[2], paddingHorizontal: space[3] },
  chips: { paddingBottom: space[2], paddingHorizontal: space[3] },
  header: {
    paddingTop: 12, // frame group header pad [12, 16, 4, 16]
    paddingBottom: space[1],
    paddingHorizontal: space[3],
  },
  note: { paddingVertical: space[2], paddingHorizontal: space[3] },
  // Under the first request's buttons, in line with its text column (16 + 40 + 12).
  offlineNote: {
    paddingLeft: space[3] + 40 + 12,
    paddingRight: space[3],
    paddingBottom: space[1],
  },
  empty: { flex: 1, justifyContent: 'center', paddingBottom: 80 },
});
