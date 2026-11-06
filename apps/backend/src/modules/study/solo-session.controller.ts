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
import { toSoloResponse, toSoloSessionJson } from './solo-session.dto.js';
import { SoloSessionService } from './solo-session.service.js';

// SRS 5.3 Study: Solo Session (REQ-STUDY-10).
@Controller()
export class SoloSessionController {
  constructor(private readonly solo: SoloSessionService) {}

  @Post(SoloRoutes.start)
  async start(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(StartSoloSessionRequest))
    body: StartSoloSessionRequest,
  ): Promise<SoloSessionResponse> {
    return toSoloResponse(
      await this.solo.start(user.userId, body.cycle_config),
    );
  }

  @Get(SoloRoutes.current)
  async current(
    @CurrentUser() user: AuthUser,
  ): Promise<CurrentSoloSessionResponse> {
    const { record, now } = await this.solo.current(user.userId);
    return {
      solo_session: record && toSoloSessionJson(record),
      backend_time: now.toISOString(),
    };
  }

  @Get(SoloRoutes.byId(':id'))
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
  ): Promise<SoloSessionResponse> {
    return toSoloResponse(await this.solo.get(user.userId, BigInt(id)));
  }

  @Patch(SoloRoutes.byId(':id'))
  async act(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Body(new ZodValidationPipe(SoloAction)) body: SoloAction,
  ): Promise<SoloSessionResponse> {
    return toSoloResponse(await this.solo.act(user.userId, BigInt(id), body));
  }
}
