import type { DuplicateName } from '@nezfocus/shared';
import { useTranslation } from 'react-i18next';
import type { ChannelActionError } from '../../../domain/servers/channels';

const upper = (name: string) => name.toLocaleUpperCase('vi');

// The sentences REQ-SRV-02 v1.9 puts under a channel name (spec 08 › S-SET-06 "Không trùng
// tên"): categories in capitals, a text channel "kênh #tên", a voice channel "phòng Tên".
export function useChannelText() {
  const { t } = useTranslation();

  const duplicate = (d: DuplicateName) => {
    if (d.kind === 'category')
      return t('servers.channels.dupCategory', { name: upper(d.name) });
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
      category: d.category === null ? '' : upper(d.category),
    });
  };

  // What goes under the name field; null for the errors shown elsewhere.
  const nameError = (e: ChannelActionError | null): string | null => {
    switch (e?.kind) {
      case 'length':
        return t('servers.channels.nameLength');
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

  return { duplicate, nameError };
}
