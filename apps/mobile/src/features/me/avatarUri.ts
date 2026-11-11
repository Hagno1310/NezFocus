import type { AvatarUrls } from '@nezfocus/shared';
import { mediaUri } from '../../data/api/media';

export const avatarUri = (
  avatar: AvatarUrls | null | undefined,
  size: keyof AvatarUrls,
) => mediaUri(avatar?.[size]);
