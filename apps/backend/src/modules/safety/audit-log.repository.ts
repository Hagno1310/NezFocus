import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../db/db.module.js';
import { auditLogs, type AuditLogRow } from './audit-log.schema.js';

// NFR-SEC-05: insert only. There is no update or delete here on purpose (ROLE-09 test).
// ponytail: khi có job retention (SRS 8.6): chạy bằng tài khoản CSDL riêng và REVOKE UPDATE, DELETE ON audit_logs khỏi tài khoản của app.
@Injectable()
export class AuditLogRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async insert(row: Omit<AuditLogRow, 'createdAt'>) {
    await this.db.insert(auditLogs).values(row);
  }
}
