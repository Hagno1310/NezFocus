import { Module } from '@nestjs/common';
import { StudyStatsRepository } from './study-stats.repository.js';

@Module({
  providers: [StudyStatsRepository],
  exports: [StudyStatsRepository],
})
export class StudyModule {}
