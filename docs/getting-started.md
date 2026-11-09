# Hướng dẫn cài đặt & quy trình làm việc

Tài liệu cho **mọi thành viên NezFocus**, nhất là người mới vào. Làm theo đúng thứ tự từ trên xuống.

| Bạn cần                               | Đọc                                                          |
| ------------------------------------- | ------------------------------------------------------------ |
| Cài máy lần đầu                       | [Mục 1](#1-ngày-đầu-tiên-cài-máy)                            |
| Chạy dự án mỗi ngày                   | [Mục 2](#2-chạy-dự-án-hằng-ngày)                             |
| Nhận task → code → PR                 | [Mục 3](#3-quy-trình-làm-một-task)                           |
| Hiểu app chạy trên điện thoại thế nào | [Mục 4](#4-app-android-dev-client-expo-go-khi-nào-build-lại) |
| Gặp lỗi                               | [Mục 8](#8-xử-lý-sự-cố)                                      |
| Code nằm ở đâu, viết theo luật nào    | [`OVERVIEW.md`](../OVERVIEW.md), [`AGENTS.md`](../AGENTS.md) |
| Dự án làm gì, ai làm gì, deadline     | [`project-overview.md`](project-overview.md)                 |
| Đặc tả chức năng                      | [`SRS_NezFocus.md`](SRS_NezFocus.md)                         |

## Mục lục

0. [Hiểu nhanh các công cụ](#0-hiểu-nhanh-các-công-cụ)
1. [Ngày đầu tiên: cài máy](#1-ngày-đầu-tiên-cài-máy)
2. [Chạy dự án hằng ngày](#2-chạy-dự-án-hằng-ngày)
3. [Quy trình làm một task](#3-quy-trình-làm-một-task)
4. [App Android: dev client, Expo Go, khi nào build lại](#4-app-android-dev-client-expo-go-khi-nào-build-lại)
5. [Database & migration](#5-database--migration)
6. [Biến môi trường](#6-biến-môi-trường)
7. [Tham chiếu lệnh](#7-tham-chiếu-lệnh)
8. [Xử lý sự cố](#8-xử-lý-sự-cố)
9. [Phụ lục: thiết lập một lần cho dự án (trưởng nhóm)](#9-phụ-lục-thiết-lập-một-lần-cho-dự-án-trưởng-nhóm)

---

## 0. Hiểu nhanh các công cụ

Đọc lướt để biết các tên gọi bên dưới là gì.

| Tên               | Là gì                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| **pnpm**          | Trình quản lý package (thay npm). Repo là _monorepo_: nhiều project (app, backend, shared) trong một repo |
| **Docker**        | Chạy Postgres, Redis, S3 trên máy bạn mà không cần cài từng thứ                                           |
| **Backend**       | API NestJS chạy trên máy bạn ở cổng 3000. Điện thoại gọi tới đây                                          |
| **Metro**         | Server đóng gói code JS của app. Điện thoại tải code từ Metro mỗi lần mở app                              |
| **Dev client**    | File APK riêng của NezFocus, cài lên điện thoại một lần, dùng để chạy code đang phát triển                |
| **Expo Go**       | App có sẵn trên Google Play, dùng thay dev client khi chưa có APK (thiếu nhiều tính năng native)          |
| **EAS**           | Dịch vụ build APK trên cloud của Expo, nhờ đó không ai cần cài Android Studio                             |
| **GitHub Issues** | Nơi giao task. Mỗi issue là một task trong `docs/task-breakdown.md`, ghi REQ + AC + màn hình              |

Bức tranh khi chạy:

```text
Điện thoại (dev client) ──tải code JS──► Metro (máy bạn, cổng 8081)
        │
        └──gọi API──► Backend (máy bạn, cổng 3000) ──► Postgres / Redis / S3 (Docker)
```

Điện thoại và máy tính phải **cùng mạng Wi-Fi** và nhìn thấy nhau.

---

## 1. Ngày đầu tiên: cài máy

Mỗi thành viên làm **một lần**. Cuối mục này, app trên điện thoại hiện **"Backend: up"**.

### 1.1. Xin quyền truy cập

Nhắn trưởng nhóm để được mời vào:

| Nơi                                 | Để làm gì                             |
| ----------------------------------- | ------------------------------------- |
| GitHub `Hagno1310/NezFocus` (Write) | Clone, push branch, mở PR, nhận issue |
| Link tải APK dev client             | Cài app lên điện thoại (mục 1.5)      |

### 1.2. Cài công cụ

| Công cụ            | Phiên bản         | Cách cài / ghi chú                               |
| ------------------ | ----------------- | ------------------------------------------------ |
| Node.js            | 22 (xem `.nvmrc`) | <https://nodejs.org>                             |
| pnpm               | 10                | `npm install -g pnpm@10`                         |
| Git                | mới nhất          | Windows: cài kèm Git Bash                        |
| Docker Desktop     | mới nhất          | <https://www.docker.com/products/docker-desktop> |
| Điện thoại Android | Android 8.0+      | Cùng Wi-Fi với máy tính                          |

**Không cần Android Studio.**

Kiểm tra: `node -v` ra `v22.x`, `pnpm -v` ra `10.x`, `docker -v` chạy được.

### 1.3. Lấy code

```powershell
git clone https://github.com/Hagno1310/NezFocus.git
cd NezFocus
pnpm install
```

`pnpm install` cũng tự build `packages/shared` và bật git hook (kiểm tra commit message, lint file sắp commit).

### 1.4. Tạo file môi trường

```powershell
copy apps\backend\.env.example apps\backend\.env
copy apps\mobile\.env.example apps\mobile\.env
```

`apps/backend/.env` giữ nguyên là chạy được. Khi `.env.example` có thêm biến (vd P0-2 thêm `JWT_SECRET`), chép dòng đó sang `.env` của mình: thiếu biến thì backend dừng ngay lúc khởi động và in tên biến thiếu.

`apps/mobile/.env` phải sửa IP thành **IP Wi-Fi của máy bạn**. Chạy `ipconfig`, tìm card Wi-Fi, lấy dòng _IPv4 Address_:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/v1
```

File `.env` không bao giờ được commit (đã có trong `.gitignore`).

### 1.5. Cài app lên điện thoại

1. Mở link APK dev client trên điện thoại (trang [EAS builds](https://expo.dev/accounts/hagnovn/projects/nezfocus/builds), chọn bản _development_ mới nhất).
2. Bấm **Install**, cho phép cài từ nguồn không rõ nếu máy hỏi.

Chỉ cài **một lần**. Mục 4 nói khi nào phải cài lại.

### 1.6. Chạy thử

Mở Docker Desktop, đợi báo _Engine running_, rồi mở 3 terminal ở thư mục repo:

```powershell
pnpm dev:infra     # terminal 1
pnpm dev:backend   # terminal 2
pnpm dev:mobile    # terminal 3
```

Kiểm tra theo thứ tự:

1. Mở <http://localhost:3000/api/v1/health> trên máy tính → phải thấy `{"status":"ok","db":"up"}`.
2. Mở app **NezFocus** trên điện thoại → chọn máy của bạn trong danh sách, hoặc quét QR ở terminal 3.
3. Màn hình hiện **"Backend: up"** → xong.

Không được? Xem [mục 8](#8-xử-lý-sự-cố).

### 1.7. Đọc trước khi code

Theo thứ tự, mỗi file đọc lướt:

1. [`project-overview.md`](project-overview.md): dự án làm gì, mảng của bạn, lịch sprint.
2. [`OVERVIEW.md`](../OVERVIEW.md): cấu trúc repo, code mới đặt ở đâu.
3. [`AGENTS.md`](../AGENTS.md): luật bắt buộc (bám SRS, đặt tên, comment, git).
4. [`GLOSSARY.md`](../GLOSSARY.md): thuật ngữ (Server, Room Session, Host…).
5. Trong SRS: mục 4 phần REQ thuộc mảng của bạn.

Hai module mẫu để xem code chạy thế nào: `apps/backend/src/modules/_example` và `apps/mobile/src/features/_example`.

---

## 2. Chạy dự án hằng ngày

Cần chạy **cả ba**, mỗi lệnh một terminal, ở thư mục gốc repo:

| Terminal | Lệnh               | Tác dụng                                                          |
| -------- | ------------------ | ----------------------------------------------------------------- |
| 1        | `pnpm dev:infra`   | Bật Postgres, Redis, S3 (chạy nền; chỉ cần 1 lần sau khi bật máy) |
| 2        | `pnpm dev:backend` | API ở cổng 3000, tự reload khi sửa code                           |
| 3        | `pnpm dev:mobile`  | Metro. Mở app dev client trên điện thoại để tải code              |

- Sửa code TypeScript ở app hay backend: **tự cập nhật**, không cần build lại APK.
- Sửa `packages/shared`: chạy thêm `pnpm --filter @nezfocus/shared dev` (tự build lại khi lưu).
- Mỗi người có database riêng trên máy mình, dữ liệu thử không ảnh hưởng nhau.
- Tắt hạ tầng: `docker compose -f infra/docker-compose.yml down` (dữ liệu vẫn giữ).
- Ở Wi-Fi trường/quán không kết nối được: xem [mục 4.3](#43-mạng-chặn-kết-nối-giữa-các-thiết-bị).

---

## 3. Quy trình làm một task

Bản đầy đủ (skill, hợp đồng, dữ liệu giả, thiết kế, chạy agent song song): [`WORKFLOW.md`](WORKFLOW.md). Tóm tắt:

```text
GitHub Issue sẵn sàng → nhận (assign) → branch → code + test từng AC → lint/typecheck/test → thử trên điện thoại → push → PR (Closes #số) → review → Squash merge (issue tự đóng)
```

### 3.1. Nhận việc

1. Mở tab **Issues** của repo, lọc nhãn mảng của mình (`mang-a` / `mang-b`) và giai đoạn đang làm.
2. Chỉ nhận issue **sẵn sàng**: mọi issue chặn nó (mục _Blocked by_) đã đóng. Nhận bằng nút Assign hoặc `gh issue edit <số> --add-assignee @me`.
3. Đọc REQ tương ứng trong SRS, các **Acceptance Criteria** (AC) trong issue, spec màn hình và frame ghi trong issue. SRS hoặc spec chưa rõ → hỏi nhóm, đừng tự đoán.

### 3.2. Tạo branch và code

```powershell
git switch main
git pull
git switch -c feat/12-dang-ky-tai-khoan
```

- Pull về có migration mới thì chạy migrate trước khi code (mục 5).

- Tên branch: `<loại>/<số issue>-<mo-ta-ngan>`, ví dụ `feat/21-tao-server`, `fix/40-fanout-sai-quyen`.
- Bắt đầu bằng cách copy module mẫu (`_example`) của backend và/hoặc app. Các bước cụ thể: [`OVERVIEW.md`](../OVERVIEW.md) mục 4 và 5.
- Viết test cho **từng AC**, kể cả case âm (dùng đúng mã lỗi SRS 11.1).

### 3.3. Commit

Theo [Conventional Commits](https://www.conventionalcommits.org), footer trỏ tới issue. Không thêm dòng `Co-Authored-By`.

```text
feat(backend): register account with email verification

Refs #12
```

| Loại                   | Dùng khi                        |
| ---------------------- | ------------------------------- |
| `feat`                 | Thêm chức năng                  |
| `fix`                  | Sửa lỗi                         |
| `refactor`             | Đổi cấu trúc, không đổi hành vi |
| `test`                 | Thêm/sửa test                   |
| `docs`                 | Tài liệu                        |
| `chore`, `ci`, `build` | Cấu hình, CI, build             |

Scope hợp lệ: `mobile`, `backend`, `shared`, `mascot`, `infra`, `docs`, `ci`, `deps`. Sai quy ước thì git hook chặn commit.

### 3.4. Kiểm tra trước khi push

```powershell
pnpm lint
pnpm typecheck
pnpm test
```

Cả ba phải pass. CI chạy lại đúng các bước này, cộng e2e test với Postgres thật.

### 3.5. Pull Request

1. `git push -u origin feat/12-dang-ky-tai-khoan`, mở PR vào `main`.
2. Tiêu đề PR giống commit chính. Mô tả có `Closes #12`, liệt kê **AC nào đạt, AC nào chưa**, kèm ảnh màn hình cạnh frame.
3. Cần **CI xanh** và **người kia approve**.
4. Merge bằng **Squash and merge**, rồi xóa branch. Issue tự đóng.

---

## 4. App Android: dev client, Expo Go, khi nào build lại

|                                                                | Dev client (APK của dự án) | Expo Go                         |
| -------------------------------------------------------------- | -------------------------- | ------------------------------- |
| Cài từ                                                         | Link APK trên EAS          | Google Play                     |
| Lệnh chạy Metro                                                | `pnpm dev:mobile`          | `pnpm --filter mobile start:go` |
| Thư viện native riêng (LiveKit, Firebase, Notifee, op-sqlite…) | Chạy được                  | **Không chạy được**             |
| Dùng khi                                                       | **Mặc định** cho cả nhóm   | Dự phòng khi chưa cài được APK  |

### 4.1. Khi nào phải cài APK mới

APK dev client chỉ chứa **phần native**. Code JS/TS của app được tải từ Metro mỗi lần mở, nên:

- Sửa màn hình, logic, gọi API… → **không** cần cài lại.
- Có người **thêm, xóa hoặc nâng phiên bản thư viện native**, hoặc sửa phần native trong `app.config.ts` / `apps/mobile/plugins/` → APK cũ không còn khớp. Người đó:
  1. Chạy `pnpm --filter mobile build:dev` (hoặc GitHub Actions → **Mobile build (EAS)**, profile `development`).
  2. Báo cả nhóm kèm link APK mới.
  3. Mọi người cài APK mới.

Dấu hiệu APK đã cũ: app báo thiếu native module, hoặc crash khi mở màn hình dùng thư viện mới.

Thư mục `apps/mobile/android/` được sinh tự động, không commit, không sửa tay.

### 4.2. Nhiều điện thoại dùng chung một máy chạy Metro

Mọi điện thoại đã cài APK và cùng Wi-Fi đều mở được app từ một máy đang chạy `pnpm dev:mobile`. Hữu ích khi demo hoặc cả nhóm cùng thử một tính năng. Lưu ý:

- Điện thoại chạy **code đang có trên máy chạy Metro**, kể cả phần chưa commit.
- App gọi **backend của máy đó** (theo `apps/mobile/.env` của máy đó), nên máy đó phải chạy cả `pnpm dev:backend`, và mọi điện thoại dùng chung một database.
- Làm việc hằng ngày thì mỗi người dùng laptop + điện thoại của mình để code không lẫn nhau.

### 4.3. Mạng chặn kết nối giữa các thiết bị

Wi-Fi nhà thường chạy ngay. Wi-Fi trường, quán, ký túc xá hay bật _client isolation_: các thiết bị không gọi được nhau. Thử theo thứ tự:

1. **Phát hotspot từ điện thoại**, laptop bắt vào hotspot đó. Cập nhật IP mới của laptop (`ipconfig`) vào `apps/mobile/.env`, khởi động lại Metro. Cả app lẫn backend đều chạy được.
2. **Chạy Metro qua tunnel:** `pnpm dev:mobile -- --tunnel`. Code app tải qua Internet, nhưng tunnel **không** mang theo backend, nên vẫn cần cách 1 hoặc cách 3 cho backend.
3. **Dùng backend đã deploy** (`infra/docker-compose.prod.yml`): đặt `EXPO_PUBLIC_API_URL` trỏ tới server đó; máy tính chỉ cần chạy Metro.

---

## 5. Database & migration

Schema dùng Drizzle ORM. Mỗi module khai báo bảng trong `<tên>.schema.ts` và re-export trong `apps/backend/src/db/schema.ts`.

Sau khi sửa schema:

```powershell
cd apps/backend
pnpm db:generate     # sinh file migration vào drizzle/
pnpm build
pnpm db:migrate      # áp migration vào database dev
pnpm db:studio       # (tùy chọn) giao diện xem dữ liệu
```

- File trong `apps/backend/drizzle/` **phải commit** cùng thay đổi schema.
- **Sau khi `git pull`** mà có file mới trong `apps/backend/drizzle/` (người khác thêm migration): chạy `pnpm build` rồi `pnpm db:migrate` trong `apps/backend` trước khi bật backend. Không chạy thì backend lỗi khi đọc cột hoặc bảng mới (`column ... does not exist`). Hook husky (`post-merge`, `post-rewrite`, `post-checkout`) tự in dòng nhắc "Co migration moi" khi pull / đổi branch kéo về migration mới; nó chỉ nhắc, không tự chạy.
- Không sửa migration đã merge vào `main`; cần đổi thì tạo migration mới.
- Khi deploy, service `migrate` tự chạy migration trước khi backend khởi động.
- Xóa sạch database dev: `docker compose -f infra/docker-compose.yml down -v` (**mất toàn bộ dữ liệu dev**).

---

## 6. Biến môi trường

| File                | Biến                                                              | Ý nghĩa                                                                 |
| ------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/backend/.env` | `DATABASE_URL`                                                    | Chuỗi kết nối Postgres (mặc định khớp `infra/docker-compose.yml`)       |
|                     | `PORT`                                                            | Cổng API, mặc định 3000                                                 |
|                     | `WORKER_ID`                                                       | 0–1023, phần worker của Snowflake ID (mỗi instance backend một giá trị) |
|                     | `REDIS_URL`, `S3_*`                                               | Redis và object storage (SeaweedFS)                                     |
|                     | `JWT_SECRET`                                                      | Khóa ký access token (≥ 32 ký tự); production không nhận giá trị mẫu    |
| `apps/mobile/.env`  | `EXPO_PUBLIC_API_URL`                                             | Địa chỉ API điện thoại gọi tới; dùng IP Wi-Fi của máy tính              |
| `infra/.env.prod`   | `API_DOMAIN`, `BACKEND_IMAGE`, `POSTGRES_*`, `S3_*`, `JWT_SECRET` | Chỉ dùng trên server deploy                                             |

Biến có tiền tố `EXPO_PUBLIC_` được đóng vào app và **ai cũng đọc được**: không đặt secret vào đó.

---

## 7. Tham chiếu lệnh

Chạy ở thư mục gốc repo, trừ khi ghi khác.

| Lệnh                                         | Tác dụng                                |
| -------------------------------------------- | --------------------------------------- |
| `pnpm install`                               | Cài dependency, build `packages/shared` |
| `pnpm dev:infra`                             | Bật Postgres, Redis, S3 (Docker)        |
| `pnpm dev:backend`                           | Chạy API ở chế độ watch                 |
| `pnpm dev:mobile`                            | Chạy Metro cho dev client               |
| `pnpm --filter mobile start:go`              | Chạy Metro cho Expo Go                  |
| `pnpm --filter mobile build:dev`             | Build APK dev client trên EAS           |
| `pnpm --filter mobile doctor`                | Kiểm tra cấu hình Expo                  |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Kiểm tra toàn repo                      |
| `pnpm format`                                | Định dạng code bằng Prettier            |
| `pnpm --filter backend test:e2e`             | E2E test backend (cần `pnpm dev:infra`) |
| `pnpm build`                                 | Build mọi package                       |

Thêm thư viện cho app: `cd apps/mobile` rồi `pnpm exec expo install <tên>` (không dùng `pnpm add`, để Expo chọn đúng phiên bản).

---

## 8. Xử lý sự cố

| Triệu chứng                                       | Nguyên nhân thường gặp                       | Cách xử lý                                                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App báo **Backend: down**                         | Điện thoại không gọi được máy tính           | Kiểm tra cùng Wi-Fi; IP trong `apps/mobile/.env` đúng với `ipconfig`; cho phép Node.js qua **Windows Firewall** (mạng Private). Sửa `.env` xong thì khởi động lại Metro |
| Quét QR mà app không tải                          | Firewall chặn cổng 8081 của Metro            | Như trên; hoặc `pnpm dev:mobile -- --tunnel`                                                                                                                            |
| Ở nhà chạy được, ra trường/quán thì không         | Wi-Fi bật client isolation                   | Phát hotspot từ điện thoại hoặc dùng tunnel ([mục 4.3](#43-mạng-chặn-kết-nối-giữa-các-thiết-bị))                                                                        |
| `/health` trả **503** `db: down`                  | Docker chưa chạy hoặc Postgres chưa sẵn sàng | Mở Docker Desktop, chạy lại `pnpm dev:infra`, đợi vài giây                                                                                                              |
| `pnpm dev:infra` báo lỗi pipe/daemon              | Docker Desktop chưa khởi động                | Mở Docker Desktop, đợi tới khi báo _Engine running_                                                                                                                     |
| Cổng 3000/5432 đã bị dùng                         | Chương trình khác chiếm cổng                 | Tắt chương trình đó, hoặc đổi `PORT` / cổng trong `infra/docker-compose.yml`                                                                                            |
| Commit bị chặn _subject/type/scope_               | Message sai Conventional Commits             | Sửa theo [mục 3.3](#33-commit)                                                                                                                                          |
| `format:check` báo lỗi toàn bộ file sau khi clone | Git đổi xuống dòng thành CRLF                | Repo đã có `.gitattributes` ép LF; chạy `git rm -r --cached . -q` rồi `git reset --hard`                                                                                |
| Expo Go báo **incompatible SDK**                  | Expo Go cũ hơn SDK dự án                     | Cập nhật Expo Go trên Google Play                                                                                                                                       |
| Dev client báo thiếu native module                | APK cũ hơn code hiện tại                     | Cài APK mới nhất ([mục 4.1](#41-khi-nào-phải-cài-apk-mới))                                                                                                              |
| GitHub Actions: _EAS project not configured_      | Chưa thiết lập EAS                           | Xem [mục 9.1](#91-tạo-project-trên-expo-eas)                                                                                                                            |

Vẫn không được: chụp nguyên thông báo lỗi và lệnh đã chạy, gửi vào nhóm, kèm hệ điều hành và output của `node -v`, `pnpm -v`.

---

## 9. Phụ lục: thiết lập một lần cho dự án (trưởng nhóm)

**Thành viên thường bỏ qua mục này.** Đã làm xong; chỉ làm lại khi chuyển sang tài khoản khác.

### 9.1. Tạo project trên Expo (EAS)

> **Đã xong (16/10/2026):** project [`@hagnovn/nezfocus`](https://expo.dev/accounts/hagnovn/projects/nezfocus), `projectId` đã ghi trong `apps/mobile/app.config.ts`.

```powershell
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

Chọn account/organization sở hữu project. Vì repo dùng `app.config.ts`, EAS **không tự ghi** vào file mà in ra `projectId` (UUID). Ghi `projectId` và tên account vào `apps/mobile/app.config.ts` (trường `owner` và `extra.eas.projectId`), commit lên `main`.

### 9.2. Cho GitHub Actions build được app

1. Tạo token tại <https://expo.dev/settings/access-tokens>.
2. GitHub: repo → **Settings → Secrets and variables → Actions → New repository secret**, tên `EXPO_TOKEN`.
3. Chạy thử: tab **Actions → Mobile build (EAS) → Run workflow**.

### 9.3. Build dev client và chia sẻ cho nhóm

> **Đã xong (17/10/2026):** bản dev client đầu tiên đã build và cài thử thành công.

```powershell
cd apps/mobile
pnpm build:dev
```

Build mất khoảng 10–20 phút, chưa tính hàng đợi của tài khoản miễn phí. EAS trả về link/QR tải APK; **gửi link cho cả nhóm**, mọi người dùng chung một APK. Muốn thành viên tự build được: expo.dev → project → **Members**.

### 9.4. Cấp quyền cho thành viên mới

| Nơi                         | Việc cần làm                                       |
| --------------------------- | -------------------------------------------------- |
| GitHub `Hagno1310/NezFocus` | Settings → Collaborators → mời với quyền **Write** |
| Expo (tùy chọn)             | Chỉ khi thành viên cần tự build app                |
