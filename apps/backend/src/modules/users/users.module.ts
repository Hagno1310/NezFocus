import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module.js';
import { StudyModule } from '../study/study.module.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import { SettingsController } from './settings.controller.js';
import { SettingsRepository } from './settings.repository.js';
import { SettingsService } from './settings.service.js';
import { UsersRepository } from './users.repository.js';

@Module({
  imports: [AttachmentsModule, StudyModule],
  controllers: [ProfileController, SettingsController],
  providers: [
    UsersRepository,
    ProfileService,
    SettingsRepository,
    SettingsService,
  ],
  // SettingsService: READY's settings (Gateway) and REQ-DM-02 for DmAccessPolicy (P2-B3.2 #115).
  exports: [UsersRepository, SettingsService],
})
export class UsersModule {}
