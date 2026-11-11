import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import { UsersRepository } from './users.repository.js';

@Module({
  imports: [AttachmentsModule],
  controllers: [ProfileController],
  providers: [UsersRepository, ProfileService],
  exports: [UsersRepository],
})
export class UsersModule {}
