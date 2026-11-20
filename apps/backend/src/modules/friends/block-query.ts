// REQ-FRIEND-03. Owner: friends (B). Other modules inject this (WORKFLOW 4.3) to hide what a
// block hides: DMs (P2-B3.2 #115), blocked messages (P2-A4.3 #105), push (P3-B5 #29).
export abstract class BlockQuery {
  // Either A blocked B or B blocked A.
  abstract isBlockedEitherWay(a: bigint, b: bigint): Promise<boolean>;
  // The people userId blocked (not those who blocked userId: that is never revealed).
  abstract blockedIds(userId: bigint): Promise<bigint[]>;
}

// ponytail: stand-in until P2-B2.2 (#111) stores user_blocks: nobody is blocked.
export class NoBlockQuery extends BlockQuery {
  async isBlockedEitherWay() {
    return false;
  }

  async blockedIds() {
    return [];
  }
}
