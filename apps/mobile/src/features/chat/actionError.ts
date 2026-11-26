import type { TFunction } from 'i18next';
import {
  CircleAlert,
  MessageSquareX,
  Timer,
  WifiOff,
} from 'lucide-react-native';
import { actionFailure } from '../../domain/messages/actionFailure';
import { showToast } from '../../shared/ui/Toast';

// S-HOME-04 › Tương tác and 10 S-MOD-04 "Toast chung theo mã", for every action on a message
// (the sheet, the pins drawer).
export function showActionError(t: TFunction, err: unknown) {
  const failure = actionFailure(err);
  switch (failure.kind) {
    case 'max-reactions':
      return showToast({ message: t('chat.maxReactions') });
    case 'max-pins':
      return showToast({ message: t('chat.maxPins') });
    case 'not-allowed':
      return showToast({
        icon: CircleAlert,
        message: t('chat.noLongerAllowed'),
      });
    case 'too-fast':
      return showToast({
        icon: Timer,
        message: t('chat.tooFast', { count: failure.seconds }),
      });
    case 'deleted':
      return showToast({
        icon: MessageSquareX,
        message: t('chat.messageDeleted'),
      });
    case 'offline':
      return showToast({ icon: WifiOff, message: t('chat.cannotConnect') });
    case 'failed':
      return showToast({
        icon: CircleAlert,
        message: t('chat.somethingWrong'),
      });
  }
}
