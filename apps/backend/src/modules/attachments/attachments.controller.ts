import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import {
  AttachmentRoutes,
  CreateAttachmentRequest,
  ErrorCode,
  SnowflakeId,
  type AttachmentResponse,
  type AttachmentUploadResponse,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import { ObjectStorage } from '../storage/object-storage.js';
import { AttachmentsService } from './attachments.service.js';
import { avatarKey, MEDIA_ROUTE, PUBLIC_PREFIX } from './media.js';

const idParam = new ZodValidationPipe(SnowflakeId);

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

  // Avatars are public like a CDN would serve them: no token, cached for good (the key
  // changes with every new avatar).
  @Public()
  @Get(`${MEDIA_ROUTE}/avatars/:id/:file`)
  @Header('Content-Type', 'image/webp')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async avatar(
    @Param('id', idParam) id: string,
    @Param('file') file: string,
  ): Promise<StreamableFile> {
    const size = /^(128|256|512)\.webp$/.exec(file)?.[1];
    const body = size
      ? await this.storage.get(
          avatarKey(`${PUBLIC_PREFIX}avatars/${id}`, Number(size)),
        )
      : undefined;
    if (!body) throw new AppError(ErrorCode.NotFound, 'Unknown file');
    return new StreamableFile(body);
  }
}
