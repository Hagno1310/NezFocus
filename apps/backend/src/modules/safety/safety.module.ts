import { Global, Module } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository.js';
import { AuditLogService } from './audit-log.service.js';

// Global: every module that changes a server records its action (REQ-ROLE-09).
@Global()
@Module({
  providers: [AuditLogRepository, AuditLogService],
  exports: [AuditLogService],
})
export class SafetyModule {}
