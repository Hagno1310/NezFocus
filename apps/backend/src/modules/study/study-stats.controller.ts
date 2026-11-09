import { Controller, Get, Query } from '@nestjs/common';
import {
  StudySessionsQuery,
  StudyStatsQuery,
  StudyStatsRoutes,
  type StudySessionsResponse,
  type StudyStatsResponse,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { StudyStatsService } from './study-stats.service.js';

// SRS 5.3 Study: REQ-STUDY-03/17. A bad view / date / limit / cursor → 40001.
@Controller()
export class StudyStatsController {
  constructor(private readonly study: StudyStatsService) {}

  @Get(StudyStatsRoutes.stats)
  stats(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(StudyStatsQuery)) q: StudyStatsQuery,
  ): Promise<StudyStatsResponse> {
    return this.study.stats(user.userId, q);
  }

  @Get(StudyStatsRoutes.sessions)
  sessions(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(StudySessionsQuery)) q: StudySessionsQuery,
  ): Promise<StudySessionsResponse> {
    return this.study.sessions(user.userId, q);
  }
}
