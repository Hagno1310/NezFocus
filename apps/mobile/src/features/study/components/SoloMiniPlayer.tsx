import {
  Coffee,
  LampDesk,
  Moon,
  Pause,
  Play,
  Square,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { timerOf } from '../../../domain/study/solo';
import { Button, IconButton } from '../../../shared/ui/Button';
import { Icon } from '../../../shared/ui/Icon';
import { MiniPlayer, PhaseBadge, phaseColor } from '../../../shared/ui/Focus';
import { clockText } from '../../../shared/ui/logic';
import { Text } from '../../../shared/ui/Text';
import { useToastAnchor } from '../../../shared/ui/Toast';
import { size } from '../../../shared/theme';
import { useNow, useSolo, useSoloAction } from '../hooks/useSolo';

const icons = { focus: LampDesk, short_break: Coffee, long_break: Moon };

// S-ROOM-08 `solo` / `solo-waiting`: above the TabBar on every tab except the Solo screen itself.
export function SoloMiniPlayer({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const snap = useSolo();
  const now = useNow();
  const action = useSoloAction();
  const timer = snap && timerOf(snap, now);
  useToastAnchor(timer ? size.miniPlayer : 0);
  if (!snap || !timer) return null;
  const act = (a: 'pause' | 'resume' | 'stop' | 'continue') =>
    action.mutate({ id: snap.session.id, action: { action: a } });
  const time = clockText(timer.remainingMs);
  const paused = timer.status === 'paused';

  if (timer.status === 'waiting')
    return (
      <MiniPlayer
        icon={<Icon as={Coffee} size="xl" color={phaseColor[timer.phase]} />}
        title={t('study.phase.waiting')}
        line={
          <Text variant="label" color="text-secondary" numberOfLines={1}>
            {t('study.waitingLeft', { time })}
          </Text>
        }
        actions={
          <Button
            size="S"
            label={t('study.continue')}
            onPress={() => act('continue')}
          />
        }
        onOpen={onOpen}
      />
    );

  return (
    <MiniPlayer
      icon={
        <Icon
          as={paused ? Pause : icons[timer.phase]}
          size="xl"
          color={paused ? 'text-secondary' : phaseColor[timer.phase]}
        />
      }
      title={t('study.solo')}
      line={
        <PhaseBadge
          phase={timer.phase}
          state={timer.status}
          size="S"
          label={t(
            paused ? 'study.phase.pausedShort' : `study.phase.${timer.phase}`,
          )}
          time={time}
        />
      }
      actions={
        <>
          <IconButton
            icon={paused ? Play : Pause}
            label={t(paused ? 'study.resume' : 'study.pause')}
            onPress={() => act(paused ? 'resume' : 'pause')}
          />
          <IconButton
            icon={Square}
            label={t('study.stop')}
            // The summary lives on the Solo screen (STUDY-10 AC6).
            onPress={() => {
              act('stop');
              onOpen();
            }}
          />
        </>
      }
      onOpen={onOpen}
    />
  );
}
