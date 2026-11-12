import { attachmentRepository } from '../../../data/attachments';
import { serverRepository } from '../../../data/servers';
import type { ImageFile } from '../../../domain/attachments/AttachmentRepository';
import { uploadImage } from '../../../domain/attachments/upload';
import { applyGatewayEvent } from '../../../domain/servers/homeStore';
import { saveServer } from '../../../domain/servers/updateServer';
import { useGuardedMutation } from '../../../shared/hooks/useGuardedMutation';

// S-SET-01 "Đổi ảnh server" (P1-A4.7 #211): a cropped photo is uploaded as `server_icon`
// and set at once; null goes back to the initials. Shown in the drawer before SERVER_UPDATE.
export function useServerIcon(serverId: string) {
  return useGuardedMutation(async (file: ImageFile | null) => {
    let iconId: string | null = null;
    if (file) {
      const upload = await uploadImage(
        attachmentRepository,
        file,
        'server_icon',
      );
      if (!upload.ok) return { ok: false as const, error: upload.error };
      iconId = upload.id;
    }
    const result = await saveServer(serverRepository, serverId, {
      icon_attachment_id: iconId,
    });
    if (!result.ok)
      return {
        ok: false as const,
        error: result.error === 'forbidden' ? 'forbidden' : 'network',
      } as const;
    applyGatewayEvent({ t: 'SERVER_UPDATE', d: result.server, s: 0 });
    return { ok: true as const };
  });
}
