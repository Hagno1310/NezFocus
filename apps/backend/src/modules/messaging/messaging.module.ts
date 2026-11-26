import { Global, Module } from '@nestjs/common';
import { ServersModule } from '../servers/servers.module.js';
import { MentionsService } from './mentions.service.js';
import { MessageActionsService } from './message-actions.service.js';
import { MessagesController } from './messages.controller.js';
import { MessagesRepository } from './messages.repository.js';
import { MessagesService } from './messages.service.js';
import { MessagingListener } from './messaging.listener.js';
import { ReadStatesRepository } from './read-states.repository.js';
import { ReadStatesService } from './read-states.service.js';

// Global like FriendsModule: the Gateway reads ReadStatesService for READY; calls, reminders
// and room sessions write system messages through MessagesService.createSystemMessage.
@Global()
@Module({
  imports: [ServersModule],
  controllers: [MessagesController],
  providers: [
    MessagesRepository,
    MessagesService,
    MessageActionsService,
    MentionsService,
    MessagingListener,
    ReadStatesRepository,
    ReadStatesService,
  ],
  exports: [MessagesService, ReadStatesService],
})
export class MessagingModule {}
