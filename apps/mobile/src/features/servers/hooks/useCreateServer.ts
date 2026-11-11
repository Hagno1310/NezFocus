import type { ServerTemplate } from '@nezfocus/shared';
import { useState } from 'react';
import { attachmentRepository } from '../../../data/attachments';
import { serverRepository } from '../../../data/servers';
import type { ImageFile } from '../../../domain/attachments/AttachmentRepository';
import {
  uploadImage,
  type ImageError,
} from '../../../domain/attachments/upload';
import {
  createServer,
  type CreateServerError,
} from '../../../domain/servers/createServer';
import { addServer, openChannel } from '../../../domain/servers/homeStore';
import { useGuardedMutation } from '../../../shared/hooks/useGuardedMutation';

// S-HOME-06 name-server → creating → created / create-error. A second tap while creating is
// ignored, so "Tạo server" twice never makes two servers.
export function useCreateServer(onCreated: () => void) {
  const [error, setError] = useState<CreateServerError | null>(null);
  // P1-A4.7 (#211): the icon is uploaded first; a refused one stops the create.
  const [iconError, setIconError] = useState<ImageError | null>(null);
  const mutation = useGuardedMutation(
    async (template: ServerTemplate, name: string, icon?: ImageFile) => {
      let iconId: string | undefined;
      if (icon) {
        const upload = await uploadImage(
          attachmentRepository,
          icon,
          'server_icon',
        );
        if (!upload.ok) return { ok: false as const, iconError: upload.error };
        iconId = upload.id;
      }
      return createServer(serverRepository, template, name, iconId);
    },
  );
  const submit = async (
    template: ServerTemplate,
    name: string,
    icon?: ImageFile,
  ) => {
    setError(null);
    setIconError(null);
    const result = await mutation.run(template, name, icon);
    if (!result) return;
    if ('iconError' in result) {
      const e = result.iconError;
      // Type / size sit under the icon; a lost upload reads like a lost create.
      return e === 'type' || e === 'too-big' ? setIconError(e) : setError(e);
    }
    if (!result.ok) return setError(result.error);
    const { server, channel } = result;
    addServer(server);
    if (channel) openChannel({ serverId: server.id, channelId: channel.id });
    // ponytail: S-HOME-07 (invite sheet, opened on arrival per the spec) comes with P2-A1 (#14).
    onCreated();
  };
  return {
    submit,
    pending: mutation.pending,
    error,
    iconError,
    clearIconError: () => setIconError(null),
    setIconError,
    clearError: () => setError(null),
  };
}
