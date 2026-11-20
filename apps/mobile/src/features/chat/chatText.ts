import type { TFunction } from 'i18next';
import type { LastActive } from '../../domain/account/sessions';
import type { DayLabel } from '../../domain/messages/chatRows';

// Divider/date: "Hôm nay" · "Hôm qua" · "Thứ Năm, 15/10/2026".
export const dayText = (t: TFunction, d: DayLabel) =>
  d.kind === 'today'
    ? t('chat.today')
    : d.kind === 'yesterday'
      ? t('chat.yesterday')
      : t('chat.dayDate', {
          weekday: t('chat.weekdays').split('|')[d.weekday],
          date: d.date,
        });

// C-10 Giờ ở đầu tin: "20:02" · "Hôm qua 20:00" · "16/10/2026 20:00".
export const timeText = (t: TFunction, at: LastActive, spoken = false) =>
  at.kind === 'today'
    ? at.time
    : at.kind === 'yesterday'
      ? t(spoken ? 'chat.a11yTimeYesterday' : 'chat.timeYesterday', {
          time: at.time,
        })
      : t('chat.timeDate', { date: at.date, time: at.time });
