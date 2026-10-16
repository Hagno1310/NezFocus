# NezFocus

App mobile học nhóm & chat/voice real-time cho sinh viên. Hiện chỉ làm **Android**. Đặc tả: [`docs/SRS_NezFocus.md`](docs/SRS_NezFocus.md).

| Thư mục           | Nội dung                                                   |
| ----------------- | ---------------------------------------------------------- |
| `apps/mobile`     | React Native + Expo dev build (TypeScript), Android        |
| `apps/backend`    | NestJS modular monolith, Drizzle + PostgreSQL              |
| `packages/shared` | zod schema, mã lỗi, code dùng chung app ↔ backend          |
| `packages/mascot` | Mascot Runtime (Rive CLI) + `playground/` để thử trên web  |
| `infra`           | Docker Compose cho dev và deploy 1 VM, Caddy reverse proxy |
| `docs`            | SRS, review, ADR                                           |

## Bắt đầu

Cần Node 22, pnpm 10, Docker và một điện thoại Android.

```bash
pnpm install                       # cũng build packages/shared
pnpm dev:infra                     # Postgres 16, Redis 7, SeaweedFS (S3)
cp apps/backend/.env.example apps/backend/.env
pnpm dev:backend                   # http://localhost:3000/api/v1/health
```

Mobile, chạy trên điện thoại Android thật, **không cần Android Studio**:

```bash
cp apps/mobile/.env.example apps/mobile/.env   # đặt IP LAN của máy tính
```

- **Giai đoạn đầu (chưa có thư viện native):** cài app Expo Go trên điện thoại, chạy `pnpm --filter mobile start:go` rồi quét QR.
- **Từ khi thêm LiveKit, Firebase, Notifee… (DEC-02):** build dev client trên cloud bằng `pnpm --filter mobile build:dev` (cần `npx eas-cli login` + `eas init` một lần), cài file APK lên máy. Sau đó hằng ngày chỉ cần `pnpm dev:mobile` rồi quét QR như Expo Go. Chỉ build lại khi thêm hoặc đổi thư viện native.

Kiểm tra trước khi đẩy code: `pnpm lint && pnpm typecheck && pnpm test`.

## Quy ước

- Mọi feature truy về REQ-ID trong SRS. Quy tắc cho người và AI agent: [`AGENTS.md`](AGENTS.md).
- Module mẫu để copy khi làm feature: `apps/backend/src/modules/_example`, `apps/mobile/src/features/_example`.
- Commit theo [Conventional Commits](https://www.conventionalcommits.org): `feat(mobile): ...`, `fix(backend): ...`. Hook `commit-msg` kiểm tra tự động.

## CI/CD (GitHub Actions)

- `ci.yml`: lint, format, typecheck, unit + e2e test (Postgres service), build Docker image backend; push lên GHCR khi merge vào `main`.
- `mobile-build.yml`: chạy tay, build app qua EAS. Cần secret `EXPO_TOKEN` và chạy `eas init` một lần trong `apps/mobile`.

## Deploy backend (1 VM)

```bash
cp infra/.env.prod.example infra/.env.prod     # điền domain, image, mật khẩu
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d
```

Caddy tự cấp TLS cho `API_DOMAIN`; service `migrate` chạy migration Drizzle trước khi backend khởi động.
