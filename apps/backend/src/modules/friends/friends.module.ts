import { Global, Module } from '@nestjs/common';
import { BlockQuery, NoBlockQuery } from './block-query.js';

// WORKFLOW 4.3: other modules inject BlockQuery.
@Global()
@Module({
  providers: [{ provide: BlockQuery, useClass: NoBlockQuery }],
  exports: [BlockQuery],
})
export class FriendsModule {}
