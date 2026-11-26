import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ATTACHMENT_VARIANTS,
  AttachmentRoutes,
  CreateAttachmentRequest,
  ErrorCode,
  SnowflakeId,
  type AttachmentResponse,
  type AttachmentVariant,
  type AttachmentUploadResponse,
} from '@nezfocus/shared';
import { z } from 'zod';
import { AppError } from '../../common/app-error.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import { ObjectStorage } from '../storage/object-storage.js';
import { AttachmentsService } from './attachments.service.js';
import {
  avatarKey,
  MEDIA_FOLDERS,
  MEDIA_ROUTE,
  PUBLIC_PREFIX,
} from './media.js';

const idParam = new ZodValidationPipe(SnowflakeId);
const variantParam = new ZodValidationPipe(z.enum(ATTACHMENT_VARIANTS));

@Controller()
export class AttachmentsController {
  constructor(
    private readonly attachments: AttachmentsService,
    private readonly storage: ObjectStorage,
  ) {}

  @Post(AttachmentRoutes.create)
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(CreateAttachmentRequest))
    body: CreateAttachmentRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<AttachmentUploadResponse> {
    return this.attachments.create(user.userId, body);
  }

  @Post(AttachmentRoutes.complete)
  @HttpCode(200)
  complete(
    @Param('id', idParam) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AttachmentResponse> {
    return this.attachments.complete(user.userId, BigInt(id));
  }

  // CR-28 #29: a message image, for who can view its message. The path stays the same, so the
  // app caches the bytes; the redirect itself is never cached (its URL expires).
  @Get(AttachmentRoutes.file)
  async file(
    @Param('id', idParam) id: string,
    @Param('variant', variantParam) variant: AttachmentVariant,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const url = await this.attachments.fileUrl(
      user.userId,
      BigInt(id),
      variant,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, url);
  }

  // Avatars and server icons are public like a CDN would serve them: no token, cached for
  // good (the key changes with every new image).
  @Public()
  @Get(`${MEDIA_ROUTE}/:folder/:id/:file`)
  @Header('Content-Type', 'image/webp')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async media(
    @Param('folder') folder: string,
    @Param('id', idParam) id: string,
    @Param('file') file: string,
  ): Promise<StreamableFile> {
    const size = /^(128|256|512)\.webp$/.exec(file)?.[1];
    const known = (Object.values(MEDIA_FOLDERS) as string[]).includes(folder);
    const body =
      size && known
        ? await this.storage.get(
            avatarKey(`${PUBLIC_PREFIX}${folder}/${id}`, Number(size)),
          )
        : undefined;
    if (!body) throw new AppError(ErrorCode.NotFound, 'Unknown file');
    return new StreamableFile(body);
  }
}
