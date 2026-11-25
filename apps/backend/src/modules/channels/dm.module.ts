import { Global, Module } from '@nestjs/common';
import { DmAccessPolicy, RecipientDmAccessPolicy } from './dm-access-policy.js';
import { DmRepository } from './dm.repository.js';
import { DmService } from './dm.service.js';

// Global like FriendsModule: messaging (policy), servers (DELETE /channels/{id}) and the
// Gateway (READY, fanout) inject from here without importing it back.
@Global()
@Module({
  providers: [
    DmRepository,
    DmService,
    { provide: DmAccessPolicy, useClass: RecipientDmAccessPolicy },
  ],
  exports: [DmAccessPolicy, DmService, DmRepository],
})
export class DmModule {}
