import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type {
  PresenceEvent,
  PresenceUpdate,
  SoloSession,
  StudyActivity,
} from '@nezfocus/shared';
import { GatewaySessions, type GatewaySession } from './gateway-sessions.js';
import {
  aggregate,
  soloActivity,
  SWEEP_MS,
  visibleActivity,
} from './presence.js';
import {
  PresenceRepository,
  type PresenceSettings,
} from './presence.repository.js';

// What other modules call when something presence shows has changed (WORKFLOW 4.3).
export abstract class PresenceSink {
  // REQ-STUDY-10 / AUTH-05 CR-24: every Solo change; null or ended = no Solo.
  abstract soloChanged(userId: bigint, solo: SoloSession | null): void;
  // P1-A5.1 (#76) calls this when preferred_status or show_study_activity changes by REST.
  abstract settingsChanged(userId: bigint): Promise<void>;
}

type UserPresence = {
  settings: PresenceSettings;
  activity: StudyActivity | null;
  sent: string; // JSON of the last PRESENCE_UPDATE, to send only real changes
};

const OFFLINE = (userId: bigint): PresenceEvent => ({
  user_id: userId.toString(),
  status: 'offline',
  activity: null,
});

// REQ-AUTH-05. ponytail: in memory beside the Gateway sessions (one process, SRS 7.1.1), lost on
// restart with them; moves to Redis together with the sessions when running 2+ processes.
@Injectable()
export class PresenceService
  extends PresenceSink
  implements OnModuleInit, OnModuleDestroy
{
  private readonly users = new Map<bigint, UserPresence>();
  private sweep?: ReturnType<typeof setInterval>;
  private readonly logger = new Logger('Presence');

  constructor(
    private readonly sessions: GatewaySessions,
    private readonly repo: PresenceRepository,
  ) {
    super();
  }

  onModuleInit() {
    // AUTH-05 AC1 (background) and AC3 (silent devices) happen without any frame.
    this.sweep = setInterval(() => void this.sweepAll(), SWEEP_MS);
  }

  onModuleDestroy() {
    clearInterval(this.sweep);
  }

  // READY: my chosen status and who is not offline among the people I receive.
  async ready(userId: bigint) {
    const me = await this.load(userId);
    const presences = (await this.repo.receivers(userId))
      .map((id) => this.event(id))
      .filter((e) => e.status !== 'offline');
    return { preferred_status: me.settings.preferred, presences };
  }

  async update(session: GatewaySession, d: PresenceUpdate) {
    session.afk = d.afk;
    const me = await this.load(session.userId);
    // An afk-only frame (no status) leaves the status picked on another device alone.
    if (d.status && d.status !== me.settings.preferred) {
      me.settings = { ...me.settings, preferred: d.status };
      await this.repo.savePreferred(session.userId, d.status);
    }
    await this.changed(session.userId);
  }

  // Fire and forget from SoloSessionService: a failure is logged, never thrown into the Solo action.
  soloChanged(userId: bigint, solo: SoloSession | null) {
    this.load(userId)
      .then((me) => {
        me.activity = soloActivity(solo);
        return this.changed(userId);
      })
      .catch((err: unknown) =>
        this.logger.error(`solo ${userId}: ${String(err)}`),
      );
  }

  async settingsChanged(userId: bigint) {
    const me = await this.load(userId);
    me.settings = await this.repo.settings(userId);
    await this.changed(userId);
  }

  async changed(userId: bigint) {
    if (this.unchanged(userId)) return this.forgetIfGone(userId);
    const receivers = await this.repo.receivers(userId);
    // Computed again after the await: a newer call may have sent meanwhile, and a stale event must not
    // go out after it.
    const me = this.users.get(userId);
    if (!me || this.unchanged(userId)) return this.forgetIfGone(userId);
    const event = this.event(userId);
    me.sent = JSON.stringify(event);
    for (const receiver of receivers)
      await this.sessions.dispatchToUser(receiver, 'PRESENCE_UPDATE', event);
    this.forgetIfGone(userId);
  }

  private unchanged(userId: bigint) {
    const me = this.users.get(userId);
    return !me || JSON.stringify(this.event(userId)) === me.sent;
  }

  // No session left, no Solo, offline already announced: nothing to keep. Invisible but connected stays.
  private forgetIfGone(userId: bigint) {
    const me = this.users.get(userId);
    if (
      me &&
      !me.activity &&
      me.sent === JSON.stringify(OFFLINE(userId)) &&
      !this.sessions.devicesOf(userId).length
    )
      this.users.delete(userId);
  }

  private event(userId: bigint): PresenceEvent {
    const me = this.users.get(userId);
    if (!me) return OFFLINE(userId);
    const status = aggregate(
      me.settings.preferred,
      this.sessions.devicesOf(userId),
      Date.now(),
    );
    return {
      user_id: userId.toString(),
      status,
      activity: visibleActivity(me.activity, {
        status,
        showActivity: me.settings.showActivity,
      }),
    };
  }

  // ponytail: after a backend restart a running Solo shows again at its next change (≤ one phase);
  // read SoloSessionService.current() here if that gap matters.
  private async load(userId: bigint): Promise<UserPresence> {
    let me = this.users.get(userId);
    if (!me) {
      const settings = await this.repo.settings(userId);
      // Another call may have loaded it while we waited.
      me = this.users.get(userId) ?? {
        settings,
        activity: null,
        sent: JSON.stringify(OFFLINE(userId)),
      };
      this.users.set(userId, me);
    }
    return me;
  }

  private async sweepAll() {
    for (const userId of [...this.users.keys()])
      await this.changed(userId).catch((err: unknown) =>
        this.logger.error(`sweep ${userId}: ${String(err)}`),
      );
  }
}
