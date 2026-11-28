import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type {
  BottomTabBarProps,
  BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';
import {
  getFocusedRouteNameFromRoute,
  useNavigation,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import {
  Bell,
  CircleUser,
  House,
  ListChecks,
  Timer,
} from 'lucide-react-native';
import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import {
  endSession,
  requireUpgrade,
  sessionStore,
  signIn,
  signOut,
} from '../../domain/session/sessionStore';
import { authRepository } from '../../data/auth';
import { endingOf } from '../../domain/study/solo';
import {
  SoloMiniPlayer,
  SoloNotificationOpener,
} from '../../features/study/components/SoloMiniPlayer';
import { RoomMiniPlayer } from '../../features/voice/components/RoomMiniPlayer';
import { ActiveRoomsScreen } from '../../features/study/screens/ActiveRoomsScreen';
import { roomSessionsStore } from '../../domain/study/roomSessions';
import { voiceStore } from '../../domain/voice/voiceSession';
import { voiceView } from '../../domain/voice/voiceView';
import { useSolo, useSoloSync } from '../../features/study/hooks/useSolo';
import { useUnreadTotals } from '../../features/chat/hooks/useUnread';
import { AskNotifications } from '../../features/study/screens/AskNotifications';
import { SoloScreen } from '../../features/study/screens/SoloScreen';
import { StatsScreen } from '../../features/study/screens/StatsScreen';
import { StudyHome } from '../../features/study/screens/StudyHome';
import { useStudyStatsSync } from '../../features/study/hooks/useStudyStats';
import { CreateServerScreen } from '../../features/servers/screens/CreateServerScreen';
import { JoinByCodeScreen } from '../../features/servers/screens/JoinByCodeScreen';
import { useKeyboardVisible } from '../../shared/hooks/useKeyboardVisible';
import { TabBar } from '../../shared/ui/TabBar';
import type { SignInMode } from '../../domain/auth/authFlow';
import { CompleteAccountScreen } from '../../features/auth/screens/CompleteAccountScreen';
import { SignInScreen } from '../../features/auth/screens/SignInScreen';
import { UpdateRequiredScreen } from '../../features/auth/screens/UpdateRequiredScreen';
import { CreateAccountScreen } from '../../features/auth/screens/CreateAccountScreen';
import { ForgotPasswordScreen } from '../../features/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../../features/auth/screens/ResetPasswordScreen';
import { EnterCodeScreen } from '../../features/auth/screens/EnterCodeScreen';
import { WelcomeScreen } from '../../features/auth/screens/WelcomeScreen';
import { MeScreen } from '../../features/me/screens/MeScreen';
import { EditProfileScreen } from '../../features/me/screens/EditProfileScreen';
import { CropImageScreen } from '../../features/media/CropImageScreen';
import type { PickedPhoto } from '../../features/media/PhotoSourceSheet';
import type { ImageFile } from '../../domain/attachments/AttachmentRepository';
import { AccountScreen } from '../../features/me/screens/AccountScreen';
import { ChangePasswordScreen } from '../../features/me/screens/ChangePasswordScreen';
import { AppearanceScreen } from '../../features/me/screens/AppearanceScreen';
import { NotificationsScreen } from '../../features/me/screens/NotificationsScreen';
import { PrivacyScreen } from '../../features/me/screens/PrivacyScreen';
import { SessionsScreen } from '../../features/me/screens/SessionsScreen';
import { useMeSync } from '../../features/me/hooks/useMe';
import { Button } from '../../shared/ui/Button';
import { StyleSheet, View } from 'react-native';
import { space } from '../../shared/theme';
import { homeStore, selectServer } from '../../domain/servers/homeStore';
import { openInviteSheet } from '../../domain/invites/inviteSheetStore';
import { InviteSheet } from '../../features/servers/components/InviteSheet';
import { NoServerHome } from '../../features/servers/screens/LeftDrawer';
import { ChannelOverviewScreen } from '../../features/servers/screens/ChannelOverviewScreen';
import { ChannelPermissionsScreen } from '../../features/servers/screens/ChannelPermissionsScreen';
import { ChannelSettingsScreen } from '../../features/servers/screens/ChannelSettingsScreen';
import { StudyRoomSettingsScreen } from '../../features/servers/screens/StudyRoomSettingsScreen';
import { OverwriteEditScreen } from '../../features/servers/screens/OverwriteEditScreen';
import { MemberDetailScreen } from '../../features/servers/screens/MemberDetailScreen';
import { RemovalHost } from '../../features/servers/components/RemovalDialog';
import {
  askToLeave,
  LeaveServerDialogs,
} from '../../features/servers/components/LeaveServerDialogs';
import { DeletedServersScreen } from '../../features/servers/screens/DeletedServersScreen';
import { TransferOwnerScreen } from '../../features/servers/screens/TransferOwnerScreen';
import { passwordWasReset } from '../../domain/account/passwordReset';
import { BansScreen } from '../../features/servers/screens/BansScreen';
import { InvitesScreen } from '../../features/servers/screens/InvitesScreen';
import { MembersScreen } from '../../features/servers/screens/MembersScreen';
import { RoleEditScreen } from '../../features/servers/screens/RoleEditScreen';
import { RoleMembersScreen } from '../../features/servers/screens/RoleMembersScreen';
import { RolesScreen } from '../../features/servers/screens/RolesScreen';
import { ServerOverviewScreen } from '../../features/servers/screens/ServerOverviewScreen';
import { ServerSettingsScreen } from '../../features/servers/screens/ServerSettingsScreen';
import {
  FriendsScreen,
  type FriendsTab,
} from '../../features/friends/screens/FriendsScreen';
import { dmView, showDmList } from '../../domain/dm/dmStore';
import { openDmWith } from '../../features/dm/openDm';
import { openMemberProfile } from '../../domain/friends/profileSheet';
import { ProfileSheetHost } from '../../features/friends/components/ProfileSheet';
import { HomeDrawers } from './HomeDrawers';
import { InviteRoute } from './InviteRoute';
import { MessageLinkRoute } from './MessageLinkRoute';
import { Placeholder } from './Placeholder';
import { openVoice } from '../../domain/voice/voiceView';
// Metro folds __DEV__ before collecting dependencies, so release bundles leave the gallery out.
const UiGallery: ComponentType | null = __DEV__
  ? (require('../dev/UiGallery') as typeof import('../dev/UiGallery')).UiGallery
  : null;

export type RootStackParamList = {
  // Auth stack (spec 01): no TabBar.
  Welcome: undefined; // S-AUTH-01
  CreateAccount: undefined; // S-AUTH-02
  EnterCode: { email: string; from: 'create' | 'signIn' }; // S-AUTH-03
  SignIn: { mode?: SignInMode; email?: string } | undefined; // S-AUTH-04
  ForgotPassword: { email?: string } | undefined; // S-AUTH-05 request
  ResetPassword: { email: string }; // S-AUTH-05 reset-form
  CompleteAccount: undefined; // S-ONB-01
  Main: NavigatorScreenParams<TabParamList> | undefined;
  // Replaces everything while sessionStore.upgradeRequired (42601 on any request, NFR-MOB-12).
  UpdateRequired: undefined; // S-AUTH-00
  Invite: { code: string; channel?: string }; // S-MOD-01; `channel` = ?channel= (STUDY-16)
  UiGallery: undefined; // dev only (P0-3b)
  // SRS 7.3.5 App Links (REQ-MSG-05 CR-19): MessageLinkRoute.
  ChannelLink: { serverId: string; channelId: string; messageId?: string };
  DmLink: { channelId: string; messageId?: string };
};

type StudyParamList = {
  StudyHome: undefined; // S-STUDY-01
  Solo: undefined; // S-STUDY-02
  AskNotifications: undefined; // S-ROOM-09 first-focus
  Stats: { date?: string } | undefined; // S-STUDY-03
  ActiveRooms: undefined; // S-STUDY-06
};

type HomeParamList = {
  HomeRoot: undefined; // drawers around the open channel (S-HOME-01/02/03)
  CreateServer: { cropped?: ImageFile } | undefined; // S-HOME-06
  // 07 S-ME-01 crop for the server icon; goes back to the screen that asked.
  CropImage: {
    photo: PickedPhoto;
    back:
      | { screen: 'CreateServer' }
      | { screen: 'ServerOverview'; serverId: string };
  };
  JoinByCode: undefined; // S-HOME-06 join-by-code
  Friends: { tab?: FriendsTab; at?: number } | undefined; // S-DM-04 (main entry: S-DM-01, P2-B3.3 #116)
  // ponytail: where S-HOME-02 / S-HOME-09 / S-SET-01 lead before those screens exist —
  // DMs P2-B3 (#20), and the rest per row.
  HomePlaceholder: { title: string; ticket?: string };
  ServerSettings: { serverId: string }; // S-SET-01
  ServerOverview: { serverId: string; cropped?: ImageFile }; // S-SET-01 overview
  Roles: { serverId: string }; // S-SET-02
  RoleEdit: { serverId: string; roleId: string }; // S-SET-02 edit-role
  RoleMembers: { serverId: string; roleId: string }; // S-SET-02 role-members
  Members: { serverId: string }; // S-SET-03
  MemberDetail: { serverId: string; userId: string }; // S-SET-03 member-detail
  ServerInvites: { serverId: string }; // S-SET-04 invites
  ServerBans: { serverId: string }; // S-SET-04 bans
  ChannelSettings: { serverId: string; channelId: string }; // S-SET-06
  // S-SET-06 `overwrites` (a category: `category-overwrites`)
  ChannelPermissions: { serverId: string; channelId: string };
  OverwriteEdit: {
    serverId: string;
    channelId: string;
    targetId: string;
    targetType: 'role' | 'member';
  }; // S-SET-06 `overwrite-edit`
  ChannelOverview: { serverId: string; channelId: string }; // S-SET-06 overview
  StudyRoomSettings: { serverId: string; channelId: string }; // S-SET-07
  // S-SET-08; `leave`: started from S-HOME-09 `owner-leave`, done → `leave-confirm` (A3)
  TransferOwner: { serverId: string; then?: 'leave' };
  DeletedServers: undefined; // S-HOME-06 `restore-list`
  // S-ME-03 `password-code` from S-MOD-03 "Quên mật khẩu?" on a Home screen
  PasswordCode: undefined;
};

type TabParamList = {
  Home: NavigatorScreenParams<HomeParamList> | undefined;
  Study: NavigatorScreenParams<StudyParamList> | undefined;
  Tasks: undefined;
  Inbox: undefined;
  Me: NavigatorScreenParams<MeParamList> | undefined;
};

// Spec 07: S-ME-02 is the tab root; the others are child screens that keep the TabBar.
type MeParamList = {
  MeRoot: undefined; // S-ME-02
  EditProfile: { cropped?: ImageFile } | undefined; // S-ME-01
  CropAvatar: { photo: PickedPhoto }; // S-ME-01 crop
  Account: undefined; // S-ME-03
  ChangePassword: { mode?: 'code' } | undefined; // S-ME-03 password-form / password-code
  Sessions: undefined; // S-ME-03 sessions
  DeleteAccount: undefined; // S-ME-03 delete (P3-A4 #24)
  Privacy: undefined; // S-ME-04
  Blocked: undefined; // S-DM-04 `blocked`, Back to S-ME-04
  Notifications: undefined; // S-ME-05
  Appearance: undefined; // S-ME-06
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const StudyStack = createNativeStackNavigator<StudyParamList>();
const MeStack = createNativeStackNavigator<MeParamList>();
const HomeStack = createNativeStackNavigator<HomeParamList>();

// CR-15: S-HOME-06 and other Home screens stack above the drawers; Back pops them first.
function HomeTab() {
  const { t } = useTranslation();
  // S-HOME-02 `no-server`: READY listed none; the drawer becomes the Home root.
  const noServer = useStore(homeStore, (s) => s.servers?.length === 0);
  // A DM on screen needs the drawers even with no server (S-DM-02 is a Home root like a channel).
  const dmOpen = useStore(dmView, (s) => s.open !== null);
  return (
    <>
      <HomeStack.Navigator screenOptions={{ headerShown: false }}>
        <HomeStack.Screen name="HomeRoot">
          {({ navigation }) => {
            const placeholder = (title: string, ticket?: string) => () =>
              navigation.navigate('HomePlaceholder', { title, ticket });
            const dm = showDmList;
            const friends = () => navigation.navigate('Friends');
            return noServer && !dmOpen ? (
              <NoServerHome
                onCreate={() => navigation.navigate('CreateServer')}
                onJoinByCode={() => navigation.navigate('JoinByCode')}
                onDirectMessages={dm}
                onFriends={friends}
              />
            ) : (
              <HomeDrawers
                actions={{
                  onAdd: () => navigation.navigate('CreateServer'),
                  onOpenVoice: (channel) =>
                    openVoice({
                      serverId: channel.server_id,
                      channelId: channel.id,
                    }),
                  onDirectMessages: dm,
                  onFriends: friends,
                  onInvite: openInviteSheet,
                  menu: {
                    invite: () => {
                      const { selectedServerId } = homeStore.getState();
                      if (selectedServerId) openInviteSheet(selectedServerId);
                    },
                    settings: (serverId) =>
                      navigation.navigate('ServerSettings', { serverId }),
                    // ponytail: report (P3-A5 #25).
                    report: placeholder(
                      t('servers.menu.report'),
                      'P3-A5 (#25)',
                    ),
                    leave: () =>
                      askToLeave(homeStore.getState().selectedServerId),
                  },
                  onChannelSettings: (channel) =>
                    navigation.navigate('ChannelSettings', {
                      serverId: channel.server_id,
                      channelId: channel.id,
                    }),
                  onCategoryPermissions: (category) =>
                    navigation.navigate('ChannelPermissions', {
                      serverId: category.server_id,
                      channelId: category.id,
                    }),
                }}
              />
            );
          }}
        </HomeStack.Screen>
        <HomeStack.Screen name="CreateServer">
          {({ navigation, route }) => (
            <CreateServerScreen
              cropped={route.params?.cropped}
              onCrop={(photo) =>
                navigation.navigate('CropImage', {
                  photo,
                  back: { screen: 'CreateServer' },
                })
              }
              onClose={navigation.goBack}
              onJoinByCode={() => navigation.navigate('JoinByCode')}
              onDeleted={() => navigation.navigate('DeletedServers')}
              onCreated={() => navigation.popTo('HomeRoot')}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="ServerSettings">
          {({ navigation, route }) => (
            <ServerSettingsScreen
              serverId={route.params.serverId}
              onBack={navigation.goBack}
              onOverview={() =>
                navigation.navigate('ServerOverview', {
                  serverId: route.params.serverId,
                })
              }
              onRoles={() =>
                navigation.navigate('Roles', {
                  serverId: route.params.serverId,
                })
              }
              onMembers={() =>
                navigation.navigate('Members', {
                  serverId: route.params.serverId,
                })
              }
              onInvites={() =>
                navigation.navigate('ServerInvites', {
                  serverId: route.params.serverId,
                })
              }
              onBans={() =>
                navigation.navigate('ServerBans', {
                  serverId: route.params.serverId,
                })
              }
              onTransfer={() =>
                navigation.navigate('TransferOwner', {
                  serverId: route.params.serverId,
                })
              }
              onRow={(title, ticket) =>
                navigation.navigate('HomePlaceholder', { title, ticket })
              }
              onLostAccess={() => navigation.popTo('HomeRoot')}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="TransferOwner">
          {({ navigation, route }) => (
            <TransferOwnerScreen
              serverId={route.params.serverId}
              onBack={navigation.goBack}
              onDone={() => {
                navigation.goBack();
                // A3: from the leave flow, the leave Dialog opens at once.
                if (route.params.then === 'leave')
                  askToLeave(route.params.serverId);
              }}
              onForgot={() => navigation.navigate('PasswordCode')}
              onLostAccess={navigation.goBack}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="PasswordCode">
          {({ navigation }) => (
            <ChangePasswordScreen
              initialMode="code"
              onBack={navigation.goBack}
              onSaved={() => {
                passwordWasReset();
                navigation.goBack();
              }}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="DeletedServers">
          {({ navigation }) => (
            <DeletedServersScreen
              onBack={navigation.goBack}
              onOpen={(serverId) => {
                selectServer(serverId);
                navigation.popTo('HomeRoot');
              }}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="Roles">
          {({ navigation, route }) => (
            <RolesScreen
              serverId={route.params.serverId}
              onBack={navigation.goBack}
              onEdit={(roleId) =>
                navigation.navigate('RoleEdit', {
                  serverId: route.params.serverId,
                  roleId,
                })
              }
              onLostAccess={() =>
                navigation.popTo('ServerSettings', route.params)
              }
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="RoleEdit">
          {({ navigation, route }) => (
            <RoleEditScreen
              {...route.params}
              onMembers={() => navigation.navigate('RoleMembers', route.params)}
              onLostAccess={() =>
                navigation.popTo('ServerSettings', {
                  serverId: route.params.serverId,
                })
              }
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="RoleMembers">
          {({ navigation, route }) => (
            <RoleMembersScreen {...route.params} onBack={navigation.goBack} />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="Members">
          {({ navigation, route }) => (
            <MembersScreen
              serverId={route.params.serverId}
              onBack={navigation.goBack}
              onOpen={(userId) =>
                navigation.navigate('MemberDetail', {
                  serverId: route.params.serverId,
                  userId,
                })
              }
              onLostAccess={() =>
                navigation.popTo('ServerSettings', route.params)
              }
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="ServerInvites">
          {({ navigation, route }) => (
            <InvitesScreen
              serverId={route.params.serverId}
              onBack={navigation.goBack}
              onLostAccess={() =>
                navigation.popTo('ServerSettings', route.params)
              }
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="ServerBans">
          {({ navigation, route }) => (
            <BansScreen
              serverId={route.params.serverId}
              onBack={navigation.goBack}
              onLostAccess={() =>
                navigation.popTo('ServerSettings', route.params)
              }
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="MemberDetail">
          {({ navigation, route }) => (
            <MemberDetailScreen {...route.params} onBack={navigation.goBack} />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="ServerOverview">
          {({ navigation, route }) => (
            <ServerOverviewScreen
              serverId={route.params.serverId}
              cropped={route.params.cropped}
              onCrop={(photo) =>
                navigation.navigate('CropImage', {
                  photo,
                  back: {
                    screen: 'ServerOverview',
                    serverId: route.params.serverId,
                  },
                })
              }
              onSaved={navigation.goBack}
              onLostAccess={() => navigation.popTo('HomeRoot')}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen
          name="CropImage"
          options={{ presentation: 'fullScreenModal' }}
        >
          {({ navigation, route }) => (
            <CropImageScreen
              photo={route.params.photo}
              shape="square"
              onCancel={navigation.goBack}
              onDone={(cropped) => {
                const { back } = route.params;
                if (back.screen === 'CreateServer')
                  navigation.popTo('CreateServer', { cropped });
                else
                  navigation.popTo('ServerOverview', {
                    serverId: back.serverId,
                    cropped,
                  });
              }}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="ChannelSettings">
          {({ navigation, route }) => (
            <ChannelSettingsScreen
              {...route.params}
              onBack={navigation.goBack}
              onOverview={() =>
                navigation.navigate('ChannelOverview', route.params)
              }
              onPermissions={() =>
                navigation.navigate('ChannelPermissions', route.params)
              }
              onStudyRoom={() =>
                navigation.navigate('StudyRoomSettings', route.params)
              }
              onRow={(title, ticket) =>
                navigation.navigate('HomePlaceholder', { title, ticket })
              }
              onClose={() => navigation.popTo('HomeRoot')}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="ChannelPermissions">
          {({ navigation, route }) => (
            <ChannelPermissionsScreen
              {...route.params}
              onBack={navigation.goBack}
              onEdit={(target) =>
                navigation.navigate('OverwriteEdit', {
                  ...route.params,
                  targetId: target.target_id,
                  targetType: target.target_type,
                })
              }
              onCategory={(categoryId) =>
                navigation.push('ChannelPermissions', {
                  serverId: route.params.serverId,
                  channelId: categoryId,
                })
              }
              onClose={() => navigation.popTo('HomeRoot')}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="OverwriteEdit">
          {({ navigation, route }) => (
            <OverwriteEditScreen
              {...route.params}
              onBack={navigation.goBack}
              onClose={() => navigation.popTo('HomeRoot')}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="ChannelOverview">
          {({ navigation, route }) => (
            <ChannelOverviewScreen
              {...route.params}
              onSaved={navigation.goBack}
              onClose={() => navigation.popTo('HomeRoot')}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="StudyRoomSettings">
          {({ navigation, route }) => (
            <StudyRoomSettingsScreen
              {...route.params}
              onBack={navigation.goBack}
              onClose={() => navigation.popTo('HomeRoot')}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen
          name="HomePlaceholder"
          options={({ route }) => ({
            headerShown: true,
            title: route.params.title,
          })}
        >
          {({ route }) => (
            <Placeholder
              title={route.params.title}
              ticket={route.params.ticket}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="Friends">
          {({ navigation, route }) => (
            <FriendsScreen
              // A push tap (`at`) opens its tab even when S-DM-04 is already open (REQ-NOTIF-02).
              key={route.params?.at}
              initialTab={route.params?.tab}
              onBack={navigation.goBack}
              onOpenDm={(userId) => openDmWith(userId, navigation.popToTop)}
              onOpenProfile={(userId) => openMemberProfile(userId)}
            />
          )}
        </HomeStack.Screen>
        <HomeStack.Screen name="JoinByCode">
          {({ navigation }) => (
            <JoinByCodeScreen
              onBack={navigation.goBack}
              onFound={(code, channel) =>
                navigation.navigate('Invite', { code, channel })
              }
            />
          )}
        </HomeStack.Screen>
      </HomeStack.Navigator>
      {/* S-HOME-07: one sheet for the tab, opened by openInviteSheet. */}
      <InviteSheet />
    </>
  );
}

// SRS 3.1 bottom order: MiniPlayer, then TabBar; both step aside for the keyboard (NFR-MOB-14).
function MainTabBar({
  tabs,
  ...props
}: BottomTabBarProps & { tabs: Parameters<typeof TabBar>[0]['tabs'] }) {
  const keyboard = useKeyboardVisible();
  const route = props.state.routes[props.state.index];
  const focused = route && getFocusedRouteNameFromRoute(route);
  const onSolo = route?.name === 'Study' && focused === 'Solo';
  // 07 S-ME-01 `crop` (and the server icon crop) is a full-screen step: no TabBar.
  const fullScreen = focused === 'CropAvatar' || focused === 'CropImage';
  // initial: false keeps S-STUDY-01 under Solo even when the Study tab was never opened
  // (MiniPlayer on another tab, a notification on cold start), so closing goes back to it.
  const openSolo = () =>
    props.navigation.navigate('Study', { screen: 'Solo', initial: false });
  // C-08 › Hiện ở đâu: the room's own MiniPlayer hides on its screen (a Home root, CR-15).
  const call = useStore(voiceStore, (s) =>
    s.call?.phase === 'in' ? s.call : null,
  );
  const openRoom = useStore(voiceView, (s) => s.open?.channelId ?? null);
  const roomHasSession = useStore(
    roomSessionsStore,
    (s) => !!call && !!s.byChannel[call.channelId],
  );
  const onOwnRoom =
    !!call &&
    route?.name === 'Home' &&
    (!focused || focused === 'HomeRoot') &&
    openRoom === call.channelId;
  // In a room the Solo shows as `voice-solo`, except on that room's screen without a session.
  const soloMini = !onSolo && (!call || (onOwnRoom && !roomHasSession));
  return (
    <>
      <SoloNotificationOpener onOpen={openSolo} />
      {!keyboard && !fullScreen && (
        <>
          {/* Hidden on the Solo screen itself (C-08). */}
          {soloMini && <SoloMiniPlayer onOpen={openSolo} />}
          <RoomMiniPlayer
            hidden={onOwnRoom}
            onOpenSolo={openSolo}
            onShowRoom={() =>
              props.navigation.navigate('Home', { screen: 'HomeRoot' })
            }
          />
          <TabBar {...props} tabs={tabs} />
        </>
      )}
    </>
  );
}

// The room on screen is a Home root (CR-15): bring the Home tab up on it.
const showRoom = (navigation: { getParent: () => unknown }) =>
  (
    navigation.getParent() as BottomTabNavigationProp<TabParamList> | undefined
  )?.navigate('Home', { screen: 'HomeRoot' });

function StudyTab() {
  return (
    <StudyStack.Navigator screenOptions={{ headerShown: false }}>
      <StudyStack.Screen name="StudyHome">
        {({ navigation }) => (
          <StudyHome
            onOpenSolo={() => navigation.navigate('Solo')}
            onAskNotifications={() => navigation.navigate('AskNotifications')}
            onOpenStats={(date) => navigation.navigate('Stats', { date })}
            onCreateServer={() =>
              (
                navigation.getParent() as
                  BottomTabNavigationProp<TabParamList> | undefined
              )?.navigate('Home', { screen: 'CreateServer' })
            }
            onShowRoom={() => showRoom(navigation)}
            onSeeAllRooms={() => navigation.navigate('ActiveRooms')}
          />
        )}
      </StudyStack.Screen>
      <StudyStack.Screen name="ActiveRooms">
        {({ navigation }) => (
          <ActiveRoomsScreen
            onBack={navigation.goBack}
            onShowRoom={() => showRoom(navigation)}
          />
        )}
      </StudyStack.Screen>
      <StudyStack.Screen name="Stats">
        {({ navigation, route }) => (
          <StatsScreen
            initialDate={route.params?.date}
            onBack={navigation.goBack}
            onOpenSolo={() => navigation.navigate('Solo')}
            onAskNotifications={() => navigation.navigate('AskNotifications')}
          />
        )}
      </StudyStack.Screen>
      <StudyStack.Screen name="Solo" component={SoloScreen} />
      <StudyStack.Screen name="AskNotifications">
        {({ navigation }) => (
          <AskNotifications onStarted={() => navigation.replace('Solo')} />
        )}
      </StudyStack.Screen>
    </StudyStack.Navigator>
  );
}

type Action = { label: string; onPress: () => void };

// Child screens not built yet: each names the ticket that replaces it.
const meChildren = [
  ['DeleteAccount', 'me.deleteAccount', 'P3-A4 (#24)'],
] as const;

function MeTab({ devActions }: { devActions: Action[] }) {
  const { t } = useTranslation();
  return (
    <MeStack.Navigator>
      <MeStack.Screen name="MeRoot" options={{ headerShown: false }}>
        {({ navigation }) => (
          <MeScreen
            onOpenProfile={() => navigation.navigate('EditProfile')}
            onOpenStreak={() =>
              (
                navigation.getParent() as
                  BottomTabNavigationProp<TabParamList> | undefined
              )?.navigate('Study', { screen: 'Stats' })
            }
            onOpenAccount={() => navigation.navigate('Account')}
            onOpenPrivacy={() => navigation.navigate('Privacy')}
            onOpenNotifications={() => navigation.navigate('Notifications')}
            onOpenAppearance={() => navigation.navigate('Appearance')}
            devActions={
              devActions.length > 0 && (
                <View style={styles.dev}>
                  {devActions.map((a) => (
                    <Button
                      key={a.label}
                      variant="text"
                      size="S"
                      label={a.label}
                      onPress={a.onPress}
                    />
                  ))}
                </View>
              )
            }
          />
        )}
      </MeStack.Screen>
      <MeStack.Screen name="EditProfile" options={{ headerShown: false }}>
        {({ navigation, route }) => (
          <EditProfileScreen
            cropped={route.params?.cropped}
            onCrop={(photo) => navigation.navigate('CropAvatar', { photo })}
            onBack={navigation.goBack}
            onSaved={() => navigation.goBack()}
          />
        )}
      </MeStack.Screen>
      <MeStack.Screen
        name="CropAvatar"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      >
        {({ navigation, route }) => (
          <CropImageScreen
            photo={route.params.photo}
            onCancel={navigation.goBack}
            onDone={(cropped) => navigation.popTo('EditProfile', { cropped })}
          />
        )}
      </MeStack.Screen>
      <MeStack.Screen name="Account" options={{ headerShown: false }}>
        {({ navigation }) => (
          <AccountScreen
            onBack={navigation.goBack}
            onChangePassword={() => navigation.navigate('ChangePassword')}
            onSessions={() => navigation.navigate('Sessions')}
            onDeleteAccount={() => navigation.navigate('DeleteAccount')}
          />
        )}
      </MeStack.Screen>
      <MeStack.Screen name="ChangePassword" options={{ headerShown: false }}>
        {({ navigation, route }) => (
          <ChangePasswordScreen
            initialMode={route.params?.mode}
            onBack={navigation.goBack}
            onSaved={() => {
              passwordWasReset(); // S-MOD-03 `password-reset-done` (xóa tài khoản)
              navigation.goBack();
            }}
          />
        )}
      </MeStack.Screen>
      <MeStack.Screen name="Privacy" options={{ headerShown: false }}>
        {({ navigation }) => (
          <PrivacyScreen
            onBack={navigation.goBack}
            onOpenBlocked={() => navigation.navigate('Blocked')}
          />
        )}
      </MeStack.Screen>
      <MeStack.Screen name="Blocked" options={{ headerShown: false }}>
        {({ navigation }) => (
          <FriendsScreen initialTab="blocked" onBack={navigation.goBack} />
        )}
      </MeStack.Screen>
      <MeStack.Screen name="Notifications" options={{ headerShown: false }}>
        {({ navigation }) => <NotificationsScreen onBack={navigation.goBack} />}
      </MeStack.Screen>
      <MeStack.Screen name="Appearance" options={{ headerShown: false }}>
        {({ navigation }) => <AppearanceScreen onBack={navigation.goBack} />}
      </MeStack.Screen>
      <MeStack.Screen name="Sessions" options={{ headerShown: false }}>
        {({ navigation }) => <SessionsScreen onBack={navigation.goBack} />}
      </MeStack.Screen>
      {meChildren.map(([name, title, ticket]) => (
        <MeStack.Screen key={name} name={name} options={{ title: t(title) }}>
          {() => <Placeholder title={t(title)} ticket={ticket} />}
        </MeStack.Screen>
      ))}
    </MeStack.Navigator>
  );
}

const sampleUser = { id: '1', email: 'an.nguyen@gmail.com' };

function useDevActions() {
  const { t } = useTranslation();
  return {
    signIn: {
      label: t('placeholder.fakeSignIn'),
      onPress: () => signIn(sampleUser, { completed: true }),
    },
    incomplete: {
      label: t('placeholder.fakeIncomplete'),
      onPress: () => signIn(sampleUser, { completed: false }),
    },
    signOut: {
      label: t('placeholder.signOut'),
      onPress: signOut,
    },
    upgrade: {
      label: t('screens.updateRequired'),
      onPress: () => requireUpgrade(),
    },
    // Dev: one tap signs in as the seed user (pnpm --filter backend db:seed) with real tokens.
    seedSignIn: {
      label: 'Đăng nhập an.nguyen (seed)',
      onPress: () =>
        void authRepository
          .login(sampleUser.email, 'NezFocus@2026')
          .then((s) =>
            signIn(
              { id: s.user.id, email: sampleUser.email },
              { completed: true },
            ),
          ),
    },
  };
}

// Only inside a screen: useNavigation throws at the RootNavigator level.
function useGalleryAction() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return __DEV__
    ? [{ label: 'UI Gallery', onPress: () => navigation.navigate('UiGallery') }]
    : [];
}

function Welcome({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Welcome'>) {
  const dev = useDevActions();
  const gallery = useGalleryAction();
  // Dev builds only: shortcuts for trying other areas without going through sign-up.
  const devActions = __DEV__ && (
    <View style={styles.dev}>
      {[
        dev.signIn,
        dev.seedSignIn,
        dev.incomplete,
        dev.upgrade,
        ...gallery,
      ].map((a) => (
        <Button
          key={a.label}
          variant="text"
          size="S"
          label={a.label}
          onPress={a.onPress}
        />
      ))}
    </View>
  );
  return (
    <WelcomeScreen
      onCreateAccount={() => navigation.navigate('CreateAccount')}
      onSignIn={() => navigation.navigate('SignIn')}
      devActions={devActions}
    />
  );
}

function MainTabs() {
  const { t } = useTranslation();
  const gallery = useGalleryAction();
  // Dev only: sample badges for comparing with the C-03 board (Tasks, Inbox: P4).
  const [sampleBadges, setSampleBadges] = useState(false);
  useSoloSync();
  useStudyStatsSync();
  useMeSync();
  const solo = useSolo();
  const home = useUnreadTotals().home;
  // C-03 / SRS 3.1: dot on Học while the user is in a Focus Session.
  const studying = !!solo && !endingOf(solo);
  const tabs = {
    // REQ-NOTIF-01: mentions of every server + unread DMs.
    Home: { icon: House, badge: sampleBadges ? 3 : home || undefined },
    Study: {
      icon: Timer,
      badge: studying || sampleBadges ? ('dot' as const) : undefined,
    },
    Tasks: { icon: ListChecks, badge: sampleBadges ? 12 : undefined },
    Inbox: { icon: Bell, badge: sampleBadges ? 120 : undefined },
    Me: { icon: CircleUser },
  };
  const badgeToggle = __DEV__
    ? [{ label: 'Badge mẫu', onPress: () => setSampleBadges((b) => !b) }]
    : [];
  // Dev: the Fake cannot end a session, so these stand in for 40100 / 40103 / Gateway 4004.
  const endedActions = __DEV__
    ? (['password_reset', 'revoked', 'reuse_detected', 'expired'] as const).map(
        (reason) => ({
          label: `Phiên kết thúc: ${reason}`,
          onPress: () => endSession(reason),
        }),
      )
    : [];
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toHome = () =>
    nav.navigate('Main', { screen: 'Home', params: { screen: 'HomeRoot' } });
  return (
    <>
      {/* REQ-ROLE-05: kicked / banned while the app is open, over every tab. */}
      <RemovalHost nav={nav} />
      {/* S-HOME-09 leave / owner-leave (SRV-05), over every tab. */}
      <LeaveServerDialogs
        onTransfer={(serverId) =>
          nav.navigate('Main', {
            screen: 'Home',
            params: {
              screen: 'TransferOwner',
              params: { serverId, then: 'leave' },
            },
          })
        }
      />
      {/* S-HOME-10: one sheet over every tab. */}
      <ProfileSheetHost
        onOpenedDm={toHome}
        onOpenedServer={toHome}
        onMemberRoles={(serverId, userId) =>
          nav.navigate('Main', {
            screen: 'Home',
            params: { screen: 'MemberDetail', params: { serverId, userId } },
          })
        }
        onEditProfile={() =>
          nav.navigate('Main', {
            screen: 'Me',
            params: { screen: 'EditProfile' },
          })
        }
      />
      {/* CR-15: Back at the root of any other tab returns to Home, keeping that tab's state. */}
      <Tab.Navigator
        backBehavior="firstRoute"
        tabBar={(props) => <MainTabBar {...props} tabs={tabs} />}
      >
        <Tab.Screen
          name="Home"
          component={HomeTab}
          options={{ title: t('tabs.home'), headerShown: false }}
        />
        <Tab.Screen
          name="Study"
          component={StudyTab}
          options={{ title: t('tabs.study'), headerShown: false }}
        />
        <Tab.Screen name="Tasks" options={{ title: t('tabs.tasks') }}>
          {() => <Placeholder title={t('tabs.tasks')} />}
        </Tab.Screen>
        <Tab.Screen name="Inbox" options={{ title: t('tabs.inbox') }}>
          {() => <Placeholder title={t('tabs.inbox')} />}
        </Tab.Screen>
        <Tab.Screen
          name="Me"
          options={{ title: t('tabs.me'), headerShown: false }}
        >
          {() => (
            <MeTab
              devActions={
                __DEV__ ? [...gallery, ...badgeToggle, ...endedActions] : []
              }
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </>
  );
}

export function RootNavigator() {
  const status = useStore(sessionStore, (s) => s.status);
  // Spec 01 › Phiên đăng nhập kết thúc: an ended session lands on S-AUTH-04, not Welcome.
  const sessionEnded = useStore(sessionStore, (s) => s.ended !== null);
  const upgradeRequired = useStore(sessionStore, (s) => s.upgradeRequired);

  const signInScreen = (
    <Stack.Screen
      name="SignIn"
      component={SignInScreen}
      options={{ headerShown: false }}
    />
  );

  if (upgradeRequired)
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="UpdateRequired"
          component={UpdateRequiredScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );

  return (
    <Stack.Navigator>
      {status === 'signed-out' && (
        <Stack.Group>
          {sessionEnded && signInScreen}
          <Stack.Screen
            name="Welcome"
            component={Welcome}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateAccount"
            component={CreateAccountScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="EnterCode"
            component={EnterCodeScreen}
            options={{ headerShown: false }}
          />
          {!sessionEnded && signInScreen}
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ headerShown: false }}
          />
        </Stack.Group>
      )}
      {status === 'incomplete' && (
        <Stack.Screen
          name="CompleteAccount"
          component={CompleteAccountScreen}
          options={{ headerShown: false }}
        />
      )}
      {status === 'signed-in' && (
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
      )}
      {UiGallery && (
        <Stack.Screen
          name="UiGallery"
          component={UiGallery}
          options={{ headerShown: false }}
        />
      )}
      <Stack.Screen
        name="Invite"
        component={InviteRoute}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChannelLink"
        component={MessageLinkRoute}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DmLink"
        component={MessageLinkRoute}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  dev: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] },
});
