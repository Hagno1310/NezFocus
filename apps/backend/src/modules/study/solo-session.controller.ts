import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  SnowflakeId,
  SoloAction,
  SoloRoutes,
  StartSoloSessionRequest,
  type CurrentSoloSessionResponse,
  type SoloSessionResponse,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { SoloSessionService } from './solo-session.service.js';

// SRS 5.3 Study: Solo Session (REQ-STUDY-10).
@Controller()
export class SoloSessionController {
  constructor(private readonly solo: SoloSessionService) {}

  @Post(SoloRoutes.start)
  start(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(StartSoloSessionRequest))
    body: StartSoloSessionRequest,
  ): Promise<SoloSessionResponse> {
    return this.solo.start(user.userId, body.cycle_config);
  }

  @Get(SoloRoutes.current)
  current(@CurrentUser() user: AuthUser): Promise<CurrentSoloSessionResponse> {
    return this.solo.current(user.userId);
  }

  @Get(SoloRoutes.byId(':id'))
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
  ): Promise<SoloSessionResponse> {
    return this.solo.get(user.userId, BigInt(id));
  }

  @Patch(SoloRoutes.byId(':id'))
  act(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Body(new ZodValidationPipe(SoloAction)) body: SoloAction,
  ): Promise<SoloSessionResponse> {
    return this.solo.act(user.userId, BigInt(id), body);
  }
}
