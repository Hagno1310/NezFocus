import { Module } from '@nestjs/common';
import { ServersModule } from '../servers/servers.module.js';
import { MentionsService } from './mentions.service.js';
import { MessagesController } from './messages.controller.js';
import { MessagesRepository } from './messages.repository.js';
import { MessagesService } from './messages.service.js';
import { MessagingListener } from './messaging.listener.js';

@Module({
  imports: [ServersModule],
  controllers: [MessagesController],
  providers: [
    MessagesRepository,
    MessagesService,
    MentionsService,
    MessagingListener,
  ],
})
export class MessagingModule {}
