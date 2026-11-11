# 01 · Đăng nhập & Hoàn tất tài khoản

Từ lúc mở app lần đầu tới lúc vào Main: kiểm tra phiên bản, chào, nhập email để nhận mã OTP (đăng ký hoặc đăng nhập), đăng nhập bằng mật khẩu, quên mật khẩu, hoàn tất tài khoản, phiên đăng nhập kết thúc.

- Hành vi: SRS v1.9 Mục 3.1 (Back hệ thống, CR-15), 3.2 (Auth stack, Hoàn tất tài khoản), 3.4 (Toast chung theo mã lỗi), 3.6 UF-01/UF-03, REQ-AUTH-01/02/04/06/07/08/10/12/13, REQ-SRV-07, REQ-STUDY-03, NFR-I18N-01/02, NFR-MOB-10/12/14, NFR-USAB-03. Mã lỗi: `40001`, `40002`, `40003`, `40029`, `40100`, `40102`, `40103`, `40105`, `40308`, `40309`, `40901`, `42601`.
- Component: [00-components.md](00-components.md). Nhìn thế nào: [DESIGN.md](../../../DESIGN.md) (chế độ **Persuade** cho Welcome, **Operate** cho các form kể cả Hoàn tất tài khoản).
- Hành vi chốt 17/10/2026 khi viết spec lần đầu: mã mời dán bằng nút "Dán"; ngôn ngữ trước đăng nhập theo máy (vi/en, còn lại vi); username kiểm tra ngay khi gõ; luật mật khẩu.
- **(v1.9, CR-16) Viết lại ngày 30/10/2026** theo SRS v1.9 (đối chiếu bản web, `NezFocus-Web/docs/design/screens/01-auth.md`): đăng ký bằng email trước, không còn đăng ký chờ; email chỉ chứa mã OTP, không link; **S-ONB-01 giữ ID, đổi thành "Hoàn tất tài khoản"** (chỗ duy nhất mọi tài khoản mới đi qua); **bỏ S-ONB-02 "Bắt đầu"**; đăng nhập hai cách (mã OTP mặc định lần đầu, nhớ cách lần trước); đặt lại mật khẩu một màn; phiên kết thúc báo đúng lý do. Quyết định trình bày khi viết lại (theo bản web, chưa có trong SRS vì là hình thức): bỏ frame "Đã tạo tài khoản" (`verified`) — đúng mã thì sang thẳng màn đích; S-AUTH-03 luôn có "Đăng nhập bằng mật khẩu"; gửi lại đúng email vừa nhận mã khi chưa hết 1 phút thì vào thẳng S-AUTH-03, không gọi API; vào tài khoản đã có từ "Tạo tài khoản" thì có Toast; Hoàn tất tài khoản có "Đăng xuất" (SRS cho `/auth/logout` khi `40309`) và nút chính ghim đáy.

## Quy ước chung của khu vực

| Hạng mục | Quy ước |
|---|---|
| Khung | 390 × 844; kiểm thêm 360 × 800 cho S-ONB-01 (form dài nhất, frame `S-ONB-01 · default · 360`) |
| Giờ mẫu | (rà soát 22/10/2026) Area này dùng **21:47, Chủ Nhật 18/10/2026** trên status bar (ngoại lệ ghi ở README › Bộ dữ liệu mẫu, cùng 03 và 04). Mọi ngày giờ trong frame tính theo mốc này |
| Vị trí | Auth stack và Hoàn tất tài khoản **không có `TabBar`**, không `MiniPlayer` |
| Header | Màn form (S-AUTH-02, 03, 04, 05) dùng `ScreenHeader` (C-22). S-AUTH-00, S-AUTH-01 và S-ONB-01 **không có header**: tiêu đề `title-1` nằm trong thân (màn chặn / màn gốc, không có đường lui) |
| Bố cục dọc | (chốt 17/10/2026) Chia theo **có bàn phím hay không**. **Màn có ô gõ chữ** (S-AUTH-02, 03, 04, 05, S-ONB-01) neo nội dung ở trên — bàn phím che nửa dưới, và nội dung không xô lệch khi thêm lỗi/banner. **Màn không có ô gõ chữ** (S-AUTH-00) căn khối nội dung giữa khoảng trống phía trên cụm nút, có **icon neo** 56 màu `primary` (`circle-arrow-up`) — icon mang nghĩa, không phải mascot; chữ căn giữa. Nút chính luôn ở đáy (vùng ngón cái). (v1.9) S-ONB-01 dài hơn một màn: phần form cuộn, nút chính **ghim đáy** (kẻ trên `border`, nền `bg`), bàn phím mở thì nút ghim nằm ngay trên bàn phím (C-02) |
| Toast | Màn Auth/Hoàn tất không có `TabBar`, đáy là nút chính: `Toast` nằm ngay **trên cụm nút** (chỗ trống giữa nội dung và nút), không che tiêu đề hay nút. Màn đang mở bàn phím (S-AUTH-03): `Toast` nằm ngay **trên bàn phím**, trong khoảng trống dưới nội dung, không che ô mã. Hình toast theo C-14 (đảo màu, CR-24) |
| Form | Theo C-02 › Lỗi trong form: lỗi của ô nằm dưới ô; lỗi chung nằm trong khối lỗi (`FormMessage`) ngay trên nút chính; nút chính luôn bấm được, kiểm tra khi bấm (ngoại lệ: bị giới hạn tần suất thì nút `disabled` tới hết thời gian chờ); `Button · primary · L` rộng hết khung |
| Bàn phím | Theo C-02 (email / username / mật khẩu, phím "Tiếp"/"Xong", form cuộn khi bàn phím mở). Mỗi form có ít nhất một frame có `OS/Keyboard` |
| Nhãn mã | (v1.9, CR-16) "mã OTP" ở mọi chỗ của UI (đăng ký, đăng nhập, đặt lại mật khẩu); nút "Đăng nhập bằng mật khẩu" / "Đăng nhập bằng OTP" ("bằng", không "với") |
| Không lộ email | (v1.9, CR-16) Trước khi người dùng nhập đúng mã, câu chữ, màn hình và giới hạn tần suất **giống hệt nhau** dù email đã có tài khoản hay chưa (AUTH-01 AC2b, AC7) |
| Lời mời đang chờ | Khi có lời mời đang chờ (mở link mời lúc chưa đăng nhập, SRV-07), `Banner` icon `mail` hiện trên S-AUTH-01/02/04: "Lời mời vào {Ôn thi Giải tích 2} đang chờ bạn · đăng nhập để tham gia"; trên S-ONB-01: "Lời mời vào {Ôn thi Giải tích 2} đang chờ bạn · hoàn tất tài khoản để tham gia". Tên server trong banner tối đa 40 ký tự rồi "…" (cắt ở ranh giới từ). Frame vẽ ở S-AUTH-01 `pending-invite`; các màn khác cùng banner, không vẽ riêng. Lời mời giữ qua bước nhập mã và Hoàn tất (kể cả app bị kill), tới khi join hoặc quá 24 giờ |
| Mascot | S-AUTH-01: Runtime happy giữa vòng nhịp, `wave`. **Không** trên S-AUTH-00, form (kể cả S-ONB-01), khối lỗi, `suspended`, `pending-deletion`. (v1.9: bỏ happy 160 của `verified` và wink 120 của S-ONB-02 cùng hai màn đó) |
| Giọng văn | Xưng "bạn", hệ thống xưng "mình"; lỗi nói chuyện gì xảy ra và cách sửa (NFR-USAB-03); không lộ mã lỗi thô |
| Dữ liệu nhất quán | Mã OTP 6 số, hiệu lực 15 phút, sai 5 lần thì hủy (số lần còn lại = 5 − số lần sai). Gửi lại mã ≤ 1 lần/phút (đếm ngược ≤ 0:59), ≤ 10 lần/ngày. Bộ đếm gửi mã và sai mã chạy **cho mọi email**, có tài khoản hay không. Không còn đăng ký chờ. Quên mật khẩu ≤ 3 lần/giờ. Sai mật khẩu 5 lần trong 10 phút (tài khoản + IP) → chờ 10 phút (MVP không CAPTCHA — 02/11/2026, W4). Ngày hết khóa ở tương lai. Chờ xóa: còn = 14 − số ngày từ lúc yêu cầu (mẫu: An yêu cầu xóa ở S-ME-03 hôm nay 18/10 → còn 14 ngày, xóa 01/11/2026; khớp S-AUTH-01 `pending-deletion-notice` và S-ME-03). Lời mời đang chờ ≤ 24 giờ |
| Dữ liệu mẫu | Placeholder ô trống: Email "ví dụ: an.nguyen@gmail.com", Tên hiển thị "ví dụ: An". User mới **An**: email `an.nguyen@gmail.com` (gõ nhầm, sửa ở `back-to-edit`: `an.nguyen@gmial.com`); tên hiển thị "An"; username điền sẵn `an.nguyen` (dùng được), thử `an` (đã có người dùng ở `username-taken`). Mã đúng `482913`; mã gõ sai `482931`. Mật khẩu đang gõ `Ontap2` (đạt chữ hoa, chữ thường, chữ số); sai luật `ontap2026`. Lời mời đang chờ: **Bình** mời vào **"Ôn thi Giải tích 2"** · 24 thành viên · 6 đang online. Múi giờ máy `Asia/Ho_Chi_Minh` (GMT+7). Ngôn ngữ máy: Tiếng Việt. Phiên bản app 1.1.0, tối thiểu 1.2.0 |

## Điều hướng sau khi vào được tài khoản

(v1.9, CR-16) Áp cho đăng nhập bằng mật khẩu, nhập đúng mã OTP (đăng ký hoặc đăng nhập bằng OTP), đặt lại mật khẩu, và Hoàn tất tài khoản xong (từ dòng "lời mời" trở xuống). Kiểm tra theo thứ tự, gặp dòng nào đúng thì dừng.

| Tài khoản | Đi tới |
|---|---|
| Đang chờ xóa | `Dialog` S-AUTH-04 `pending-deletion` (cả khi vào bằng mã OTP — dialog hiện trên S-AUTH-03) |
| Chưa hoàn tất (vừa tạo, hoặc bỏ dở lần trước; API trả `40309` ở bất cứ đâu) | S-ONB-01 |
| Có lời mời đang chờ | 10 S-MOD-01 `valid`; đã là thành viên → `already-member` (mở thẳng kênh đích + Toast) |
| Phiên vừa kết thúc, đăng nhập lại **cùng** tài khoản | Màn đang xem trước khi phiên kết thúc (AUTH-04) |
| Còn lại | Main: tab Home, kênh mở gần nhất; chưa có server → 02 S-HOME-02 `no-server` (đã có "Tạo Study Server" / "Nhập mã mời"; thay S-ONB-02) |

Vào tài khoản **đã có** từ "Tạo tài khoản" (S-AUTH-02 → S-AUTH-03): đi tiếp như bảng, kèm `Toast` icon `log-in` "Bạn đã có tài khoản với email này — đã đăng nhập" trên màn đích.

---

## S-AUTH-00 · Cần cập nhật app

**Mục đích:** chặn phiên bản quá cũ và đưa user tới store.
**REQ:** NFR-MOB-12 (`42601`).
**Mở từ:** mở app khi backend trả `42601`, ở bất kỳ đâu (trước cả Welcome). **Đi tới:** App Store / Google Play.

### Bố cục
```
│               [circle-arrow-up 56]       │  icon neo, primary; khối chữ căn giữa
│ Cần cập nhật NezFocus                    │  title-1
│ Phiên bản bạn đang dùng (1.1.0) đã cũ.   │  body, text-secondary
│ Cập nhật lên 1.2.0 để tiếp tục học cùng  │
│ mọi người.                               │
│                                          │
│ [            Cập nhật            ]       │  Button · primary · L
```
Không mascot, không back, không đóng được (bắt buộc). Không áp dụng mọi state chuẩn trừ `default`; offline thì màn hình này không xuất hiện (cần backend trả mã).

(08/11/2026, CR-28 #19) Số "1.2.0" lấy từ field `min_version` của `42601`, số "1.1.0" là phiên bản app đang chạy. Backend không gửi `min_version` thì câu thành "Phiên bản bạn đang dùng (1.1.0) đã cũ. Cập nhật để tiếp tục học cùng mọi người." (giao diện không đổi). "Cập nhật" mở trang của app trên Google Play.

### Checklist duyệt
- [ ] 1 state; cả hai theme.

---

## S-AUTH-01 · Welcome

**Mục đích:** trong 5 giây cho người mới thấy "ở đây mình không học một mình", rồi dẫn vào đăng ký.
**REQ:** SRS 3.2; DESIGN.md › Điều cần nhớ.
**Mở từ:** mở app khi chưa đăng nhập; đăng xuất (07 S-ME-02); "Đăng xuất" ở S-ONB-01; xóa tài khoản xong (07 S-ME-03). **Đi tới:** S-AUTH-02 ("Tạo tài khoản"), S-AUTH-04 ("Đăng nhập").

### Bố cục
```
┌ Status bar ──────────────────────────────┐
│ (Banner lời mời đang chờ, khi có)        │
│               (B)  (C)                   │
│          (A)  ╭──────╮  (D)              │  FocusTimer · ring (280, như Study Room), pha Tập trung,
│               │Runtime│                  │  không số; Runtime happy vẫy tay giữa vòng;
│          (M)  ╰──────╯  (H)              │  6 avatar ngồi quanh (chữ cái đầu, dữ liệu mẫu)
│                                          │
│  Không học một mình                      │  display
│  Học cùng bạn bè theo một nhịp chung:    │  body, text-secondary
│  cả phòng cùng Tập trung, cùng Nghỉ.     │
│                                          │
│  [        Tạo tài khoản        ]         │  Button · primary · L
│  [          Đăng nhập          ]         │  Button · secondary · L
└──────────────────────────────────────────┘
```
Vòng ở đây là hình minh họa: không đếm giờ, không bấm được, đọc thành một phần tử "Minh họa: sáu người học cùng nhau".

### Component
`FocusTimer · ring` (bản minh họa), `ParticipantTile · ring`, ảnh Runtime, `Button`, `Banner`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Không học một mình" |
| Mô tả | "Học cùng bạn bè theo một nhịp chung: cả phòng cùng Tập trung, cùng Nghỉ." |
| Nút | "Tạo tài khoản" · "Đăng nhập" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục | |
| `pending-invite` | `Banner` lời mời đang chờ trên cùng | "Lời mời vào Ôn thi Giải tích 2 đang chờ bạn · đăng nhập để tham gia" |
| `pending-deletion-notice` | (21/10/2026, area 07) Vừa xóa tài khoản ở 07 S-ME-03: `Banner` icon `calendar-x` trên cùng | "Tài khoản sẽ bị xóa vào 01/11/2026 · đăng nhập trước ngày đó để khôi phục" |
| `large-text` | 200%: **giữ vòng nguyên cỡ** (họa tiết chữ ký, như luật 200% của 03); chữ phóng và xuống dòng, phần thân cuộn được; hai nút **ghim ở đáy** (kẻ trên `border`), nhãn nút tối đa ×1.3 (16 × 1,3 ≈ 21). Gợi ý còn nội dung: dải mờ dần (màu `bg`) ở đáy phần thân ngay trên kẻ, và thanh cuộn mảnh bên phải | |

Không áp dụng: `loading` (màn hình tĩnh), `empty`, `error`, `forbidden`, `os-permission`; `offline` không đổi gì ở màn hình này (form phía sau tự xử lý).

### Tương tác
- Chạm "Tạo tài khoản" → S-AUTH-02; "Đăng nhập" → S-AUTH-04 (mở sẵn cách đăng nhập lần trước trên máy này).
- Back hệ thống ở Welcome → đưa app ra nền (gốc của Auth stack, cùng luật gốc Home của CR-15; không có predictive back sang màn nào).

### Checklist duyệt
- [ ] 4 state, mỗi state một frame; `default` ở cả hai theme.
- [ ] Không có nút Google/Apple (v1.x, DEC-08).
- [ ] Vòng minh họa không có số đồng hồ.

---

## S-AUTH-02 · Tạo tài khoản (nhập email)

**Mục đích:** (v1.9, CR-16) bước đầu của đăng ký: **chỉ nhập email** để nhận mã OTP. Chưa tạo tài khoản; câu chữ và màn tiếp theo giống hệt nhau dù email đã có tài khoản hay chưa.
**REQ:** AUTH-01, AUTH-13, UF-01, UF-03.
**Mở từ:** S-AUTH-01; "Tạo tài khoản" ở S-AUTH-04; "Tạo tài khoản để tham gia" ở 10 S-MOD-01 `guest`; nút back hoặc "Đổi email" ở S-AUTH-03 khi vào từ màn này (`back-to-edit`). **Đi tới:** S-AUTH-03 `default` (gửi thành công — mọi email); S-AUTH-04 ("Đăng nhập").

### Bố cục
```
│ ‹  Tạo tài khoản                         │  ScreenHeader
│ (Banner lời mời đang chờ, khi có)        │
│ Chỉ cần email để bắt đầu. Mình sẽ gửi    │  body, text-secondary
│ mã OTP 6 số để xác nhận.                 │
│ Email                                    │
│ [ví dụ: an.nguyen@gmail.com            ] │  TextField · email
│ (khối lỗi / thông báo)                   │  FormMessage
│ [            Tiếp tục            ]       │  Button · primary · L
│ Đã có tài khoản? Đăng nhập               │  Button · text
```
Không có username, mật khẩu, tuổi, điều khoản (đều ở S-ONB-01). Không nút Google/Apple (v1.x).

### Component
`ScreenHeader`, `TextField · email`, `FormMessage`, `Button`, `Banner`, `OS/Keyboard`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề / mô tả | "Tạo tài khoản" · "Chỉ cần email để bắt đầu. Mình sẽ gửi mã OTP 6 số để xác nhận." |
| Nhãn / placeholder | "Email" · "ví dụ: an.nguyen@gmail.com" |
| Nút | "Tiếp tục" · "Đã có tài khoản? **Đăng nhập**" |
| Lỗi ô | Trống: "Nhập email của bạn" · sai dạng: "Email chưa đúng định dạng" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Ô trống, chưa focus (không bàn phím) | |
| `field-error` | Bấm "Tiếp tục" với `an.nguyen@gmail`: ô `error` + dòng lỗi dưới ô (`40001`); bàn phím đóng | "Email chưa đúng định dạng" |
| `back-to-edit` | Quay lại từ S-AUTH-03 ("Đổi email" / back): ô Email giữ chữ đã gõ `an.nguyen@gmial.com`, đang focus, bàn phím email mở; nút "Tiếp tục" ngay trên bàn phím. Đây cũng là frame bàn phím của màn | |
| `submitting` | Nút `loading`; ô chỉ đọc theo C-02 `readonly` (không viền, nền `surface-2`, chữ `text-secondary`) | |
| `rate-limited` | Email này đã nhận 10 mã OTP hôm nay (`40029`): `FormMessage` trung tính icon `clock-3`; nút "Tiếp tục" `disabled`, sửa email thì bật lại | "Mình đã gửi 10 mã OTP tới email này hôm nay. Thử lại vào ngày mai." |
| `offline` | `Banner · offline` dưới header; nút `disabled` kèm dòng lý do | "Cần kết nối mạng để tạo tài khoản" |

Bỏ ở v1.9 (CR-16): `keyboard-open` (gộp vào `back-to-edit`), `username-taken`, `large-text` (chuyển sang S-ONB-01 — form dài nhất), `default · 360` (chuyển sang S-ONB-01).

Không áp dụng: `loading`, `empty`, `forbidden`, `os-permission`.

### Tương tác
- Gửi đúng email vừa nhận mã khi chưa hết 1 phút (vừa quay lại bằng "Đổi email" rồi bấm "Tiếp tục" lại) → vào thẳng S-AUTH-03, không gửi email mới, đồng hồ "Gửi lại sau" đếm tiếp. Email khác → gửi mã mới, mã cũ hết hiệu lực (AUTH-13 AC5).
- Phím Return "Xong" của bàn phím email = bấm "Tiếp tục".

### Checklist duyệt
- [ ] 6 state, mỗi state một frame; `default` ở cả hai theme.
- [ ] Chỉ một ô nhập; câu không nói gì về việc email đã có tài khoản hay chưa.

---

## S-AUTH-03 · Nhập mã OTP

**Mục đích:** (v1.9, CR-16) nhập mã 6 số trong email để vào tài khoản: email chưa có tài khoản thì **tài khoản được tạo lúc này** (email đã xác nhận); đã có thì đăng nhập. Một màn cho cả đăng ký và đăng nhập bằng OTP.
**REQ:** AUTH-01, AUTH-02, AUTH-13, UF-01.
**Mở từ:** "Tiếp tục" ở S-AUTH-02; "Gửi mã OTP" ở S-AUTH-04 (chế độ OTP). **Đi tới:** bảng "Điều hướng sau khi vào được tài khoản" (email mới → S-ONB-01); back / "Đổi email" → màn đã mở nó (S-AUTH-02 `back-to-edit` hoặc S-AUTH-04 chế độ OTP), ô Email giữ chữ; "Đăng nhập bằng mật khẩu" → S-AUTH-04 `password`, điền sẵn email.

### Bố cục
```
│ ‹  Nhập mã OTP                           │  ScreenHeader; back = về màn nhập email
│ Mình đã gửi mã OTP 6 số tới              │  body, text-secondary; cùng câu cho mọi email
│ an.nguyen@gmail.com                      │  body 600; email dài ngắt sau @ hoặc .
│ Đổi email                                │  Button · text, ngay dưới email
│ [ 4 ][ 8 ][ 2 ][ _ ][   ][   ]           │  CodeInput (C-24), tự focus, tự gửi khi đủ 6 số
│ (khối lỗi / thông báo)                   │  FormMessage
│ Mã OTP có hiệu lực 15 phút. Không thấy   │  label, text-tertiary
│ email? Xem thư mục Spam/Quảng cáo.       │
│ Không nhận được mã OTP?  Gửi lại mã      │  Button · text (đếm ngược "Gửi lại sau 0:41")
│ Đăng nhập bằng mật khẩu                  │  Button · text
├ OS/Keyboard/number (bàn phím số, gợi ý mã của hệ điều hành) ┤
```
Màn có ô nhập: neo ở trên. Không có nút "Tiếp tục" (mã tự gửi khi đủ 6 số). Không còn câu "Hoặc bấm link trong email" và dòng "Email này đã có tài khoản? Đăng nhập" (v1.9: email không có link; nhập đúng mã là vào được tài khoản đã có). "Đăng nhập bằng mật khẩu" luôn có: người đã có tài khoản mà không nhận được mã (hết lượt gửi, email lỗi) vẫn có lối vào.

### Component
`ScreenHeader`, `CodeInput` (C-24), `FormMessage`, `Button`, `Toast`, `Banner`, `OS/Keyboard`.

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Đã gõ 3 số `482`, ô thứ 4 đang focus; bàn phím số mở; "Gửi lại sau 0:41" | |
| `verifying` | Đủ 6 số `482913`: các ô chỉ đọc, dòng "Đang kiểm tra…" kèm icon `loader-circle` | "Đang kiểm tra…" |
| `code-wrong` | Gõ `482931`: các ô viền `danger` + khối lỗi (`40003`); gõ lại số đầu thì xóa trắng các ô | "Mã OTP không đúng. Còn 4 lần thử." |
| `too-many-attempts` | Sai lần thứ 5: các ô `disabled`, khối lỗi; "Gửi lại mã" thay bằng nút `secondary` "Gửi mã OTP mới" | "Bạn đã nhập sai 5 lần. Gửi mã OTP mới để thử lại." · "Gửi mã OTP mới" |
| `code-expired` | Quá 15 phút (`40002`): như trên (nút `secondary` "Gửi mã OTP mới") | "Mã OTP đã hết hạn. Gửi mã OTP mới để tiếp tục." · "Gửi mã OTP mới" |
| `resent` | `Toast` icon `mail` trong khoảng trống ngay trên bàn phím, dưới cụm gửi lại (chốt 22/10/2026: đặt trên cụm gửi lại sẽ che ô mã và dòng hướng dẫn); "Gửi lại mã" `disabled` đếm ngược; các ô trống | "Đã gửi mã OTP mới tới an.nguyen@gmail.com" · "Gửi lại sau 0:59" |
| `rate-limited` | Đủ 10 lần gửi trong ngày (`40029`): "Gửi lại mã" `disabled` + khối thông báo trung tính; mã đang có vẫn nhập được | "Bạn đã gửi lại 10 lần hôm nay. Thử lại vào ngày mai, hoặc đăng nhập bằng mật khẩu." |
| `offline` | `Banner · offline`; các ô và "Gửi lại mã" `disabled` | "Cần kết nối mạng để nhập mã OTP" |

Bỏ ở v1.9 (CR-16): `verified` ("Đã tạo tài khoản" + Runtime happy 160) — đúng mã thì sang thẳng màn đích (email mới → S-ONB-01, câu chào nằm ở đó).

Không áp dụng: `loading`, `empty`, `forbidden`, `os-permission`.

### Tương tác
- Bàn phím Android gợi ý mã từ thông báo email (autofill, nếu máy hỗ trợ) → chạm là điền đủ 6 số (Edge `code-autofill`).
- Dán chuỗi 6 số → điền hết các ô và tự gửi.
- Back / "Đổi email" → màn đã mở nó, ô Email giữ chữ đang gõ.
- Không kiểm tra lại khi app về foreground (không có link để xác nhận ở nơi khác). App không lưu bước này cục bộ: app bị đóng thì mở lại về S-AUTH-01 (AUTH-13).
- Tài khoản đang chờ xóa → `Dialog` S-AUTH-04 `pending-deletion` hiện **trên màn này**; "Để sau" → S-AUTH-04 chế độ OTP, ô Email giữ chữ.

### Checklist duyệt
- [ ] 8 state; `default` ở cả hai theme.
- [ ] Số lần thử còn lại khớp luật (5 − số lần sai).
- [ ] Câu ở mọi state giống nhau dù email có tài khoản hay chưa; không còn chữ "link".

---

## S-AUTH-04 · Đăng nhập

**Mục đích:** vào lại tài khoản bằng **mã OTP** hoặc **mật khẩu**; xử lý sai mật khẩu, giới hạn, khóa và chờ xóa.
**REQ:** AUTH-02, AUTH-04, AUTH-10 AC4, SAFE-02 AC1 (v1.x).
**Mở từ:** S-AUTH-01; "Đăng nhập" ở S-AUTH-02 hoặc 10 S-MOD-01 `guest`; "Đăng nhập bằng mật khẩu" ở S-AUTH-03 (mở chế độ mật khẩu); phiên kết thúc (Edge `session-revoked`, `session-reuse`). **Đi tới:** chế độ OTP → S-AUTH-03 ("Gửi mã OTP"); chế độ mật khẩu → bảng "Điều hướng sau khi vào được tài khoản"; S-AUTH-05 ("Quên mật khẩu?"); S-AUTH-02 ("Tạo tài khoản").

(v1.9, CR-16) **Hai chế độ trên cùng màn:** OTP (mặc định khi máy chưa đăng nhập lần nào) và mật khẩu. App nhớ chế độ của lần đăng nhập thành công trước **trên máy này** và mở sẵn chế độ đó (AUTH-02 AC6). Đổi chế độ thì email đã gõ được giữ; focus vào ô đầu còn trống của chế độ mới.

### Bố cục
```
Chế độ OTP (`default`)                     Chế độ mật khẩu (`password`)
│ ‹  Đăng nhập                         │   │ ‹  Đăng nhập                         │  ScreenHeader
│ Nhập email, mình sẽ gửi mã OTP để    │   │ Email                                │
│ bạn đăng nhập.                       │   │ [an.nguyen@gmail.com               ] │  TextField · email
│ Email                                │   │ Mật khẩu                             │
│ [ví dụ: an.nguyen@gmail.com        ] │   │ [••••••••••                    [👁]] │  TextField · password
│ (khối lỗi chung)                     │   │                     Quên mật khẩu?   │  Button · text, căn phải
│ [          Gửi mã OTP          ]     │   │ (khối giới hạn khi cần)              │
│ ─────────────── hoặc ─────────────── │   │ (khối lỗi chung)                     │
│ [   Đăng nhập bằng mật khẩu    ]     │   │ [           Đăng nhập          ]     │  Button · primary · L
│ Chưa có tài khoản? Tạo tài khoản     │   │ ─────────────── hoặc ─────────────── │  kẻ border + "hoặc" label text-tertiary
                                           │ [      Đăng nhập bằng OTP      ]     │  Button · secondary · L
                                           │ Chưa có tài khoản? Tạo tài khoản     │  Button · text
```
Chế độ OTP khác S-AUTH-02 ở tiêu đề, mô tả và nút ("Gửi mã OTP"), dù cùng một ô email và cùng đi tới S-AUTH-03.

### Component
`ScreenHeader`, `TextField` (email, password), `FormMessage`, `Button`, `Banner`, `Dialog`, `OS/Keyboard`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Chế độ OTP | "Đăng nhập" · "Nhập email, mình sẽ gửi mã OTP để bạn đăng nhập." · "Gửi mã OTP" · "Đăng nhập bằng mật khẩu" |
| Chế độ mật khẩu | "Đăng nhập" · "Email" · "Mật khẩu" · "Quên mật khẩu?" · "Đăng nhập" · "Đăng nhập bằng OTP" |
| Chung | "hoặc" · "Chưa có tài khoản? **Tạo tài khoản**" |

### Trạng thái — chế độ OTP
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Chế độ OTP, ô Email trống (máy chưa đăng nhập lần nào) | |

Lỗi ô email, `submitting`, giới hạn gửi mã (`40029`), `offline`: như S-AUTH-02 (không vẽ riêng); câu giới hạn thêm vế "…, hoặc đăng nhập bằng mật khẩu." và chỉ nút "Gửi mã OTP" `disabled` (nút đổi chế độ vẫn bấm được).

### Trạng thái — chế độ mật khẩu
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `password` | Lần trước đăng nhập bằng mật khẩu trên máy này → mở sẵn chế độ mật khẩu; ô trống | |
| `keyboard-open` | Đang nhập mật khẩu; nút "Đăng nhập" nằm ngay dưới form, không bị đẩy xuống sát bàn phím | |
| `wrong-password` | Khối lỗi chung (`40102`), ô mật khẩu được xóa trống; cùng câu cho sai mật khẩu, email không tồn tại và tài khoản chưa đặt mật khẩu (chưa Hoàn tất) | "Email hoặc mật khẩu không đúng. Thử lại, hoặc đăng nhập bằng OTP." |
| `captcha` · **v1.x** | (02/11/2026: MVP không CAPTCHA — REQ-AUTH-02; frame giữ, tên thêm " · v1.x") Khối xác minh trên nút (`40105`) | "Bạn đã nhập sai nhiều lần. Hoàn tất xác minh để thử tiếp." |
| `rate-limited` | Nút "Đăng nhập" `disabled` + dòng lý do (`40029`, theo `Retry-After`); "Đăng nhập bằng OTP" vẫn bấm được. MVP (02/11/2026): cũng là trạng thái sau lần sai thứ 5 trong 10 phút (chờ 10 phút; sửa email thì bật lại) | "Bạn đã thử quá nhiều lần. Thử lại sau 10 phút, hoặc đăng nhập bằng OTP." (số phút làm tròn lên từ `Retry-After`; sửa 08/11/2026: trước ghi 15 phút, lệch luật chờ 10 phút) |
| `suspended` 🆕 (v1.10, CR-27 — MVP) | `Dialog`, không mascot (`40308`); một nút rộng hết dialog. Thân: câu thời hạn; "Lý do: {lý do}" (`body` 600); lời nhắn của admin nếu có, đoạn riêng `text-secondary` (≤ 200 ký tự, không cắt). Không bao giờ nêu người báo cáo, bằng chứng hay tên admin (REQ-SAFE-02 AC5). Frame: góc nhìn **Khánh**, thế giới W1 (19/10/2026 22:00, sau khi admin khóa 7 ngày lúc 21:46 ở việc #57) | "Tài khoản đang bị khóa" · "Tài khoản của bạn bị khóa đến 26/10/2026." (vĩnh viễn: "Tài khoản của bạn bị khóa vĩnh viễn.") · "Lý do: Gian lận học tập" · "Bán đề thi trong nhóm học là vi phạm quy tắc. Lần sau tài khoản sẽ bị khóa lâu hơn." · "Đã hiểu" |
| `pending-deletion` | Vào đúng tài khoản đang chờ xóa (AUTH-10 AC4; cả khi vào bằng OTP — dialog trên S-AUTH-03): `Dialog`, không mascot; **hai nút xếp dọc, rộng hết dialog** (C-09) | "Tài khoản đang chờ xóa" · "Tài khoản sẽ bị xóa vĩnh viễn vào 01/11/2026 (còn 14 ngày). Khôi phục để dùng tiếp; server, tin nhắn và chuỗi ngày học vẫn còn nguyên." · "Khôi phục tài khoản" (`primary`) / "Để sau" (`secondary`) |
| `submitting` | Nút `loading`; nút đổi chế độ `disabled` | |
| `offline` | `Banner · offline`; nút `disabled` | "Cần kết nối mạng để đăng nhập" |

**Khôi phục tài khoản** (AUTH-10): xóa tài khoản ở Cá nhân › Tài khoản (S-ME-03) không xóa ngay mà chờ 14 ngày. Đăng nhập trong 14 ngày đó thì hiện dialog: "Khôi phục tài khoản" hủy yêu cầu xóa, mọi thứ trở lại như cũ (link mời đã bị thu hồi lúc xóa **không** quay lại, AUTH-10 AC7) rồi đi tiếp theo bảng điều hướng. **"Để sau" không xóa gì**: phiên vừa mở bị hủy, về lại S-AUTH-04 đúng chế độ lúc vào (mật khẩu → `password`; mã OTP → chế độ OTP), ô Email giữ chữ; tài khoản vẫn chờ xóa và khôi phục được bằng cách đăng nhập lại trước hạn.

Không áp dụng: `loading`, `empty`, `forbidden`, `os-permission`.

### Checklist duyệt
- [ ] 10 state (1 chế độ OTP + 9 chế độ mật khẩu, trong đó `captcha` là v1.x); `default` ở cả hai theme.
- [ ] Hai nút phụ đối xứng "Đăng nhập bằng OTP" / "Đăng nhập bằng mật khẩu"; nhãn "mã OTP".
- [ ] Khối lỗi không chỉ ra sai email hay sai mật khẩu.

---

## S-AUTH-05 · Quên / đặt lại mật khẩu (P2)

**Mục đích:** đặt mật khẩu mới bằng mã OTP qua email, không lộ email nào đã có tài khoản; xong thì đăng nhập luôn trên máy này.
**REQ:** AUTH-08.
**Mở từ:** "Quên mật khẩu?" ở S-AUTH-04 chế độ mật khẩu (`request`, điền sẵn email nếu ô đã có chữ). **Đi tới:** bảng "Điều hướng sau khi vào được tài khoản" kèm `Toast`; back ở `request` → S-AUTH-04 `password` (email giữ).

(v1.9, CR-16) **Hai bước:** nhập email (`request`) → **một màn** mã OTP + mật khẩu mới (`reset-form`) — thay ba bước cũ (email → mã → mật khẩu). Mã đặt lại không dùng thay mã đăng nhập (AUTH-02 AC7). Email chỉ chứa mã; không có link, không có trang web đặt lại.

### Bố cục (`reset-form`)
```
│ ‹  Đặt mật khẩu mới                      │  ScreenHeader; back = về `request`, ô email giữ chữ
│ Nếu an.nguyen@gmail.com có tài khoản     │  body, text-secondary; cùng câu cho mọi email
│ NezFocus, mã OTP 6 số sẽ tới trong vài   │
│ phút. Mã có hiệu lực 15 phút.            │
│ Đổi email                                │  Button · text
│ Mã OTP                                   │  label
│ [   ][   ][   ][   ][   ][   ]           │  CodeInput; đủ 6 số thì focus sang ô mật khẩu (không tự gửi)
│ Mật khẩu mới                             │
│ [••••••••••                        [👁]] │  TextField · password (không ô nhập lại)
│ ○ Ít nhất 8 ký tự   ○ Chữ hoa (A–Z)      │  PasswordRules
│ ○ Chữ thường (a–z)  ○ Chữ số (0–9)       │
│ ○ Ký tự đặc biệt (!@#…)                  │
│ Các thiết bị khác sẽ bị đăng xuất, còn   │  label, text-tertiary
│ bạn đăng nhập luôn trên máy này.         │
│ (khối lỗi chung)                         │
│ [          Đặt mật khẩu          ]       │  Button · primary · L
│ Không nhận được mã OTP?  Gửi lại sau 0:54│  Button · text
```

### Component
`ScreenHeader`, `TextField` (email, password), `CodeInput` (biến thể không tự gửi — 00 C-24), `PasswordRules`, `FormMessage`, `Button`, `Toast`, `OS/Keyboard`.

### Trạng thái
| State | Hiển thị | Chữ |
|---|---|---|
| `request` | `ScreenHeader` "Quên mật khẩu" + mô tả + ô email + nút | "Nhập email bạn dùng để đăng ký. Mình sẽ gửi mã OTP 6 số để đặt mật khẩu mới." · "Gửi mã OTP" |
| `rate-limited` | Quá 3 lần/giờ (`40029`, kể cả email không có tài khoản): khối thông báo trung tính, nút `disabled` (sửa email thì bật lại) | "Bạn đã yêu cầu mã OTP nhiều lần. Thử lại sau 42 phút." |
| `reset-form` | Như bố cục, vừa mở: ô mã trống, chưa focus (không bàn phím), "Gửi lại sau 0:54" | |
| `reset-keyboard` | Đã điền `482913`; đang gõ mật khẩu mới `Ontap2`, bàn phím chữ mở: lưới điều kiện đánh dấu chữ hoa, chữ thường, chữ số; form cuộn để ô mật khẩu và nút "Đặt mật khẩu" nằm trên bàn phím | |
| `code-wrong` | Đã điền `482931` và mật khẩu đạt luật, bấm nút: ô mã viền `danger` + khối lỗi (`40003`); mật khẩu giữ nguyên; bàn phím đóng | "Mã OTP không đúng. Còn 4 lần thử." |

`too-many-attempts`, `code-expired` (`40002`): như S-AUTH-03 (nút `secondary` "Gửi mã OTP mới"), mật khẩu mới giữ nguyên — không vẽ riêng. Gửi lại (`resent`): đếm ngược lại từ đầu, ô mã trống, mật khẩu giữ; `Toast` icon `mail` dùng câu rào "Nếu an.nguyen@gmail.com có tài khoản NezFocus, mã OTP mới sẽ tới trong vài phút." (không "Đã gửi mã OTP mới tới…"). Lỗi luật mật khẩu: như S-ONB-01 `field-error` (dưới ô mật khẩu, kể cả "Không dùng email làm mật khẩu" / "Không dùng username làm mật khẩu"). `submitting`: nút `loading`, ô chỉ đọc. `offline`: như S-AUTH-02, dòng lý do "Cần kết nối mạng để đặt mật khẩu mới" (thêm 11/11/2026 khi code P1-A4.3 (#72)).

**Thành công** (AUTH-08 AC4): đăng nhập luôn trên máy này, mọi phiên khác bị thu hồi → bảng điều hướng (tài khoản chưa hoàn tất vẫn về S-ONB-01) + `Toast` "Đã đặt mật khẩu mới · các thiết bị khác đã được đăng xuất" trên màn đích.

Bỏ ở v1.9 (CR-16): `code` (gộp vào `reset-form`), `link-expired` (không còn link).

### Checklist duyệt
- [ ] 5 state; câu ở `reset-form` giống nhau dù email có tài khoản hay không.
- [ ] Ô mã và ô mật khẩu cùng một màn; mã đủ 6 số không tự gửi.

---

## S-AUTH-06 · 2FA, đăng nhập Google/Apple (P3)

Đặc tả khi làm v1.x (AUTH-03/11/12). Đã biết: 2FA nhập mã TOTP hoặc mã khôi phục sau bước mật khẩu (`40104` kèm `mfa_ticket` 5 phút); Google và Apple ra cùng lúc (DEC-08); email OAuth trùng tài khoản có sẵn → liên kết (`40906`); (v1.9) tài khoản mới tạo bằng Google / Apple đi qua **chính S-ONB-01**, không có màn chọn username riêng (AUTH-12).

---

## S-ONB-01 · Hoàn tất tài khoản

(v1.9, CR-16 — giữ ID S-ONB-01, thay màn "Chọn múi giờ & ngôn ngữ"; S-ONB-02 bỏ.)

**Mục đích:** chỗ duy nhất mọi tài khoản mới đi qua trước khi vào app: tên hiển thị, username, mật khẩu, múi giờ, ngôn ngữ, xác nhận ≥ 18 tuổi và đồng ý điều khoản.
**REQ:** AUTH-01, AUTH-06 (tên hiển thị bắt buộc), AUTH-12, STUDY-03, DEC-18, NFR-I18N-01/02, NFR-PRIV-01, UF-01.
**Mở từ:** nhập đúng mã OTP với email mới (S-AUTH-03); mọi lần vào tài khoản chưa hoàn tất (bảng điều hướng, kể cả `40309` ở bất cứ đâu); Google / Apple (v1.x). **Đi tới:** bảng "Điều hướng sau khi vào được tài khoản" từ dòng lời mời trở xuống: có lời mời đang chờ → 10 S-MOD-01 `valid`; không → 02 S-HOME-02 `no-server`. "Đăng xuất" → S-AUTH-01.

### Bố cục
Phần form cuộn; nút chính ghim đáy (kẻ trên `border`, nền `bg`). Gợi ý còn nội dung: dải mờ dần (màu `bg`) ngay trên kẻ + thanh cuộn mảnh bên phải (như S-AUTH-01 `large-text`).
```
┌ Status bar ──────────────────────────────┐
│ (Banner lời mời đang chờ, khi có)        │
│ Chào mừng tới NezFocus                   │  title-1, trong thân (không header)
│ an.nguyen@gmail.com đã được xác nhận.    │  body, text-secondary
│ Còn một bước nữa thôi.                   │
│ Tên hiển thị                             │
│ [ví dụ: An                             ] │  TextField, bắt buộc, đứng đầu
│ Hiện trong chat và phòng học.            │  help, label text-tertiary
│ Username                                 │
│ [an.nguyen                          ✓  ] │  TextField; điền sẵn từ email, kiểm tra khi ngừng gõ 0,5 giây
│ ✓ Username dùng được                     │
│ Mật khẩu                                 │
│ [••••••••••                        [👁]] │  TextField · password
│ ○ Ít nhất 8 ký tự   ○ Chữ hoa (A–Z)      │  PasswordRules (C-02), tự đánh dấu khi gõ
│ ○ Chữ thường (a–z)  ○ Chữ số (0–9)       │
│ ○ Ký tự đặc biệt (!@#…)                  │
│ Múi giờ        GMT+7 · Hồ Chí Minh    ›  │  SettingsRow · value → sheet chọn múi giờ
│ Ngôn ngữ   [ Tiếng Việt | English ]      │  SegmentedControl
│ Múi giờ dùng để tính ngày học và chuỗi   │  label, text-tertiary
│ ngày liên tiếp. Đổi lại được trong       │
│ Cá nhân › Cài đặt.                       │
│ [☐] Tôi từ 18 tuổi trở lên               │  Checkbox
│ [☐] Tôi đồng ý với Điều khoản sử dụng    │  Checkbox; một câu chạy liền, hai cụm link là phần tử bấm riêng
│     và Chính sách quyền riêng tư         │  ngắt dòng trước "và" (cả ở 360)
│ Đăng xuất                                │  Button · text, cuối phần cuộn
├──────────────────────────────────────────┤  kẻ border
│ (khối lỗi chung)                         │  FormMessage, trong vùng ghim
│ [          Vào NezFocus          ]       │  Button · primary · L, ghim đáy
└──────────────────────────────────────────┘
```

### Component
`TextField` (text, username, password), `PasswordRules`, `SettingsRow · value`, `SegmentedControl`, `Checkbox`, `BottomSheet` + `SearchField` (múi giờ), `FormMessage`, `Button`, `Banner`, `OS/Keyboard`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề / mô tả | "Chào mừng tới NezFocus" · "{email} đã được xác nhận. Còn một bước nữa thôi." |
| Tên hiển thị | Nhãn "Tên hiển thị" · placeholder "ví dụ: An" · gợi ý "Hiện trong chat và phòng học." · lỗi: trống "Nhập tên hiển thị", quá 32 ký tự "Tên hiển thị tối đa 32 ký tự" |
| Username | Gợi ý (khi ô trống hoặc đang gõ) "2–32 ký tự: chữ thường, số, dấu _ và ." · đang kiểm tra: vòng xoay 14 + "Đang kiểm tra…" · dùng được: icon `circle-check` `success` cuối ô + "Username dùng được" (`text-secondary`) · đã có người dùng (khi gõ): "Username này đã có người dùng. Hãy chọn username khác." (không gợi ý username khác) · bị lấy lúc gửi (`40901`): "Username này vừa có người dùng. Hãy chọn username khác." · sai ký tự (khi bấm nút): "Username chỉ gồm chữ thường, số, dấu _ và ." |
| Mật khẩu | Lưới `PasswordRules` (hiện từ đầu) · lỗi: "Mật khẩu chưa đủ điều kiện" (+ điều kiện thiếu đổi sang lỗi) · (CR-16 #6, chỉ cấm *là*, không cấm *chứa*; báo dưới ô, không thêm vào lưới) "Không dùng email làm mật khẩu" · "Không dùng username làm mật khẩu" |
| Múi giờ / ngôn ngữ | "Múi giờ" · "GMT+7 · Hồ Chí Minh" · "Ngôn ngữ" · "Tiếng Việt" / "English" · "Múi giờ dùng để tính ngày học và chuỗi ngày liên tiếp. Đổi lại được trong Cá nhân › Cài đặt." |
| Checkbox | "Tôi từ 18 tuổi trở lên" · "Tôi đồng ý với **Điều khoản sử dụng** và **Chính sách quyền riêng tư**" · chưa tick khi bấm: "Bạn cần xác nhận để tiếp tục" |
| Nút | "Vào NezFocus" · "Đăng xuất" |
| Tiếng Anh (`english`) | "Welcome to NezFocus" · "an.nguyen@gmail.com is confirmed. One more step." · "Display name" · "e.g. An" · "Shown in chat and study rooms." · "Username" · "2–32 characters: lowercase letters, numbers, _ and ." · "Username is available" · "Password" · rules "At least 8 characters" / "Uppercase (A–Z)" / "Lowercase (a–z)" / "Number (0–9)" / "Special character (!@#…)" · "Time zone" · "Language" · "Your time zone decides your study days and streak. You can change this later in Me › Settings." · "I am 18 or older" · "I agree to the **Terms of Service** and **Privacy Policy**" · "Log out" · "Enter NezFocus" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Đầu form (cuộn ở trên cùng), không bàn phím: tên hiển thị trống; username điền sẵn `an.nguyen`, đã kiểm tra: dùng được; mật khẩu trống, điều kiện đều ○; múi giờ và ngôn ngữ theo máy; nút ghim ở đáy | |
| `scrolled` | Cuộn tới cuối: hàng Múi giờ, Ngôn ngữ, dòng gợi ý, hai checkbox chưa tick, "Đăng xuất"; vùng ghim như `default` | |
| `keyboard-open` | Đang gõ mật khẩu `Ontap2` (tên "An" đã nhập): lưới đánh dấu chữ hoa, chữ thường, chữ số; còn thiếu độ dài và ký tự đặc biệt; bàn phím chữ; form cuộn để ô Mật khẩu nằm trên bàn phím, nút ghim ngay trên bàn phím | |
| `username-taken` | Đổi username thành `an`, ngừng gõ: ô `error` + dòng lỗi (AUTH-01 AC2) | "Username này đã có người dùng. Hãy chọn username khác." |
| `username-taken-on-submit` | Đã điền đủ (tên "An", mật khẩu đạt luật, đã tick hai ô), bấm "Vào NezFocus": `40901` field `username` → ô Username `error`, mất dấu ✓; form cuộn về ô Username; **mọi ô khác giữ nguyên, kể cả mật khẩu** | "Username này vừa có người dùng. Hãy chọn username khác." |
| `field-error` | Bấm "Vào NezFocus" khi tên trống, mật khẩu `ontap2026`, chưa tick: lỗi dưới ô Tên hiển thị và ô Mật khẩu (lưới đánh dấu lỗi "Chữ hoa" và "Ký tự đặc biệt"); form cuộn về lỗi đầu tiên (Tên hiển thị). Hai checkbox cũng ở `error` (thấy khi cuộn xuống, như `scrolled` thêm dòng lỗi) (`40001`) | "Nhập tên hiển thị" · "Mật khẩu chưa đủ điều kiện" · "Bạn cần xác nhận để tiếp tục" |
| `timezone-picker` | `BottomSheet` "Chọn múi giờ": `SearchField`; hàng đầu "Theo máy: GMT+7 · Hồ Chí Minh" (dấu ✓ khi đang theo máy — khi đó hàng Hồ Chí Minh trong danh sách **không** có ✓); còn lại xếp theo GMT tăng dần, cùng GMT theo tên thành phố; tìm không dấu | "Chọn múi giờ" · "Tìm thành phố hoặc GMT" |
| `timezone-search-empty` | Đang gõ "Atlantis", không tìm thấy; bàn phím chữ mở (phím Return "Tìm"), sheet thu lại phía trên bàn phím. Đây cũng là frame bàn phím của ô tìm | "Không tìm thấy múi giờ phù hợp" |
| `english` | Chọn English: cả màn đổi sang tiếng Anh ngay (đầu form, như `default`) | Chữ tiếng Anh ở bảng trên |
| `offline` | `Banner · offline` trên cùng (dưới status bar); nút ghim `disabled` kèm dòng lý do | "Cần kết nối mạng để hoàn tất tài khoản" |
| `large-text` | 200%: tiêu đề ×1.6 xuống dòng; mọi chữ xuống dòng, không cắt; ô nhập 1 dòng cắt `…`; lưới `PasswordRules` thành 1 cột; `SegmentedControl` ngôn ngữ xuống hàng riêng dưới nhãn; câu điều khoản xuống dòng tự do; nhãn nút ghim tối đa ×1.3 | |

`submitting`: nút `loading`, các ô `readonly` (C-02), "Đăng xuất" `disabled` — không vẽ riêng. Lời mời đang chờ: banner theo Quy ước — không vẽ riêng.

Không áp dụng: `loading` (dữ liệu có từ lúc vào tài khoản), `empty`, `forbidden`, `os-permission`; lỗi lưu khác dùng khối lỗi chung.

### Tương tác
- Username điền sẵn = phần trước @ của email, chuẩn hóa theo DEC-03 (chữ thường, bỏ ký tự ngoài `a-z 0-9 _ .`, cắt 32 ký tự), rồi kiểm tra ngay; ngắn hơn 2 ký tự thì để trống. Gõ username: chữ hoa tự đổi thành chữ thường; ký tự không hợp lệ vẫn gõ được, báo lỗi khi bấm nút. Ngừng gõ 0,5 giây → `GET /auth/username-available`; kết quả chỉ là gợi ý (bị lấy lúc gửi → `username-taken-on-submit`).
- Chạm hàng Múi giờ → `timezone-picker`. Múi giờ chọn ở đây **không tính** vào giới hạn đổi 1 lần / 24 giờ (CR-16 #8, STUDY-03).
- Chạm English / Tiếng Việt → cả màn đổi ngôn ngữ ngay; lựa chọn lưu vào tài khoản khi bấm "Vào NezFocus".
- Chạm "Điều khoản sử dụng" / "Chính sách quyền riêng tư" → trang trong trình duyệt trong app; không làm tick ô. (08/11/2026, P0-4.2) Tới khi có trang thật, app tạm mở URL tạm bằng trình duyệt ngoài (trình duyệt trong app cần build lại dev client).
- "Đăng xuất" → không hỏi lại (chưa có dữ liệu gì để mất) → S-AUTH-01; tài khoản vẫn "chưa hoàn tất", lần đăng nhập sau quay lại đây; lời mời đang chờ vẫn giữ.
- Back hệ thống → đưa app ra nền (gốc, không có màn trước — tài khoản đã tạo; CR-15).
- App bị đóng giữa chừng: lần mở sau vào thẳng đây (phiên còn), chữ đã gõ không giữ (trừ lời mời đang chờ).

### Checklist duyệt
- [ ] 11 state, mỗi state một frame; `default` ở cả hai theme; `default · 360` (360 × 800): lưới điều kiện 2 cột, ô "Ký tự đặc biệt" ở hàng 3 chiếm cả hàng; câu điều khoản 2 dòng.
- [ ] Tên hiển thị đứng đầu, có gợi ý; username điền sẵn khớp email mẫu.
- [ ] Nút "Vào NezFocus" ghim đáy ở mọi frame; hai link trong câu điều khoản là phần tử bấm riêng, màu `primary`.

---

## Edge case (rà ngày 17/10/2026; viết lại 30/10/2026, CR-16)

Frame nằm trong nhóm "01 · Đăng nhập & Onboarding — Edge case", tên `S-AUTH-EDGE · <tình huống>` (10 frame).

### Phiên đăng nhập kết thúc (một luật cho cả app — v1.9, CR-16 #9)

Backend gửi lý do kèm close code `4004` / lỗi `40103` (`40100` = hết hạn). Máy này về **S-AUTH-04** (chế độ đã nhớ; lý do mật khẩu được đổi / đặt lại → mở chế độ mật khẩu), email điền sẵn, `Banner` theo lý do. Đăng nhập lại **cùng** tài khoản xong → về màn đang xem (bảng điều hướng). Các area khác trỏ về bảng này (07 S-ME-EDGE `session-revoked-here`, 10 S-MOD-04 bảng mã lỗi).

| Lý do | Icon | Chữ banner | Frame |
|---|---|---|---|
| Mật khẩu được đổi / đặt lại ở thiết bị khác | `key-round` | "Mật khẩu vừa được đổi trên thiết bị khác · hãy đăng nhập lại" | `session-revoked` |
| Bị thu hồi từ thiết bị khác (07 S-ME-03 "Đăng xuất" / "Đăng xuất mọi thiết bị khác") | `log-out` | "Bạn đã bị đăng xuất khỏi thiết bị này · hãy đăng nhập lại" | 07 S-ME-EDGE `session-revoked-here` |
| Refresh token bị dùng lại (mới) | `shield-alert` | "Phiên đăng nhập đã được đóng để bảo vệ tài khoản · hãy đổi mật khẩu nếu đó không phải bạn" | `session-reuse` |
| Còn lại (hết hạn, `40100`, không có lý do) | `clock-3` | "Phiên đăng nhập đã hết hạn · hãy đăng nhập lại" | — (cùng khuôn) |

### Có frame

| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `session-revoked` — mật khẩu được đặt lại trên thiết bị khác | S-AUTH-04 **chế độ mật khẩu**, email `an.nguyen@gmail.com` điền sẵn, `Banner` icon `key-round` (chữ ở bảng trên) | AUTH-04, AUTH-08 AC4 |
| `session-reuse` 🆕 — phiên bị đóng vì refresh token bị dùng lại | S-AUTH-04 chế độ OTP (lần trước An đăng nhập bằng OTP), email điền sẵn, `Banner` icon `shield-alert`, câu dài nhất của bảng (banner 2–3 dòng, cao theo chữ) | AUTH-04 AC5 |
| `verify-network-error` — đủ 6 số nhưng mất mạng khi gửi | S-AUTH-03: các ô giữ `482913` (không viền lỗi); khối lỗi "Chưa gửi được mã OTP · kiểm tra kết nối rồi thử lại" + `Button · secondary` "Thử lại"; bàn phím đóng | NFR-USAB-03 |
| `code-autofill` — hệ điều hành gợi ý mã | S-AUTH-03: thanh gợi ý trên bàn phím số: "Từ Mail · 482913"; chạm là điền đủ 6 ô và tự gửi | AUTH-13 |
| `update-mid-signup` — bắt buộc cập nhật khi đang ở Hoàn tất tài khoản | S-AUTH-00 + dòng `label` `text-secondary` dưới mô tả: "Tài khoản của bạn vẫn được giữ · cập nhật xong bạn hoàn tất tiếp"; cập nhật xong mở thẳng S-ONB-01 (phiên còn, chữ đã gõ không giữ) | NFR-MOB-12, AUTH-01 AC5 |
| `long-email` — email rất dài | S-AUTH-03 với `nguyen.thi.thanh.an.k22.ptit@student.ptit.edu.vn`: email xuống dòng, không cắt (người dùng cần đọc đủ để nhận ra gõ nhầm); chỉ ngắt sau `@` hoặc `.`, không ngắt giữa chữ (frame: `…ptit@` / `student.ptit.edu.vn`); "Đổi email" ngay dưới | C-02 › Ngắt dòng |
| `long-server-name` — tên server rất dài trong banner lời mời | S-AUTH-01 `pending-invite` với "Ôn thi cuối kỳ Giải tích 2 — Nhóm học buổi tối K22 khoa CNTT": tên server trong banner tối đa 40 ký tự rồi "…" (cắt ở ranh giới từ: "Ôn thi cuối kỳ Giải tích 2 — Nhóm học…"); banner xuống dòng tự do. (Trước v1.9 vẽ trên thẻ lời mời của S-ONB-02; thẻ dài nay ở 10 S-MOD-01 `large-text-invite`) | C-05 › Chữ dài |
| `timezone-custom` — chọn múi giờ khác máy | S-ONB-01 `scrolled`: hàng Múi giờ "GMT+9 · Tokyo" + dòng mô tả "Khác múi giờ của máy (GMT+7)"; trong sheet hàng "Theo máy" không còn ✓ | STUDY-03 |
| `code-large-text` — nhập mã ở chữ 200% | S-AUTH-03: 6 ô cao 72 vẫn một hàng (khoảng cách 4), chữ xuống dòng, tiêu đề header phóng tối đa ×1.6 (27), 1 dòng cắt `…`; email xuống dòng sau `@` (`an.nguyen@` / `gmail.com`) | C-24, NFR-A11Y-03 |
| `long-names` 🆕 — tên hiển thị và username dài tối đa | S-ONB-01: email `nguyen.thi.thanh.an.k22.ptit.hn@student.ptit.edu.vn` (dòng mô tả ngắt sau `@`); username điền sẵn 32 ký tự `nguyen.thi.thanh.an.k22.ptit.hn` (cắt 32); tên hiển thị 32 ký tự "Nguyễn Thị Thanh An K22 PTIT HN" (bộ đếm không hiện — ô một dòng); cả hai ô một dòng, không cắt | AUTH-01, AUTH-06 |

Bỏ ở v1.9 (CR-16): `registration-expired` (không còn đăng ký chờ 24 giờ), `killed-back-to-edit` (app không lưu bước nhập mã), `invite-banned` (join lời mời đang chờ nay ở 10 S-MOD-01 `banned`).

### Chỉ ghi luật (giao diện không đổi)

| Tình huống | Luật |
|---|---|
| Ngôn ngữ máy không phải vi/en | UI tiếng Việt; S-ONB-01 chọn sẵn "Tiếng Việt" |
| Có lời mời đang chờ, tài khoản đã là thành viên server đó | Sau đăng nhập / Hoàn tất mở 10 S-MOD-01 `already-member` |
| Lời mời hết hạn hoặc bị thu hồi trong lúc đang hoàn tất tài khoản | Không chặn S-ONB-01; xong thì mở S-MOD-01 `expired` |
| Sai mã lần thứ 4 | Khối lỗi "Mã OTP không đúng. Còn 1 lần thử." |
| Cùng một email nhận mã ở hai máy | Chỉ mã mới nhất đúng (gửi mã mới làm mã cũ hết hiệu lực); máy dùng mã cũ nhận `code-expired` (`40002`) |
| Để màn nhập mã quá 15 phút rồi mới gõ | Gửi xong mới biết: `code-expired`; không tự đổi trạng thái khi hết giờ |
| Bắt buộc cập nhật ở bước nhập email / nhập mã | Cập nhật xong mở lại từ S-AUTH-01 (app không lưu bước này; lời mời đang chờ vẫn giữ) |
| Tài khoản đã xóa hẳn (quá 14 ngày chờ) | Đăng nhập bằng mật khẩu: `wrong-password` như email không tồn tại; nhập OTP với email đó thì tạo tài khoản **mới** (không còn dữ liệu cũ) → S-ONB-01 |
| Vào tài khoản đã có từ "Tạo tài khoản" | Đi theo bảng điều hướng kèm Toast "Bạn đã có tài khoản với email này — đã đăng nhập" |
| Đăng nhập bằng OTP vào tài khoản chưa đặt mật khẩu (bỏ dở Hoàn tất) | Về S-ONB-01; đăng nhập bằng mật khẩu với tài khoản đó báo `wrong-password` |
| Bấm nút chính hai lần liên tiếp | Lần đầu đã chuyển nút sang `loading`, không bấm lại được |
| Mật khẩu chứa username (vd `An.nguyen2026!`) | Hợp lệ — chỉ cấm mật khẩu **là** email, phần trước @ hoặc username (AUTH-01 AC6) |

## Câu hỏi còn mở

Không còn.
