import type {
  CreateInviteRequest,
  InvitePreview,
  InviteResponse,
  ServerResponse,
} from '@nezfocus/shared';

// SRS 5.3 Invite. Remote and Fake implementations live in data/invites.
export interface InviteRepository {
  // REQ-SRV-03: my own live invite with the same settings comes back instead of a new one.
  createInvite(
    channelId: string,
    body: CreateInviteRequest,
  ): Promise<InviteResponse>;
  revokeInvite(code: string): Promise<void>;
  // REQ-SRV-04: public, so S-MOD-01 `guest` works signed out.
  previewInvite(code: string): Promise<InvitePreview>;
  acceptInvite(code: string): Promise<ServerResponse>;
}
