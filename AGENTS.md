# AGENTS — NezFocus

NezFocus: app mobile học nhóm cho sinh viên (đồ án môn App). pnpm monorepo:

- `apps/mobile` — React Native + Expo dev build, **chỉ Android** (DEC-30, SRS v1.3). Bỏ qua phần iOS-only của SRS (APNs, CallKit/PushKit, Sign in with Apple) trừ khi người dùng yêu cầu. Quy tắc riêng: `apps/mobile/AGENTS.md`.
- `apps/backend` — NestJS modular monolith, Drizzle + PostgreSQL.
- `packages/shared` — code dùng chung app ↔ backend (zod schema, permission calculator, mã lỗi).
- `packages/mascot` — mascot Runtime (Rive CLI). Quy tắc riêng: `packages/mascot/AGENTS.md`.
- `docs/SRS_NezFocus.md` — **SRS, nguồn sự thật duy nhất** về chức năng (**v1.11**, CR-28, 05/11/2026). Nội dung từng CR: `docs/SRS_v1.2_change_notes.md`. Còn mở: các REQ đề xuất hoãn (label `de-xuat-hoan` trên GitHub Issues).
- `DESIGN.md` — **nguồn sự thật về giao diện** (màu, chữ, spacing, motion, mascot). Đặc tả từng màn hình (app và web quản trị): `docs/design/screens/` (mục lục ở `README.md` trong đó). Bản vẽ: `Des/nezfocus.pen` (mở bằng pen.dev; ảnh mascot ở `Des/assets/`, logo và icon gốc ở `Des/brand/`). Đọc trước khi làm UI; hỏi người dùng trước khi đi chệch.
- Từ 05/11/2026 **bản gốc** của SRS, change notes, `GLOSSARY.md`, `DESIGN.md`, `docs/design/` và `Des/` nằm trong repo này (thư mục thiết kế cũ chỉ còn để tham khảo). Sửa qua PR theo thứ tự SRS → spec → frame → code (`docs/WORKFLOW.md` mục 8). `Des/nezfocus.pen` chỉ một người sửa. `DESIGN.md` giữ định dạng do gstack kiểm; `.prettierignore` không format các file này.

Bản đồ repo (cây thư mục, luồng code, chỗ đặt file mới, tra SRS nhanh): `OVERVIEW.md`. Đọc trước khi tìm file.

Lệnh: xem `scripts` trong `package.json` ở root và từng package.

## Quy trình

Hai người, chia theo mảng: ai làm gì ở `docs/task-breakdown.md`; làm một việc từ ticket tới merge ở `docs/WORKFLOW.md`. Đọc cả hai trước khi nhận ticket. Chọn việc theo `docs/tien-do.md`; khi mở PR đóng một issue cha (hoặc PR hợp đồng), tick dòng / ô "mốc" tương ứng trong file đó, commit vào cùng PR. Xong ticket thì bàn giao qua ticket: điều người làm sau cần biết ghi vào mục Nguồn của issue đang chờ nó, không chỉ trong PR (WORKFLOW mục 5). Chỉ sửa module backend và `features/` thuộc mảng của ticket, trừ khi ticket ghi khác.

**Skill:** chỉ dùng bộ Matt Pocock trong `.claude/skills/` (phiên bản ở `skills-lock.json`). Không dùng bộ skill khác có thể đang cài trên máy (vd `agent-skills:*`), để hai người chạy cùng một quy trình. Luật dự án thắng mặc định của skill: SRS → file này → `docs/WORKFLOW.md` → skill. Ví dụ: skill bảo commit thì vẫn theo mục Git dưới đây; skill không biết về thiết kế thì vẫn làm `docs/WORKFLOW.md` mục 7.

## Bám SRS

Mọi feature truy về một REQ-ID trong SRS (`REQ-<NHÓM>-<SỐ>`).

1. Trước khi code: đọc REQ đó, các AC (Given/When/Then), cột Release/Depends-on, và DEC/ADR liên quan (SRS Mục 0.2, 7.6). Chỉ làm REQ có Release `MVP-Đồ án` trừ khi người dùng chỉ định khác.
2. Khi SRS im lặng, mơ hồ hoặc tự mâu thuẫn: dừng và hỏi người dùng, nêu số mục/REQ. Ghi lại câu trả lời vào SRS hoặc `docs/` thay vì tự suy ra hành vi.
3. Xong khi: **từng AC** của REQ (kể cả case âm) có test hoặc được kiểm tra thủ công và đối chiếu lại với SRS. Báo cáo cuối liệt kê REQ-ID và AC đã đạt / chưa đạt.
4. Tên trong code theo thuật ngữ SRS Mục 1.3 (Server, Room Session, Solo Session, Host, Participant…); không dùng "guild".

## Cấu trúc & module mẫu

Feature mới bắt đầu bằng cách copy module mẫu, đổi tên, rồi xóa phần không cần:

- Backend: `apps/backend/src/modules/_example/` → `src/modules/<bounded-context>/`. Luồng: controller (validate bằng `ZodValidationPipe`, map JSON) → service (luật nghiệp vụ, ném `AppError(ErrorCode.X)`) → repository (chỉ nơi này chạm Drizzle) → `<name>.schema.ts`. Đăng ký module trong `app.module.ts`, re-export bảng trong `src/db/schema.ts`.
- Mobile: `src/features/_example/` (screens, hooks) + `src/domain/<area>/` (interface repository, use case) + `src/data/<area>/` (implement repository). Screen → hook (TanStack Query) → use case → repository.
- Code dùng chung app ↔ backend: `packages/shared/src/`, export qua `index.ts`.
- Test cạnh file: `*.spec.ts`. Mỗi service/use case có test cho từng AC, case âm dùng đúng mã lỗi SRS 11.1.

Folder `.gitkeep` sẵn có là các bounded context theo SRS 7.1.1 / 7.3.1; thêm folder mới khi SRS có context mới.

## Comment

Viết comment một dòng, chỉ để nói **vì sao**: ràng buộc từ SRS (ghi REQ-ID/mục, vd `// REQ-STUDY-15 AC2: ...`), gotcha của thư viện, đường tắt có chủ đích (`// ponytail: <giới hạn>, <cách nâng cấp>`). Tên hàm/biến đã nói được "làm gì" thì không comment. Không dùng JSDoc cho hàm hiển nhiên, không để code bị comment-out.

## Quy ước kỹ thuật SRS áp đặt

- Snowflake ID và permission bitmap: cột Drizzle `bigint({ mode: 'bigint' })`, trong JSON luôn là string.
- REST: prefix `/api/v1`, key JSON `snake_case`, định dạng lỗi và mã lỗi theo SRS 5.2 / 11.1.
- Thời gian lưu UTC (`timestamptz`); logic "theo ngày" của Study dùng timezone của user.
- Schema/type dùng ở cả app và backend đặt trong `packages/shared`, không copy.

## Git

Task là GitHub Issues của repo (quy ước nhãn, body, branch: `docs/agents/issue-tracker.md`). Branch `<loại>/<số issue>-<mo-ta-ngan>`, vd `feat/12-dang-ky-tai-khoan`. PR có `Closes #<số>`.

- Agent **được** `git commit` và merge giữa các branch **trên máy** (branch ticket, integration branch của `/implement-spec`). Trên GitHub, agent được gán issue cho người đang làm (`gh issue edit --add-assignee`), bình luận / tích AC trên issue, và **mở PR khi người bảo** (sau khi người đã push).
- Agent **không** push, không merge vào `main`, không approve PR, không `reset --hard`, không `rebase` branch đã push, không sửa lịch sử. Push và merge vào `main` là việc của người.
- Commit message: Conventional Commits (`feat(mobile): …`; scope: mobile, backend, shared, mascot, infra, docs, ci, deps), footer `Refs #<số>`. **Không thêm dòng `Co-Authored-By`** hay bất kỳ dòng ghi công agent nào.
- Sau `git pull` / `git switch` / merge có file mới trong `apps/backend/drizzle/`: chạy `pnpm build && pnpm db:migrate` trong `apps/backend` trước khi chạy backend hay e2e (hook husky in dòng nhắc "Co migration moi"). Backend báo `column ... does not exist` → kiểm migration chưa chạy trước khi sửa code; người dùng gặp lỗi đó thì nhắc họ migrate.
- Kết thúc mỗi việc: tóm tắt đã đổi gì, AC đạt / chưa đạt.

## Agent skills

### Issue tracker

GitHub Issues của `Hagno1310/NezFocus`, thao tác bằng `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Năm nhãn mặc định (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + SRS (DEC / ADR nằm trong SRS, không có `docs/adr/`). See `docs/agents/domain.md`.
