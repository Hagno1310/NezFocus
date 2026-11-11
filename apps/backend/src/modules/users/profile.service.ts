import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  type CurrentUser,
  type UpdateProfileRequest,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { AttachmentsService } from '../attachments/attachments.service.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { toCurrentUser } from './users.dto.js';
import { UsersRepository } from './users.repository.js';

// REQ-AUTH-06 (v1.7): display name, bio, avatar. Every change reaches the user's other
// devices as USER_UPDATE.
@Injectable()
export class ProfileService {
  constructor(
    private readonly users: UsersRepository,
    private readonly attachments: AttachmentsService,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async get(userId: bigint): Promise<CurrentUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new AppError(ErrorCode.TokenInvalid, 'Unknown account');
    return toCurrentUser(user);
  }

  // ponytail: the files of a replaced avatar stay in storage; a cleanup job comes with the
  // 24h attachment sweep of REQ-MSG-04, P3-A2.1 (#123).
  async update(
    userId: bigint,
    body: UpdateProfileRequest,
  ): Promise<CurrentUser> {
    let avatarKey: string | null | undefined;
    if (body.avatar_attachment_id === null) avatarKey = null;
    else if (body.avatar_attachment_id !== undefined) {
      const avatar = await this.attachments.usableAvatar(
        userId,
        BigInt(body.avatar_attachment_id),
      );
      if (!avatar)
        throw new AppError(ErrorCode.ValidationError, 'Invalid request', {
          avatar_attachment_id: [
            {
              code: 'NOT_A_COMPLETED_AVATAR',
              message: 'Upload and complete an avatar first',
            },
          ],
        });
      avatarKey = avatar.storageKey;
    }

    const row = await this.users.updateProfile(
      userId,
      {
        displayName: body.display_name,
        bio: body.bio,
        avatarKey,
      },
      this.clock.now(),
    );
    if (!row) throw new AppError(ErrorCode.TokenInvalid, 'Unknown account');
    const user = toCurrentUser(row);
    await this.events.toUser(userId, 'USER_UPDATE', user);
    return user;
  }
}
