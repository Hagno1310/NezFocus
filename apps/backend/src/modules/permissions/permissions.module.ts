import { Global, Module } from '@nestjs/common';
import { DbPermissionService } from './db-permission.service.js';
import { PermissionCache } from './permission-cache.js';
import { PermissionService } from './permission.service.js';
import { PermissionsRepository } from './permissions.repository.js';

// WORKFLOW 4.3: other modules inject PermissionService, and PermissionCache to invalidate.
@Global()
@Module({
  providers: [
    PermissionsRepository,
    PermissionCache,
    DbPermissionService,
    { provide: PermissionService, useExisting: DbPermissionService },
  ],
  exports: [
    PermissionService,
    PermissionCache,
    DbPermissionService,
    PermissionsRepository, // the hierarchy checks read the same facts
  ],
})
export class PermissionsModule {}
