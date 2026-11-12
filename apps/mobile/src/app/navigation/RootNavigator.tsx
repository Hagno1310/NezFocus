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
import { currentLanguage, setLanguage } from '../../shared/i18n';
import { endingOf } from '../../domain/study/solo';
import {
  SoloMiniPlayer,
  SoloNotificationOpener,
} from '../../features/study/components/SoloMiniPlayer';
import { useSolo, useSoloSync } from '../../features/study/hooks/useSolo';
import { AskNotifications } from '../../features/study/screens/AskNotifications';
import { SoloScreen } from '../../features/study/screens/SoloScreen';
import { StatsScreen } from '../../features/study/screens/StatsScreen';
import { StudyHome } from '../../features/study/screens/StudyHome';
import { useStudyStatsSync } from '../../features/study/hooks/useStudyStats';
import { CreateServerScreen } from '../../features/servers/screens/CreateServerScreen';
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
import { PrivacyScreen } from '../../features/me/screens/PrivacyScreen';
import { SessionsScreen } from '../../features/me/screens/SessionsScreen';
import { useMeSync } from '../../features/me/hooks/useMe';
import { Button } from '../../shared/ui/Button';
import { StyleSheet, View } from 'react-native';
import { space } from '../../shared/theme';
import { homeStore } from '../../domain/servers/homeStore';
import { NoServerHome } from '../../features/servers/screens/LeftDrawer';
import { ChannelOverviewScreen } from '../../features/servers/screens/ChannelOverviewScreen';
import { ChannelPermissionsScreen } from '../../features/servers/screens/ChannelPermissionsScreen';
import { ChannelSettingsScreen } from '../../features/servers/screens/ChannelSettingsScreen';
import { OverwriteEditScreen } from '../../features/servers/screens/OverwriteEditScreen';
import { RoleEditScreen } from '../../features/servers/screens/RoleEditScreen';
import { RolesScreen } from '../../features/servers/screens/RolesScreen';
import { ServerOverviewScreen } from '../../features/servers/screens/ServerOverviewScreen';
import { ServerSettingsScreen } from '../../features/servers/screens/ServerSettingsScreen';
import { HomeDrawers } from './HomeDrawers';
import { Placeholder } from './Placeholder';
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
  Main: undefined;
  // Replaces everything while sessionStore.upgradeRequired (42601 on any request, NFR-MOB-12).
  UpdateRequired: undefined; // S-AUTH-00
  Invite: { code: string };
  UiGallery: undefined; // dev only (P0-3b)
  ChannelLink: { serverId: string; channelId: string; messageId?: string };
};

type StudyParamList = {
  StudyHome: undefined; // S-STUDY-01
  Solo: undefined; // S-STUDY-02
  AskNotifications: undefined; // S-ROOM-09 first-focus
  Stats: { date?: string } | undefined; // S-STUDY-03
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
  JoinByCode: undefined; // ponytail: placeholder for S-HOME-06 join-by-code until P2-A1 (#14)
  // ponytail: where S-HOME-02 / S-HOME-09 / S-SET-01 lead before those screens exist —
  // voice room P3-B1 (#26), DMs P2-B3 (#20), invite P2-A1 (#14), and the rest per row.
  HomePlaceholder: { title: string; ticket?: string };
  ServerSettings: { serverId: string }; // S-SET-01
  ServerOverview: { serverId: string; cropped?: ImageFile }; // S-SET-01 overview
  Roles: { serverId: string }; // S-SET-02
  RoleEdit: { serverId: string; roleId: string }; // S-SET-02 edit-role
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
  Blocked: undefined; // S-DM-04 `blocked` (P2-B2.3 #112), placeholder until then
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
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeRoot">
        {({ navigation }) => {
          const placeholder = (title: string, ticket?: string) => () =>
            navigation.navigate('HomePlaceholder', { title, ticket });
          const dm = placeholder(t('screens.directMessages'), 'P2-B3 (#20)');
          return noServer ? (
            <NoServerHome
              onCreate={() => navigation.navigate('CreateServer')}
              onJoinByCode={() => navigation.navigate('JoinByCode')}
              onDirectMessages={dm}
            />
          ) : (
            <HomeDrawers
              actions={{
                onAdd: () => navigation.navigate('CreateServer'),
                onOpenVoice: (channel) =>
                  placeholder(channel.name, 'P3-B1 (#26)')(),
                onDirectMessages: dm,
                onInvite: placeholder(t('screens.invite'), 'P2-A1 (#14)'),
                menu: {
                  invite: placeholder(t('screens.invite'), 'P2-A1 (#14)'),
                  settings: (serverId) =>
                    navigation.navigate('ServerSettings', { serverId }),
                  // ponytail: report (P3-A5 #25), leave / owner-leave (P3-A4 #24).
                  report: placeholder(t('servers.menu.report'), 'P3-A5 (#25)'),
                  leave: placeholder(t('servers.menu.leave'), 'P3-A4 (#24)'),
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
              navigation.navigate('Roles', { serverId: route.params.serverId })
            }
            onRow={(title, ticket) =>
              navigation.navigate('HomePlaceholder', { title, ticket })
            }
            onLostAccess={() => navigation.popTo('HomeRoot')}
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
            onMembers={(title) =>
              navigation.navigate('HomePlaceholder', {
                title,
                ticket: 'P2-A2 (#15)',
              })
            }
            onLostAccess={() =>
              navigation.popTo('ServerSettings', {
                serverId: route.params.serverId,
              })
            }
          />
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
      <HomeStack.Screen
        name="JoinByCode"
        options={{ headerShown: true, title: t('screens.joinByCode') }}
      >
        {() => <Placeholder title={t('screens.joinByCode')} />}
      </HomeStack.Screen>
    </HomeStack.Navigator>
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
  const openSolo = () => props.navigation.navigate('Study', { screen: 'Solo' });
  return (
    <>
      <SoloNotificationOpener onOpen={openSolo} />
      {!keyboard && !fullScreen && (
        <>
          {/* Hidden on the Solo screen itself (C-08). */}
          {!onSolo && <SoloMiniPlayer onOpen={openSolo} />}
          <TabBar {...props} tabs={tabs} />
        </>
      )}
    </>
  );
}

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
  ['Blocked', 'me.blocked', 'P2-B2.3 (#112)'],
  ['Notifications', 'me.notifications', 'P1-A5.3 (#78)'],
  ['Appearance', 'me.appearance', 'P1-A5.4 (#79)'],
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
            onSaved={() => navigation.goBack()}
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

const toggleLanguage = () =>
  setLanguage(currentLanguage() === 'vi' ? 'en' : 'vi');

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
    language: {
      label: t('placeholder.switchLanguage'),
      onPress: toggleLanguage,
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
        dev.language,
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
  const dev = useDevActions();
  const gallery = useGalleryAction();
  // ponytail: sample badges for comparing with the C-03 board; real counts come with P2-A4.4 (#106).
  const [sampleBadges, setSampleBadges] = useState(false);
  useSoloSync();
  useStudyStatsSync();
  useMeSync();
  const solo = useSolo();
  // C-03 / SRS 3.1: dot on Học while the user is in a Focus Session.
  const studying = !!solo && !endingOf(solo);
  const tabs = {
    Home: { icon: House, badge: sampleBadges ? 3 : undefined },
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
  return (
    // CR-15: Back at the root of any other tab returns to Home, keeping that tab's state.
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
              __DEV__
                ? [dev.language, ...gallery, ...badgeToggle, ...endedActions]
                : []
            }
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { t } = useTranslation();
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
      <Stack.Screen name="Invite" options={{ title: t('screens.invite') }}>
        {() => <Placeholder title={t('screens.invite')} />}
      </Stack.Screen>
      <Stack.Screen
        name="ChannelLink"
        options={{ title: t('screens.channel') }}
      >
        {() => <Placeholder title={t('screens.channel')} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  dev: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] },
});
