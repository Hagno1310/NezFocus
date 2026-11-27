import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module.js';
import { AuthMailer, LogAuthMailer } from './auth-mailer.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { EmailCodeRepository } from './email-code.repository.js';
import { EmailCodeService } from './email-code.service.js';
import { PasswordHasher } from './password-hasher.js';
import { SessionRepository } from './session.repository.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailCodeService,
    EmailCodeRepository,
    SessionService,
    SessionRepository,
    TokenService,
    PasswordHasher,
    { provide: AuthMailer, useClass: LogAuthMailer },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  // The Gateway checks IDENTIFY / RESUME tokens the same way (P0-5.2).
  exports: [TokenService, SessionRepository],
})
export class AuthModule {}
