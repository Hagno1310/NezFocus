import { Controller, Get, Header, Ip, Param, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InviteCode } from '@nezfocus/shared';
import type { Request } from 'express';
import type { Env } from '../../config/env.js';
import { AppError } from '../../common/app-error.js';
import { Public } from '../auth/auth.decorators.js';
import { assetLinks, renderInvitePage } from './invite-page.js';
import { InvitesService } from './invites.service.js';

// REQ-SRV-07, outside /api/v1 (configure-app.ts): what https://nezfocus.app serves for App
// Links. ponytail: the domain is chosen before release, P4-B2.3 (#193): Caddy then routes
// nezfocus.app/invite/* and /.well-known/* here; until then try the page on the API host.
@Controller()
export class InvitePageController {
  constructor(
    private readonly invites: InvitesService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Get('invite/:code')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async page(
    @Param('code') raw: string,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<string> {
    const code = InviteCode.catch('').parse(raw);
    // AC7: anything but a live invite (40041, 40029…) gets the plain card.
    const preview = await this.invites.preview(code, ip).catch((e: unknown) => {
      if (e instanceof AppError) return null;
      throw e;
    });
    return renderInvitePage(preview, {
      code,
      downloadUrl: this.config.get('APP_DOWNLOAD_URL', { infer: true }),
      apiBase: `${req.protocol}://${req.get('host')}/api/v1`,
    });
  }

  @Public()
  @Get('.well-known/assetlinks.json')
  links() {
    return assetLinks(this.config.get('ANDROID_CERT_SHA256', { infer: true }));
  }
}
