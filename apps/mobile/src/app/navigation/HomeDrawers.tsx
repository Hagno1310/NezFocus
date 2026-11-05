import {
  createDrawerNavigator,
  getDrawerStatusFromState,
  type DrawerNavigationProp,
} from '@react-navigation/drawer';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type {
  LegacyPanGesture,
  PanGesture,
} from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { drawerGesture, type DrawerSide } from './drawerGesture';
import { Placeholder } from './Placeholder';

type LeftParamList = { RightDrawerHost: undefined };
type RightParamList = { Channel: undefined };

const Left = createDrawerNavigator<LeftParamList>();
const Right = createDrawerNavigator<RightParamList>();

type DrawerOpenState = { leftOpen: boolean; rightOpen: boolean };

function drawerOptions(side: DrawerSide, open: DrawerOpenState, width: number) {
  const { swipeEnabled, failOffsetX } = drawerGesture(side, open);
  return {
    headerShown: false,
    drawerPosition: side,
    // SRS 3.1: swipe from anywhere in the content; Android keeps the edge strip for system Back itself.
    swipeEdgeWidth: width,
    swipeEnabled,
    // Gotcha: drawer types say RNGH 3 `PanGesture`, but it builds a legacy Gesture.Pan() at runtime.
    configureGestureHandler: ((g: LegacyPanGesture) =>
      g.failOffsetX(failOffsetX)) as unknown as (g: PanGesture) => PanGesture,
  };
}

const openFrom = (e: { data: { state: unknown } }) =>
  getDrawerStatusFromState(
    e.data.state as Parameters<typeof getDrawerStatusFromState>[0],
  ) === 'open';

function ChannelPlaceholder() {
  const { t } = useTranslation();
  const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
  const leftDrawer = navigation.getParent<DrawerNavigationProp<ParamListBase>>(
    'LeftDrawer' as never,
  );
  // SRS 3.1: ≡ and 👥 buttons always exist as the non-gesture way to open the drawers.
  return (
    <Placeholder
      title={t('screens.channel')}
      actions={[
        {
          label: t('placeholder.openLeft'),
          onPress: () => leftDrawer?.openDrawer(),
        },
        {
          label: t('placeholder.openRight'),
          onPress: () => navigation.openDrawer(),
        },
      ]}
    />
  );
}

// Home tab: left drawer (server rail + channels) wraps right drawer (members / tasks / pins).
export function HomeDrawers() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<DrawerOpenState>({
    leftOpen: false,
    rightOpen: false,
  });

  return (
    <Left.Navigator
      id="LeftDrawer"
      screenOptions={drawerOptions('left', open, width)}
      screenListeners={{
        state: (e) => setOpen((o) => ({ ...o, leftOpen: openFrom(e) })),
      }}
      drawerContent={() => <Placeholder title={t('screens.leftDrawer')} />}
    >
      <Left.Screen name="RightDrawerHost">
        {() => (
          <Right.Navigator
            id="RightDrawer"
            screenOptions={drawerOptions('right', open, width)}
            screenListeners={{
              state: (e) => setOpen((o) => ({ ...o, rightOpen: openFrom(e) })),
            }}
            drawerContent={() => (
              <Placeholder title={t('screens.rightDrawer')} />
            )}
          >
            <Right.Screen name="Channel" component={ChannelPlaceholder} />
          </Right.Navigator>
        )}
      </Left.Screen>
    </Left.Navigator>
  );
}
