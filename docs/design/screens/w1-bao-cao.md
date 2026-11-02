# W1 · Báo cáo (web quản trị) ⭐ vertical slice

Area đầu tiên của web quản trị (CR-27, SRS v1.10). Hai màn: **hàng đợi** và **xử lý một việc**. Vertical slice của web quản trị: chứng minh điều cần nhớ "Mọi quyết định xử lý đều đặt cạnh bằng chứng và để lại dấu vết" (`DESIGN.md` › Web quản trị) và dùng gần hết component C-42…C-50.

**Nguồn:** SRS v1.10 › REQ-ADMIN-03 (chính), REQ-SAFE-01, REQ-SAFE-02, REQ-ADMIN-01 (luật danh sách, phiên), REQ-ADMIN-05 (Gỡ server), REQ-NOTIF-05 (`report_reviewed`, `profile_reset`, `server_removed`). Diện mạo: `DESIGN.md` › Web quản trị. Component: `00-components.md` › Web quản trị (C-42…C-55). Hồ sơ nền tảng **web** (`PLATFORMS.md` của skill).

> Trạng thái: **hành vi đã chốt 01/11/2026** (17 câu — mục [Quyết định](#quyết-định-chốt-01112026)); **đã vẽ 01/11/2026** — frame ở `Des/nezfocus.pen`, nhóm "W1 · Báo cáo — S-ADM-RPT-01" (x 77706, y 3370) và "— S-ADM-RPT-02" (y 7578). Product Owner duyệt 02/11/2026.

---

## Quy ước của area

| Hạng mục | Quy ước |
|---|---|
| Khung | **1440 × 900** (chính) và **1024 × 768** cho trạng thái có bố cục đổi theo độ rộng (mỗi màn `default`, trạng thái cuộn của panel Quyết định). Dưới 1024: màn chặn của W4. Trạng thái còn lại chỉ vẽ ở 1440 |
| Theme khi duyệt | Vertical slice: các frame ghi "+ dark" ở bảng trạng thái có bản tối; còn lại chỉ sáng (theme dẫn dắt của web quản trị) |
| Vị trí trong điều hướng | `AdminSidebar` (C-42), mục **Báo cáo** đang chọn, badge = số việc "Cần admin". Không có thanh trên toàn cục |
| URL | Hàng đợi `/reports` (mặc định tab Đang chờ, phạm vi Cần admin); trạng thái nằm trong query: `tab`, `scope`, `type`, `reason`, `handled_by`, `q`, `page`, `size` không lưu URL (nhớ trong trình duyệt theo bảng, REQ-ADMIN-01). Chi tiết `/reports/57`. Back của trình duyệt và "‹ Hàng đợi" trả về đúng URL hàng đợi lúc mở việc |
| Ngày giờ | Giờ Việt Nam. Luôn có năm. Cột bảng: mono "18/10/2026 20:07". Trong câu và ô nhãn–giá trị: Be Vietnam Pro "18/10/2026 lúc 20:07" (SRS 4.11, Q3). Thời điểm từng báo cáo trong khối "Báo cáo" của trang chi tiết: luôn đầy đủ "18/10/2026 20:07" (không rút gọn còn giờ — dòng trên cũ hơn sẽ trông như mới hơn) |
| Số | Số đếm `numeric-inline` (Unbounded, `tabular-nums`), 0 hiện "–"; nghìn có dấu chấm ("1.284") |
| Mã việc | "#57", mono `text-tertiary` ở tiêu đề, mono `text-secondary` trong cột bảng; luôn có "#" |
| Người | Chỉ **username** ở mọi chỗ gọi tên một người dùng (SRS 4.11 "Gọi tên người dùng", `00-components.md` › Quy ước chung): "Tin nhắn của khanh.le", "Khóa khanh.le 7 ngày". Bong bóng tin trong ảnh chụp giữ tên hiển thị. Người xử lý là admin: chỉ tên (admin không có username, tên không trùng) |
| Mascot | Đúng một chỗ: `S-ADM-RPT-01 · empty` (hàng đợi Cần admin trống), Runtime `neutral` 96, ảnh tĩnh. Không ở đâu khác trong area (`DESIGN.md` › Web quản trị › Mascot) |
| Màu | Restrained: `primary` chỉ cho hành động chính, mục đang chọn, link, focus. `danger` cho nút hành động phá hủy. `warning` chỉ ở icon "Quá 24 giờ" và icon tạm khóa. Không màu pha |
| Lớp phủ | Dialog C-53 `AdminDialog` (Khóa vĩnh viễn, Gỡ server) có scrim, không có URL riêng; Esc đóng, trả focus về nút xác nhận. Không có toast trong area (kết quả xử lý là biên nhận) |

### Thế giới mẫu

**Thế giới A** (mọi frame trừ khi ghi khác): admin **Hiếu** (`hieupt1003@gmail.com`) đăng nhập; bây giờ **21:40, Thứ Hai 19/10/2026** (một ngày sau giờ mẫu 18/10 20:12 của app, để việc #57 đã "Quá 24 giờ"). Frame biên nhận lấy giờ **21:46** (SRS REQ-SAFE-01 ví dụ "Đội ngũ NezFocus đã xóa tin · 21:46"). Admin thứ hai: **Trâm** (chỉ có tên — admin không có username).

**Chuỗi sự kiện sau 21:40** (các frame biên nhận và frame phía app dựa vào): Hiếu mở #57 từ hàng đợi (Việc 3 / 12), xử lý lúc **21:46** — khóa khanh.le 7 ngày (tới 26/10/2026 21:46), xóa tin, lý do "Gian lận học tập", lời nhắn "Bán đề thi trong nhóm học là vi phạm quy tắc. Lần sau tài khoản sẽ bị khóa lâu hơn.", ghi chú nội bộ "Tái phạm sau #23 (đặt lại hồ sơ 10/10). Cùng người với #64."; sang #58, **21:48** gỡ server Chợ tài liệu K22, lý do "Gian lận học tập", lời nhắn "Server chia sẻ đề thi có đáp án là vi phạm quy tắc học tập."; quay lại #55, **21:50** đặt lại hồ sơ của Nam, lý do "Spam hoặc quảng cáo", không lời nhắn.

**Thế giới nhánh** (một frame, ghi nhãn trên frame): **B** — Trâm đã khóa khanh.le 1 ngày từ trang Người dùng lúc 19/10/2026 09:00 (tới 20/10/2026 09:00), báo cáo #57 vẫn chờ (`subject-suspended`); **C** — Khánh đã yêu cầu xóa tài khoản lúc 19/10/2026 10:00 (`subject-pending-deletion`); **D** — binh.tran (người quản lý server) bỏ qua #57 lúc 21:44 khi Hiếu đang chọn (`conflict`). **E** — đối tượng đổi sau khi báo cáo: khanh.le sửa tin #57 lúc 19/10/2026 08:12, nam.ho sửa giới thiệu lúc 10:30, Owner đổi tên Chợ tài liệu K22 thành "Thư viện K22" lúc 10:05 (`message-edited`, `profile-changed`, `server-changed` và bản `-current`).

**Luật nhất quán dữ liệu:**
- Mã việc tăng theo thời điểm báo cáo đầu tiên ⇒ tab Đang chờ (cũ nhất trên cùng) luôn có mã tăng dần từ trên xuống.
- "Quá 24 giờ" ⇔ phạm vi Có người quản lý server **và** báo cáo đầu tiên trước 21:40 18/10/2026 (trước "bây giờ" quá 24 giờ).
- Badge sidebar = số hàng của tab Đang chờ ở phạm vi Cần admin = **12**; sau khi xử lý #57 thành **11**.
- Tổng đang chờ (phạm vi Tất cả) = 12 + 3 = **15** (lúc 21:40; W3 lấy giờ 22:10 nên dòng phụ là "12 đang chờ tất cả" — ba việc #55, #57, #58 đã đóng).
- Lý do chọn sẵn = lý do của báo cáo **đầu tiên** (#57: "Gian lận học tập" của Hà 20:07 — bản xem trước chọn nhầm "Lừa đảo", frame mới sửa).
- Người báo cáo không bao giờ là người bị báo cáo; người báo cáo trong server phải là thành viên server đó.
- Khánh "Bị admin xử lý 1 lần" = việc #23 (Hiếu đặt lại hồ sơ 10/10/2026) — sau đó Khánh viết lại giới thiệu "Bán tài liệu ôn thi giá rẻ · inbox mình" (02 › Dữ liệu mẫu).

**Hàng đợi Đang chờ (19/10/2026 21:40):**

| Mã | Đối tượng | Nơi | Lý do | Báo cáo | Báo cáo đầu | Phạm vi |
|---|---|---|---|---|---|---|
| #52 | Tin nhắn của phong.vu | Tin nhắn riêng | Quấy rối hoặc bắt nạt | 1 (An) | 17/10/2026 22:15 | Chỉ admin |
| #55 | Hồ sơ của nam.ho | Ôn thi Giải tích 2 | Spam hoặc quảng cáo | 1 (Bình) | 18/10/2026 19:40 | Quá 24 giờ |
| #57 | Tin nhắn của khanh.le | #hoi-dap, Ôn thi Giải tích 2 | Gian lận học tập, Lừa đảo | 2 (Hà 20:07, Mai 20:09) | 18/10/2026 20:07 | Quá 24 giờ |
| #58 | Server Chợ tài liệu K22 (Owner khanh.le, 41 thành viên) | Chợ tài liệu K22 | Gian lận học tập | 3 | 18/10/2026 22:30 | Chỉ admin |
| #59 | Hồ sơ của phuc.le | Ngoài server | Mạo danh người khác | 1 | 19/10/2026 08:14 | Chỉ admin |
| #60 | Tin nhắn của vu.dang | Tin nhắn riêng | Lừa đảo | 1 | 19/10/2026 09:30 | Chỉ admin |
| #61 | Tin nhắn của tuan.hoang (Quản trị của server) | #thong-bao, Ôn thi Giải tích 2 | Khác | 1 | 19/10/2026 11:05 | Chỉ admin |
| #62 | Hồ sơ của phong.vu | Ngoài server | Tên, ảnh hoặc giới thiệu phản cảm | 1 | 19/10/2026 13:20 | Chỉ admin |
| #63 | Tin nhắn của quan.ng | #hoi-dap, Ôn thi Giải tích 2 | Spam hoặc quảng cáo | 1 | 19/10/2026 14:02 | Có người quản lý server |
| #64 | Tin nhắn của khanh.le | Tin nhắn riêng | Lừa đảo | 1 | 19/10/2026 15:45 | Chỉ admin |
| #65 | Tin nhắn của phuc.le | Tin nhắn riêng | Spam hoặc quảng cáo | 1 | 19/10/2026 17:10 | Chỉ admin |
| #66 | Tin nhắn của phuc.le | #tai-lieu, Ôn thi Giải tích 2 | Lừa đảo | 1 | 19/10/2026 18:30 | Có người quản lý server |
| #67 | Tin nhắn của phong.vu | Tin nhắn riêng | Quấy rối hoặc bắt nạt | 2 | 19/10/2026 19:02 | Chỉ admin |
| #68 | Hồ sơ của vu.dang | Ngoài server | Spam hoặc quảng cáo | 1 | 19/10/2026 20:48 | Chỉ admin |
| #69 | Tin nhắn của giang.vo | #chao-mung, Nhóm đồ án Mobile | Spam hoặc quảng cáo | 1 | 19/10/2026 21:12 | Có người quản lý server |

Cần admin = 12 hàng (bỏ #63, #66, #69). #57 là việc **3 / 12**; việc kế tiếp là **#58**.

**Đã xử lý (mới xử lý trên cùng, 54 việc)** — mã việc đánh liên tục #1…#69, trừ 15 việc đang chờ còn 54 (50 / trang ⇒ 2 trang; 25 / trang ⇒ 3 trang). Các hàng đầu:

| Mã | Đối tượng | Kết quả | Người xử lý | Lúc |
|---|---|---|---|---|
| #56 | Tin nhắn của vu.dang, #hoi-dap, Nhóm đồ án Mobile | Xóa tin | Hiếu | 18/10/2026 20:05 (khớp mục `report_reviewed` 20:05 của An ở 06) |
| #54 | Tin nhắn của phong.vu, Tin nhắn riêng | Khóa 1 ngày | Trâm | 17/10/2026 10:20 |
| #49 | Hồ sơ của mai.tran, Ôn thi Giải tích 2 | Bỏ qua | an.nguyen (người quản lý server) | 16/10/2026 21:05 |
| #53 | Hồ sơ của quan.ng, Ngoài server | Bỏ qua | Hiếu | 17/10/2026 09:12 |
| #51 | Server CLB Guitar PTIT | Bỏ qua | Trâm | 16/10/2026 22:40 |
| #50 | Tin nhắn của giang.vo, Tin nhắn riêng | Bỏ qua | Hiếu | 16/10/2026 21:30 |
| #48 | Tin nhắn của phong.vu, #tai-lieu, Ôn thi Giải tích 2 | Xóa tin, tạm khóa 1 ngày | binh.tran (người quản lý server) | 16/10/2026 16:30 |
| #47 | Tin nhắn của phuc.le, #tai-lieu, Ôn thi Giải tích 2 | Xóa tin trong kênh | tuan.hoang (người quản lý server) | 16/10/2026 16:00 |
| #46 | Tin nhắn của vu.dang, #thong-bao, Nhóm đồ án Mobile | Xóa tin | Trâm | 16/10/2026 11:15 |
| #45 | Hồ sơ của phuc.le, Ngoài server | Đặt lại hồ sơ | Hiếu | 15/10/2026 20:40 |
| #44 | Tin nhắn của phuc.le, #hoi-dap, Ôn thi Giải tích 2 | Bỏ qua | tuan.hoang (người quản lý server) | 15/10/2026 18:02 |
| #43 | Tin nhắn của phong.vu, Tin nhắn riêng | Bỏ qua | Trâm | 15/10/2026 15:20 |
| #42 | Hồ sơ của vu.dang, Ngoài server | Bỏ qua | Hiếu | 15/10/2026 11:05 |
| #41 | Tin nhắn của quan.ng, #hoi-dap, Ôn thi Giải tích 2 | Xóa tin | binh.tran (người quản lý server) | 15/10/2026 09:40 |
| #40 | Tin nhắn của vu.dang, #hoi-dap, Ôn thi Giải tích 2 | Xóa tin trong kênh | an.nguyen (người quản lý server) | 15/10/2026 08:30 (cùng sáng An cấm Vũ, 08 › Dữ liệu mẫu) |

(#47–#49 khớp đợt Đã xử lý 16/10 của 08 › S-SET-05 `handled`.) Hàng 16–25: #39 … #30 (12–14/10/2026); hàng 41–50: #14 … #5 (03–07/10/2026); trang 2 (50 / trang): #4 … #1 — tất cả do Hiếu / Trâm, phần lớn Bỏ qua; không có Phong, Vũ, Phúc, Nam, Khánh (giữ đúng số lần dưới đây). Lần admin xử lý từng người (dòng "Bị admin xử lý n lần"): Phong 1 (#54), Khánh 1 (#23), Phúc 1 (#45), Vũ 2 (#56, #46), Nam 0.

**Bằng chứng #52** (tin nhắn riêng Phong – An, đoạn ngắn vì sau tin bị báo cáo chỉ có 1 tin tới lúc báo cáo): An 22:00 "Phần slide của bạn mình ghép vào rồi nhé" · Phong 22:02 "Sao hôm nay mày báo cô là tao không làm phần của tao?" · An 22:06 "Mình chỉ báo đúng phần đã nộp thôi" · Phong 22:10 "Mày thích làm màu à" · An 22:11 "Bạn nói chuyện bình thường được không?" · **Phong 22:13 "Mày nghĩ mày giỏi lắm à? Mai lên lớp biết tay"** · An 22:14 "Mình không trả lời nữa.". Báo cáo: "Quấy rối hoặc bắt nạt" An (`an.nguyen`) 22:15 “Phong dọa đánh mình vì chuyện bài nhóm”.

**Báo cáo #55:** "Spam hoặc quảng cáo" Bình (`binh.tran`) 19:40 “Giới thiệu toàn quảng cáo làm bài hộ”. **Báo cáo #58:** "Gian lận học tập" Hà 22:30 “Server bán đề thi và đáp án có sẵn”; "Gian lận học tập" Lan (`lan.vu`) 22:41, không mô tả; "Lừa đảo" Dũng (`dung.pham`) 19/10/2026 07:55 “Chuyển tiền rồi không nhận được tài liệu”.

**Bằng chứng #57** (giữ nguyên bản xem trước đã duyệt, khớp 08 `evidence`): Lan 19:58 "Mọi người ôn tới chương mấy rồi?" · Mai 20:00 "Mình mới ôn xong chương 4" · Hà 20:01 "Có ai có đề giữa kỳ năm ngoái không?" · Dũng 20:02 "Mình có bản scan, tối mình gửi lên #tai-lieu" · Hà 20:04 "Cảm ơn nha" · **Khánh 20:05 "Bán đề thi giữa kỳ có đáp án 50k, ai cần inbox mình"** · Bình 20:06 "Đề chưa thi thì làm gì có đáp án" · Chi 20:06 "Đừng mua nha mọi người" · Mai 20:06 "Đề còn chưa thi thì lấy đâu ra đáp án" · Lan 20:06 "Thôi ôn tiếp chương 5 đi mọi người". Danh sách báo cáo xếp **cũ nhất trên cùng** ở mọi việc. Báo cáo: "Gian lận học tập" Hà (`ha.nguyen`) 20:07 “Bán đề thi có đáp án ngay trong nhóm ôn thi”; "Lừa đảo" Mai (`mai.tran`) 20:09, không mô tả.

---

## S-ADM-RPT-01 · Hàng đợi báo cáo

**Mục đích:** admin thấy việc nào cần mình trước, lọc và mở từng việc.
**REQ:** REQ-ADMIN-03 (tab, ưu tiên Cần admin, mã việc, hàng, lọc, tìm), REQ-ADMIN-01 (25 / 50 / 100, tìm 300ms, URL, không sắp xếp cột), 4.11 (badge, không push).
**Mở từ:** mục Báo cáo của sidebar (`default`); link "Cần admin xử lý" ở Tổng quan (W3, `default`); "‹ Hàng đợi" và Back từ S-ADM-RPT-02 (đúng URL đã rời); nút "Về hàng đợi" của biên nhận khi hết việc. **Đi tới:** S-ADM-RPT-02 `default` (bấm hàng; tìm "57" / "#57" khi việc tồn tại); S-ADM-RPT-02 `handled` (bấm hàng ở tab Đã xử lý).

### Bố cục (`default`, 1440)
```
┌ AdminSidebar ┬──────────────────────────────────────────────────────────────────────────┐
│ Báo cáo (12) │ Báo cáo                                                     [↻ Làm mới]  │ PageHeader · list (không số tổng)
│ đang chọn    │ Đang chờ    Đã xử lý                                                      │ tab gạch chân 2 primary
│              │ ─────────────────────────────────────────────────────────────────────────│
│              │ [🔍 Tìm mã việc hoặc tên người    ] [Phạm vi: Cần admin ▾] [Loại ▾] [Lý do ▾] │ FilterBar
│              │ Mã   Đối tượng                Lý do                  Báo cáo  Nơi          Phạm vi        Báo cáo đầu      │
│              │ #52  💬 Tin nhắn của phong.vu     Quấy rối hoặc bắt nạt       1  Tin nhắn riêng 🛡 Chỉ admin   17/10/2026 22:15 │
│              │ #55  👤 Hồ sơ của nam.ho          Spam hoặc quảng cáo         1  Ôn thi Giải…   ⏰ Quá 24 giờ  18/10/2026 19:40 │
│              │ #57  💬 Tin nhắn của khanh.le     Gian lận học tập, Lừa đảo   2  Ôn thi Giải…   ⏰ Quá 24 giờ  18/10/2026 20:07 │
│              │                                                               #hoi-dap                      │ Nơi: 2 dòng
│              │ …                                                                                           │
│              │ ⓘ Còn 3 việc có người quản lý server, chưa quá 24 giờ.  Xem tất cả                         │ dòng gợi ý
│              │ Hiện [50 ▾] trong số 12 việc                                                  ‹ 1 ›         │ Pagination
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```
Cột ở 1440 (vùng nội dung 1144): Mã 72 · Đối tượng 248 · Lý do 220 · Báo cáo 72 (số, căn phải) · Nơi 200 · Phạm vi 168 · Báo cáo đầu 164. **1024** (744): ẩn Nơi và Báo cáo đầu. Không cuộn ngang.

### Component
`AdminSidebar` (C-42), `PageHeader · list` (C-46), `PageTabs` (C-46), `SearchInput`, `FilterSelect`, `FilterSelect · single` (Phạm vi, Người xử lý), `ClearFilters` (C-45), `DataTable` với `Cell · mono` / `Cell · text` (+ icon loại) / `Cell · number` / `Cell · status` (C-43), `Pagination` (C-44), `EmptyState` bản web (C-14 + mascot), `Button` secondary S (C-01).

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Báo cáo" |
| Nút | "Làm mới" (icon `refresh-cw`) |
| Tab | "Đang chờ" · "Đã xử lý" |
| Ô tìm (placeholder) | "Tìm mã việc hoặc tên người" — nhãn ẩn "Tìm báo cáo" |
| Bộ lọc | "Phạm vi: Cần admin" (một lựa chọn: "Cần admin" · "Chỉ admin" · "Có người quản lý server" · "Tất cả") · "Loại" (nhiều: "Tin nhắn" · "Hồ sơ" · "Server") · "Lý do" (nhiều: 8 lý do của REQ-SAFE-02) · tab Đã xử lý: "Người xử lý: Tất cả" (một: "Tất cả" · "Hiếu" · "Trâm" · "Người quản lý server") đứng trước, rồi "Phạm vi: Tất cả" (một: "Tất cả" · "Chỉ admin" · "Có người quản lý server" — không có "Cần admin"), "Loại", "Lý do". Mỗi tab giữ bộ lọc riêng trong URL: từ Đang chờ (Cần admin) sang Đã xử lý thấy "Phạm vi: Tất cả", quay lại vẫn Cần admin |
| Đầu cột Đang chờ | "Mã" · "Đối tượng" · "Lý do" · "Báo cáo" · "Nơi" · "Phạm vi" · "Báo cáo đầu" |
| Đầu cột Đã xử lý | "Mã" · "Đối tượng" · "Kết quả" · "Người xử lý" · "Nơi" · "Xử lý lúc" |
| Ô đối tượng | "Tin nhắn của {tên}" (`message-square`) · "Hồ sơ của {tên}" (`user`) · "Server {tên}" (`server`) |
| Ô phạm vi | "Chỉ admin" (`shield`) · "Quá 24 giờ" (`clock-alert` `warning`) · "Có người quản lý server" (`users`) |
| Ô người xử lý | admin: "Hiếu"; người quản lý: "binh.tran" + dòng 2 "người quản lý server" `text-secondary` |
| Ô kết quả | các hành động nối bằng ", ": "Xóa tin, khóa 7 ngày" · "Bỏ qua" · "Đặt lại hồ sơ" · "Gỡ server" · "Xóa tin trong kênh" · "Server đã bị gỡ" |
| Dòng gợi ý (phạm vi Cần admin, có việc bị ẩn) | "Còn {n} việc có người quản lý server, chưa quá 24 giờ." + link "Xem tất cả": **chỉ** đổi phạm vi sang Tất cả, giữ ô tìm, Loại, Lý do; về trang 1, thêm mục lịch sử (Back quay lại Cần admin). {n} đếm trong bộ lọc hiện tại, nên bấm xong bảng có thêm đúng {n} hàng (vd `filtered`: 4 + 1 = 5). Nút "Xem tất cả" của `empty` làm cùng việc |
| Phân trang | "Hiện [50] trong số 12 việc" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` (1440 + dark, 1024 + dark) | Như bố cục: phạm vi Cần admin, 12 hàng | — |
| `all` | Phạm vi Tất cả: 15 hàng, thêm #63, #66, #69 (phạm vi "Có người quản lý server"); không có dòng gợi ý | "Phạm vi: Tất cả" · "trong số 15 việc" |
| `filter-open` | Menu "Lý do" mở, tick "Lừa đảo" và "Gian lận học tập"; bảng phía sau đã lọc | Nút thành "Lý do (2)" |
| `scope-open` | Menu "Phạm vi" mở dưới nút (một lựa chọn): "Cần admin" · "Chỉ admin" · "Có người quản lý server" · "Tất cả", dấu `check` ở "Cần admin"; bảng phía sau như `default` | — |
| `type-open` | Menu "Loại" mở dưới nút (nhiều lựa chọn, ô tick): "Tin nhắn" · "Hồ sơ" · "Server", chưa tick ô nào (không lọc = mọi loại); bảng phía sau như `default` | — |
| `handler-open` | Tab Đã xử lý, menu "Người xử lý" mở (một lựa chọn): "Tất cả" · "Hiếu" · "Trâm" · "Người quản lý server", dấu `check` ở "Tất cả" | — |
| `filtered` | Đã lọc Lý do (2) trong phạm vi Cần admin: 4 hàng #57, #58, #60, #64 (#66 cũng khớp lý do nhưng chưa quá 24 giờ) | "trong số 4 việc" · `ClearFilters` "Xóa bộ lọc" cuối thanh lọc |
| `search-empty` | Gõ "thảo": không khớp → `Table · empty` | "Không có việc nào khớp “thảo”" · "Xóa tìm kiếm" |
| `case-not-found` | Gõ "#999" + Enter: mã không tồn tại → `Table · empty` | "Không có việc #999" |
| `empty` | Phạm vi Cần admin trống (sau khi Hiếu xử lý hết 12 việc), còn 3 việc của người quản lý: `EmptyState` với mascot `neutral` 96; badge sidebar ẩn (0); không phân trang | "Không còn việc nào cần admin" · "Còn 3 việc có người quản lý server, chưa quá 24 giờ." · nút `secondary` "Xem tất cả" (hết sạch mọi phạm vi: câu thứ hai "Báo cáo mới sẽ hiện ở đây." và không có nút) |
| `loading` | `Table · loading` 8 hàng skeleton; bộ lọc và tab vẫn bấm được; không có phân trang | — |
| `error` | `Table · error` | "Không tải được danh sách." · "Thử lại" |
| `handled` (+ dark) | Tab Đã xử lý, 54 việc (50 / trang ⇒ 2 trang): bảng chạy quá khung nhìn (#56 … #40), thanh phân trang ở đáy trang, ngoài khung | Đầu cột Đã xử lý; "trong số 54 việc" |
| `page-size-open` | Tab Đã xử lý, **cuộn tới đáy trang 1** (hàng 41–50: #14 … #5, rồi thanh phân trang "‹ 1 2 ›"); menu "Hiện" mở **lên trên** ô chọn (sát đáy khung nhìn): 25 · 50 · 100, dấu chọn ở 50, rê chuột trên 25 | — |
| `page-size-25` | Đã chọn 25 → về trang 1, cuộn tới đáy (hàng 16–25: #39 … #30); số mục mỗi trang nhớ trong trình duyệt cho bảng Báo cáo | "Hiện [25] trong số 54 việc" · "‹ 1 2 3 ›" (‹ vô hiệu) |
| `handled-by-moderator` | Tab Đã xử lý lọc "Người xử lý: Người quản lý server": #49, #48, #47, #44, #41, #40 (để admin rà việc người quản lý đã bỏ qua); `ClearFilters` | "Người xử lý: Người quản lý server" · "trong số 6 việc" |
| `row-hover-focus` | Hàng #57 `hover`; một frame chú thích `focus-visible` lùi vào trong hàng | — |
| `narrow` (1024) | = `default · 1024` | — |

Không áp dụng: `offline` (web quản trị không có chế độ offline; mất mạng khi tải = `error`, khi đang xem thì dữ liệu giữ nguyên tới lần tải sau) · `forbidden` (một cấp admin, mọi admin thấy hết) · `os-permission` (không dùng quyền trình duyệt nào) · phiên hết hạn (W4).

### Tương tác
- Bấm hàng / Enter khi hàng có focus → S-ADM-RPT-02 của việc đó; Ctrl/⌘ + bấm hoặc chuột giữa mở tab mới (hàng là link). Mở từ tab Đang chờ thì chi tiết có `CasePager` theo danh sách đang lọc.
- "/" đưa focus vào ô tìm (trừ khi đang gõ trong ô khác). Gõ → tìm sau 300ms, về trang 1, URL đổi (`replace`, không thêm mục lịch sử cho từng phím). Ô tìm chỉ chứa "57" hoặc "#57" và **Enter** → mở thẳng chi tiết #57 ở bất kỳ tab nào; không tự mở khi đang gõ.
- Đổi tab, phạm vi, loại, lý do, người xử lý → về trang 1, thêm mục lịch sử (Back quay lại bộ lọc trước).
- "Làm mới" tải lại trang hiện tại, cập nhật badge sidebar. Không tự làm mới; danh sách không xếp lại khi đang xem (C-43).
- Thứ tự tab: sidebar → "Làm mới" → tab → ô tìm → bộ lọc → hàng → phân trang.
- Đổi số mục mỗi trang → về trang 1, nhớ cho bảng Báo cáo, dùng chung một giá trị cho cả hai tab.

### Checklist duyệt
- [ ] Đủ state trong bảng, mỗi state một frame; `default` có 1024 và bản tối.
- [ ] Mã việc tăng dần từ trên xuống ở Đang chờ; "Quá 24 giờ" chỉ ở hàng báo cáo đầu trước 18/10/2026 21:40.
- [ ] Badge sidebar = số hàng ở phạm vi Cần admin (12).
- [ ] Không có "·" nối thông tin khác loại trong ô nào; ô Nơi hai dòng không dính chữ.
- [ ] 1024: không cuộn ngang, đầu cột không cắt.
- [ ] Mascot chỉ ở `empty`.

---

## S-ADM-RPT-02 · Xử lý một việc

**Mục đích:** admin xem bằng chứng và quyết định trong cùng một màn, rồi để lại biên nhận.
**REQ:** REQ-ADMIN-03 (chi tiết, hành động, lời nhắn, ghi chú, xác nhận, biên nhận, CasePager, phím tắt, mã việc), REQ-SAFE-01 (gom theo đối tượng, `report_reviewed`, trạng thái hiện tại), REQ-SAFE-02 (lý do, khóa, Owner bị khóa vĩnh viễn), REQ-ADMIN-05 (Gỡ server từ báo cáo).
**Mở từ:** hàng của S-ADM-RPT-01 (có `CasePager` khi mở từ tab Đang chờ); tìm "#57"; link "#57" trong ghi chú nội bộ / Nhật ký (W3) / trang Người dùng (W2) — không có `CasePager`. **Đi tới:** S-ADM-RPT-01 (‹ Hàng đợi, Back, "Về hàng đợi"); S-ADM-RPT-02 việc kế / trước (`CasePager`, J / K, "Sang việc #58"); S-ADM-USR-02 `default` của người bị báo cáo (username trong `SubjectCard` là link — W2 Q14; "Mở trang người dùng ›" của popover); S-ADM-SRV-02 `default` (tên server trong `SubjectCard/server`); Nhật ký lọc theo việc (W3 — đích tạm).

### Bố cục (`default`, đối tượng tin, 1440)
```
┌ Sidebar ┬─────────────────────────────────────────────────────────┬──────────────────────────────┐
│         │ ‹ Hàng đợi                                  ‹ Việc 3 / 12 ›│                              │
│         │ #57  Tin nhắn của khanh.le                       ⏰ Quá 24 giờ │ ┌ SubjectCard ─────────────┐ │
│         │ ───────────────────────────────────────────────────────── │ │ (K) khanh.le              │ │
│         │ Nơi          Báo cáo đầu tiên   Số báo cáo   Ai xử lý được │ │ 💬 Tin vẫn còn trong kênh │ │
│         │ #hoi-dap     18/10/2026         2            Admin và người│ │ ✓ Tài khoản đang hoạt động│ │
│         │ Ôn thi GT2   lúc 20:07                       quản lý server│ │ 👥 Vẫn ở Ôn thi Giải tích 2│ │
│         │ ───────────────────────────────────────────────────────── │ │ ↺ Bị admin xử lý 1 lần Xem›│ │
│         │ Bằng chứng                                                 │ └──────────────────────────┘ │
│         │ 📷 Ảnh chụp lúc báo cáo, 18/10/2026 lúc 20:07               │ Hành động                    │
│         │ ┌ EvidenceFrame · message (cuộn, tin bị báo cáo ở giữa) ┐  │ ○ Bỏ qua                     │
│         │ └────────────────────────────────────────────────────────┘ │ ○ Xóa tin                    │
│         │ Báo cáo                                                    │ ○ Khóa tài khoản             │
│         │ Tên người báo cáo chỉ admin thấy. khanh.le và người quản lý   │                              │
│         │ server không thấy.                                         │                              │
│         │ (danh sách, không đầu cột)                                │                              │
│         │ Gian lận học tập                    20:07              │                              │
│         │ “Bán đề thi có đáp án ngay trong nhóm ôn thi”              │                              │
│         │ Lừa đảo                             20:09              │ [  Chọn một hành động   ] ░  │
│         │ Không có mô tả                                             │ (nút vô hiệu, đáy khung nhìn)│
└─────────┴─────────────────────────────────────────────────────────┴──────────────────────────────┘
```
Cột trái cuộn theo trang; cột Quyết định 360 (320 ở 1024) ghim, phần lựa chọn cuộn bên trong, nút xác nhận luôn ở đáy khung nhìn (C-50). Ô "Ai xử lý được" chỉ có ở việc phạm vi Có người quản lý server; việc Chỉ admin ghi "Chỉ admin" + dòng phụ theo lý do ("Báo cáo trong tin nhắn riêng" / "Người bị báo cáo là người quản lý server" / "Báo cáo về server" / "Hồ sơ mở ngoài server"). Ở 1024 bỏ dòng phụ của ô "Ai xử lý được".

### Component
`AdminSidebar`, `PageHeader · detail` + `BackLink` + `CasePager` (C-46), `ChipStatus` (C-21), `KeyValueStrip` (C-47), `EvidenceFrame` (C-48) chứa `MessageBubble` (C-10), `DataTable · compact` (C-43), `DecisionPanel` (C-50) chứa `SubjectCard` (C-49), `ActionOption`, `SegmentFilter`, `SelectField`, `Checkbox` (C-23), `TextArea`, `Receipt`, `Button` danger / primary M; `AdminDialog` (C-53 — đặc tả trong lần chạy này).

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| BackLink | "Hàng đợi" (luôn là chữ này; mở từ link ngoài thì đi tới hàng đợi mặc định — C-46) |
| CasePager | "Việc 3 / 12" |
| Tiêu đề | "#57" + "Tin nhắn của khanh.le" / "Hồ sơ của nam.ho" / "Server Chợ tài liệu K22" |
| Chip đầu trang | "Đang chờ" · "Quá 24 giờ" (việc quá hạn, icon `clock-alert` `warning`) · "Đã xử lý" |
| Dải nhãn–giá trị (tin) | "Nơi" · "Báo cáo đầu tiên" · "Số báo cáo" · "Ai xử lý được"; tin riêng: Nơi = "Tin nhắn riêng" + dòng phụ "Giữa phong.vu và an.nguyen" |
| Dải (hồ sơ) | "Nơi" ("Ôn thi Giải tích 2" / "Ngoài server") · "Báo cáo đầu tiên" · "Số báo cáo" · "Ai xử lý được" |
| Dải (server) | "Server" ("Chợ tài liệu K22") · "Báo cáo đầu tiên" · "Số báo cáo" · "Ai xử lý được" ("Chỉ admin") |
| Khối bằng chứng | "Bằng chứng" + ghi chú "5 tin trước và 5 tin sau tin bị báo cáo, không đổi dù tin bị sửa hay xóa sau đó. Cuộn trong khung để xem cả đoạn." (tin); "Ảnh chụp hồ sơ lúc báo cáo, không đổi dù hồ sơ được sửa sau đó." (hồ sơ); "Ảnh chụp server lúc báo cáo." (server) |
| Chú thích ảnh chụp | "Ảnh chụp lúc báo cáo, 18/10/2026 lúc 20:07" |
| Khối báo cáo | "Báo cáo" + "Tên người báo cáo chỉ admin thấy. {Tên} và người quản lý server không thấy." (việc Chỉ admin: "Tên người báo cáo chỉ admin thấy. {Tên} không thấy.") ; danh sách `ReportItem` không đầu cột (lý do + giờ, mô tả, người báo cáo); mô tả trống "Không có mô tả" |
| Panel | theo C-50; nhãn nhóm "Hành động" · "Thời hạn khóa" · "Lý do {tên} sẽ thấy" · "Lời nhắn cho {tên} (không bắt buộc)" · "Ghi chú nội bộ (chỉ admin thấy)"; checkbox "Xóa luôn tin bị báo cáo" |
| Nút xác nhận | "Chọn một hành động" (vô hiệu) · "Bỏ qua 2 báo cáo" · "Xóa tin của khanh.le" · "Khóa khanh.le 7 ngày và xóa tin" · "Khóa khanh.le 7 ngày" (bỏ tick) · "Khóa vĩnh viễn khanh.le và xóa tin" · "Đặt lại hồ sơ của nam.ho" · "Gỡ server Chợ tài liệu K22" |
| Biên nhận | câu "Hiếu đã khóa khanh.le 7 ngày và xóa tin" (chủ ngữ là tên admin — C-50) · dấu vết mono "19/10/2026 21:46" + "Lý do: Gian lận học tập" · "Xem trong Nhật ký ›" · nút "Sang việc #58" / "Về hàng đợi" |
| Biên nhận người khác | "Người quản lý server binh.tran đã bỏ qua" · "Trâm đã xóa tin" + dấu vết |

### Trạng thái — đối tượng tin (#57)
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` (1440 + dark, 1024 + dark) | Như bố cục: chưa chọn hành động, nút vô hiệu | "Chọn một hành động" |
| `dismiss` | Chọn Bỏ qua: chỉ còn nhóm Hành động + Ghi chú nội bộ; nút `primary` | "Bỏ qua 2 báo cáo" |
| `delete-message` | Chọn Xóa tin: + Ghi chú nội bộ; nút `danger` | "Xóa tin của khanh.le" |
| `suspend` (+ dark) | Chọn Khóa tài khoản, 7 ngày, lý do chọn sẵn "Gian lận học tập", tick "Xóa luôn tin bị báo cáo" | "Khóa khanh.le 7 ngày và xóa tin" |
| `suspend-scrolled · 1024` (+ dark) | Như `suspend`, panel cuộn tới Lời nhắn + Ghi chú (đã gõ lời nhắn 83/200) | Lời nhắn mẫu "Bán đề thi trong nhóm học là vi phạm quy tắc. Lần sau tài khoản sẽ bị khóa lâu hơn." |
| `scrolled · 1440` | Trang cuộn tới đáy: cột trái thấy trọn khối Báo cáo (2 hàng + mô tả), đầu trang và dải nhãn–giá trị trôi lên khỏi khung; cột Quyết định có đáy ghim ở đáy khung nhìn, đỉnh đi theo nội dung cho tới khi chạm lề trên. Phần lựa chọn của panel cũng cuộn tới đáy: thấy "Xóa luôn tin bị báo cáo", Lời nhắn đã gõ (3 dòng, 83/200) và Ghi chú nội bộ | — |
| `reason-open` | Ô "Lý do khanh.le sẽ thấy" mở menu 8 lý do, dấu chọn ở "Gian lận học tập" | — |
| `permanent-confirm` | Chọn Vĩnh viễn → bấm nút → `AdminDialog` | Xem [Dialog](#dialog-c-53-trong-area) |
| `submitting` | Nút `loading`, mọi ô khóa; CasePager và J / K khóa tới khi có kết quả | — |
| `receipt` (+ dark) | Panel thu lại: SubjectCard giữ ở đầu và cập nhật ("Tin đã bị xóa", "Đang bị khóa tới 26/10/2026 21:46", "Bị admin xử lý 2 lần"), dưới là `Receipt` (Lúc, Lý do, Lời nhắn, Ghi chú — bộ dòng cố định của C-50 từ W2; "#23", "#64" là link) rồi nút "Sang việc #58"; chip đầu trang "Đã xử lý"; badge sidebar 12 → 11; khung bằng chứng thêm "Tin đã bị xóa khỏi kênh"; focus vào "Sang việc #58" | Biên nhận như bảng chữ |
| `receipt-last` | Việc cuối của danh sách: #57 mở từ hàng đợi lọc Loại "Tin nhắn" + Lý do "Gian lận học tập" (chỉ còn #57) ⇒ "Việc 1 / 1", hai nút ‹ › vô hiệu; nút `secondary` "Về hàng đợi" thay "Sang việc …" | "Về hàng đợi" |
| `conflict` | **Thế giới D.** binh.tran (người quản lý server) bỏ qua lúc 21:44 trong khi Hiếu đang chọn; Hiếu bấm xác nhận → `40901` → `Receipt · by-other` | "Việc đã được xử lý trước khi bạn xác nhận." · "Người quản lý server binh.tran đã bỏ qua" · "19/10/2026 21:44" |
| `error` | `FormMessage` lỗi trên nút; lựa chọn giữ nguyên | "Chưa xử lý được. Thử lại." |
| `message-deleted` | Khánh đã tự xóa tin: `EvidenceFrame · deleted-now`; SubjectCard "Tin đã bị xóa"; ActionOption "Xóa tin" vô hiệu kèm "Tin đã bị xóa"; không có ô "Xóa luôn tin bị báo cáo" | "Tin đã bị xóa khỏi kênh" |
| `subject-suspended` | **Thế giới B.** Khánh đang bị khóa (khóa từ trang Người dùng không đóng báo cáo): SubjectCard "Đang bị khóa tới 20/10/2026 09:00" (icon `lock` `warning`); chọn Khóa tài khoản 7 ngày → dòng `already-suspended` dưới nhóm Thời hạn | "khanh.le đang bị khóa tới 20/10/2026 09:00. Khóa mới thay thời hạn này." · nút "Khóa khanh.le 7 ngày và xóa tin" |
| `history-open` | **Thế giới B**, như `subject-suspended`; bấm "Xem ›" ở dòng "Bị admin xử lý 2 lần" → `HistoryPopover` (C-56) neo dưới dòng đó: (1) "Khóa tài khoản 1 ngày" — Lý do "Lừa đảo", Admin "Trâm", Lúc "19/10/2026 09:00", Ghi chú "Nhiều người nhắn riêng báo bị lừa mua tài liệu." (làm từ trang Người dùng: Việc "Từ trang người dùng", Lời nhắn "–"); (2) "Đặt lại hồ sơ" — Lý do "Spam hoặc quảng cáo", Admin "Hiếu", Lúc "10/10/2026 14:20", Việc "#23", Lời nhắn "–", Ghi chú "–" (mỗi mục đủ 6 dòng theo thứ tự Lúc · Admin · Việc · Lý do · Lời nhắn · Ghi chú — C-56, duyệt W2 02/11/2026); panel giữ nguyên lựa chọn | "Lịch sử xử lý của khanh.le" · "Chỉ tính các lần admin xử lý." · "Mở trang người dùng ›" |
| `subject-pending-deletion` | **Thế giới C.** Khánh đang chờ xóa: SubjectCard "Tài khoản chờ xóa"; "Khóa tài khoản" vô hiệu kèm "Tài khoản đang chờ xóa"; chọn Xóa tin | "Xóa tin của khanh.le" |
| `handled` | Lúc 21:55 Hiếu mở lại #57 từ tab Đã xử lý: như `receipt` nhưng không có CasePager và không có "Sang việc" | "Hiếu đã khóa khanh.le 7 ngày và xóa tin" · "19/10/2026 21:46" |
| `loading` | Skeleton cột trái (dải, khung bằng chứng, bảng) + panel skeleton; tiêu đề chưa có | — |
| `load-error` | Lỗi mạng khi tải việc: vùng nội dung giữa trang, icon `octagon-x` `danger` | "Không tải được việc này." · "Thử lại" |
| `discard-confirm` | Đã gõ lời nhắn, bấm J → dialog `discard` | Xem Dialog |
| `not-found` | `/reports/999` hoặc id không có: vùng nội dung báo lỗi; không có "‹ Hàng đợi" (nút "Về hàng đợi" đã làm việc đó) | "Không có việc #999" · nút `secondary` "Về hàng đợi" |

### Trạng thái — đối tượng khác
| State | Khác gì | Chữ |
|---|---|---|
| `dm-message` | #52 tin của Phong trong tin nhắn riêng với An: dải "Nơi: Tin nhắn riêng" (+ "Giữa phong.vu và an.nguyen"), "Ai xử lý được: Chỉ admin"; bằng chứng là đoạn DM; SubjectCard không có dòng Server | Phong 22:13 "Mày nghĩ mày giỏi lắm à? Mai lên lớp biết tay" |
| `profile` | #55 hồ sơ của Nam: `EvidenceFrame · profile` (giới thiệu "Nhận làm hộ bài tập lớn, đồ án môn học, giá sinh viên. Inbox mình nhé!"); Hành động: Bỏ qua · Đặt lại hồ sơ · Khóa tài khoản; chọn Đặt lại hồ sơ, lý do sẵn "Spam hoặc quảng cáo" | "Đặt lại hồ sơ của nam.ho" |
| `profile-changed` | **Thế giới E** (sửa sau khi báo cáo): Nam sửa giới thiệu lúc 19/10/2026 10:30 thành "Sinh viên K22, thích học nhóm."; khung bằng chứng có nút chuyển, đang ở "Lúc báo cáo", dòng "Đã đổi sau khi báo cáo: giới thiệu"; SubjectCard thêm "Hồ sơ đã đổi sau khi báo cáo" | — |
| `profile-changed-current` | Như trên, đang ở "Hiện tại": chú thích "Bản hiện tại", thẻ hồ sơ với giới thiệu mới | — |
| `message-edited` | **Thế giới E**: khanh.le sửa tin #57 lúc 19/10/2026 08:12 thành "Ai cần tài liệu ôn thi thì inbox mình nhé"; nút chuyển ở "Lúc báo cáo", dòng "Tin đã được sửa lúc 19/10/2026 08:12"; SubjectCard "Tin đã được sửa sau khi báo cáo" thay "Tin vẫn còn trong kênh" | — |
| `message-edited-current` | Như trên, đang ở "Hiện tại": chỉ bong bóng của Khánh đổi sang nội dung mới, các tin khác giữ ảnh chụp | "Bản hiện tại" |
| `server-changed` | **Thế giới E**: Owner đổi tên server lúc 19/10/2026 10:05 thành "Thư viện K22" (giờ 43 thành viên); tiêu đề việc giữ "Server Chợ tài liệu K22" (theo ảnh chụp); SubjectCard hiện tên hiện tại + "Server đã đổi sau khi báo cáo"; dòng "Đã đổi sau khi báo cáo: tên"; nút xác nhận và dialog Gỡ server dùng tên **hiện tại** ("Gỡ server Thư viện K22") vì hành động áp lên server bây giờ | — |
| `server-changed-current` | Như trên, đang ở "Hiện tại": thẻ "Thư viện K22", "43 thành viên" | "Bản hiện tại" |
| `server` | #58 server Chợ tài liệu K22: `EvidenceFrame · server` (icon, tên, "41 thành viên"); `SubjectCard · server` ("41 thành viên", "Owner: khanh.le", "Chưa từng bị gỡ"); Hành động: Bỏ qua · Gỡ server (khóa Owner làm từ trang Người dùng); chọn Gỡ server, lý do sẵn "Gian lận học tập" | "Gỡ server Chợ tài liệu K22" |
| `remove-server-confirm` | Bấm nút → `AdminDialog · type-name` | Xem Dialog |

### Dialog (C-53) trong area
| Dialog | Chữ |
|---|---|
| Khóa vĩnh viễn | Tiêu đề "Khóa vĩnh viễn khanh.le?" · "khanh.le không đăng nhập được nữa cho tới khi admin mở khóa." · "khanh.le là Owner của Chợ tài liệu K22. Quyền Owner tự chuyển cho thành viên có vai trò cao nhất, và không trả lại khi mở khóa." (chỉ khi là Owner) · "Tin bị báo cáo cũng bị xóa." (khi tick) · "Hủy" / "Khóa vĩnh viễn" (`danger`) |
| Bỏ lời nhắn (`discard`) | Tiêu đề "Bỏ lời nhắn đang viết?" · "Lời nhắn và ghi chú bạn đã gõ cho #57 sẽ mất." · "Ở lại" / "Bỏ và sang việc" (`primary`) |
| Gỡ server | Tiêu đề "Gỡ server Chợ tài liệu K22?" · "41 thành viên mất server này ngay. Phòng học và cuộc gọi đang diễn ra trong server kết thúc. Không khôi phục được." · "khanh.le (Owner) nhận thông báo và email kèm lý do." · ô "Gõ tên server để xác nhận" · "Hủy" / "Gỡ server" (`danger`, vô hiệu tới khi gõ đúng tên — REQ-ADMIN-05 AC2) |

Frame: Khóa vĩnh viễn `confirm` (+ dark), Gỡ server `type-name` trống và `typed`, `discard`; focus vào nút "Hủy" khi mở (Khóa vĩnh viễn) / vào ô nhập (Gỡ server); Enter trong ô nhập = bấm "Gỡ server" khi đã đúng tên.

### Tương tác
- J / K → việc sau / trước trong `CasePager` (không chạy khi focus ở ô nhập). Đổi việc (J / K, ‹ ›, "Sang việc") khi panel có lựa chọn chưa xác nhận: chưa gõ chữ → chuyển luôn, bỏ lựa chọn; đã gõ lời nhắn hoặc ghi chú → dialog `discard` (frame `discard-confirm`).
- "/" chỉ có ở hàng đợi (trang chi tiết không có ô tìm).
- Thứ tự tab: sidebar → BackLink → CasePager → dải → khung bằng chứng (vùng cuộn) → bảng báo cáo → panel (SubjectCard "Xem" → Hành động → các ô) → nút xác nhận.
- Mở trang: focus ở tiêu đề trang (đọc "#57 Tin nhắn của khanh.le"), không nhảy vào khung bằng chứng; khung tự cuộn để tin bị báo cáo ở giữa.
- Hover / focus theo quy ước chung của web quản trị.

### Checklist duyệt
- [ ] Đủ state trong hai bảng + dialog, mỗi state một frame; bản 1024 và bản tối như đã ghi.
- [ ] Lý do chọn sẵn = lý do báo cáo đầu tiên ở mọi frame.
- [ ] Nhãn nút khớp lựa chọn (thời hạn, tick xóa tin).
- [ ] Biên nhận: badge sidebar 11, chip "Đã xử lý", SubjectCard cập nhật.
- [ ] 1024: nút xác nhận luôn thấy; không có chữ `text-tertiary` trên `surface-3`.
- [ ] Không mascot.

---

## Ma trận trạng thái chuẩn

| State | S-ADM-RPT-01 | S-ADM-RPT-02 |
|---|---|---|
| `default` | ✔ | ✔ |
| `loading` | ✔ skeleton bảng | ✔ skeleton trang |
| `empty` | ✔ mascot | ✗ — chi tiết luôn có một việc; id sai là `not-found` |
| `error` | ✔ | ✔ `error` khi xử lý; khi tải: 404 → `not-found`, lỗi mạng → khối lỗi "Không tải được việc này." + "Thử lại" (`load-error`) |
| `offline` | ✗ web quản trị không có chế độ offline (= `error`) | ✗ (= `error`) |
| `forbidden` | ✗ một cấp admin | ✗ |
| `os-permission` | ✗ không xin quyền trình duyệt | ✗ |
| Nghiệp vụ | `all`, `filtered`, `search-empty`, `case-not-found`, `handled`, `handled-by-moderator` | `dismiss` … `conflict`, `message-deleted`, `subject-suspended`, `handled`, `dm-message`, `profile`, `server` |

## Ai thấy gì (một sự kiện: Hiếu khóa khanh.le 7 ngày và xóa tin #57)

| Người | Thấy gì | Nơi sở hữu luật |
|---|---|---|
| Hiếu | Biên nhận tại chỗ; Nhật ký có dòng | W1 (đây), W3 |
| Admin khác (Trâm) | Hàng #57 sang Đã xử lý "Hiếu"; nếu đang mở #57: xác nhận → `conflict` | W1 |
| Người quản lý server (Bình, Tuấn, An) | Tab Báo cáo của server: #57 sang Đã xử lý "Đội ngũ NezFocus đã xóa tin và khóa tài khoản 7 ngày · 21:46" (không lý do, lời nhắn, tên admin) | 08 › S-SET-05 `handled-by-admin` |
| Hà, Mai (người báo cáo) | Mục `report_reviewed` "Báo cáo của bạn về tin nhắn của Khánh đã được xem xét", không nêu hành động | 06 (đã có) |
| Khánh | Bị đăng xuất mọi phiên; đăng nhập → dialog "Tài khoản đang bị khóa" + "Lý do: Gian lận học tập" + lời nhắn | 01 › S-AUTH-04 `suspended` |
| Nam (việc #55, 21:50) | Mục `profile_reset` "Hồ sơ của bạn đã được đặt lại vì vi phạm quy tắc" | 06 › `profile-reset` |
| Khánh, Owner (việc #58, 21:48) | Mục `server_removed` (thấy khi hết khóa, 26/10) + email; 41 thành viên mất server | 06 › `server-removed` |
| Thành viên kênh #hoi-dap | Tin của Khánh biến mất | 02 (đã có) |

---

## Quyết định (chốt 01/11/2026)

Product Owner đồng ý cả 17 khuyến nghị. Mỗi câu ghi ở đúng một nơi:

| # | Quyết định | Nơi sở hữu |
|---|---|---|
| Q1 | Phạm vi là `FilterSelect · single`; dòng gợi ý "Còn {n} việc có người quản lý server, chưa quá 24 giờ." + "Xem tất cả" | File này (S-ADM-RPT-01); C-45 |
| Q2 | Cột Phạm vi 3 giá trị (gộp "Quá 24 giờ"); Nơi hai dòng; 1024 ẩn Nơi và Báo cáo đầu | File này |
| Q3 | Ngày giờ "18/10/2026 lúc 20:07" trong câu, "18/10/2026 20:07" trong bảng | SRS 4.11 |
| Q4 | `ClearFilters` "Xóa bộ lọc" khi khác mặc định | C-45 |
| Q5 | Tìm mã mở khi Enter; "Không có việc #999" | SRS REQ-ADMIN-03; file này |
| Q6 | Chip "Quá 24 giờ"; "Chỉ admin" kèm lý do; "Giữa phong.vu và an.nguyen" | File này |
| Q7 | "‹ Hàng đợi" luôn có; từ nơi khác về hàng đợi mặc định | C-46 |
| Q8 | Biên nhận chủ ngữ là tên admin | C-50 |
| Q9 | Thế giới A (19/10/2026 21:40, Trâm, 15 việc, #23, Chợ tài liệu K22, DM của Phong) | File này › Thế giới mẫu |
| Q10 | Nơi "Ngoài server" | SRS REQ-ADMIN-03 |
| Q11 | Không có `missing-reason` ở W1 | C-50 |
| Q12 | Khóa người đang bị khóa thay thời hạn (AC9); chờ xóa không khóa / đặt lại hồ sơ | SRS REQ-ADMIN-03; C-50 |
| Q13 | Đối tượng server: Bỏ qua · Gỡ server | SRS REQ-ADMIN-03; C-50 |
| Q14 | Chuyển việc khi đã gõ chữ → dialog `discard` | File này; C-53 |
| Q15 | Tab Báo cáo của server ghi đủ hành động của admin, không lý do / lời nhắn | SRS REQ-SAFE-01; 08 |
| Q16 | Làm phía app trong W1: 01 `suspended`, 06 `profile-reset` / `server-removed`, 08 `handled-by-admin` | 01, 06, 08; README |
| Q17 | "Việc n / tổng" cố định từ lúc mở | SRS REQ-ADMIN-03; C-46 |

## Phía app kéo theo (Q16)

Frame vẽ trong lần chạy này, đặt cạnh nhóm frame của màn tương ứng ở app (khung 390 × 844, theme tối như frame đã duyệt của area đó):

| Frame | Spec |
|---|---|
| `S-AUTH-04 · suspended` | 01 › S-AUTH-04 (góc nhìn Khánh, 19/10/2026 22:00) |
| `S-NOTI-01 · profile-reset` | 06 (góc nhìn Nam, 19/10/2026 21:52) |
| `S-NOTI-01 · server-removed` | 06 (góc nhìn Khánh, 26/10/2026 22:05) |
| `S-SET-05 · handled-by-admin` | 08 (góc nhìn An, 19/10/2026 21:52) |

## Câu hỏi còn mở

Không còn. (#1 `server-deleted-by-owner` chốt 02/11/2026: vẫn cho Gỡ server — SRS REQ-ADMIN-05.)

## Edge case (rà ngày 02/11/2026)

Frame nằm trong nhóm "W1 · Báo cáo — Edge case", tên `W1-EDGE · <trường hợp>`. Mỗi frame là một thế giới nhánh, ghi trên tên frame; nền là #57 / #58 của thế giới A trừ khi ghi khác. Tên dài (D3) là ngoại lệ dữ liệu mẫu của README.

### Có frame
| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `subject-deleted` — khanh.le đã xóa hẳn tài khoản khi #57 còn chờ | Tiêu đề "Tin nhắn của tài khoản đã bị xóa"; thẻ: avatar `deleted` + "Tài khoản đã bị xóa", không có dòng lịch sử; "Khóa tài khoản" vô hiệu kèm "Tài khoản đã bị xóa"; "Bỏ qua", "Xóa tin" (tin còn) vẫn chọn được; bong bóng trong ảnh chụp giữ "Khánh" | DEC-28, REQ-ADMIN-03 |
| `reporter-deleted` — mai.tran (người báo cáo) đã xóa tài khoản | Dòng người báo cáo: avatar `deleted` + "Tài khoản đã bị xóa"; báo cáo vẫn tính ("Bỏ qua 2 báo cáo"); không tạo `report_reviewed` cho người đó | DEC-28, REQ-SAFE-01 |
| `server-deleted-by-owner` — khanh.le tự xóa Chợ tài liệu K22 lúc 19/10/2026 11:20 khi #58 còn chờ | Thẻ server thêm "Owner đã xóa server lúc 19/10/2026 11:20" (`trash-2`); "Gỡ server" **vẫn chọn được** (chốt 02/11/2026 — xóa mềm còn khôi phục được 30 ngày) kèm dòng dưới lựa chọn "Server đang chờ xóa; gỡ thì Owner không khôi phục được nữa."; đang chọn Gỡ server → "Gỡ server Chợ tài liệu K22" | REQ-SRV-05, REQ-ADMIN-05 |
| `stale-open-handled` — hàng đợi để lâu; Trâm đã xóa tin #57 lúc 21:20, Hiếu bấm hàng #57 lúc 21:40 | Mở ra là biên nhận "Trâm đã xóa tin" (không có dòng Lý do vì Xóa tin không cần lý do; Lúc "19/10/2026 21:20"), chip "Đã xử lý", **không** có câu xung đột, vẫn có "Sang việc #58"; badge cập nhật 11 khi mở trang | REQ-ADMIN-03 |
| `message-deleted-before-confirm` — Hiếu chọn "Xóa tin", khanh.le tự xóa tin, Hiếu bấm xác nhận | `40909`: thẻ đổi "Tin đã bị xóa"; "Xóa tin" vô hiệu; lựa chọn bị bỏ (panel về chưa chọn); khối thông báo trung tính trên nút | "Tin vừa bị xóa trước khi bạn xác nhận. Chọn lại hành động." — REQ-ADMIN-03 (`40909`) |
| `new-report-while-open` — Hiếu mở #57 lúc 21:40, lan.vu báo cáo thêm lúc 21:42 ("Spam hoặc quảng cáo"), Hiếu bấm "Bỏ qua 2 báo cáo" | `40909`: khối Báo cáo tải lại, báo cáo mới nằm cuối, nền `surface-2` kèm nhãn "Mới"; "Số báo cáo" 3; lựa chọn Bỏ qua giữ, nút thành "Bỏ qua 3 báo cáo"; khối thông báo trên nút | "Có 1 báo cáo mới về việc này. Xem lại trước khi xác nhận." — REQ-ADMIN-03 (`40909`) |
| `many-reports` — #58 có 37 báo cáo | Hiện 5 báo cáo đầu (cũ nhất), dưới cùng nút `text` "Xem thêm 32 báo cáo" (bấm → hiện hết tại chỗ); "Số báo cáo" 37 | REQ-ADMIN-03 |
| `long-username` — người bị báo cáo `tranthithanhhuonggiang2005` (32 ký tự) | Tiêu đề vừa một dòng ở 1440 (đo trên canvas; luật C-46 vẫn là tối đa 2 dòng, không cắt); thẻ: username xuống dòng giữa ký tự vì không có khoảng trắng để ngắt (CSS `overflow-wrap: anywhere`), không cắt; nhãn ô "Lý do tranthithanhhuonggiang2005 sẽ thấy" xuống dòng; nút xác nhận xuống 2 dòng (nút tự cao), không cắt | C-46, C-50 |
| `queue-crowded` — 1.986 việc cần admin | Hàng đợi cuộn tới đáy trang 1: badge sidebar "99+"; "Hiện 50 trong số 1.986 việc"; "‹ 1 2 3 4 5 … 40 ›" | C-42, C-44 |
| `replace-permanent` — khanh.le đang bị khóa vĩnh viễn (Trâm khóa lúc 19/10/2026 09:00), Hiếu chọn khóa 7 ngày | Thẻ "Bị khóa vĩnh viễn" (`ban` `danger`); dưới nhóm Thời hạn dòng cảnh báo `triangle-alert` `warning` | "khanh.le đang bị khóa vĩnh viễn. Khóa 7 ngày sẽ thay thế và mở khóa vào 26/10/2026 21:46." — REQ-ADMIN-03 AC9 |

### Chỉ ghi luật (giao diện không đổi)
| Tình huống | Luật |
|---|---|
| Admin bị vô hiệu hóa (menu CLI) khi đang mở trang | Mọi phiên bị thu hồi; lần gọi API kế tiếp `40100` → màn đăng nhập (W4); đăng nhập lại báo "Tài khoản quản trị này đã bị vô hiệu hóa." (REQ-ADMIN-01) |
| Phiên 12 giờ hết hạn khi đang gõ lời nhắn | Về đăng nhập (W4 `session-expired` — web tự chuyển đúng giờ hết hạn); nháp panel (lựa chọn, thời hạn, lý do, lời nhắn, ghi chú) giữ trong tab và khôi phục sau đăng nhập lại **cho đúng admin đã soạn** (admin khác đăng nhập thì bỏ nháp), kèm dòng `DP info` "Đã khôi phục lựa chọn bạn đang làm dở trước khi phiên đăng nhập kết thúc." (frame `S-ADM-RPT-02 · draft-restored`, vẽ ở W4); nếu việc đã bị người khác xử lý trong lúc đó thì hiện biên nhận của họ và bỏ nháp (REQ-ADMIN-01) |
| Cùng việc mở ở hai tab của Hiếu, xử lý ở tab 1 rồi bấm ở tab 2 | `40901` → biên nhận "Hiếu đã …" kèm dòng "Bạn đã xử lý việc này ở tab khác." thay câu xung đột (REQ-ADMIN-03) |
| Tải lại trang khi đã chọn hành động | Panel về `default`, không giữ nháp (chỉ giữ khi bị đưa về đăng nhập) |
| Hai admin cùng xử lý | Như `conflict`, người khác là admin: "Trâm đã xóa tin" + "Việc đã được xử lý trước khi bạn xác nhận." (REQ-ADMIN-03 `40901`) |
| Admin khác gỡ server #58 từ trang Server khi Hiếu đang mở việc | Xác nhận → `40901` → biên nhận "Server đã bị gỡ" (kết quả của REQ-ADMIN-05, người làm là admin đó) |
| Lời nhắn đủ 200, ghi chú đủ 500 ký tự trong biên nhận | Xuống dòng đủ, không cắt; panel cuộn nếu cao hơn khung nhìn |
| Ranh giới 24 giờ | Báo cáo đầu 20:07 thì "Quá 24 giờ" từ 20:07:01 hôm sau; hàng đợi và badge chỉ cập nhật khi tải trang / "Làm mới", không nhảy giữa chừng (REQ-ADMIN-03 AC8) |
| Việc chờ rất lâu (> 30 ngày) | Vẫn chỉ "Quá 24 giờ"; không có mốc thứ hai; thứ tự cũ nhất trên cùng giữ nó ở đầu |
