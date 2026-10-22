# NezFocus — Tổng quan dự án & kế hoạch

Tài liệu này trả lời: **dự án làm gì, ai làm phần nào, khi nào phải xong, đang ở đâu**. Không có chi tiết kỹ thuật; phần đó ở [`OVERVIEW.md`](../OVERVIEW.md) (bản đồ code) và [`getting-started.md`](getting-started.md) (cài đặt, quy trình).

|                    |                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sản phẩm**       | App Android học nhóm & chat/voice real-time cho sinh viên                                                                                                                                     |
| **Loại**           | Đồ án môn App                                                                                                                                                                                 |
| **Team**           | 3 người, chia theo mảng tính năng                                                                                                                                                             |
| **Bắt đầu code**   | 19/10/2026 (Sprint 1)                                                                                                                                                                         |
| **Hạn nộp**        | **15/12/2026**                                                                                                                                                                                |
| **Mốc quan trọng** | Luồng demo chạy được trước **29/11/2026** để kịp pilot 2 tuần                                                                                                                                 |
| **Nền tảng**       | Android (React Native + Expo); backend NestJS + PostgreSQL                                                                                                                                    |
| **Đặc tả**         | [`SRS_NezFocus.md`](SRS_NezFocus.md) **v1.8** (gộp quyết định thiết kế 17–23/10, Phụ lục 11.8–11.12), review: [`reviews/2026-10-16-srs-v1.2-review.md`](reviews/2026-10-16-srs-v1.2-review.md) |
| **Jira**           | <https://nez-focus.atlassian.net/jira/software/projects/NF/boards/3/backlog> (Epic NF-1…NF-11, issue NF-12…NF-87)                                                                             |
| **Repo**           | <https://github.com/Hagno1310/NezFocus>                                                                                                                                                       |

## 1. NezFocus là gì

### Làm gì

App Android giúp sinh viên học nhóm theo mô hình **server/kênh** giống Discord: chat real-time, voice qua LiveKit, phân quyền theo role.

Điểm khác Discord là bộ tính năng **Study/Focus**:

- **Room Session**: Pomodoro đồng bộ cho cả phòng học, mọi người thấy chung một đồng hồ.
- **Silent Room**: phòng học im lặng, vào là tự tắt mic.
- **Solo Session**: tự học một mình theo chu kỳ focus/nghỉ.
- **Study Streak**: đếm số ngày liên tiếp học đủ 15 phút.
- **Task Board** và màn hình **"Việc cần làm"** gom task từ mọi server.

Thuật ngữ chính xác của từng khái niệm: [`GLOSSARY.md`](../GLOSSARY.md).

### Vì sao

- Discord không được làm cho việc học. Sinh viên cần một nơi tổ chức lớp học phần, nhóm đồ án, nhóm ôn thi, **đo được thời gian học thật** và thấy bạn bè cùng học, ít xao nhãng hơn nhờ phòng im lặng và Chế độ Học tập.
- Về mặt đồ án: phải giải bài toán kiến trúc real-time trên mobile (Gateway WebSocket, fanout tin nhắn, phân quyền RBAC, WebRTC).

### Thế nào là thành công

1. **Demo end-to-end trên Android:** đăng ký → tạo Study Server → mời bạn qua link → chat → vào phòng học im lặng → chạy Room Session → khóa màn hình vẫn nhận thông báo chuyển pha → xem streak và việc cần làm → gọi 1-1.
2. **Pilot ≥ 30 user thật trong 2 tuần** (SRS 2.7):

   | KPI                                                          | Mục tiêu |
   | ------------------------------------------------------------ | -------- |
   | Verification rate (tỉ lệ xác thực email)                     | ≥ 70%    |
   | Activation (≥ 15 focused minutes trong 24h sau khi xác thực) | ≥ 50%    |
   | Crash-free sessions                                          | ≥ 99%    |

3. Mọi REQ trong MVP đạt Acceptance Criteria; CI xanh.

### Không làm

iOS, web, desktop, gói Premium, các mục Backlog ở SRS Mục 10.

## 2. Ai làm gì

Mỗi người làm **trọn một mảng tính năng**: màn hình React Native + API NestJS + test. Không ai chỉ làm backend hay chỉ làm app. Tuần đầu cả 3 người cùng làm **NF-12** (đăng ký tài khoản) làm tracer bullet để nắm chung cấu trúc. Review PR chéo nhau.

| Thành viên | Email                            | Mảng               | Phụ trách                                                                                                                     |
| ---------- | -------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Hiếu       | hieupt1003@gmail.com             | Tài khoản & Server | E1–E4: đăng ký/đăng nhập, hồ sơ, server & kênh, link mời, phân quyền (NF-85, ROLE-09), khung app, EAS, CI/deploy, `DESIGN.md` |
| Thùy       | ThuyNTT.B24CC257@stu.ptit.edu.vn | Chat & Kết nối     | E5, E6, E9: chat real-time, kết nối Gateway (NF-78), presence (NF-15), bạn bè & DM, push, Hộp thư Thông báo                   |
| Hoàng      | hoangnh.ptit@gmail.com           | Học & Voice        | E7, E8, E10, E11: Room/Solo Session, streak, task, voice & gọi 1-1, report, kiểm thử, pilot, slide                            |

Quy tắc gán issue trên Jira: theo người phụ trách Epic, **trừ NF-78 và NF-15 thuộc Thùy**.

## 3. Lịch trình

Sprint 2 tuần. Cuối mỗi sprint phải demo được mục tiêu trong cột thứ ba.

| Sprint | Thời gian   | Demo cuối sprint                                                                       | REQ                                                                                                                                                     |
| ------ | ----------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S0 ✅  | 16–18/10    | Base repo, CI, Docker                                                                  | —                                                                                                                                                       |
| S1     | 19/10–01/11 | Đăng ký → xác thực email → đăng nhập → tạo server                                      | AUTH-01 (tracer bullet, gồm khung điều hướng), 02, 04, 07, 08, 13 · bộ tính quyền (NF-85) · SRV-01, 02 · ROLE-01, 02, 03, 08 · Gateway + banner (NF-78) |
| S2     | 02/11–15/11 | Mời bạn qua link → chat real-time có phân quyền                                        | SRV-03, 04, 05, 07 · ROLE-04, 05, 07, 09 · MSG-01, 03, 05–11 · SEARCH-02 · NOTIF-01 · AUTH-05, 06 · STUDY-02, 05                                        |
| S3     | 16/11–29/11 | Phòng học im lặng → Room Session → khóa màn hình nhận chuyển pha → bạn bè/DM → gọi 1-1 | VC-01, 02, 04, 05, 08 · STUDY-01, 10, 11, 15 · NOTIF-02, 05 · FRIEND-01–04 · DM-01–03 · DMVC-01, 03                                                     |
| S4     | 30/11–13/12 | Pilot chạy; streak, task, việc cần làm; hoàn thiện                                     | STUDY-03, 06, 08 · MSG-04 (chỉ ảnh) · AUTH-10 · SAFE-01 · sửa lỗi pilot · checklist DoD (SRS 9.6) · báo cáo + slide                                     |
| —      | 14–15/12    | Đóng băng code, nộp & bảo vệ                                                           | —                                                                                                                                                       |

> **Đang ở đâu:** S0 đã xong (repo, CI, Docker, EAS, dev client). Các Blocker của SRS đã sửa ở v1.3; v1.4–v1.8 gộp các quyết định khi thiết kế màn hình (17–23/10). Bắt đầu S1 từ 19/10.

## 4. Epic & cách đọc Jira

| Epic                   | REQ                                        | Phụ trách            |
| ---------------------- | ------------------------------------------ | -------------------- |
| E1 Base & DevOps       | Repo, CI/CD, Docker, deploy VM, EAS        | Hiếu                 |
| E2 Auth & Tài khoản    | AUTH-01, 02, 04, 05, 06, 07, 08, 10, 13    | Hiếu (AUTH-05: Thùy) |
| E3 Server & Channel    | SRV-01–05, 07                              | Hiếu                 |
| E4 Phân quyền (RBAC)   | ROLE-01–05, 07, 08, 09 + NF-85             | Hiếu                 |
| E5 Messaging & Gateway | MSG-01, 03–11, SEARCH-02, NOTIF-01 + NF-78 | Thùy                 |
| E6 Bạn bè & DM         | FRIEND-01–04, DM-01–03 (GDM-01–03 nếu giữ) | Thùy                 |
| E7 Voice & Gọi         | VC-01, 02, 04, 05, 08, DMVC-01, 03         | Hoàng                |
| E8 Study/Focus         | STUDY-01, 02, 03, 05, 06, 08, 10, 11, 15   | Hoàng                |
| E9 Thông báo           | NOTIF-02, 05 (NOTIF-04 nếu giữ)            | Thùy                 |
| E10 An toàn            | SAFE-01                                    | Hoàng                |
| E11 QA & Phát hành     | Test theo AC, pilot, KPI, DoD              | Hoàng                |

Cách đọc một issue:

- **1 issue = 1 REQ** trong SRS. Tên dạng `REQ-XXX-NN: <tên>`, ví dụ `REQ-AUTH-01: Đăng ký`.
- **Mô tả** chứa Acceptance Criteria dạng checkbox. Tích từng ô khi AC đó có test hoặc đã kiểm tra.
- **Label:** `sprint-N` (thuộc sprint nào), `must` / `should` (mức ưu tiên), `de-xuat-hoan` (đề xuất hoãn, xem mục 5 — hỏi nhóm trước khi làm).
- **"is blocked by":** issue phải chờ. Chỉ nhận issue khi mọi issue chặn nó đã Done.
- Branch `feat/NF-<số>-<mo-ta>`, commit có key `NF-<số>` để Jira tự liên kết. Chi tiết: [`getting-started.md` mục 3](getting-started.md#3-quy-trình-làm-một-task).

## 5. Phạm vi đề xuất hoãn

Các REQ sau đang là MVP trong SRS nhưng **đề xuất hoãn sang v1.x** để kịp hạn (lý do ở review mục 3). Cần cả team đồng ý; nếu giữ lại thì làm cuối S4, ưu tiên thấp nhất:

- MSG-02 (link preview)
- GDM-01–03 (Group DM)
- NOTIF-04 (push đa thiết bị)
- Phần ClamAV / thumbnail video của MSG-04
- Outbox offline đầy đủ (SRS 7.3.2)

## 6. Rủi ro chính

| Rủi ro                                                   | Cách xử lý                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 64 REQ MVP cho 3 người trong 8 tuần (RISK-01)            | Hoãn các mục ở mục 5; review scope cuối mỗi sprint                                          |
| Voice/TURN thất bại sau NAT, mạng 4G (RISK-03)           | Làm VC-08 (TURN/TLS 443) cùng lúc với VC-01; test trên 4G thật trong S3                     |
| Android tối ưu pin làm chết foreground service (RISK-06) | Test trên ít nhất 2 hãng máy trong S3                                                       |
| ~~Chưa có `DESIGN.md` (hệ thống thiết kế UI)~~           | Đã có từ 17/10: `DESIGN.md` ở root (chép từ repo thiết kế), đặc tả màn hình ở repo thiết kế |

## Phụ lục: trang About trên Atlassian

Mục 1 (Làm gì / Vì sao / Thành công) dùng nguyên văn cho trang About. Tags: `do-an` `mobile` `android` `react-native` `nestjs` `realtime`.
