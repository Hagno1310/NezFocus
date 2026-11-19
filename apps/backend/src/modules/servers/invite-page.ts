import {
  formatInviteCount as count,
  type InvitePreview,
} from '@nezfocus/shared';

const ANDROID_PACKAGE = 'app.nezfocus';

const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

// REQ-SRV-07 AC2 / AC6 / AC7: the static page a link opens without the app — server name,
// Open Graph card, a download button and how to paste the code after installing. Not a web
// client. `preview` null (broken invite, unknown code, rate limited) → the plain NezFocus card.
export function renderInvitePage(
  preview: InvitePreview | null,
  opts: { code: string; downloadUrl: string; apiBase: string },
) {
  const name = preview ? escape(preview.server.name) : null;
  const meta = preview
    ? [
        `<meta property="og:title" content="${name}">`,
        `<meta property="og:description" content="${count(preview.server.member_count)} thành viên · Tham gia trên NezFocus">`,
        preview.server.icon_url &&
          `<meta property="og:image" content="${escape(opts.apiBase + preview.server.icon_url)}">`,
      ]
    : [
        '<meta property="og:title" content="NezFocus">',
        '<meta property="og:description" content="Học nhóm cùng bạn bè trên NezFocus">',
      ];
  const body = preview
    ? `<p class="small">Bạn được mời vào</p><h1>${name}</h1><p class="small">${count(preview.server.member_count)} thành viên</p>`
    : '<h1>NezFocus</h1><p class="small">Học nhóm cùng bạn bè</p>';
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name ?? 'NezFocus'}</title>
${meta.filter(Boolean).join('\n')}
<meta property="og:site_name" content="NezFocus">
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#11162A;color:#EEF1FA;display:flex;min-height:100vh;align-items:center;justify-content:center}
main{max-width:360px;padding:24px;text-align:center}
h1{font-size:24px;margin:8px 0}
.small{color:#A9B2CC;font-size:14px;margin:4px 0}
a.button{display:block;margin:24px 0 16px;padding:14px;border-radius:12px;background:#7FA4F4;color:#11162A;font-weight:600;text-decoration:none}
code{font-family:monospace;font-size:16px;color:#EEF1FA}
</style>
</head>
<body>
<main>
${body}
<a class="button" href="${escape(opts.downloadUrl)}">Tải NezFocus trên Google Play</a>
<p class="small">Cài xong, mở NezFocus, chọn "Nhập mã mời" rồi bấm "Dán" với mã <code>${escape(opts.code)}</code></p>
</main>
</body>
</html>
`;
}

// /.well-known/assetlinks.json: Android verifies App Links (`autoVerify`) against these
// signing-certificate fingerprints (comma separated in ANDROID_CERT_SHA256).
export const assetLinks = (fingerprints: string) => [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: ANDROID_PACKAGE,
      sha256_cert_fingerprints: fingerprints
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean),
    },
  },
];
