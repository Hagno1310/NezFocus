import { ProfileRoutes, UserProfile } from '@nezfocus/shared';
import { api } from '../api';

// REQ-AUTH-06 v1.9: someone else's profile, with can_message (chốt 25/11/2026).
export const fetchProfile = async (userId: string) =>
  UserProfile.parse(
    await api.request(ProfileRoutes.byUser.replace(':id', userId)),
  );
