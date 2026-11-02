# W2 · Người dùng & Server (web quản trị)

Area thứ hai của web quản trị (CR-27, SRS v1.10). Bốn màn: **danh sách người dùng**, **chi tiết người dùng**, **danh sách server**, **chi tiết server** (kèm dialog Gỡ server). Đây là nơi admin tra một người hoặc một server ngoài một báo cáo cụ thể, và là nơi duy nhất mở khóa sớm, khóa / đặt lại hồ sơ không qua báo cáo, gỡ server không qua báo cáo.

**Nguồn:** SRS v1.10 › REQ-ADMIN-04 (Người dùng), REQ-ADMIN-05 (Server), REQ-ADMIN-01 (luật danh sách), REQ-ADMIN-03 (cách gọi việc, lý do, lời nhắn, ghi chú, biên nhận), REQ-SAFE-02 (khóa, Owner bị khóa vĩnh viễn — DEC-28), REQ-AUTH-10 (chờ xóa 14 ngày), REQ-SRV-05 (xóa server, 30 ngày khôi phục). Diện mạo: `DESIGN.md` › Web quản trị. Component: `00-components.md` › Web quản trị (C-42…C-56). Nhất quán với `w1-bao-cao.md` (thế giới A, luật gọi tên, biên nhận). Hồ sơ nền tảng **web**.

> Trạng thái: **hành vi đã chốt 02/11/2026** (15 câu — mục [Quyết định](#quyết-định-chốt-02112026)); **đã vẽ 02/11/2026** — `Des/nezfocus.pen`, bốn nhóm dưới nhóm edge case của W1: "W2 · Người dùng & Server — S-ADM-USR-01" (x 77706, y 16500), "— S-ADM-USR-02" (y 18700), "— S-ADM-SRV-01" (y 22040), "— S-ADM-SRV-02" (y 24240). Vòng duyệt 1 (trang người dùng) và vòng tự rà phần server (vòng 2) đã áp 02/11/2026 — mục [Quyết định](#quyết-định-chốt-02112026). Sắp xếp (R9) và edge case (bước 6) áp 02/11/2026. **Product Owner duyệt toàn bộ W2 ngày 02/11/2026.**

---

## Quy ước của area

| Hạng mục | Quy ước |
|---|---|
| Khung | **1440 × 900** (chính) và **1024 × 768** cho trạng thái có bố cục đổi theo độ rộng (mỗi màn `default`). Trạng thái còn lại chỉ vẽ ở 1440 |
| Theme khi duyệt | Không phải vertical slice: theme sáng (dẫn dắt); mỗi màn có `default · 1440` bản tối để kiểm nhanh |
| Vị trí trong điều hướng | `AdminSidebar` (C-42): mục **Người dùng** hoặc **Server** đang chọn; badge Báo cáo = **9** (thế giới A lúc 21:55) |
| URL | `/users` (query `q`, `status`, `page`), `/users/{id}`; `/servers` (query `q`, `page`), `/servers/{id}`. Số mục mỗi trang không vào URL, nhớ trong trình duyệt theo bảng (REQ-ADMIN-01). "‹ Người dùng" / "‹ Server" và Back trả về đúng URL danh sách lúc mở |
| Ngày giờ | Như W1: luôn có năm; cột bảng mono "19/10/2026"; trong câu và dải nhãn–giá trị "19/10/2026 lúc 21:46". Ô bảng của danh sách chỉ ghi ngày (C-43: giờ cụ thể chỉ ở trang chi tiết) |
| Số | `numeric-inline`, 0 hiện "–", nghìn có dấu chấm |
| Người | Chỉ **username** (SRS 4.11 "Gọi tên người dùng"). Trang chi tiết người dùng hiện tên hiển thị như **một trường hồ sơ**. Admin gọi bằng tên |
| Mascot | **Không có** trong area (`DESIGN.md` › Web quản trị › Mascot: không ở Người dùng, Server) |
| Màu | Restrained như W1: `danger` cho nút phá hủy (khóa, đặt lại hồ sơ, gỡ server); `warning` chỉ ở icon tạm khóa; `primary` cho nút Mở khóa (không phá hủy) |
| Lớp phủ | `AdminDialog` (C-53): Khóa vĩnh viễn (`confirm`), Gỡ server (`type-name`), bỏ chữ đang gõ khi rời trang (`discard`). Không toast |

### Thế giới mẫu

**Thế giới A, lúc 21:55 Thứ Hai 19/10/2026** (mọi frame trừ khi ghi khác): tiếp nối chuỗi sự kiện của W1 — 21:46 Hiếu khóa khanh.le 7 ngày (tới 26/10/2026 21:46) và xóa tin #57; 21:48 Hiếu gỡ server Chợ tài liệu K22 (#58); 21:50 Hiếu đặt lại hồ sơ của nam.ho (#55). Badge Báo cáo **9** (12 trừ #55, #57, #58). Admin đăng nhập: Hiếu.

**Chuỗi sự kiện của W2 sau 21:55** (các frame thao tác và biên nhận dựa vào): Hiếu tra vu.dang, **21:58** khóa vu.dang **30 ngày** (tới 18/11/2026 21:58), lý do "Lừa đảo", lời nhắn "Gửi link cá cược và nhắn riêng lừa chuyển tiền là vi phạm quy tắc.", ghi chú "Còn #60, #68 đang chờ, chưa đóng."; từ trang của vu.dang mở server **Soi kèo bóng đá** (Owner vu.dang), **22:03** gỡ server, lý do "Spam hoặc quảng cáo", lời nhắn "Server quảng bá cá cược không được phép trên NezFocus.".

**Luật nhất quán dữ liệu:**
- "Báo cáo chờ" của một người = số việc đang chờ có người đó là người bị báo cáo (tin của họ + hồ sơ của họ) — khớp hàng đợi W1 lúc 21:55.
- "Báo cáo chờ" của một server = số việc đang chờ về chính server và về tin trong server (SRS REQ-ADMIN-05; hồ sơ báo cáo từ server không tính — Q6).
- Lịch sử xử lý của một người = các lần **admin** xử lý (C-56): khóa, mở khóa sớm, đặt lại hồ sơ, xóa tin, gỡ server mà người đó là Owner. Bỏ qua và việc của người quản lý server không tính.
- Danh sách người dùng / server xếp **mới tạo trên cùng**; tài khoản đã xóa hẳn và server đã xóa / đã gỡ không có trong danh sách.
- Chờ xóa tới = lúc yêu cầu xóa + 14 ngày (REQ-AUTH-10). Owner của server còn thành viên khác không thể ở trạng thái chờ xóa (REQ-AUTH-10 AC2).
- Không có thời điểm nào muộn hơn "bây giờ" của frame.

**Người dùng (16 người của bộ mẫu, 19/10/2026 21:55):** email theo mẫu đã duyệt ở bản xem trước (`{username}@gmail.com`); mọi người hoạt động gần nhất 19/10/2026 (đều có mặt trong các thế giới 19/10 của W1 / app).

| Username | Tên hiển thị | Tạo lúc | Trạng thái | Báo cáo chờ | Server (vai trò) | Admin xử lý |
|---|---|---|---|---|---|---|
| nam.ho | nam.ho (đặt lại 21:50) | 20/09/2026 10:12 | Hoạt động | – | Ôn thi Giải tích 2 | 1 (#55) |
| minh.do | Minh | 18/09/2026 21:05 | Hoạt động | – | — | 1 (#21) |
| quan.ng | Quân | 16/09/2026 14:40 | Hoạt động | 1 (#63) | Ôn thi Giải tích 2 | 1 (#32) |
| phuc.le | Phúc | 14/09/2026 09:31 | Hoạt động | 3 (#59, #65, #66) | Ôn thi Giải tích 2 | 1 (#45) |
| phong.vu | Phong | 12/09/2026 20:18 | Hoạt động (khóa 1 ngày #54 đã hết 18/10/2026 10:20) | 3 (#52, #62, #67) | Ôn thi Giải tích 2 | 1 (#54) |
| vu.dang | Vũ | 11/09/2026 22:47 | Hoạt động | 2 (#60, #68) | **Soi kèo bóng đá (Owner)**, Nhóm đồ án Mobile | 2 (#56, #46) |
| giang.vo | Giang | 08/09/2026 19:02 | Hoạt động | 1 (#69) | Nhóm đồ án Mobile, Ôn thi Giải tích 2 | 2 (#37, #9) |
| mai.tran | Mai | 07/09/2026 08:15 | Hoạt động | – | Ôn thi Giải tích 2 | – |
| lan.vu | Lan | 06/09/2026 20:40 | Hoạt động | – | **CLB Guitar PTIT (Owner)**, Ôn thi Giải tích 2 | – |
| dung.pham | Dũng | 05/09/2026 16:55 | Hoạt động | – | Ôn thi Giải tích 2, Nhóm đồ án Mobile | – |
| ha.nguyen | Hà | 04/09/2026 11:20 | Hoạt động | – | Ôn thi Giải tích 2, Nhóm đồ án Mobile | – |
| khanh.le | Khánh | 03/09/2026 19:22 | **Bị khóa tới 26/10/2026 21:46** · Gian lận học tập | 1 (#64) | Ôn thi Giải tích 2, Ôn thi Xác suất thống kê | 3 (#58 gỡ server, #57, #23) |
| chi.le | Chi | 02/09/2026 07:48 | Hoạt động | – | **Nhóm đồ án Mobile (Owner)**, **Ôn thi Xác suất thống kê (Owner)**, Ôn thi Giải tích 2 | – |
| an.nguyen | An | 01/09/2026 20:03 | Hoạt động | – | **Ôn thi Giải tích 2 (Owner)**, Nhóm đồ án Mobile, CLB Guitar PTIT | – |
| binh.tran | Bình | 01/09/2026 21:15 | Hoạt động | – | Ôn thi Giải tích 2 | – |
| tuan.hoang | Tuấn | 01/09/2026 22:30 | Hoạt động | 1 (#61) | Ôn thi Giải tích 2, Nhóm đồ án Mobile | – |

(Bình tạo trước Tuấn vài phút: thứ tự cùng ngày theo giờ tạo. "Admin xử lý" tính từ hàng Đã xử lý của W1: #21, #9, #37, #32 là Xóa tin của admin. Hàng #22, #24…#29 và #1…#4 chưa vẽ ở W1 — chốt ở đây là Bỏ qua của Hiếu / Trâm về tin nhắn riêng và hồ sơ ngoài server, không thuộc Ôn thi Giải tích 2.)

**Người dùng nền** (Q2 — chỉ dùng trong danh sách và bộ lọc của web quản trị, để trang đầu "mới tạo trên cùng" có người thật; không xuất hiện trong app):

| Username | Tên hiển thị | Email | Tạo lúc | Hoạt động gần nhất | Trạng thái |
|---|---|---|---|---|---|
| thao.nguyen | Thảo | thao.nguyen2005@gmail.com | 19/10/2026 21:31 | 19/10/2026 | Hoạt động |
| quang.pham | Quang | quangpham.k23@gmail.com | 19/10/2026 18:05 | 19/10/2026 | Hoạt động |
| linh.hoang | Linh | linh.hoang@stu.ptit.edu.vn | 19/10/2026 09:12 | 19/10/2026 | Hoạt động |
| huy.tran | Huy | tranhuy.dev@gmail.com | 18/10/2026 22:47 | 19/10/2026 | Hoạt động |
| ngoc.bui | Ngọc Khánh | ngocbui@gmail.com | 18/10/2026 15:20 | 18/10/2026 | Hoạt động |
| son.dinh | Sơn | son.dinh@gmail.com | 17/10/2026 20:02 | 19/10/2026 | Hoạt động |
| tailieu.giare99 | Tài liệu giá rẻ | tailieugiare99@gmail.com | 17/10/2026 08:03 | 17/10/2026 | Bị khóa vĩnh viễn (Trâm, 17/10/2026 11:30, "Spam hoặc quảng cáo", từ trang Người dùng) |
| trang.vo | Trang | trang.vo@gmail.com | 16/10/2026 19:44 | 19/10/2026 | Hoạt động |
| kiet.ngo | Kiệt | kietngo@gmail.com | 16/10/2026 10:15 | 16/10/2026 | Bị khóa tới 15/11/2026 14:00 (Hiếu khóa 30 ngày lúc 16/10/2026 14:00, "Quấy rối hoặc bắt nạt") |
| yen.ly | Yến | yenly@gmail.com | 15/10/2026 21:30 | 19/10/2026 | Hoạt động |
| khoa.mai | Khoa | khoamai@gmail.com | 15/10/2026 08:50 | 18/10/2026 | Hoạt động |
| hoa.dang | Hoa | hoa.dang@gmail.com | 14/10/2026 13:00 | 18/10/2026 | Chờ xóa tới 01/11/2026 (yêu cầu 18/10/2026 09:00) |
| nhi.phan | Nhi | nhiphan@gmail.com | 13/10/2026 16:25 | 19/10/2026 | Hoạt động |
| duc.le | Đức | ducle@gmail.com | 12/10/2026 11:40 | 17/10/2026 | Hoạt động |
| bao.truong | Bảo | baotruong@gmail.com | 22/09/2026 15:10 | 14/10/2026 | Chờ xóa tới 28/10/2026 (yêu cầu 14/10/2026 20:00) |

Tổng **1.284** người dùng (con số của bản xem trước đã duyệt; W3 dùng lại). Bị khóa = **3** (tailieu.giare99, kiet.ngo, khanh.le). Chờ xóa = **2** (hoa.dang, bao.truong). ngoc.bui có tên hiển thị "Ngọc Khánh": tìm "khanh" không ra ngoc.bui (ô tìm không nhận tên hiển thị — R8, REQ-ADMIN-04 AC2).

**Server** (19/10/2026 21:55; tổng **186**; mới tạo trên cùng; server nền chỉ dùng trong danh sách — Q2):

| Server | Loại | Owner | Thành viên | Kênh | Tạo lúc | Báo cáo chờ |
|---|---|---|---|---|---|---|
| Ôn thi Toán rời rạc | Study Server | quang.pham | 3 | 4 | 19/10/2026 20:14 | – |
| Phòng tự học thư viện | Study Server | linh.hoang | 5 | 4 | 19/10/2026 10:02 | – |
| CLB Tiếng Anh PTIT | Server | huy.tran | 14 | 6 | 18/10/2026 23:05 | – |
| Ôn thi Vật lý 1 | Study Server | ngoc.bui | 9 | 5 | 18/10/2026 16:00 | – |
| Nhóm đồ án Web | Study Server | son.dinh | 4 | 4 | 17/10/2026 21:30 | – |
| Ôn thi Mạng máy tính | Study Server | trang.vo | 11 | 6 | 16/10/2026 20:15 | – |
| Luyện code mỗi tối | Study Server | yen.ly | 22 | 7 | 15/10/2026 22:00 | – |
| Soi kèo bóng đá | Server | vu.dang | 12 | 3 | 14/10/2026 22:40 | – |
| Hội sinh viên K22 | Server | khoa.mai | 57 | 9 | 14/10/2026 09:00 | – |
| Ôn thi Kinh tế chính trị | Study Server | nhi.phan | 16 | 5 | 13/10/2026 19:00 | – |
| Nhóm nghiên cứu AI | Study Server | duc.le | 8 | 5 | 12/10/2026 14:30 | – |
| Ôn thi Xác suất thống kê | Study Server | chi.le | 18 | 7 | 08/10/2026 19:30 | – |
| Ôn thi Giải tích 2 | Study Server | an.nguyen | 24 | 7 | 01/10/2026 08:30 | 3 (#61, #63, #66) |
| Nhóm đồ án Mobile | Study Server | chi.le | 7 | 6 | 25/09/2026 20:00 | 1 (#69) |
| CLB Guitar PTIT | Server | lan.vu | 36 | 5 | 10/09/2026 19:45 | – |

Chợ tài liệu K22 (Owner khanh.le, 41 thành viên, tạo 02/10/2026) đã bị gỡ lúc 21:48 nên không có trong danh sách; trang chi tiết vẫn mở được (`removed`, Q7). Nhóm đồ án Mobile 7 thành viên: An, Chi, Dũng, Giang, Hà, Tuấn, Vũ (Vũ có tin ở #hoi-dap, #thong-bao của server này — W1 #56, #46; frame `many-owned` của 07 dùng "6 thành viên" là thế giới giả định có ghi nhãn).

**Ôn thi Giải tích 2 — việc liên quan:** đang chờ #61 (tin của tuan.hoang, #thong-bao, Khác, 19/10/2026 11:05), #63 (tin của quan.ng, #hoi-dap, Spam hoặc quảng cáo, 14:02), #66 (tin của phuc.le, #tai-lieu, Lừa đảo, 18:30); đã xử lý **12**: #57 (21:46 Hiếu), #48, #47, #44, #41, #40, #35, #32, #19, #12, #10, #7 (#55, #49 là hồ sơ báo cáo từ server — không tính, Q6).

---

## S-ADM-USR-01 · Danh sách người dùng

**Mục đích:** tìm một người (theo username hoặc email — R8) hoặc xem nhóm người bị khóa / chờ xóa.
**REQ:** REQ-ADMIN-04 (tìm, lọc, cột, thứ tự, 25 / 50 / 100), REQ-ADMIN-01 (tìm 300ms, URL, sắp xếp theo cột — R9).
**Mở từ:** mục Người dùng của sidebar (`default`); "‹ Người dùng" và Back từ S-ADM-USR-02 (đúng URL đã rời). **Đi tới:** S-ADM-USR-02 `default` / `locked` / `pending-deletion` theo người được bấm.

### Bố cục (`default`, 1440)
```
┌ AdminSidebar ┬──────────────────────────────────────────────────────────────────────────┐
│ Người dùng   │ Người dùng                                                                 │ PageHeader · list
│ đang chọn    │ [🔍 Tìm username hoặc email        ] [Tất cả|Hoạt động|Bị khóa|Chờ xóa]  │ FilterBar
│ Báo cáo (9)  │ Người dùng        Email                  Trạng thái        Ngày tạo   Hoạt động gần nhất  Báo cáo chờ │
│              │ (T) thao.nguyen   thao.nguyen2005@gm…    Hoạt động         19/10/2026  19/10/2026            – │
│              │ (Q) quang.pham    quangpham.k23@gmail…   Hoạt động         19/10/2026  19/10/2026            – │
│              │ …                                                                           │
│              │ (T) tailieu.giare99 …                    ⊘ Bị khóa vĩnh viễn 17/10/2026 17/10/2026            – │
│              │ (K) kiet.ngo      kietngo@gmail.com      🔒 Bị khóa tới 15/11/2026 …                          │
│              │ Hiện [50 ▾] trong số 1.284 người dùng                     ‹ 1 2 3 4 5 … 26 ›│ Pagination (ngoài khung)
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```
Cột ở 1440 (vùng nội dung 1144): Người dùng 232 · Email 248 · Trạng thái 220 · Ngày tạo 128 · Hoạt động gần nhất 168 · Báo cáo chờ 132 (số, căn phải; đủ chỗ icon sắp xếp). **1024**: ẩn Email và Ngày tạo (C-43 `Table · narrow`). 14 hàng thấy trong khung 900.

### Component
`AdminSidebar`, `PageHeader · list` (C-46), `SearchInput`, `SegmentFilter` (C-45), `DataTable` (C-43), `Pagination` (C-44). Hàng ghép sẵn: master mới `Users/head` + `Users/row` (board C-43, hàng W2): ô Người dùng dựng riêng (avatar 28 + username), còn lại là `Cell · text` / `Cell · status` / `Cell · mono` / `Cell · number`. `loading`: đầu cột + 8 hàng skeleton theo độ rộng từng cột (như W1).

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Người dùng" (Q9: không số tổng — số nằm ở thanh phân trang) |
| Ô tìm | placeholder "Tìm username hoặc email"; nhãn ẩn "Tìm người dùng"; không nhận tên hiển thị (R8) |
| Lọc trạng thái | "Tất cả" · "Hoạt động" · "Bị khóa" · "Chờ xóa" (`SegmentFilter`, mặc định Tất cả) |
| Đầu cột | "Người dùng" · "Email" · "Trạng thái" · "Ngày tạo" · "Hoạt động gần nhất" · "Báo cáo chờ"; ba cột cuối sắp xếp được (`Head · sortable`), mặc định "Ngày tạo" có mũi tên giảm dần (`Head · sorted`) — R9 |
| Ô trạng thái | "Hoạt động" (chữ trơn) · "Bị khóa tới 15/11/2026" (`lock` `warning`) · "Bị khóa vĩnh viễn" (`ban` `danger`) · "Chờ xóa tới 01/11/2026" (`clock` `text-tertiary`) — C-43 |
| Hoạt động gần nhất chưa có | "–" (tài khoản chưa kết nối lần nào) |
| Phân trang | "Hiện [50] trong số 1.284 người dùng" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` (1440 + dark, 1024) | Như bố cục: Tất cả, trang 1, 14 hàng đầu của bảng người dùng nền (thao.nguyen … duc.le) | "trong số 1.284 người dùng" |
| `search` | Gõ "tran": 4 hàng theo thứ tự mới tạo — huy.tran (khớp cả email tranhuy.dev@gmail.com), trang.vo, mai.tran, binh.tran; không phân biệt dấu và hoa thường (AC2); ✕ trong ô | "trong số 4 người dùng" |
| `search-empty` | Gõ "thảo nguyên" không khớp → `Table · empty` | "Không có người dùng nào khớp “thảo nguyên”" · "Xóa tìm kiếm" |
| `locked` | Lọc "Bị khóa": 3 hàng tailieu.giare99, kiet.ngo, khanh.le | "trong số 3 người dùng" |
| `pending-deletion` | Lọc "Chờ xóa": 2 hàng hoa.dang, bao.truong | "trong số 2 người dùng" |
| `filter-empty` | Lọc "Chờ xóa" + gõ "khanh" → `Table · empty` + nút "Xóa bộ lọc" (về Tất cả, giữ ô tìm) | "Không có người dùng nào khớp “khanh” trong Chờ xóa" |
| `sorted` | Bấm "Báo cáo chờ": giảm dần — phuc.le 3, phong.vu 3, vu.dang 2, quan.ng 1, giang.vo 1, khanh.le 1, tuan.hoang 1 (bằng nhau thì mới tạo trước), rồi người "–" theo mới tạo (thao.nguyen … tailieu.giare99); "Ngày tạo" về `sortable`, "Báo cáo chờ" `sorted` ↓; trang 1. Số khớp hàng đợi W1 lúc 21:55 (mọi việc đang chờ đều đã biết) | "trong số 1.284 người dùng" |
| `loading` | `Table · loading`; ô tìm và bộ lọc vẫn dùng được | — |
| `error` | `Table · error` | "Không tải được danh sách." · "Thử lại" |

Dùng lại của W1 (luật chung, không vẽ lại): `page-size-open` / `page-size-25` (S-ADM-RPT-01), `row-hover-focus` (S-ADM-RPT-01). Không áp dụng: `empty` (luôn có người dùng; trống chỉ khi tìm / lọc — `search-empty`, `filter-empty`), `offline`, `forbidden`, `os-permission` (như W1).

### Tương tác
- Bấm hàng / Enter → S-ADM-USR-02; hàng là link (Ctrl / ⌘ + bấm mở tab mới).
- Gõ → tìm sau 300ms, về trang 1, URL `replace`. Đổi lọc → về trang 1, thêm mục lịch sử. "/" đưa focus vào ô tìm (như W1).
- Bấm đầu cột sắp xếp được: lần đầu giảm dần, bấm lại đảo chiều; về trang 1; URL thêm `sort` / `dir` (thêm mục lịch sử như đổi lọc). Ở 1024 cột Ngày tạo ẩn: thứ tự mặc định vẫn mới tạo trước, không cột nào có mũi tên đậm (C-43).
- Thứ tự tab: sidebar → ô tìm → bộ lọc → đầu cột sắp xếp được → hàng → phân trang.

### Checklist duyệt
- [ ] Thứ tự mới tạo trên cùng; ngày mono thẳng cột; "–" thay 0.
- [ ] Tổng Bị khóa 3, Chờ xóa 2 khớp các frame lọc.
- [ ] Không tên hiển thị ở ô Người dùng; kết quả tìm chỉ khớp username / email.
- [ ] 1024: ẩn Email, Ngày tạo; không cuộn ngang.

---

## S-ADM-USR-02 · Chi tiết người dùng

**Mục đích:** nắm một người trong một trang — hồ sơ, trạng thái, các lần admin đã xử lý, báo cáo về họ, server của họ — và khóa / mở khóa / đặt lại hồ sơ.
**REQ:** REQ-ADMIN-04 (chi tiết, hành động, không đóng báo cáo, Owner sau khóa vĩnh viễn), REQ-SAFE-02 (lý do, khóa, DEC-28), REQ-ADMIN-03 (lời nhắn ≤ 200, ghi chú ≤ 500, biên nhận), REQ-AUTH-10 (chờ xóa).
**Mở từ:** hàng của S-ADM-USR-01; "Mở trang người dùng ›" trong `HistoryPopover` của W1 (`default` của người đó); Owner trên S-ADM-SRV-02; (W3) đối tượng trong Nhật ký. **Đi tới:** S-ADM-USR-01 (‹ Người dùng, Back); S-ADM-RPT-02 `default` / `handled` (bấm hàng báo cáo, link "#57" trong lịch sử — không có `CasePager`); S-ADM-SRV-02 (bấm hàng server, link server trong lịch sử); Nhật ký (W3, "Xem trong Nhật ký ›" của biên nhận — đích tạm).

### Bố cục (`default` — vu.dang, 1440)
```
┌ Sidebar ┬──────────────────────────────────────────────────────────┬──────────────────────────────┐
│         │ ‹ Người dùng                                              │ Hành động                    │
│         │ (V) vu.dang                                               │ ○ Khóa tài khoản             │
│         │ ──────────────────────────────────────────────────────── │ ○ Đặt lại hồ sơ              │
│         │ Trạng thái   Email                  Ngày tạo    Hoạt động gần nhất │                      │
│         │ Hoạt động    vu.dang@gmail.com      11/09/2026  19/10/2026        │                      │
│         │                                     lúc 22:47                    │                      │
│         │ ──────────────────────────────────────────────────────── │                              │
│         │ Báo cáo đang chờ (2)                                      │                              │
│         │ #60  Tin nhắn  Lừa đảo              Tin nhắn riêng  19/10/2026 09:30 │                   │
│         │ #68  Hồ sơ     Spam hoặc quảng cáo  Ngoài server    19/10/2026 20:48 │                   │
│         │ Xem 4 việc đã xử lý về vu.dang ›                          │                              │
│         │ Lịch sử xử lý (2)                                         │                              │
│         │ Xóa tin   Lúc 18/10/2026 20:05 · Admin Hiếu · Việc #56 …  │ (bộ 6 dòng cố định, C-56)    │
│         │ Hồ sơ  · Sửa lần cuối 12/10/2026 lúc 23:10                │ [  Chọn một hành động   ] ░  │
│         │ [(V) Vũ  Kèo thơm mỗi ngày, inbox nhận link]              │                              │
│         │ Server (2)                                                │                              │
└─────────┴──────────────────────────────────────────────────────────┴──────────────────────────────┘
```
Cột trái cuộn theo trang; cột phải là `DecisionPanel` (C-50) 360 (320 ở 1024), ghim như W1, **không có `SubjectCard`** (hồ sơ đã ở cột trái) (Q4). **Thứ tự khối cột trái (duyệt W2, 02/11/2026):** dải nhãn–giá trị → Báo cáo đang chờ → Lịch sử xử lý → Hồ sơ → Server — việc cần làm ngay đứng trước, lịch sử dài không đẩy báo cáo xuống. **Danh sách dài:** khối Báo cáo đang chờ và khối Lịch sử hiện 5 mục (báo cáo cũ nhất trước, lịch sử mới nhất trước) rồi nút `text` "Xem thêm {n} việc" / "Xem thêm {n} lần" mở hết tại chỗ; chỉ trang cuộn, không có vùng cuộn lồng trong khối. Cột trái rộng 744 ở 1440: bảng Mã 72 · Đối tượng 120 · Lý do (giãn) · Nơi 184 · Báo cáo đầu 152. **1024** (cột trái 396): bảng báo cáo chỉ giữ Mã · Đối tượng 100 · Lý do; bảng Server chỉ giữ Server · Vai trò (đo trên canvas 02/11/2026: thêm cột nào chữ cũng đè cột kế bên).

### Component
`AdminSidebar`, `PageHeader · detail` + `BackLink` (C-46; tiêu đề = avatar 40 + username qua ô `PHD avatar` mới của master, tắt sẵn; không mã việc, không `CasePager`, không chip — trạng thái nằm ở dải), `KeyValueStrip` 4–5 ô (C-47; ô Email rộng 300, các ô khác chia đều; không icon), thẻ hồ sơ `ProfileCard/compact` (master mới, C-48), `HistoryItem` (C-56, bộ 6 dòng cố định) xếp thành danh sách, `DataTable` (C-43: hàng báo cáo dựng từ `Queue/row` bỏ cột thừa; hàng server `UserServer/row`), `DecisionPanel` (C-50: `ActionOption`, `SegmentFilter`, `SelectField`, `TextArea`, `Receipt`, `Button`), `AdminDialog` (C-53).

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| BackLink | "Người dùng" |
| Tiêu đề | avatar 40 + "vu.dang" (`title-1`) |
| Dải nhãn–giá trị | **(duyệt W2)** không icon. "Trạng thái": "Hoạt động" / "Bị khóa tới 26/10/2026" + dòng phụ "lúc 21:46" / "Bị khóa vĩnh viễn" / "Chờ xóa tới 01/11/2026" + "lúc 09:00" (cùng mẫu với "Ngày tạo") · "Lý do khóa" (chỉ khi đang bị khóa: "Gian lận học tập") · "Email" (ô rộng 300) · "Ngày tạo" ("11/09/2026" + "lúc 22:47") · "Hoạt động gần nhất" ("19/10/2026"). Không có ô "Báo cáo chờ" (khối Báo cáo đang chờ ngay bên dưới đã có số) |
| Khối Hồ sơ | tiêu đề "Hồ sơ" + dòng phụ "Bản hiện tại, sửa lần cuối 12/10/2026 lúc 23:10." (`users.profile_updated_at`; chưa sửa lần nào: "Bản hiện tại, chưa sửa từ khi tạo tài khoản."); thẻ `ProfileCard/compact`: avatar 48, tên hiển thị (`headline`), giới thiệu (trống: "Chưa viết giới thiệu" `text-tertiary`); banner chỉ khi người dùng có banner; không có username (đã ở tiêu đề) |
| Khối Lịch sử | "Lịch sử xử lý ({n})" (không ghi "(0)") + dòng phụ "Chỉ tính các lần admin xử lý."; mỗi lần là `HistoryItem`: tiêu đề hành động ("Khóa tài khoản 7 ngày, xóa tin" / "Đặt lại hồ sơ" / "Gỡ server Chợ tài liệu K22" / "Mở khóa") rồi **luôn đủ 6 dòng** theo thứ tự Lúc · Admin · Việc ("#57" link `primary` / "Từ trang người dùng") · Lý do · Lời nhắn · Ghi chú, dòng trống ghi "–" (C-56, duyệt W2); 5 mục rồi "Xem thêm {n} lần"; không có lần nào: "Chưa từng bị admin xử lý." |
| Khối Báo cáo | **(duyệt W2)** chỉ việc **đang chờ**: "Báo cáo đang chờ ({n})"; cột Mã · Đối tượng · Lý do · Nơi · Báo cáo đầu (thứ tự cột của `Queue/row`; Đối tượng chỉ ghi loại "Tin nhắn" / "Hồ sơ" vì người đã rõ); cả hàng là link (C-43 — mã không xanh, như hàng đợi W1); 5 hàng cũ nhất rồi "Xem thêm {n} việc"; trống: "Không có việc nào đang chờ.". Dưới bảng: link `primary` "Xem {n} việc đã xử lý về {username} ›" (chỉ khi n > 0) → S-ADM-RPT-01 tab Đã xử lý, ô tìm điền sẵn username — gồm cả Bỏ qua và việc người quản lý server xử lý, những thứ Lịch sử không tính |
| Khối Server | "Server ({n})"; cột "Server" (icon 24 + tên) · "Vai trò" ("Owner" / "Thành viên") · "Thành viên" (số) · "Vào server" (mono ngày); Owner xếp trước, rồi theo ngày vào mới nhất; 5 server rồi nút `text` "Xem thêm {n} server" mở hết tại chỗ (tối đa 100 server / người — edge case C4); không có: "Chưa ở server nào." |
| Panel — nhóm | "Hành động" · "Thời hạn khóa" (1 ngày · 7 ngày · 30 ngày · Vĩnh viễn) · "Lý do {username} sẽ thấy" (ô chọn trống "Chọn lý do") · "Lời nhắn cho {username} (không bắt buộc)" · "Ghi chú nội bộ (chỉ admin thấy)" |
| Panel — lựa chọn theo trạng thái | Hoạt động: "Khóa tài khoản" · "Đặt lại hồ sơ". Bị khóa: "Mở khóa" · "Khóa tài khoản" · "Đặt lại hồ sơ". Chờ xóa (edge case E0): "Khóa tài khoản" · "Đặt lại hồ sơ" vô hiệu kèm dòng "Hồ sơ bị xóa cùng tài khoản."; dòng `info` luôn hiện (xem `pending-deletion`) |
| Dòng báo cáo còn chờ (Q10) | khi chọn Khóa / Đặt lại hồ sơ và người này có việc đang chờ: `info` (ô `DP info` mới của master C-50) "Khóa từ đây không đóng 2 việc đang chờ về vu.dang (#60, #68)." / "Đặt lại hồ sơ từ đây không đóng 3 việc đang chờ về phuc.le (#59, #65, #66)." |
| Nút xác nhận | "Chọn một hành động" (vô hiệu) · "Khóa vu.dang 30 ngày" · "Khóa vĩnh viễn vu.dang" (mở dialog) · "Đặt lại hồ sơ của vu.dang" · "Mở khóa khanh.le" (`primary`) |
| Biên nhận | "Hiếu đã khóa vu.dang 30 ngày" · Lúc "19/10/2026 21:58" / Lý do / Lời nhắn / Ghi chú (bộ dòng cố định C-50, cùng thứ tự với mục lịch sử mới) · "Xem trong Nhật ký ›" · nút `secondary` "Hành động khác" (Q4) |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` (1440 + dark, 1024) | vu.dang lúc 21:55, chưa chọn hành động | "Chọn một hành động" |
| `scrolled` | Trang cuộn tới đáy: thấy trọn Lịch sử (2), Hồ sơ và Server (Soi kèo bóng đá Owner, Nhóm đồ án Mobile) | — |
| `suspend` | Chọn Khóa tài khoản, 30 ngày, lý do chưa chọn; dòng báo cáo còn chờ | "Khóa vu.dang 30 ngày" |
| `missing-reason` | Bấm nút khi chưa chọn lý do: C-50 `missing-reason` (viền `danger` trên ô chọn, focus về ô) | "Chọn lý do vu.dang sẽ thấy" |
| `suspend-filled` | Lý do "Lừa đảo", lời nhắn và ghi chú đã gõ (chuỗi W2); panel vừa khung 900, không cuộn | lời nhắn 66/200 · ghi chú 33/500 |
| `permanent-confirm` | Chọn Vĩnh viễn → bấm → `AdminDialog · confirm` có câu Owner | Xem Dialog |
| `receipt` | 21:58: panel thành biên nhận; dải "Trạng thái" thành "Bị khóa tới 18/11/2026" + "lúc 21:58", thêm ô "Lý do khóa" "Lừa đảo"; Báo cáo đang chờ vẫn 2; Lịch sử xử lý (3) có lần mới trên cùng (Việc "Từ trang người dùng") | Biên nhận như bảng chữ |
| `locked` | khanh.le lúc 21:55: dải "Bị khóa tới 26/10/2026" + "lúc 21:46", ô "Lý do khóa" "Gian lận học tập"; Báo cáo đang chờ (1) #64 + link "Xem 2 việc đã xử lý về khanh.le ›"; hồ sơ "sửa lần cuối 11/10/2026 lúc 09:05" (viết lại giới thiệu sau lần đặt lại #23); Lịch sử (3): Gỡ server Chợ tài liệu K22 (21:48, #58), Khóa tài khoản 7 ngày, xóa tin (21:46, #57, lời nhắn + ghi chú), Đặt lại hồ sơ (10/10/2026 14:20, #23); panel có "Mở khóa" đứng đầu | — |
| `unlock` | Như `locked`, chọn Mở khóa: chỉ còn Ghi chú nội bộ; nút `primary` | "Mở khóa khanh.le" · dòng `info` "khanh.le đăng nhập được ngay sau khi mở khóa." |
| `permanent` | tailieu.giare99: dải "Bị khóa vĩnh viễn", ô "Lý do khóa" "Spam hoặc quảng cáo"; hồ sơ "Tài liệu giá rẻ" · "Đề thi có đáp án mọi môn, nhắn riêng để mua" (sửa lần cuối 17/10/2026 lúc 08:10); Lịch sử (1) "Khóa tài khoản vĩnh viễn" — Trâm 17/10/2026 11:30, Việc "Từ trang người dùng", ghi chú "Nhắn riêng hàng loạt cho thành viên mới để bán đề thi."; Báo cáo đang chờ trống, không có link đã xử lý; Server (0); chọn Mở khóa, dòng `info` "tailieu.giare99 đăng nhập được ngay sau khi mở khóa." | "Mở khóa tailieu.giare99" (người từng là Owner: thêm dòng "Quyền Owner đã chuyển khi khóa vĩnh viễn không được trả lại." — AC1) |
| `reset-profile` | phuc.le: chọn Đặt lại hồ sơ, lý do chưa chọn; thẻ hồ sơ hiện bản hiện tại ("Phúc" · "Hỗ trợ kỹ thuật NezFocus, nhắn riêng để được cấp tài khoản Pro" — lý do của #59 Mạo danh; sửa lần cuối 18/10/2026 lúc 23:40, sau lần đặt lại #45); Lịch sử (1) #45; Đang chờ 3 (#59, #65, #66) + "Xem 3 việc đã xử lý về phuc.le ›" | "Đặt lại hồ sơ của phuc.le" |
| `pending-deletion` | hoa.dang: dải "Chờ xóa tới 01/11/2026" + "lúc 09:00"; **(E0)** panel có "Khóa tài khoản" (chưa chọn) và "Đặt lại hồ sơ" vô hiệu; dòng `info` (`clock`) luôn hiện; thẻ hồ sơ hiện như tài khoản thường (admin vẫn thấy hồ sơ thật) | "Tài khoản đang chờ xóa tới 01/11/2026 lúc 09:00. Khóa thì hoa.dang không đăng nhập để hủy yêu cầu được nữa; tài khoản tự xóa đúng hạn." |
| `history-empty` | an.nguyen: "Chưa từng bị admin xử lý." (tiêu đề không có số); "Không có việc nào đang chờ.", không link đã xử lý; hồ sơ sửa lần cuối 03/10/2026 lúc 21:00; Server (3): Ôn thi Giải tích 2 (Owner, 01/10/2026), Nhóm đồ án Mobile (25/09/2026), CLB Guitar PTIT (12/09/2026) | — |
| `deleted-account` | Link (Nhật ký W3) tới tài khoản đã xóa hẳn: tiêu đề avatar `deleted` + "Tài khoản đã bị xóa"; dải chỉ một ô "Trạng thái" "Đã xóa ngày 15/10/2026" + dòng phụ "Yêu cầu xóa ngày 01/10/2026" (không icon); không hồ sơ, không báo cáo, không server; Lịch sử xử lý (1) "Khóa tài khoản 7 ngày" — Lúc "21/09/2026 10:05", Admin "Trâm", Việc "Từ trang người dùng", Lý do "Spam hoặc quảng cáo"; cột phải chỉ khối chữ | "Tài khoản này đã bị xóa hẳn. Hồ sơ và email không còn; chỉ giữ các lần admin xử lý." (Q12) |
| `not-found` | `/users/{id}` không tồn tại: vùng nội dung báo lỗi, nút `secondary` "Về danh sách người dùng" | "Không có người dùng này" |
| `loading` | skeleton của W1 `S-ADM-RPT-02 · loading` (dải, khối lớn, các khối; panel), BackLink "Người dùng" | — |
| `load-error` | như W1 `load-error` | "Không tải được người dùng này." · "Thử lại" |
| `submitting` · `error` | Không vẽ lại: panel giống hệt W1 `S-ADM-RPT-02 · submitting` / `error` (C-50) | "Chưa xử lý được. Thử lại." |

### Dialog (C-53) trong màn
| Dialog | Chữ |
|---|---|
| Khóa vĩnh viễn | "Khóa vĩnh viễn vu.dang?" · "vu.dang không đăng nhập được nữa cho tới khi admin mở khóa." · "vu.dang là Owner của Soi kèo bóng đá. Quyền Owner tự chuyển cho thành viên có vai trò cao nhất, và không trả lại khi mở khóa." (nhiều server: "là Owner của 2 server: Nhóm đồ án Mobile, Ôn thi Xác suất thống kê."; hơn 3 server: kể 3 tên đầu theo ngày tạo rồi "và {n} server khác" — edge case C6) · "Hủy" / "Khóa vĩnh viễn" (`danger`) |
| Bỏ chữ đang gõ (`discard`) | rời trang (BackLink, link trong trang; Back / tải lại / đóng tab của trình duyệt không hỏi) khi panel có lời nhắn / ghi chú chưa xác nhận: "Bỏ lời nhắn đang viết?" · "Lời nhắn và ghi chú bạn đã gõ cho vu.dang sẽ mất." · "Ở lại" / "Bỏ và rời trang" (`primary`) (Q13) |

### Tương tác
- Mở trang: focus ở tiêu đề. Thứ tự tab: sidebar → BackLink → dải → hàng báo cáo → "Xem thêm" → "Xem {n} việc đã xử lý" → lịch sử (link #mã, "Xem thêm") → hàng server → panel → nút xác nhận.
- Đổi lựa chọn trong panel giữ chữ đã gõ ở ô dùng chung (Ghi chú) — như W1.
- Sau biên nhận, "Hành động khác" đưa panel về chưa chọn (biên nhận vẫn nằm trong Lịch sử xử lý).
- Không có phím J / K, không "/" (trang chi tiết).

### Checklist duyệt
- [ ] Lịch sử khớp số lần trong bảng thế giới mẫu; không có Bỏ qua, không có việc của người quản lý.
- [ ] Số ở "Báo cáo đang chờ ({n})" = cột Báo cáo chờ của danh sách; số trong link đã xử lý khớp tab Đã xử lý của W1.
- [ ] Mọi mục lịch sử đủ 6 dòng cùng thứ tự; dải không có icon.
- [ ] Lý do không chọn sẵn ở mọi frame của màn này (khác W1).
- [ ] Nút xác nhận đúng nhãn hậu quả; Mở khóa `primary`, còn lại `danger`.
- [ ] Không tin nhắn, DM, bạn bè ở đâu trên trang (AC3).

---

## S-ADM-SRV-01 · Danh sách server

**Mục đích:** tìm một server theo tên, thấy server nào đang có báo cáo chờ.
**REQ:** REQ-ADMIN-05 (tìm, cột, thứ tự, 25 / 50 / 100, ẩn server đã xóa / gỡ), REQ-ADMIN-01.
**Mở từ:** mục Server của sidebar; "‹ Server" / Back từ S-ADM-SRV-02. **Đi tới:** S-ADM-SRV-02 `default`.

### Bố cục (`default`, 1440)
```
│ Server                                                                             │
│ [🔍 Tìm tên server              ]                                                  │
│ Server                        Owner          Ngày tạo     Thành viên   Báo cáo chờ │
│ [ÔT] Ôn thi Toán rời rạc      quang.pham     19/10/2026            3             – │
│ …                                                                                  │
│ [ÔG] Ôn thi Giải tích 2       an.nguyen      01/10/2026           24             3 │
│ Hiện [50 ▾] trong số 186 server                              ‹ 1 2 3 4 ›            │
```
Cột ở 1440: Server (giãn) · Owner 220 · Ngày tạo 160 · Thành viên 120 (số) · Báo cáo chờ 140 (số) — **(S7)** ngày đứng trước, hai cột số cạnh nhau bên phải như danh sách người dùng (số căn phải đứng ngay trước ngày căn trái thì dính nhau). **1024**: ẩn Ngày tạo. Không có bộ lọc (SRS không có). Hàng: master mới `Servers/head` + `Servers/row` (board C-43); ô Server = icon server 28 (`radius-server`, hai chữ cái đầu như app) + tên; ô Owner = `Cell · person`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Server" |
| Ô tìm | "Tìm tên server"; nhãn ẩn "Tìm server" |
| Đầu cột | "Server" · "Owner" · "Ngày tạo" · "Thành viên" · "Báo cáo chờ"; ba cột cuối sắp xếp được, mặc định "Ngày tạo" giảm dần — R9 |
| Phân trang | "Hiện [50] trong số 186 server" |

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `default` (1440 + dark, 1024) | 14 hàng đầu (Ôn thi Toán rời rạc … Nhóm đồ án Mobile) | "trong số 186 server" |
| `search` | Gõ "on thi": 6 hàng (Ôn thi Toán rời rạc, Ôn thi Vật lý 1, Ôn thi Mạng máy tính, Ôn thi Kinh tế chính trị, Ôn thi Xác suất thống kê, Ôn thi Giải tích 2) — không phân biệt dấu | "trong số 6 server" |
| `search-empty` | Gõ "chợ tài liệu": không khớp (đã gỡ không hiện) | "Không có server nào khớp “chợ tài liệu”" · "Xóa tìm kiếm" |
| `sorted` | Bấm "Báo cáo chờ": Ôn thi Giải tích 2 (3), Nhóm đồ án Mobile (1), rồi server "–" theo mới tạo (Ôn thi Toán rời rạc … Ôn thi Xác suất thống kê); chỉ hai server có việc chờ vì hàng đợi W1 đã biết đủ. (Không vẽ theo Thành viên: bộ mẫu chỉ biết 15 trong 186 server, không chứng minh được server nào đông nhất) | "trong số 186 server" |
| `loading` / `error` | như S-ADM-USR-01; skeleton icon server là ô vuông bo `radius-server`, không phải hình tròn (S8) | — |

Không áp dụng: `empty` (luôn có server), lọc (không có), `offline`, `forbidden`, `os-permission`.

### Checklist duyệt
- [ ] Mới tạo trên cùng; Soi kèo bóng đá có (trước 22:03), Chợ tài liệu K22 không.
- [ ] "Báo cáo chờ" của Ôn thi Giải tích 2 = 3, Nhóm đồ án Mobile = 1.

---

## S-ADM-SRV-02 · Chi tiết server

**Mục đích:** xem một server ở mức admin được thấy (không nội dung kênh, không danh sách thành viên), các việc liên quan, và gỡ server khi cần.
**REQ:** REQ-ADMIN-05 (chi tiết, Gỡ server, `server_removed`, đóng việc liên quan), REQ-SRV-05.
**Mở từ:** hàng S-ADM-SRV-01; hàng server ở S-ADM-USR-02; link server trong lịch sử xử lý; (Q14) tên server ở `SubjectCard/server` của W1. **Đi tới:** S-ADM-USR-02 (Owner); S-ADM-RPT-02 (hàng việc); S-ADM-SRV-01 (‹ Server).

### Bố cục (`default` — Ôn thi Giải tích 2, 1440)
```
┌ Sidebar ┬──────────────────────────────────────────────────────────┬──────────────────────────────┐
│         │ ‹ Server                                                  │ Hành động                    │
│         │ [ÔG] Ôn thi Giải tích 2                                   │ ○ Gỡ server                  │
│         │ ──────────────────────────────────────────────────────── │                              │
│         │ Trạng thái  Owner      Loại          Thành viên  Kênh  Ngày tạo │                         │
│         │ Hoạt động   an.nguyen  Study Server          24     7  01/10/2026│                         │
│         │                                                     lúc 08:30   │                         │
│         │ ──────────────────────────────────────────────────────── │                              │
│         │ Báo cáo đang chờ (3)                                      │                              │
│         │ Về server này và về tin trong server.                     │                              │
│         │ #61 Tin nhắn của tuan.hoang  Khác  #thong-bao  …          │                              │
│         │ (Lịch sử xử lý — chỉ khi server đã bị gỡ)                 │                              │
│         │ Báo cáo đã xử lý (12)  #57 … (5 hàng + "Xem thêm 7 việc") │ [  Chọn một hành động   ] ░  │
└─────────┴──────────────────────────────────────────────────────────┴──────────────────────────────┘
```
Cùng khung hai cột như trang việc và trang người dùng (Q4); panel chỉ có một lựa chọn "Gỡ server" (giữ dạng lựa chọn như trang người dùng: chọn rồi mới hiện form, khó bấm nhầm hành động phá hủy). **Thứ tự khối (vòng 2):** dải → Báo cáo đang chờ → Lịch sử xử lý (chỉ khi đã gỡ) → Báo cáo đã xử lý — cùng tên khối, cùng thứ tự "việc cần làm trước, lịch sử sau" với trang người dùng.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| BackLink | "Server" |
| Tiêu đề | icon server 40 + tên (`title-1`); **không chip** — trạng thái nằm ở dải như trang người dùng (S1) |
| Dải | **(vòng 2)** "Trạng thái" ("Hoạt động" / "Đã gỡ ngày 19/10/2026" + "lúc 22:03" / "Chờ xóa tới 18/11/2026" + "lúc 11:20" khi Owner đã xóa — lúc xóa + 30 ngày khôi phục, REQ-SRV-05) · "Lý do gỡ" (chỉ khi đã gỡ, như "Lý do khóa") · "Owner" (username, chữ link `primary`; Owner đang bị khóa thêm dòng phụ đúng câu của trang người dùng: "Bị khóa tới 18/11/2026" / "Bị khóa vĩnh viễn") · "Loại" ("Study Server" / "Server") · "Thành viên" (số) · "Kênh" (số) · "Ngày tạo" ("01/10/2026" + "lúc 08:30"). 6 ô, 7 ô khi đã gỡ — ô rộng theo chữ, dàn đều (C-47, dải từ 6 ô). **1024:** ẩn "Loại". Không có "Mô tả" (Q1) |
| Khối báo cáo | **(vòng 2)** hai khối cùng tên với trang người dùng: "Báo cáo đang chờ ({n})" + dòng phụ "Về server này và về tin trong server." (Q6) — Mã · Đối tượng · Lý do · Nơi (= #kênh; việc về chính server ghi "–") · Báo cáo đầu; trống "Không có việc nào đang chờ." — và "Báo cáo đã xử lý ({n})" — Mã · Đối tượng · Kết quả · Người xử lý · Xử lý lúc; trống "Chưa có việc nào đã xử lý.". Không ghi "(0)". 5 hàng + "Xem thêm {n} việc". Cột 1440: Đối tượng 216, Người xử lý 150, cột ngày 144, Lý do / Kết quả giãn và **xuống tối đa 2 dòng, không cắt** (C-43, S6); 1024: Mã · Đối tượng 200 · Lý do / Kết quả (2 dòng). Trang server giữ khối đã xử lý (không có link sang trang Báo cáo như trang người dùng: ô tìm Báo cáo không tìm được theo server) |
| Khối Lịch sử (chỉ khi đã gỡ) | **(vòng 2)** "Lịch sử xử lý (1)" + dòng phụ "Các lần admin xử lý chính server này."; một `HistoryItem` (C-56, đủ 6 dòng) tiêu đề "Gỡ server": Lúc · Admin · Việc ("#58" link khi gỡ qua báo cáo / "Từ trang server") · Lý do · Lời nhắn · Ghi chú. Server không có hành động admin nào khác nên server chưa gỡ không có khối này. Lần gỡ qua báo cáo còn hiện ở "Báo cáo đã xử lý" (hàng #58 "Gỡ server"): một bên là hành động lên server, một bên là việc báo cáo đã đóng |
| Panel | "Hành động": "Gỡ server"; chọn → "Lý do {Owner} sẽ thấy" ("Lý do vu.dang sẽ thấy", như W1; trống "Chọn lý do") · "Lời nhắn cho {Owner} (không bắt buộc)" · "Ghi chú nội bộ (chỉ admin thấy)"; dòng `info` "{n} việc đang chờ sẽ đóng với kết quả “Server đã bị gỡ”." khi có việc chờ |
| Nút | "Chọn một hành động" · "Gỡ server {tên}" (`danger`, luôn mở dialog `type-name`); tên dài: nút xuống tối đa 2 dòng rồi cắt "…" — dialog vẫn ghi đủ tên (edge case C2) |
| Biên nhận | "Hiếu đã gỡ server Soi kèo bóng đá" · Lúc "19/10/2026 22:03" / Lý do / Lời nhắn / Ghi chú "–" (bộ dòng cố định C-50, S3) · "Xem trong Nhật ký ›"; không có nút tiếp (server không còn hành động); chỉ hiện ngay sau khi gỡ |
| Cột phải khi server đã gỡ (mở lại sau) | khối chữ như `pending-deletion` của trang người dùng (S4): "Server đã bị gỡ nên không còn hành động nào. Thành viên không vào được nữa và Owner không khôi phục được." |

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `default` (1440 + dark, 1024) | Ôn thi Giải tích 2, chưa chọn | — |
| `no-reports` | Soi kèo bóng đá lúc 22:00: Trạng thái "Hoạt động"; Owner vu.dang + dòng phụ "Bị khóa tới 18/11/2026"; 12 thành viên, 3 kênh, Server; hai khối báo cáo trống | "Không có việc nào đang chờ." · "Chưa có việc nào đã xử lý." |
| `remove-selected` | Soi kèo bóng đá, chọn Gỡ server, lý do "Spam hoặc quảng cáo", lời nhắn đã gõ | "Gỡ server Soi kèo bóng đá" |
| `remove-confirm` | Bấm nút → `AdminDialog · type-name`, đã gõ đúng tên (nút bấm được); bản trống dùng frame của W1 | Xem Dialog |
| `removed` | Soi kèo bóng đá lúc 22:03 ngay sau xác nhận: panel thành biên nhận; dải "Trạng thái" thành "Đã gỡ ngày 19/10/2026" + "lúc 22:03", thêm ô "Lý do gỡ" "Spam hoặc quảng cáo"; khối "Lịch sử xử lý (1)" xuất hiện (Việc "Từ trang server", Ghi chú "–") — như trang người dùng sau khi khóa (Q7) | "Hiếu đã gỡ server Soi kèo bóng đá" |
| `removed-earlier` | Chợ tài liệu K22 mở lúc 21:55 (từ lịch sử của khanh.le): dải "Đã gỡ ngày 19/10/2026" + "lúc 21:48", "Lý do gỡ" "Gian lận học tập", Owner khanh.le + "Bị khóa tới 26/10/2026", Server, 41 thành viên, 5 kênh, tạo 02/10/2026 lúc 15:20; Báo cáo đang chờ trống; Lịch sử xử lý (1) "Gỡ server" — 19/10/2026 21:48, Hiếu, #58, Gian lận học tập, lời nhắn "Server chia sẻ đề thi có đáp án là vi phạm quy tắc học tập.", Ghi chú "–"; Báo cáo đã xử lý (1) #58 "Gỡ server"; cột phải là khối chữ (S4), không biên nhận | — |
| `owner-deleted` | **Thế giới F** (21:40, badge 12): Chợ tài liệu K22 Owner xóa lúc 19/10/2026 11:20, #58 còn chờ: dải "Trạng thái" "Chờ xóa tới 18/11/2026" + "lúc 11:20" (thay chip và ô "Owner xóa lúc"; Q7, S1), Owner khanh.le (chưa bị khóa lúc 21:40), Server, 41 thành viên, 5 kênh, Ngày tạo; Báo cáo đang chờ (1) #58; "Gỡ server" đang chọn kèm dòng "Server đang chờ xóa; gỡ thì Owner không khôi phục được nữa." (W1 A3) và `info` "1 việc đang chờ sẽ đóng với kết quả “Server đã bị gỡ”." | "Gỡ server Chợ tài liệu K22" |
| `not-found` | id không có (server đã xóa hẳn sau 30 ngày) | "Không có server này" · "Về danh sách server" |
| `loading` / `load-error` | như S-ADM-USR-02, BackLink "Server" | "Không tải được server này." |
| `submitting` / `error` | Không vẽ lại: trạng thái của dialog `type-name` trên board C-53 | "Chưa xử lý được. Thử lại." |

### Dialog (C-53)
| Dialog | Chữ |
|---|---|
| Gỡ server | "Gỡ server Soi kèo bóng đá?" · "12 thành viên mất server này ngay. Phòng học và cuộc gọi đang diễn ra trong server kết thúc. Không khôi phục được." · "vu.dang (Owner) nhận thông báo và email kèm lý do." · ô "Gõ tên server để xác nhận" · "Hủy" / "Gỡ server" — đúng mẫu W1; thêm câu "3 việc đang chờ sẽ đóng." khi có việc chờ |

### Checklist duyệt
- [ ] Không có nội dung kênh, danh sách thành viên.
- [ ] Số "Đang chờ" = cột Báo cáo chờ của danh sách.
- [ ] Biên nhận gỡ server không có nút tiếp, đủ 4 dòng; không chip — dải "Trạng thái" "Đã gỡ…" / "Chờ xóa tới…".
- [ ] Tên khối, thứ tự khối, câu "Bị khóa tới …" giống trang người dùng; Lý do / Kết quả không bị cắt.

---

## Ma trận trạng thái chuẩn

| State | USR-01 | USR-02 | SRV-01 | SRV-02 |
|---|---|---|---|---|
| `default` | ✔ | ✔ | ✔ | ✔ |
| `loading` | ✔ | ✔ | ✔ | ✔ |
| `empty` | ✗ luôn có người dùng; trống do tìm / lọc là `search-empty` / `filter-empty` | ✗ (khối trống có câu riêng) | ✗ luôn có server; `search-empty` | ✗ (`no-reports`) |
| `error` | ✔ | ✔ `load-error`, `error` khi xử lý | ✔ | ✔ |
| `offline` | ✗ như W1 (= `error`) | ✗ | ✗ | ✗ |
| `forbidden` | ✗ một cấp admin | ✗ | ✗ | ✗ |
| `os-permission` | ✗ | ✗ | ✗ | ✗ |
| Nghiệp vụ | `search`, `locked`, `pending-deletion`, `filter-empty` | `suspend` … `history-empty`, `deleted-account`, `not-found` | `search` | `no-reports` … `owner-deleted`, `not-found` |

## Ai thấy gì

| Sự kiện | Người bị xử lý | Người khác | Nơi sở hữu luật |
|---|---|---|---|
| Hiếu khóa vu.dang 30 ngày từ trang Người dùng | Bị đăng xuất; đăng nhập → dialog "Tài khoản đang bị khóa" + "Lý do: Lừa đảo" + lời nhắn | Người báo cáo #60, #68: **không** có gì (việc chưa đóng); người quản lý server: không thấy gì | 01 › S-AUTH-04 `suspended` (đã có) |
| Hiếu mở khóa khanh.le | Đăng nhập được ngay; không có mục hộp thư (Q10b) | — | SRS REQ-ADMIN-04 |
| Hiếu đặt lại hồ sơ từ trang Người dùng | Mục `profile_reset` | — | 06 `profile-reset` (đã có) |
| Hiếu gỡ Soi kèo bóng đá | vu.dang: mục `server_removed` + email (thấy khi hết khóa) | 12 thành viên mất server (như Owner xóa, 02 S-HOME-EDGE) | 06 `server-removed`, 02 (đã có) |

---

## Quyết định (chốt 02/11/2026)

Product Owner đồng ý cả 15 khuyến nghị ngày 02/11/2026; cột cuối là nơi đã ghi. Đã tra trước: luật danh sách (REQ-ADMIN-01, C-43…C-45), gọi tên (SRS 4.11), biên nhận / lý do / lời nhắn (W1, C-50), dialog (C-53) — không hỏi lại.

| # | Câu hỏi | Khuyến nghị | Nơi sở hữu nếu đồng ý |
|---|---|---|---|
| Q1 | REQ-ADMIN-05 ghi chi tiết server có "mô tả", nhưng app MVP không có chỗ nhập mô tả (08 Q15, README › Phần để sau) — cột luôn trống | Bỏ "mô tả" khỏi REQ-ADMIN-05 và khỏi danh sách trường "đã đổi" của C-48 | SRS; C-48 |
| Q2 | Danh sách "mới tạo trên cùng" cần người và server tạo gần đây, bộ mẫu 16 người không đủ | Thêm "người dùng nền" (15) và "server nền" (11) như bảng trên, chỉ dùng trong danh sách / bộ lọc của web quản trị; ghi ngoại lệ vào README › Bộ dữ liệu mẫu | README; file này |
| Q3 | Tìm theo tên hiển thị mà ô chỉ có username: tìm "khanh" ra ngoc.bui không rõ vì sao | ~~Khi chỉ khớp tên hiển thị, ô Người dùng thêm dòng "Tên hiển thị: Ngọc Khánh"~~ — **thay bằng R8** | File này; C-43 |
| Q4 | Hành động ở trang người dùng / server đặt ở đâu | Panel phải `DecisionPanel` như trang việc (không `SubjectCard`); xong thì biên nhận tại chỗ + nút "Hành động khác" (trang server: không nút) | File này; C-50 |
| Q5 | Thứ tự khối trang người dùng | Dải nhãn–giá trị → Hồ sơ → Lịch sử xử lý → Báo cáo → Server | File này |
| Q6 | "Báo cáo chờ" / "Việc liên quan" của server có gồm hồ sơ báo cáo từ server không | Không — giữ SRS: về server và tin trong server (khớp số việc đóng khi gỡ) | SRS (giữ) |
| Q7 | Server đã gỡ / Owner đã xóa không có trong danh sách; link tới nó (lịch sử, Nhật ký) mở ra gì | Trang chi tiết vẫn mở, chỉ đọc, chip "Đã gỡ" / "Owner đã xóa"; Owner đã xóa vẫn gỡ được (W1 A3) | SRS REQ-ADMIN-05 |
| Q8 | Lịch sử xử lý có hiện lời nhắn đã gửi người dùng không | Có: thêm dòng "Lời nhắn" vào `HistoryItem` (cả popover W1 — frame W1 không đổi vì các lần đó không có lời nhắn) | C-56 |
| Q9 | Tiêu đề danh sách có số tổng ("Người dùng 1.284") như bản xem trước không | Bỏ, như trang Báo cáo: số chỉ ở thanh phân trang | C-46 |
| Q10 | (a) Khóa / đặt lại hồ sơ từ trang người dùng khi còn việc chờ: có báo việc không đóng không? (b) Mở khóa có gửi gì cho người dùng không? | (a) Có, dòng `info` "Khóa từ đây không đóng 2 việc đang chờ về vu.dang (#60, #68)." (b) Không — đăng nhập được là đủ | File này; SRS REQ-ADMIN-04 (b) |
| Q11 | Tài khoản chờ xóa "chỉ xem": cột phải trống hay giải thích | ~~Khối chữ: chờ xóa tới khi nào, vì sao không có hành động~~ — **thay bằng E0** (vẫn khóa được) | File này; SRS REQ-ADMIN-04 |
| Q12 | Link tới tài khoản đã xóa hẳn (sau 14 ngày) | Trang "Tài khoản đã bị xóa": ngày xóa + Lịch sử xử lý (nhật ký không chứa thông tin cá nhân), không hồ sơ, không hành động | SRS REQ-ADMIN-04 |
| Q13 | Rời trang (BackLink, link trong trang) khi đã gõ lời nhắn / ghi chú | Dialog `discard` "Bỏ và rời trang" như W1; Back / tải lại / đóng tab của trình duyệt không hỏi (như W1: tải lại không giữ nháp) | File này; C-53 |
| Q14 | Từ trang việc (W1) chỉ tới được trang người dùng qua popover lịch sử (người chưa từng bị xử lý thì không có đường) | Username trong `SubjectCard` thành link (chữ giữ màu, thêm `chevron-right` 16), tên server trong `SubjectCard/server` cũng vậy; sửa master C-49, mọi frame W1 tự đổi | C-49; W1 |
| Q15 | Tài khoản đã xác minh email nhưng chưa Hoàn tất (chưa có username, SRS CR-16) có trong danh sách không | Không — ẩn khỏi danh sách và khỏi tổng số (không đăng nhập vào app được, không bị báo cáo) | SRS REQ-ADMIN-04 |

### Vòng duyệt 1 (02/11/2026)

Product Owner xem frame S-ADM-USR-02 và yêu cầu sửa; đồng ý cả các khuyến nghị dưới đây.

| # | Quyết định | Nơi sở hữu |
|---|---|---|
| R1 | ~~Sắp xếp danh sách người dùng: không thêm (giữ SRS REQ-ADMIN-01)~~ — **đảo bởi R9** | SRS |
| R2 | Dải nhãn–giá trị không icon; "Bị khóa tới {ngày}" + "lúc {giờ}" như ô Ngày tạo; ô riêng "Lý do khóa"; bỏ ô "Báo cáo chờ"; ô Email rộng 300 | File này |
| R3 | Giữ "Đặt lại hồ sơ" (hệ thống xóa ngay, không phải yêu cầu); khối Hồ sơ ghi "sửa lần cuối" từ cột mới `users.profile_updated_at` | SRS REQ-ADMIN-04 + mô hình dữ liệu; file này |
| R4 | Lịch sử xử lý: mỗi mục đủ 6 dòng cố định, cùng thứ tự, trống ghi "–", Việc "Từ trang người dùng" khi không qua báo cáo — áp cả popover W1 | C-56; W1 |
| R5 | Thứ tự khối: Báo cáo đang chờ → Lịch sử xử lý → Hồ sơ → Server | File này |
| R6 | Bỏ nhóm "Đã xử lý" ở trang người dùng; link "Xem {n} việc đã xử lý về {username} ›" mở trang Báo cáo (tab Đã xử lý, tìm sẵn username). Mã việc trong bảng không xanh vì cả hàng là link (như W1) | SRS REQ-ADMIN-04; file này |
| R7 | Lỗi phụ: thẻ hồ sơ gọn `ProfileCard/compact` (không dải banner khi không có banner); không ghi "(0)" ở tiêu đề khối / nhóm trống | C-48; file này |
| R8 | Ô tìm Người dùng chỉ nhận **username và email**, bỏ tên hiển thị (thay Q3): admin tra người từ báo cáo / Nhật ký (username) hoặc thư hỗ trợ (email); tên hiển thị trùng nhiều, đổi được. Bỏ dòng "Tên hiển thị: …" của ô Người dùng | SRS REQ-ADMIN-04 (AC2), 4.11; C-43; file này |
| R9 | Đảo R1: danh sách Người dùng (Ngày tạo, Hoạt động gần nhất, Báo cáo chờ) và Server (Ngày tạo, Thành viên, Báo cáo chờ) sắp xếp được theo cột — Tổng quan chỉ có số tổng, không có chỗ xem server đông nhất hay ai bị báo cáo nhiều nhất; hàng đợi Báo cáo giữ thứ tự cố định | SRS REQ-ADMIN-01/04/05 + API; C-43; file này |

Trang server giữ khối đã xử lý: trang Báo cáo không tìm được theo tên server cho việc về tin trong server.

### Vòng 2 — tự rà phần server theo luật vòng 1 (02/11/2026)

Agent rà 14 frame server theo các luật vòng 1 trước khi Product Owner xem; Product Owner đồng ý cả 9 mục.

| # | Quyết định | Nơi sở hữu |
|---|---|---|
| S1 | Bỏ chip "Đã gỡ" / "Owner đã xóa" trên tiêu đề; dải có ô "Trạng thái" ("Hoạt động" / "Đã gỡ ngày …" + "lúc …" / "Chờ xóa tới …" + "lúc …") và "Lý do gỡ" khi đã gỡ, như trang người dùng (R2). Dải tới 7 ô ở 1440, tối đa 5 ở 1024 | C-47; SRS REQ-ADMIN-05; file này |
| S2 | Owner bị khóa: dòng phụ "Bị khóa tới {ngày}" (không "Đang bị khóa") | File này |
| S3 | `Receipt` luôn đủ 4 dòng Lúc · Lý do · Lời nhắn · Ghi chú, trống "–", cùng thứ tự với `HistoryItem`; `by-other` của người quản lý server giữ chỉ "Lúc". Áp cả W1 | C-50; W1 |
| S4 | Server đã gỡ mở lại sau: cột phải là khối chữ (không giả biên nhận); cột trái có "Lịch sử xử lý" với lần gỡ (Việc "#58" / "Từ trang server") | File này; SRS REQ-ADMIN-05 |
| S5 | "Việc liên quan" → hai khối "Báo cáo đang chờ" / "Báo cáo đã xử lý"; thứ tự đang chờ → lịch sử (khi đã gỡ) → đã xử lý | File này |
| S6 | Bảng trong trang chi tiết: Lý do / Kết quả xuống tối đa 2 dòng, không cắt | C-43 |
| S7 | Danh sách server: Ngày tạo trước Thành viên | File này |
| S8 | Skeleton icon server là ô vuông bo góc | File này |
| S9 | Bỏ chữ "*Đề xuất*" còn sót ở Q4 | File này |

---

## Edge case (rà ngày 02/11/2026)

Product Owner chọn **tất cả** (E0 + A1–A4, B1–B3, C1–C6, D1–D5). Frame nằm trong nhóm "W2 · Người dùng & Server — Edge case" (x 77706, y 26400), tên `W2-EDGE · <trường hợp>`; mỗi frame ghi thế giới trên tên. **Thế giới K (giả định, có nhãn):** chỉ dùng cho frame cực trị kích thước — số người, số server, số việc vượt bộ mẫu; tên vẫn lấy từ bộ mẫu và bộ nền. Tên dài (C1, C2) là ngoại lệ chữ dài của README.

### Quyết định kèm theo
| # | Quyết định | Nơi sở hữu |
|---|---|---|
| E0 | Tài khoản chờ xóa vẫn khóa được (không đặt lại hồ sơ): bị khóa thì không đăng nhập để hủy yêu cầu xóa được, tài khoản tự xóa đúng hạn — chặn yêu cầu xóa để né khóa rồi đăng nhập lại để hủy. Thay Q11 | SRS REQ-ADMIN-04 (AC4); file này |
| — | Mã `40910` AdminSubjectChanged cho A1, A3, D1 và người dùng vừa yêu cầu xóa | SRS (bảng mã lỗi, REQ-ADMIN-04/05) |

### Có frame
| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `pending-deletion` (sửa frame của màn, E0) | Panel: "Khóa tài khoản" · "Đặt lại hồ sơ" vô hiệu ("Hồ sơ bị xóa cùng tài khoản."); dòng `info` chờ xóa luôn hiện | REQ-ADMIN-04 AC4 |
| `locked-by-other` (A1) — thế giới A: Hiếu soạn khóa vu.dang 30 ngày; 21:57 Trâm khóa vu.dang 7 ngày ("Lừa đảo", từ trang người dùng); 21:58 Hiếu bấm xác nhận | `40910` → trang tải lại: dải "Bị khóa tới 26/10/2026" + "lúc 21:57", "Lý do khóa" "Lừa đảo"; Lịch sử (3) có lần của Trâm trên cùng; panel giữ "Khóa tài khoản" · 30 ngày · lý do · lời nhắn · ghi chú đã gõ; dòng `triangle-alert` `warning` "Trâm vừa khóa vu.dang tới 26/10/2026 lúc 21:57. Khóa tiếp sẽ thay thời hạn đó." (thay dòng báo cáo còn chờ); lựa chọn có thêm "Mở khóa" | REQ-ADMIN-04 AC5; W1 `replace-permanent` |
| `renamed-while-confirming` (A3) — nhánh thế giới A lúc 21:56 (trước khi khóa vu.dang): Hiếu gõ đúng "Soi kèo bóng đá" trong dialog; vu.dang đổi tên server thành "Kèo thơm"; Hiếu bấm Gỡ | `40910` → tiêu đề trang thành "Kèo thơm"; dialog "Gỡ server Kèo thơm?"; ô gõ giữ chữ cũ, viền `danger` + "Tên server vừa đổi thành “Kèo thơm”. Gõ lại tên mới."; nút "Gỡ server" vô hiệu | REQ-ADMIN-05 |
| `long-username · list` (C1) — thế giới H (như W1 `long-username`): tìm "tranthi" | Một hàng: username 32 ký tự cắt "…" trong cột 232 (`Cell · person`), email `tranthithanhhuonggiang2005@stu.ptit.edu.vn` cắt "…" | C-43 |
| `long-username · detail` (C1) | Tiêu đề avatar + username một dòng ở 1440 (C-46: tối đa 2 dòng, không cắt); ô Email 300 xuống dòng chỉ sau "@" ("tranthithanhhuonggiang2005@" / "stu.ptit.edu.vn"); Báo cáo đang chờ (1) #57; nhãn panel "Lý do tranthithanhhuonggiang2005 sẽ thấy" xuống dòng khi chọn | C-46, C-47, C-50 |
| `long-server-name · list` (C2) — thế giới K: server 100 ký tự "Nhóm ôn thi cuối kỳ Cấu trúc dữ liệu và giải thuật lớp D22CQCN01-B cùng thầy Minh, học kỳ 1 năm 2026" (Owner an.nguyen, 30 thành viên); tìm "cau truc" | Hàng: tên cắt "…" một dòng | C-43 |
| `long-server-name · confirm` (C2) | Tiêu đề trang 2 dòng, không cắt; dialog `type-name`: tiêu đề "Gỡ server …?" 3 dòng, ô gõ chứa đủ 100 ký tự (cuộn ngang trong ô, thấy phần cuối nơi con trỏ đứng), nút bấm được; nút xác nhận của panel ghi tên tối đa 2 dòng rồi cắt "…" ("Gỡ server Nhóm ôn thi cuối kỳ Cấu trúc dữ liệu và giải…") — đo trên canvas: để đủ tên thì nút cao 4 dòng | C-46, C-50, C-53 |
| `many-items` (C3) — thế giới K: giang.vo có 9 việc đang chờ, bị admin xử lý 12 lần, ở 100 server | Báo cáo đang chờ (9): 5 hàng cũ nhất + "Xem thêm 4 việc"; link "Xem 14 việc đã xử lý về giang.vo ›"; Lịch sử xử lý (12): 5 mục + "Xem thêm 7 lần" | File này › Danh sách dài |
| `many-items · scrolled` (C4) | Cuộn tới đáy: Hồ sơ; Server (100): 5 hàng mới vào nhất (Ôn thi Toán rời rạc, Phòng tự học thư viện, CLB Tiếng Anh PTIT, Ôn thi Vật lý 1, Nhóm đồ án Web — giang.vo không là Owner server nào) + "Xem thêm 95 server"; panel `DecisionPanel` ghim ở đầu khung nhìn (C-50), không cuộn theo trang | File này › Khối Server |
| `big-numbers · users` (C5) — thế giới K: 12.345 người dùng, xếp Báo cáo chờ giảm dần | tailieu.giare99 120 (cột 132 vừa 3 chữ số), …; "Hiện 50 trong số 12.345 người dùng"; "‹ 1 2 3 4 5 … 247 ›" | C-43, C-44 |
| `big-numbers · servers` (C5) — thế giới K: 2.468 server, xếp Thành viên giảm dần | Hội sinh viên K22 1.250 thành viên, …; "trong số 2.468 server"; "‹ 1 2 3 4 5 … 50 ›" | C-43, C-44 |
| `owner-of-many` (C6) — thế giới K: vu.dang là Owner của 6 server, Hiếu chọn Khóa vĩnh viễn | Dialog: "vu.dang là Owner của 6 server: Soi kèo bóng đá, Nhóm đồ án Web, Luyện code mỗi tối và 3 server khác. Quyền Owner tự chuyển cho thành viên có vai trò cao nhất, và không trả lại khi mở khóa." | REQ-SAFE-02, DEC-28 |

### Chỉ ghi luật (giao diện không đổi)
| Tình huống | Luật |
|---|---|
| A2 · Trâm gỡ server trước khi Hiếu xác nhận dialog | `40901` → biên nhận "Trâm đã gỡ server Soi kèo bóng đá" + "Việc đã được xử lý trước khi bạn xác nhận." (như W1); dải thành "Đã gỡ ngày …" |
| A4 · vu.dang bị khóa vĩnh viễn → quyền Owner chuyển | Trang server và danh sách server hiện Owner mới ngay; Lịch sử của vu.dang không thêm mục (chuyển quyền là hệ quả của lần khóa, đã ghi trong mục khóa) |
| B1 · Phiên hết hạn khi đang soạn | Như W1: về đăng nhập, nháp panel giữ trong tab và khôi phục sau đăng nhập lại; trạng thái đã đổi trong lúc đó → `40910` như A1 |
| B2 · Tải lại trang / cùng người ở hai tab | Như W1: tải lại không giữ nháp; tab thứ hai xác nhận → `40910` → "Bạn đã khóa vu.dang ở tab khác." |
| B3 · URL có `sort` / `dir` không hợp lệ | API `40001` → danh sách về thứ tự mặc định, URL viết lại (`replace`), không báo lỗi |
| D1 · Mở khóa khi khóa vừa hết hạn (khanh.le 26/10 21:46, bấm 21:47) | `40910` → trang tải lại "Hoạt động" + dòng `info` "Khóa đã hết hạn lúc 21:46, không cần mở khóa."; không ghi lịch sử |
| D2 · Hết hạn chờ xóa khi đang mở trang (hoa.dang 01/11 09:00) | Lần tải / thao tác kế tiếp → trang `deleted-account` |
| D3 · Server Owner xóa quá 30 ngày | Trang server → `not-found`; link trong lịch sử vẫn ghi tên server, mở ra `not-found` |
| D4 · Khóa 30 ngày lúc 15/12/2026 | "Bị khóa tới 14/01/2027"; ngày luôn có năm |
| Lỗi tìm thấy khi vẽ edge case (đã sửa 02/11/2026) | (1) `S-ADM-USR-02 · scrolled`: panel cuộn theo trang, mất "Hành động" — sửa cho panel ghim ở đầu khung nhìn như luật W1 / C-50. (2) Tên dài làm nút xác nhận cắt chữ và nhãn "Lời nhắn cho …" tràn: nút và nhãn xuống dòng (luật W1 `long-username`). (3) Tiêu đề trang 100 ký tự làm hàng tiêu đề co lại: hàng tiêu đề giãn hết bề rộng, chữ tối đa 2 dòng (C-46) |
| D5 · Tài khoản tạo hôm nay, chưa kết nối | "Hoạt động gần nhất" "–"; trang chi tiết như `history-empty`, Hồ sơ "chưa sửa từ khi tạo tài khoản"; xếp Hoạt động gần nhất giảm dần thì "–" đứng cuối (C-43) |
