import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { ServerLifecycleController } from './server-lifecycle.controller.js';
import { ServerLifecycleService } from './server-lifecycle.service.js';
import { ServersModule } from './servers.module.js';

// REQ-SRV-05. Apart from ServersModule because it needs AuthModule (the password again),
// and AuthModule → UsersModule → StudyModule already imports ServersModule.
@Module({
  imports: [ServersModule, AuthModule, UsersModule],
  controllers: [ServerLifecycleController],
  providers: [ServerLifecycleService],
  exports: [ServerLifecycleService],
})
export class ServerLifecycleModule {}
