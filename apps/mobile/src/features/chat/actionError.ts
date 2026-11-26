import { ErrorCode } from '@nezfocus/shared';
import type { TFunction } from 'i18next';
import {
  CircleAlert,
  MessageSquareX,
  Timer,
  WifiOff,
} from 'lucide-react-native';
import { showToast } from '../../shared/ui/Toast';

// S-HOME-04 › Tương tác and 10 S-MOD-04 "Toast chung theo mã", for every action on a message
// (the sheet, the pins drawer).
export function showActionError(t: TFunction, err: unknown) {
  const e = err as { code?: number; retry_after?: number | null };
  if (e.code === ErrorCode.MaxReactionsReached)
    showToast({ message: t('chat.maxReactions') });
  // REQ-MSG-10 AC2.
  else if (e.code === ErrorCode.MaxPinsReached)
    showToast({ message: t('chat.maxPins') });
  else if (
    e.code === ErrorCode.Forbidden ||
    e.code === ErrorCode.CannotMessageUser
  )
    showToast({ icon: CircleAlert, message: t('chat.noLongerAllowed') });
  else if (e.code === ErrorCode.RateLimited)
    showToast({
      icon: Timer,
      message: t('chat.tooFast', {
        count: Math.max(1, Math.ceil(e.retry_after ?? 1)),
      }),
    });
  else if (e.code === ErrorCode.NotFound)
    showToast({ icon: MessageSquareX, message: t('chat.messageDeleted') });
  else showToast({ icon: WifiOff, message: t('chat.cannotConnect') });
}
