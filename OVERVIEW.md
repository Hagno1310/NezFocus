# OVERVIEW — Bản đồ repo NezFocus

Đọc file này trước tiên (người mới và AI agent). Nó trả lời: **cái gì ở đâu, code mới đặt vào đâu, phải theo luật nào**. Chi tiết nằm ở các file được link; khi mâu thuẫn, thứ tự ưu tiên là `docs/SRS_NezFocus.md` → `AGENTS.md` → file này.

| Cần gì                               | Đọc                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Chức năng phải làm (nguồn sự thật)   | [`docs/SRS_NezFocus.md`](docs/SRS_NezFocus.md) (v1.11)                     |
| Luật bắt buộc cho người & agent      | [`AGENTS.md`](AGENTS.md), [`apps/mobile/AGENTS.md`](apps/mobile/AGENTS.md) |
| Cài máy, chạy hằng ngày, xử lý sự cố | [`docs/getting-started.md`](docs/getting-started.md)                       |
| Ai làm gì, thứ tự giai đoạn          | [`docs/task-breakdown.md`](docs/task-breakdown.md)                         |
| Quy trình làm một task (skill, git)  | [`docs/WORKFLOW.md`](docs/WORKFLOW.md)                                     |
| Thuật ngữ domain (dùng đúng tên)     | [`GLOSSARY.md`](GLOSSARY.md)                                               |

## 1. Dự án trong 30 giây

- App **Android** học nhóm cho sinh viên: server/kênh/chat/voice kiểu Discord + lớp Study/Focus (Room Session, Solo Session, streak, Task Board).
- Đồ án môn App, team 3 người, hạn nộp **15/12/2026**. Chỉ làm REQ có Release `MVP-Đồ án`.
- Task là GitHub Issues của repo; mỗi issue ghi REQ, AC dạng checkbox, màn hình + frame (`docs/agents/issue-tracker.md`).
- Trạng thái hiện tại (17/10/2026): **base repo xong, chưa có feature nào**. Chỉ có module `health`, hai module mẫu `_example` và các folder `.gitkeep` chờ làm.

## 2. Tech stack

| Tầng       | Công nghệ                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Mobile     | React Native 0.88, Expo SDK 58 (dev build + CNG), TypeScript strict, TanStack Query, Zustand*, React Navigation* |
| Backend    | NestJS 12 (ESM), Drizzle ORM, PostgreSQL 16, zod 4                                                               |
| Hạ tầng    | Docker Compose: Postgres, Redis, SeaweedFS (S3); Caddy (TLS) khi deploy 1 VM                                     |
| Dùng chung | `@nezfocus/shared`: zod schema, mã lỗi, Snowflake ID                                                             |
| Tooling    | pnpm 10 workspace (node_modules hoisted), Node 22, oxlint, Prettier, Vitest 4, husky + commitlint                |
| CI/CD      | GitHub Actions (`ci.yml`, `mobile-build.yml`), EAS Build, GHCR                                                   |

\* SRS đã chốt (ADR-03, 7.3.1) nhưng **chưa cài**; cài bằng `pnpm exec expo install` khi cần.
LiveKit, Meilisearch, ClamAV, op-sqlite, Firebase: thêm khi feature cần (xem SRS 7.2).

## 3. Cây thư mục

```text
.
├── AGENTS.md / CLAUDE.md      Luật cho agent (CLAUDE.md chỉ import AGENTS.md)
├── OVERVIEW.md                File này
├── GLOSSARY.md                Thuật ngữ domain + tên cần tránh
├── README.md                  Giới thiệu ngắn, lệnh nhanh
├── package.json               Script toàn repo, lint-staged, commitlint (scope-enum)
├── pnpm-workspace.yaml        apps/* + packages/*, nodeLinker: hoisted (cho Metro)
├── .oxlintrc.json .prettierrc .editorconfig .gitattributes (ép LF) .nvmrc (22)
├── .husky/                    pre-commit: lint-staged · commit-msg: commitlint
├── .github/workflows/
│   ├── ci.yml                 lint → format:check → typecheck → test → e2e (Postgres) → build image (push GHCR khi main)
│   └── mobile-build.yml       Chạy tay, EAS build Android (profile development/preview/production)
│
├── apps/
│   ├── backend/               NestJS — xem mục 4
│   └── mobile/                React Native + Expo — xem mục 5
│
├── packages/
│   ├── shared/                Code dùng chung app ↔ backend — xem mục 6
│   └── mascot/                Mascot Rive (RML). Luật riêng: packages/mascot/AGENTS.md
│
├── infra/
│   ├── docker-compose.yml       Dev: postgres:5432, redis:6379, s3 (SeaweedFS):8333
│   ├── docker-compose.prod.yml  Deploy 1 VM: caddy + migrate + backend + postgres + redis + s3
│   ├── Caddyfile                Reverse proxy, TLS tự động cho API_DOMAIN
│   ├── .env.prod.example
│   └── seaweedfs/               Cấu hình S3 dev/prod
│
└── docs/
    ├── SRS_NezFocus.md        Đặc tả (~2700 dòng) — mục lục ở mục 8 file này
    ├── getting-started.md     Hướng dẫn cài & quy trình
    ├── project-overview.md    Kế hoạch, sprint S0–S4, phân công
    └── reviews/               Review SRS theo ngày
```

## 4. Backend — `apps/backend`

```text
apps/backend/
├── src/
│   ├── main.ts                Bootstrap Nest, listen PORT
│   ├── configure-app.ts       Prefix /api/v1 + HttpExceptionFilter (dùng chung cho main và e2e)
│   ├── app.module.ts          ĐĂNG KÝ MODULE MỚI Ở ĐÂY
│   ├── config/env.ts          zod schema cho biến môi trường, fail-fast khi boot
│   ├── common/
│   │   ├── app-error.ts       AppError(ErrorCode.X, msg) + map mã lỗi → HTTP status
│   │   ├── http-exception.filter.ts  Mọi lỗi ra đúng body SRS 5.2 (code, message, errors, request_id, retry_after)
│   │   ├── zod-validation.pipe.ts    Validate body/param bằng zod → lỗi 40001
│   │   └── snowflake.ts       SnowflakeGenerator (inject qua DI)
│   ├── db/
│   │   ├── db.module.ts       Provider DB (Drizzle, casing snake_case) + SnowflakeGenerator, @Global
│   │   ├── schema.ts          RE-EXPORT BẢNG CỦA MỌI MODULE Ở ĐÂY (drizzle-kit chỉ đọc file này)
│   │   └── migrate.ts         Chạy migration (dùng trong image deploy)
│   └── modules/
│       ├── _example/          MODULE MẪU — copy để bắt đầu feature (không được import vào AppModule)
│       ├── health/            GET /api/v1/health → {status, db}
│       └── admin auth calls channels gateway messaging notifications
│           permissions safety search servers study users voice   ← .gitkeep, bounded context SRS 7.1.1
├── test/app.e2e-spec.ts       E2E bằng supertest, cần Postgres thật
├── drizzle/                   Migration sinh ra — PHẢI commit cùng thay đổi schema
├── drizzle.config.ts  Dockerfile  vitest.config.ts  vitest.config.e2e.ts  .env.example
```

### Luồng một request

```text
HTTP → Controller ──validate (ZodValidationPipe)──► Service ──► Repository ──► Drizzle/Postgres
          │  map row → JSON snake_case, id → string        │ luật nghiệp vụ, throw AppError(ErrorCode.X)
          ◄──────────────────── HttpExceptionFilter bắt mọi lỗi → body SRS 5.2
```

| File trong module        | Trách nhiệm                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `<name>.controller.ts`   | Mỏng: validate, gọi service, map JSON. Không có luật nghiệp vụ                                 |
| `<name>.dto.ts`          | zod schema input + hàm `to<Name>Json` (snake_case, id string, ISO date)                        |
| `<name>.service.ts`      | Luật nghiệp vụ, sinh ID bằng `SnowflakeGenerator`, ném `AppError`                              |
| `<name>.repository.ts`   | **Nơi duy nhất chạm Drizzle**; service test bằng repo giả                                      |
| `<name>.schema.ts`       | Bảng `pgTable`; id `bigint({ mode: 'bigint' })`, thời gian `timestamp({ withTimezone: true })` |
| `<name>.service.spec.ts` | Test mỗi AC, case âm assert đúng `ErrorCode`                                                   |
| `<name>.module.ts`       | Khai báo controller + providers                                                                |

### Làm một module backend mới

1. Copy `src/modules/_example/` → `src/modules/<context>/`, đổi tên `example` → `<name>`, xóa phần không cần.
2. Thêm `export * from '../modules/<context>/<name>.schema.js';` vào `src/db/schema.ts`.
3. Import `<Name>Module` vào `app.module.ts`.
4. `pnpm db:generate` → commit thư mục `drizzle/`. Không sửa migration đã merge.
5. Schema dùng cả ở app → chuyển từ `<name>.dto.ts` sang `packages/shared/src/` và export qua `index.ts`.

Gotcha: backend là **ESM** (`"type": "module"`, `nodenext`) → import tương đối phải có đuôi `.js`. `env.ts` hiện chỉ validate `PORT`, `DATABASE_URL`, `WORKER_ID`; thêm biến (Redis, S3…) vào schema khi bắt đầu dùng.

## 5. Mobile — `apps/mobile`

```text
apps/mobile/
├── index.ts                   registerRootComponent(App)
├── app.config.ts              Cấu hình Expo (Android only, package app.nezfocus, EAS projectId). Native config đặt ở đây
├── eas.json                   Profile build: development (dev client) / preview / production
├── plugins/                   Config plugin native tự viết (.gitkeep)
├── assets/                    Icon, splash
└── src/
    ├── app/App.tsx            Providers (QueryClient); sau này gắn React Navigation
    ├── features/<area>/       UI: screens/, hooks/, components/
    │   ├── _example/          FEATURE MẪU — copy để bắt đầu
    │   └── auth calls chat friends server settings study tasks voice   ← .gitkeep
    ├── domain/<area>/         TS thuần (không import React/RN): interface repository + use case
    ├── data/<area>/           Remote/Fake repository, index.ts chọn qua EXPO_PUBLIC_FAKE (data/fake.ts); data/api/client.ts = fetch wrapper
    └── shared/{ui,theme,i18n}/  Component, theme, i18n dùng chung (.gitkeep)
```

### Luồng phụ thuộc (SRS 7.3.1)

```text
Screen ──► hook (TanStack Query) ──► use case (domain) ──► Repository interface (domain)
                                                                 ▲ implement
                                                        data/<area>/Remote<X>Repository ──► api()
```

Ví dụ đầy đủ: `ExampleScreen` → `useBackendStatus` → `checkBackend` → `HealthRepository` ← `healthRepository` (`data/health/index.ts` chọn Remote / Fake).

- Screen **không** gọi `fetch`/WebSocket/LiveKit trực tiếp.
- Use case trong `domain/` test bằng Vitest không cần thiết bị (`checkBackend.spec.ts`).
- State: TanStack Query cho dữ liệu backend, Zustand cho state client — mỗi dữ liệu một chỗ.
- `android/` sinh tự động (CNG), không commit, không sửa tay.
- Thêm thư viện: `pnpm exec expo install <pkg>` (không `pnpm add`). Thư viện có native code → phải build lại dev client (`pnpm --filter mobile build:dev`) và báo cả nhóm.
- Expo đổi API mỗi SDK: tra docs đúng phiên bản (`https://docs.expo.dev/versions/v58.0.0/`), không code theo trí nhớ.
- `EXPO_PUBLIC_*` bị đóng vào app, ai cũng đọc được: không đặt secret.

## 6. Shared — `packages/shared`

| File                              | Nội dung                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/errors.ts`                   | `ErrorCode` (toàn bộ mã SRS 11.1, không tái sử dụng mã) + zod `ApiErrorBody` (SRS 5.2)                   |
| `src/snowflake.ts`                | zod `SnowflakeId`: chuỗi số 64-bit                                                                       |
| `src/<mảng>/<chủ đề>.contract.ts` | Hợp đồng REST / event của từng mảng (mẫu: `health/health.contract.ts`; quy ước ở `docs/WORKFLOW.md` 4.1) |
| `src/index.ts`                    | Barrel export — mọi thứ mới phải export ở đây                                                            |

Build ra `dist/` (`pnpm install` tự build). Đang sửa shared thì chạy `pnpm --filter @nezfocus/shared dev` để app/backend thấy thay đổi.

## 7. Rule code (tóm tắt — bản đầy đủ ở `AGENTS.md`)

### Bám SRS

- Mọi feature truy về `REQ-<NHÓM>-<SỐ>`. Trước khi code đọc REQ, AC (Given/When/Then), Release, Depends-on, DEC/ADR liên quan (SRS 0.2, 7.6).
- SRS im lặng / mơ hồ / mâu thuẫn → **dừng, hỏi**, ghi câu trả lời vào SRS hoặc `docs/`.
- Xong = từng AC (kể cả case âm) có test hoặc kiểm tra tay. Báo cáo cuối liệt kê AC đạt / chưa đạt.
- REQ có label `de-xuat-hoan` trên GitHub Issues → hỏi trước khi làm. Giao diện theo `DESIGN.md` (root).

### Đặt tên

- Theo SRS 1.3 / `GLOSSARY.md`: Server, Room Session, Solo Session, Host, Participant, Study Room… **Không** dùng "guild"; hệ thống phía sau gọi là **backend**, không gọi "server".

### API & dữ liệu

| Quy ước                         | Cách làm                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Prefix                          | `/api/v1` (đã set global)                                                             |
| JSON                            | key `snake_case`                                                                      |
| Snowflake ID, permission bitmap | DB: `bigint({ mode: 'bigint' })`; JSON: **string**; param validate bằng `SnowflakeId` |
| Lỗi                             | `throw new AppError(ErrorCode.X, msg)`; không tự dựng body lỗi                        |
| Thời gian                       | Lưu UTC (`timestamptz`); logic "theo ngày" của Study dùng timezone của user           |
| Schema dùng 2 phía              | Đặt ở `packages/shared`, không copy                                                   |

**Comment**: một dòng, chỉ nói **vì sao** — ràng buộc SRS (`// REQ-STUDY-15 AC2: ...`), gotcha thư viện, đường tắt có chủ đích (`// ponytail: <giới hạn>, <cách nâng cấp>`). Không JSDoc hiển nhiên, không code comment-out.

**Test**: file `*.spec.ts` đặt cạnh code. Unit test service/use case dùng repo giả; đường DB đi qua e2e (`apps/backend/test/`).

**Style**: Prettier (single quote, trailing comma), oxlint (`no-floating-promises` warn, rules-of-hooks error). Pre-commit tự chạy lint-staged.

### Git

- Branch: `feat/<số issue>-<mo-ta-ngan>` (`fix/`, `refactor/`…).
- Commit: Conventional Commits, footer `Refs #<số>`, không có dòng `Co-Authored-By`. Scope hợp lệ: `mobile backend shared mascot infra docs ci deps`.
- PR vào `main`: `Closes #<số>`, CI xanh + người kia approve, Squash and merge, mô tả liệt kê AC đạt/chưa.
- **AI agent**: được commit và merge giữa các branch trên máy; không push, không merge vào `main`, không `reset --hard` / `rebase` branch đã push (chi tiết `AGENTS.md` mục Git).

## 8. Tra SRS nhanh

SRS dài ~2700 dòng, mỗi mục có anchor `s-<số>`. Mục hay dùng:

| Mục  | Nội dung                                     | Mục     | Nội dung                                |
| ---- | -------------------------------------------- | ------- | --------------------------------------- |
| 0.2  | Decision Log (DEC-xx)                        | 5.2     | Quy ước REST, body lỗi                  |
| 1.3  | Thuật ngữ                                    | 5.3     | Danh mục endpoint                       |
| 3.x  | UX: điều hướng, sitemap, trạng thái màn hình | 5.4     | Giao thức Gateway (WebSocket)           |
| 4.1  | `REQ-AUTH-*`                                 | 6.x     | NFR (perf, bảo mật, mobile, a11y, i18n) |
| 4.2  | `REQ-SRV-*`                                  | 7.1–7.3 | Kiến trúc, tech stack, kiến trúc mobile |
| 4.3  | `REQ-ROLE-*`                                 | 7.6     | ADR                                     |
| 4.4  | `REQ-MSG-*`                                  | 8.2     | PostgreSQL DDL                          |
| 4.5  | `REQ-VC-*`                                   | 8.4     | State machines                          |
| 4.6  | `REQ-SEARCH-*`, `REQ-NOTIF-*`                | 8.5     | Permissions (bitmap)                    |
| 4.7  | `REQ-FRIEND-*`, `REQ-DM-*`                   | 9.6     | Definition of Done                      |
| 4.8  | `REQ-GDM-*`, `REQ-DMVC-*`                    | 10      | Backlog post-MVP (không làm)            |
| 4.9  | `REQ-STUDY-*`                                | 11.1    | Bảng mã lỗi                             |
| 4.10 | `REQ-SAFE-*`                                 | 11.2    | Gateway close codes                     |

Tìm một REQ: `grep -n "REQ-STUDY-15" docs/SRS_NezFocus.md`.

## 9. Lệnh

Chạy ở root repo. Cài đặt lần đầu và xử lý sự cố: [`docs/getting-started.md`](docs/getting-started.md).

| Lệnh                                         | Tác dụng                                   |
| -------------------------------------------- | ------------------------------------------ |
| `pnpm install`                               | Cài dependency, build shared, bật git hook |
| `pnpm dev:infra`                             | Postgres + Redis + S3 trong Docker         |
| `pnpm dev:backend`                           | API watch ở `http://localhost:3000/api/v1` |
| `pnpm dev:mobile`                            | Metro cho dev client                       |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | Phải pass trước khi push (CI chạy lại)     |
| `pnpm format`                                | Prettier toàn repo                         |
| `pnpm --filter backend test:e2e`             | E2E backend (cần `pnpm dev:infra`)         |
| `pnpm --filter backend db:generate`          | Sinh migration từ schema                   |
| `pnpm --filter backend db:studio`            | Xem dữ liệu                                |
| `pnpm --filter mobile build:dev`             | Build APK dev client trên EAS              |

## 10. Checklist cho AI agent khi nhận task

1. Đọc issue (`gh issue view <số>`) → đọc REQ + AC + Depends-on trong SRS (mục 8 ở trên).
2. Kiểm tra Release là `MVP-Đồ án`; không phải → hỏi.
3. Copy module mẫu (`_example`) của backend và/hoặc mobile, đặt vào đúng bounded context.
4. Code theo luồng mục 4 / mục 5; tên theo `GLOSSARY.md`; schema dùng chung đưa vào `packages/shared`.
5. Viết test cho từng AC, case âm dùng đúng `ErrorCode`.
6. Chạy `pnpm lint && pnpm typecheck && pnpm test` (thêm e2e nếu chạm DB).
7. Commit trên branch của ticket (không push). Báo cáo: REQ-ID, AC đạt/chưa đạt, file đã đổi. Quy trình đầy đủ: `docs/WORKFLOW.md`.
