import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Emails sent by the auth flow. Abstract class = DI token; e2e tests swap in a capturing fake.
export abstract class AuthMailer {
  // REQ-AUTH-13: the email holds only the 6-digit code, never a link.
  abstract sendSignInCode(email: string, code: string): Promise<void>;
  // REQ-AUTH-02: successful sign-in from a device this account has not used.
  abstract sendNewDeviceAlert(
    email: string,
    device: { name?: string; platform: string },
  ): Promise<void>;
}

// ponytail: dev prints the code to the backend log; real mail (SMTP, queue) comes with P1-A6 (#196).
// Never prints codes in production: whoever reads the logs could sign in as anyone.
@Injectable()
export class LogAuthMailer extends AuthMailer {
  private readonly logger = new Logger('AuthMailer');
  private readonly showCodes: boolean;

  constructor(config: ConfigService) {
    super();
    this.showCodes = config.get<string>('NODE_ENV') !== 'production';
  }

  async sendSignInCode(email: string, code: string) {
    if (this.showCodes) this.logger.log(`sign-in code for ${email}: ${code}`);
    else
      this.logger.warn(
        `no mail provider: sign-in code for ${email} was not delivered`,
      );
  }

  async sendNewDeviceAlert(
    email: string,
    device: { name?: string; platform: string },
  ) {
    this.logger.log(
      `new-device alert for ${email}: ${device.name ?? 'unknown'} (${device.platform})`,
    );
  }
}
