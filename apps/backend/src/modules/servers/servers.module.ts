import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module.js';
import { ChannelEvents } from './channel-events.js';
import { ChannelOverwritesService } from './channel-overwrites.service.js';
import { ChannelsController } from './channels.controller.js';
import { ChannelsRepository } from './channels.repository.js';
import { ChannelsService } from './channels.service.js';
import { InvitePageController } from './invite-page.controller.js';
import { InviteCodes, RandomInviteCodes } from './invite-rules.js';
import { InvitesController } from './invites.controller.js';
import { InvitesRepository } from './invites.repository.js';
import { InvitesService } from './invites.service.js';
import { RolesController } from './roles.controller.js';
import { RolesRepository } from './roles.repository.js';
import { RolesService } from './roles.service.js';
import { ServersController } from './servers.controller.js';
import { ServersRepository } from './servers.repository.js';
import { ServersService } from './servers.service.js';

@Module({
  imports: [AttachmentsModule],
  controllers: [
    ServersController,
    ChannelsController,
    RolesController,
    InvitesController,
    InvitePageController,
  ],
  providers: [
    ServersRepository,
    ServersService,
    ChannelsRepository,
    ChannelsService,
    ChannelEvents,
    ChannelOverwritesService,
    RolesRepository,
    RolesService,
    InvitesRepository,
    InvitesService,
    { provide: InviteCodes, useClass: RandomInviteCodes },
  ],
  // The Gateway lists the user's servers in READY; ServersRepository gives toServer its
  // members until P2-B1.2 (#108).
  exports: [ServersService, ServersRepository],
})
export class ServersModule {}
