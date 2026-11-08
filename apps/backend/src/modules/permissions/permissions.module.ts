import { Global, Module } from '@nestjs/common';
import {
  AllowAllPermissionService,
  PermissionService,
} from './permission.service.js';

// WORKFLOW 4.3: other modules inject PermissionService.
@Global()
@Module({
  providers: [
    { provide: PermissionService, useClass: AllowAllPermissionService },
  ],
  exports: [PermissionService],
})
export class PermissionsModule {}
