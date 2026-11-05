import { Injectable, Logger } from '@nestjs/common';

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

// ponytail: dev prints the code to the backend log; swap for a real mail provider before the pilot.
@Injectable()
export class LogAuthMailer extends AuthMailer {
  private readonly logger = new Logger('AuthMailer');

  async sendSignInCode(email: string, code: string) {
    this.logger.log(`sign-in code for ${email}: ${code}`);
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
