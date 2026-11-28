import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ACCOUNT_DELETION_DAYS,
  ErrorCode,
  type AccountDeletionPreview,
  type OwnedServer,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { serverIconUrl } from '../attachments/media.js';
import { AuthService } from '../auth/auth.service.js';
import { SessionService } from '../auth/session.service.js';
import { FriendsEraser } from '../friends/friends-eraser.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PermissionCache } from '../permissions/permission-cache.js';
import { StudyDataEraser } from '../study/study-data-eraser.js';
import {
  AccountDeletionRepository,
  type OwnedServerRow,
} from './account-deletion.repository.js';
import { UsersRepository } from './users.repository.js';

const DAY_MS = 24 * 60 * 60_000;
const PURGE_EVERY_MS = 60 * 60_000;

const toOwned = (s: OwnedServerRow): OwnedServer => ({
  id: s.id.toString(),
  name: s.name,
  icon_url: serverIconUrl(s.iconKey),
  member_count: s.memberCount,
});

// REQ-AUTH-10: delete my account — 14 days pending (log in again to come back), then purge.
@Injectable()
export class AccountDeletionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountDeletionService.name);
  private sweeper?: ReturnType<typeof setInterval>;

  constructor(
    private readonly repo: AccountDeletionRepository,
    private readonly users: UsersRepository,
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly study: StudyDataEraser,
    private readonly friends: FriendsEraser,
    private readonly cache: PermissionCache,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  onModuleInit() {
    this.sweeper = setInterval(
      () =>
        void this.purge().catch((err: unknown) =>
          this.logger.error('account purge', err),
        ),
      PURGE_EVERY_MS,
    );
    this.sweeper.unref();
  }

  onModuleDestroy() {
    clearInterval(this.sweeper);
  }

  // CR-28 #41: what the dialog lists before anything is asked.
  async preview(userId: bigint): Promise<AccountDeletionPreview> {
    const owned = await this.repo.owned(userId);
    return {
      owned_servers: owned.filter((s) => s.memberCount > 1).map(toOwned),
      solo_servers: owned.filter((s) => s.memberCount <= 1).map(toOwned),
      deletes_at: this.deletesAt(this.clock.now()).toISOString(),
    };
  }

  // AC1, AC2, AC7, AC8.
  async request(userId: bigint, password: string) {
    const me = await this.users.findById(userId);
    if (!me) throw new AppError(ErrorCode.TokenInvalid, 'Unknown account');
    await this.auth.confirmPassword(me, password);
    const preview = await this.preview(userId);
    const blocked = () =>
      new AppError(
        ErrorCode.OwnershipTransferRequired,
        'Transfer or delete your servers first',
        undefined,
        { ownedServers: preview.owned_servers },
      );
    if (preview.owned_servers.length) throw blocked();
    const result = await this.repo.request(
      userId,
      preview.solo_servers.map((s) => BigInt(s.id)),
      this.clock.now(),
    );
    if (result === 'not_solo') throw blocked();
    if (result === 'not_active') return;
    for (const s of preview.solo_servers)
      await this.cache.invalidateServer(BigInt(s.id));
    // Every session, this one too: the app goes to S-AUTH-01 `pending-deletion-notice`.
    await this.sessions.revokeOthers(userId, null, 'account_deleted');
  }

  // AC4 "Khôi phục tài khoản": the servers deleted with the account come back.
  async cancel(userId: bigint) {
    const back = await this.repo.cancel(userId, this.clock.now());
    for (const serverId of back) await this.cache.invalidateServer(serverId);
  }

  // AC3, SRS 8.6: run by the sweeper; exposed for the e2e.
  async purge() {
    const cutoff = new Date(
      this.clock.now().getTime() - ACCOUNT_DELETION_DAYS * DAY_MS,
    );
    const due = await this.repo.due(cutoff);
    for (const userId of due) {
      const left = await this.repo.erase(userId, this.clock.now());
      await this.study.eraseUser(userId);
      await this.friends.eraseUser(userId);
      // Sessions opened meanwhile (logged in, then "Để sau" never sent) end with their push.
      await this.sessions.revokeOthers(userId, null, 'account_deleted');
      for (const serverId of left) {
        await this.cache.invalidateServer(serverId);
        await this.events.toServer(serverId, 'SERVER_MEMBER_REMOVE', {
          server_id: serverId.toString(),
          user_id: userId.toString(),
        });
      }
    }
    if (due.length) this.logger.log(`purged ${due.length} accounts`);
    return due;
  }

  private deletesAt(from: Date) {
    return new Date(from.getTime() + ACCOUNT_DELETION_DAYS * DAY_MS);
  }
}
