import { Module } from '@nestjs/common';
import { ServersModule } from '../servers/servers.module.js';
import { MessagesController } from './messages.controller.js';
import { MessagesRepository } from './messages.repository.js';
import { MessagesService } from './messages.service.js';

@Module({
  imports: [ServersModule],
  controllers: [MessagesController],
  providers: [MessagesRepository, MessagesService],
})
export class MessagingModule {}
