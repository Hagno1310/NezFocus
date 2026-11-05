# Chia việc cho 2 người (bản nháp)

Kế hoạch lập lại từ đầu cho 2 người, chỉ dựa trên SRS và bản thiết kế. `project-overview.md` chưa chốt, không phải đầu vào của bản này.

- **A = Hiếu**, **B = Hoàng**.
- **P0…P4 là giai đoạn, xác định bằng thứ chạy được ở cuối, không phải sprint và không phải người.** Một sprint có thể chứa một phần P hoặc nối hai P. Trong mỗi giai đoạn, A và B làm cùng lúc, mỗi người một task của mảng mình. Mỗi task do đúng một người làm trọn: hợp đồng → API → màn hình → test.

```text
         P0 (nền móng)      P1                 P2                     P3 ...
A  ──  auth backend ──►  server, kênh  ──►  lời mời, chat     ──►  sửa/xóa tin, kick/ban
B  ──  khung app    ──►  Solo Session  ──►  bạn bè, DM        ──►  phòng học, Room Session
            ▲ chờ nhau nhiều nhất ở đây      ▲ vài chỗ chạm nhau, gỡ bằng hợp đồng + dữ liệu giả
```

- Mỗi dòng task = một issue cha trên GitHub (`Hagno1310/NezFocus`, đã đăng 05/11/2026), ticket con là sub-issue. Không có ước lượng thời gian; nhóm tự xếp vào sprint.
- **Chọn việc và theo dõi tiến độ: [`tien-do.md`](tien-do.md)** (ô tick, thứ tự nên làm, ai đang chờ ai). File này là kế hoạch gốc, không tick ở đây.
- Làm một task thế nào (hợp đồng, dữ liệu giả, skill, git, thiết kế): [`WORKFLOW.md`](WORKFLOW.md).
- Đặc tả màn hình: `docs/design/screens/<file>.md`, mã màn hình dạng `S-AUTH-02`.

## 1. Nguyên tắc chia

1. **Chia theo mảng, không chia theo tầng.** Mỗi người làm trọn mảng của mình: schema dùng chung → API NestJS → màn hình React Native → test. Không ai "chỉ backend" hay "chỉ app", nên trong một mảng không phải chờ ai.
2. **Mỗi module backend và mỗi thư mục `features/` có đúng một chủ.** Người kia muốn sửa thì nhờ chủ, hoặc báo trước. Ít đụng file chung thì ít conflict.
3. **Chỗ hai mảng gặp nhau thì có hợp đồng viết trước** (`WORKFLOW.md` mục 4). Người dùng hợp đồng làm với dữ liệu giả, không đứng chờ.

## 2. Ai sở hữu gì

|                | **A (Hiếu) — Tài khoản, Server, Chat, Quản trị**                                                                                               | **B (Hoàng) — Thời gian thực, Học, Kết nối**                                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module backend | `auth`, `users`, `servers`, `channels`, `permissions`, `messaging` (cả tệp đính kèm, ghim, tin hệ thống, trạng thái đã đọc), `safety`, `admin` | `gateway` (cả presence, typing, phát event), `notifications` (push FCM, Hộp thư), `friends` + kênh DM, `voice` (LiveKit), `calls`, `study` (Room / Solo Session, phút học, streak, thống kê) |
| Màn hình       | 01 Auth, 02 Home & Chat, 07 Cá nhân, 08 Cài đặt server / kênh (trừ S-SET-07), S-MOD-01…03, web quản trị W1–W4                                  | Khung app (điều hướng, theme, component chung), 03 Phòng học, 04 Tab Học, 06 Thông báo, 09 DM / Bạn bè / Gọi, S-SET-07, S-MOD-04, 05                                                         |
| Việc chung     | Seed dữ liệu dev                                                                                                                               | EAS build, kiểm thử trên máy thật, chuẩn bị pilot                                                                                                                                            |

Task Board và Việc cần làm (STUDY-05, 06, 08) nằm ở **A** dù thuộc module `study`, để cân tải: phần của B ở giai đoạn 3 rất nặng. Web quản trị là React + Vite (giống NezFocus Web), nên ai đã quen React web thì nhận dễ hơn.

**Cân lại sau mỗi giai đoạn:** ai xong trước thì nhận task chưa bắt đầu của người kia, không chạy trước sang giai đoạn sau một mình.

## 3. Các giai đoạn và task

Ký hiệu: **Chờ** = phụ thuộc task của người kia; **Gỡ chờ** = cách làm tiếp khi task đó chưa xong.

### P0 — Nền móng: đăng nhập được trên máy thật

| Task  | Người | Việc                                                                                                                                                                                                                                      | Chờ / Gỡ chờ                                         |
| ----- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| P0-1  | A + B | Ngồi cùng chốt quy ước: thư mục hợp đồng trong `shared`, cách đặt Fake repository + biến `EXPO_PUBLIC_FAKE`, luật migration (`WORKFLOW.md` mục 9)                                                                                         | —                                                    |
| P0-2  | A     | Backend auth tối thiểu: gửi / nhập mã email (AUTH-01, 13; dev in mã ra log), hoàn tất tài khoản, đăng nhập mật khẩu (AUTH-02 phần cơ bản), refresh token (AUTH-04), guard `@CurrentUser`                                                  | Hợp đồng `shared/auth` merge trước để B dùng         |
| P0-3  | B     | Khung app: React Navigation (stack auth / tab chính / drawer trái phải, SRS 3.x), i18n tiếng Việt, ApiClient gắn token + tự refresh, lưu token an toàn                                                                                    | —                                                    |
| P0-3b | B     | Theme + component: token sinh từ `DESIGN.md` (cả sáng và tối, không gõ màu tay), component P0 trong `00-components.md` đủ mọi trạng thái, mỗi component khớp board `C-NN` trong `.pen`; màn "UI Gallery" chỉ có ở bản dev để so với board | —                                                    |
| P0-4  | A     | Màn hình S-AUTH-01…04, S-ONB-01 nối backend thật                                                                                                                                                                                          | Chờ P0-3 / Gỡ chờ: dựng màn hình trần, gắn theme sau |
| P0-5  | B     | Gateway khung: HELLO, IDENTIFY, READY, heartbeat, RESUME (SRS 5.4); `EventPublisher` cho module khác gọi; `GatewayClient` + `FakeGatewayClient` trên app; banner mất kết nối (NF-78)                                                      | Chờ P0-2 (token) / Gỡ chờ: token giả ở test          |
| P0-6  | A     | Bộ tính quyền NF-85 trong `shared` (thuật toán 8.5.2, test đủ nhánh) + `PermissionService` backend (ROLE-08)                                                                                                                              | B cần sớm cho fanout và phòng học                    |
| P0-7  | A     | Script seed dev + lệnh `pnpm --filter backend db:seed`                                                                                                                                                                                    | —                                                    |

**Xong P0 khi** đăng ký → đăng nhập chạy trên điện thoại thật bằng dev client, Gateway kết nối được và hiện banner khi mất mạng.

### P1 — Có server, có kênh; học một mình

| Task  | Người | Việc                                                                                                                                                                                                         | Chờ / Gỡ chờ |
| ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| P1-A1 | A     | SRV-01 tạo server (chưa cần icon) + S-HOME-06                                                                                                                                                                | —            |
| P1-A2 | A     | SRV-02 kênh & danh mục + S-HOME-02 drawer trái, S-SET-09, S-HOME-09                                                                                                                                          | —            |
| P1-A3 | A     | ROLE-01, 02, 03 role + quyền theo kênh + S-SET-02, S-SET-06 (phần Quyền)                                                                                                                                     | —            |
| P1-A4 | A     | AUTH-07 đăng xuất & phiên, AUTH-08 quên mật khẩu (S-AUTH-05), AUTH-14 đổi mật khẩu, AUTH-06 hồ sơ (S-ME-01, 02, 03)                                                                                          | —            |
| P1-A5 | A     | Cài đặt cá nhân còn lại: S-ME-04 Quyền riêng tư (gồm công tắc "Cho phép tin nhắn từ thành viên server" cho DM-02), S-ME-05 Thông báo, S-ME-06 Giao diện / ngôn ngữ / múi giờ (luật đổi múi giờ của STUDY-03) | —            |
| P1-A6 | A     | Gửi email thật: SMTP qua hàng đợi BullMQ, mẫu song ngữ vi/en, Mailpit cho dev (thay việc in mã ra log của P0-2.2; pilot cần)                                                                                 | —            |
| P1-B1 | B     | STUDY-15 luật tính phút học (lõi backend, test kỹ)                                                                                                                                                           | —            |
| P1-B2 | B     | STUDY-10 Solo Session + S-STUDY-02, thông báo đếm giờ khi khóa máy                                                                                                                                           | —            |
| P1-B3 | B     | STUDY-03 streak, STUDY-17 thống kê + S-STUDY-01, S-STUDY-03                                                                                                                                                  | —            |
| P1-B4 | B     | AUTH-05 presence qua Gateway                                                                                                                                                                                 | —            |

**Xong P1 khi** trên điện thoại thật: tạo được server có kênh và danh mục, phân quyền theo role và theo kênh; học một mình có thông báo khi khóa máy, chuỗi ngày và thống kê; trạng thái online qua Gateway; quên / đổi mật khẩu, đăng xuất, sửa hồ sơ và các màn cài đặt cá nhân chạy được.

Mảng Học của B ở P1 gần như không phụ thuộc A (chỉ cần đăng nhập), nên hai người chạy song song thật sự từ đây.

### P2 — Mời bạn qua link, chat real-time có phân quyền

| Task  | Người | Việc                                                                                | Chờ / Gỡ chờ                                                                                                     |
| ----- | ----- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| P2-A1 | A     | SRV-03, 04, 07 lời mời + deep link + S-HOME-07, S-MOD-01                            | —                                                                                                                |
| P2-A2 | A     | ROLE-04 gán role + phần gán role ở S-SET-03                                         | —                                                                                                                |
| P2-A3 | A     | MSG-09 idempotency, MSG-01 gửi tin, SEARCH-02 tải lịch sử + S-HOME-01 màn chat      | Chờ P2-B1 để tin hiện real-time / Gỡ chờ: gọi `EventPublisher`, app dùng `FakeGatewayClient` hoặc kéo để tải lại |
| P2-A4 | A     | MSG-03 mention, MSG-08 rate limit, MSG-11 tin hệ thống, NOTIF-01 chưa đọc & badge   | —                                                                                                                |
| P2-B1 | B     | MSG-07 phát event có chọn lọc (SUBSCRIBE op 8, lọc `VIEW_CHANNEL`), MSG-06 typing   | Chờ P1-A3 (`PermissionService` thật)                                                                             |
| P2-B2 | B     | FRIEND-01…04 + S-DM-04, S-DM-05                                                     | —                                                                                                                |
| P2-B3 | B     | DM-03, DM-01, DM-02 + S-DM-01; S-DM-02 dùng lại màn chat của A                      | Chờ P2-A3 / Gỡ chờ: làm P2-B2 trước                                                                              |
| P2-B4 | B     | Interface `NotificationService.create` (hợp đồng cho Hộp thư; A gọi khi có mention) | —                                                                                                                |

**Xong P2 khi** trên hai điện thoại thật: An tạo link mời → Bình bấm link, đăng ký, vào server → hai người chat real-time trong kênh (mention, chưa đọc), người không có `VIEW_CHANNEL` không nhận tin; kết bạn và nhắn tin riêng (DM) được.

### P3 — Phòng học, Room Session, gọi 1-1; quản lý server

| Task  | Người | Việc                                                                                                          | Chờ / Gỡ chờ                                       |
| ----- | ----- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| P3-B1 | B     | VC-08 TURN + VC-01 LiveKit (thêm LiveKit vào `infra/`), STUDY-02 mic tắt sẵn, VC-02, VC-04, VC-05 + S-ROOM-01 | Thêm thư viện native → build lại dev client, báo A |
| P3-B2 | B     | STUDY-11 cài đặt Phòng học + S-SET-07                                                                         | —                                                  |
| P3-B3 | B     | STUDY-01 Room Session + S-ROOM-02…06, S-ROOM-08 mini-player                                                   | —                                                  |
| P3-B4 | B     | Thông báo chuyển pha khi khóa máy (S-ROOM-07, foreground service), S-ROOM-09                                  | Thử trên ít nhất 2 hãng máy (RISK-06)              |
| P3-B5 | B     | NOTIF-02 push FCM                                                                                             | —                                                  |
| P3-B6 | B     | DMVC-01, 03 gọi 1-1 + S-CALL-01, 02; STUDY-16 mời vào phòng bằng link                                         | Chờ P2-A1 (deep link) cho STUDY-16                 |
| P3-B7 | B     | S-HOME-08 chat trong phòng voice (DEC-35)                                                                     | Chờ P2-A3 (màn chat), P3-B1                        |
| P3-A1 | A     | MSG-05 sửa / xóa / trả lời / react + S-HOME-04                                                                | —                                                  |
| P3-A2 | A     | MSG-04 đính kèm ảnh + S-HOME-05; MSG-10 ghim                                                                  | —                                                  |
| P3-A3 | A     | ROLE-05, 07 kick / ban / tạm khóa chat, ROLE-09 ghi audit log + S-SET-03, S-SET-04                            | —                                                  |
| P3-A4 | A     | SRV-05 rời / xóa / chuyển quyền (S-SET-08), AUTH-10 xóa tài khoản                                             | —                                                  |
| P3-A5 | A     | SAFE-01 báo cáo (S-MOD-02) + tab Báo cáo của moderator (S-SET-05)                                             | —                                                  |

**Xong P3 khi** trên điện thoại thật: vào Phòng học bằng voice (kể cả mạng chặn UDP), chạy Room Session chung, khóa máy vẫn được báo chuyển pha và tính đủ phút; gọi 1-1 có push khi app ở nền; sửa / xóa / trả lời / react, gửi ảnh, ghim; kiểm duyệt, rời / xóa / chuyển quyền server, xóa tài khoản, báo cáo vi phạm.

### P4 — Việc cần làm, Hộp thư, web quản trị, pilot

| Task  | Người | Việc                                                                                                          | Chờ / Gỡ chờ                |
| ----- | ----- | ------------------------------------------------------------------------------------------------------------- | --------------------------- |
| P4-A1 | A     | STUDY-06 Task Board + S-TASK-02, 03; STUDY-08 Việc cần làm (S-TASK-01)                                        | —                           |
| P4-A2 | A     | STUDY-05 template Study Server                                                                                | Chờ P3-B2 (`focus_control`) |
| P4-A3 | A     | Tạo `apps/admin` (React + Vite), ADMIN-01 đăng nhập + CLI tài khoản admin (W4)                                | —                           |
| P4-A4 | A     | SAFE-02 + ADMIN-03 Báo cáo (W1), ADMIN-04, 05 Người dùng & Server (W2), ADMIN-02, 06 Tổng quan & Nhật ký (W3) | —                           |
| P4-B1 | B     | NOTIF-05 Hộp thư + S-NOTI-01                                                                                  | —                           |
| P4-B2 | B     | EAS bản preview, đo crash-free, checklist DoD (SRS 9.6), chạy pilot                                           | —                           |
| P4-AB | A + B | Sửa lỗi pilot, OpenAPI sinh từ code, báo cáo + slide                                                          | —                           |

**Xong P4 khi** trên bản preview, luồng demo SRS 2.6 chạy trọn (đăng ký → tạo Study Server → mời bạn → chat → phòng học → Room Session → streak và việc cần làm → gọi 1-1); đội vận hành xử lý được một báo cáo trên web quản trị; pilot đã chạy và có số KPI.

## 4. Phạm vi

Đã chốt (05/11/2026, CR-28): MSG-04 chỉ gửi ảnh (video, tệp, quét virus sang v1.x); outbox chỉ cho tin nhắn (reaction, việc, đánh dấu đã đọc khi offline thì nút vô hiệu). Hoãn sang v1.x (cả nhóm chốt cùng ngày): link preview của MSG-02 (Markdown vẫn làm, ticket P2-A3.5), GDM-01…03, NOTIF-04 AC2 (silent push xóa thông báo trên thiết bị khác). Bản này **không xếp** các mục đó vào task nào.

Nếu trễ, cắt tiếp theo thứ tự (đều là Should, không nằm trong luồng demo): MSG-10 ghim → MSG-06 typing → VC-05 → STUDY-16 → AUTH-06 phần ảnh đại diện → DM-02. Cả nhóm quyết trước khi cắt.
