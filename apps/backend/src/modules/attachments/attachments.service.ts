import { Injectable } from '@nestjs/common';
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  ErrorCode,
  type AttachmentResponse,
  type AttachmentUploadResponse,
  type CreateAttachmentRequest,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { ObjectStorage } from '../storage/object-storage.js';
import { AttachmentsRepository } from './attachments.repository.js';
import type { AttachmentRow } from './attachments.schema.js';
import { avatarVariants, detectImageType } from './avatar-image.js';
import { avatarKey, avatarPrefix } from './media.js';

const UPLOAD_URL_SECONDS = 10 * 60;

const tooBig = () =>
  new AppError(ErrorCode.FileTooLarge, 'File is too large for this purpose');
const wrongType = () =>
  new AppError(ErrorCode.UnsupportedFileType, 'File type is not supported');
const notFound = () => new AppError(ErrorCode.NotFound, 'Unknown attachment');

const toResponse = (row: AttachmentRow): AttachmentResponse => ({
  id: row.id.toString(),
  purpose: row.purpose as AttachmentResponse['purpose'],
  content_type: row.contentType,
  width: row.width,
  height: row.height,
});

// SRS 5.3 Upload for `purpose = avatar` (REQ-AUTH-06): still images only, at most 8MB,
// stored as webp at 128 / 256 / 512. The declared type and size are checked up front so the
// app learns early; `complete` checks the real bytes again.
@Injectable()
export class AttachmentsService {
  constructor(
    private readonly attachments: AttachmentsRepository,
    private readonly storage: ObjectStorage,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
  ) {}

  async create(
    uploaderId: bigint,
    body: CreateAttachmentRequest,
  ): Promise<AttachmentUploadResponse> {
    if (!(AVATAR_TYPES as readonly string[]).includes(body.content_type))
      throw wrongType();
    if (body.size_bytes > AVATAR_MAX_BYTES) throw tooBig();

    const id = this.ids.next();
    const storageKey = `uploads/${id}`;
    await this.attachments.create({
      id,
      uploaderId,
      purpose: body.purpose,
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
    if (bytes.length > AVATAR_MAX_BYTES) throw await refuse(tooBig());
    const type = detectImageType(bytes);
    if (!type || !(AVATAR_TYPES as readonly string[]).includes(type))
      throw await refuse(wrongType());

    const image = await avatarVariants(bytes, type).catch(() => undefined);
    if (!image) throw await refuse(wrongType());
    const prefix = avatarPrefix(id);
    for (const v of image.variants)
      await this.storage.put(avatarKey(prefix, v.size), v.body, 'image/webp');
    await this.storage.delete([row.storageKey]);
    return toResponse(
      await this.attachments.markClean(id, {
        contentType: type,
        sizeBytes: bytes.length,
        width: image.width,
        height: image.height,
        storageKey: prefix,
      }),
    );
  }

  // For PATCH /users/@me: the uploader's own, completed avatar, or undefined.
  async usableAvatar(uploaderId: bigint, id: bigint) {
    const row = await this.attachments.findOwn(id, uploaderId);
    return row?.purpose === 'avatar' && row.scanStatus === 'clean'
      ? row
      : undefined;
  }
}
