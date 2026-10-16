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

**Hướng dẫn đầy đủ: [`docs/getting-started.md`](docs/getting-started.md)**, gồm cài đặt máy, chạy hằng ngày, quy trình task → branch → PR, build app và xử lý sự cố.

Tóm tắt cho người đã cài Node 22, pnpm 10, Docker:

```bash
pnpm install
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env   # đặt IP Wi-Fi của máy
pnpm dev:infra && pnpm dev:backend             # API: http://localhost:3000/api/v1/health
pnpm dev:mobile                                # hoặc: pnpm --filter mobile start:go (Expo Go)
```

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
