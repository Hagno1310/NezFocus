import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountDeletionController } from './account-deletion.controller.js';
import { AccountDeletionRepository } from './account-deletion.repository.js';
import { AccountDeletionService } from './account-deletion.service.js';
import { UsersModule } from './users.module.js';

// REQ-AUTH-10. Apart from UsersModule because it needs AuthModule (the password again, the
// sessions), and AuthModule already imports UsersModule.
@Module({
  imports: [UsersModule, AuthModule],
  controllers: [AccountDeletionController],
  providers: [AccountDeletionRepository, AccountDeletionService],
})
export class AccountDeletionModule {}
