import { useTranslation } from 'react-i18next';
import { todayProgress } from '../../../domain/study/stats';
import { TodayProgress } from '../../../shared/ui/Stats';

// C-37 with the STUDY-03 AC6 sentences, for S-STUDY-01 and S-STUDY-03.
export function Today({ minutes }: { minutes: number }) {
  const { t } = useTranslation();
  const p = todayProgress(minutes);
  return (
    <TodayProgress
      ratio={p.ratio}
      label={t(p.reached ? 'study.todayReached' : 'study.today', { minutes })}
      a11y={t(p.reached ? 'study.todayReachedA11y' : 'study.todayA11y', {
        minutes,
      })}
    />
  );
}
