// Discord-style layout: 42 bits ms since EPOCH | 10 bits worker | 12 bits sequence.
// ponytail: SRS does not pin the layout or epoch yet; confirm before the first migration ships.
const EPOCH = 1767225600000n; // 2026-01-01T00:00:00Z

export class SnowflakeGenerator {
  private lastMs = -1n;
  private sequence = 0n;

  constructor(
    private readonly workerId: number,
    private readonly now: () => number = Date.now,
  ) {
    if (workerId < 0 || workerId > 1023)
      throw new RangeError('workerId must be 0..1023');
  }

  next(): bigint {
    let ms = BigInt(this.now());
    if (ms < this.lastMs) ms = this.lastMs; // clock went backwards: keep ids monotonic
    if (ms === this.lastMs) {
      this.sequence = (this.sequence + 1n) & 0xfffn;
      if (this.sequence === 0n) ms = this.lastMs + 1n; // 4096 ids in one ms: borrow the next ms
    } else {
      this.sequence = 0n;
    }
    this.lastMs = ms;
    return (
      ((ms - EPOCH) << 22n) | (BigInt(this.workerId) << 12n) | this.sequence
    );
  }
}
