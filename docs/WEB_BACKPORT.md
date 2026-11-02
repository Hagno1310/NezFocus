# Ứng viên mang từ bản web về bản app

Thay đổi chốt khi thiết kế bản web (`D:\NCC\NezFocus-Web`) mà có thể có ích cho bản app. **Chưa áp, chưa phải CR.** Làm xong bản web thì đi qua từng dòng:

1. Đối chiếu với bản app hiện tại (cột "Bản app hiện tại" — dòng ghi *cần đối chiếu* là chưa kiểm).
2. Chủ dự án chọn áp / không áp / sửa lại cho hợp mobile.
3. Dòng được chọn thành CR trong `SRS_v1.2_change_notes.md` (số CR kế tiếp), rồi áp theo quy trình thường (SRS → `design/screens` → `Des/nezfocus.pen`).

Đã thành CR nên không ghi lại ở đây: CR-12 (tin liên quan tới mình), CR-13 (bỏ phòng im lặng, rời phòng chỉ hỏi Host, nút "Chuyển sang phòng này"), CR-14 (bỏ quyền đọc tin cũ), CR-16 (tài khoản & đăng nhập: W17–W23, W26, W108), CR-17 (server, role & kiểm duyệt: W11, W29–W35, W37–W40, W45–W48, W111), CR-18 (báo cáo vi phạm: W95–W102), CR-19 (chat & tin nhắn: W1–W3, W5, W41–W44, W103–W106, W112 + phần còn lại của web D-116), CR-20 (việc nhóm: W49–W57, W74), CR-21 (thông báo: W58–W62, W86), CR-22 (phòng voice & học chung: W6–W8, W10, W12–W15, W63–W65, W73, W109), CR-23 (học một mình & thống kê: W66–W72, W110), CR-24 (cài đặt & hiển thị: W27, W28, W36, W113), CR-25 (bạn bè, DM & cuộc gọi: W75–W90, W92–W94, W107), CR-26 (logo, icon app & splash: W114, 01/11/2026). **Đã đi hết danh sách ngày 30/10/2026** (Product Owner giao quyền quyết). Đã xét, không áp: W4 (app đã giữ vạch "Tin nhắn mới" tới khi rời kênh), W9 (app đã ngắt khỏi phòng và chặn vào phòng khi bị tạm khóa), W16 (ngược quyết định 16/10/2026 "phòng chưa có phiên luôn là lưới ô"), W91 (điện thoại dọc: hình người kia phủ màn), W24 (app đã dùng 5 lần / 10 phút cho mọi chỗ sai mật khẩu), W25 (app đã có từ v1.2).

Nguồn: `D:\NCC\NezFocus-Web\docs\DECISIONS.md` (mã D-xx) và `docs\design\screens\` (01-auth, 02-shell-chat, 07-rooms, 10-settings, 00-components).

| # | Thay đổi ở bản web | Nguồn web | Vì sao có ích cho app | Bản app hiện tại | Chỗ dự kiến phải sửa ở app |
|---|---|---|---|---|---|
| W115 | **Username điền sẵn mà đã có người dùng → để trống ô** (chỉ hiện dòng gợi ý quy tắc), không mở màn Hoàn tất bằng lỗi; không tự gợi ý tên có đuôi số vì username không đổi được | web 01 S-ONB-01 › Tương tác (01/11/2026, khi đặc tả S-AUTH-05) | Email phổ biến (`an.nguyen@gmail.com`) dễ trùng; người mới đăng ký gặp lỗi họ không gây ra | Cùng luật điền sẵn (`01-auth-onboarding.md` › Hoàn tất tài khoản, "điền sẵn từ email … rồi kiểm tra ngay"); chưa nói khi bị trùng | `01-auth-onboarding.md` (luật bằng chữ), không đổi frame |

Không mang về (chỉ hợp web): ngôn ngữ mặc định English cho trình duyệt không đặt tiếng Việt (D-64 — app có chủ đích chọn tiếng Việt), cảnh báo Caps Lock ở ô mật khẩu, tiêu đề tab và chấm favicon (D-38, D-42), chuyển nhanh Ctrl+K (D-41), cửa sổ nổi (D-40), vị trí toast trên thanh điều khiển, trang Báo cáo dạng thẻ mở sẵn (D-112 — app giữ danh sách → chi tiết vì màn hẹp), chuyển nhanh Ctrl+K (D-115 — thuần bàn phím), hộp thoại "Chưa có ai nhận báo cáo này" (D-113 — app có Platform Admin nên báo cáo luôn có người nhận), lưu chu kỳ khi tạm dừng (D-50 phần sau — app dùng "áp dụng từ vòng sau").
