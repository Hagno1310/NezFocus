# NezFocus

Ứng dụng mobile học nhóm cho sinh viên: lõi giao tiếp theo mô hình server/kênh/voice, cộng lớp Study/Focus giúp sinh viên học cùng nhau và đo thời gian học.

## Tài khoản

**Tài khoản chưa hoàn tất** (Incomplete account):
Tài khoản vừa được tạo khi nhập đúng mã email (email đã xác nhận) nhưng chưa qua màn Hoàn tất tài khoản (tên hiển thị, username, mật khẩu, múi giờ, ngôn ngữ, điều khoản). Mọi lần đăng nhập đều về màn đó (v1.9, CR-16).
_Avoid_: Tài khoản chưa xác thực, Unverified User, đăng ký chờ (đã bỏ ở v1.9)

**Tài khoản đã xóa** (Deleted account):
Tài khoản đang chờ xóa hoặc đã bị xóa, nhìn từ phía người khác. Ở mọi nơi đều hiển thị nhãn "Tài khoản đã bị xóa".
_Avoid_: Người dùng đã xóa, offline

**Activation**:
User mới đạt ≥ 15 focused minutes trong 24h đầu kể từ lúc xác thực email.
_Avoid_: "hoàn thành Focus Session đầu tiên"

## Server & Phòng

**Server**:
Cộng đồng có một Owner, các role, member và kênh. Là đơn vị tổ chức cao nhất mà user tham gia.
_Avoid_: Guild (tên cũ theo Discord, bỏ ở mọi nơi kể cả tên kỹ thuật); "server" để chỉ hệ thống phía sau (dùng **backend**)

**Owner**:
Người duy nhất sở hữu một Server, đứng trên mọi role và không thể bị kick, ban hay timeout.
_Avoid_: admin (admin là member có role mang quyền Administrator, vẫn nằm dưới Owner)

**Owner nhóm** (Group DM owner):
Thành viên Group DM có quyền đổi tên, đổi ảnh và gỡ thành viên khỏi nhóm.
_Avoid_: admin nhóm

**Category** (Danh mục):
Tiêu đề nhóm gom các kênh trong danh sách kênh của một Server, ví dụ "THÔNG TIN", "PHÒNG HỌC". Mỗi kênh thuộc tối đa một Category.
_Avoid_: folder, thư mục, nhóm kênh

**Kênh tin chào mừng** (System channel):
Kênh text của một Server nhận tin hệ thống "X đã tham gia server". Người quản lý server chọn kênh này hoặc chọn "Không gửi". Study Server mặc định dùng `#chao-mung`, server thường dùng `#general`.
_Avoid_: kênh hệ thống; "kênh chào mừng" khi muốn nói thiết lập (`#chao-mung` chỉ là tên kênh mặc định)

**Study Server**:
Server được tạo từ template học tập. Sau khi tạo, nó không khác server thường. Template chỉ quyết định cấu trúc kênh ban đầu và giá trị mặc định của Server ưu tiên.
_Avoid_: server học tập, guild học tập

**Server ưu tiên** (Priority Server):
Server mà một user đánh dấu để vẫn nhận thông báo tin nhắn thường trong lúc Chế độ Học tập đang bật. Đây là lựa chọn riêng của từng user. Khi user vào một Study Server thì cờ này mặc định bật.
_Avoid_: server học tập, guild học tập, study guild

**Study Room** (Phòng học):
Voice channel được phép chạy Room Session. Voice channel không phải Study Room thì không có Focus.
_Avoid_: phòng focus, focus channel; Silent Room, phòng im lặng (khái niệm đã bỏ ở SRS v1.9: vào phòng voice nào mic cũng tắt sẵn; "Phòng học im lặng" chỉ là tên một kênh trong mẫu Study Server)

**Chế độ Học tập** (Study Mode):
Khung giờ lặp lại do user tự đặt. Trong khung giờ đó, tin nhắn thường từ những server không phải Server ưu tiên chỉ tăng badge, không push.
_Avoid_: Focus Mode, DND

## Kiểm duyệt

**Timeout** (Tạm khóa):
Hình phạt có thời hạn người quản lý áp cho một member. Tới khi hết hạn hoặc được gỡ, người đó chỉ còn xem kênh, không gửi tin, react hay vào voice. Trên giao diện luôn gọi là "Tạm khóa", ví dụ "Bạn đang bị tạm khóa đến 21:30".
_Avoid_: tạm khóa chat (nhãn cũ), mute (mute là tắt mic)

**Đối tượng bị báo cáo** (Report target):
Một tin nhắn, một hồ sơ hoặc một server bị báo cáo. Mọi báo cáo đang chờ về cùng một đối tượng nằm chung một chỗ, và một lần xử lý đóng tất cả các báo cáo đó.
_Avoid_: "báo cáo" khi muốn nói thứ bị báo cáo

## Study/Focus

**Focus Session**:
Một phiên chạy luân phiên các pha focus và nghỉ theo một cấu hình chu kỳ. Có đúng hai loại: Room Session và Solo Session.
_Avoid_: Pomodoro (chỉ dùng làm chữ trên UI), phiên học, Focus Mode

**Room Session**:
Focus Session gắn với một Study Room, mọi người trong phòng cùng thấy một đồng hồ. Mỗi Study Room có tối đa một Room Session đang chạy.
_Avoid_: Focus Session nhóm, group focus, phiên phòng

**Solo Session**:
Focus Session của riêng một user, không gắn voice channel. Pha focus kế tiếp chỉ bắt đầu khi user chủ động bấm.
_Avoid_: Solo Focus, Pomodoro cá nhân

**Phase** (Pha):
Một đoạn thời gian liên tục trong Focus Session. Có ba loại: **focus** (học, là pha duy nhất được tính focused minutes), **short break** (nghỉ ngắn sau một pha focus) và **long break** (nghỉ dài thay cho short break sau mỗi N pha focus, chỉ có khi được bật).
_Avoid_: hiệp, round

**Cycle** (Chu kỳ):
Một pha focus cộng với pha nghỉ ngay sau nó.
_Avoid_: vòng, Pomodoro (khi muốn nói một chu kỳ)

**Cấu hình chu kỳ** (Cycle config):
Bộ độ dài của các pha trong một Focus Session: focus, short break, và tùy chọn long break kèm số N. Gọi tắt theo độ dài focus/short break, ví dụ "25/5", "50/10".
_Avoid_: preset (preset chỉ là một cấu hình chu kỳ có sẵn để chọn nhanh)

**Participant**:
Người đang ở trong một Study Room trong lúc Room Session của phòng đó chạy. Ai ở trong kênh đều tự động là Participant, không cần opt-in.
_Avoid_: thành viên phiên, người tham gia focus

**Participation** (Khoảng tham gia):
Khoảng thời gian liên tục một Participant ở trong một Room Session. Bắt đầu từ thời điểm muộn hơn giữa lúc vào kênh và lúc session bắt đầu.
_Avoid_: interval (khi viết văn xuôi)

**Host**:
Participant đang giữ quyền điều khiển Room Session (pause, resume, skip, stop, sửa chu kỳ). Người khởi tạo là Host đầu tiên. Một Room Session có thể tạm thời không có Host.
_Avoid_: controller, người khởi tạo, chủ phòng

**Focused minutes**:
Số phút thuộc pha `focus` mà backend ghi nhận cho một user, kể cả phần dở dang. Không tính thời gian nghỉ, pause hay lúc chờ.
_Avoid_: giờ học, study time

**Local day**:
Ngày lịch tính theo timezone của user.

**Qualified Day** (Ngày đạt):
Local day mà user có tổng ≥ 15 focused minutes. Đây là đơn vị đo của streak và của chỉ số activation. Lý do chọn ngưỡng 15 phút: DEC-43 trong SRS.
_Avoid_: "hoàn thành Focus Session"

**Study Streak**:
Số Qualified Day liên tiếp của một user.
_Avoid_: chuỗi ngày học

**Study Event**:
Buổi học nhóm đã lên lịch trước, gắn với một Study Room, có thể lặp lại hằng tuần. Có thể cài để tự bắt đầu Room Session khi tới giờ. Bản thân nó là một lịch hẹn, không đếm phút học cho ai.
_Avoid_: Scheduled Event, lịch học

**Khung giờ sự kiện** (Event window):
Khoảng thời gian từ lúc bắt đầu tới lúc kết thúc của một lần diễn ra Study Event.

## Task

**Task**:
Một việc cần làm thuộc Task Board của một text channel. Có thể có nhiều Assignee, và tất cả dùng chung một trạng thái. Task có thể có deadline.
_Avoid_: todo, công việc

**Task Board**:
Danh sách Task của một text channel. Kênh phải được bật Task Board thì mới tạo được Task.

**Assignee** (Người được giao):
Một trong những user cùng chịu trách nhiệm một Task. Vẫn là Assignee ngay cả khi tạm thời mất quyền xem kênh.
_Avoid_: người phụ trách, owner của task

**Lịch sử Task** (Task History):
Bản ghi theo thời gian mọi thay đổi của một Task, kèm người thực hiện và thời điểm.
_Avoid_: audit log (thuật ngữ đó dành cho hành động quản trị server)

**Việc cần làm** (Study Digest):
Danh sách tổng hợp của một user, gồm Task giao cho user đó và Task user đó tạo mà chưa giao cho ai, gom từ mọi server.
_Avoid_: Study Digest (chỉ dùng trong tài liệu cũ), my tasks
