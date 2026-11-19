import {
  createDrawerNavigator,
  getDrawerStatusFromState,
  type DrawerContentComponentProps,
  type DrawerNavigationProp,
} from '@react-navigation/drawer';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type {
  LegacyPanGesture,
  PanGesture,
} from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { homeStore, openChannel } from '../../domain/servers/homeStore';
import { ChannelScreen } from '../../features/chat/screens/ChannelScreen';
import {
  LeftDrawer,
  type LeftDrawerActions,
} from '../../features/servers/screens/LeftDrawer';
import { useTheme } from '../../shared/theme';
import { swipeGuard } from '../../shared/ui/swipeGuard';
import { drawerGesture, type DrawerSide } from './drawerGesture';
import { Placeholder } from './Placeholder';

type LeftParamList = { RightDrawerHost: undefined };
type RightParamList = { Channel: undefined };

const PEEK = 56;

const Left = createDrawerNavigator<LeftParamList>();
const Right = createDrawerNavigator<RightParamList>();

type DrawerOpenState = { leftOpen: boolean; rightOpen: boolean };

function drawerOptions(
  side: DrawerSide,
  open: DrawerOpenState,
  width: number,
  held: boolean,
) {
  const { swipeEnabled, failOffsetX } = drawerGesture(side, open);
  return {
    headerShown: false,
    drawerPosition: side,
    // SRS 3.1: swipe from anywhere in the content; Android keeps the edge strip for system Back itself.
    swipeEdgeWidth: width,
    swipeEnabled: swipeEnabled && !held,
    // Gotcha: drawer types say RNGH 3 `PanGesture`, but it builds a legacy Gesture.Pan() at runtime.
    configureGestureHandler: ((g: LegacyPanGesture) =>
      g.failOffsetX(failOffsetX)) as unknown as (g: PanGesture) => PanGesture,
  };
}

const openFrom = (e: { data: { state: unknown } }) =>
  getDrawerStatusFromState(
    e.data.state as Parameters<typeof getDrawerStatusFromState>[0],
  ) === 'open';

// S-HOME-01; before READY opens a channel the drawers still open from the placeholder.
function ChannelHost() {
  const { t } = useTranslation();
  const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
  const leftDrawer = navigation.getParent<DrawerNavigationProp<ParamListBase>>(
    'LeftDrawer' as never,
  );
  const open = useStore(homeStore, (s) => s.open);
  const openLeft = () => leftDrawer?.openDrawer();
  const openRight = () => navigation.openDrawer();
  if (open)
    return (
      <ChannelScreen
        channelId={open.channelId}
        serverId={open.serverId}
        onOpenLeft={openLeft}
        onOpenRight={openRight}
      />
    );
  return (
    <Placeholder
      title={t('screens.channel')}
      actions={[
        { label: t('placeholder.openLeft'), onPress: openLeft },
        { label: t('placeholder.openRight'), onPress: openRight },
      ]}
    />
  );
}

// S-HOME-02 in the drawer: opening a text channel closes the drawer onto it.
function LeftDrawerContent({
  navigation,
  actions,
}: DrawerContentComponentProps & {
  actions: Omit<LeftDrawerActions, 'onOpenChannel'>;
}) {
  useEffect(
    () =>
      homeStore.subscribe((s, prev) => {
        if (s.open !== prev.open) navigation.closeDrawer();
      }),
    [navigation],
  );
  return (
    <LeftDrawer
      actions={{
        ...actions,
        onOpenChannel: (c) =>
          openChannel({ serverId: c.server_id, channelId: c.id }),
      }}
    />
  );
}

// Home tab: left drawer (server rail + channels) wraps right drawer (members / tasks / pins).
export function HomeDrawers({
  actions,
}: {
  actions: Omit<LeftDrawerActions, 'onOpenChannel'>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const held = useStore(swipeGuard, (s) => s.held);
  // Spec 02 › Drawer: 334 on a 390 frame (304 on 360): the channel shows a 56 strip.
  const drawerStyle = {
    width: width - PEEK,
    backgroundColor: 'transparent',
  };
  const [open, setOpen] = useState<DrawerOpenState>({
    leftOpen: false,
    rightOpen: false,
  });

  return (
    <Left.Navigator
      id="LeftDrawer"
      screenOptions={{
        ...drawerOptions('left', open, width, held),
        drawerStyle,
        overlayColor: colors.scrim,
      }}
      screenListeners={{
        state: (e) => setOpen((o) => ({ ...o, leftOpen: openFrom(e) })),
      }}
      drawerContent={(props) => (
        <LeftDrawerContent {...props} actions={actions} />
      )}
    >
      <Left.Screen name="RightDrawerHost">
        {() => (
          <Right.Navigator
            id="RightDrawer"
            screenOptions={{
              ...drawerOptions('right', open, width, held),
              drawerStyle: { width: width - PEEK },
              overlayColor: colors.scrim,
            }}
            screenListeners={{
              state: (e) => setOpen((o) => ({ ...o, rightOpen: openFrom(e) })),
            }}
            drawerContent={() => (
              <Placeholder title={t('screens.rightDrawer')} />
            )}
          >
            <Right.Screen name="Channel" component={ChannelHost} />
          </Right.Navigator>
        )}
      </Left.Screen>
    </Left.Navigator>
  );
}
