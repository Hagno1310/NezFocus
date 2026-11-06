import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { endingOf } from '../../../domain/study/solo';
import { Placeholder } from '../../../app/navigation/Placeholder';
import { CycleSheet } from '../components/CycleSheet';
import { cycleText } from '../format';
import { useLastCycle, useSolo, useStartSolo } from '../hooks/useSolo';
import { notificationPrompt } from '../hooks/useSoloAlerts';

// ponytail: stand-in for S-STUDY-01 with only the Solo block; the real tab is P1-B3.4 (#87).
export function StudyHome({
  onOpenSolo,
  onAskNotifications,
}: {
  onOpenSolo: () => void;
  onAskNotifications: () => void;
}) {
  const { t } = useTranslation();
  const snap = useSolo();
  const { cycle, set } = useLastCycle();
  const start = useStartSolo();
  const [choosing, setChoosing] = useState(false);
  const live = snap && !endingOf(snap);

  const begin = async (c = cycle) => {
    set(c);
    // 04 › Tương tác: "Bắt đầu" → S-ROOM-09 first if notifications were never asked for.
    if (await notificationPrompt.needed()) return onAskNotifications();
    // 40903 (already running elsewhere) still lands on the Solo screen, showing that session.
    start.mutate(c, { onSettled: () => onOpenSolo() });
  };

  return (
    <>
      <Placeholder
        title={t('tabs.study')}
        actions={
          live
            ? [{ label: t('study.open'), onPress: onOpenSolo }]
            : [
                {
                  label: t('study.cycle', { cycle: cycleText(cycle) }),
                  onPress: () => setChoosing(true),
                },
                { label: t('study.start'), onPress: () => void begin() },
              ]
        }
      />
      <CycleSheet
        key={String(choosing)}
        visible={choosing}
        mode="start"
        initial={cycle}
        loading={start.isPending}
        onDismiss={() => setChoosing(false)}
        onSubmit={(c) => {
          setChoosing(false);
          void begin(c);
        }}
      />
    </>
  );
}
