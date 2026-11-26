import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateVoiceTokenRequest,
  ErrorCode,
  MemberRoutes,
  SnowflakeId,
  UpdateMemberVoiceRequest,
  VoiceRoutes,
  type VoiceTokenResponse,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import { LiveKitKeys } from './livekit.js';
import { VoiceRoomsService } from './voice-rooms.service.js';

const idParam = new ZodValidationPipe(SnowflakeId);

@Controller()
export class VoiceController {
  constructor(
    private readonly voice: VoiceRoomsService,
    private readonly keys: LiveKitKeys,
  ) {}

  @Post(VoiceRoutes.token)
  @HttpCode(200)
  token(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateVoiceTokenRequest))
    body: CreateVoiceTokenRequest,
  ): Promise<VoiceTokenResponse> {
    return this.voice.token(user.userId, body);
  }

  // REQ-VC-04: mod-mute / un-mute and disconnect from the room (CR-28 #31).
  @Patch(MemberRoutes.voice)
  @HttpCode(204)
  async moderate(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Param('userId', idParam) userId: string,
    @Body(new ZodValidationPipe(UpdateMemberVoiceRequest))
    body: UpdateMemberVoiceRequest,
  ) {
    await this.voice.moderate(user.userId, BigInt(id), BigInt(userId), body);
  }

  // SRS 5.5. The body arrives as text (configure-app.ts) because the signature covers its bytes.
  @Public()
  @Post(VoiceRoutes.webhook)
  @HttpCode(204)
  async webhook(
    @Body() body: unknown,
    @Headers('authorization') auth: string | undefined,
  ) {
    const event =
      typeof body === 'string'
        ? await this.keys.webhook(body, auth)
        : undefined;
    if (!event)
      throw new AppError(ErrorCode.TokenInvalid, 'Bad webhook signature');
    await this.voice.webhook(event);
  }
}
