# 07 · Cá nhân & Cài đặt

Tab **Cá nhân**: hồ sơ, trạng thái hiện diện, cài đặt tài khoản, quyền riêng tư, thông báo, giao diện / ngôn ngữ / múi giờ, đăng xuất.

- Hành vi: SRS v1.9 Mục 3.1 (Tab Cá nhân), 3.2 (cây Cá nhân), 3.3, 3.4, REQ-AUTH-05/06/07/08/10/14, REQ-DM-02, REQ-NOTIF-02, REQ-STUDY-01/03/10/11, NFR-I18N-04. Mã lỗi: `40001`, `40002`, `40003`, `40010`, `40013`, `40014`, `40029`, `40102`.
- (v1.9, 30/10/2026) Sửa theo CR-16 (đăng xuất khi là Host, "Quên mật khẩu?" ở Đổi mật khẩu, xóa tài khoản liệt kê server chỉ có mình và thu hồi link mời, tên hiển thị bắt buộc) và CR-24 (một công tắc "Hiện hoạt động học", "Nghe thử", dữ liệu người dùng không dịch). **Không ở MVP (ẩn hẳn, không hiện mục mờ):** đổi email (AUTH-09), 2FA (AUTH-03/11), đăng nhập Google/Apple (AUTH-12), mức thông báo theo server (NOTIF-03), Server ưu tiên & Chế độ Học tập (STUDY-09), ẩn khỏi leaderboard (STUDY-04), ẩn thống kê với người quản lý (STUDY-13), analytics (2.7, NFR-PRIV-03), tải bản sao dữ liệu (NFR-PRIV-04).
- Component: [00-components.md](00-components.md) — `ScreenHeader` (C-22), `SettingsRow` + `Switch` (C-15), `RadioRow` (C-34), `SegmentedControl` (C-20), `TextField` + `PasswordRules` + `FormMessage` (C-02), `Avatar` / `PresenceDot` (C-13), `BottomSheet` / `ActionSheet` / `Dialog` (C-09), `Toast` / `Banner` (C-14), `TabBar` (C-03), `OS/Keyboard`; dùng lại sheet chọn múi giờ của 01 S-ONB-01 và sheet xác nhận mật khẩu 10 › S-MOD-03 `password`. Nhìn thế nào: [DESIGN.md](../../../DESIGN.md) (chế độ **Operate**).
- Hành vi chốt 21/10/2026 khi viết spec này (20 câu, chủ dự án đồng ý cả 20; sau khi xem frame thêm 5 điểm: giới thiệu ≤ 200, nhãn "Cho phép ở từng server" kèm giải thích, bỏ analytics khỏi MVP, hàng "Âm thanh và rung" + frame Cài đặt Android, tắt thông báo theo server giữ ở v1.x; tải bản sao dữ liệu chuyển sang v1.x; danh sách chặn mở tab Đã chặn của màn Bạn bè): màn gốc tab gồm thẻ hồ sơ + trạng thái + 4 nhóm cài đặt + Đăng xuất; mục v1.x ẩn hẳn; hồ sơ MVP chỉ ảnh / tên / giới thiệu; DND chỉ để hiển thị; đổi mật khẩu đăng xuất thiết bị khác; xóa tài khoản kiểm Owner trước; sau khi xóa về Welcome kèm banner ngày xóa; quyền DM theo server; tải dữ liệu một yêu cầu một lúc; giao diện và ngôn ngữ áp dụng cả khi offline; đổi múi giờ có xác nhận. Hành vi mới ghi ở `SRS_v1.2_change_notes.md` mục 14 (ứng viên CR-09).

## Quy ước chung của khu vực

| Hạng mục | Quy ước |
|---|---|
| Khung | 390 × 844; kiểm thêm 360 × 800 cho S-ME-02 `default` và S-ME-03 `sessions` |
| Vị trí | Tab **Cá nhân** (`TabBar`, Cá nhân đang chọn). S-ME-02 là màn gốc của tab (không nút back); các màn khác là màn con có `ScreenHeader` back, vẫn có `TabBar`. **Bàn phím mở thì ẩn `TabBar`** (S-ME-01 `editing`, S-ME-03 `password-keyboard`; như 10 › S-MOD-04 `toast-keyboard`) |
| Lưu thay đổi | Như 08: công tắc / lựa chọn lưu ngay khi chạm; form chữ (hồ sơ, mật khẩu) có nút "Lưu" trên header + dialog "Bỏ thay đổi?" khi back chưa lưu |
| Offline | Giao diện và ngôn ngữ áp dụng ngay cả khi offline (lưu cục bộ, đồng bộ khi có mạng). Mọi thứ khác cần mạng: `Banner · offline` + điều khiển `disabled`. Vị trí banner theo 10 › S-MOD-04: màn gốc tab (S-ME-02) — **ngay dưới tiêu đề tab** "Cá nhân"; màn con — ngay dưới `ScreenHeader` |
| Ngắt dòng | Không tách số khỏi đơn vị, không tách tên máy / tên múi giờ: ngắt chủ động trước cụm đó ("Đăng xuất / Xiaomi Redmi Note 12?", "Đổi múi giờ sang / GMT+9 · Tokyo?", "… chuỗi. / Đổi tối đa 1 lần mỗi 24 giờ.", "Samsung / Galaxy Tab S8"); dòng phụ phiên đăng nhập tách hai dòng "Android 13 · Hôm qua 22:15" / "IP 113.190.x.x" (khung 360: ba dòng) |
| Màu | `danger` cho "Xóa tài khoản", "Đăng xuất", thu hồi phiên; không màu pha |
| Mascot | Không (cài đặt — DESIGN.md › Mascot) |
| Dữ liệu nhất quán | An: tên hiển thị "An", username `an.nguyen`, email `an.nguyen@gmail.com`, Trực tuyến, chuỗi 6 ngày (khớp 04). An là Owner "Ôn thi Giải tích 2" (24 thành viên) → xóa tài khoản **bị chặn** (`delete-blocked-owner`); frame `delete-confirm` giả định An đã chuyển Owner cho Bình. (v1.9) An còn một server **chỉ có mình**: "Góc tự học của An" (1 thành viên, icon chữ "GT"; chỉ dùng ở `delete-confirm`) — không chặn xóa, bị xóa cùng tài khoản. Múi giờ GMT+7 · Hồ Chí Minh, đổi lần cuối hơn 24 giờ trước. Phiên bản app 1.2.0. Bây giờ 20:12 CN 18/10/2026. Frame có An đang ở phòng (`logout-confirm-host`, S-ME-06 `english`): An là Host phiên ở "Phòng học im lặng" (Ôn thi Giải tích 2), Tập trung còn 18:42 (nghỉ ngắn lúc 20:31, cùng mốc 10 S-MOD-05); người kế tiếp nhận Host: Bình |

### Dữ liệu mẫu

| Dùng ở | Giá trị |
|---|---|
| Hồ sơ | Avatar chữ "A" (`Avatar/self`); giới thiệu "Sinh viên năm 3 PTIT · đang ôn Giải tích 2" (42/200) |
| Phiên đăng nhập | **Thiết bị này:** Samsung Galaxy A54 · Android 14 · Đang hoạt động. **Khác:** Xiaomi Redmi Note 12 · Android 13 · Hôm qua 22:15 · IP 113.190.x.x |
| Quyền riêng tư | Tin nhắn từ thành viên server: bật; ngoại lệ "CLB Guitar PTIT" tắt. (v1.9, CR-24) Hiện hoạt động học: **bật** (mặc định). Chặn: Phong (1 người) |
| Thông báo | Quyền thông báo đã cho phép; Ẩn nội dung xem trước: tắt; Luôn phát âm báo chuyển pha: tắt (vị trí bật: `hide-preview-on`, `phase-sound-on`) |
| Giao diện | Theo hệ thống · Tiếng Việt · GMT+7 · Hồ Chí Minh |

---

## S-ME-02 · Cá nhân (màn gốc của tab)

**Mục đích:** xem nhanh mình là ai, đổi trạng thái, đi tới từng nhóm cài đặt, đăng xuất.
**REQ:** 3.1 (Tab Cá nhân), AUTH-05, AUTH-07, STUDY-03.
**Mở từ:** `TabBar` › Cá nhân. **Đi tới:** S-ME-01 `default` (thẻ hồ sơ); sheet trạng thái (`status-sheet`); S-STUDY-03 `default` (chuỗi ngày); S-ME-03 / S-ME-04 / S-ME-05 / S-ME-06; dialog đăng xuất → 01 S-AUTH-01 `default`.

### Bố cục
```
┌ Status bar ──────────────────────────────┐
│ Cá nhân                                  │  tiêu đề tab (title-1), không back
│ ┌──────────────────────────────────────┐ │
│ │ (A 56)●  An                        › │ │  thẻ hồ sơ: avatar + PresenceDot, tên (headline)
│ │          an.nguyen · 🔥 6 ngày         │ │  username + chuỗi (label)
│ └──────────────────────────────────────┘ │
│ ● Trực tuyến                           › │  SettingsRow: trạng thái
│ CÀI ĐẶT                                  │
│ 👤 Tài khoản                           › │
│ 🛡 Quyền riêng tư                      › │
│ 🔔 Thông báo                           › │
│ 🎨 Giao diện & ngôn ngữ                › │  không ghi giá trị (khung 360 xuống dòng)
│ ⎋ Đăng xuất                              │  danger
│ NezFocus 1.2.0                           │  label, text-tertiary, căn giữa
└ TabBar (Cá nhân) ────────────────────────┘
```

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục | — |
| `status-sheet` | Chạm hàng trạng thái → `BottomSheet` "Trạng thái": 4 `RadioRow` có `PresenceDot` + mô tả | "Trực tuyến" · "Vắng mặt" / "Tự bật sau 10 phút không dùng" · "Không làm phiền" / "Chỉ hiển thị cho người khác; thông báo vẫn như cũ" · "Ẩn" / "Mọi người thấy bạn ngoại tuyến" |
| `invisible` | Đã chọn Ẩn: chấm `offline` trên avatar, hàng trạng thái "Ẩn · mọi người thấy bạn ngoại tuyến" | — |
| `logout-confirm` | Chạm "Đăng xuất" → `Dialog` | "Đăng xuất khỏi thiết bị này?" · "Tin nhắn chưa gửi trên máy này sẽ bị xóa." (chỉ khi outbox có tin) · "Hủy" / "Đăng xuất" (`danger`) |
| `logout-confirm-host` 🆕 | (v1.9, CR-16 #11) Đang là Host của phiên đang chạy: nền S-ME-02 có `MiniPlayer · room-session` ("Phòng học im lặng" · Tập trung 18:42) trên `TabBar`; `Dialog` thêm câu về người kế tiếp (cùng luật CR-13 #2 / REQ-STUDY-11). Đăng xuất = rời phòng ngay (Host chuyển như khi Host rời phòng), không có Toast "Đã rời …" | "Đăng xuất khỏi thiết bị này?" · "Bình sẽ điều khiển phiên học." (không ai đủ quyền nhận Host: "Phiên học vẫn chạy nhưng chưa có người điều khiển.") · "Tin nhắn chưa gửi…" (khi có, dòng sau) · "Hủy" / "Đăng xuất" (`danger`) |
| `offline` | `Banner · offline` **ngay dưới tiêu đề tab "Cá nhân"** (luật S-MOD-04 cho màn gốc tab), đẩy thẻ hồ sơ xuống; hàng trạng thái `disabled`; vẫn vào được các màn con | — |

Không áp dụng: `loading` (hồ sơ có trong cache từ `READY`), `empty`, `error`, `forbidden`, `os-permission`.

---

## S-ME-01 · Sửa hồ sơ

**Mục đích:** đổi ảnh đại diện, tên hiển thị, giới thiệu.
**REQ:** AUTH-06.
**Mở từ:** thẻ hồ sơ ở S-ME-02; "Sửa hồ sơ" ở 02 S-HOME-10 `self`. **Đi tới:** S-ME-02 (lưu / back); sheet ảnh (`avatar-sheet`) → photo picker / camera (10 › S-MOD-05 `camera` nếu cần quyền) → màn cắt ảnh.

### Bố cục (`default`)
```
│ ‹  Sửa hồ sơ                       Lưu   │
│              (A 96)                      │  avatar, chạm để đổi
│            Đổi ảnh đại diện              │  Button · text
│ Tên hiển thị                       2/32  │  TextField
│ [ An                                   ] │
│ Hiện trong chat và phòng học.            │  help (v1.9: tên bắt buộc, CR-16)
│ Username                                 │  readonly
│ [ an.nguyen                            ] │
│ Giới thiệu                        42/200 │  TextField · multiline
│ [ Sinh viên năm 3 PTIT · đang ôn …     ] │
```

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục; "Lưu" mờ | — |
| `editing` | Đang sửa giới thiệu, bàn phím mở (ẩn `TabBar`), "Lưu" bật | — |
| `avatar-sheet` | Chạm avatar → `ActionSheet` | "Chọn ảnh trong máy" · "Chụp ảnh mới" · "Xóa ảnh đại diện" (`danger`, chỉ khi có ảnh) |
| `crop` | Màn cắt ảnh (theme tối, nền `bg`, ảnh vừa chọn; mặt nạ tròn: vùng ngoài khung tròn phủ `scrim` ở cả bốn phía, viền khung tròn `text-primary` 2px; không dùng màu hex) | "Hủy" · "Cắt ảnh" · "Dùng ảnh này" · gợi ý "Kéo và chụm hai ngón để căn ảnh" (ảnh mẫu: ảnh chân dung stock) |
| `uploading` | Avatar mờ + vòng tiến độ; "Lưu" `loading` | — |
| `upload-error` | `FormMessage` (lỗi) dưới avatar; "Lưu" vẫn mờ (`disabled`) vì chưa có thay đổi nào lưu được | `40014`: "Chỉ nhận ảnh JPG, PNG, WEBP hoặc HEIC" · `40013`: "Ảnh lớn hơn 8 MB sau khi nén. Chọn ảnh khác." |
| `discard-confirm` | Back khi chưa lưu | "Bỏ thay đổi?" · "Hồ sơ mới chưa được lưu." · "Ở lại" / "Bỏ thay đổi" (`danger`) |
| `name-empty` (không vẽ riêng) | (v1.9, CR-16 #3, AUTH-06 AC6) Xóa hết tên rồi bấm "Lưu": ô Tên hiển thị `error` + dòng lỗi thay dòng gợi ý (`40001`); không lưu gì | "Nhập tên hiển thị" (quá 32 ký tự: không gõ thêm được, bộ đếm "32/32") |
| `offline` | `Banner · offline`; ô `readonly`, "Lưu" và "Đổi ảnh" `disabled` | — |

Lưu thành công → S-ME-02 + `Toast` "Đã cập nhật hồ sơ".

---

## S-ME-03 · Tài khoản

**Mục đích:** email, đổi mật khẩu, phiên đăng nhập, xóa tài khoản.
**REQ:** AUTH-07, AUTH-08 (mã đặt lại), AUTH-10, AUTH-14.
**Mở từ:** "Tài khoản" ở S-ME-02; (v1.9) "Quên mật khẩu?" trong 10 › S-MOD-03 `password` (chuyển quyền Owner, xóa tài khoản) mở thẳng `password-code`. **Đi tới:** `password-form`; `sessions`; xóa tài khoản (`delete-blocked-owner` hoặc 10 › S-MOD-03 `password`) → 01 S-AUTH-01 `pending-deletion-notice`.

### Bố cục (`default`)
```
│ ‹  Tài khoản                             │
│ Email              an.nguyen@gmail.com   │  SettingsRow value, không chevron
│ 🔑 Đổi mật khẩu                        › │
│ 📱 Phiên đăng nhập              2 thiết bị › │
│ VÙNG NGUY HIỂM                           │
│ 🗑 Xóa tài khoản                          │  danger
│ Tài khoản bị xóa sau 14 ngày; đăng nhập  │  label, text-secondary
│ lại trước hạn để khôi phục.              │
```

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục | — |
| `password-form` | Màn con "Đổi mật khẩu": "Mật khẩu hiện tại" + (v1.9) `Button · text` "Quên mật khẩu?" căn phải ngay dưới ô · "Mật khẩu mới" + `PasswordRules` (C-02); "Lưu" trên header | Ghi chú: "Các thiết bị khác sẽ bị đăng xuất." · "Quên mật khẩu?" |
| `password-keyboard` | Đang gõ mật khẩu mới, bàn phím mở (ẩn `TabBar`), điều kiện cập nhật dần | — |
| `password-wrong` | `40102`: ô "Mật khẩu hiện tại" `error` | "Mật khẩu hiện tại không đúng" |
| `password-code` 🆕 | (v1.9, CR-16 #10, AUTH-14) Chạm "Quên mật khẩu?" → **chế độ mã** trên cùng màn "Đổi mật khẩu": mã đặt lại (AUTH-08) tự gửi tới email lúc vào chế độ này. Ô "Mật khẩu hiện tại" thay bằng: câu + email, nhãn "Mã OTP" + `CodeInput` (không tự gửi — còn ô mật khẩu mới), "Gửi lại sau 0:59"; dưới đó "Mật khẩu mới" + `PasswordRules` như `password-form`; `Button · text` "Nhập mật khẩu hiện tại" để về `password-form`; "Lưu" trên header. Không có bàn phím (vừa vào) | "Mình đã gửi mã OTP 6 số tới an.nguyen@gmail.com. Mã có hiệu lực 15 phút." · "Mã OTP" · "Không nhận được mã OTP? Gửi lại sau 0:59" · "Mật khẩu mới" · "Các thiết bị khác sẽ bị đăng xuất." · "Nhập mật khẩu hiện tại" |
| `password-code-wrong` 🆕 | Đã điền `482931` và mật khẩu mới đạt luật, bấm "Lưu": các ô mã viền `danger` + `FormMessage` (lỗi) dưới ô mã (`40003`); mật khẩu mới giữ nguyên | "Mã OTP không đúng. Còn 4 lần thử." |
| `password-saved` | Về S-ME-03 + `Toast` (cả hai chế độ) | "Đã đổi mật khẩu · đã đăng xuất 1 thiết bị khác" |
| `sessions` | Màn con "Phiên đăng nhập": nhóm "THIẾT BỊ NÀY" (1 hàng, không nút) + "THIẾT BỊ KHÁC" (hàng có "Đăng xuất" `danger · S`) + nút "Đăng xuất mọi thiết bị khác" | Hàng: tên máy (headline) · "Android 13 · Hôm qua 22:15" / "IP 113.190.x.x" (hai dòng) |
| `revoke-confirm` | Chạm "Đăng xuất" trên một hàng → `Dialog` | "Đăng xuất / Xiaomi Redmi Note 12?" (ngắt trước tên máy) · "Thiết bị đó cần đăng nhập lại." · "Hủy" / "Đăng xuất" (`danger`) |
| `sessions-single` | Chỉ có thiết bị này: không nhóm "THIẾT BỊ KHÁC", không nút đăng xuất hàng loạt | "Chỉ có thiết bị này đang đăng nhập." |
| `delete-blocked-owner` | Chạm "Xóa tài khoản" khi là Owner server còn thành viên (kiểm trước, không đợi `40010`): `BottomSheet` liệt kê server cần xử lý | "Bạn đang là Owner của 1 server" · "Chuyển quyền Owner hoặc xóa server trước khi xóa tài khoản." · hàng "Ôn thi Giải tích 2 · 24 thành viên ›" (→ 08 S-SET-08) · "Đóng" |
| `delete-confirm` | Không còn server nào chặn → 10 › S-MOD-03 `password`, chữ theo xóa tài khoản. (v1.9, CR-16 #12) Dưới mô tả: khối "server chỉ có bạn" (nhãn + mỗi server một hàng 48: icon server 32 + tên + "1 thành viên") và câu thu hồi link mời; không có server nào chỉ có mình thì khối này ẩn. Dưới ô mật khẩu: "Quên mật khẩu?" (S-MOD-03) | "Xóa tài khoản?" · "Tài khoản sẽ bị xóa vĩnh viễn vào 01/11/2026. Trong 14 ngày, đăng nhập lại để khôi phục. Sau đó hồ sơ, chuỗi ngày học và bạn bè bị xóa; tin nhắn hiện \"Tài khoản đã bị xóa\"." · nhãn "Server chỉ có bạn — sẽ bị xóa cùng tài khoản" · hàng "Góc tự học của An · 1 thành viên" · "Mọi link mời của các server này bị thu hồi ngay, kể cả khi bạn khôi phục tài khoản." · "Mật khẩu của bạn" · "Quên mật khẩu?" · "Xóa tài khoản" (`danger`) |
| `offline` | `Banner · offline`; mọi hàng `disabled` trừ Email | — |

**Chế độ mã của Đổi mật khẩu** (v1.9, CR-16 #10): lỗi mã như 01 S-AUTH-03 — sai 5 lần (`too-many-attempts`) / quá 15 phút (`40002`) → các ô mã `disabled`, `FormMessage` + `Button · secondary` "Gửi mã OTP mới"; gửi lại ≤ 1 lần/phút, ≤ 3 lần/giờ — giới hạn của mã đặt lại, REQ-AUTH-08 AC5 (`40029`: "Gửi lại" `disabled` + `FormMessage` trung tính như 01 S-AUTH-05 `rate-limited`: "Bạn đã yêu cầu mã OTP nhiều lần. Thử lại sau 42 phút."; sửa 11/11/2026 khi code P1-A4.5 (#74) — bản trước chép giới hạn 10 lần/ngày của mã đăng nhập). Mật khẩu mới giữ nguyên qua mọi lỗi mã. Xong: phiên hiện tại giữ, phiên khác bị đăng xuất (AUTH-14 AC5) → `password-saved`. **Mở từ S-MOD-03** (chuyển quyền Owner, xóa tài khoản): vào thẳng `password-code`; back hoặc xong → quay lại màn đã mở sheet, sheet mở lại ở 10 › S-MOD-03 `password-reset-done` (xong) hoặc `password` (back).

**Luật chung của hai chế độ:** mật khẩu mới không được **là** email, phần trước @ hay username (CR-16 #6) → lỗi dưới ô "Mật khẩu mới": "Không dùng email làm mật khẩu" / "Không dùng username làm mật khẩu" (`40001`, không thêm vào lưới). Sai mật khẩu hiện tại 5 lần trong 10 phút (`40029`): "Lưu" `disabled` + `FormMessage` trung tính "Bạn đã nhập sai nhiều lần. Thử lại sau 10 phút, hoặc dùng Quên mật khẩu?"; "Quên mật khẩu?" vẫn bấm được.

Xóa thành công → mọi phiên bị thu hồi, mọi link mời của server chỉ có mình bị thu hồi (AUTH-10 AC7) → 01 S-AUTH-01 `pending-deletion-notice`: `Banner` "Tài khoản sẽ bị xóa vào 01/11/2026 · đăng nhập trước ngày đó để khôi phục". Sai mật khẩu ở sheet xóa: 10 › S-MOD-03 `password-wrong`; lần thứ 5 trong 10 phút: `password-rate-limited` (CR-16 #12).

---

## S-ME-04 · Quyền riêng tư

**Mục đích:** ai được nhắn tin cho mình, ai thấy mình đang học, danh sách chặn.
**REQ:** DM-02, AUTH-05 (hoạt động học, CR-24), STUDY-10, FRIEND-03. (Analytics chuyển sang v1.x — CR-09 mục 7; tải bản sao dữ liệu chuyển sang v1.x — CR-09 mục 8.)
**Mở từ:** "Quyền riêng tư" ở S-ME-02. **Đi tới:** 09 S-DM-04 `blocked` ("Danh sách chặn"): mở màn Bạn bè với tab "Đã chặn" chọn sẵn; Back quay về S-ME-04 (không về màn Bạn bè). Không có màn danh sách chặn riêng.

### Bố cục (`default`)
```
│ ‹  Quyền riêng tư                        │
│ TIN NHẮN                                 │
│ Tin nhắn từ thành viên server   [ ●]     │  Switch (global)
│ Người chưa là bạn nhưng chung server     │
│ CHO PHÉP Ở TỪNG SERVER                   │
│ Tắt ở một server để người trong server đó│  label, text-secondary
│ không nhắn tin riêng được cho bạn.       │
│ Ôn thi Giải tích 2              [ ●]     │  Switch theo server (ghi đè)
│ Nhóm đồ án Mobile               [ ●]     │
│ CLB Guitar PTIT                 [● ]     │
│ HOẠT ĐỘNG                                │
│ Hiện hoạt động học              [ ●]     │  Switch, mặc định bật (v1.9, CR-24)
│ Bạn bè và người cùng server thấy bạn     │  mô tả theo trạng thái công tắc
│ đang ở phòng nào hoặc đang học một mình. │
│ Người trong phòng vẫn thấy bạn trong     │
│ danh sách của phòng.                     │
│ CHẶN                                     │
│ 🚫 Danh sách chặn                1 người › │  → 09 S-DM-04 `blocked`
```

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục | — |
| `dm-off` | Tắt công tắc chung: nhóm "CHO PHÉP Ở TỪNG SERVER" ẩn | Dòng: "Chỉ bạn bè nhắn tin được cho bạn." |
| `activity-off` 🆕 | (v1.9, CR-24 #1 — thay `solo-visible-on`) Tắt "Hiện hoạt động học" (lưu ngay): công tắc tắt, mô tả đổi. Một công tắc cho mọi hoạt động, kể cả học một mình; không ẩn tên trong danh sách người của phòng | "Không ai thấy bạn đang học hay đang ở phòng nào. Người trong phòng vẫn thấy bạn trong danh sách của phòng." |
| `save-error` | Như 08: trả giá trị cũ + `Toast` | "Chưa lưu được thay đổi · Thử lại" |
| `offline` | `Banner · offline`; mọi điều khiển `disabled` | — |

Trong frame không còn hàng v1.x nào (kể cả hàng ẩn): analytics và tải bản sao dữ liệu không có node trên canvas. Bỏ ở v1.9 (CR-24): công tắc "Cho bạn bè thấy \"Đang học một mình\"" và state `solo-visible-on`. Ai thấy gì và dòng hoạt động hiện ở đâu: SRS REQ-AUTH-05 (spec 02 S-HOME-10, 09 FriendRow / header DM).

---

## S-ME-05 · Thông báo

**Mục đích:** trạng thái quyền thông báo và vài lựa chọn của app; phần còn lại là cài đặt của Android.
**REQ:** NOTIF-02, 3.3 / 3.4 (âm báo chuyển pha, "Nghe thử"), STUDY-01, NFR-MOB-10.
**Mở từ:** "Thông báo" ở S-ME-02. **Đi tới:** `android-settings` — trang Cài đặt thông báo của Android cho NezFocus (hàng "Âm thanh và rung"; nút "Mở cài đặt" khi bị tắt).

### Bố cục (`default`)
```
│ ‹  Thông báo                             │
│ ✓ Thông báo đang bật                     │  dòng trạng thái quyền
│ Ẩn nội dung xem trước           [● ]     │  Switch
│ Thông báo chỉ hiện "Bạn có tin nhắn mới" │
│ Luôn phát âm báo chuyển pha     [● ]     │  Switch
│ Kể cả khi máy đang im lặng               │
│ hoặc Không làm phiền                     │
│ [▶ Nghe thử]                             │  Button · text · S, icon play (v1.9, CR-24)
│ Âm thanh và rung                       › │  mở Cài đặt Android của app
│ Chỉnh riêng cho Tin nhắn, Cuộc gọi, Nhắc học tập trong Cài đặt của máy │
```

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục | — |
| `push-denied` | `Banner · push-denied` dưới header (03 S-ROOM-09 `denied`); hai công tắc vẫn chỉnh được | "Thông báo đang tắt" + "Mở cài đặt" |
| `hide-preview-on` | Bật "Ẩn nội dung xem trước" (vị trí bật; lưu ngay) | — |
| `phase-sound-on` | Bật "Luôn phát âm báo chuyển pha" (vị trí bật; lưu ngay) | — |
| `test-sound-silent` 🆕 | (v1.9, CR-24 #2) Máy đang im lặng / Không làm phiền **và** công tắc "Luôn phát âm báo chuyển pha" tắt, chạm "Nghe thử": không phát; `Toast` icon `volume-x` trên `TabBar`, không có hành động (công tắc ở ngay trên) | "Máy đang im lặng nên âm báo sẽ không kêu" |
| `android-settings` | **Frame hệ thống** (không phải UI của app, như các frame `OS/`): trang thông báo của NezFocus trong Cài đặt Android — công tắc "Tất cả thông báo của NezFocus" + 3 nhóm "Tin nhắn" · "Cuộc gọi" · "Nhắc học tập" (NOTIF-02), mỗi nhóm một công tắc. Frame không có chữ ghi chú thiết kế; ghi chú ở đây: trang hệ thống của Android — app chỉ mở tới đây, không vẽ lại trong app | Back của Android → S-ME-05 |
| `offline` | `Banner · offline`; công tắc `disabled`; "Nghe thử" **vẫn bấm được** (không cần mạng) | — |

**"Nghe thử"** (v1.9, CR-24 #2): phát một lần âm báo + nhịp rung **đúng như lần chuyển pha thật** khi app ở foreground với cài đặt hiện tại (âm lượng thông báo của máy, rung theo cài đặt rung của máy; công tắc bật thì kêu cả khi máy im lặng). Không có trạng thái "đang phát" riêng (âm ngắn). Trường hợp không kêu duy nhất có phản hồi: `test-sound-silent`.

---

## S-ME-06 · Giao diện & ngôn ngữ

**Mục đích:** theme, ngôn ngữ, múi giờ.
**REQ:** 3.3, STUDY-03 (đổi múi giờ ≤ 1 lần / 24 giờ, `40029`), NFR-I18N.
**Mở từ:** "Giao diện & ngôn ngữ" ở S-ME-02. **Đi tới:** sheet chọn múi giờ (dùng lại 01 S-ONB-01 `timezone-picker`).

### Bố cục (`default`)
```
│ ‹  Giao diện & ngôn ngữ                  │
│ GIAO DIỆN                                │
│ (•) Theo hệ thống  ( ) Tối  ( ) Sáng     │  RadioRow × 3
│ NGÔN NGỮ                                 │
│ [ Tiếng Việt | English ]                 │  SegmentedControl (như S-ONB-01)
│ MÚI GIỜ                                  │
│ Múi giờ           GMT+7 · Hồ Chí Minh  › │
│ Dùng để tính ngày học và chuỗi.          │  label; ngắt chủ động sau dấu chấm
│ Đổi tối đa 1 lần mỗi 24 giờ.             │
```

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục | — |
| `light` | Chọn "Sáng": cả màn đổi theme ngay (frame theme sáng) | — |
| `english` | Chọn English: cả app đổi sang tiếng Anh ngay, kể cả `TabBar`. (v1.9, CR-24 #4, NFR-I18N-04) Frame có `MiniPlayer · room-session` trên `TabBar` để minh họa **dữ liệu không dịch**: tên phòng giữ tiếng Việt, nhãn pha dịch; giá trị múi giờ là chữ app nên dịch | "Appearance & language" · "THEME" · "System / Dark / Light" · "LANGUAGE" · "TIME ZONE" · "Time zone" · "GMT+7 · Ho Chi Minh City" · "Used to count your study days and streak. / You can change it once every 24 hours." · TabBar "Home · Study · Tasks · Inbox · Me" · MiniPlayer "Phòng học im lặng" · "Focus 18:42" |
| `timezone-picker` | Sheet chọn múi giờ (như S-ONB-01) | "Chọn múi giờ" |
| `timezone-confirm` | Chọn múi giờ khác → `Dialog` | "Đổi múi giờ sang / GMT+9 · Tokyo?" (ngắt trước tên múi giờ) · "Ngày học và chuỗi tính theo múi giờ mới từ bây giờ. Bạn chỉ đổi được 1 lần mỗi 24 giờ." · "Hủy" / "Đổi múi giờ" |
| `timezone-rate-limited` | Vừa đổi sang GMT+9 · Tokyo lúc 20:12 (giờ máy, GMT+7): hàng Múi giờ `disabled` + dòng lý do (`40029`). Mốc ghi theo **múi giờ mới** của tài khoản, kèm mã múi giờ để không nhầm với đồng hồ máy | "Đổi lại được sau 22:12 ngày 19/10 (GMT+9)" |
| `offline` | `Banner · offline`; theme và ngôn ngữ vẫn đổi được (lưu cục bộ); hàng Múi giờ `disabled` | — |

Kiểm frame `english` (v1.9, CR-24 #4): không còn chữ tiếng Việt **trừ dữ liệu người dùng** (tên phòng, server, kênh, người — ở đây "Phòng học im lặng" của `MiniPlayer`).

---

## Ma trận trạng thái

| Màn | default | loading | empty | error | offline | forbidden | os-permission |
|---|---|---|---|---|---|---|---|
| S-ME-02 | ✔ | — cache | — | — | ✔ | — | — |
| S-ME-01 | ✔ | — | — | ✔ `upload-error` | ✔ | — | ✔ camera → 10 S-MOD-05 |
| S-ME-03 | ✔ | — (`sessions` tải nhanh, skeleton nếu > 1 giây) | ✔ `sessions-single` | ✔ `password-wrong`, `password-code-wrong` | ✔ | — | — |
| S-ME-04 | ✔ | — | — | ✔ `save-error` | ✔ | — | — |
| S-ME-05 | ✔ | — | — | — | ✔ | — | ✔ `push-denied` |
| S-ME-06 | ✔ | — | — | ✔ `timezone-rate-limited` | ✔ | — | — |

## Edge case (rà ngày 21/10/2026)

Frame nằm trong nhóm "07 · Cá nhân & Cài đặt — Edge case", tên `S-ME-EDGE · <trường hợp>` (6 frame). Chủ dự án chọn làm cả 15 trường hợp.

### Có frame
| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `session-revoked-here` — phiên trên máy này bị thu hồi từ máy khác | Về 01 S-AUTH-04 (chế độ đã nhớ), email điền sẵn, `Banner` icon `log-out`: "Bạn đã bị đăng xuất khỏi thiết bị này · hãy đăng nhập lại" — một dòng của bảng lý do ở 01 › Edge case › Phiên đăng nhập kết thúc (v1.9, CR-16 #9) | AUTH-04, AUTH-07 AC1 (close code `4004`) |
| `long-name-card` — tên hiển thị 32 ký tự ở màn gốc | Thẻ hồ sơ cắt tên 1 dòng `…`; dòng username + chuỗi giữ nguyên | C-04 › Chữ dài |
| `long-profile-edit` — tên 32 và giới thiệu 200 ký tự trong form | Ô tên hiện đủ (32/32); ô giới thiệu cao theo chữ, hiện đủ 200/200 | AUTH-06, CR-09 mục 6 |
| `many-sessions` — 5 thiết bị đăng nhập | Danh sách cuộn; "Đăng xuất mọi thiết bị khác" ở cuối danh sách | AUTH-07 |
| `many-owned` — Owner của 3 server còn thành viên | Sheet chặn xóa tài khoản liệt kê đủ 3 server, mỗi hàng dẫn tới S-SET-08 của server đó: "Ôn thi Giải tích 2 · 24 thành viên", "Nhóm đồ án Mobile · 6 thành viên", "Nhóm ôn TOEIC · 12 thành viên" (icon "NÔ"; server giả định chỉ dùng ở frame này — không dùng CLB Guitar PTIT vì 10 › S-MOD-02 cho An báo cáo server đó) | AUTH-10 AC2 (`40010` kèm danh sách) |
| `large-text-root` — màn gốc ở chữ 200% | Tiêu đề ×1.6, chữ thường ×2; thẻ hồ sơ và hàng xuống dòng, không cắt; nhãn hàng `fixed-width` trong lề, chevron luôn ở mép phải ("Giao diện & / ngôn ngữ"); "🔥 6 ngày" không tách ("an.nguyen · / 🔥 6 ngày"); màn cuộn (hàng Đăng xuất khuất dưới `TabBar`) | NFR-A11Y-03 |

### Chỉ ghi luật (giao diện không đổi)
| Tình huống | Luật |
|---|---|
| Đổi mật khẩu ở máy khác (cả chế độ mã) | Máy này bị đăng xuất như 01 S-AUTH-EDGE `session-revoked` |
| Đăng xuất khi là Host mà người kế tiếp vừa rời phòng lúc dialog đang mở | Bấm "Đăng xuất" vẫn đăng xuất; Host chuyển theo người kế tiếp lúc đó (REQ-STUDY-11), không hỏi lại |
| Đang mở sheet chặn xóa tài khoản thì việc chuyển Owner xong ở máy khác | Sheet cập nhật danh sách; hết server chặn thì nút "Đóng" đổi thành "Tiếp tục xóa" → S-MOD-03 `password` |
| Đang tải ảnh đại diện thì mất mạng | Ảnh cũ giữ nguyên, `Toast` "Chưa tải được ảnh · Thử lại"; chữ đã sửa trong form vẫn còn, "Lưu" bật lại |
| Từ chối quyền camera khi "Chụp ảnh mới" | Theo 10 › S-MOD-05 `camera` / `camera-blocked`; "Chọn ảnh trong máy" vẫn dùng được (photo picker không cần quyền) |
| Bật thông báo trong Cài đặt Android rồi quay lại | App kiểm tra lại khi về foreground: `push-denied` biến mất, dòng "Thông báo đang bật" hiện lại |
| Sửa hồ sơ trên hai máy cùng lúc | Ai lưu sau thắng; máy kia thấy giá trị mới khi mở lại màn |
| Đổi múi giờ trên hai máy trong 24 giờ | Máy sau nhận `40029` → đóng dialog, chuyển `timezone-rate-limited` |
| Chuỗi rất lớn | Thẻ hồ sơ "🔥 365 ngày" (như 04 S-STUDY-EDGE `streak-huge`); số không rút gọn |
| Đổi múi giờ làm "hôm nay" nhảy ngày | Phút đã học giữ cho ngày cũ; chuỗi tính lại theo múi giờ mới từ thời điểm đổi (STUDY-03) |
| Đăng nhập sau khi đã quá 14 ngày chờ xóa | Tài khoản đã bị xóa hẳn: bằng mật khẩu → S-AUTH-04 `wrong-password` (`40102`), không lộ là tài khoản từng tồn tại; bằng mã OTP → tạo tài khoản mới (01 › Edge case) |
| Hủy xóa tài khoản (khôi phục) | Server chỉ có mình được khôi phục nhưng link mời cũ **không** dùng lại được (AUTH-10 AC7); muốn mời thì tạo link mới (02 S-HOME-07) |

## Câu hỏi còn mở

Không còn.
