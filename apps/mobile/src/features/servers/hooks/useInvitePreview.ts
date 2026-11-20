import type { InvitePreview } from '@nezfocus/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inviteRepository } from '../../../data/invites';
import { lookupInvite } from '../../../domain/invites/joinInvite';

export const invitePreviewKey = (code: string) => ['invite', code] as const;

// S-HOME-06 "Tiếp tục": look the code up; the preview it finds is what S-MOD-01 shows first.
export function useLookupInvite() {
  const client = useQueryClient();
  return async (text: string) => {
    const result = await lookupInvite(inviteRepository, text);
    if (result.ok)
      client.setQueryData(invitePreviewKey(result.code), result.preview);
    return result;
  };
}

// S-MOD-01: the preview of a code (already there when coming from S-HOME-06). Errors stay
// in the query for the screen to read; nothing is retried (a broken invite stays broken).
export function useInvitePreview(code: string) {
  return useQuery<InvitePreview>({
    queryKey: invitePreviewKey(code),
    queryFn: () => inviteRepository.previewInvite(code),
    retry: false,
    staleTime: 30_000,
  });
}
