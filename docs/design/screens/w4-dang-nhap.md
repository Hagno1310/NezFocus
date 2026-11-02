# W4 · Đăng nhập & khung (web quản trị)

Area thứ tư của web quản trị (CR-27, SRS v1.10). Màn chính là **Đăng nhập** (lối vào duy nhất, nơi mọi luật "phiên kết thúc" của W1–W3 dẫn về); **Màn chặn dưới 1024** trong danh mục đã **bỏ** (Q15 — dưới 1024 trang cuộn ngang); cộng **khung** của web — các trạng thái không thuộc trang nào: khởi động, không có trang, trang lỗi, tiêu đề tab (Q11, Q13).

**Nguồn:** SRS v1.10 › REQ-ADMIN-01 (đăng nhập, phiên 12 giờ, quay về trang đang xem, nháp), 4.11 (nền tảng ≥ 1024, menu CLI: đặt mật khẩu mới / vô hiệu hóa thu hồi phiên), REQ-AUTH-02 (CAPTCHA, `40029`), 5.3 (`POST /admin/auth/login`, `POST /admin/auth/logout`, `GET /admin/auth/me`, cookie `admin_session`), 8.2 (`admin_accounts`, `admin_sessions`), 11.1 (`40100`, `40102`, `40105`, `40302`, `40029`). Diện mạo: `DESIGN.md` › Web quản trị (Màn đăng nhập, Mascot, Layout). Component: `00-components.md` › C-01, C-02, C-14 `FormMessage`, C-42 (menu tài khoản › Đăng xuất); area này bỏ C-54 Toast web (Q12) và C-55 `NarrowBlock` (Q15). Sản phẩm anh em: 01 › S-AUTH-04 (chế độ mật khẩu) và 01 › Edge case › "Phiên đăng nhập kết thúc". Hồ sơ nền tảng **web**.

> Trạng thái: **hành vi đã chốt 02/11/2026** (18 câu + không dùng toast — mục [Quyết định](#quyết-định-chốt-02112026)); **đã vẽ 02/11/2026** — `Des/nezfocus.pen`, ba nhóm dưới nhóm edge case của W3 (x 77706): "W4 · Đăng nhập & khung — S-ADM-AUTH-01 · Đăng nhập" (y 34400, 14 frame), "— Dưới 1024: cuộn ngang" (y 36600, 2 frame: `S-ADM-AUTH-01 · default · 390`, `S-ADM-RPT-02 · narrow · 910` — thay 3 frame màn chặn và board C-55 đã xóa, Q15), "— S-ADM-APP-01 · Khung (+ frame thêm cho W1)" (y 37660, 4 frame + `S-ADM-RPT-02 · draft-restored` + `account-menu` sáng / tối — Q17), "— Edge case" (y 38780, 2 frame, `captcha-error` là v1.x). **Product Owner duyệt toàn bộ W4 ngày 02/11/2026** (frame chính, Q15 cuộn ngang, Q16 bỏ CAPTCHA, edge case). Form đăng nhập dựng từ instance `TextField`, `FormMessage`, `Button/primary` và khối CAPTCHA của app.

---

## Quy ước của area

| Hạng mục | Quy ước |
|---|---|
| Khung | **1440 × 900** (chính) và **1024 × 768** cho `default`. Dưới 1024 (Q15): đăng nhập ở **390 × 844**, trang trong khung ở **910** (laptop 1366 phóng 150%). Trạng thái còn lại chỉ vẽ ở 1440 |
| Theme khi duyệt | Theme sáng; `default · 1440` có bản tối để kiểm nhanh |
| Vị trí trong điều hướng | Đăng nhập, khởi động, lỗi khởi động: **không có sidebar** (chưa biết ai đăng nhập). Không có trang, trang lỗi: trong khung có `AdminSidebar`, không mục nào chọn, badge Báo cáo = **9** |
| URL | Đăng nhập `/login?next={đường dẫn}` — `next` chỉ nhận đường dẫn tương đối cùng web (bắt đầu bằng một "/", không "//", không có giao thức), khác thì bỏ qua và về `/`. Đã đăng nhập mà mở `/login` → chuyển ngay tới `next` hoặc `/`. Khởi động, lỗi không có URL riêng (giữ URL đang mở) |
| Tiêu đề tab | (Q13) "{tên trang} · NezFocus Quản trị", không đếm số việc; favicon chữ N (C-41). Tên trang: "Đăng nhập" · "Tổng quan" · "Báo cáo" · "#57 Tin nhắn của khanh.le" · "Người dùng" · "khanh.le" · "Server" · "Ôn thi Giải tích 2" · "Nhật ký" · "Không có trang này". Khởi động giữ tiêu đề của trang đang mở |
| Ngày giờ | Không hiện ngày giờ nào trên các màn của area (thời gian chờ ghi bằng phút) |
| Mascot | **Không có** (`DESIGN.md` › Web quản trị › Mascot: không ở màn đăng nhập, trang lỗi) |
| Logo | Chữ N `primary` (hình học `Logo` của C-41) + "NezFocus" `headline` 700 + "Quản trị" `label` `text-secondary` — cùng khối thương hiệu của sidebar (C-42), N cao 28 |
| Màu | Restrained: `primary` chỉ cho nút Đăng nhập, focus, link. Lỗi `danger` chỉ ở icon + chữ khối lỗi và viền ô lỗi |
| Lớp phủ | Không dialog, không toast. Khối thông báo trong form (`FormMessage`) |

### Thế giới mẫu

**Thế giới A** (tiếp nối W1–W3). Admin **Hiếu** (`hieupt1003@gmail.com`) đăng nhập lúc **10:20 Thứ Hai 19/10/2026** → phiên hết hạn **22:20** (12 giờ tuyệt đối, không gia hạn). Mọi frame W1–W3 (21:40 – 22:10) nằm trong phiên này. Admin thứ hai **Trâm** (`tramnguyen.ops@gmail.com`).

**Luật nhất quán dữ liệu:**
- Phiên hết hạn đúng 12 giờ sau lúc tạo. **Câu chuyện 22:20:** sau các việc của W1–W3, lúc 22:16 Hiếu mở việc **#52** (tin nhắn riêng của phong.vu, "Quấy rối hoặc bắt nạt", Chỉ admin — việc **1 / 9** của phạm vi Cần admin lúc này: #52, #59, #60, #61, #62, #64, #65, #67, #68), chọn "Khóa tài khoản" 7 ngày, lý do chọn sẵn "Quấy rối hoặc bắt nạt", tick "Xóa luôn tin bị báo cáo", gõ lời nhắn "Đe dọa người khác trong tin nhắn riêng là vi phạm quy tắc." và ghi chú "Đã khóa 1 ngày ở #54, lần này 7 ngày." Đúng 22:20 web tự về đăng nhập (`session-expired`, `next=/reports/52`); 22:21 Hiếu đăng nhập lại → `S-ADM-RPT-02 · draft-restored`. phong.vu không đang bị khóa (khóa 1 ngày ở #54 của Trâm 17/10/2026 10:20 đã hết).
- `password-reset`: thế giới **E** (giả định, ghi nhãn) — người vận hành đặt mật khẩu mới cho Hiếu (menu CLI 3) khi Hiếu đang mở trang.
- Sai mật khẩu (REQ-AUTH-02, MVP không CAPTCHA — Q16): 5 lần / 10 phút theo (email, IP) → chờ 10 phút; 20 lần / giờ theo IP → chờ tới hết giờ. Cả hai là `40029`. Frame `rate-limited` là giới hạn theo IP, còn **38 phút** (`Retry-After` 2280 giây).
- Email của tài khoản người dùng (vd `an.nguyen@gmail.com`) đăng nhập web quản trị → `40102` như sai mật khẩu (REQ-ADMIN-01 AC1). Frame `wrong-credentials` dùng `hieupt1003@gmail.com` gõ sai mật khẩu.
- Tài khoản bị vô hiệu hóa: thế giới **D** (giả định, ghi nhãn) — người vận hành vô hiệu hóa Trâm qua menu CLI; Trâm đăng nhập đúng mật khẩu → `40302`.

---

## S-ADM-AUTH-01 · Đăng nhập

**Mục đích:** vào web quản trị bằng email + mật khẩu của tài khoản admin; nói rõ vì sao phải đăng nhập lại.
**REQ:** REQ-ADMIN-01 (AC1–AC3), REQ-AUTH-02 (giới hạn sai mật khẩu; CAPTCHA ở v1.x), 4.11.
**Mở từ:** gõ địa chỉ web khi chưa có phiên (`default`); phiên kết thúc khi đang dùng — hết 12 giờ, bị thu hồi qua menu CLI, đăng xuất (`session-expired`, `password-reset`, `signed-out`; Q3); "Đăng xuất" trong menu tài khoản (C-42) → `signed-out`. **Đi tới:** đăng nhập được → `next` nếu có (đúng trang, đúng bộ lọc; nháp khôi phục nếu đúng admin đã soạn — Q6, frame `S-ADM-RPT-02 · draft-restored`), không có → S-ADM-OVR-01 `default` (`/`).

### Bố cục
```
1440 × 900, nền surface-1, không thẻ, không panel thương hiệu (DESIGN.md)
                ┌──────── cột 360, giữa theo chiều ngang ────────┐
                │ [N] NezFocus                                    │  khối thương hiệu
                │     Quản trị                                    │
                │                                                 │  32
                │ Đăng nhập                         ← title-1     │
                │                                                 │  24
                │ (khối thông báo lý do — khi có)   FormMessage   │
                │ Email                                           │
                │ [hieupt1003@gmail.com                       ]   │  TextField 48
                │ Mật khẩu                                        │
                │ [••••••••••                             [👁] ]  │  TextField · password
                │ (Caps Lock đang bật — khi có)                   │
                │ (khối lỗi — khi có)               FormMessage   │
                │ [              Đăng nhập              ]         │  Button primary L, rộng hết cột
                │                                                 │  24
                │ Quên mật khẩu hoặc chưa có tài khoản?           │  label text-secondary
                │ Nhờ người vận hành NezFocus đặt lại.            │  (Q2)
                └─────────────────────────────────────────────────┘
Cột căn giữa theo chiều dọc, lệch lên trên (đỉnh khối thương hiệu ở 1/4 chiều cao khi form
ngắn); khi có khối thông báo + khối lỗi, cột dài xuống, khối thương hiệu giữ chỗ.
1024 × 768: cùng cột 360, đỉnh ở 120.
```
Nội dung căn trái trong cột (`DESIGN.md` › Màn đăng nhập: "form căn trái trong một cột hẹp"); cột giữa trang theo hồ sơ web (màn ngắn một việc căn giữa một khối có độ rộng giới hạn) — Q1.

### Component
C-02 `TextField` (email; `password` có nút hiện/ẩn), C-14 `FormMessage` (`danger` cho lỗi; trung tính cho lý do phiên kết thúc, Caps Lock, giới hạn), C-01 `Button · primary · L` (`loading`, `disabled`), logo C-41.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Thương hiệu | "NezFocus" · "Quản trị" |
| Tiêu đề | "Đăng nhập" |
| Nhãn ô | "Email" · "Mật khẩu" (không placeholder — nhãn đã nói) |
| Nút hiện / ẩn mật khẩu | nhãn đọc màn hình "Hiện mật khẩu" / "Ẩn mật khẩu" |
| Nút | "Đăng nhập" |
| Dòng trợ giúp | "Quên mật khẩu hoặc chưa có tài khoản? Nhờ người vận hành NezFocus đặt lại." (Q2; "người vận hành" khớp "Người vận hành (CLI)" của Nhật ký W3) |
| Lỗi ô | Trống: "Nhập email." · sai dạng: "Email chưa đúng định dạng." · mật khẩu trống: "Nhập mật khẩu." |
| Lỗi chung | `40102`: "Email hoặc mật khẩu không đúng." (REQ-ADMIN-01) · `40302`: "Tài khoản quản trị này đã bị vô hiệu hóa." (REQ-ADMIN-01) · mất kết nối: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại." · `50000`: "Máy chủ đang gặp lỗi. Thử lại sau ít phút." |
| Giới hạn (`40029`) | "Bạn đã thử sai quá nhiều lần. Thử lại sau 38 phút." (dưới 90 giây ghi giây: "Thử lại sau 45 giây.") |
| Caps Lock | "Caps Lock đang bật." (Q8) |
| Lý do phiên kết thúc | xem bảng [Phiên đăng nhập kết thúc](#phiên-đăng-nhập-kết-thúc-đề-xuất--q3) |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Hai ô trống; focus sẵn ở ô Email (`focus-visible` — vào trang là gõ được) | |
| `field-error` | Bấm "Đăng nhập" với email `hieupt1003@gmail` và mật khẩu trống: hai ô `error`, lỗi dưới từng ô; focus về ô lỗi đầu tiên (Email). Kiểm ở client, không gọi API | "Email chưa đúng định dạng." · "Nhập mật khẩu." |
| `wrong-credentials` | Khối lỗi trên nút (`40102`); ô mật khẩu xóa trống và nhận focus; email giữ | "Email hoặc mật khẩu không đúng." |
| `captcha` · **v1.x** | (Q16: MVP không CAPTCHA; frame giữ cho v1.x, tên thêm " · v1.x") Lần sai thứ 5 trong 10 phút (`40105`): khối xác minh hiện trên khối lỗi | "Bạn đã nhập sai nhiều lần. Hoàn tất xác minh để thử tiếp." |
| `rate-limited` | `40029`: khối thông báo trung tính (icon `clock-3`) trên nút; nút `disabled` theo `Retry-After`, số phút đếm lùi mỗi phút, hết thì nút bật lại và khối biến mất. Frame: giới hạn theo IP (sửa email không mở lại). Lần sai thứ 5 trong 10 phút với cùng email (Q16) dùng đúng khuôn này, "Thử lại sau 10 phút.", và sửa email thì nút bật lại | "Bạn đã thử sai quá nhiều lần. Thử lại sau 38 phút." |
| `account-disabled` | Thế giới D: Trâm đúng mật khẩu → khối lỗi (`40302`); ô mật khẩu xóa trống | "Tài khoản quản trị này đã bị vô hiệu hóa." |
| `submitting` | Nút `loading` (giữ rộng); hai ô vẫn hiện chữ, không sửa được trong lúc chờ | |
| `network-error` | Không tới được máy chủ: khối lỗi; mật khẩu **giữ** (không phải lỗi của người gõ) | "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại." |
| `session-expired` | 22:20, từ việc #52: khối thông báo lý do trên ô Email; email điền sẵn, focus ở ô Mật khẩu | (bảng dưới) |
| `password-reset` | Người vận hành đặt mật khẩu mới cho Hiếu qua menu CLI khi Hiếu đang mở trang (REQ-ADMIN-01 AC4) | (bảng dưới) |
| `signed-out` | Sau "Đăng xuất": khối thông báo; email **không** điền (máy có thể dùng chung) | (bảng dưới) |
| `caps-lock` | (Q8) Đang gõ mật khẩu khi Caps Lock bật: dòng trung tính icon `arrow-big-up` ngay dưới ô Mật khẩu; tắt Caps Lock thì mất | "Caps Lock đang bật." |
| `default · 1024` | Bố cục như trên, đỉnh 120 | |
| `default · 390` | Điện thoại (Q15): cột 342, đỉnh 211; không cuộn ngang | |
| `default · dark` | Bản tối 1440 | |

Không vẽ riêng: mật khẩu đang hiện (trạng thái của C-02 `password`, đã có ở app S-AUTH-04 — nút `eye-off`); `hover` / `focus-visible` của nút và ô (C-01 · C-23 trạng thái web, C-02 `focused`).

### Phiên đăng nhập kết thúc (Q3)

Một luật cho cả web quản trị — W1 › Edge case, W2 › Edge case B1, W3 › Edge case trỏ về đây. Học theo luật của app (01 › Edge case › "Phiên đăng nhập kết thúc"): báo đúng lý do, điền sẵn email, đăng nhập lại về đúng trang.

| Lý do | Tín hiệu | Icon | Chữ khối thông báo | Email | Frame |
|---|---|---|---|---|---|
| Hết 12 giờ | `40100` `reason: expired`; hoặc client tự đến giờ `expires_at` (Q4) | `clock-3` | "Phiên đăng nhập đã hết hạn sau 12 giờ. Đăng nhập lại để tiếp tục." | điền sẵn | `session-expired` |
| Người vận hành đặt mật khẩu mới (menu CLI 3) | `40100` `reason: password_reset` | `key-round` | "Mật khẩu của bạn vừa được đặt lại. Đăng nhập bằng mật khẩu mới." | điền sẵn | `password-reset` |
| Người vận hành vô hiệu hóa (menu CLI 5) | `40100` `reason: disabled` | `octagon-x` (`danger`) | "Tài khoản quản trị này đã bị vô hiệu hóa." | điền sẵn | — (cùng khuôn `account-disabled`) |
| Đăng xuất (tab này hoặc tab khác — Q5) | tự bấm; `40100` `reason: signed_out`; tin nhắn giữa các tab | `log-out` | "Bạn đã đăng xuất." | không | `signed-out` |
| Không rõ (cookie mất, phiên không tồn tại) | `40100` không có `reason` | — | không có khối; như `default` | không | `default` |

Email chỉ điền được khi tab còn giữ thông tin admin trong bộ nhớ (bị đưa về từ một trang đang mở); tải lại trang hay mở tab mới thì không có. Khối thông báo mất khi gửi form lần đầu.

### Tương tác
- **Thứ tự focus:** Email → Mật khẩu → nút hiện / ẩn → Đăng nhập. Focus đầu trang: ô trống đầu tiên (Email, hoặc Mật khẩu khi email đã điền).
- **Enter** ở bất kỳ ô nào gửi form. Lỗi ô: focus về ô lỗi đầu tiên; lỗi chung: focus về ô Mật khẩu (đã xóa trống) — trừ `network-error` (focus về nút).
- **Trình quản lý mật khẩu:** ô Email `type=email` `autocomplete="username"`, ô Mật khẩu `autocomplete="current-password"`; dán được vào cả hai ô. Không cắt khoảng trắng trong mật khẩu; email cắt khoảng trắng hai đầu và chuyển chữ thường trước khi gửi (`admin_accounts.email` lưu chữ thường).
- **CAPTCHA:** không có ở MVP (Q16). Khi làm ở v1.x: widget của dịch vụ xác minh (bước do bên thứ ba vẽ, iframe), app truyền theme và ngôn ngữ `vi`; frame `captcha · v1.x` và `W4-EDGE · captcha-error · v1.x` giữ sẵn hình.
- **Sau khi đăng nhập:** chuyển tới `next` hoặc `/`; Back của trình duyệt không quay lại `/login` (thay thế lịch sử, không thêm). Trang sau đăng nhập không được cache (Back sau khi đăng xuất không hiện lại dữ liệu cũ).
- **Theme:** theo lựa chọn đã nhớ trong menu tài khoản (C-42), chưa có thì theo hệ thống; trang đăng nhập không có nút đổi (Q14).

### Checklist duyệt
- [ ] Đủ 15 frame trong bảng trạng thái.
- [ ] Khối lỗi không chỉ ra sai email hay sai mật khẩu; email tài khoản người dùng cũng nhận đúng câu đó.
- [ ] Không mascot, không panel thương hiệu; logo là chữ N `primary`.
- [ ] Khối thương hiệu không nhảy khi khối thông báo / lỗi xuất hiện (cột dài xuống dưới).
- [ ] Dấu chồng ("Đặt lại", "Ẩn") không bị cắt trong ô 48.

---

## Dưới 1024: cuộn ngang (Q15 — thay S-ADM-AUTH-02 Màn chặn)

**Quyết định 02/11/2026:** không chặn. Màn chặn khóa ngoài người phóng to trình duyệt (laptop 1366 phóng 150% chỉ còn 910px) và việc gấp trên điện thoại. **REQ:** SRS 4.11; `DESIGN.md` › Layout, Tương tác.

| Trang | Dưới 1024 |
|---|---|
| Trang trong khung (có sidebar: Tổng quan, Báo cáo, Người dùng, Server, Nhật ký, `not-found`, `crash`) | Giữ bố cục 1024 (bề rộng tối thiểu của cả trang), trình duyệt hiện thanh cuộn ngang. Sidebar, nội dung và panel Quyết định trượt cùng nhau — không phần nào đứng yên theo chiều ngang; panel và nút xác nhận vẫn ghim theo chiều dọc như ở 1024 |
| Đăng nhập, `boot`, `boot-error` | Co theo cửa sổ: cột 360 (hẹp hơn 408 thì bề rộng − 2 × 24), đỉnh ở 1/4 chiều cao; không cuộn ngang |

Frame:
- `S-ADM-AUTH-01 · default · 390` — điện thoại 390 × 844: cột 342, không cuộn ngang.
- `S-ADM-RPT-02 · narrow · 910` — laptop 1366 phóng 150% (khung nhìn 910 × 512 được vẽ 910 × 768 cho dễ xem): trang #57 ở bố cục 1024 bị cắt 114px bên phải (mép phải panel Quyết định ra ngoài khung nhìn), thanh cuộn ngang của trình duyệt ở đáy.

Không có nhãn hay lời nhắc riêng (thanh cuộn của trình duyệt đã nói đủ); không cần component mới.

---

## S-ADM-APP-01 · Khung: khởi động & trang lỗi (Q11)

**Mục đích:** những gì web hiện khi chưa biết ai đăng nhập, khi URL không có trang, khi trang gặp lỗi khi hiển thị. Base React (PageLoader, NotFound) có sẵn các màn này nhưng chưa spec nào vẽ.
**REQ:** REQ-ADMIN-01, SRS 3.5 (loading ≤ 1 giây không spinner toàn màn), `DESIGN.md` › Motion (skeleton đứng yên).
**Mở từ:** mở web / tải lại trang (`boot`); `GET /admin/auth/me` thất bại (`boot-error`); URL không khớp trang nào (`not-found`); lỗi khi hiển thị một trang (`crash`). **Đi tới:** `boot` → trang theo URL (có phiên) hoặc S-ADM-AUTH-01 `default` với `next` (không phiên); `not-found` → S-ADM-OVR-01; `crash` → tải lại trang đó.

### Trạng thái
| State | Khác gì | Chữ / hành động riêng |
|---|---|---|
| `boot` | Đang hỏi `GET /admin/auth/me`: nền `surface-1`, chữ N `primary` 32 giữa trang, không chữ, không spinner. Chỉ hiện nếu chờ quá 300ms (tránh nháy) | |
| `boot-error` | Không tới được máy chủ khi khởi động (chưa biết có phiên không): không sidebar; khối giữa trang: logo, kẻ 32, icon `wifi-off` 24 `text-tertiary`, tiêu đề `body` 600, nút | "Không kết nối được máy chủ quản trị." · nút `secondary` "Thử lại" |
| `not-found` | URL lạ (`/reprots`): trong khung, sidebar không mục nào chọn; vùng nội dung báo lỗi đúng khuôn W2 `not-found` (icon `search-x` 24 `text-tertiary`, tiêu đề `body` 600, nút `secondary` cao 40) | "Không có trang này" · "Về Tổng quan" |
| `account-menu` | (Q17) Bấm "Hiếu" ở chân sidebar trên Tổng quan (thế giới A 22:10): `AccountButton · open` (nền `surface-2`) + `AccountMenu` mở phía trên nút, cách 8, mép trái theo đệm sidebar 12 — tên, email, dòng gợi ý (Q18), Giao diện (dấu chọn ở "Theo hệ thống"), Đăng xuất. Có bản tối | "Hiếu" · "hieupt1003@gmail.com" · "Đổi tên hoặc mật khẩu: nhờ người vận hành NezFocus." · "Giao diện" · "Theo hệ thống" · "Sáng" · "Tối" · "Đăng xuất" |
| `crash` | Lỗi khi hiển thị (lỗi của web, không phải mạng): trong khung, mục của trang đó vẫn chọn trên sidebar (vd Người dùng); vùng nội dung cùng khuôn `not-found`, icon `triangle-alert` | "Trang này gặp lỗi khi hiển thị." · "Tải lại trang" |

Không áp dụng `loading` / `empty` / `forbidden` / `offline` / `os-permission` cho khung (mỗi trang tự có `loading`, `error`).

### Checklist duyệt
- [ ] 6 frame (`account-menu` có bản tối); `not-found` cùng giọng với W1 "Không có việc #999" và W2 "Không có người dùng này".
- [ ] Không mascot.

---

## Ma trận trạng thái

| State chuẩn | S-ADM-AUTH-01 | S-ADM-APP-01 |
|---|---|---|
| `default` | ✔ | — (khung không có default riêng) |
| `loading` | ✔ `submitting` (không có lần tải đầu: form tĩnh) | ✔ `boot` |
| `empty` | ✗ form | ✗ |
| `error` | ✔ `field-error`, `wrong-credentials`, `account-disabled`, `network-error` | ✔ `boot-error`, `not-found`, `crash` |
| `offline` | ✗ web quản trị không có chế độ offline (W1); mất mạng = `network-error` | ✗ = `boot-error` |
| `forbidden` | ✗ một cấp admin; tài khoản người dùng nhận `40102`, không phải forbidden | ✗ |
| `os-permission` | ✗ không dùng quyền trình duyệt nào | ✗ |
| Nghiệp vụ | `rate-limited` (+ `captcha` v1.x), `session-expired`, `password-reset`, `signed-out`, `caps-lock` | — |

## Đối chiếu REQ

| Vế của REQ | Dòng spec |
|---|---|
| REQ-ADMIN-01: email + mật khẩu; không mã email, 2FA, Google, "Quên mật khẩu" | Bố cục (không link quên mật khẩu; dòng trợ giúp là chữ — Q2) |
| Sai email / mật khẩu, kể cả email tài khoản người dùng → "Email hoặc mật khẩu không đúng." (AC1) | `wrong-credentials`; luật nhất quán dữ liệu |
| Vô hiệu hóa, chỉ báo khi đúng mật khẩu → "Tài khoản quản trị này đã bị vô hiệu hóa." (AC2) | `account-disabled` |
| Chống brute-force như REQ-AUTH-02 (MVP không CAPTCHA) | `rate-limited` |
| Cookie HttpOnly, 12 giờ tuyệt đối, không gia hạn, không "ghi nhớ" (AC3) | Không có ô "Ghi nhớ"; Phiên đăng nhập kết thúc; thế giới A 10:20 → 22:20 |
| Hết hạn → đăng nhập; đăng nhập lại về trang đang xem; không có trang → Tổng quan | URL `next`; Đi tới |
| Nháp panel giữ trong tab khi bị đưa về đăng nhập, khôi phục sau đăng nhập lại | Đi tới; W1 › Edge case (Q6) |
| Đặt mật khẩu mới thu hồi mọi phiên (AC4) | `password-reset` |
| Menu tài khoản: "Đăng xuất" | `signed-out` |
| 4.11 (duyệt W4): dưới 1024 trang trong khung cuộn ngang, đăng nhập co theo cửa sổ | Dưới 1024: cuộn ngang; `default · 390`, `S-ADM-RPT-02 · narrow · 910` |
| AC5: access token của app gọi `/admin/*` → `40401` | Không có hình (API) |

---

## Quyết định (chốt 02/11/2026)

Product Owner đồng ý cả 14 khuyến nghị ngày 02/11/2026. Trước đó, câu hỏi "web không có toast nào?" được chốt **A — chỉ biên nhận, không toast** (kéo theo Q12). Hành vi đã ghi vào SRS REQ-ADMIN-01 (AC6, AC7), 4.11, 5.3, 8.2 (`admin_sessions.revoke_reason`), 11.1 (`40100`).

Đã trả lời ở nơi khác, không hỏi: không "Quên mật khẩu", 2FA, Google, "Ghi nhớ" (SRS REQ-ADMIN-01); phiên 12 giờ tuyệt đối (REQ-ADMIN-01); câu lỗi `40102` / `40302` (REQ-ADMIN-01); giới hạn sai mật khẩu, không khóa cứng (REQ-AUTH-02 — CAPTCHA xem Q16); quay về trang đang xem, không có thì Tổng quan (REQ-ADMIN-01, W3 Q9); nháp panel giữ trong tab (REQ-ADMIN-01, W1 › Edge case); không mascot (`DESIGN.md`); một cấp admin — không ma trận vai trò; email so chữ thường (8.2).

**Base (Q15):** React starter đăng nhập qua Keycloak (chuyển sang trang Keycloak) → **đổi**: form riêng, tài khoản `admin_accounts` (DEC-44). `ProtectedRoute` đưa về đăng nhập kèm trang đang mở → **giữ** (`?next=`). Đăng xuất theo lý do `session-expired` / `account-disabled` → **giữ và mở rộng** thành bốn lý do (Q3). `NotFound`, `PageLoader` → **giữ**, vẽ lại trong khung (Q11). Backend NezFocus-Code: module `admin`, `auth` còn trống — không có gì để giữ.

| # | Câu hỏi | Khuyến nghị |
|---|---|---|
| Q1 | Bố cục màn đăng nhập | Cột 360 giữa trang, nội dung căn trái, không thẻ, nền `surface-1` |
| Q2 | Không có "Quên mật khẩu" — người quên biết làm gì? | Dòng chữ (không link) dưới nút: "Quên mật khẩu hoặc chưa có tài khoản? Nhờ người vận hành NezFocus đặt lại." |
| Q3 | Phiên kết thúc báo theo lý do? | Có, như app: hết hạn / mật khẩu được đặt lại / bị vô hiệu hóa / đã đăng xuất; backend trả `reason` kèm `40100` (thêm cột `admin_sessions.revoke_reason`); điền sẵn email trừ khi đăng xuất |
| Q4 | Hết 12 giờ: chờ lần gọi API sau hay tự về đăng nhập đúng giờ? | Tự về đúng giờ `expires_at` (lấy từ `/admin/auth/me`); không cảnh báo trước (nháp đã được giữ) |
| Q5 | Đăng xuất ở một tab: các tab khác? | Về đăng nhập ngay (tin nhắn giữa các tab), không chờ lần gọi API sau |
| Q6 | Nháp khôi phục cho ai, có báo không? | Chỉ cho đúng admin cũ (admin khác đăng nhập thì bỏ nháp, vẫn về trang cũ); khôi phục thì panel Quyết định có dòng `info` "Đã khôi phục lựa chọn bạn đang làm dở trước khi phiên đăng nhập kết thúc." (thêm frame W1 `S-ADM-RPT-02 · draft-restored`) |
| Q7 | REQ-AUTH-02 gửi email cảnh báo khi người dùng đăng nhập từ thiết bị mới — admin có không? | Không ở MVP: REQ-ADMIN-01 chỉ mượn phần chống brute-force; 1–5 admin, Nhật ký không ghi đăng nhập. Ghi vào câu hỏi còn mở cho v1.x |
| Q8 | Cảnh báo Caps Lock | Có: "Caps Lock đang bật." dưới ô Mật khẩu |
| Q9 | ~~Màn chặn: vế phóng to và bề rộng hiện tại~~ (thay bằng Q15) | Thêm cả hai: "Nếu trình duyệt đang phóng to, thu nhỏ lại bằng Ctrl và phím −." (macOS "⌘") + "Cửa sổ hiện rộng 1000px." |
| Q10 | ~~Màn chặn che hay thay trang?~~ (thay bằng Q15) | Che: trang bên dưới giữ nguyên, nới cửa sổ là dùng tiếp, không mất chữ đang gõ; áp cho mọi trang kể cả đăng nhập |
| Q11 | Khung: khởi động, lỗi khởi động, không có trang, trang lỗi | Thêm S-ADM-APP-01 với 4 trạng thái này |
| Q12 | C-54 Toast web | Bỏ khỏi danh mục: W1–W4 không chỗ nào dùng toast (kết quả là biên nhận, thông báo nằm trong form) |
| Q13 | Tiêu đề tab trình duyệt | "{tên trang} · NezFocus Quản trị", không đếm số việc trong tiêu đề; favicon chữ N |
| Q14 | Nút đổi theme trên trang đăng nhập | Không — theo lựa chọn đã nhớ, chưa có thì theo hệ thống |
| Q15 | (duyệt frame, 02/11/2026) Có nhất thiết chặn dưới 1024 không? | **Không chặn (B):** trang trong khung giữ bố cục 1024 và cuộn ngang; đăng nhập co theo cửa sổ. Thay Q9, Q10; bỏ C-55 và 3 frame màn chặn. So sánh đã đưa: A chặn · B cuộn ngang · C co giãn xuống 768 (để v1.x) |
| Q16 | (edge case, 02/11/2026) Web admin có cần CAPTCHA không? — tra ra app cũng chưa chọn dịch vụ, review SRS v1.2 (16/10/2026) đề xuất bỏ khỏi MVP | **Bỏ CAPTCHA ở MVP cho cả app lẫn web:** 5 lần sai / 10 phút (email + IP) → chờ 10 phút `40029`; `40105` sang v1.x. Frame `captcha` (app S-AUTH-04, W4) và `W4-EDGE · captcha-error` giữ, tên thêm " · v1.x". Ghi ở SRS REQ-AUTH-02 (AC3), REQ-ADMIN-01, 11.1, rủi ro #17; 01 S-AUTH-04; file này |
| Q17 | (sau duyệt, 02/11/2026) Nút tài khoản ở chân sidebar chỉ để trưng? | Không — mở menu tài khoản (C-42). Chỗ sót: chưa frame màn hình nào vẽ menu đang mở (chỉ có trên board C-42) → thêm `S-ADM-APP-01 · account-menu · 1440` + bản tối. File này |
| Q18 | Admin tìm "đổi mật khẩu" / hồ sơ / ngôn ngữ | Không có trang hồ sơ, không đổi ngôn ngữ (SRS REQ-ADMIN-01, 4.11); thêm dòng gợi ý trong menu "Đổi tên hoặc mật khẩu: nhờ người vận hành NezFocus." C-42 |

Ghi ở: Q1, Q2, Q8, Q11, Q13, Q14 — file này; Q3, Q4, Q5, Q6, Q7 — SRS REQ-ADMIN-01 (Q6 thêm vào C-50 `DP info` và W1 › Edge case); Q9, Q10 — thay bằng Q15; Q15 — SRS 4.11, `DESIGN.md` › Layout / Tương tác (+ Decisions Log), C-55 bỏ; Q12 — `00-components.md` (C-54 bỏ) + README; câu toast — giữ luật có sẵn của `DESIGN.md` › Web quản trị › Hành động, không đổi.

### Frame thêm cho area khác

| Frame | Thể hiện | Căn cứ |
|---|---|---|
| `S-ADM-RPT-02 · draft-restored · 1440` | Việc #52 (1 / 9) lúc 22:21 sau khi Hiếu đăng nhập lại: panel Quyết định đã chọn sẵn "Khóa tài khoản" 7 ngày, lý do "Quấy rối hoặc bắt nạt", "Xóa luôn tin bị báo cáo" đã tick, lời nhắn và ghi chú của câu chuyện 22:20 (nằm dưới, cuộn trong panel); nút "Khóa phong.vu 7 ngày và xóa tin"; badge 9, "Việc 1 / 9"; ô `DP info` icon `history` "Đã khôi phục lựa chọn bạn đang làm dở trước khi phiên đăng nhập kết thúc." | Q6; SRS REQ-ADMIN-01; C-50 `DP info`; W1 › Edge case |

## Edge case (rà ngày 02/11/2026)

Frame nằm trong nhóm "W4 · Đăng nhập & khung — Edge case", tên `W4-EDGE · <trường hợp>`. Product Owner chọn cả 16 trường hợp của menu (2 frame, 14 luật); thêm 2 luật rút ra khi rà (lỗi máy chủ, đã đăng nhập mà mở `/login`). Sau đó Q16 bỏ CAPTCHA ở MVP: B3 thành v1.x (frame giữ), D2 viết lại theo giới hạn chờ 10 phút — MVP còn **1 frame + 16 luật**.

### Có frame
| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| A1 · Bị vô hiệu hóa khi đang soạn (`W4-EDGE · session-disabled · thế giới D`) | Trâm đang soạn thì người vận hành vô hiệu hóa (menu CLI 5) → `40100` `reason: disabled` → đăng nhập: khối báo **`danger`** (icon `octagon-x`) "Tài khoản quản trị này đã bị vô hiệu hóa." **trên** ô Email, email `tramnguyen.ops@gmail.com` điền sẵn, focus ở ô Mật khẩu. Khác `account-disabled` (lỗi trên nút sau khi gửi). Nháp của Trâm giữ trong tab nhưng chỉ khôi phục cho Trâm — Trâm không đăng nhập được nên nháp không bao giờ được dùng | SRS REQ-ADMIN-01 (lý do phiên kết thúc, nháp đúng admin) |
| B3 · CAPTCHA không tải được (`W4-EDGE · captcha-error · v1.x`) — **v1.x** (Q16: MVP không CAPTCHA; frame giữ cho lúc làm CAPTCHA) | Lần sai thứ 5, trình chặn quảng cáo chặn dịch vụ xác minh: ở chỗ khối xác minh là khối lỗi `danger` (icon `shield-alert`) "Không tải được bước xác minh. Tải lại trang, hoặc tắt trình chặn quảng cáo cho trang này."; câu "Bạn đã nhập sai nhiều lần…" vẫn ở trên nút; nút bấm được, gửi thì `40105` lại | SRS REQ-ADMIN-01 (edge case W4), REQ-AUTH-02 |

### Chỉ ghi luật (giao diện không đổi)
| Tình huống | Luật |
|---|---|
| A2 · Trâm đăng nhập vào tab Hiếu bỏ dở ở #52 | Về #52 (`next`), panel ở mặc định (W1 `dm-message` trước khi chọn), nháp của Hiếu bị xóa khỏi tab, không có dòng "đã khôi phục" (SRS REQ-ADMIN-01, Q6) |
| A3 · Đăng xuất ở tab khác khi tab này đang mở dialog Gỡ server | Dialog đóng, về đăng nhập `signed-out`; tên server đã gõ không giữ — chỉ nháp panel Quyết định được giữ (SRS REQ-ADMIN-01) |
| B1 · Laptop ngủ qua giờ hết hạn | Thức dậy / tab hiện lại là kiểm `expires_at` ngay, về `session-expired` trước khi vẽ lại dữ liệu cũ (Q4) |
| B2 · Đồng hồ máy lệch | Hẹn giờ hết hạn theo giờ máy chủ: độ lệch = header `Date` của `/admin/auth/me` − giờ máy lúc nhận; không theo đồng hồ máy |
| B4 · Khởi động chờ quá 10 giây | `boot` → `boot-error` ("Không kết nối được máy chủ quản trị." + "Thử lại") |
| B5 · Tải lại `/login?next=/reports/52` | Giữ `next`; khối báo lý do mất (thuộc lần chuyển trang trước); email không còn điền sẵn (bộ nhớ tab đã mất) |
| B6 · Hai tab cùng ở màn đăng nhập sau khi hết hạn | Đăng nhập ở tab A → tab B nhận tin giữa các tab và tự đi tới `next` của nó (cookie đã có) |
| C1 · Enter hai lần | Lần hai bị bỏ qua khi nút đang `loading`; một lần gửi |
| C2 · Mật khẩu vừa bị đặt lại khi đang gõ mật khẩu cũ | `40102` như mọi lần sai — không nói "mật khẩu vừa đổi" (người lạ cũng đọc được) |
| D1 · `Retry-After` < 90 giây | "Thử lại sau 45 giây.", đếm từng giây; ≥ 90 giây đếm theo phút ("38 phút"); dài nhất 60 phút (giới hạn 20 lần / giờ) |
| D2 · Lần sai thứ 4 / 5 | (Q16) Lần 4: khối lỗi `40102` như thường; lần 5 trong 10 phút với cùng email: `rate-limited` "Thử lại sau 10 phút." (đếm từ lần sai thứ 5); sửa sang email khác thì nút bật lại. v1.x: lần 5 thành `captcha` (REQ-AUTH-02) |
| D3 · `next` tới trang không còn | Đăng nhập xong mở `not-found` của trang đó (W1 "Không có việc #…", W2 "Không có người dùng này" / "Không có server này"), không âm thầm về Tổng quan |
| D4 · Email admin rất dài | Ô email cuộn ngang bên trong ô (như mọi ô nhập); khối báo không chứa email nên không vỡ |
| D5 · Trình quản lý mật khẩu tự điền | Nền ô do trình duyệt tô (bước do trình duyệt vẽ); ô giữ viền, nhãn, focus của C-02 |
| Lỗi máy chủ khi đăng nhập (`50000`) | Như `network-error`, chữ "Máy chủ đang gặp lỗi. Thử lại sau ít phút."; mật khẩu giữ |
| Đã đăng nhập mà mở `/login` | Chuyển ngay tới `next` hoặc `/`, không hiện form (Quy ước › URL) |
