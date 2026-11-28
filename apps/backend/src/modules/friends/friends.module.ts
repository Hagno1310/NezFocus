import { Global, Module } from '@nestjs/common';
import { BlockQuery, DbBlockQuery } from './block-query.js';
import { FriendsEraser } from './friends-eraser.js';
import { FriendsController } from './friends.controller.js';
import { FriendsRepository } from './friends.repository.js';
import { FriendsService } from './friends.service.js';

// WORKFLOW 4.3: other modules inject BlockQuery; the Gateway reads FriendsService.list for READY.
@Global()
@Module({
  controllers: [FriendsController],
  providers: [
    FriendsRepository,
    FriendsService,
    { provide: BlockQuery, useClass: DbBlockQuery },
    FriendsEraser,
  ],
  exports: [BlockQuery, FriendsService, FriendsEraser],
})
export class FriendsModule {}
