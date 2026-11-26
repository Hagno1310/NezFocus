import type {
  MessageAttachment,
  MessageAuthor,
  MessageResponse,
  MessageType,
  Reaction,
  ReferencedMessage,
} from '@nezfocus/shared';
import { attachmentFilePath, messageTypeCode } from '@nezfocus/shared';
import type { AttachmentRow } from '../attachments/attachments.schema.js';
import { avatarUrls } from '../attachments/media.js';
import type { MessageRow } from './messages.schema.js';

export type AuthorRow = {
  id: bigint;
  username: string | null;
  displayName: string | null;
  avatarKey: string | null;
};

const typeName = Object.fromEntries(
  Object.entries(messageTypeCode).map(([name, code]) => [code, name]),
) as Record<number, MessageType>;

const iso = (d: Date | null) => d?.toISOString() ?? null;

export const toMessageAuthor = (author: AuthorRow): MessageAuthor => ({
  id: author.id.toString(),
  username: author.username,
  display_name: author.displayName,
  avatar: avatarUrls(author.avatarKey),
});

// What a message needs from other rows: its reply line and reactions (REQ-MSG-05), its
// images (REQ-MSG-04).
export type MessageExtras = {
  referenced: { message: MessageRow; author: AuthorRow } | null;
  reactions: Reaction[];
  attachments: AttachmentRow[];
};

export const toMessageAttachment = (a: AttachmentRow): MessageAttachment => {
  const id = a.id.toString();
  return {
    id,
    filename: a.filename,
    content_type: a.contentType,
    size_bytes: a.sizeBytes,
    width: a.width,
    height: a.height,
    url: attachmentFilePath(id, 'original'),
    thumbnail_url: attachmentFilePath(id, 'thumbnail'),
  };
};

const toReferenced = (
  r: MessageExtras['referenced'],
): ReferencedMessage | null =>
  r && {
    id: r.message.id.toString(),
    author: toMessageAuthor(r.author),
    content: r.message.content,
  };

export const toMessageResponse = (
  m: MessageRow,
  author: AuthorRow,
  extras: MessageExtras = { referenced: null, reactions: [], attachments: [] },
): MessageResponse =>
  ({
    id: m.id.toString(),
    channel_id: m.channelId.toString(),
    author: toMessageAuthor(author),
    type: typeName[m.type] ?? 'default',
    content: m.content,
    nonce: m.nonce,
    mention_user_ids: m.mentionUserIds.map(String),
    mention_role_ids: m.mentionRoleIds.map(String),
    mention_everyone: m.mentionEveryone,
    system_data: m.systemData ?? null,
    reply_to_id: m.replyToId?.toString() ?? null,
    referenced_message: toReferenced(extras.referenced),
    reactions: extras.reactions,
    attachments: extras.attachments.map(toMessageAttachment),
    edited_at: iso(m.editedAt),
    pinned_at: iso(m.pinnedAt),
    created_at: m.createdAt.toISOString(),
  }) as MessageResponse;
