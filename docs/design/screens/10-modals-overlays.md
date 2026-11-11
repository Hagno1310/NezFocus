# 10 · Modal & overlay

Các lớp phủ dùng chung nhiều nơi: preview lời mời, báo cáo vi phạm, dialog xác nhận thao tác nguy hiểm, toast & banner hệ thống, xin quyền hệ điều hành.

- Hành vi: SRS v1.9 Mục 3.1, 3.4 (toast, banner, xác nhận nguy hiểm, Toast chung theo mã lỗi), 3.5 (trạng thái chuẩn, thiếu quyền hệ điều hành), 3.6 UF-03, REQ-SRV-01/03/04/05/07, REQ-STUDY-16, REQ-ROLE-05/07, REQ-SAFE-01, REQ-AUTH-10/14, REQ-VC-01, REQ-NOTIF-02/05, REQ-MSG-02, NFR-MOB-10, DEC-39. Mã lỗi: `40001`, `40011`, `40029`, `40041`, `40100`, `40102`, `40103`, `40301`, `40302`, `40303`, `40306`, `40307`, `40401`, `40904`, `40905`, `40907`, `50000`, `50301`.
- (v1.9, 30/10/2026) Sửa theo CR-13 (bỏ Silent Room: xin quyền mic khi chạm Mic lần đầu), CR-16 ("Quên mật khẩu?" và giới hạn sai mật khẩu ở S-MOD-03 `password`; S-ONB-02 bỏ nên S-MOD-01 là chỗ duy nhất có thẻ lời mời toàn khung), CR-17 (bảng mã lỗi → Toast chung, Toast `removed-from-server`, hủy request của server bị gỡ, `#chao-mung`, người mời), CR-18 (S-MOD-02: lý do "Gian lận học tập", báo cáo hồ sơ, ghi chú riêng tư, `sent`, giới hạn), CR-19 (link mời trong tin), CR-22 (Mic / Camera ở màn xem trước phòng), CR-24 (toast đảo màu).
- Component: [00-components.md](00-components.md) — `BottomSheet` / `Dialog` (C-09), `Toast` / `Banner` (C-14), `Button` (C-01), `TextField` (C-02), `FormMessage`, `ScreenHeader` (C-22), `Avatar` (C-13), `SettingsRow` (C-15), `OS/StatusBar`, `OS/Keyboard`; mới: `OS/PermissionDialog`. Nhìn thế nào: [DESIGN.md](../../../DESIGN.md) (chế độ **Operate**).
- Hành vi chốt 21/10/2026 khi viết spec này (23 câu, chủ dự án đồng ý cả 23): một luật cho loại lớp phủ (dialog / sheet / toàn khung); preview lời mời toàn khung dùng chung thẻ với S-ONB-02 (v1.9: S-ONB-02 bỏ); lời mời vào phòng chỉ lộ tên phòng; đã là thành viên thì bỏ qua preview; báo cáo có mô tả ≤ 500 ký tự, bắt buộc khi "Khác", màn đã gửi có "Chặn"; xác nhận nguy hiểm là sheet, gõ tên (xóa server / kênh) hoặc mật khẩu (chuyển Owner / xóa tài khoản), ban không dùng mẫu này; giới hạn tần suất chung là toast; banner offline / reconnecting chờ 3 giây, tối đa 2 dải; một toast một lúc, không toast trên lớp phủ; sheet giải thích mic / camera một lần; Silent Room xin mic khi chạm Mic (v1.9: mọi phòng xin khi chạm Mic lần đầu, CR-13); không mic thì không gọi. Hành vi mới ghi ở `SRS_v1.2_change_notes.md` mục 12 (CR-07, đã áp vào SRS v1.6 ngày 21/10/2026).

## Quy ước chung của khu vực

| Hạng mục | Quy ước |
|---|---|
| Khung | 390 × 844; kiểm thêm 360 × 800 cho S-MOD-02 `choose-reason` và S-MOD-03 `type-name`. Theme sáng kiểm nhanh: S-MOD-01 `valid`, S-MOD-02 `choose-reason`, S-MOD-03 `type-name`, S-MOD-05 `mic` |
| Vị trí | Lớp phủ nằm trên màn đã mở nó; frame vẽ trên nền màn gốc thật (S-HOME-01, S-ROOM-01…), scrim `bg` 60% (C-09). S-MOD-01 là màn toàn khung riêng (không `TabBar`) |
| Một luật cho mỗi loại lớp phủ | **Dialog** = xác nhận không có ô nhập. **BottomSheet** = mọi lớp phủ có ô nhập hoặc danh sách lựa chọn (báo cáo, xác nhận nhập tên / mật khẩu) và giải thích quyền mic / camera — sheet nằm trên bàn phím (C-09 `keyboard-open`). **Màn toàn khung** = preview lời mời và giải thích quyền thông báo (S-ROOM-09, đã duyệt) |
| Lỗi | Lỗi trong sheet dùng `FormMessage` trên nút chính (C-02), không dùng toast |
| Màu ngữ nghĩa | Nút xác nhận phá hủy `danger`; không màu pha. Banner trung tính (C-14). (v1.9, CR-24) Toast **đảo màu** (C-14: nền `text-primary`, chữ và mọi icon màu `bg`, hành động `primary-inverse`, không bóng) — không dùng `danger` / `success` trên toast, câu chữ nói lỗi gì |
| Mascot | Chỉ `confused 96` ở S-MOD-01 `expired` (lỗi nhẹ — DESIGN.md › Mascot). **Không** ở `banned`, báo cáo, xác nhận nguy hiểm, sheet quyền |
| Giọng văn | Xưng "bạn"; không lộ mã lỗi; báo cáo không bao giờ nói ai sẽ xem hay người kia bị xử lý thế nào |
| Dữ liệu nhất quán | Bây giờ **20:12, Chủ Nhật 18/10/2026**. Server An đang ở: "Ôn thi Giải tích 2" (An là Owner, 24 thành viên), "Nhóm đồ án Mobile", "CLB Guitar PTIT" → lời mời **hợp lệ** cho An phải là server An chưa ở. Lời mời trong onboarding (01) dùng "Ôn thi Giải tích 2" vì An lúc đó chưa ở server nào. Khánh không phải bạn của An (khớp 02 S-HOME-10 `not-friend`). Báo cáo ≤ 20/ngày. Frame dùng nền copy từ area 01 / 03 (S-MOD-04 `stacked`, S-MOD-05) vẫn để giờ **20:12** của area này; mốc trong nền tính lại theo 20:12 (S-MOD-05 `camera`: còn 18:42 → "nghỉ ngắn lúc 20:31") |

### Dữ liệu mẫu

| Dùng ở | Giá trị |
|---|---|
| S-MOD-01 `valid` / `room-invite` | **Chi** mời vào **"Ôn thi Xác suất thống kê"** (Study Server) · 18 thành viên · 4 đang online. Lời mời vào phòng: 🔊 "Phòng học im lặng" của server đó |
| S-MOD-01 `guest` | **Bình** mời vào **"Ôn thi Giải tích 2"** · 24 thành viên · 6 đang online (khớp lời mời đang chờ của 01; cũng là màn An thấy ngay sau 01 S-ONB-01 Hoàn tất tài khoản) |
| S-MOD-01 `already-member` | Link mời vào "Ôn thi Giải tích 2" (An đã ở) |
| S-MOD-02 | Tin của **Khánh** (`khanh.le`, khớp 02 S-HOME-10) trong `#hoi-dap` (Ôn thi Giải tích 2), 20:05: "Bán đề thi giữa kỳ có đáp án 50k, ai cần inbox mình" (lý do mẫu khi chọn: "Gian lận học tập"). Tin này đã có **2 báo cáo** đang chờ trong hàng đợi của server ("Gian lận học tập" 20:07, "Lừa đảo" 20:09 — 08 S-SET-05; người quản lý thấy "2 báo cáo về tin này" khi xóa — 02 S-HOME-04 `delete-confirm`); sheet ở đây là nhánh minh họa một người báo cáo, không đổi các số đó. Báo cáo hồ sơ: Khánh, giới thiệu (v1.9, CR-18) "Bán tài liệu ôn thi giá rẻ · inbox mình" (lý do mẫu: "Spam hoặc quảng cáo"; đúng câu của 02 S-HOME-10, chốt 31/10/2026). Báo cáo server: "CLB Guitar PTIT" · 36 thành viên. **Nền theo đích báo cáo:** tin nhắn → S-HOME-01 `default` có thêm tin của Khánh 20:05 (giữa Chi 20:04 và Dũng 20:06); người (`target-user`) → 02 S-HOME-10 `not-friend` (chat có tin Khánh 20:05, sheet hồ sơ Khánh nằm dưới sheet báo cáo, một lớp scrim); server (`target-server`, `sent-server`) → 02 S-HOME-09 của **CLB Guitar PTIT** đã đóng menu: drawer CLB Guitar PTIT (rail CG đang chọn, "Server · 36 thành viên", kênh `#thong-bao`, `#chung`, `#lich-tap`, `#hop-am`) |
| S-MOD-03 | Nhập tên: **Xóa server "Ôn thi Giải tích 2"** (An là Owner) — nền 08 S-SET-01 `owner` (màn có hàng "Xóa server", kể cả `TabBar`). Mật khẩu: **Chuyển quyền Owner "Ôn thi Giải tích 2" cho Bình** — nền 08 S-SET-08 `transfer-picker` (header "Chuyển quyền Owner", danh sách thành viên) |
| S-MOD-05 | Mic: (v1.9, CR-13, CR-22) chạm **Mic** lần đầu trên màn xem trước "Phòng thảo luận nhóm" của Ôn thi Giải tích 2 (Phòng học chưa có phiên, có Nam và Quân — 03 › Dữ liệu mẫu; S-ROOM-01 `not-joined`), trước khi bấm "Vào phòng". Camera: bật camera lần đầu trong "Phòng học im lặng" |

---

## S-MOD-01 · Preview lời mời

**Mục đích:** cho người nhận xem server trước khi tham gia, và đưa người chưa có tài khoản vào đúng luồng.
**REQ:** SRV-04, SRV-07, STUDY-16, ROLE-07, UF-03, DEC-39.
**Mở từ:** link `https://nezfocus.app/invite/<code>` (kèm `?channel=` hay không) mở từ ngoài app; (v1.9, CR-19) chạm **chữ link mời** trong tin nhắn (thẻ lời mời dưới tin — 02 S-HOME-01 `invite-cards` — tham gia thẳng, **không** qua màn này; chỉ chữ link mở preview); "Tiếp tục" ở S-HOME-06 `join-by-code`; sau đăng nhập / Hoàn tất tài khoản khi có lời mời đang chờ (01 › Điều hướng sau khi vào được tài khoản). **Đi tới:** (v1.9, CR-17) S-HOME-01 của **kênh text đầu tiên xem được** trong server (Study Server: `#chao-mung`) khi tham gia xong; S-ROOM-01 `not-joined` hoặc S-ROOM-02 `not-joined` (lời mời vào phòng); S-AUTH-02 / S-AUTH-04 (`guest`, lưu lời mời đang chờ); màn trước đó (✕).

### Bố cục (`valid`)
Màn không ô nhập: tiêu đề + thẻ căn giữa phía trên cụm nút; cụm nút ở đáy (PLATFORMS › Bố cục dọc). Tiêu đề `title-1` "X mời bạn vào" + thẻ ngang icon server 72, thêm ✕. (v1.9, CR-16) Trước đây khối này dùng chung với 01 S-ONB-02 `pending-invite`; S-ONB-02 đã bỏ nên **S-MOD-01 là chỗ duy nhất** có thẻ lời mời toàn khung (thẻ lời mời trong tin là `InviteEmbed` của 00, khác hình).
```
┌ Status bar ──────────────────────────────┐
│ ✕                                        │  IconButton (đóng), không tiêu đề
│                                          │
│ Chi mời bạn vào                          │  title-1
│ ┌──────────────────────────────────────┐ │
│ │ [ÔX 72]  Ôn thi Xác suất thống kê    │ │  thẻ ngang (surface-1, viền border); tên headline, tối đa 2 dòng rồi cắt …
│ │          18 thành viên · 4 đang online│ │  label, text-secondary
│ └──────────────────────────────────────┘ │
│ 🔊 Mời vào học ở Phòng học im lặng        │  chỉ ở `room-invite`; label, text-secondary
│                                          │
│ [            Tham gia             ]      │  Button · primary · L
└ Nav bar ─────────────────────────────────┘
```

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Chi mời bạn vào" (v1.9, CR-17 #6: `inviter = null` — người tạo đã rời server, tài khoản đang chờ xóa hoặc đã xóa: "Bạn được mời vào"; lời mời vẫn tham gia được) |
| Thẻ | Tên server · "18 thành viên · 4 đang online". Tên 2 dòng ngắt chủ động giữa cụm từ: "Ôn thi Xác suất / thống kê" (không tách "thống kê") |
| Nút | "Tham gia" |
| Lời mời vào phòng | Dòng dưới thẻ: icon `volume-2` + "Mời vào học ở Phòng học im lặng" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `loading` | Thẻ dạng skeleton (khối **vuông bo góc 72**, cùng dáng icon server, + dải tiêu đề và 2 dải trong thẻ), nút ẩn | — |
| `valid` | Như bố cục | — |
| `room-invite` | Link có `?channel=`: thêm dòng phòng; chỉ tên phòng, không lộ ai đang trong phòng hay có phiên học | "Mời vào học ở Phòng học im lặng"; Tham gia → vào server rồi mở S-ROOM-01/02 `not-joined` của phòng (không tự kết nối voice — VC-01) |
| `guest` | Chưa đăng nhập: hai nút xếp dọc; dòng `label` `text-secondary` trên cụm nút | "Tạo tài khoản để tham gia" (`primary · L`) / "Đăng nhập" (`secondary · L`); dòng: "Lời mời được giữ 24 giờ trong lúc bạn tạo tài khoản". Chạm nút → lưu lời mời đang chờ (SRV-07 v1.2) → S-AUTH-02 / S-AUTH-04 kèm banner lời mời (01); xong nhập mã và Hoàn tất tài khoản thì quay về đây ở `valid` (v1.9, CR-16) |
| `joining` | Nút "Tham gia" `loading`; ✕ vô hiệu | — |
| `expired` | Không có thẻ server (backend không trả thông tin của invite hỏng): mascot `confused 96` + tiêu đề + mô tả; một nút | "Lời mời không còn hiệu lực" · "Lời mời đã hết hạn, hết lượt hoặc bị thu hồi. Xin bạn bè gửi lời mời mới." · "Đóng" (`secondary · L`) — SRV-07 AC3, `40041` |
| `banned` | Bấm Tham gia → `40306`: thẻ giữ nguyên, `FormMessage` (lỗi) trên nút, nút ẩn, thêm "Đóng" | "Bạn không thể tham gia Ôn thi Xác suất thống kê" (v1.9: cũng là màn khi lời mời đang chờ sau Hoàn tất tài khoản dẫn tới server mình bị cấm — 01 bỏ frame `invite-banned`) |
| `max-servers` | Bấm Tham gia → `40011`: `FormMessage` trên nút, nút `disabled` | "Bạn đã ở 100 server, mức tối đa. Rời bớt một server để tham gia server mới." (khớp 02 › Edge case) |
| `already-member` | **Không hiện preview**: mở thẳng kênh đích (`?channel=` → S-ROOM-01/02 `not-joined`; không có → kênh mở gần nhất của server) + `Toast` | "Bạn đã ở trong Ôn thi Giải tích 2" (SRV-04 AC3, STUDY-16 AC2). Frame: S-HOME-01 + toast |
| `members-only` | Mở deep link kênh `https://nezfocus.app/channels/…` khi không phải thành viên (STUDY-16 AC4): như `expired` nhưng icon `lock` 56 thay mascot | "Link này chỉ dành cho thành viên của server" · "Xin người gửi một lời mời vào server." · "Đóng" |
| `offline` | `Banner · offline` dưới hàng ✕; thẻ là skeleton tĩnh (chưa tải được); nút `disabled` + dòng lý do | "Cần kết nối mạng để xem lời mời" |

Không áp dụng: `empty` (luôn có một lời mời), `forbidden` (lời mời không cần quyền trong server), `os-permission`.

### Tương tác
- ✕ / Back → màn trước đó (mở từ link khi app chưa chạy: về tab Home). Nếu là lời mời đang chờ thì lời mời bị bỏ; mở ngay sau Hoàn tất tài khoản thì ✕ về 02 S-HOME-02 `no-server` (thay "Để sau" của S-ONB-02 cũ).
- Tham gia thành công → S-HOME-01 của kênh text đầu tiên xem được (`#chao-mung` ở Study Server — dữ liệu mẫu "Ôn thi Xác suất thống kê" mở `#chao-mung`), hoặc phòng đích; không toast (tin hệ thống "An đã tham gia server" ở kênh tin chào mừng là đủ — REQ-MSG-11; server chọn "Không gửi" thì không có tin).

### Checklist duyệt
- [ ] Thẻ lời mời: icon server 72, tên `headline` tối đa 2 dòng, dòng số liệu `label` (không còn so với S-ONB-02 — đã bỏ).
- [ ] Dữ liệu: server trong `valid` không phải server An đang ở.
- [ ] `expired` và `members-only` không hiện tên server.

---

## S-MOD-02 · Báo cáo vi phạm (BottomSheet)

**Mục đích:** báo cáo một tin nhắn, một hồ sơ hoặc một server cho người kiểm duyệt.
**REQ:** SAFE-01, AUTH-06 (giới thiệu trên hồ sơ), NOTIF-05 (`report_reviewed`).
**Mở từ:** "Báo cáo" ở S-HOME-04 (tin nhắn, kể cả trong DM — 09); (v1.9, CR-25 #10) "Báo cáo hồ sơ" trong `ActionSheet` ⋯ của S-HOME-10 (`menu`; thay hàng chữ "⚑ Báo cáo"); "Báo cáo server" ở S-HOME-09. **Đi tới:** màn đã mở sheet (đóng sau `sent`); `Dialog` chặn của 09 (S-DM-04 `block-confirm`) từ nút "Chặn Khánh"; 02 S-HOME-09 `leave-confirm` từ nút "Rời server" (`sent-server`).

### Bố cục (`choose-reason`, báo cáo tin nhắn)
```
│ ─────                                    │  thanh kéo
│ Báo cáo tin nhắn                         │  title-2
│ ┌──────────────────────────────────────┐ │
│ │ [K] Khánh · 20:05                    │ │  khối trích (nền surface-2): avatar 20 + tên + giờ
│ │ Bán đề thi giữa kỳ có đáp án 50k, ai │ │  body, tối đa 2 dòng rồi cắt …
│ │ cần inbox mình                       │ │
│ └──────────────────────────────────────┘ │
│ Lý do                                    │  label
│ ( ) Spam hoặc quảng cáo                  │  RadioRow 56, không dòng mô tả dưới lý do
│ ( ) Gian lận học tập                     │  (v1.9, CR-18)
│ ( ) Quấy rối hoặc bắt nạt                │
│ ( ) Nội dung nhạy cảm                    │
│ ( ) Lừa đảo                              │
│ ( ) Khác                                 │
│ Mô tả thêm (không bắt buộc)              │  TextField · multiline, 0/500
│ NezFocus không cho Khánh biết ai đã báo  │  label, text-secondary, icon shield
│ cáo.                                     │
│ [          Gửi báo cáo          ]        │  Button · primary · L
```

### Bố cục (`target-user`, báo cáo hồ sơ — v1.9, CR-18 #2)
```
│ ─────                                    │
│ Báo cáo hồ sơ của Khánh                  │  title-2
│ ┌──────────────────────────────────────┐ │
│ │ (K 40)  Khánh                        │ │  khối trích (surface-2): avatar 40 + tên (body 600)
│ │         khanh.le                     │ │  + username (label text-tertiary)
│ │ Bán tài liệu ôn thi giá rẻ · inbox   │ │  + giới thiệu (body-sm text-secondary), tối đa 2 dòng rồi cắt …
│ │ mình                                 │ │
│ └──────────────────────────────────────┘ │
│ ⓘ Báo cáo hồ sơ dành cho tên, ảnh và     │  label text-secondary, icon info; trên các lý do
│ giới thiệu. Bị làm phiền qua tin nhắn?   │
│ Báo cáo từng tin, hoặc chặn Khánh.       │
│ Lý do                                    │
│ ( ) Tên, ảnh hoặc giới thiệu phản cảm    │
│ ( ) Mạo danh người khác                  │
│ ( ) Spam hoặc quảng cáo                  │
│ ( ) Khác                                 │
│ Mô tả thêm (không bắt buộc)              │
│ NezFocus không cho Khánh biết ai đã báo  │
│ cáo.                                     │
│ [          Gửi báo cáo          ]        │
```

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề theo đích | "Báo cáo tin nhắn" · (v1.9) "Báo cáo hồ sơ của Khánh" · "Báo cáo server" |
| Khối trích | Tin: avatar 20 + tên + giờ + nội dung (2 dòng). Hồ sơ: avatar 40 + tên + `khanh.le` + giới thiệu (2 dòng rồi "…"; không có giới thiệu thì bỏ dòng). Server: icon 40 + tên + "Server · 36 thành viên" |
| Lý do — tin nhắn (kể cả DM) và server (SAFE-01, v1.9 CR-18 #1) | "Spam hoặc quảng cáo" · "Gian lận học tập" · "Quấy rối hoặc bắt nạt" · "Nội dung nhạy cảm" · "Lừa đảo" · "Khác" |
| Lý do — hồ sơ (v1.9, CR-18 #2) | "Tên, ảnh hoặc giới thiệu phản cảm" · "Mạo danh người khác" · "Spam hoặc quảng cáo" · "Khác" |
| Dòng gợi ý (chỉ hồ sơ) | "Báo cáo hồ sơ dành cho tên, ảnh và giới thiệu. Bị làm phiền qua tin nhắn? Báo cáo từng tin, hoặc chặn Khánh." |
| Mô tả | Nhãn "Mô tả thêm (không bắt buộc)"; chọn "Khác" thì "Mô tả (bắt buộc)"; placeholder "Điều gì đang xảy ra?"; tối đa 500 ký tự |
| Ghi chú riêng tư (v1.9, CR-18 #9) | Tin / hồ sơ: "NezFocus không cho Khánh biết ai đã báo cáo." · server: "NezFocus không cho người quản lý của server biết ai đã báo cáo." |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `choose-reason` | Như bố cục, chưa chọn lý do (6 lý do) | — |
| `reason-selected` | Chọn "Gian lận học tập" | — |
| `missing-reason` | Bấm gửi khi chưa chọn: `FormMessage` (lỗi) trên nút (nút luôn bấm được — C-02) | "Chọn một lý do để gửi báo cáo" · "Khác" mà trống mô tả: ô mô tả `error` "Mô tả điều đang xảy ra" |
| `keyboard-open` | Chọn "Khác", gõ mô tả: sheet cao tới dưới status bar, đáy chạm bàn phím; tiêu đề và nút "Gửi báo cáo" ghim, phần giữa cuộn tới ô mô tả (khối trích và các lý do đầu cuộn khuất) | Nhãn "Mô tả (bắt buộc)", "42/500" |
| `sending` | Nút `loading`, sheet không đóng được | — |
| `sent` | Nội dung sheet thay bằng xác nhận; tin / người / server không đổi gì trên màn nền | icon `circle-check` 48 `success` · "Đã gửi báo cáo" · (v1.9, CR-18 #7) "Cảm ơn bạn. Bạn sẽ nhận thông báo khi báo cáo được xem xét." · tin / hồ sơ: "Chặn Khánh" (`secondary · L`, → `Dialog` chặn của 09) + "Xong" (`text`); server: xem `sent-server` |
| `sent-server` | Như `sent`, báo cáo server: hành động tự bảo vệ là rời server; nền như `target-server` | Cùng câu với `sent` · "Rời server" (`secondary · L`, → 02 S-HOME-09 `leave-confirm`) + "Xong" (`text`) |
| `rate-limited` | Báo cáo thứ 21 trong ngày (`40029`): `FormMessage` (trung tính) trên nút, nút `disabled` | (v1.9, CR-18 #9) "Bạn đã gửi 20 báo cáo hôm nay. Gửi tiếp được từ 00:00 ngày mai." |
| `target-user` | Báo cáo hồ sơ (từ ⋯ của S-HOME-10); nền là S-HOME-10 `not-friend` (ActionSheet ⋯ đã đóng); bố cục riêng ở trên: khối trích có giới thiệu, dòng gợi ý, 4 lý do | Tiêu đề "Báo cáo hồ sơ của Khánh". Bằng chứng: tên, ảnh, username và giới thiệu lúc báo cáo + lý do + mô tả; mở trong server → người quản lý của server + admin; mở ngoài server (DM, Bạn bè, hộp thư) → chỉ hàng đợi Platform Admin (CR-07 mục 9, CR-25 #10) |
| `target-server` | Báo cáo server (từ S-HOME-09); nền là drawer CLB Guitar PTIT (S-HOME-09 của server đó, menu đã đóng); 6 lý do như tin nhắn | Tiêu đề "Báo cáo server". Chỉ vào hàng đợi Platform Admin; bằng chứng là ảnh chụp thông tin server (CR-07 mục 10); ghi chú riêng tư câu server |
| `error` | Mất mạng khi gửi: `FormMessage` (lỗi), nút "Thử lại" | "Chưa gửi được báo cáo. Kiểm tra kết nối rồi thử lại." |

Không áp dụng: `loading` (sheet mở ngay bằng dữ liệu đang có), `empty`, `forbidden` (ai thấy nội dung cũng báo cáo được, kể cả người đang bị tạm khóa; tin không còn xem được → `40401` dùng chữ của `error`: "Tin nhắn này không còn tồn tại"), `offline` (gửi khi offline đi vào `error`, không vào outbox), `os-permission`.

**Báo cáo lại** (v1.9, CR-18 #9): cùng người báo cáo lại một đối tượng **còn đang chờ** → backend không tạo báo cáo mới, không tính vào 20 / ngày; giao diện vẫn đi tới `sent` như thường (không báo "đã báo cáo rồi"). Đối tượng đã được xử lý → báo cáo lại được (tính giới hạn).

### Checklist duyệt
- [ ] 3 đích có tiêu đề, khối trích và danh sách lý do đúng (tin / server: 6 lý do; hồ sơ: 4 lý do + dòng gợi ý); không đích nào là chính An.
- [ ] `sent` không nói ai xem báo cáo hay người kia bị xử lý gì; ghi chú riêng tư đúng câu theo đích.
- [ ] `keyboard-open` thấy được ô mô tả và nút gửi.

---

## S-MOD-03 · Xác nhận thao tác nguy hiểm (mẫu chung, BottomSheet)

**Mục đích:** một mẫu xác nhận cho thao tác không hoàn tác được hoặc chuyển quyền, có ô nhập để tránh bấm nhầm.
**REQ:** SRS 3.4 (xác nhận hành động nguy hiểm), SRV-05, AUTH-10, AUTH-14 ("Quên mật khẩu?").
**Mở từ:** các màn P2 dùng lại mẫu này — xóa server (S-SET-08), xóa kênh (S-SET-06), chuyển quyền Owner (S-SET-08), xóa tài khoản (S-ME-03). **Đi tới:** đóng sheet và về màn sau thao tác (do màn gọi quy định); Hủy → màn gọi, không đổi gì.

### Bảng dùng mẫu (một luật)
| Thao tác | Biến thể | Lý do |
|---|---|---|
| Xóa server | `type-name` (gõ tên server) | Mất dữ liệu của cả nhóm |
| Xóa kênh | `type-name` (gõ tên kênh) | Mất toàn bộ tin, không khôi phục |
| Chuyển quyền Owner | `password` (SRV-05) | Mất quyền cao nhất |
| Xóa tài khoản | `password` (AUTH-10); chữ và khối "server chỉ có bạn" ở 07 S-ME-03 `delete-confirm` | Tài khoản |
| Ban thành viên | **Không dùng mẫu này** — `Dialog` xác nhận đơn giản kèm ô lý do tùy chọn (area 08) | Hoàn tác được (unban, ROLE-07) |
| Rời server, hủy kết bạn, chặn, dừng phiên học | `Dialog` đơn giản (đã có ở 02, 03, 09) | Hoàn tác được |

### Bố cục (`type-name`)
```
│ ─────                                    │
│ [trash-2 32, danger]                     │
│ Xóa Ôn thi Giải tích 2?                  │  title-2
│ Server và mọi kênh, tin nhắn, việc cần   │  body, text-secondary
│ làm sẽ bị xóa với 24 thành viên. Bạn có  │
│ 30 ngày để khôi phục.                    │
│ Nhập tên server để xác nhận              │  label
│ ┌──────────────────────────────────────┐ │
│ │ Ôn thi Giải tích 2                   │ │  TextField, placeholder = tên cần gõ (text-tertiary)
│ └──────────────────────────────────────┘ │
│ [          Xóa server           ]        │  Button · danger · L
│ [              Hủy               ]       │  Button · text
```

### Bố cục (`password`, chuyển quyền Owner)
```
│ ─────                                    │
│ [crown 32, text-secondary]               │
│ Chuyển quyền Owner cho Bình?             │  title-2
│ Bình sẽ là Owner của Ôn thi Giải tích 2. │  body, text-secondary
│ Bạn vẫn giữ các vai trò hiện có nhưng    │
│ không còn là Owner.                      │
│ Mật khẩu của bạn                         │  label
│ [••••••••                          [👁]] │  TextField · password
│                         Quên mật khẩu?   │  Button · text, căn phải (v1.9, CR-16 #10)
│ (khối lỗi / thông báo)                   │  FormMessage
│ [         Chuyển quyền          ]        │  Button · danger · L
│ [              Hủy               ]       │  Button · text
```

### Nội dung chữ
| Vị trí | `type-name` (xóa server) | `password` (chuyển quyền Owner) |
|---|---|---|
| Icon | `trash-2` màu `danger` | `crown` màu `text-secondary` |
| Tiêu đề | "Xóa Ôn thi Giải tích 2?" | "Chuyển quyền Owner cho Bình?" |
| Mô tả | "Server và mọi kênh, tin nhắn, việc cần làm sẽ bị xóa với 24 thành viên. Bạn có 30 ngày để khôi phục." | "Bình sẽ là Owner của Ôn thi Giải tích 2. Bạn vẫn giữ các vai trò hiện có nhưng không còn là Owner." |
| Ô nhập | Nhãn "Nhập tên server để xác nhận", placeholder "Ôn thi Giải tích 2" | Nhãn "Mật khẩu của bạn", `TextField · password`; dưới ô "Quên mật khẩu?" (v1.9) |
| Nút | "Xóa server" (`danger`) / "Hủy" | "Chuyển quyền" (`danger`) / "Hủy" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `type-name` | Như bố cục, ô trống; nút `danger` **`disabled`** tới khi gõ khớp — ngoại lệ có chủ đích của luật "nút luôn bấm được" (C-02), vì nhãn ô đã nói đúng điều còn thiếu | — |
| `type-name-match` | Gõ khớp → nút bật | So khớp không phân biệt hoa / thường và dấu, bỏ khoảng trắng thừa ("on thi giai tich 2" khớp) |
| `type-name-keyboard` | `OS/Keyboard · text`, sheet trên bàn phím, nút ngay trên bàn phím; mô tả thu còn 2 dòng | Tắt tự sửa và gợi ý từ |
| `password` | Ô mật khẩu trống, nút bật (C-02) | Bấm khi trống: ô `error` "Nhập mật khẩu" |
| `password-keyboard` | `OS/Keyboard · text` (ô ẩn) | — |
| `password-wrong` | `40102`: ô `error`, chữ đã gõ giữ nguyên | "Mật khẩu không đúng" |
| `password-rate-limited` 🆕 | (v1.9, CR-16 #12) Sai lần thứ 5 trong 10 phút (`40029`, chung giới hạn sai mật khẩu của tài khoản): `FormMessage` (trung tính, icon `clock-3`) trên nút; nút `danger` `disabled` tới hết thời gian chờ (theo `Retry-After`, luật làm tròn S-MOD-04); "Quên mật khẩu?" vẫn bấm được | "Bạn đã nhập sai nhiều lần. Thử lại sau 10 phút, hoặc dùng Quên mật khẩu?" |
| `password-reset-done` 🆕 | (v1.9, CR-16 #10) Quay lại từ chế độ mã của Đổi mật khẩu (07 S-ME-03 `password-code`) sau khi đổi xong: sheet mở lại, ô trống đang focus, `FormMessage` trung tính icon `circle-check` (không toast — S-MOD-04: không toast trên lớp phủ) | "Đã đổi mật khẩu. Nhập mật khẩu mới để tiếp tục." |
| `submitting` | Nút `loading`; Hủy, kéo xuống và Back vô hiệu | — |
| `error` | Mất mạng / lỗi máy chủ: `FormMessage` (lỗi) trên nút | "Chưa thực hiện được. Kiểm tra kết nối rồi thử lại." |

Không áp dụng: `loading`, `empty`, `forbidden` (màn gọi chỉ mở sheet khi có quyền), `offline` (nút của màn gọi đã `disabled` khi offline), `os-permission`.

**"Quên mật khẩu?"** (v1.9, CR-16 #10, AUTH-14) có ở mọi frame của biến thể `password`: chạm → sheet đóng, mở 07 S-ME-03 `password-code` (mã đặt lại tự gửi tới email; màn gọi vẫn nằm dưới trong stack). Back ở đó → về màn gọi, sheet mở lại ở `password` (ô trống); đổi xong → sheet mở lại ở `password-reset-done`. Thao tác đang xác nhận (chuyển quyền / xóa tài khoản) chưa thực hiện cho tới khi nhập mật khẩu mới.

### Checklist duyệt
- [ ] Mỗi biến thể một frame bàn phím mở; ô và nút luôn nhìn thấy.
- [ ] Biến thể `password` luôn có "Quên mật khẩu?" ngay dưới ô.
- [ ] Placeholder là đúng chuỗi cần gõ.
- [ ] Không mascot.

---

## S-MOD-04 · Toast & banner hệ thống

**Mục đích:** một luật cho mọi thông điệp hệ thống không chặn thao tác: nằm ở đâu, ưu tiên thế nào, khi nào biến mất.
**REQ:** SRS 3.4 (Toast/Snackbar, banner "Đang kết nối lại…", Toast chung theo mã lỗi), 3.5 (Offline), 11.1 (thông điệp hiển thị), MSG-08, ROLE-05, NOTIF-05, NFR-A11Y-05.
**Mở từ:** sự kiện hệ thống ở bất kỳ màn nào. **Đi tới:** không (hành động trong toast / banner tự quy định).

### Luật (sở hữu bởi spec này; C-14 sở hữu hình)
| Hạng mục | Luật |
|---|---|
| Banner hay toast | **Banner** = tình trạng còn kéo dài (offline, đang kết nối lại, thiếu quyền, lời mời đang chờ). **Toast** = sự kiện một lần (thao tác quá nhanh, gửi thất bại, đã sao chép, đã kết nối lại sau gián đoạn dài ở phòng học). Giới hạn tần suất chung (`40029` không có chỗ hiện riêng) là **toast**, không phải banner (SRS 3.4) — bỏ biến thể `Banner · rate-limited` khỏi C-14 |
| Offline hay đang kết nối lại | Máy báo không có mạng → `Banner · offline`. Có mạng nhưng mất Gateway → `Banner · reconnecting`. Cả hai chỉ hiện sau **3 giây** liên tục (tránh nháy); không bao giờ hiện cùng lúc |
| Khi có lại kết nối | Banner biến mất, **không** toast "Đã kết nối lại" (trừ S-ROOM-EDGE `reconnected-gap`, đã có) |
| Chồng banner | Tối đa **2 dải**: dải hệ thống (offline / reconnecting) trên, dải ngữ cảnh (thiếu quyền mic, thông báo tắt, lời mời đang chờ) dưới. Ngữ cảnh có nhiều dải thì chỉ hiện dải quan trọng nhất của màn đó |
| Vị trí banner | Ngay dưới header (`ChannelHeader`, `ScreenHeader` hoặc tiêu đề tab), tràn viền; đẩy nội dung xuống, không phủ lên. Màn cuộc gọi (S-CALL-01) không có banner — chữ "Đang kết nối lại…" thay giờ (09) |
| Vị trí toast | Trên `MiniPlayer` / `TabBar`; trong chat: trên `Composer`; bàn phím mở: trên bàn phím (hoặc trên `Composer` nếu có); màn không TabBar có cụm nút đáy: ngay trên cụm nút (PLATFORMS) |
| Hàng đợi toast | Một toast một lúc; toast mới **thay** toast cũ ngay; trùng nội dung thì chỉ reset thời gian, không nhân đôi |
| Khi đang mở sheet / dialog | Không hiện toast trên lớp phủ: lỗi trong sheet dùng `FormMessage`; toast của sự kiện nền chờ tới khi lớp phủ đóng (quá 4 giây thì bỏ) |
| Accessibility | Banner và toast được đọc bằng `accessibilityLiveRegion="polite"`; toast có hành động giữ 6 giây (C-14) |
| Hình toast | (v1.9, CR-24 #3) **Đảo màu** theo C-14 (nền `text-primary`, chữ và mọi icon màu `bg`, hành động `primary-inverse` 600, `rounded.button`, không bóng); icon lỗi (`octagon-x`…) và icon thành công cùng màu chữ — không `danger` / `success` trên toast. Vị trí, hàng đợi, thời gian giữ, luật trên sheet / dialog như các dòng trên |
| Chữ theo mã lỗi | (v1.9, CR-17 #16) Chỗ gọi **có chữ riêng** (FormMessage của form, Toast riêng của area) thì dùng chữ đó; không có thì dùng bảng "Toast chung theo mã lỗi" dưới đây. Không hiện mã lỗi, không hiện `request_id` |
| Request của server vừa bị gỡ | (v1.9, CR-17 #17) Nhận event bị mời ra / cấm khỏi một server → app hủy mọi request đang chờ của server đó, bỏ tin trong outbox của server (không thành `failed`), hủy tệp đang tải; lỗi trả về sau đó (`40302`, `40401`, `40306`) **không** hiện Toast (Dialog bị mời ra / cấm của 02 S-HOME-EDGE đã nói việc này) |

### Danh mục chữ (mọi toast & banner hệ thống)
| Loại | Icon | Chữ | Hành động |
|---|---|---|---|
| Banner `offline` | `wifi-off` | "Bạn đang offline" | — |
| Banner `reconnecting` | vòng xoay | "Đang kết nối lại…" | — |
| Toast `rate-limited` | `timer` | "Thao tác quá nhanh · thử lại sau 30 giây" (số giây theo `Retry-After`; một dòng ở 390) | — |
| Toast `send-failed` | `octagon-x` | "Không gửi được tin nhắn" | "Thử lại" |
| Toast `copied` | `copy` | "Đã sao chép" | — |
| Toast `removed-from-server` 🆕 | `log-out` | (v1.9, CR-17 #15) Sau `READY` lúc mở app / kết nối lại, mỗi mục hộp thư bị mời ra / cấm **chưa đọc** chưa từng báo trên máy này: "Bạn không còn ở Nhóm đồ án Mobile"; ≥ 2 mục: "Bạn không còn ở 2 server". Mỗi mục toast tối đa một lần trên một máy; mục đã đọc ở máy khác → không toast | "Xem" (→ tab Thông báo) |
| Banner `push-denied` | `bell-off` | "Thông báo đang tắt" | "Mở cài đặt" |
| Banner `mic-denied` | `mic-off` | "Chưa có quyền mic · vẫn nghe được" | "Mở cài đặt" |

### Toast chung theo mã lỗi (v1.9, CR-17 #16)
Chỉ khi chỗ gọi không có chữ riêng. Một dòng ở 390 (cắt "…" nếu chữ dài hơn — không có câu nào trong bảng dài hơn một dòng ở 390). Icon cùng màu chữ (toast đảo màu).

| Mã | Icon | Chữ |
|---|---|---|
| Mất kết nối (request không tới được máy chủ) | `wifi-off` | "Không kết nối được · kiểm tra mạng rồi thử lại" |
| `40029` | `timer` | "Thao tác quá nhanh · thử lại sau 30 giây" (số giây theo `Retry-After`; luật làm tròn ở Edge case: từ 60 giây làm tròn lên phút) |
| `40302` | `lock` | "Bạn không còn quyền làm việc này" |
| `40401` | `circle-slash` | "Nội dung này không còn khả dụng" |
| `40307` | `clock-3` | "Bạn đang bị tạm khóa đến 22:30" (khác ngày: "đến 22:30, 20/10") |
| `40301` | `shield` | "Người này có vai trò ngang hoặc cao hơn bạn" |
| `40306` | `ban` | "Bạn không thể tham gia server này" |
| `40001` | `circle-alert` | "Thông tin chưa hợp lệ · kiểm tra lại rồi thử lại" |
| `40303` | `message-square-off` | "Không thể gửi tin nhắn cho người dùng này" |
| `40904` / `40905` | — | Giữ chữ riêng của 02 (không dùng toast chung) |
| `50000`, `50301`, `40907`, mã lạ | `octagon-x` | "Có lỗi xảy ra · thử lại sau ít phút" |
| `40100` / `40103` | — | Không toast: về màn phiên đăng nhập kết thúc (01 › Edge case › Phiên đăng nhập kết thúc, CR-16 #9) |

### Trạng thái (frame)
| State | Frame | Ghi chú |
|---|---|---|
| `reconnecting` | Dùng lại 02 S-HOME-01 `reconnecting` | Không vẽ lại |
| `offline` | Dùng lại 02 S-HOME-01 `offline` | Không vẽ lại |
| `rate-limited` | **Mới:** S-HOME-01 thả reaction liên tục → toast trên `Composer` | (v1.9) toast đảo màu, icon `timer` màu `bg` |
| `stacked` | **Mới:** trên 03 S-ROOM-EDGE `mic-denied` (đã vào phòng, chưa có quyền mic), mất Gateway > 3 giây → `Banner · reconnecting` trên, `Banner · mic-denied` dưới | Offline thật thì rớt khỏi phòng voice, nên ví dụ dùng reconnecting |
| `toast-keyboard` | **Mới:** S-HOME-01 `keyboard-open` + toast `send-failed` ngay trên `Composer` | (v1.9) toast đảo màu; icon `octagon-x` cùng màu chữ (`bg`), "Thử lại" màu `primary-inverse` |
| `catalog` | **Mới:** bảng danh mục chữ ở trên dưới dạng các instance, theme tối (tham chiếu, không phải màn hình) | (v1.9) mọi toast đảo màu; thêm Toast `removed-from-server` (một server và "2 server") và một khối "Toast chung theo mã lỗi" (11 dòng có chữ của bảng trên) |

Mọi frame khác của app có Toast đổi hình theo master C-14 (đảo màu, CR-24) — không phải sửa từng frame bằng tay nếu frame dùng instance của master.

### Checklist duyệt
- [ ] Không frame nào có banner và toast cùng nói một việc.
- [ ] `stacked` đúng thứ tự hệ thống trên, ngữ cảnh dưới.
- [ ] Toast đảo màu, không bóng; không icon `danger` / `success` trên toast (CR-24).
- [ ] `catalog` có đủ chữ của bảng mã lỗi; không frame nào hiện mã lỗi thô.

---

## S-MOD-05 · Thiếu quyền hệ điều hành

**Mục đích:** giải thích trước khi xin quyền mic / camera, và chỉ đường mở Cài đặt khi đã bị chặn; app vẫn dùng được khi bị từ chối.
**REQ:** NFR-MOB-10, SRS 3.5 (Thiếu quyền hệ điều hành), VC-01, DMVC-01, NOTIF-02.
**Mở từ:** (v1.9, CR-13 #1) chạm **Mic** lần đầu ở mọi phòng voice — vào phòng **không** xin quyền mic nữa (mic luôn tắt sẵn); (v1.9, CR-22 #4) chạm **Mic** / **Camera** lần đầu ở hàng nút của màn xem trước phòng (S-ROOM-01 / S-ROOM-02 `not-joined`); bật camera lần đầu trong phòng (S-ROOM-01/02) hoặc cuộc gọi (S-CALL-01); bấm 📞 / 🎥 / nghe máy lần đầu (09); chạm nút Mic / Camera `no-permission` (C-17); "Mở cài đặt" trên banner; (11/11/2026, P1-A4.6 (#75)) "Chụp ảnh" trong sheet đổi ảnh của 07 S-ME-01 và 08 S-SET-01 (quyền camera, câu riêng `camera` (ảnh) / `camera-blocked` (ảnh)) — từ chối thì sheet đóng, ảnh cũ giữ nguyên, "Chọn ảnh" vẫn dùng được. **Đi tới:** `OS/PermissionDialog` (hộp thoại Android); Cài đặt ứng dụng của Android; màn gọi tiếp tục (nút Mic / Camera ở màn xem trước bật lên — Camera thì hiện ô xem trước của mình, 03 `camera-on-before-join`; gọi; xem trước camera trong phòng S-ROOM-01 `camera-self-preview`).

### Luồng (một luật cho mic và camera)
```
Lần đầu cần quyền ─▶ sheet giải thích (`mic` / `camera`) ─ "Tiếp tục" ─▶ hộp thoại Android
                                                     └ "Để sau" ─▶ tiếp tục không có quyền
Hộp thoại Android: Cho phép ─▶ tiếp tục bình thường
                   Không cho phép (còn hỏi lại được) ─▶ tiếp tục không có quyền; lần chạm sau mở thẳng hộp thoại Android
                   Không cho phép lần 2 (Android chặn hẳn) ─▶ lần chạm sau mở sheet `mic-blocked` / `camera-blocked` ─▶ Cài đặt
```
**Thông báo** không thuộc sheet này: giải thích ở S-ROOM-09 (màn toàn khung, đã duyệt); đã chặn → `Banner · push-denied` mở thẳng Cài đặt.

**Không có quyền thì sao:** phòng voice — vẫn vào, nghe được; đã từ chối khi chạm Mic thì `Banner · mic-denied` (03 S-ROOM-EDGE `mic-denied`); cuộc gọi — **không gọi** (gọi mà người kia không nghe được là vô nghĩa), ở lại S-DM-02; camera — tiếp tục chỉ bằng thoại, nút Camera `no-permission`.

### Bố cục (`mic`)
```
│ ─────                                    │
│ [mic 32 trong vòng tròn surface-2 64]    │
│ Cho phép NezFocus dùng mic             │  title-2
│ Để nói chuyện với mọi người trong phòng. │  body, text-secondary
│ Bạn luôn có thể tắt mic bất cứ lúc nào.  │
│ [            Tiếp tục            ]       │  Button · primary · L
│ [             Để sau              ]      │  Button · text
```

### Nội dung chữ
| State | Tiêu đề | Mô tả | Nút |
|---|---|---|---|
| `mic` (phòng) | "Cho phép NezFocus dùng mic" | "Để nói chuyện với mọi người trong phòng. Bạn luôn có thể tắt mic bất cứ lúc nào." | "Tiếp tục" / "Để sau" |
| `mic` (cuộc gọi) | như trên | "Để Bình nghe thấy bạn trong cuộc gọi." | "Tiếp tục" / "Để sau" |
| `camera` | "Cho phép NezFocus dùng camera" | "Để bạn bè thấy bạn khi học cùng. Bạn sẽ xem trước hình của mình trước khi bật." | "Tiếp tục" / "Để sau" |
| `mic-blocked` (phòng) | "Mic đang bị chặn" | "Bật quyền Mic cho NezFocus trong Cài đặt của máy để nói trong phòng. Bạn vẫn nghe được mọi người." | "Mở cài đặt" / "Để sau" |
| `mic-blocked` (cuộc gọi) | "Cần quyền mic để gọi" | "Bật quyền Mic cho NezFocus trong Cài đặt của máy để Bình nghe thấy bạn." | "Mở cài đặt" / "Để sau" — **thay dialog tạm ở 09 S-CALL-01 `mic-denied`** |
| `camera-blocked` | "Camera đang bị chặn" | "Bật quyền Camera cho NezFocus trong Cài đặt của máy để bật camera." | "Mở cài đặt" / "Để sau" |
| `camera` (ảnh) | "Cho phép NezFocus dùng camera" | "Để chụp ảnh mới làm ảnh đại diện hoặc ảnh server." | "Tiếp tục" / "Để sau" |
| `camera-blocked` (ảnh) | "Camera đang bị chặn" | "Bật quyền Camera cho NezFocus trong Cài đặt của máy để chụp ảnh. Bạn vẫn chọn được ảnh có sẵn trong máy." | "Mở cài đặt" / "Để sau" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `mic` | Sheet trên S-ROOM-01 `not-joined` của "Phòng thảo luận nhóm" (Phòng học chưa có phiên, 03) — (v1.9) màn xem trước có hàng `RoomControl` Mic · Camera (tắt) + "Vào phòng" (CR-22 #4); sheet mở sau khi chạm **Mic** (không phải "Vào phòng") | Như bảng |
| `mic-system` | `OS/PermissionDialog` Android trên S-ROOM-01 `not-joined` (cùng nền v1.9 như `mic`, sau "Tiếp tục") | "Cho phép NezFocus ghi âm?" · "Trong khi dùng ứng dụng" / "Chỉ lần này" / "Không cho phép" |
| `mic-blocked` | Sheet trên 03 S-ROOM-EDGE `mic-denied` (đã vào, có banner thiếu quyền, chạm Mic `no-permission`) | Như bảng |
| `mic-blocked-call` | Sheet trên S-DM-02 (bấm 📞) | Như bảng |
| `camera` | Sheet trên S-ROOM-02 `focus-participant` (chạm Camera lần đầu) | Như bảng |
| `camera-blocked` | Sheet trên S-ROOM-02 (chạm Camera `no-permission`) | Như bảng |
| `notifications` | Không frame mới — trỏ tới 03 S-ROOM-09 `first-focus` / `first-server` và `Banner · push-denied` | — |
| `returned-from-settings` | Không frame: quay lại app sau Cài đặt → app kiểm tra lại quyền; đã bật thì banner biến mất và nút Mic về `off` (không tự bật mic) | Luật bằng chữ |

Không áp dụng: `loading`, `empty`, `error`, `offline` (quyền không cần mạng), `forbidden` (thiếu quyền RBAC là chuyện khác — C-17 `mod-muted`).

### Checklist duyệt
- [ ] Sheet giải thích chỉ hiện một lần cho mỗi quyền; "Để sau" không gọi hộp thoại Android.
- [ ] Không mascot trên sheet quyền.
- [ ] S-CALL-01 `mic-denied` đã đổi sang `mic-blocked-call`.

---

## Ma trận trạng thái

| Màn | default | loading | empty | error | offline | forbidden | os-permission |
|---|---|---|---|---|---|---|---|
| S-MOD-01 | ✔ `valid` | ✔ | — luôn có lời mời | ✔ `expired`, `banned`, `max-servers`, `members-only` | ✔ | — | — |
| S-MOD-02 | ✔ `choose-reason` | — mở ngay | — | ✔ `error`, `rate-limited` | → `error` | — | — |
| S-MOD-03 | ✔ `type-name` / `password` | — | — | ✔ `password-wrong`, `password-rate-limited`, `error` | — nút màn gọi đã `disabled` | — màn gọi kiểm quyền | — |
| S-MOD-04 | luật + `catalog` | — | — | — | ✔ (dùng lại 02) | — | ✔ `stacked` (`mic-denied`) |
| S-MOD-05 | ✔ `mic` | — | — | — | — | — | ✔ toàn bộ màn |

## Edge case (rà ngày 21/10/2026)

Frame nằm trong nhóm "10 · Modal & overlay — Edge case", tên `S-MOD-EDGE · <trường hợp>` (4 frame). Chủ dự án chọn làm cả 20 trường hợp.

### Có frame
| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `expired-on-join` — lời mời hết hạn / hết lượt / bị thu hồi đúng lúc bấm Tham gia (preview đã tải) | Chuyển sang S-MOD-01 `expired`, **không toast** (tiêu đề "Lời mời không còn hiệu lực" đã nói đúng việc đó — luật S-MOD-04 "không frame nào có hai thông điệp cùng nói một việc") | SRV-03 AC1/AC2, SRV-07 AC3 (`40041`) |
| `large-text-invite` — preview ở chữ 200%, tên server dài | Tiêu đề ×1.6; tên server tối đa 2 dòng rồi cắt `…`; số liệu xuống dòng tự do; nút giữ ở đáy, cao theo chữ | NFR-A11Y-03, DESIGN.md › Typography |
| `large-text-report` — sheet báo cáo ở chữ 200% | Sheet cao tới dưới status bar, **vẫn có thanh kéo**; tiêu đề và nút "Gửi báo cáo" ghim, phần giữa (khối trích, lý do, mô tả) cuộn; gợi ý cuộn: đường kẻ `border` 1px ngay trên nút ghim, hàng lý do cuối bị cắt ngang; hàng lý do cao theo chữ. (v1.9, CR-18) Báo cáo tin: **6** lý do (thêm "Gian lận học tập" ở hàng 2), ghi chú riêng tư câu mới "NezFocus không cho Khánh biết ai đã báo cáo." | C-09 (200%: cuộn nội dung, hàng nút luôn thấy), C-34 |
| `large-text-confirm` — sheet gõ tên ở chữ 200% | Như trên cho S-MOD-03 `type-name`; mô tả và nhãn ô xuống dòng tự do trong lề 16, không cắt (người dùng cần đọc đủ hệ quả); sheet cao theo nội dung, nút "Hủy" luôn thấy | C-09, SRS 3.4 |

### Chỉ ghi luật (giao diện không đổi)
| Tình huống | Luật |
|---|---|
| Tin bị xóa trong lúc mở sheet báo cáo | Gửi trả `40401` → `FormMessage` (lỗi) "Tin nhắn này không còn tồn tại", nút chính đổi thành "Đóng" (SAFE-01 AC3) |
| Kênh / server bị người khác xóa khi đang mở S-MOD-03 `type-name` | Đóng sheet, `Toast` "Kênh này đã bị xóa" / "Server này đã bị xóa"; màn gọi về màn cha |
| Người nhận quyền Owner rời server (hoặc bị kick / ban) khi đang nhập mật khẩu | Gửi bị từ chối → `FormMessage` "Bình không còn trong server"; đóng sheet → về danh sách chọn người của S-SET-08 |
| Bật quyền trong Cài đặt rồi quay lại app | App kiểm tra lại khi về foreground: banner thiếu quyền biến mất, nút Mic / Camera về `off` (không tự bật) |
| Thu hồi quyền mic trong Cài đặt khi đang ở phòng | Android khởi động lại tiến trình app; (v1.9, CR-22 #3) app tự vào lại đúng phòng nếu mở lại trong 3 phút (03 S-ROOM-EDGE `app-restart-rejoin`: mic và camera tắt, Toast "Đã vào lại …"), kèm `Banner · mic-denied`, nút Mic `no-permission` |
| App bị kill khi khách đang ở S-MOD-01 `guest` | Lời mời đang chờ chỉ được lưu khi bấm "Tạo tài khoản để tham gia" / "Đăng nhập"; chưa bấm thì mở lại app không còn lời mời |
| Mất mạng sau khi preview đã tải | Thẻ giữ nguyên; bấm Tham gia → `FormMessage` trung tính "Cần kết nối mạng để tham gia", không đổi sang `offline` |
| Cuộc gọi đến khi đang mở sheet báo cáo / xác nhận | Màn cuộc gọi đến (09 S-CALL-02) phủ lên; sheet giữ lựa chọn và chữ đã gõ, trở lại nguyên trạng khi cuộc gọi kết thúc |
| Mở link mời thứ hai khi đã có lời mời đang chờ | Lời mời mới thay lời mời cũ (chỉ giữ một lời mời đang chờ) |
| Bấm Tham gia hai lần thật nhanh | Nút vào `loading` ngay ở lần chạm đầu; backend idempotent (SRV-04 AC3) |
| Gõ tên khớp rồi sửa sai | Nút `danger` về `disabled` ngay |
| Số lớn và số 0 trong thẻ lời mời | Ngăn nghìn bằng dấu chấm: "12.480 thành viên · 1.204 đang online"; 0 người online vẫn hiện "· 0 đang online" |
| Tên server / kênh dài 100 ký tự ở S-MOD-03 | Tiêu đề sheet tối đa 2 dòng rồi cắt `…`; placeholder một dòng cắt `…`; vẫn phải gõ đủ tên |
| `Retry-After` dài | Dưới 60 giây: "thử lại sau 30 giây"; từ 60 giây: làm tròn lên phút, "thử lại sau 2 phút" |
| Giới hạn 20 báo cáo / ngày | "Ngày" theo múi giờ của user (`user_settings.timezone`, như streak) — CR-07 mục 11; "00:00 ngày mai" trong câu `rate-limited` cũng theo múi giờ này. Báo cáo lại đối tượng còn đang chờ không tính (CR-18 #9) |
| Bị mời ra / cấm khỏi server khi đang mở S-MOD-02 về tin / hồ sơ của server đó | (v1.9, CR-17 #14) Sheet đóng ngay (cùng mọi sheet / dialog thuộc server đó), chữ đã gõ bỏ, rồi mới hiện Dialog của 02 S-HOME-EDGE `kicked` / `banned`; không Toast lỗi |
| "Quên mật khẩu?" khi đang chuyển quyền Owner mà người nhận rời server trong lúc đổi mật khẩu | Về lại sheet `password-reset-done`; bấm "Chuyển quyền" → `FormMessage` "Bình không còn trong server" như dòng trên |
| Mở S-MOD-01 từ chữ link mời trong tin | Như mở link từ ngoài; ✕ / Back về đúng kênh / DM đang xem. Thẻ lời mời dưới tin (02) tham gia thẳng, không qua S-MOD-01 (CR-19 #12) |
| Báo cáo thứ 20 / mô tả 500 ký tự | Báo cáo thứ 20 gửi bình thường, thứ 21 vào `rate-limited`. Mô tả chạm 500: bộ đếm "500/500", không gõ thêm được (không báo lỗi) |

## Câu hỏi còn mở

Không còn.
