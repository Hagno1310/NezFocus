import {
  Body,
  Controller,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import {
  FocusSessionAction,
  FocusSessionRoutes,
  SnowflakeId,
  StartFocusSessionRequest,
  type FocusSessionResponse,
} from '@nezfocus/shared';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { meOf, toFocusSessionResponse } from './room-session.dto.js';
import { RoomSessionService, type RoomView } from './room-session.service.js';

const respond = (view: RoomView, userId: bigint): FocusSessionResponse =>
  toFocusSessionResponse(
    view.record,
    meOf(
      view.record,
      view.parts.filter((p) => p.userId === userId),
    ),
    view.now,
  );

// SRS 5.3 Study: Room Session (REQ-STUDY-01, STUDY-11).
@Controller()
export class RoomSessionController {
  constructor(private readonly rooms: RoomSessionService) {}

  @Post(FocusSessionRoutes.start)
  @HttpCode(201)
  async start(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) channelId: string,
    @Body(new ZodValidationPipe(StartFocusSessionRequest))
    body: StartFocusSessionRequest,
  ): Promise<FocusSessionResponse> {
    const view = await this.rooms.start(user.userId, BigInt(channelId), body);
    return respond(view, user.userId);
  }

  // `stop` answers 204 (#145).
  @Patch(FocusSessionRoutes.byId)
  async act(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Body(new ZodValidationPipe(FocusSessionAction)) body: FocusSessionAction,
    @Res({ passthrough: true }) res: Response,
  ): Promise<FocusSessionResponse | undefined> {
    const view = await this.rooms.act(user.userId, BigInt(id), body);
    if (!view) {
      res.status(204);
      return undefined;
    }
    return respond(view, user.userId);
  }
}
