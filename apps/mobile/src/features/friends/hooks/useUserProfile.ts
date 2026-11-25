import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchProfile } from '../../../data/friends/profile';
import { onGatewayEvent } from '../../../domain/gateway/gatewayStore';

export const profileKey = (userId: string) => ['profile', userId] as const;

// S-HOME-10 / S-DM-02: a relationship change (mine or theirs) can change can_message.
export function useUserProfile(userId: string | null) {
  const client = useQueryClient();
  useEffect(
    () =>
      onGatewayEvent((e) => {
        if (
          userId &&
          (e.t === 'RELATIONSHIP_ADD' || e.t === 'RELATIONSHIP_REMOVE')
        )
          void client.invalidateQueries({ queryKey: profileKey(userId) });
      }),
    [client, userId],
  );
  return useQuery({
    queryKey: profileKey(userId ?? ''),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    // Try once even when NetInfo says offline: it can be wrong behind a captive Wi-Fi.
    networkMode: 'offlineFirst',
  });
}
