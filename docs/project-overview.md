# NezFocus — Tổng quan dự án & kế hoạch

Nguồn: `docs/SRS_NezFocus.md` (**v1.3**, bản gốc hiện hành) và `docs/reviews/2026-10-16-srs-v1.2-review.md`.
Team 3 người · Bắt đầu 19/10/2026 · **Hạn nộp: 15/12/2026** · Nền tảng: **Android** (React Native + Expo), backend NestJS.

## 1. Thông tin dự án (dán vào trang About trên Atlassian)

**Tên:** NezFocus: App học nhóm & chat/voice cho sinh viên

**Đang làm gì (What):**
App Android giúp sinh viên học nhóm theo mô hình server/kênh: chat real-time, voice qua LiveKit, phân quyền kiểu Discord. Điểm khác biệt là bộ tính năng Study/Focus: Pomodoro đồng bộ trong phòng học (Room Session), phòng học im lặng, học một mình (Solo Session), streak, task board và màn hình "Việc cần làm". Backend là NestJS modular monolith với PostgreSQL, Redis và LiveKit.

**Vì sao (Why):**
Discord không được thiết kế cho việc học. Sinh viên cần một nơi tổ chức lớp học phần, nhóm đồ án, nhóm ôn thi, trong đó đo được thời gian học thật và thấy bạn bè cùng học. Việc này giảm xao nhãng nhờ phòng học im lặng và Chế độ Học tập. Đồng thời đây là đồ án môn App: phải giải được bài toán kiến trúc real-time (Gateway WebSocket, fanout, RBAC, WebRTC) trên mobile.

**Thành công trông như thế nào (Success):**

- Demo end-to-end trên Android: đăng ký → tạo Study Server → mời bạn qua link → chat → vào phòng học im lặng → chạy Room Session → khóa màn hình vẫn nhận thông báo chuyển pha → xem streak và việc cần làm → gọi 1-1.
- Pilot ≥ 30 user thật trong 2 tuần (SRS 2.7):

  | KPI                                                          | Mục tiêu |
  | ------------------------------------------------------------ | -------- |
  | Verification rate                                            | ≥ 70%    |
  | Activation (≥ 15 focused minutes trong 24h sau khi xác thực) | ≥ 50%    |
  | Crash-free sessions                                          | ≥ 99%    |

- Mọi REQ trong MVP đạt Acceptance Criteria; CI xanh.

**Phạm vi ngoài:** iOS, web, desktop, gói Premium, các mục Backlog ở SRS Mục 10.

**Links:**

- Jira: https://nez-focus.atlassian.net/jira/software/projects/NF/boards/3/backlog (project NF: Epic NF-1…NF-11, issue NF-12…NF-87)
- Repo: https://github.com/Hagno1310/NezFocus
- SRS: `docs/SRS_NezFocus.md`
- Quy tắc làm việc: `AGENTS.md`

**Tags:** `do-an` `mobile` `android` `react-native` `nestjs` `realtime`

## 2. Thành viên & vai trò

Chia theo **mảng tính năng**: mỗi người làm trọn mảng của mình, gồm màn hình React Native, API NestJS và test. Không ai chỉ làm backend. Tuần đầu cả 3 người cùng làm tracer bullet NF-12 để nắm chung cấu trúc. Review PR chéo.

| Thành viên | Email                            | Mảng               | Gồm                                                                                                                              | Việc đang mở |
| ---------- | -------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Hiếu (1)   | hieupt1003@gmail.com             | Tài khoản & Server | Epic E1–E4: đăng ký/đăng nhập, hồ sơ, server & kênh, link mời, phân quyền (NF-85, ROLE-09), khung app, EAS, CI/deploy, DESIGN.md | 25           |
| Thùy (2)   | ThuyNTT.B24CC257@stu.ptit.edu.vn | Chat & Kết nối     | Epic E5, E6, E9: chat real-time, kết nối Gateway (NF-78), presence (NF-15), bạn bè & DM, push, Hộp thư Thông báo                 | 28           |
| Hoàng (3)  | hoangnh.ptit@gmail.com           | Học & Voice        | Epic E7, E8, E10, E11: Room/Solo Session, streak, task, voice & gọi 1-1, report, kiểm thử, pilot, slide                          | 20           |

Quy tắc gán trên Jira: theo mảng của Epic, trừ NF-78 và NF-15 thuộc Thùy.

## 3. Mốc thời gian (sprint 2 tuần)

Pilot cần chạy 2 tuần trước hạn nộp, nên **luồng demo phải xong trước 29/11**.

| Sprint | Thời gian   | Mục tiêu demo cuối sprint                                                              | REQ                                                                                                                                                                                                   |
| ------ | ----------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S0     | 16–18/10    | Base repo, CI, Docker ✅                                                               | —                                                                                                                                                                                                     |
| S1     | 19/10–01/11 | Đăng ký → xác thực email → đăng nhập → tạo server                                      | ~~Sửa 5 Blocker SRS~~ (xong ở v1.3) · AUTH-01 (tracer bullet, gồm khung điều hướng), 02, 04, 07, 08, 13 · bộ tính quyền (NF-85) · SRV-01, 02 · ROLE-01, 02, 03, 08 · kết nối Gateway + banner (NF-78) |
| S2     | 02/11–15/11 | Mời bạn qua link → chat real-time có phân quyền                                        | SRV-03, 04, 05, 07 · ROLE-04, 05, 07, 09 · MSG-01, 03, 05, 06, 07, 08, 09, 10, 11 · SEARCH-02 · NOTIF-01 · AUTH-05, 06 · STUDY-02, 05                                                                 |
| S3     | 16/11–29/11 | Phòng học im lặng → Room Session → khóa màn hình nhận chuyển pha → bạn bè/DM → gọi 1-1 | VC-01, 02, 04, 05, 08 · STUDY-01, 10, 11, 15 · NOTIF-02, 05 · FRIEND-01–04 · DM-01–03 · DMVC-01, 03                                                                                                   |
| S4     | 30/11–13/12 | Pilot chạy; streak, task, việc cần làm; hoàn thiện                                     | STUDY-03, 06, 08 · MSG-04 (chỉ ảnh) · AUTH-10 · SAFE-01 · sửa lỗi pilot · checklist DoD (SRS 9.6) · báo cáo + slide                                                                                   |
| —      | 14–15/12    | Đóng băng code, nộp & bảo vệ                                                           | —                                                                                                                                                                                                     |

**Đề xuất hoãn sang v1.x** (đang là MVP trong SRS, cần cả team đồng ý; lý do ở review mục 3): MSG-02 (link preview), GDM-01–03 (Group DM), NOTIF-04 (push đa thiết bị), phần ClamAV/thumbnail video của MSG-04, outbox offline đầy đủ (7.3.2). Nếu giữ lại thì cho vào cuối S4 với ưu tiên thấp nhất.

## 4. Epic cho Jira

| Epic                   | REQ                                        | Owner                |
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

Đã tạo trên Jira (16/10): mỗi issue = 1 REQ, tên `REQ-XXX-NN: <tên>`, mô tả chứa AC dạng checkbox, label `sprint-N`/`must`/`should`/`de-xuat-hoan`. Branch `feat/NF-<số>-<mo-ta>`, commit có key `NF-<số>`.

## 5. Rủi ro chính

| Rủi ro                                                   | Biện pháp                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| 64 REQ MVP cho 3 người trong 8 tuần (RISK-01)            | Hoãn các mục ở trên; review scope mỗi cuối sprint                       |
| 5 Blocker trong SRS chưa sửa                             | Sửa ngay đầu S1, trước khi code phần liên quan                          |
| Voice/TURN thất bại sau NAT, 4G (RISK-03)                | Làm VC-08 (TURN/TLS 443) cùng lúc với VC-01; test trên 4G thật trong S3 |
| Android tối ưu pin làm chết foreground service (RISK-06) | Test trên ≥ 2 hãng máy trong S3                                         |
| Chưa có `DESIGN.md`                                      | Bổ sung trước khi làm UI ở S2                                           |
