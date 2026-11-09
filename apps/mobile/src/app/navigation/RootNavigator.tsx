import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
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
import { StudyHome } from '../../features/study/screens/StudyHome';
import { CreateServerScreen } from '../../features/servers/screens/CreateServerScreen';
import { useKeyboardVisible } from '../../shared/hooks/useKeyboardVisible';
import { TabBar } from '../../shared/ui/TabBar';
import type { SignInMode } from '../../domain/auth/authFlow';
import { CompleteAccountScreen } from '../../features/auth/screens/CompleteAccountScreen';
import { SignInScreen } from '../../features/auth/screens/SignInScreen';
import { UpdateRequiredScreen } from '../../features/auth/screens/UpdateRequiredScreen';
import { CreateAccountScreen } from '../../features/auth/screens/CreateAccountScreen';
import { EnterCodeScreen } from '../../features/auth/screens/EnterCodeScreen';
import { WelcomeScreen } from '../../features/auth/screens/WelcomeScreen';
import { Button } from '../../shared/ui/Button';
import { StyleSheet, View } from 'react-native';
import { space } from '../../shared/theme';
import { homeStore } from '../../domain/servers/homeStore';
import { NoServerHome } from '../../features/servers/screens/LeftDrawer';
import { ChannelOverviewScreen } from '../../features/servers/screens/ChannelOverviewScreen';
import { ChannelSettingsScreen } from '../../features/servers/screens/ChannelSettingsScreen';
import { ServerOverviewScreen } from '../../features/servers/screens/ServerOverviewScreen';
import { ServerSettingsScreen } from '../../features/servers/screens/ServerSettingsScreen';
import { HomeDrawers } from './HomeDrawers';
import { useHeldWhileCovered } from './useHeldWhileCovered';
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
  ForgotPassword: undefined; // S-AUTH-05
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
};

type HomeParamList = {
  HomeRoot: undefined; // drawers around the open channel (S-HOME-01/02/03)
  CreateServer: undefined; // S-HOME-06
  JoinByCode: undefined; // ponytail: placeholder for S-HOME-06 join-by-code until P2-A1 (#14)
  // ponytail: where S-HOME-02 / S-HOME-09 / S-SET-01 lead before those screens exist —
  // voice room P3-B1 (#26), DMs P2-B3 (#20), invite P2-A1 (#14), and the rest per row.
  HomePlaceholder: { title: string; ticket?: string };
  ServerSettings: { serverId: string }; // S-SET-01
  ServerOverview: { serverId: string }; // S-SET-01 overview
  ChannelSettings: { serverId: string; channelId: string }; // S-SET-06
  ChannelOverview: { serverId: string; channelId: string }; // S-SET-06 overview
};

type TabParamList = {
  Home: NavigatorScreenParams<HomeParamList> | undefined;
  Study: NavigatorScreenParams<StudyParamList> | undefined;
  Tasks: undefined;
  Inbox: undefined;
  Me: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const StudyStack = createNativeStackNavigator<StudyParamList>();
const HomeStack = createNativeStackNavigator<HomeParamList>();

// S-HOME-02 `no-server`: READY listed none; the drawer becomes the Home root. The switch
// waits while S-HOME-06 covers this screen (useHeldWhileCovered).
function HomeRoot({
  navigation,
}: {
  navigation: NativeStackNavigationProp<HomeParamList, 'HomeRoot'>;
}) {
  const { t } = useTranslation();
  const noServer = useHeldWhileCovered(
    useStore(homeStore, (s) => s.servers?.length === 0),
  );
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
        onOpenVoice: (channel) => placeholder(channel.name, 'P3-B1 (#26)')(),
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
        // ponytail: `category-overwrites` comes with P1-A3.6 (#69).
        onCategoryPermissions: placeholder(
          t('servers.channels.categoryPermissions'),
          'P1-A3.6 (#69)',
        ),
      }}
    />
  );
}

// CR-15: S-HOME-06 and other Home screens stack above the drawers; Back pops them first.
function HomeTab() {
  const { t } = useTranslation();
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeRoot" component={HomeRoot} />
      <HomeStack.Screen name="CreateServer">
        {({ navigation }) => (
          <CreateServerScreen
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
            onRow={(title, ticket) =>
              navigation.navigate('HomePlaceholder', { title, ticket })
            }
            onLostAccess={() => navigation.popTo('HomeRoot')}
          />
        )}
      </HomeStack.Screen>
      <HomeStack.Screen name="ServerOverview">
        {({ navigation, route }) => (
          <ServerOverviewScreen
            serverId={route.params.serverId}
            onSaved={navigation.goBack}
            onLostAccess={() => navigation.popTo('HomeRoot')}
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
            onRow={(title, ticket) =>
              navigation.navigate('HomePlaceholder', { title, ticket })
            }
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
  const onSolo =
    route?.name === 'Study' && getFocusedRouteNameFromRoute(route) === 'Solo';
  const openSolo = () => props.navigation.navigate('Study', { screen: 'Solo' });
  return (
    <>
      <SoloNotificationOpener onOpen={openSolo} />
      {!keyboard && (
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
      <Tab.Screen name="Me" options={{ title: t('tabs.me') }}>
        {() => (
          <Placeholder
            title={t('tabs.me')}
            actions={[
              dev.language,
              dev.signOut,
              ...gallery,
              ...badgeToggle,
              ...endedActions,
            ]}
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
            options={{ title: t('screens.forgotPassword') }}
          >
            {() => <Placeholder title={t('screens.forgotPassword')} />}
          </Stack.Screen>
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
