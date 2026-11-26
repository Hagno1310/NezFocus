import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  type CurrentUser,
  type UpdateProfileRequest,
  type UserProfile,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { AttachmentsService } from '../attachments/attachments.service.js';
import { avatarUrls, serverIconUrl } from '../attachments/media.js';
import { DmAccessPolicy } from '../channels/dm-access-policy.js';
import { isDeletedAccount } from '../channels/dm.dto.js';
import { DmRepository } from '../channels/dm.repository.js';
import { FriendsService } from '../friends/friends.service.js';
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
    private readonly dmPolicy: DmAccessPolicy,
    private readonly dms: DmRepository,
    private readonly friends: FriendsService,
  ) {}

  // REQ-AUTH-06 v1.9 (S-HOME-10): someone who blocked me answers as usual (FRIEND-01 AC9).
  async of(viewerId: bigint, userId: bigint): Promise<UserProfile> {
    const user = await this.users.findById(userId);
    if (!user?.username) throw new AppError(ErrorCode.NotFound, 'Unknown user');
    if (isDeletedAccount(user.accountStatus))
      return {
        user: {
          id: user.id.toString(),
          username: null,
          display_name: null,
          avatar: null,
          bio: null,
        },
        deleted: true,
        relationship: 'none',
        mutual_servers: [],
        can_message: false,
      };
    const relationship = (await this.friends.list(viewerId)).find(
      (r) => r.user.id === user.id.toString(),
    );
    return {
      user: {
        id: user.id.toString(),
        username: user.username,
        display_name: user.displayName,
        avatar: avatarUrls(user.avatarKey),
        bio: user.bio,
      },
      deleted: false,
      relationship: relationship?.type ?? 'none',
      mutual_servers: (await this.dms.sharedServers(viewerId, userId)).map(
        (s) => ({
          id: s.id.toString(),
          name: s.name,
          icon_url: serverIconUrl(s.iconKey),
        }),
      ),
      can_message: await this.dmPolicy.canMessage(viewerId, userId),
    };
  }

  async get(userId: bigint): Promise<CurrentUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new AppError(ErrorCode.TokenInvalid, 'Unknown account');
    return toCurrentUser(user);
  }

  // A replaced avatar's files go with the 24h sweep (AttachmentsService.sweep).
  async update(
    userId: bigint,
    body: UpdateProfileRequest,
  ): Promise<CurrentUser> {
    let avatarKey: string | null | undefined;
    if (body.avatar_attachment_id === null) avatarKey = null;
    else if (body.avatar_attachment_id !== undefined) {
      const avatar = await this.attachments.usable(
        userId,
        BigInt(body.avatar_attachment_id),
        'avatar',
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
