import {
  categoryTitle,
  type ChannelType,
  type DuplicateName,
} from '@nezfocus/shared';
import { useTranslation } from 'react-i18next';
import type { ChannelActionError } from '../../../domain/servers/channels';
import { showToast } from '../../../shared/ui/Toast';

// The sentences REQ-SRV-02 v1.9 puts under a channel name (spec 08 › S-SET-06 "Không trùng
// tên"): categories in capitals, a text channel "kênh #tên", a voice channel "phòng Tên".
export function useChannelText() {
  const { t } = useTranslation();

  const duplicate = (d: DuplicateName) => {
    if (d.kind === 'category')
      return t('servers.channels.dupCategory', { name: categoryTitle(d.name) });
    const top = d.category === null;
    const key =
      d.type === 'text'
        ? top
          ? 'dupTextTop'
          : 'dupTextIn'
        : top
          ? 'dupVoiceTop'
          : 'dupVoiceIn';
    return t(`servers.channels.${key}`, {
      name: d.name,
      category: d.category === null ? '' : categoryTitle(d.category),
    });
  };

  // What goes under the name field of a channel (or category); null for the errors shown
  // elsewhere.
  const nameError = (
    e: ChannelActionError | null,
    type: ChannelType,
  ): string | null => {
    switch (e?.kind) {
      case 'length':
        return type === 'category'
          ? t('servers.channels.categoryNameLength')
          : t('servers.channels.nameLength');
      case 'no-letter':
        return t('servers.channels.noLetter');
      case 'duplicate':
        return duplicate(e.duplicate);
      case 'server':
        return e.message;
      default:
        return null;
    }
  };

  // Spec 08 › Edge case: a 40302 / 40401 while saving closes the overlay or screen.
  const lostAccess = () =>
    showToast({ message: t('servers.channels.lostAccess') });

  return { duplicate, nameError, lostAccess };
}
