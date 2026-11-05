import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

// SRS 8.2: Argon2id (the library default). Its own class so unit tests can skip the slow hash.
@Injectable()
export class PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
