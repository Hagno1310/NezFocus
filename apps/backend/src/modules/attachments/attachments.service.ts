import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  AVATAR_MAX_BYTES,
  AVATAR_SIZES,
  AVATAR_TYPES,
  ErrorCode,
  MESSAGE_ATTACHMENT_MAX_BYTES,
  MESSAGE_ATTACHMENT_TYPES,
  type AttachmentResponse,
  type AttachmentUploadResponse,
  type AttachmentVariant,
  type CreateAttachmentRequest,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { MessagesService } from '../messaging/messages.service.js';
import { ObjectStorage } from '../storage/object-storage.js';
import { AttachmentsRepository } from './attachments.repository.js';
import type { AttachmentRow } from './attachments.schema.js';
import { avatarVariants, detectImageType } from './avatar-image.js';
import { avatarKey, mediaPrefix, type PublicPurpose } from './media.js';
import { messageImage } from './message-image.js';

const UPLOAD_URL_SECONDS = 10 * 60;
const READ_URL_SECONDS = 10 * 60;
const SWEEP_EVERY_MS = 60 * 60_000;
const UNUSED_FOR_MS = 24 * 60 * 60_000;

const tooBig = () =>
  new AppError(ErrorCode.FileTooLarge, 'File is too large for this purpose');
const wrongType = () =>
  new AppError(ErrorCode.UnsupportedFileType, 'File type is not supported');
const notFound = () => new AppError(ErrorCode.NotFound, 'Unknown attachment');

// What each purpose takes (declared up front, then the real bytes at `complete`).
const RULES = {
  avatar: { maxBytes: AVATAR_MAX_BYTES, types: AVATAR_TYPES },
  server_icon: { maxBytes: AVATAR_MAX_BYTES, types: AVATAR_TYPES },
  message: {
    maxBytes: MESSAGE_ATTACHMENT_MAX_BYTES,
    types: MESSAGE_ATTACHMENT_TYPES,
  },
} as const;

const rulesOf = (purpose: string) => RULES[purpose as keyof typeof RULES];

const toResponse = (row: AttachmentRow): AttachmentResponse => ({
  id: row.id.toString(),
  purpose: row.purpose as AttachmentResponse['purpose'],
  content_type: row.contentType,
  width: row.width,
  height: row.height,
});

// Every object a row holds in storage.
const keysOf = (row: AttachmentRow) => {
  if (row.scanStatus !== 'clean') return [row.storageKey];
  if (row.purpose === 'message')
    return [row.storageKey, ...(row.thumbnailKey ? [row.thumbnailKey] : [])];
  return AVATAR_SIZES.map((size) => avatarKey(row.storageKey, size));
};

// SRS 5.3 Upload. Avatars (REQ-AUTH-06) and server icons (REQ-SRV-01): still images ≤ 8MB, kept
// as webp at 128 / 256 / 512. Message images (REQ-MSG-04, CR-28): jpg / png / webp / gif ≤ 25MB,
// kept upright without metadata plus a thumbnail (CR-28 #29). The declared type and size are
// checked up front so the app learns early; `complete` checks the real bytes again.
@Injectable()
export class AttachmentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('AttachmentsService');
  private sweeper?: ReturnType<typeof setInterval>;

  constructor(
    private readonly attachments: AttachmentsRepository,
    private readonly storage: ObjectStorage,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
    private readonly messages: MessagesService,
  ) {}

  onModuleInit() {
    this.sweeper = setInterval(
      () =>
        void this.sweep().catch((err: unknown) =>
          this.logger.error('attachment sweep', err),
        ),
      SWEEP_EVERY_MS,
    );
    this.sweeper.unref();
  }

  onModuleDestroy() {
    clearInterval(this.sweeper);
  }

  async create(
    uploaderId: bigint,
    body: CreateAttachmentRequest,
  ): Promise<AttachmentUploadResponse> {
    const rules = rulesOf(body.purpose);
    if (!(rules.types as readonly string[]).includes(body.content_type))
      throw wrongType();
    if (body.size_bytes > rules.maxBytes) throw tooBig();
    // REQ-MSG-04: ATTACH_FILES (or the DM send rule) for the channel it will be sent in.
    const channel = body.channel_id
      ? await this.messages.attachable(uploaderId, BigInt(body.channel_id))
      : undefined;

    const id = this.ids.next();
    const storageKey = `uploads/${id}`;
    await this.attachments.create({
      id,
      uploaderId,
      purpose: body.purpose,
      channelId: channel?.id ?? null,
      filename: body.filename,
      contentType: body.content_type,
      sizeBytes: body.size_bytes,
      storageKey,
    });
    const uploadUrl = await this.storage.presignPut(
      storageKey,
      body.content_type,
      body.size_bytes,
      UPLOAD_URL_SECONDS,
    );
    return {
      attachment_id: id.toString(),
      upload_url: uploadUrl,
      expires_at: new Date(
        this.clock.now().getTime() + UPLOAD_URL_SECONDS * 1000,
      ).toISOString(),
    };
  }

  // A refused file is gone afterwards (object and row): the app asks for a new upload.
  // ponytail: no virus scan at MVP (REQ-MSG-04 AC3 / AC8 are v1.x, CR-28): ClamAV goes here,
  // before `markClean`.
  async complete(uploaderId: bigint, id: bigint): Promise<AttachmentResponse> {
    const row = await this.attachments.findOwn(id, uploaderId);
    if (!row) throw notFound();
    if (row.scanStatus === 'clean') return toResponse(row);

    const bytes = await this.storage.get(row.storageKey);
    if (!bytes) throw notFound();
    const refuse = async (err: AppError) => {
      await this.storage.delete([row.storageKey]);
      await this.attachments.delete(id);
      return err;
    };
    const rules = rulesOf(row.purpose);
    if (bytes.length > rules.maxBytes) throw await refuse(tooBig());
    const type = detectImageType(bytes);
    if (!type || !(rules.types as readonly string[]).includes(type))
      throw await refuse(wrongType());

    const done =
      row.purpose === 'message'
        ? await this.storeMessageImage(row, bytes, type)
        : await this.storeVariants(row, bytes, type);
    if (!done) throw await refuse(wrongType());
    await this.storage.delete([row.storageKey]);
    return toResponse(await this.attachments.markClean(id, done));
  }

  private async storeVariants(row: AttachmentRow, bytes: Buffer, type: string) {
    const image = await avatarVariants(bytes, type).catch(() => undefined);
    if (!image) return undefined;
    const prefix = mediaPrefix(row.purpose as PublicPurpose, row.id);
    for (const v of image.variants)
      await this.storage.put(avatarKey(prefix, v.size), v.body, 'image/webp');
    return {
      contentType: type,
      sizeBytes: bytes.length,
      width: image.width,
      height: image.height,
      storageKey: prefix,
    };
  }

  private async storeMessageImage(
    row: AttachmentRow,
    bytes: Buffer,
    type: string,
  ) {
    const image = await messageImage(bytes, type).catch(() => undefined);
    if (!image) return undefined;
    const storageKey = `attachments/${row.id}/original.${image.ext}`;
    const thumbnailKey = `attachments/${row.id}/thumbnail.webp`;
    await this.storage.put(storageKey, image.original, type);
    await this.storage.put(thumbnailKey, image.thumbnail, 'image/webp');
    return {
      contentType: type,
      sizeBytes: image.original.length,
      width: image.width,
      height: image.height,
      storageKey,
      thumbnailKey,
    };
  }

  // CR-28 #29: an image of a message the caller can view → a short-lived signed URL.
  async fileUrl(
    viewerId: bigint,
    id: bigint,
    variant: AttachmentVariant,
  ): Promise<string> {
    const row = await this.attachments.sentImage(id);
    if (!row?.channelId) throw notFound();
    await this.messages.viewable(viewerId, row.channelId);
    const key = variant === 'original' ? row.storageKey : row.thumbnailKey;
    if (!key) throw notFound();
    return this.storage.presignGet(key, READ_URL_SECONDS);
  }

  // For PATCH /users/@me and the server icon: the uploader's own, completed file of that
  // purpose, or undefined.
  async usable(uploaderId: bigint, id: bigint, purpose: PublicPurpose) {
    const row = await this.attachments.findOwn(id, uploaderId);
    return row?.purpose === purpose && row.scanStatus === 'clean'
      ? row
      : undefined;
  }

  // SRS 8.2: files nothing points at after 24h, in batches, every hour.
  async sweep() {
    const before = new Date(this.clock.now().getTime() - UNUSED_FOR_MS);
    for (;;) {
      const rows = await this.attachments.stale(before);
      if (!rows.length) return;
      await this.storage.delete(rows.flatMap(keysOf));
      await this.attachments.deleteMany(rows.map((r) => r.id));
    }
  }
}
