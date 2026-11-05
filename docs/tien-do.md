# Bảng tiến độ

Bảng chọn việc của cả nhóm. Mỗi dòng là **một phiên agent** (một issue cha, hoặc một ticket đứng riêng), xếp theo thứ tự nên làm. Chi tiết của từng việc nằm trong issue trên GitHub (bấm số #).

## Chọn việc thế nào

1. Làm trong **giai đoạn hiện tại**, ở cột của mình, **từ trên xuống**.
2. Một dòng **làm được** khi mọi mục ở "Cần trước" đã được tick. Mục có tên người kia trong ngoặc là việc của người kia.
3. Dòng có "Trong lúc làm" thì vẫn bắt đầu được: ticket con đó chờ người kia, agent dùng Fake nếu ticket ghi, không thì bỏ qua và làm sau (WORKFLOW mục 5).
4. Dòng trên cùng chưa làm được thì xuống dòng kế tiếp. Hết việc ở giai đoạn này thì được làm trước giai đoạn sau, hoặc bàn với người kia để giúp.
5. Có ô con **"mốc"** (hợp đồng, hoặc ticket người kia đang chờ) thì làm và merge sớm: người kia đang đợi nó.

## Tick khi nào

- Tick ô của một dòng **trong chính PR đóng issue cha đó** (agent sửa file này lúc chạy `/pr`). Ô "mốc" hợp đồng tick trong PR hợp đồng.
- Nhờ vậy `main` luôn đúng: ô đã tick = đã merge vào `main`.
- Bắt đầu một dòng thì nói với người kia (hoặc gán issue cho mình), không cần ghi vào đây.

## P0 — Nền móng: đăng nhập được trên máy thật

**Xong P0 khi** đăng ký → đăng nhập chạy trên điện thoại thật bằng dev client, Gateway kết nối được và hiện banner khi mất mạng.

### P0 · Làm chung

- [ ] **P0-1** [#38](https://github.com/Hagno1310/NezFocus/issues/38) Chốt quy ước hợp đồng, dữ liệu giả và seed
  - Cần trước: không có

### P0 · Hiếu

- [ ] **P0-2** [#1](https://github.com/Hagno1310/NezFocus/issues/1) Backend đăng nhập tối thiểu
  - Cần trước: P0-1
  - [ ] mốc **P0-2.1** [#39](https://github.com/Hagno1310/NezFocus/issues/39) Hợp đồng auth trong shared · hợp đồng · người kia chờ: P0-3 (Hoàng)
  - [ ] mốc **P0-2.2** [#40](https://github.com/Hagno1310/NezFocus/issues/40) Backend: gửi / nhập mã email và Hoàn tất tài khoản (AUTH-01, AUTH-13) · người kia chờ: P1-B1 (Hoàng)
  - [ ] mốc **P0-2.3** [#41](https://github.com/Hagno1310/NezFocus/issues/41) Backend: đăng nhập mật khẩu, chống dò mật khẩu, refresh token (AUTH-02, AUTH-04) · người kia chờ: P0-5 (Hoàng)
- [ ] **P0-6** [#53](https://github.com/Hagno1310/NezFocus/issues/53) Bộ tính quyền trong shared và PermissionService (ROLE-08)
  - Cần trước: P0-1
- [ ] **P0-7** [#54](https://github.com/Hagno1310/NezFocus/issues/54) Seed dữ liệu dev
  - Cần trước: P0-2
- [ ] **P0-4** [#4](https://github.com/Hagno1310/NezFocus/issues/4) Màn hình đăng ký và đăng nhập
  - Cần trước: P0-2, P0-3.2 (Hoàng), P0-3b.2 (Hoàng)

### P0 · Hoàng

- [ ] **P0-3** [#2](https://github.com/Hagno1310/NezFocus/issues/2) Khung app
  - Cần trước: P0-1
  - Trong lúc làm: P0-3.2 chờ P0-2.1 (Hiếu)
  - [ ] mốc **P0-3.2** [#43](https://github.com/Hagno1310/NezFocus/issues/43) ApiClient, lưu token và refresh single-flight · người kia chờ: P0-4 (Hiếu), P2-A3 (Hiếu)
- [ ] **P0-3b** [#3](https://github.com/Hagno1310/NezFocus/issues/3) Theme và component dùng chung
  - Cần trước: P0-3
  - [ ] mốc **P0-3b.2** [#45](https://github.com/Hagno1310/NezFocus/issues/45) Dialog / Sheet, Banner / Toast / EmptyState, SegmentedControl, Checkbox, CodeInput, FormMessage, PasswordRules · người kia chờ: P0-4 (Hiếu), P1-A1 (Hiếu)
  - [ ] mốc **P0-3b.3** [#46](https://github.com/Hagno1310/NezFocus/issues/46) TabBar, Avatar / PresenceDot / Badge, SettingsRow · người kia chờ: P1-A1 (Hiếu), P1-A4 (Hiếu)
- [ ] **P0-5** [#5](https://github.com/Hagno1310/NezFocus/issues/5) Gateway khung
  - Cần trước: P0-1, P0-3, P0-3b
  - Trong lúc làm: P0-5.2 chờ P0-2.3 (Hiếu)
  - [ ] mốc **P0-5.1** [#50](https://github.com/Hagno1310/NezFocus/issues/50) Hợp đồng Gateway trong shared · hợp đồng · người kia chờ: P1-A1 (Hiếu)
  - [ ] mốc **P0-5.2** [#51](https://github.com/Hagno1310/NezFocus/issues/51) Gateway backend: kết nối, heartbeat, IDENTIFY, RESUME · người kia chờ: P1-A1 (Hiếu), P1-A4 (Hiếu)
  - [ ] mốc **P0-5.3** [#52](https://github.com/Hagno1310/NezFocus/issues/52) GatewayClient, FakeGatewayClient và banner mất kết nối · người kia chờ: P2-A3 (Hiếu)

## P1 — Có server, có kênh; học một mình

**Xong P1 khi** trên điện thoại thật: tạo được server có kênh và danh mục, phân quyền theo role và theo kênh; học một mình có thông báo khi khóa máy, chuỗi ngày và thống kê; trạng thái online qua Gateway; quên / đổi mật khẩu, đăng xuất, sửa hồ sơ và các màn cài đặt cá nhân chạy được.

### P1 · Hiếu

- [ ] **P1-A1** [#6](https://github.com/Hagno1310/NezFocus/issues/6) Tạo server
  - Cần trước: P0-5.1 (Hoàng), P0-6, P0-7
  - Trong lúc làm: P1-A1.2 chờ P0-5.2 (Hoàng); P1-A1.3 chờ P0-3b.2 (Hoàng); P1-A1.3 chờ P0-3b.3 (Hoàng)
  - [ ] mốc **P1-A1.1** [#55](https://github.com/Hagno1310/NezFocus/issues/55) Hợp đồng server và kênh trong shared · hợp đồng · người kia chờ: P1-B3 (Hoàng)
  - [ ] mốc **P1-A1.2** [#56](https://github.com/Hagno1310/NezFocus/issues/56) Backend: tạo server và kênh tin chào mừng (SRV-01) · người kia chờ: P1-B4 (Hoàng)
- [ ] **P1-A2** [#7](https://github.com/Hagno1310/NezFocus/issues/7) Kênh, danh mục, drawer trái và menu server
  - Cần trước: P1-A1
- [ ] **P1-A3** [#8](https://github.com/Hagno1310/NezFocus/issues/8) Vai trò và quyền theo kênh
  - Cần trước: P0-6, P1-A1, P1-A2
  - [ ] mốc **P1-A3.1** [#64](https://github.com/Hagno1310/NezFocus/issues/64) Hợp đồng role và quyền kênh trong shared · hợp đồng
  - [ ] mốc **P1-A3.2** [#65](https://github.com/Hagno1310/NezFocus/issues/65) PermissionService thật và kiểm tra quyền tập trung (ROLE-02, ROLE-08) · người kia chờ: P2-B1 (Hoàng)
- [ ] **P1-A4** [#9](https://github.com/Hagno1310/NezFocus/issues/9) Tài khoản: đăng xuất và phiên, quên / đổi mật khẩu, hồ sơ
  - Cần trước: P0-2, P0-4, P0-5.2 (Hoàng)
  - Trong lúc làm: P1-A4.4 chờ P1-B4.1 (Hoàng); P1-A4.4 chờ P1-B3.1 (Hoàng); P1-A4.4 chờ P0-3b.3 (Hoàng)
- [ ] **P1-A5** [#10](https://github.com/Hagno1310/NezFocus/issues/10) Cài đặt cá nhân còn lại: quyền riêng tư, thông báo, giao diện / ngôn ngữ / múi giờ
  - Cần trước: P0-4, P1-A1, P1-A4, P1-B4.1 (Hoàng)
  - Trong lúc làm: P1-A5.2 chờ P1-B4.2 (Hoàng); P1-A5.3 chờ P1-B2.3 (Hoàng)

### P1 · Hoàng

- [ ] **P1-B1** [#80](https://github.com/Hagno1310/NezFocus/issues/80) Lõi tính phút học (STUDY-15)
  - Cần trước: P0-2.2 (Hiếu), P0-7 (Hiếu)
- [ ] **P1-B2** [#11](https://github.com/Hagno1310/NezFocus/issues/11) Học một mình (Solo Session)
  - Cần trước: P0-3b, P0-5, P1-B1
  - [ ] mốc **P1-B2.3** [#83](https://github.com/Hagno1310/NezFocus/issues/83) Thông báo chuyển pha khi khóa máy cho Học một mình (STUDY-10 AC1) · người kia chờ: P1-A5 (Hiếu)
- [ ] **P1-B3** [#12](https://github.com/Hagno1310/NezFocus/issues/12) Chuỗi ngày học, thống kê, tab Học
  - Cần trước: P0-5, P1-B1, P1-B2
  - Trong lúc làm: P1-B3.4 chờ P1-A1.1 (Hiếu)
  - [ ] mốc **P1-B3.1** [#84](https://github.com/Hagno1310/NezFocus/issues/84) Hợp đồng thống kê và chuỗi ngày trong shared · hợp đồng · người kia chờ: P1-A4 (Hiếu)
  - [ ] mốc **P1-B3.2** [#85](https://github.com/Hagno1310/NezFocus/issues/85) Backend chuỗi ngày học (STUDY-03) · người kia chờ: P4-A4 (Hiếu)
- [ ] **P1-B4** [#13](https://github.com/Hagno1310/NezFocus/issues/13) Presence qua Gateway
  - Cần trước: P0-3b, P0-5, P1-B2
  - Trong lúc làm: P1-B4.2 chờ P1-A1.2 (Hiếu)
  - [ ] mốc **P1-B4.1** [#89](https://github.com/Hagno1310/NezFocus/issues/89) Hợp đồng presence trong shared · hợp đồng · người kia chờ: P1-A4 (Hiếu), P1-A5 (Hiếu)
  - [ ] mốc **P1-B4.2** [#90](https://github.com/Hagno1310/NezFocus/issues/90) Backend presence qua Gateway (AUTH-05) · người kia chờ: P1-A5 (Hiếu), P4-A4 (Hiếu)
  - [ ] mốc **P1-B4.3** [#91](https://github.com/Hagno1310/NezFocus/issues/91) Presence trên app: gửi trạng thái, tự chuyển Vắng mặt, store / hook (AUTH-05) · người kia chờ: P2-A2 (Hiếu)

## P2 — Mời bạn qua link, chat real-time có phân quyền

**Xong P2 khi** trên hai điện thoại thật: An tạo link mời → Bình bấm link, đăng ký, vào server → hai người chat real-time trong kênh (mention, chưa đọc), người không có `VIEW_CHANNEL` không nhận tin; kết bạn và nhắn tin riêng (DM) được.

### P2 · Hiếu

- [ ] **P2-A1** [#14](https://github.com/Hagno1310/NezFocus/issues/14) Lời mời, tham gia server và deep link
  - Cần trước: P0-4, P1-A1, P1-A2, P1-A3
- [ ] **P2-A3** [#16](https://github.com/Hagno1310/NezFocus/issues/16) Chat trong kênh: gửi tin, idempotency, lịch sử, màn chat
  - Cần trước: P1-A1, P1-A2, P1-A3
  - Trong lúc làm: P2-A3.2 chờ P2-B1.1 (Hoàng); P2-A3.3 chờ P0-3.2 (Hoàng); P2-A3.3 chờ P0-5.3 (Hoàng)
  - [ ] mốc **P2-A3.1** [#99](https://github.com/Hagno1310/NezFocus/issues/99) Hợp đồng tin nhắn và trạng thái đã đọc trong shared · hợp đồng · người kia chờ: P2-B1 (Hoàng), P2-B3 (Hoàng)
  - [ ] mốc **P2-A3.2** [#100](https://github.com/Hagno1310/NezFocus/issues/100) Backend gửi tin, idempotency, lịch sử (MSG-09, MSG-01, SEARCH-02) · người kia chờ: P2-B3 (Hoàng), P3-B7 (Hoàng)
  - [ ] mốc **P2-A3.3** [#101](https://github.com/Hagno1310/NezFocus/issues/101) CSDL cục bộ và kho tin nhắn trên app: cache, outbox tin nhắn, khớp nonce (MSG-09, 8.4.5, 8.7) · người kia chờ: P2-B2 (Hoàng)
  - [ ] mốc **P2-A3.4** [#102](https://github.com/Hagno1310/NezFocus/issues/102) Màn chat kênh text (S-HOME-01) (MSG-01, MSG-09, SEARCH-02) · người kia chờ: P2-B1 (Hoàng), P2-B3 (Hoàng), P3-B7 (Hoàng)
- [ ] **P2-A2** [#15](https://github.com/Hagno1310/NezFocus/issues/15) Thành viên: gán role và drawer thành viên
  - Cần trước: P1-A3, P2-A3
  - Trong lúc làm: P2-A2.3 chờ P1-B4.3 (Hoàng)
  - [ ] mốc **P2-A2.1** [#96](https://github.com/Hagno1310/NezFocus/issues/96) Backend danh sách thành viên và gán role (ROLE-04) · người kia chờ: P2-B3 (Hoàng)
  - [ ] mốc **P2-A2.3** [#98](https://github.com/Hagno1310/NezFocus/issues/98) Drawer phải: Thành viên (S-HOME-03 phần Thành viên) · người kia chờ: P3-B7 (Hoàng)
- [ ] **P2-A4** [#17](https://github.com/Hagno1310/NezFocus/issues/17) Mention, giới hạn gửi, tin hệ thống, chưa đọc và badge
  - Cần trước: P2-A1, P2-A2, P2-A3, P2-B4 (Hoàng)
  - Trong lúc làm: P2-A4.3 chờ P2-B2.1 (Hoàng)
  - [ ] mốc **P2-A4.1** [#103](https://github.com/Hagno1310/NezFocus/issues/103) Backend mention, rate limit, tin hệ thống (MSG-03, MSG-08, MSG-11) · người kia chờ: P3-B7 (Hoàng)
  - [ ] mốc **P2-A4.4** [#106](https://github.com/Hagno1310/NezFocus/issues/106) App: chưa đọc, đánh dấu đã đọc, badge (S-HOME-01, S-HOME-02, TabBar) (NOTIF-01) · người kia chờ: P2-B3 (Hoàng), P3-B7 (Hoàng)

### P2 · Hoàng

- [ ] **P2-B4** [#118](https://github.com/Hagno1310/NezFocus/issues/118) NotificationService.create: hợp đồng mục Hộp thư và phần lưu (NOTIF-05, nền)
  - Cần trước: P0-5
- [ ] **P2-B2** [#19](https://github.com/Hagno1310/NezFocus/issues/19) Bạn bè và chặn
  - Cần trước: P1-B2, P1-B4, P2-B4
  - Trong lúc làm: P2-B2.3 chờ P2-A3.3 (Hiếu)
  - [ ] mốc **P2-B2.1** [#110](https://github.com/Hagno1310/NezFocus/issues/110) Hợp đồng bạn bè và chặn trong shared · hợp đồng · người kia chờ: P2-A4 (Hiếu)
- [ ] **P2-B1** [#18](https://github.com/Hagno1310/NezFocus/issues/18) Phát event có chọn lọc và đang nhập
  - Cần trước: P0-5, P0-6 (Hiếu)
  - Trong lúc làm: P2-B1.2 chờ P2-A3.1 (Hiếu); P2-B1.2 chờ P1-A3.2 (Hiếu); P2-B1.3 chờ P2-A3.4 (Hiếu)
  - [ ] mốc **P2-B1.1** [#107](https://github.com/Hagno1310/NezFocus/issues/107) Hợp đồng nhắm người nhận, SUBSCRIBE và typing trong shared · hợp đồng · người kia chờ: P2-A3 (Hiếu)
- [ ] **P2-B3** [#20](https://github.com/Hagno1310/NezFocus/issues/20) Tin nhắn riêng (DM 1-1) và hồ sơ thành viên
  - Cần trước: P2-A3.1 (Hiếu), P2-B2
  - Trong lúc làm: P2-B3.2 chờ P2-A3.2 (Hiếu); P2-B3.3 chờ P2-A3.4 (Hiếu); P2-B3.3 chờ P2-A4.4 (Hiếu); P2-B3.4 chờ P2-A2.1 (Hiếu); P2-B3.4 chờ P2-A3.4 (Hiếu)
  - [ ] mốc **P2-B3.1** [#114](https://github.com/Hagno1310/NezFocus/issues/114) Hợp đồng DM, quyền nhắn DM, hồ sơ người khác trong shared · hợp đồng

## P3 — Phòng học, Room Session, gọi 1-1; quản lý server

**Xong P3 khi** trên điện thoại thật: vào Phòng học bằng voice (kể cả mạng chặn UDP), chạy Room Session chung, khóa máy vẫn được báo chuyển pha và tính đủ phút; gọi 1-1 có push khi app ở nền; sửa / xóa / trả lời / react, gửi ảnh, ghim; kiểm duyệt, rời / xóa / chuyển quyền server, xóa tài khoản, báo cáo vi phạm.

### P3 · Hiếu

- [ ] **P3-A1** [#21](https://github.com/Hagno1310/NezFocus/issues/21) Sửa / xóa / trả lời / react tin nhắn, link tin (MSG-05, S-HOME-04)
  - Cần trước: P2-A1, P2-A3
- [ ] **P3-A2** [#22](https://github.com/Hagno1310/NezFocus/issues/22) Đính kèm ảnh (MSG-04) và ghim tin (MSG-10)
  - Cần trước: P2-A3, P2-A4, P3-A1
- [ ] **P3-A3** [#23](https://github.com/Hagno1310/NezFocus/issues/23) Kiểm duyệt thành viên: tạm khóa, mời ra, cấm, audit log (ROLE-05, ROLE-07, ROLE-09)
  - Cần trước: P2-A2, P3-B1.1 (Hoàng)
  - Trong lúc làm: P3-A3.4 chờ P3-B3.1 (Hoàng)
- [ ] **P3-A4** [#24](https://github.com/Hagno1310/NezFocus/issues/24) Rời / xóa / chuyển quyền server và xóa tài khoản (SRV-05, AUTH-10)
  - Cần trước: P3-A3
  - Trong lúc làm: P3-A4.2 chờ P3-B3.1 (Hoàng)
  - [ ] mốc **P3-A4.4** [#133](https://github.com/Hagno1310/NezFocus/issues/133) App: xóa và khôi phục tài khoản (S-ME-03, S-AUTH-01, S-AUTH-04) · người kia chờ: P4-B2 (Hoàng)
- [ ] **P3-A5** [#25](https://github.com/Hagno1310/NezFocus/issues/25) Báo cáo vi phạm và tab Báo cáo của moderator (SAFE-01, S-MOD-02, S-SET-05)
  - Cần trước: P2-B4 (Hoàng), P3-A1, P3-A3
  - [ ] mốc **P3-A5.3** [#136](https://github.com/Hagno1310/NezFocus/issues/136) App: tab Báo cáo của moderator (S-SET-05) · người kia chờ: P4-B1 (Hoàng)

### P3 · Hoàng

- [ ] **P3-B1** [#26](https://github.com/Hagno1310/NezFocus/issues/26) Phòng voice: LiveKit, TURN, vào phòng, mic / camera
  - Cần trước: P0-5
  - [ ] mốc **P3-B1.1** [#137](https://github.com/Hagno1310/NezFocus/issues/137) Hợp đồng voice trong shared · hợp đồng · người kia chờ: P3-A3 (Hiếu)
- [ ] **P3-B5** [#29](https://github.com/Hagno1310/NezFocus/issues/29) Push FCM (NOTIF-02)
  - Cần trước: P2-B4
  - [ ] mốc **P3-B5.1** [#152](https://github.com/Hagno1310/NezFocus/issues/152) Hợp đồng push trong shared · hợp đồng · người kia chờ: P4-A1 (Hiếu)
  - [ ] mốc **P3-B5.2** [#153](https://github.com/Hagno1310/NezFocus/issues/153) Backend push: token, gửi FCM theo APP_STATE (NOTIF-02) · người kia chờ: P4-A1 (Hiếu)
- [ ] **P3-B2** [#27](https://github.com/Hagno1310/NezFocus/issues/27) Cài đặt Phòng học (STUDY-11, S-SET-07)
  - Cần trước: P1-A2 (Hiếu), P3-B3
  - [ ] mốc **P3-B2.1** [#143](https://github.com/Hagno1310/NezFocus/issues/143) Hợp đồng Phòng học trong shared (focus_control, chu kỳ) · hợp đồng · người kia chờ: P4-A2 (Hiếu)
- [ ] **P3-B3** [#28](https://github.com/Hagno1310/NezFocus/issues/28) Room Session: phiên học chung trong Phòng học (STUDY-01, S-ROOM-02…06, S-ROOM-08)
  - Cần trước: P1-B1, P1-B2, P3-B1, P3-B2
  - [ ] mốc **P3-B3.1** [#145](https://github.com/Hagno1310/NezFocus/issues/145) Hợp đồng Room Session trong shared · hợp đồng · người kia chờ: P3-A3 (Hiếu), P3-A4 (Hiếu)
- [ ] **P3-B4** [#151](https://github.com/Hagno1310/NezFocus/issues/151) Báo chuyển pha khi khóa máy + xin quyền thông báo theo ngữ cảnh (S-ROOM-07, S-ROOM-09)
  - Cần trước: P1-B2, P3-B1, P3-B3
- [ ] **P3-B6** [#30](https://github.com/Hagno1310/NezFocus/issues/30) Gọi thoại / video 1-1 và mời vào phòng bằng link (DMVC-01, DMVC-03, STUDY-16)
  - Cần trước: P2-A4 (Hiếu), P2-B3, P3-B1, P3-B3, P3-B5
  - Trong lúc làm: P3-B6.5 chờ P2-A1 (Hiếu)
  - [ ] mốc **P3-B6.1** [#155](https://github.com/Hagno1310/NezFocus/issues/155) Hợp đồng cuộc gọi 1-1 trong shared (kèm tin hệ thống cuộc gọi) · hợp đồng
- [ ] **P3-B7** [#31](https://github.com/Hagno1310/NezFocus/issues/31) Chat trong phòng voice (S-HOME-08, DEC-35)
  - Cần trước: P2-A3.2 (Hiếu), P2-A4.1 (Hiếu), P3-B3
  - Trong lúc làm: P3-B7.2 chờ P2-A3.4 (Hiếu); P3-B7.2 chờ P2-A4.4 (Hiếu); P3-B7.2 chờ P2-A2.3 (Hiếu)

## P4 — Việc cần làm, Hộp thư, web quản trị, pilot

**Xong P4 khi** trên bản preview, luồng demo SRS 2.6 chạy trọn (đăng ký → tạo Study Server → mời bạn → chat → phòng học → Room Session → streak và việc cần làm → gọi 1-1); đội vận hành xử lý được một báo cáo trên web quản trị; pilot đã chạy và có số KPI.

### P4 · Làm chung

- [ ] **P4-AB** [#35](https://github.com/Hagno1310/NezFocus/issues/35) OpenAPI sinh từ code, sửa lỗi pilot, báo cáo và slide
  - Cần trước: P4-A4, P4-B1, P4-B2

### P4 · Hiếu

- [ ] **P4-A3** [#33](https://github.com/Hagno1310/NezFocus/issues/33) Web quản trị: nền móng, đăng nhập admin, menu CLI (ADMIN-01, W4)
  - Cần trước: P0-1, P0-2, P0-7
- [ ] **P4-A4** [#34](https://github.com/Hagno1310/NezFocus/issues/34) Web quản trị: Báo cáo, Người dùng & Server, Tổng quan & Nhật ký (SAFE-02, ADMIN-02…06)
  - Cần trước: P0-4, P3-A4, P3-A5, P4-A3
  - Trong lúc làm: P4-A4.2 chờ P4-B1.1 (Hoàng); P4-A4.8 chờ P1-B3.2 (Hoàng); P4-A4.8 chờ P1-B4.2 (Hoàng)
  - [ ] mốc **P4-A4.8** [#182](https://github.com/Hagno1310/NezFocus/issues/182) Backend Tổng quan và user_daily_activity (ADMIN-02) · người kia chờ: P4-B2 (Hoàng)
- [ ] **P4-A1** [#32](https://github.com/Hagno1310/NezFocus/issues/32) Task Board và Việc cần làm (STUDY-06, STUDY-08)
  - Cần trước: P1-A2, P1-A3, P2-A4, P3-A4, P3-B5.1 (Hoàng)
  - Trong lúc làm: P4-A1.3 chờ P3-B5.2 (Hoàng)
  - [ ] mốc **P4-A1.1** [#162](https://github.com/Hagno1310/NezFocus/issues/162) Hợp đồng Task trong shared · hợp đồng
  - [ ] mốc **P4-A1.5** [#166](https://github.com/Hagno1310/NezFocus/issues/166) Chi tiết việc (S-TASK-02) · người kia chờ: P4-B1 (Hoàng)
- [ ] **P4-A2** [#168](https://github.com/Hagno1310/NezFocus/issues/168) Template Study Server (STUDY-05)
  - Cần trước: P1-A1, P3-B2.1 (Hoàng), P4-A1

### P4 · Hoàng

- [ ] **P4-B1** [#36](https://github.com/Hagno1310/NezFocus/issues/36) Hộp thư Thông báo (NOTIF-05, S-NOTI-01)
  - Cần trước: P0-5, P3-B5
  - Trong lúc làm: P4-B1.4 chờ P4-A1.5 (Hiếu); P4-B1.4 chờ P3-A5.3 (Hiếu)
  - [ ] mốc **P4-B1.1** [#187](https://github.com/Hagno1310/NezFocus/issues/187) Hợp đồng Hộp thư trong shared · hợp đồng · người kia chờ: P4-A4 (Hiếu)
- [ ] **P4-B2** [#37](https://github.com/Hagno1310/NezFocus/issues/37) Bản preview, crash report, checklist phát hành, chạy pilot
  - Cần trước: P3-B3, P3-B4, P3-B5
  - Trong lúc làm: P4-B2.2 chờ P2-A3 (Hiếu); P4-B2.3 chờ P3-A4.4 (Hiếu); P4-B2.4 chờ P4-A2 (Hiếu); P4-B2.4 chờ P4-A4.8 (Hiếu)
