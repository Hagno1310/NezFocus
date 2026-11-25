import { Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { DbDmAccessPolicy, DmAccessPolicy } from './dm-access-policy.js';
import { DmController } from './dm.controller.js';
import { DmRepository } from './dm.repository.js';
import { DmService } from './dm.service.js';

// Global like FriendsModule: messaging (policy), servers (DELETE /channels/{id}), users
// (profile) and the Gateway (READY, fanout) inject from here without importing it back.
@Global()
@Module({
  imports: [UsersModule],
  controllers: [DmController],
  providers: [
    DmRepository,
    DmService,
    { provide: DmAccessPolicy, useClass: DbDmAccessPolicy },
  ],
  exports: [DmAccessPolicy, DmService, DmRepository],
})
export class DmModule {}
