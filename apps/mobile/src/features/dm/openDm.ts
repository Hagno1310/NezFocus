import { CANNOT_MESSAGE_TEXT, ErrorCode } from '@nezfocus/shared';
import { ApiError } from '../../data/api/client';
import { dmActions } from '../../data/dm';
import { i18n } from '../../shared/i18n';
import { showToast } from '../../shared/ui/Toast';

// "Nhắn tin" / 💬 anywhere (S-DM-04, S-HOME-10): open the pair's DM on the Home tab.
export function openDmWith(userId: string, then?: () => void) {
  dmActions
    .openWith(userId)
    .then(() => then?.())
    .catch((e: unknown) =>
      showToast({
        message:
          e instanceof ApiError && e.code === ErrorCode.CannotMessageUser
            ? CANNOT_MESSAGE_TEXT
            : i18n.t('friends.addSheet.errors.generic'),
      }),
    );
}
