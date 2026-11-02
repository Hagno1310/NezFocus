# W3 · Tổng quan & Nhật ký (web quản trị)

Area thứ ba của web quản trị (CR-27, SRS v1.10). Hai màn: **Tổng quan** (chế độ Read: sản phẩm đang thế nào, có việc gì cần admin không, đã đạt mục tiêu đồ án chưa) và **Nhật ký quản trị** (chế độ Operate: ai đã làm gì, lúc nào, vì sao — nơi các link "Xem trong Nhật ký ›" của biên nhận dẫn tới).

**Nguồn:** SRS v1.10 › REQ-ADMIN-02 (Tổng quan), REQ-ADMIN-06 (Nhật ký), Mục 2.7 (KPI), REQ-ADMIN-01 (luật danh sách), REQ-ADMIN-03/04/05 (các hành động được ghi), menu CLI của 4.11 (sự kiện "Người vận hành (CLI)"), 8.2 (`platform_audit_logs`, `user_daily_activity`, `users.terms_accepted_at`). Diện mạo: `DESIGN.md` › Web quản trị (Biểu đồ, Chữ, Thông tin và câu chữ). Component: `00-components.md` › Web quản trị (C-42…C-56; area này đặc tả C-51 `StatStrip`, C-52 biểu đồ + `KpiTable`). Nhất quán với `w1-bao-cao.md`, `w2-nguoi-dung-server.md` (thế giới A, luật gọi tên, biên nhận, lịch sử xử lý). Hồ sơ nền tảng **web**.

> Trạng thái: **hành vi đã chốt 02/11/2026** (15 câu — mục [Quyết định](#quyết-định-chốt-02112026)); **đã vẽ 02/11/2026** — `Des/nezfocus.pen`, hai nhóm dưới nhóm edge case của W2: "W3 · Tổng quan & Nhật ký — S-ADM-OVR-01 · Tổng quan" (x 77706, y 28700) và "— S-ADM-LOG-01 · Nhật ký quản trị" (y 30900); master mới ở board C-51, C-52 (x 94926 / 96346, y −2652) và hàng W3 của board C-43. Ba vòng duyệt (khoảng cách biểu đồ, bộ chọn 7 / 30 / 90 ngày, tên người làm và ô tìm, dòng Tự động) và edge case (bước 6) áp 02/11/2026. **Product Owner duyệt toàn bộ W3 ngày 02/11/2026.**

---

## Quy ước của area

| Hạng mục | Quy ước |
|---|---|
| Khung | **1440 × 900** (chính) và **1024 × 768** cho trạng thái có bố cục đổi theo độ rộng (mỗi màn `default`). Trạng thái còn lại chỉ vẽ ở 1440 |
| Theme khi duyệt | Không phải vertical slice: theme sáng; mỗi màn có `default · 1440` bản tối để kiểm nhanh (biểu đồ kiểm kỹ ở bản tối: khối rỗng viền 2 phải đọc được trên `surface-1` tối) |
| Vị trí trong điều hướng | `AdminSidebar` (C-42): mục **Tổng quan** hoặc **Nhật ký** đang chọn; badge Báo cáo = **9** |
| URL | Tổng quan `/` (Q9: trang mở sau đăng nhập). Nhật ký `/audit-logs` (query `actor`, `action`, `range` hoặc `from` / `to`, `page`, `entry` — Q13, Q14); số mục mỗi trang không vào URL, nhớ trong trình duyệt (REQ-ADMIN-01) |
| Ngày giờ | Giờ Việt Nam (SRS 4.11). Luôn có năm. Cột Nhật ký: mono "19/10/2026 22:03". Trong câu và dải: "19/10/2026 lúc 21:58". Trục biểu đồ: "dd/MM" không năm (cả 30 ngày nằm trong một khoảng ghi đủ năm ở tiêu đề: "20/09 – 19/10/2026") |
| Khoảng thời gian | Bộ chọn "7 ngày \| 30 ngày \| 90 ngày" ở đầu trang (Q16), **mặc định 30 ngày**, nằm trong URL `?range=7d \| 30d \| 90d`, không nhớ. Theo ngày giờ Việt Nam, **tính cả hôm nay** (chưa hết): 7 ngày = 13/10 – 19/10/2026; 30 ngày = 20/09 – 19/10/2026; 90 ngày = 22/07 – 19/10/2026, gộp thành 13 "tuần" (7 ngày tính lùi từ hôm nay; tuần xa nhất 22/07 – 27/07 chỉ 6 ngày). Số của hôm nay tính tới lúc cập nhật. Thẻ Cần admin và KPI không đổi theo khoảng |
| Số | Số đếm và giá trị `stat` / `numeric-inline` (Unbounded, `tabular-nums`), đơn vị bằng Be Vietnam Pro; nghìn có dấu chấm ("27.390"); phần trăm làm tròn số nguyên ("63%"); 0 hiện "–" (Be Vietnam Pro `text-tertiary`) ở ô bảng và ô thẻ số |
| Phút học | (Q3) Thẻ và trục biểu đồ theo **giờ**; tooltip, bảng dữ liệu theo **phút** chính xác; KPI theo phút (đúng định nghĩa và mục tiêu "≥ 120 phút") |
| Người | Chỉ **username** (SRS 4.11). Admin gọi bằng tên. Đối tượng là tài khoản admin (sự kiện CLI): email của tài khoản đó (SRS REQ-ADMIN-06 AC2) |
| Mascot | **Không có** (`DESIGN.md` › Web quản trị › Mascot: không ở Tổng quan, Nhật ký) |
| Màu | Restrained. Biểu đồ không màu pha: hai chuỗi cùng `primary`, phân biệt bằng kiểu tô (`DESIGN.md` › Biểu đồ). KPI: `success` chỉ ở icon "Đạt", `warning` chỉ ở icon "Chưa đạt" |
| Lớp phủ | Không dialog, không toast. Menu bộ lọc (C-45), tooltip biểu đồ (C-52) |

### Thế giới mẫu

**Thế giới A, lúc 22:10 Thứ Hai 19/10/2026** (mọi frame trừ khi ghi khác): sau cả hai chuỗi sự kiện của W1 (21:46 khóa khanh.le 7 ngày và xóa tin #57; 21:48 gỡ Chợ tài liệu K22 #58; 21:50 đặt lại hồ sơ nam.ho #55) và W2 (21:58 khóa vu.dang 30 ngày; 22:03 gỡ Soi kèo bóng đá). Admin đăng nhập: **Hiếu** (`hieupt1003@gmail.com`). Admin thứ hai: **Trâm** (`tramnguyen.ops@gmail.com` — email chốt ở đây, lần đầu cần đến trong Nhật ký). Chọn 22:10 để Nhật ký có đủ năm việc của hai chuỗi.

**Luật nhất quán dữ liệu:**
- "Cần admin xử lý" = badge sidebar = **9** (12 lúc 21:40 trừ #55, #57, #58; khóa vu.dang từ trang Người dùng không đóng việc nào; Soi kèo bóng đá không có việc chờ). "Đang chờ tất cả" = **12** (15 trừ ba việc trên). (W1 ghi "W3 dùng 15" theo lúc 21:40 — sửa ghi chú đó thành 12 lúc 22:10.)
- Người dùng mới theo ngày = đúng các ngày tạo trong bảng người dùng của W2 (16 người tạo trong 30 ngày: nam.ho 20/09, bao.truong 22/09 và 14 người dùng nền 12/10 – 19/10). Hôm nay = 3 (thao.nguyen, quang.pham, linh.hoang — khớp REQ-ADMIN-02 AC1); 7 ngày = 13.
- Tổng 1.284 người dùng (W2) gồm 1.253 tài khoản tạo trước 01/09/2026 (giai đoạn dùng thử trước bộ mẫu) — số này không hiện ở đâu, chỉ để mọi con số khác không mâu thuẫn.
- Người hoạt động (đếm người khác nhau): 7 ngày **214** ≥ số lớn nhất của một ngày (138); 30 ngày **386** ≥ mọi tuần; 90 ngày **547** ≥ 386. Mọi người trong bảng W2 đều có "Hoạt động gần nhất" trong 7 ngày.
- Phút học: 7 ngày = tổng 7 dòng cuối = 17.560 + 9.830 = **27.390 phút** (456 giờ); 30 ngày = tổng 30 dòng = 58.590 + 35.570 = **94.160 phút** (1.569 giờ); 90 ngày = tổng 13 tuần = 136.760 + 90.170 = **226.930 phút** (3.782 giờ).
- Người dùng mới: hôm nay 3; 7 ngày 13; 30 ngày 16; 90 ngày 31 (thêm 15 người của bộ mẫu tạo 01/09 – 18/09; 1.253 tài khoản cũ tạo trước 22/07).
- Bốn tuần cuối của bảng tuần = tổng đúng các ngày tương ứng của bảng 30 ngày.
- KPI tính trên **16 người dùng tạo trong 30 ngày** (SRS REQ-ADMIN-02); tài khoản chưa hoàn tất không có trong 16 người đó (W2) nhưng có trong mẫu số của KPI hoàn tất tài khoản (Q1).
- Nhật ký = mọi dòng `platform_audit_logs`: **59** mục (51 việc báo cáo do admin xử lý — 48 việc trong 54 việc đã xử lý lúc 21:40 trừ 6 việc của người quản lý server #40, #41, #44, #47, #48, #49, cộng #55, #57, #58; 5 việc từ trang Người dùng / Server; 3 việc CLI). 50 / trang ⇒ 2 trang.
- Không có thời điểm nào muộn hơn 22:10.

**Bảng dữ liệu 30 ngày** (nguồn của mọi biểu đồ, bảng "Xem dạng bảng" và thẻ số; ngày in đậm là Chủ Nhật):

| Ngày | Người hoạt động | Người dùng mới | Học nhóm (phút) | Học một mình (phút) |
|---|---|---|---|---|
| **20/09** | 96 | 1 | 1.820 | 1.140 |
| 21/09 | 88 | – | 1.540 | 1.060 |
| 22/09 | 91 | 1 | 1.610 | 1.020 |
| 23/09 | 85 | – | 1.480 | 990 |
| 24/09 | 90 | – | 1.570 | 1.050 |
| 25/09 | 82 | – | 1.390 | 960 |
| 26/09 | 79 | – | 1.260 | 930 |
| **27/09** | 98 | – | 1.880 | 1.170 |
| 28/09 | 93 | – | 1.700 | 1.090 |
| 29/09 | 95 | – | 1.730 | 1.110 |
| 30/09 | 92 | – | 1.650 | 1.080 |
| 01/10 | 97 | – | 1.790 | 1.120 |
| 02/10 | 94 | – | 1.720 | 1.060 |
| 03/10 | 88 | – | 1.530 | 1.010 |
| **04/10** | 105 | – | 2.060 | 1.230 |
| 05/10 | 101 | – | 1.950 | 1.190 |
| 06/10 | 104 | – | 2.010 | 1.210 |
| 07/10 | 99 | – | 1.880 | 1.150 |
| 08/10 | 106 | – | 2.090 | 1.240 |
| 09/10 | 102 | – | 1.960 | 1.170 |
| 10/10 | 96 | – | 1.780 | 1.100 |
| **11/10** | 117 | – | 2.380 | 1.360 |
| 12/10 | 112 | 1 | 2.250 | 1.300 |
| 13/10 | 118 | 1 | 2.420 | 1.380 |
| 14/10 | 115 | 1 | 2.330 | 1.340 |
| 15/10 | 121 | 2 | 2.510 | 1.410 |
| 16/10 | 119 | 2 | 2.460 | 1.390 |
| 17/10 | 113 | 2 | 2.290 | 1.320 |
| **18/10** | 138 | 2 | 2.940 | 1.560 |
| 19/10 (tới 22:10) | 129 | 3 | 2.610 | 1.430 |

**Bảng theo tuần (90 ngày)** — 7 ngày tính lùi từ hôm nay; số người hoạt động là số người khác nhau trong tuần:

| Tuần | Người hoạt động | Người dùng mới | Học nhóm (phút) | Học một mình (phút) |
|---|---|---|---|---|
| 22/07 – 27/07 (6 ngày) | 139 | – | 7.650 | 5.380 |
| 28/07 – 03/08 | 151 | – | 9.120 | 6.400 |
| 04/08 – 10/08 | 147 | – | 8.810 | 6.240 |
| 11/08 – 17/08 | 143 | – | 8.540 | 6.080 |
| 18/08 – 24/08 | 146 | – | 8.700 | 6.150 |
| 25/08 – 31/08 | 149 | – | 8.960 | 6.300 |
| 01/09 – 07/09 | 154 | 9 | 9.420 | 6.510 |
| 08/09 – 14/09 | 160 | 4 | 9.880 | 6.720 |
| 15/09 – 21/09 | 168 | 3 | 10.450 | 7.020 |
| 22/09 – 28/09 | 171 | 1 | 10.890 | 7.210 |
| 29/09 – 05/10 | 182 | – | 12.430 | 7.800 |
| 06/10 – 12/10 | 198 | 1 | 14.350 | 8.530 |
| 13/10 – 19/10 (tới 22:10) | 214 | 13 | 17.560 | 9.830 |

Nhịp tuần: hè (tháng 8) thấp, tăng từ khi vào học kỳ (01/09 — 9 người của bộ mẫu tạo tuần đầu). Nhịp ngày: Chủ Nhật cao nhất tuần (học dồn tối Chủ Nhật — khớp giờ mẫu 18/10 của app); tăng dần từ đầu tháng 10 (mùa thi giữa kỳ, đợt người dùng mới 12/10 – 19/10).

**KPI (16 người tạo 20/09 – 19/10/2026):**

| Chỉ số (tên trên UI — Q5) | Kết quả | Mẫu số | Mục tiêu | Đạt? |
|---|---|---|---|---|
| Hoàn tất tài khoản trong 24 giờ (thay Verification rate — Q1) | 89% | 16 / 18 tài khoản (2 tài khoản nhập đúng mã rồi bỏ dở màn Hoàn tất quá 24 giờ) | ≥ 70% | Đạt |
| Học ≥ 15 phút trong 24 giờ đầu (Activation rate) | 63% | 10 / 16 người | ≥ 50% | Đạt |
| Phút học mỗi tuần / người hoạt động | 142 phút | 2.272 phút / 16 người hoạt động | ≥ 120 phút | Đạt |
| Quay lại ngày thứ 7 (D7 retention) | 50% | 1 / 2 người (chỉ nam.ho, bao.truong đã qua ngày thứ 7; nam.ho quay lại 27/09) | ≥ 25% | Đạt |
| Chuỗi từ 3 ngày (Streak ≥ 3) | 19% | 3 / 16 người | ≥ 20% | **Chưa đạt** |
| Phút học nhóm / tổng phút học (Group study ratio) | 61% | 1.390 / 2.272 phút | Theo dõi | — |
| Việc xong trước hạn (Task completion) | 64% | 7 / 11 việc có hạn | Theo dõi | — |

**Nhật ký — các dòng** (mới nhất trên cùng; "–" = không có):

| # | Thời gian | Người làm | Hành động | Đối tượng | Việc | Lý do | Ghi chú nội bộ | Lời nhắn / Chi tiết |
|---|---|---|---|---|---|---|---|---|
| 1 | 19/10/2026 22:03 | Hiếu | Gỡ server | Soi kèo bóng đá | – | Spam hoặc quảng cáo | – | "Server quảng bá cá cược không được phép trên NezFocus." · 12 thành viên mất server |
| 2 | 19/10/2026 21:58 | Hiếu | Khóa tài khoản 30 ngày | vu.dang | – | Lừa đảo | Còn #60, #68 đang chờ, chưa đóng. | "Gửi link cá cược và nhắn riêng lừa chuyển tiền là vi phạm quy tắc." · khóa tới 18/11/2026 lúc 21:58 |
| 3 | 19/10/2026 21:50 | Hiếu | Đặt lại hồ sơ | nam.ho | #55 | Spam hoặc quảng cáo | – | – · đóng 1 báo cáo |
| 4 | 19/10/2026 21:48 | Hiếu | Gỡ server | Chợ tài liệu K22 | #58 | Gian lận học tập | – | "Server chia sẻ đề thi có đáp án là vi phạm quy tắc học tập." · 41 thành viên mất server; đóng 3 báo cáo |
| 5 | 19/10/2026 21:46 | Hiếu | Khóa tài khoản 7 ngày, xóa tin | khanh.le | #57 | Gian lận học tập | Tái phạm sau #23 (đặt lại hồ sơ 10/10). Cùng người với #64. | "Bán đề thi trong nhóm học là vi phạm quy tắc. Lần sau tài khoản sẽ bị khóa lâu hơn." · khóa tới 26/10/2026 lúc 21:46; đóng 2 báo cáo |
| 6 | 18/10/2026 20:05 | Hiếu | Xóa tin | Tin của vu.dang | #56 | – | – | đóng 1 báo cáo |
| 7 | 17/10/2026 11:30 | Trâm | Khóa tài khoản vĩnh viễn | tailieu.giare99 | – | Spam hoặc quảng cáo | Nhắn riêng hàng loạt cho thành viên mới để bán đề thi. | – (không là Owner server nào nên không có dòng chuyển Owner) |
| 8 | 17/10/2026 10:20 | Trâm | Khóa tài khoản 1 ngày | phong.vu | #54 | Quấy rối hoặc bắt nạt | – | khóa tới 18/10/2026 lúc 10:20; đóng 1 báo cáo |
| 9 | 17/10/2026 09:12 | Hiếu | Bỏ qua báo cáo | Hồ sơ của quan.ng | #53 | – | – | đóng 1 báo cáo |
| 10 | 16/10/2026 22:40 | Trâm | Bỏ qua báo cáo | CLB Guitar PTIT | #51 | – | – | đóng 1 báo cáo |
| 11 | 16/10/2026 21:30 | Hiếu | Bỏ qua báo cáo | Tin của giang.vo | #50 | – | – | đóng 1 báo cáo |
| 12 | 16/10/2026 14:00 | Hiếu | Khóa tài khoản 30 ngày | kiet.ngo | – | Quấy rối hoặc bắt nạt | – | khóa tới 15/11/2026 lúc 14:00 |
| 13 | 16/10/2026 11:15 | Trâm | Xóa tin | Tin của vu.dang | #46 | – | – | đóng 1 báo cáo |
| 14 | 15/10/2026 20:40 | Hiếu | Đặt lại hồ sơ | phuc.le | #45 | Spam hoặc quảng cáo | – | đóng 1 báo cáo |
| 15 | 15/10/2026 15:20 | Trâm | Bỏ qua báo cáo | Tin của phong.vu | #43 | – | – | đóng 1 báo cáo |
| 16 | 15/10/2026 11:05 | Hiếu | Bỏ qua báo cáo | Hồ sơ của vu.dang | #42 | – | – | đóng 1 báo cáo |
| 17–52 | 14/10 – 03/10/2026 | Hiếu / Trâm | các việc #39 … #5 do admin xử lý (W1: phần lớn Bỏ qua; #37, #32, #21, #9 là Xóa tin); xen đúng thời điểm một dòng **05/10/2026 08:40 · Người vận hành (CLI) · Đặt mật khẩu mới · tramnguyen.ops@gmail.com** (chi tiết "Thu hồi mọi phiên của tài khoản này.") | | | | | |
| 53–57 | 30/09 · 27/09 · 24/09 · 21/09 · 22/09/2026 | | #4 Bỏ qua (Trâm, Hồ sơ của quan.ng, 30/09 16:10) · #3 Bỏ qua (Hiếu, Tin của giang.vo, 27/09 21:20) · #2 Bỏ qua (Trâm, Hồ sơ của minh.do, 24/09 10:45) · #1 Bỏ qua (Hiếu, Tin của quan.ng, 22/09 19:30) · **Khóa tài khoản 7 ngày** (Trâm, 21/09/2026 10:05, đối tượng "Tài khoản đã bị xóa", Spam hoặc quảng cáo — W2 `deleted-account`) | | | | | |
| 58 | 30/08/2026 09:05 | Người vận hành (CLI) | Tạo admin | tramnguyen.ops@gmail.com | – | – | – | Email tramnguyen.ops@gmail.com, tên “Trâm”. |
| 59 | 30/08/2026 09:00 | Người vận hành (CLI) | Tạo admin | hieupt1003@gmail.com | – | – | – | Email hieupt1003@gmail.com, tên “Hiếu”. |

(Số thứ tự ở đây chỉ để tham chiếu. #1…#4 chưa có đối tượng ở W1 / W2 — chốt ở đây, không dính Phong, Vũ, Phúc, Nam, Khánh và đối tượng tạo trước ngày báo cáo.)

---

## S-ADM-OVR-01 · Tổng quan

**Mục đích:** trả lời trong một màn hình: có việc gì cần admin không; sản phẩm có lớn lên và người dùng có học không (30 ngày); đã đạt mục tiêu đồ án chưa.
**REQ:** REQ-ADMIN-02 (thẻ số, biểu đồ 30 ngày, bảng KPI, định nghĩa, làm mới), 2.7 (KPI, mục tiêu), REQ-ADMIN-03 (nhóm "Cần admin").
**Mở từ:** mục Tổng quan của sidebar (`default`); đăng nhập xong khi không có trang đang xem dở (Q9). **Đi tới:** S-ADM-RPT-01 `default` (bấm ô "Cần admin xử lý" — hàng đợi Đang chờ, phạm vi Cần admin); S-ADM-USR-01 `default` (bấm ô "Người dùng mới" — đề xuất Q8).

**Câu hỏi admin mang tới (Q16):**

| Câu hỏi | Phần trả lời | Có trên màn |
|---|---|---|
| Có việc gì cần mình ngay không? | Ô "Cần admin xử lý" (bấm → hàng đợi) | ✓ |
| Hôm nay / tuần này có ai mới, bao nhiêu người dùng app? | Ô Người dùng mới, Người hoạt động | ✓ |
| Người dùng có thật sự học không, học nhóm hay một mình? | Ô Phút học + biểu đồ Phút học | ✓ |
| Đang tăng hay giảm? | Biểu đồ 30 ngày (không có số so sánh tuần trước — SRS không có) | ✓ |
| Đạt mục tiêu đồ án chưa? (bảo vệ đồ án) | Bảng KPI kèm mục tiêu, mẫu số | ✓ |
| Số này tính lúc nào? | "Cập nhật lúc 22:10" | ✓ |
| Server nào đông nhất, ai bị báo cáo nhiều nhất? | Không — sắp xếp danh sách Người dùng / Server (W2 R9) | — |

### Bố cục (`default`, 1440 — Q4 phương án B)
```
┌ AdminSidebar ┬────────────────────────────────────────────────────────────────────────────┐
│ Tổng quan    │ Tổng quan  [7 ngày|30 ngày|90 ngày]            Cập nhật lúc 22:10  [⟳ Làm mới]  │ PageHeader + bộ chọn (Q16)
│ đang chọn    │ ┌──────────────────┬──────────────────┬──────────────────┬─────────────────┐│
│ Báo cáo (9)  │ │Người dùng mới   ›│Người hoạt động   │Phút học          │Cần admin xử lý ›││ StatStrip (C-51)
│              │ │3 hôm nay         │386               │1.569 giờ         │9                ││ kẻ trên dưới, kẻ dọc
│              │ │16 trong 30 ngày  │trong 30 ngày     │94.160 phút trong…│12 đang chờ tất cả││
│              │ └──────────────────┴──────────────────┴──────────────────┴─────────────────┘│
│              │ Người dùng · 20/09 – 19/10/2026  Xem dạng bảng │ Chỉ số mục tiêu              │
│              │ Người hoạt động mỗi ngày                 129 ← │ Tính trên 16 người dùng tạo  │
│              │  150┤            ╱╲      ╱──╲  ╱╲ ╱             │ từ 20/09 đến 19/10/2026.     │
│              │  100┤──╲╱──╲──╱──  ──╲╱──    ──                 │ Chỉ số        Kết quả Mục tiêu│
│              │ Người dùng mới mỗi ngày                    3 ← │ Hoàn tất tài… 89%     ≥ 70%  │
│              │    3┤                            ▁ ▁ ▂ ▂ ▂ ▂ █ │               16 / 18 ✓ Đạt  │
│              │     └ 20/09  27/09  04/10  11/10  18/10        │ …(7 hàng)                    │
│              │ Phút học · 20/09 – 19/10/2026   Xem dạng bảng  │                              │
│              │ ■ Học nhóm  □ Học một mình                     │                              │
│              │   75 giờ┤                               ▆      │                              │
│              │         ┤ ▃▂▃▂▂▂▂▃▃▃▃▃▃▂▄▄▄▄▄▄▃▅▅▅▅▅▅▅█▇       │                              │
│              │         └ 20/09  27/09  04/10  11/10  18/10    │                              │
└──────────────┴────────────────────────────────────────────────┴──────────────────────────────┘
```
Lưới 12 cột, khoảng 24 (`DESIGN.md` › Layout). Vùng nội dung 1144: `StatStrip` hết bề rộng; cột trái 744: khối Người dùng (hai biểu đồ nhỏ cùng trục ngày, Q2) rồi khối Phút học; khoảng giữa hai cột **40** (sửa sau duyệt 02/11/2026: 24 làm nút "Xem dạng bảng" dính vào tiêu đề "Chỉ số mục tiêu"); cột phải 360: `KpiTable`. Mọi thứ nằm trong khung 900. **1024** (vùng 744): `StatStrip` 4 ô giữ một hàng (C-47: tối đa 5 ô); các khối xếp dọc theo thứ tự Người dùng → Phút học → Chỉ số mục tiêu (KPI rộng hết vùng, xuống dưới mép khung — trang cuộn).

### Component
`AdminSidebar`, `PageHeader · list` (C-46; phải: chữ "Cập nhật lúc …" + `Button · secondary` S "Làm mới" icon `rotate-cw`), **`StatStrip` (C-51, mới)**, **`LineChart`, `ColumnChart`, `StackedColumnChart`, `ChartTooltip`, `ChartTable`, `KpiTable` (C-52, mới)**. Khối không bọc thẻ: tiêu đề `title-2` + nút `text` "Xem dạng bảng" sát phải, kẻ trên `border` giữa các khối.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Tổng quan" |
| Bộ chọn khoảng | `SegmentFilter` (C-45) 3 lựa chọn "7 ngày" · "30 ngày" · "90 ngày", mặc định 30 ngày; nhãn ẩn "Khoảng thời gian". **Vị trí (duyệt 02/11/2026):** ngay sau tiêu đề, cách 24 (bộ chọn trả lời "đang xem khoảng nào" nên đi cùng tiêu đề); bên phải chỉ còn "Cập nhật lúc …" sát nút "Làm mới" (dòng trạng thái đứng cạnh đúng nút nó mô tả); cao 40 bằng nút S |
| Cập nhật | "Cập nhật lúc 22:10" (`label` `text-secondary`) · nút "Làm mới" |
| Ô 1 | nhãn "Người dùng mới" + `chevron-right` (Q8) · giá trị "3" + đơn vị "hôm nay" (không đổi theo khoảng) · dòng phụ "16 trong 30 ngày" (7: "13 trong 7 ngày"; 90: "31 trong 90 ngày") |
| Ô 2 | "Người hoạt động" · "386" · dòng phụ "trong 30 ngày" (7: 214; 90: 547) |
| Ô 3 | "Phút học" · "1.569" + "giờ" · dòng phụ "94.160 phút trong 30 ngày" (7: 456 / 27.390; 90: 3.782 / 226.930) (Q3) |
| Ô 4 | "Cần admin xử lý" + `chevron-right` · "9" · dòng phụ "12 đang chờ tất cả" |
| Khối 1 | "Người dùng" + khoảng theo bộ chọn ("20/09 – 19/10/2026"; 7: "13/10 – 19/10/2026"; 90: "22/07 – 19/10/2026") `label` `text-secondary`; biểu đồ nhỏ "Người hoạt động mỗi ngày" (nhãn cuối "129"), "Người dùng mới mỗi ngày" (nhãn cột cuối "3"); 90 ngày: "… mỗi tuần" (nhãn cuối "214", "13") |
| Khối 2 | "Phút học" + khoảng; chú giải "Học nhóm" (ô vuông đặc) · "Học một mình" (ô vuông rỗng viền 2) |
| Trục | 30 ngày: "20/09" "27/09" "04/10" "11/10" "18/10" (mỗi Chủ Nhật); giá trị 0 · 50 · 100 · 150 (người hoạt động), 0 · 2 · 4 (người dùng mới), 0 · 25 · 50 · 75 "giờ" (phút học). 7 ngày: nhãn từng ngày "13/10" … "19/10", trục giá trị như 30 ngày. 90 ngày: nhãn ngày cuối tuần của tuần 1, 4, 7, 10, 13 ("27/07" "17/08" "07/09" "28/09" "19/10"); giá trị 0 · 75 · 150 · 225, 0 · 5 · 10 · 15, 0 · 160 · 320 · 480 "giờ" |
| Nút bảng | "Xem dạng bảng" ⇄ "Xem biểu đồ" (Q6) |
| Khối KPI | "Chỉ số mục tiêu" · câu phạm vi "Tính trên 16 người dùng tạo từ 20/09/2026 đến 19/10/2026." · đầu cột "Chỉ số" · "Kết quả" · "Mục tiêu" |
| Hàng KPI | tên (bảng KPI ở Thế giới mẫu); kết quả "89%" + dòng phụ mẫu số "16 / 18 tài khoản"; mục tiêu "≥ 70%" + dòng phụ "Đạt" (`circle-check` `success`) / "Chưa đạt" (`circle-alert` `warning`); hàng theo dõi: mục tiêu "Theo dõi", không dòng phụ (Q5) |
| Chưa đủ dữ liệu | ô kết quả "Chưa đủ dữ liệu" `body-sm` `text-tertiary`, không mẫu số; ô mục tiêu giữ mục tiêu, không "Đạt / Chưa đạt" (REQ-ADMIN-02) |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` (1440 + dark, 1024) | Như bố cục, thế giới A 22:10, khoảng **30 ngày** | — |
| `range-7` | Chọn "7 ngày": thẻ 13 / 214 / 456 giờ; mỗi biểu đồ 7 cột / điểm (cột rộng 24), nhãn trục từng ngày; URL `?range=7d`; KPI giữ nguyên (Q16) | khoảng "13/10 – 19/10/2026" |
| `range-90` | Chọn "90 ngày": thẻ 31 / 547 / 3.782 giờ; ba biểu đồ theo tuần (13 cột / điểm), tên "… mỗi tuần", tooltip ghi khoảng tuần; KPI giữ nguyên | khoảng "22/07 – 19/10/2026" |
| `chart-hover` | Chuột trên cột 18/10 của Phút học: cột nổi (cột khác mờ 40%), `ChartTooltip` phía trên cột | "Chủ Nhật 18/10/2026" · "Học nhóm 2.940 phút" · "Học một mình 1.560 phút" · "Tổng 4.500 phút" |
| `table-view` | Khối Phút học bấm "Xem dạng bảng": biểu đồ thay bằng `ChartTable` cùng chiều cao, cuộn bên trong, mới nhất trên cùng (Q6) | đầu cột "Ngày" · "Học nhóm" · "Học một mình" · "Tổng" (phút); hàng đầu "19/10/2026 (tới 22:10)"; nút "Xem biểu đồ" |
| `table-view-users` | Khối Người dùng bấm "Xem dạng bảng": một bảng chung cho hai biểu đồ nhỏ, cao bằng vùng vẽ, cuộn bên trong, mới nhất trên cùng (thêm sau duyệt 02/11/2026) | đầu cột "Ngày" · "Người hoạt động" · "Người dùng mới"; hàng đầu "19/10/2026 (tới 22:10)" · 129 · 3; ngày không có người mới ghi "–"; nút "Xem biểu đồ" |
| `refreshing` | Bấm "Làm mới": nút `loading`, số và biểu đồ giữ nguyên tới khi có số mới (không skeleton) — Q7 | "Đang làm mới…" thay "Cập nhật lúc 22:10" |
| `refresh-error` | Làm mới thất bại: giữ số cũ; cạnh nút hiện icon `octagon-x` `danger` + câu | "Không làm mới được. Số liệu lúc 22:10." · nút "Làm mới" bấm lại được |
| `loading` | Lần tải đầu: chưa có "Cập nhật lúc" và nút Làm mới (chưa có lần tính nào); `StatStrip` 4 ô skeleton (thanh `surface-2` đứng yên), mỗi biểu đồ một khối `surface-2` theo chiều cao vùng vẽ, KPI 7 hàng skeleton; chữ tiêu đề, nhãn ô, tiêu đề khối vẫn hiện | — |
| `error` | Lần tải đầu thất bại: vùng nội dung dưới tiêu đề thành khối lỗi như `Table · error` | "Không tải được số liệu tổng quan." · "Thử lại" |
| `early-days` | **Thế giới N** (giả định, ghi nhãn): web vừa triển khai 3 ngày (17 – 19/10/2026): biểu đồ chỉ 3 ngày cuối có cột / điểm, 27 ngày trước là 0 (đường nằm ở đáy, không cột); KPI "Quay lại ngày thứ 7" "Chưa đủ dữ liệu" (chưa ai qua 7 ngày); "Chuỗi từ 3 ngày" vẫn tính | "Chưa đủ dữ liệu" |

Không áp dụng: `empty` (luôn có số, kể cả 0 — trường hợp gần rỗng là `early-days`), `offline` (web quản trị không có chế độ ngoại tuyến; mất mạng khi làm mới = `refresh-error`), `forbidden` (một cấp admin), `os-permission`.

### Tương tác
- Bấm ô "Cần admin xử lý" (cả ô là link, Enter khi có focus; Ctrl / ⌘ + bấm mở tab mới) → `/reports` (Đang chờ, Cần admin). Ô "Người dùng mới" → `/users` (Q8). Hai ô còn lại không bấm được (không hover).
- Bộ chọn khoảng (mũi tên trái / phải khi có focus): đổi ngay thẻ Người hoạt động, Phút học, dòng phụ Người dùng mới và hai khối biểu đồ (tải lại, giữ số cũ tới khi có số mới như `refreshing`); bảng "Xem dạng bảng" đang mở thì vẫn mở, theo khoảng mới; URL `replace` `?range=` (Back không đi qua từng lần đổi khoảng). Thẻ Cần admin và KPI không đổi.
- "Làm mới" tính lại mọi số, kể cả badge sidebar; không tự làm mới theo giờ (SRS: không realtime). Chuyển trang rồi quay lại Tổng quan = tải lại (số mới).
- Biểu đồ: rê chuột trên vùng của một ngày (vùng bấm rộng hết khoảng giữa hai ngày, cao hết vùng vẽ) → tooltip của ngày đó; biểu đồ đường có đường dóng dọc `border`. Không bấm được cột / điểm. Bàn phím và trình đọc màn hình dùng "Xem dạng bảng" (Q6).
- Thứ tự tab: sidebar → bộ chọn khoảng → "Làm mới" → ô bấm được → "Xem dạng bảng" (khối 1, khối 2) → bảng KPI (không có phần tử bấm).

### Checklist duyệt
- [ ] Số của ô, biểu đồ, bảng dữ liệu và KPI khớp bảng 30 ngày / bảng tuần theo khoảng đang chọn (30 ngày: 16 / 386 / 94.160 phút; 7 ngày: 13 / 214 / 27.390; 90 ngày: 31 / 547 / 226.930); người dùng mới khớp bảng người dùng W2.
- [ ] Bộ chọn có trên mọi frame (trừ `error`); KPI và "Cần admin xử lý" giống nhau ở mọi khoảng.
- [ ] "Cần admin xử lý" 9 = badge sidebar; "12 đang chờ tất cả".
- [ ] Biểu đồ không màu pha; Học nhóm đặc, Học một mình rỗng viền 2, khe 2 giữa hai đoạn; chú giải có cả hai chuỗi; nhãn trục `label` `text-secondary`; lưới `border`.
- [ ] Không có hai thang giá trị trên một biểu đồ.
- [ ] KPI: "Đạt / Chưa đạt" có icon khác hình và chữ; mẫu số dưới mọi phần trăm.
- [ ] Không mascot. 1024: biểu đồ không bị nén dưới 16 px mỗi ngày.

---

## S-ADM-LOG-01 · Nhật ký quản trị

**Mục đích:** tra lại mọi việc admin và hệ thống đã làm — ai, lúc nào, với ai / server nào, từ việc nào, vì sao, đã nhắn gì cho người bị xử lý.
**REQ:** REQ-ADMIN-06 (cột, thứ tự, 25 / 50 / 100, lọc, chỉ đọc, không ghi việc xem), REQ-ADMIN-01 (URL, phân trang), menu CLI 4.11 (sự kiện "Người vận hành (CLI)"), REQ-SAFE-02 (chuyển Owner tự động — người làm "Tự động").
**Mở từ:** mục Nhật ký của sidebar (`default`); "Xem trong Nhật ký ›" của biên nhận (W1 `S-ADM-RPT-02 · receipt` / `handled`, W2 `S-ADM-USR-02 · receipt`, `S-ADM-SRV-02 · removed-receipt`) → `entry` (Q14). **Đi tới:** S-ADM-USR-02 `default` / `locked` / `deleted-account` (ô Đối tượng là người dùng hoặc tin); S-ADM-SRV-02 `default` / `removed` (ô Đối tượng là server); S-ADM-RPT-02 `handled` (ô Việc "#57", "#mã" trong ghi chú — không có `CasePager`).

**Câu hỏi admin mang tới (Q16):**

| Câu hỏi | Phần trả lời | Có trên màn |
|---|---|---|
| Ai đã khóa X, vì sao, đã nhắn gì cho X? | Hàng + phần mở rộng (Lý do, Lời nhắn, Ghi chú) | ✓ (Q11) |
| Đồng nghiệp làm gì hôm nay / tuần này? | Lọc Người làm + Thời gian | ✓ |
| Ai đã tạo / vô hiệu hóa tài khoản admin? | Lọc Người làm "Người vận hành (CLI)" hoặc nhóm hành động "Tài khoản admin" | ✓ |
| Mọi việc về khanh.le? | Không ở đây — trang người dùng (Lịch sử xử lý) và link "Xem {n} việc đã xử lý" (W2) | — (Q13: không ô tìm) |
| Người quản lý server đã xử lý gì? | Không ở đây — Báo cáo › Đã xử lý lọc "Người quản lý server" (W1); câu dưới tiêu đề nói rõ (Q15) | — |

### Bố cục (`default`, 1440)
```
┌ AdminSidebar ┬──────────────────────────────────────────────────────────────────────────────┐
│ Nhật ký      │ Nhật ký                                                                        │ PageHeader · list
│ đang chọn    │ Ghi các việc admin và hệ thống làm. Việc người quản lý server xử lý báo cáo   │ câu ghi chú (Q15)
│ Báo cáo (9)  │ xem ở Báo cáo › Đã xử lý.                                                      │
│              │ [Người làm: Tất cả ▾] [Hành động ▾] [Thời gian: Mọi lúc ▾]                     │ FilterBar
│              │    Thời gian         Người làm  Hành động              Đối tượng       Việc  Lý do        Ghi chú nội bộ │
│              │ ▸  19/10/2026 22:03  Hiếu       Gỡ server              ▣ Soi kèo bóng… –     Spam hoặc qu… –              │
│              │ ▸  19/10/2026 21:58  Hiếu       Khóa tài khoản 30 ngày 👤 vu.dang      –     Lừa đảo      Còn #60, #68 đ…│
│              │ ▸  19/10/2026 21:46  Hiếu       Khóa tài khoản 7 ngày… 👤 khanh.le     #57   Gian lận h…  Tái phạm sau #…│
│              │ …                                                                               │
│              │ Hiện [50 ▾] trong số 59 mục nhật ký                              ‹ 1 2 ›        │ Pagination
└──────────────┴──────────────────────────────────────────────────────────────────────────────┘
```
Cột ở 1440 (vùng 1144): mở rộng 32 · Thời gian 160 · Người làm 176 · Hành động 216 · Đối tượng 208 · Việc 64 · Lý do 152 · Ghi chú nội bộ (giãn ≈ 136). Đo khi vẽ: dấu thời gian mono rộng 125, "Người vận hành (CLI)" 144 — hai cột này không được cắt; chữ dài hơn ô ở các cột khác cắt "…" một dòng (C-43), bản đầy đủ nằm trong phần mở rộng. **1024** (vùng 744): mở rộng 32 · Thời gian 160 · Người làm 176 · Hành động 176 · Đối tượng 136 · Việc 64; ẩn Lý do, Ghi chú (vẫn có trong phần mở rộng). 13 hàng thấy trong khung 900 (câu ghi chú chiếm một dòng).

**Phần mở rộng của hàng** (Q11):
```
▾  19/10/2026 21:46  Hiếu  Khóa tài khoản 7 ngày, xóa tin  👤 khanh.le  #57  Gian lận học tập  Tái phạm sau #…
   ┌─ nền surface-2, bo input, thụt theo cột Thời gian ─────────────────────────────────────────┐
   │ Chi tiết   Khóa tới 26/10/2026 lúc 21:46. Đã xóa tin bị báo cáo, đóng 2 báo cáo.            │
   │ Lý do      Gian lận học tập                                                                 │
   │ Lời nhắn   “Bán đề thi trong nhóm học là vi phạm quy tắc. Lần sau tài khoản sẽ bị khóa lâu hơn.” │
   │ Ghi chú    Tái phạm sau #23 (đặt lại hồ sơ 10/10). Cùng người với #64.   ← "#23", "#64" là link │
   └─────────────────────────────────────────────────────────────────────────────────────────────┘
```
Bộ dòng cố định (cùng tinh thần `Receipt` / `HistoryItem`): "Chi tiết" · "Lý do" · "Lời nhắn" · "Ghi chú"; dòng trống ghi "–" `text-tertiary`; nhãn 80, giá trị xuống dòng, không cắt.

### Component
`AdminSidebar`, `PageHeader · list` (+ câu ghi chú `body-sm` `text-secondary` dưới tiêu đề), `FilterSelect · single` (Người làm, Thời gian), `FilterSelect` nhiều lựa chọn có nhóm (Hành động), `ClearFilters` (C-45), `DataTable` (C-43) với master hàng mới **`Log/head` + `Log/row`** (ô mở rộng + `Cell · mono` + `Cell · text` + `Cell · object` + `Cell · mono` cho mã việc) và **`Log/detail`** (phần mở rộng), `Pagination` (C-44). Ô chọn khoảng ngày: **`DateRangeMenu`** (mới, trong menu của `FilterSelect` Thời gian — Q13).

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Nhật ký" |
| Câu ghi chú | "Ghi các việc admin và hệ thống làm. Việc người quản lý server xử lý báo cáo xem ở Báo cáo › Đã xử lý." ("Báo cáo › Đã xử lý" là link tới `/reports?tab=handled`) — Q15 |
| Bộ lọc Người làm | "Người làm: Tất cả" · menu "Tất cả" · nhóm admin (đang hoạt động A→Z, rồi admin đã vô hiệu hóa A→Z ghi "{tên} (đã vô hiệu hóa)") · kẻ mảnh · "Người vận hành (CLI)" (người chạy menu quản lý admin trên máy chủ) · "Tự động" (backend tự làm, vd chuyển Owner). **Ô tìm** luôn ở đầu menu (Q17 — sửa sau duyệt: bỏ ngưỡng 8 lựa chọn để menu chỉ có một hình dạng, không bỗng dưng có ô tìm khi thêm admin thứ 6): placeholder "Tìm người làm", lọc theo tên không phân biệt hoa thường và dấu, không khớp: "Không có người làm nào khớp “{từ khóa}”"; menu cao tối đa 320, cuộn bên trong, ô tìm đứng yên (Q17) |
| Bộ lọc Hành động | "Hành động" / đang lọc "Hành động (2)"; menu nhóm "Xử lý vi phạm": "Bỏ qua báo cáo" · "Xóa tin" · "Khóa tài khoản" · "Mở khóa tài khoản" · "Đặt lại hồ sơ" · "Gỡ server" · "Chuyển quyền Owner"; nhóm "Tài khoản admin": "Tạo admin" · "Đặt mật khẩu mới" · "Đổi tên admin" · "Vô hiệu hóa admin" · "Bật lại admin" |
| Bộ lọc Thời gian | "Thời gian: Mọi lúc" · menu "Mọi lúc" · "Hôm nay" · "7 ngày qua" · "30 ngày qua" · "Chọn khoảng ngày…"; khoảng tự chọn: nút "Thời gian: 01/09 – 30/09/2026" |
| Đầu cột | "Thời gian" · "Người làm" · "Hành động" · "Đối tượng" · "Việc" · "Lý do" · "Ghi chú nội bộ" (ô mở rộng không có nhãn; nhãn ẩn "Mở rộng") |
| Nhãn Hành động | `REPORT_DISMISS` "Bỏ qua báo cáo" · `MESSAGE_DELETE` "Xóa tin" · `USER_SUSPEND` "Khóa tài khoản {1 ngày / 7 ngày / 30 ngày / vĩnh viễn}" (+ ", xóa tin" khi xóa kèm — Q10) · `USER_UNSUSPEND` "Mở khóa tài khoản" · `PROFILE_RESET` "Đặt lại hồ sơ" · `SERVER_REMOVE` "Gỡ server" · `SERVER_OWNER_TRANSFER` "Chuyển quyền Owner" · `ADMIN_CREATE` "Tạo admin" · `ADMIN_PASSWORD_SET` "Đặt mật khẩu mới" · `ADMIN_RENAME` "Đổi tên admin" · `ADMIN_DISABLE` "Vô hiệu hóa admin" · `ADMIN_ENABLE` "Bật lại admin" |
| Ô Đối tượng | (Q12) người dùng: icon `user` + username; tin: `message-square` + "Tin của {username}"; hồ sơ (bỏ qua báo cáo hồ sơ): `user` + "Hồ sơ của {username}"; server: `server` + tên server (cả server đã gỡ); tài khoản admin: `shield` + email (không link — không có trang admin); tài khoản đã xóa hẳn: icon `user-x` + "Tài khoản đã bị xóa" (link → `deleted-account`); tin của tài khoản đã xóa hẳn: "Tin của tài khoản đã bị xóa" |
| Ô Việc | "#57" mono `primary` (link → S-ADM-RPT-02 `handled`, không có `CasePager`) · "–" khi làm từ trang Người dùng / Server hoặc CLI. **Link trông như link (duyệt 02/11/2026):** hàng Nhật ký không phải link nên ô Đối tượng (trừ email admin) và ô Việc tô `primary`, hover gạch chân — khác các bảng có cả hàng là link, nơi ô giữ màu chữ thường |
| Dòng "Chi tiết" | Khóa: "Khóa tới {dd/MM/yyyy} lúc {HH:mm}." (vĩnh viễn: "Khóa vĩnh viễn.") + ", xóa tin bị báo cáo" + "đóng {n} báo cáo." khi làm từ việc · Mở khóa: "Mở trước hạn {dd/MM/yyyy HH:mm}." · Xóa tin / Bỏ qua / Đặt lại hồ sơ: "Đóng {n} báo cáo." · Gỡ server: "{n} thành viên mất server. Đóng {k} báo cáo." · Chuyển Owner: "Từ {username} sang {username} khi khóa vĩnh viễn {username}." · Tạo admin: "Email {email}, tên “{tên}”." (email trong ô Đối tượng có thể bị cắt) · Đặt mật khẩu mới / Vô hiệu hóa: "Thu hồi mọi phiên của tài khoản này." · Đổi tên: "Từ “{tên cũ}” sang “{tên mới}”." · Bật lại: "–" |
| Phân trang | "Hiện [50] trong số 59 mục nhật ký" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` (1440 + dark, 1024) | Trang 1, hàng 1–13 của bảng Nhật ký, mọi hàng thu gọn | "trong số 59 mục nhật ký" |
| `entry` | Mở từ "Xem trong Nhật ký ›" của biên nhận #57 (Hiếu mở lại #57 lúc 22:10): bộ lọc mặc định, trang 1, hàng 5 (21:46 #57) `Row · selected` (`surface-3`) và mở rộng sẵn, cuộn để hàng nằm trong khung (Q14) | Phần mở rộng như sơ đồ |
| `filtered-cli` | Người làm "Người vận hành (CLI)": 3 hàng (05/10 Đặt mật khẩu mới, 30/08 Tạo admin × 2); hàng Tạo admin hieupt1003 mở rộng (Chi tiết "Email hieupt1003@gmail.com, tên “Hiếu”.") | "trong số 3 mục nhật ký"; nút "Xóa bộ lọc" |
| `actor-menu` | Menu Người làm mở (`FilterSelect · searchable`): ô tìm trống (placeholder "Tìm người làm") · "Tất cả" (dấu `check`, 600) · nhóm "Admin": "Hiếu" · "Trâm" · kẻ mảnh · "Người vận hành (CLI)" · "Tự động"; chọn một là đóng menu và lọc ngay (thêm sau duyệt 02/11/2026) | Admin đã vô hiệu hóa (không có trong thế giới A) ghi "{tên} (đã vô hiệu hóa)" |
| `actor-menu-many` | **Thế giới K** (giả định, ghi nhãn): 12 admin — Hiếu, Trâm, Trang, Trí, Phương, Quyên, Thịnh, Vy, Hạnh, Long, Triết (đã vô hiệu hóa), Mẫn (đã vô hiệu hóa); menu có ô tìm, đang gõ "tr": Trang, Trâm, Trí (A→Z theo bảng chữ tiếng Việt: a trước â), rồi Triết (đã vô hiệu hóa) cuối nhóm — nhóm "Người vận hành (CLI)" / "Tự động" ẩn vì không khớp | placeholder "Tìm người làm" |
| `auto-row` | **Thế giới L** (giả định, ghi nhãn — thế giới A không có sự kiện tự động vì tailieu.giare99 không là Owner server nào): lúc 21:58 Hiếu khóa **vĩnh viễn** vu.dang (thay vì 30 ngày) → cùng lúc dòng "Tự động · Chuyển quyền Owner · Soi kèo bóng đá" (id lớn hơn nên đứng trên dòng khóa), mở rộng sẵn; Soi kèo bóng đá vẫn bị gỡ lúc 22:03 (Owner lúc gỡ là trang.vo) | Chi tiết "Từ vu.dang sang trang.vo khi khóa vĩnh viễn vu.dang."; Lý do / Lời nhắn / Ghi chú "–"; Việc "–" |
| `action-menu` | Menu Hành động mở: hai nhóm có nhãn, ô tick; "Khóa tài khoản" và "Gỡ server" đã tick; nút "Hành động (2)" | — |
| `date-menu` | Menu Thời gian mở ở "Chọn khoảng ngày…": hai ô "Từ ngày" "01/09/2026", "Đến ngày" "30/09/2026" + nút `primary` S "Áp dụng" | — |
| `date-invalid` | Như `date-menu`, "Từ ngày" 30/09/2026 > "Đến ngày" 01/09/2026: viền 2 `danger` ô "Đến ngày" + dòng lỗi; "Áp dụng" vô hiệu | "Ngày kết thúc phải sau ngày bắt đầu." |
| `date-range` | Đã áp khoảng 01/09 – 30/09/2026: 5 hàng (#4, #3, #2, khóa "Tài khoản đã bị xóa" 21/09, #1); hàng 21/09 → S-ADM-USR-02 `deleted-account` | "Thời gian: 01/09 – 30/09/2026" · "trong số 5 mục nhật ký" |
| `filter-empty` | Người làm "Trâm" + Hành động "Gỡ server": `Table · empty` + "Xóa bộ lọc" | "Không có mục nhật ký nào khớp bộ lọc." |
| `loading` | `Table · loading` 8 hàng (ô mở rộng có thanh 16); bộ lọc vẫn dùng được | — |
| `error` | `Table · error` | "Không tải được nhật ký." · "Thử lại" |

Dùng lại của W1 (luật chung, không vẽ lại): `page-size-open` / `page-size-25`, `row-hover-focus` (S-ADM-RPT-01), trang 2 của phân trang (C-44 board). Không áp dụng: `empty` (luôn có ít nhất các dòng CLI tạo admin — trống chỉ khi lọc: `filter-empty`), `offline`, `forbidden`, `os-permission` (như W1, W2).

### Tương tác
- Bấm vùng trống của hàng, bấm ▸, hoặc Enter / Space khi nút ▸ có focus → mở / thu phần mở rộng tại chỗ (Q11); mở được nhiều hàng cùng lúc; ▸ là `button` `aria-expanded`. Hàng không phải link (khác C-43 "Hàng mở chi tiết" — Q11). Link trong hàng: Đối tượng, Việc, "#mã" trong ghi chú; Ctrl / ⌘ + bấm mở tab mới.
- Đổi bộ lọc → về trang 1, thêm mục lịch sử, URL đổi; bỏ tô `entry`. Không có tìm kiếm (Q13). "Xóa bộ lọc" về Tất cả / không lọc hành động / Mọi lúc.
- Thứ tự cố định: mới nhất trên cùng, phá hòa id giảm dần (REQ-ADMIN-01: Nhật ký không sắp xếp theo cột; C-43 Luật thứ tự). Không xếp lại khi đang xem; mục mới chỉ hiện khi đổi bộ lọc, đổi trang hoặc tải lại.
- Thứ tự tab: sidebar → link trong câu ghi chú → bộ lọc → (mỗi hàng: ▸ → link Đối tượng → link Việc → link "#mã" trong ghi chú) → phân trang.

### Checklist duyệt
- [ ] Mới nhất trên cùng; thời gian mono thẳng cột, luôn có ngày.
- [ ] Một quyết định một dòng: 21:46 là một dòng "Khóa tài khoản 7 ngày, xóa tin" (Q10).
- [ ] Người làm: tên admin, "Người vận hành (CLI)", "Tự động"; đối tượng là username / "Tin của …" / "Hồ sơ của …" / tên server / email admin / "Tài khoản đã bị xóa".
- [ ] Phần mở rộng đủ bốn dòng cố định, "–" khi trống, lời nhắn trong ngoặc kép.
- [ ] Tổng 59 khớp luật nhất quán; bộ lọc CLI ra đúng 3.
- [ ] 1024: ẩn Lý do, Ghi chú; không cuộn ngang.

---

## Ma trận trạng thái

| Chuẩn | S-ADM-OVR-01 | S-ADM-LOG-01 |
|---|---|---|
| `default` | ✓ (1440 + dark, 1024) | ✓ (1440 + dark, 1024) |
| `loading` | ✓ | ✓ |
| `empty` | ✗ luôn có số — gần rỗng là `early-days` | ✗ luôn có dòng CLI — trống khi lọc là `filter-empty` |
| `error` | ✓ (`error`, `refresh-error`) | ✓ |
| `offline` | ✗ web quản trị không có chế độ ngoại tuyến | ✗ |
| `forbidden` | ✗ một cấp admin | ✗ |
| `os-permission` | ✗ | ✗ |
| Nghiệp vụ | `chart-hover`, `table-view`, `table-view-users`, `range-7`, `range-90`, `refreshing`, `early-days` | `entry`, `filtered-cli`, `actor-menu`, `actor-menu-many`, `auto-row`, `action-menu`, `date-menu`, `date-invalid`, `date-range`, `filter-empty` |

## Đối chiếu REQ

| Vế của REQ | Dòng spec |
|---|---|
| ADMIN-02 thẻ Người dùng mới (hôm nay, kèm 7 ngày) | Ô 1 "3 hôm nay" / "13 trong 7 ngày" |
| ADMIN-02 Người hoạt động 7 ngày · Phút học 7 ngày | Ô 2, Ô 3 |
| ADMIN-02 Cần admin xử lý (bấm → Báo cáo) + "{n} đang chờ tất cả" | Ô 4; Tương tác |
| ADMIN-02 biểu đồ 30 ngày người dùng mới và người hoạt động | Khối Người dùng (hai biểu đồ nhỏ — Q2) |
| ADMIN-02 phút học theo ngày tách Room / Solo | Khối Phút học, xếp chồng (AC2: tooltip / bảng ghi đúng phút từng phần) |
| ADMIN-02 bảng KPI 2.7 + mục tiêu, cohort 30 ngày, "Chưa đủ dữ liệu", bỏ push opt-in / crash-free | Khối KPI; `early-days` |
| ADMIN-02 định nghĩa (người hoạt động = `user_daily_activity`, AC3 qua nửa đêm) | Luật nhất quán; ngày theo giờ Việt Nam |
| ADMIN-02 tính khi mở / Làm mới, không realtime, "Cập nhật lúc {HH:mm}" | PageHeader; `refreshing`, `refresh-error` |
| ADMIN-02 bộ chọn 7 / 30 / 90 ngày, mặc định 30, 90 ngày theo tuần, KPI và Cần admin không đổi (AC5) | Bộ chọn khoảng; `range-7`, `range-90` |
| ADMIN-06 bảng, mới nhất trên cùng, 25 / 50 / 100 (mặc định 50) | DataTable, Pagination, Tương tác |
| ADMIN-06 cột thời gian, người làm (tên / "Người vận hành (CLI)" / "Tự động"), hành động, đối tượng (link), việc ("#57" link), lý do, ghi chú | Cột; Nội dung chữ; Q12 |
| ADMIN-06 lọc người làm, hành động, khoảng ngày | FilterBar; `filtered-cli`, `action-menu`, `date-*` |
| ADMIN-06 chỉ đọc, không sửa / xóa, không ghi việc xem | Không có hành động trên màn; AC3 là ràng buộc CSDL |
| ADMIN-06 AC1 "Hiếu · Khóa tài khoản 7 ngày · X" kèm lý do | Hàng 2 / 5 |
| ADMIN-06 AC2 "Người vận hành (CLI) · Tạo admin · {email}", không mật khẩu | `filtered-cli`; dòng Chi tiết không bao giờ chứa mật khẩu |
| ADMIN-04 link tới tài khoản đã xóa hẳn mở "Tài khoản đã bị xóa" | `date-range` → W2 `deleted-account` |
| ADMIN-05 link tới server đã gỡ không gãy | Hàng 1, 4 → W2 `removed` |

---

## Quyết định (chốt 02/11/2026)

Product Owner đồng ý cả 15 khuyến nghị ngày 02/11/2026.

Đã trả lời ở nơi khác, không hỏi lại: thứ tự Nhật ký cố định, không sắp xếp theo cột (SRS REQ-ADMIN-01, duyệt W2); phân trang, số mục mỗi trang (C-44); không mascot (`DESIGN.md`); một cấp admin nên không có ma trận vai trò; media / quyền thiết bị không áp dụng; zoom 200% (`DESIGN.md` › Tương tác; W4 đổi: dưới 1024 cuộn ngang, không chặn); tên admin không trùng (menu CLI, SRS 4.11); base (Nest / React starter, NezFocus-Code) chưa có trang tổng quan, nhật ký hay thư viện biểu đồ nào — không có gì để giữ / đổi.

| # | Câu hỏi | Quyết định | Ghi ở |
|---|---|---|---|
| Q1 | KPI Verification rate luôn 100% từ v1.9 (tài khoản chỉ tạo khi nhập đúng mã) | Thay bằng **Hoàn tất tài khoản trong 24 giờ** (`terms_accepted_at`; mẫu số gồm tài khoản chưa hoàn tất, chỉ tính tài khoản đã qua 24 giờ hoặc đã hoàn tất), mục tiêu ≥ 70% | SRS 2.7, REQ-ADMIN-02 (AC4) |
| Q2 | Người dùng mới (0–3 / ngày) và người hoạt động (~130) chung thang | Hai biểu đồ nhỏ chung trục ngày; người hoạt động đường liền, người dùng mới cột đặc `primary` | SRS REQ-ADMIN-02; `DESIGN.md` › Biểu đồ + Decisions Log; C-52 |
| Q3 | Đơn vị phút học | Thẻ và trục theo giờ; tooltip, bảng theo phút; KPI theo phút | SRS REQ-ADMIN-02; file này |
| Q4 | Bố cục | Phương án B: biểu đồ 8 cột trái, KPI 4 cột phải, vừa khung 900; 1024 xếp dọc | File này |
| Q5 | Bảng KPI | Tên tiếng Việt tự giải thích; mẫu số dưới mọi tỉ lệ; câu phạm vi; "Đạt" / "Chưa đạt" icon khác hình + chữ; "Theo dõi" không xét | SRS REQ-ADMIN-02; C-52 `KpiTable` |
| Q6 | "Xem dạng bảng" (README câu mở #1) | Bảng thay biểu đồ tại chỗ, cùng chiều cao, mới nhất trên cùng, không nhớ; rê chuột hiện tooltip; bàn phím dùng bảng | SRS REQ-ADMIN-02; C-52 |
| Q7 | Làm mới | Giữ số cũ khi đang làm mới; thất bại giữ số cũ + "Không làm mới được. Số liệu lúc 22:10."; không tự làm mới; hôm nay ghi "tới HH:mm" ở tooltip / bảng | SRS REQ-ADMIN-02; file này |
| Q8 | Ô bấm được | Thêm ô "Người dùng mới" → danh sách Người dùng (mặc định mới tạo trên cùng) | SRS REQ-ADMIN-02; C-51 |
| Q9 | Trang chủ | Tổng quan ở `/`, mở sau đăng nhập khi không có trang đang xem dở | SRS REQ-ADMIN-01 |
| Q10 | Khóa kèm xóa tin | Một quyết định một dòng ("Khóa tài khoản 7 ngày, xóa tin"); lọc "Xóa tin" cũng ra | SRS REQ-ADMIN-06 (AC4) |
| Q11 | Lời nhắn, ghi chú dài | Hàng mở rộng tại chỗ, bốn dòng cố định Chi tiết · Lý do · Lời nhắn · Ghi chú; hàng không là link (ngoại lệ C-43) | SRS REQ-ADMIN-06; C-43 `Log/detail` |
| Q12 | Cách hiện đối tượng | username / "Tài khoản đã bị xóa" / "Tin của …" / "Hồ sơ của …" / tên server (cả đã gỡ) / email admin không link; tên admin là tên hiện tại | SRS REQ-ADMIN-06; file này |
| Q13 | Bộ lọc | Người làm một lựa chọn; Hành động nhiều lựa chọn hai nhóm; Thời gian có sẵn + khoảng tự chọn; không ô tìm; API `actor`, `action` nhiều giá trị, `range` / `from` / `to` | SRS REQ-ADMIN-06, 5.3; C-45 `FilterSelect · grouped`, `DateRangeMenu` |
| Q14 | "Xem trong Nhật ký ›" | Mở đúng trang có dòng đó, dòng mở sẵn và tô `surface-3`; đổi lọc / trang thì bỏ tô; `?entry=` | SRS REQ-ADMIN-06, 5.3; C-43 |
| Q16 | (vòng duyệt) Thống kê chỉ 7 / 30 ngày? — chọn phương án B | Bộ chọn "7 ngày \| 30 ngày \| 90 ngày": mặc định 30 ngày (B1); trong URL, không nhớ (B2); 7 ngày mỗi ngày một cột rộng tối đa 24, 90 ngày gộp 13 tuần (B3); thẻ Người dùng mới giữ số hôm nay, Cần admin và KPI không đổi (B4) | SRS REQ-ADMIN-02 (AC5), 5.3; C-51, C-52; file này |
| Q17 | (vòng duyệt) "Hệ thống" và "Hệ thống (CLI)" khác gì; cần ô tìm khi đông admin | Đổi tên "Người vận hành (CLI)" / "Tự động"; menu Người làm **luôn** có ô tìm (ban đầu ngưỡng 8 lựa chọn, đổi khi duyệt vì hai frame cạnh nhau trông như hai menu khác nhau), chia nhóm, cao tối đa 320 | SRS REQ-ADMIN-06, 4.11; C-45; file này |
| Q15 | Câu dưới tiêu đề Nhật ký | "Ghi các việc admin và hệ thống làm. Việc người quản lý server xử lý báo cáo xem ở Báo cáo › Đã xử lý." | SRS REQ-ADMIN-06; file này |

## Edge case (02/11/2026)

Product Owner chọn làm hết (02/11/2026). Nhóm "W3 · Tổng quan & Nhật ký — Edge case" ở `Des/nezfocus.pen` (x 77706, y 33200). Thế giới giả định ghi nhãn trên frame; người mẫu thật vẫn ở đúng chỗ của họ.

**Thay đổi chung kéo theo (áp cho mọi frame Tổng quan):** đơn vị "giờ" của trục Phút học rời khỏi nhãn trục trên cùng ("75 giờ" → "75") và thành chú thích ở đầu hàng chú giải, thẳng trên cột nhãn trục; chú giải bắt đầu thẳng mép vùng vẽ (C-52) — phát hiện khi vẽ `big-numbers`: "1.200 giờ" không vừa cột nhãn 44.

### Có frame

| Frame | Thế giới | Thể hiện | Căn cứ |
|---|---|---|---|
| `W3-EDGE · stale-next-day` | A, xem lúc 09:05 20/10/2026 (trang mở từ 22:10 hôm trước, không bấm Làm mới) | "Cập nhật 19/10/2026 lúc 22:10" (có ngày vì không còn là hôm nay); số giữ nguyên, "hôm nay" vẫn là 19/10 — không tự làm mới | REQ-ADMIN-02 (edge case W3) |
| `W3-EDGE · big-numbers` | K (giả định): 3.412 người mới trong 30 ngày | Thẻ "128 hôm nay / 3.412 trong 30 ngày", "18.204", "24.816 giờ / 1.488.960 phút", "Cần admin 124 / 311 đang chờ tất cả" trong khi badge sidebar ghi "99+"; trục 0 · 500 · 1.000 · 1.500 người và 0 · 400 · 800 · 1.200 kèm chú thích "giờ"; KPI "Chuỗi từ 3 ngày" **19,6%** (669 / 3.412) Chưa đạt — một chữ số thập phân vì làm tròn sẽ thành 20% | REQ-ADMIN-02; C-42 (99+); C-52 |
| `W3-EDGE · spike-and-gap` | P (giả định): 15/10 khoa tổ chức buổi học chung (612 người hoạt động, 18.000 phút); 08/10 máy chủ ngừng cả ngày (0) | Thang theo đỉnh (0 · 250 · 500 · 750; 0 · 100 · 200 · 300 giờ), các ngày khác dồn thấp nhưng vẫn đọc được; ngày 08/10 đường chạm đáy, không cột, không chú thích; thẻ 30 ngày 912 người, 1.748 giờ (104.910 phút); KPI "Học ≥ 15 phút trong 24 giờ đầu" đúng bằng mục tiêu 50% (8 / 16) → Đạt | REQ-ADMIN-02 (edge case W3) |
| `W3-EDGE · long-names` | H (giả định, như W1 / W2): admin "Nguyễn Hoàng Phương Thảo Nguyên", người dùng `tranthithanhhuonggiang2005`, server "Câu lạc bộ Ôn thi Chứng chỉ Tiếng Anh Quốc tế IELTS PTIT" | Ô Người làm xuống 2 dòng rồi cắt "…" ("Nguyễn Hoàng / Phương Thảo Ng…" — tên 31 ký tự cần 3 dòng ở ô 176; tên đầy đủ ở menu lọc Người làm); username và tên server cắt "…" trong ô; lý do dài nhất "Tên, ảnh hoặc giới thiệu phản cảm" cắt; hàng mở rộng chứa lời nhắn 200 ký tự và ghi chú 500 ký tự, xuống dòng hết | REQ-ADMIN-06 (edge case W3); C-43 |
| `W3-EDGE · admin-renamed` | M (giả định): 18/10/2026 08:00 người vận hành đổi tên Trâm thành "Nguyễn Ngọc Trâm" | Mọi dòng của Trâm ghi tên hiện tại "Nguyễn Ngọc Trâm"; dòng CLI "Đổi tên admin · tramnguyen.ops@gmail.com" mở sẵn, Chi tiết "Từ “Trâm” sang “Nguyễn Ngọc Trâm”." | REQ-ADMIN-06 (Q12) |

### Chỉ ghi luật

| Trường hợp | Luật | Căn cứ |
|---|---|---|
| Phiên hết hạn khi đang ở Tổng quan / Nhật ký | Lần gọi kế tiếp `40100` → màn đăng nhập (W4); đăng nhập lại về đúng URL, giữ `range`, bộ lọc, trang, `entry` | REQ-ADMIN-01 |
| Admin đang xem bị vô hiệu hóa / đặt mật khẩu mới qua CLI | Phiên bị thu hồi → như trên (vô hiệu hóa: màn đăng nhập báo "Tài khoản quản trị này đã bị vô hiệu hóa." khi đăng nhập lại) | REQ-ADMIN-01 AC2, AC4 |
| Admin đã vô hiệu hóa trong các dòng cũ | Ô Người làm ghi tên như thường (dấu vết lịch sử); chỉ menu lọc ghi "{tên} (đã vô hiệu hóa)" (`actor-menu-many`) | REQ-ADMIN-06 |
| Admin khác xử lý trong lúc đang xem Nhật ký | Không chèn dòng mới; hiện khi tải lại, đổi bộ lọc hoặc đổi trang (thứ tự không nhảy dưới tay) | C-43 Luật thứ tự |
| Link `entry` không tồn tại / sai dạng | Bỏ qua, mở trang 1 mặc định, không tô, không báo lỗi (nhật ký không xóa được nên chỉ xảy ra với link gõ tay) | REQ-ADMIN-06 (edge case W3) |
| `range`, `from`, `to` sai trong URL | Bỏ qua tham số sai, dùng mặc định (30 ngày / Mọi lúc); API vẫn trả `40001` nếu bị gọi thẳng | REQ-ADMIN-02, 06 |
| Tải lại trang | Giữ mọi thứ trong URL; "Xem dạng bảng" và hàng đang mở rộng không giữ (không ở URL), trừ hàng của `entry` | REQ-ADMIN-01 |
| Hai tab | Mỗi tab giữ khoảng / bộ lọc riêng theo URL của nó; làm mới một tab không đổi tab kia | REQ-ADMIN-01 |
| Qua nửa đêm | "Hôm nay" là ngày của lần tính; làm mới sau 00:00 thì thẻ Người dùng mới về "–" + "hôm nay" và mọi khoảng trượt sang ngày mới; người kết nối 23:30 và 00:10 tính cả hai ngày | REQ-ADMIN-02 AC3 |
| Khoảng vắt qua năm | Tiêu đề khối ghi đủ năm hai đầu ("21/12/2026 – 19/01/2027"); nhãn trục vẫn dd/MM; tuần của 90 ngày ghi đủ năm ở tooltip / bảng | 4.11 (luôn có năm) |
| Ngày tương lai trong kỳ | Không áp dụng: mọi khoảng là cửa sổ trượt kết thúc ở hôm nay | — |
| Lọc "Hôm nay" ngay sau nửa đêm | Chưa có mục nào → `filter-empty` | REQ-ADMIN-06 |
| Đối tượng đã bị xóa hẳn | Tài khoản: "Tài khoản đã bị xóa" (link `deleted-account`); tin của tài khoản đó: "Tin của tài khoản đã bị xóa"; server đã xóa hẳn (30 ngày sau xóa / gỡ): tên lúc làm, không link | REQ-ADMIN-04, 06; REQ-SRV-05 |
| Rất nhiều mục nhật ký | Phân trang C-44 ("1 … 49 50"), không vẽ thêm | C-44 |
| Tooltip ở cột đầu / cuối | Lật về phía còn chỗ, không tràn khỏi vùng vẽ (`chart-hover` đã thể hiện lật trái) | C-52 |
| KPI có mẫu số 0 | "Chưa đủ dữ liệu" (`early-days`) | REQ-ADMIN-02 |

