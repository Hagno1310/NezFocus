import type { InvitePreview } from '@nezfocus/shared';
import { assetLinks, renderInvitePage } from './invite-page.js';

const preview: InvitePreview = {
  code: 'k7Qm2xPa',
  server: {
    id: '1',
    name: 'Ôn thi Giải tích 2',
    icon_url: '/media/server-icons/9/256.webp',
    member_count: 24,
    online_count: 6,
  },
  inviter: { display_name: 'Bình', avatar: null },
  channel: null,
};
const opts = {
  code: 'k7Qm2xPa',
  downloadUrl: 'https://play.google.com/store/apps/details?id=app.nezfocus',
  apiBase: 'https://nezfocus.app/api/v1',
};

describe('REQ-SRV-07 redirect page', () => {
  it('AC2 / AC6: server name, Open Graph and the download button', () => {
    const html = renderInvitePage(preview, opts);
    expect(html).toContain(
      '<meta property="og:title" content="Ôn thi Giải tích 2">',
    );
    expect(html).toContain(
      '<meta property="og:description" content="24 thành viên · Tham gia trên NezFocus">',
    );
    expect(html).toContain(
      '<meta property="og:image" content="https://nezfocus.app/api/v1/media/server-icons/9/256.webp">',
    );
    expect(html).toContain(`href="${opts.downloadUrl}"`);
    expect(html).toContain('k7Qm2xPa');
  });

  it('AC7: a broken invite gives the plain NezFocus card, nothing about the server', () => {
    const html = renderInvitePage(null, opts);
    expect(html).toContain('<meta property="og:title" content="NezFocus">');
    expect(html).not.toContain('Giải tích');
    expect(html).not.toContain('og:image');
  });

  it('escapes what users typed (server name)', () => {
    const html = renderInvitePage(
      {
        ...preview,
        server: { ...preview.server, name: '<script>alert(1)</script>"' },
      },
      opts,
    );
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;&quot;');
  });

  it('big counts use dots ("12.480 thành viên")', () => {
    const html = renderInvitePage(
      { ...preview, server: { ...preview.server, member_count: 12480 } },
      opts,
    );
    expect(html).toContain('12.480 thành viên · Tham gia trên NezFocus');
  });
});

describe('assetlinks.json (App Link autoVerify)', () => {
  it('lists every fingerprint for app.nezfocus', () => {
    expect(assetLinks('AA:BB, CC:DD')).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'app.nezfocus',
          sha256_cert_fingerprints: ['AA:BB', 'CC:DD'],
        },
      },
    ]);
  });
});
