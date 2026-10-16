# Hướng dẫn cài đặt & quy trình làm việc

Tài liệu này dành cho mọi thành viên NezFocus. Làm theo thứ tự: **Phần 1** chỉ cần một người làm một lần cho cả dự án, **Phần 2** mỗi thành viên làm một lần trên máy mình, **Phần 3** là việc hằng ngày.

Quy tắc kỹ thuật và quy ước code: [`AGENTS.md`](../AGENTS.md). Đặc tả chức năng: [`SRS_NezFocus.md`](SRS_NezFocus.md). Kế hoạch & phân công: [`project-overview.md`](project-overview.md).

## Mục lục

1. [Thiết lập một lần cho dự án](#1-thiết-lập-một-lần-cho-dự-án)
2. [Thiết lập máy của từng thành viên](#2-thiết-lập-máy-của-từng-thành-viên)
3. [Chạy dự án hằng ngày](#3-chạy-dự-án-hằng-ngày)
4. [Quy trình làm một task](#4-quy-trình-làm-một-task)
5. [App Android: Expo Go, dev client và khi nào build lại](#5-app-android-expo-go-dev-client-và-khi-nào-build-lại)
6. [Database & migration](#6-database--migration)
7. [Biến môi trường](#7-biến-môi-trường)
8. [Tham chiếu lệnh](#8-tham-chiếu-lệnh)
9. [Xử lý sự cố](#9-xử-lý-sự-cố)

---

## 1. Thiết lập một lần cho dự án

Do **một người** (người giữ tài khoản Expo của nhóm) làm một lần. Các thành viên khác bỏ qua phần này.

### 1.1. Tạo project trên Expo (EAS)

> **Đã xong (16/10/2026):** project [`@hagnovn/nezfocus`](https://expo.dev/accounts/hagnovn/projects/nezfocus), `projectId` đã ghi trong `apps/mobile/app.config.ts`. Chỉ làm lại mục này nếu chuyển project sang account khác.

EAS là dịch vụ build app trên cloud của Expo, giúp cả nhóm không cần Android Studio.

1. Tạo tài khoản tại <https://expo.dev/signup> (hoặc dùng tài khoản/organization có sẵn).
2. Trong PowerShell tại thư mục repo:

   ```powershell
   cd apps/mobile
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

   Chọn đúng account/organization sẽ sở hữu project. Vì repo dùng `app.config.ts`, EAS **không tự ghi** vào file mà in ra một `projectId` (UUID).

3. Ghi `projectId` và tên account vào `apps/mobile/app.config.ts` (trường `owner` và `extra.eas.projectId`), commit lên `main`. Từ đó cả nhóm và CI dùng chung project này.

### 1.2. Cho GitHub Actions build được app

1. Tạo token tại <https://expo.dev/settings/access-tokens>.
2. Trên GitHub: repo → **Settings → Secrets and variables → Actions → New repository secret**, tên `EXPO_TOKEN`.
3. Chạy thử: tab **Actions → Mobile build (EAS) → Run workflow**.

### 1.3. Build dev client lần đầu và chia sẻ cho nhóm

```powershell
cd apps/mobile
pnpm build:dev
```

> **Đã xong (17/10/2026):** bản dev client đầu tiên đã được build và cài thử thành công. Link tải APK mới nhất: <https://expo.dev/accounts/hagnovn/projects/nezfocus/builds> (chọn bản _development_ gần nhất).

Build mất khoảng 10–20 phút, chưa tính thời gian chờ hàng đợi của tài khoản miễn phí. Khi xong, EAS trả về link/QR tải file APK. **Gửi link này cho cả nhóm**: mọi người dùng chung một APK, không ai phải tự build. Muốn mời thành viên vào project Expo để họ tự build: expo.dev → project → **Members**.

### 1.4. Quyền truy cập cho thành viên mới

| Nơi                            | Việc cần làm                                       |
| ------------------------------ | -------------------------------------------------- |
| GitHub `Hagno1310/NezFocus`    | Settings → Collaborators → mời với quyền **Write** |
| Jira `nez-focus.atlassian.net` | Settings → User management → Invite users          |
| Expo (tùy chọn)                | Chỉ khi thành viên cần tự build app                |

---

## 2. Thiết lập máy của từng thành viên

Mỗi thành viên làm **một lần** trên máy mình.

### 2.1. Cài công cụ

| Công cụ            | Phiên bản         | Ghi chú                                     |
| ------------------ | ----------------- | ------------------------------------------- |
| Node.js            | 22 (xem `.nvmrc`) | <https://nodejs.org>                        |
| pnpm               | 10                | `npm install -g pnpm@10`                    |
| Git                | mới nhất          | Windows: cài kèm Git Bash                   |
| Docker Desktop     | mới nhất          | Chạy Postgres, Redis, S3 cho môi trường dev |
| Điện thoại Android | Android 8.0+      | Cùng mạng Wi-Fi với máy tính                |

**Không cần Android Studio.** App chạy trên điện thoại thật qua Expo Go hoặc APK dev client (mục 5).

### 2.2. Lấy code và cài dependency

```powershell
git clone https://github.com/Hagno1310/NezFocus.git
cd NezFocus
pnpm install
```

`pnpm install` cũng tự build `packages/shared` và bật git hook (kiểm tra commit message, lint file sắp commit).

### 2.3. Tạo file môi trường

```powershell
copy apps\backend\.env.example apps\backend\.env
copy apps\mobile\.env.example apps\mobile\.env
```

Mở `apps/mobile/.env` và thay IP bằng **IP Wi-Fi của máy mình**. Lấy IP bằng `ipconfig`, xem dòng _IPv4 Address_ của card Wi-Fi:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/v1
```

File `.env` không bao giờ được commit (đã nằm trong `.gitignore`).

### 2.4. Cài app lên điện thoại

Cài **APK dev client** từ link ở mục 1.3: mở link bằng điện thoại, bấm **Install**, cho phép cài từ nguồn không rõ nếu máy hỏi. Chỉ cài **một lần**; xem mục 5 để biết khi nào cần cài lại.

Expo Go (Google Play) chỉ là phương án dự phòng khi chưa có APK.

### 2.5. Kiểm tra mọi thứ chạy được

```powershell
pnpm dev:infra
pnpm dev:backend
```

Mở <http://localhost:3000/api/v1/health> trên máy tính, kết quả phải là `{"status":"ok","db":"up"}`. Sau đó làm theo mục 3 để mở app trên điện thoại: màn hình hiện **"Backend: up"** là máy bạn đã sẵn sàng.

---

## 3. Chạy dự án hằng ngày

App cần backend, nên mỗi ngày cần chạy **cả ba**. Mỗi lệnh chạy trong một terminal riêng, ở thư mục gốc repo:

| Terminal | Lệnh               | Tác dụng                                                                       |
| -------- | ------------------ | ------------------------------------------------------------------------------ |
| 1        | `pnpm dev:infra`   | Bật Postgres, Redis, S3 trong Docker (chạy nền, chỉ cần 1 lần sau khi bật máy) |
| 2        | `pnpm dev:backend` | Chạy API ở cổng 3000, tự reload khi sửa code                                   |
| 3        | `pnpm dev:mobile`  | Chạy Metro. Mở app dev client trên điện thoại rồi quét QR                      |

Mở app **NezFocus** (dev client) trên điện thoại: app tự tìm Metro trong cùng mạng Wi-Fi, hoặc quét QR in ở terminal 3. Không dùng được Wi-Fi chung (trường, quán): xem mục 5.3.

Sửa code TypeScript ở app hay backend đều tự cập nhật; không cần build lại APK. Sửa `packages/shared` thì chạy thêm `pnpm --filter @nezfocus/shared dev` (tự build lại khi lưu).

Tắt hạ tầng khi không dùng: `docker compose -f infra/docker-compose.yml down` (dữ liệu vẫn được giữ trong volume).

Mỗi người có database riêng trên máy mình, nên dữ liệu thử nghiệm không ảnh hưởng nhau.

---

## 4. Quy trình làm một task

### 4.1. Nhận việc

1. Mở board Jira: <https://nez-focus.atlassian.net/jira/software/projects/NF/boards/3>.
2. Chọn issue của mình trong sprint hiện tại. Ưu tiên issue **không còn bị chặn**: mọi issue trong mục _"is blocked by"_ đã Done.
3. Kéo issue sang **In Progress**.
4. Đọc REQ tương ứng trong SRS. Mỗi issue có sẵn mô tả và **Acceptance Criteria dạng checkbox**.

### 4.2. Code

```powershell
git switch main
git pull
git switch -c feat/NF-12-dang-ky-tai-khoan
```

- Tên branch: `<loại>/NF-<số>-<mo-ta-ngan>`, ví dụ `feat/NF-21-tao-server`, `fix/NF-40-fanout-sai-quyen`.
- Bắt đầu feature bằng cách copy module mẫu: backend `apps/backend/src/modules/_example`, app `apps/mobile/src/features/_example`.
- Viết test cho **từng AC** của issue, kể cả case âm (dùng đúng mã lỗi SRS 11.1).

### 4.3. Commit

Theo [Conventional Commits](https://www.conventionalcommits.org), có key Jira để Jira tự liên kết:

```text
feat(backend): NF-12 register account with email verification
fix(mobile): NF-39 typing indicator not clearing after 10s
```

| Loại                   | Dùng khi                        |
| ---------------------- | ------------------------------- |
| `feat`                 | Thêm chức năng                  |
| `fix`                  | Sửa lỗi                         |
| `refactor`             | Đổi cấu trúc, không đổi hành vi |
| `test`                 | Thêm/sửa test                   |
| `docs`                 | Tài liệu                        |
| `chore`, `ci`, `build` | Cấu hình, CI, build             |

Scope hợp lệ: `mobile`, `backend`, `shared`, `mascot`, `infra`, `docs`, `ci`, `deps`. Message sai quy ước sẽ bị git hook chặn.

### 4.4. Trước khi đẩy code

```powershell
pnpm lint
pnpm typecheck
pnpm test
```

Cả ba phải pass. CI chạy lại đúng các bước này, thêm e2e test với Postgres thật.

### 4.5. Pull Request

1. `git push -u origin feat/NF-12-dang-ky-tai-khoan`, rồi mở PR vào `main`.
2. Tiêu đề PR giống commit chính, ví dụ `feat(backend): NF-12 register account`. Mô tả liệt kê **AC nào đạt, AC nào chưa**.
3. Cần **CI xanh** và **ít nhất 1 thành viên khác approve**.
4. Merge kiểu **Squash and merge**, rồi xóa branch.
5. Trên Jira: tích các AC đã đạt, chuyển issue sang **Done**.

---

## 5. App Android: Expo Go, dev client và khi nào build lại

|                                                                | Expo Go                         | Dev client (APK riêng của dự án) |
| -------------------------------------------------------------- | ------------------------------- | -------------------------------- |
| Cài từ                                                         | Google Play                     | Link APK do trưởng nhóm gửi      |
| Chạy bằng lệnh                                                 | `pnpm --filter mobile start:go` | `pnpm dev:mobile`                |
| Thư viện native riêng (LiveKit, Firebase, Notifee, op-sqlite…) | **Không chạy được**             | Chạy được                        |
| Dùng khi                                                       | Dự phòng khi chưa cài được APK  | **Mặc định** cho cả nhóm         |

### 5.1. Cài một lần, dùng tới khi đổi thư viện native

APK dev client chỉ chứa **phần native** (React Native, các module native). Toàn bộ code JS/TS của app được tải từ Metro mỗi lần mở app, nên:

- Sửa màn hình, logic, gọi API… → **không** cần cài lại; lưu file là app tự cập nhật.
- Có người **thêm, xóa hoặc nâng phiên bản thư viện native**, hoặc sửa phần native trong `app.config.ts`/`plugins/` → APK cũ không còn khớp. Người đó chạy `pnpm --filter mobile build:dev` (hoặc workflow **Mobile build (EAS)**, profile `development`), báo cả nhóm, rồi mọi người cài APK mới.

Dấu hiệu APK đã cũ: app báo thiếu native module hoặc crash ngay khi mở màn hình dùng thư viện mới.

### 5.2. Nhiều điện thoại dùng chung một máy chạy Metro

Mọi điện thoại đã cài APK và **cùng mạng Wi-Fi** đều mở được app từ một máy đang chạy `pnpm dev:mobile`, nhiều điện thoại cùng lúc cũng được. Dùng khi demo hoặc khi cả nhóm cùng thử một tính năng.

Cần nhớ:

- Điện thoại chạy **code đang có trên máy chạy Metro** (kể cả phần chưa commit).
- App gọi **backend của máy đó**: địa chỉ lấy từ `apps/mobile/.env` của máy chạy Metro, nên máy đó cũng phải đang chạy `pnpm dev:backend`, và mọi điện thoại dùng chung một database.
- Làm việc hằng ngày: mỗi người dùng **laptop của mình kèm điện thoại của mình**, để code đang sửa của các bạn không lẫn vào nhau.

### 5.3. Mạng chặn kết nối giữa các thiết bị

Wi-Fi ở nhà thường chạy ngay. Wi-Fi trường, quán cà phê hay ký túc xá thường bật _client isolation_: các thiết bị trong mạng không gọi được nhau, nên điện thoại không thấy máy tính. Cách xử lý, theo thứ tự nên thử:

1. **Phát hotspot từ điện thoại**, cho laptop bắt vào hotspot đó. Cập nhật IP mới của laptop vào `apps/mobile/.env` (xem bằng `ipconfig`) rồi khởi động lại Metro. Cả app lẫn backend đều chạy được.
2. **Chạy Metro qua tunnel:** `pnpm dev:mobile -- --tunnel`. Code app tải qua Internet, nhưng tunnel **không** mang theo backend, nên app vẫn cần một backend điện thoại gọi được (cách 1 hoặc backend đã deploy).
3. **Dùng backend dùng chung đã deploy** (`infra/docker-compose.prod.yml`): đặt `EXPO_PUBLIC_API_URL` trỏ tới server đó, máy tính chỉ cần chạy Metro (kết hợp cách 2 nếu cần).

Thư mục `apps/mobile/android/` được sinh tự động (Continuous Native Generation) và không commit. Mọi cấu hình native khai báo trong `app.config.ts` hoặc config plugin trong `apps/mobile/plugins/`.

---

## 6. Database & migration

Schema dùng Drizzle ORM. Mỗi module khai báo bảng trong file `<tên>.schema.ts` và re-export trong `apps/backend/src/db/schema.ts`.

```powershell
cd apps/backend
pnpm db:generate     # sinh file migration từ thay đổi schema → thư mục drizzle/
pnpm build
pnpm db:migrate      # áp migration vào database dev
pnpm db:studio       # giao diện xem dữ liệu
```

- File trong `apps/backend/drizzle/` **phải được commit** cùng thay đổi schema.
- Không sửa migration đã merge vào `main`; muốn đổi thì tạo migration mới.
- Khi deploy, service `migrate` trong `infra/docker-compose.prod.yml` tự chạy migration trước khi backend khởi động.
- Xóa sạch database dev: `docker compose -f infra/docker-compose.yml down -v` (mất toàn bộ dữ liệu dev).

---

## 7. Biến môi trường

| File                | Biến                                                | Ý nghĩa                                                                 |
| ------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/backend/.env` | `DATABASE_URL`                                      | Chuỗi kết nối Postgres (mặc định khớp `infra/docker-compose.yml`)       |
|                     | `PORT`                                              | Cổng API, mặc định 3000                                                 |
|                     | `WORKER_ID`                                         | 0–1023, phần worker của Snowflake ID (mỗi instance backend một giá trị) |
|                     | `REDIS_URL`, `S3_*`                                 | Redis và object storage (SeaweedFS)                                     |
| `apps/mobile/.env`  | `EXPO_PUBLIC_API_URL`                               | Địa chỉ API mà điện thoại gọi tới; dùng IP Wi-Fi của máy tính           |
| `infra/.env.prod`   | `API_DOMAIN`, `BACKEND_IMAGE`, `POSTGRES_*`, `S3_*` | Chỉ dùng trên server deploy                                             |

Biến có tiền tố `EXPO_PUBLIC_` được đóng vào app và **ai cũng đọc được**: không đặt secret vào đó.

---

## 8. Tham chiếu lệnh

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

---

## 9. Xử lý sự cố

| Triệu chứng                                       | Nguyên nhân thường gặp                       | Cách xử lý                                                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App báo **Backend: down**                         | Điện thoại không gọi được máy tính           | Kiểm tra cùng Wi-Fi; IP trong `apps/mobile/.env` đúng với `ipconfig`; cho phép Node.js qua **Windows Firewall** (mạng Private). Sửa `.env` xong thì khởi động lại Metro |
| Quét QR mà app không tải                          | Firewall chặn cổng 8081 của Metro            | Như trên; hoặc chạy `pnpm dev:mobile -- --tunnel`                                                                                                                       |
| Ở nhà chạy được, ra trường/quán thì không         | Wi-Fi bật client isolation                   | Phát hotspot từ điện thoại hoặc dùng tunnel (mục 5.3)                                                                                                                   |
| `/health` trả **503** `db: down`                  | Docker chưa chạy hoặc Postgres chưa sẵn sàng | Mở Docker Desktop, chạy lại `pnpm dev:infra`, đợi vài giây                                                                                                              |
| `pnpm dev:infra` báo lỗi pipe/daemon              | Docker Desktop chưa khởi động                | Mở Docker Desktop và đợi tới khi báo _Engine running_                                                                                                                   |
| Cổng 3000/5432 đã bị dùng                         | Có chương trình khác chiếm cổng              | Tắt chương trình đó, hoặc đổi `PORT` / cổng trong `infra/docker-compose.yml`                                                                                            |
| Commit bị chặn _subject/type/scope_               | Message sai Conventional Commits             | Sửa theo mục 4.3                                                                                                                                                        |
| `format:check` báo lỗi toàn bộ file sau khi clone | Git đổi xuống dòng thành CRLF                | Repo đã có `.gitattributes` ép LF; chạy `git rm -r --cached . -q` rồi `git reset --hard`                                                                                |
| Expo Go báo **incompatible SDK**                  | Expo Go trên máy cũ hơn SDK dự án            | Cập nhật Expo Go trên Google Play                                                                                                                                       |
| App dev client báo thiếu native module            | APK cũ hơn code hiện tại                     | Cài APK mới nhất (mục 5)                                                                                                                                                |
| GitHub Actions: _EAS project not configured_      | Chưa làm mục 1.1                             | Chạy `eas init`, ghi `projectId` vào `app.config.ts`                                                                                                                    |

Vẫn không được: chụp nguyên thông báo lỗi và lệnh đã chạy, gửi vào nhóm, kèm hệ điều hành và output của `node -v`, `pnpm -v`.
