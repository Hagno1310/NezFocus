import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import {
  sessionStore,
  setSessionStatus,
} from '../../domain/session/sessionStore';
import { currentLanguage, setLanguage } from '../../shared/i18n';
import { HomeDrawers } from './HomeDrawers';
import { Placeholder } from './Placeholder';

export type RootStackParamList = {
  // Auth stack (spec 01): no TabBar.
  Welcome: undefined; // S-AUTH-01
  CreateAccount: undefined; // S-AUTH-02
  EnterCode: undefined; // S-AUTH-03
  SignIn: undefined; // S-AUTH-04
  ForgotPassword: undefined; // S-AUTH-05
  CompleteAccount: undefined; // S-ONB-01
  Main: undefined;
  // Reachable in every session state: 42601 can arrive on any request (NFR-MOB-12).
  UpdateRequired: undefined; // S-AUTH-00
  Invite: { code: string };
  ChannelLink: { serverId: string; channelId: string; messageId?: string };
};

type TabParamList = {
  Home: undefined;
  Study: undefined;
  Tasks: undefined;
  Inbox: undefined;
  Me: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const toggleLanguage = () =>
  setLanguage(currentLanguage() === 'vi' ? 'en' : 'vi');

function useDevActions() {
  const { t } = useTranslation();
  return {
    signIn: {
      label: t('placeholder.fakeSignIn'),
      onPress: () => setSessionStatus('signed-in'),
    },
    incomplete: {
      label: t('placeholder.fakeIncomplete'),
      onPress: () => setSessionStatus('incomplete'),
    },
    signOut: {
      label: t('placeholder.signOut'),
      onPress: () => setSessionStatus('signed-out'),
    },
    language: {
      label: t('placeholder.switchLanguage'),
      onPress: toggleLanguage,
    },
  };
}

function WelcomePlaceholder({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Welcome'>) {
  const { t } = useTranslation();
  const dev = useDevActions();
  const links = [
    ['CreateAccount', t('screens.createAccount')],
    ['EnterCode', t('screens.enterCode')],
    ['SignIn', t('screens.signIn')],
    ['ForgotPassword', t('screens.forgotPassword')],
    ['UpdateRequired', t('screens.updateRequired')],
  ] as const;
  return (
    <Placeholder
      title={t('screens.welcome')}
      actions={[
        ...links.map(([screen, label]) => ({
          label,
          onPress: () => navigation.navigate(screen),
        })),
        dev.signIn,
        dev.incomplete,
        dev.language,
      ]}
    />
  );
}

function MainTabs() {
  const { t } = useTranslation();
  const dev = useDevActions();
  return (
    // CR-15: Back at the root of any other tab returns to Home, keeping that tab's state.
    <Tab.Navigator backBehavior="firstRoute">
      <Tab.Screen
        name="Home"
        component={HomeDrawers}
        options={{ title: t('tabs.home'), headerShown: false }}
      />
      <Tab.Screen name="Study" options={{ title: t('tabs.study') }}>
        {() => <Placeholder title={t('tabs.study')} />}
      </Tab.Screen>
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
            actions={[dev.language, dev.signOut]}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { t } = useTranslation();
  const status = useStore(sessionStore, (s) => s.status);
  const dev = useDevActions();

  return (
    <Stack.Navigator>
      {status === 'signed-out' && (
        <Stack.Group>
          <Stack.Screen
            name="Welcome"
            component={WelcomePlaceholder}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateAccount"
            options={{ title: t('screens.createAccount') }}
          >
            {() => <Placeholder title={t('screens.createAccount')} />}
          </Stack.Screen>
          <Stack.Screen
            name="EnterCode"
            options={{ title: t('screens.enterCode') }}
          >
            {() => <Placeholder title={t('screens.enterCode')} />}
          </Stack.Screen>
          <Stack.Screen name="SignIn" options={{ title: t('screens.signIn') }}>
            {() => (
              <Placeholder title={t('screens.signIn')} actions={[dev.signIn]} />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="ForgotPassword"
            options={{ title: t('screens.forgotPassword') }}
          >
            {() => <Placeholder title={t('screens.forgotPassword')} />}
          </Stack.Screen>
        </Stack.Group>
      )}
      {status === 'incomplete' && (
        <Stack.Screen name="CompleteAccount" options={{ headerShown: false }}>
          {() => (
            <Placeholder
              title={t('screens.completeAccount')}
              actions={[dev.signIn, dev.language, dev.signOut]}
            />
          )}
        </Stack.Screen>
      )}
      {status === 'signed-in' && (
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
      )}
      <Stack.Screen name="UpdateRequired" options={{ headerShown: false }}>
        {() => <Placeholder title={t('screens.updateRequired')} />}
      </Stack.Screen>
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
