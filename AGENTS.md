# AGENTS — NezFocus

NezFocus: app mobile học nhóm cho sinh viên (đồ án môn App). pnpm monorepo:

- `apps/mobile` — React Native + Expo dev build, **chỉ Android** (quyết định 2026-10-16; SRS vẫn ghi iOS + Android, chờ CR). Bỏ qua phần iOS-only của SRS (APNs, CallKit/PushKit, Sign in with Apple) trừ khi người dùng yêu cầu. Quy tắc riêng: `apps/mobile/AGENTS.md`.
- `apps/backend` — NestJS modular monolith, Drizzle + PostgreSQL.
- `packages/shared` — code dùng chung app ↔ backend (zod schema, permission calculator, mã lỗi).
- `packages/mascot` — mascot Runtime (Rive CLI). Quy tắc riêng: `packages/mascot/AGENTS.md`.
- `docs/SRS_NezFocus.md` — **SRS, nguồn sự thật duy nhất** về chức năng. Bản trong repo là bản gốc hiện hành (kể cả khi header ghi "Draft"). Các lỗi đã biết của SRS: `docs/reviews/`. Gặp mục đang bị review đánh dấu thì hỏi người dùng trước khi làm.

Lệnh: xem `scripts` trong `package.json` ở root và từng package.

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

Người dùng tự commit. Agent để thay đổi ở trạng thái chưa commit, kết thúc bằng tóm tắt thay đổi và gợi ý commit message dạng Conventional Commits (`feat(mobile): …`; scope: mobile, backend, shared, mascot, infra, docs, ci, deps).
Không chạy `git commit`, `git push`, `git rebase`, `git reset --hard` hay sửa lịch sử.
