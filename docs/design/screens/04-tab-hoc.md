# 04 · Tab Học ⭐ vertical slice

Tab Học: ai đang học, học một mình, streak và thống kê. Nửa sau của vertical slice (cùng [03-study-room.md](03-study-room.md)).

- Hành vi: SRS v1.9 Mục 3.1 (Tab Học), 3.5, 4.9.1, REQ-STUDY-03/04/10/12/15/17, REQ-AUTH-05 (hoạt động học), UF-05. Ngưỡng 15 phút của Qualified Day: DEC-43.
- Component: [00-components.md](00-components.md). Nhìn thế nào: [DESIGN.md](../../../DESIGN.md).
- Thứ tự trên tab theo điều cần nhớ của sản phẩm: **ai đang học** trước, **học một mình** sau, **thống kê của mình** cuối.

## Quy ước chung của khu vực

| Hạng mục | Quy ước |
|---|---|
| Khung | 390 × 844; kiểm thêm 360 × 800 cho S-STUDY-01 |
| Vị trí | Tab **Học** đang chọn trong `TabBar`. Badge chấm khi user đang trong một Focus Session (SRS 3.1) |
| Số | Mọi số thay đổi theo thời gian và mọi số thống kê dùng Unbounded (`numeric-inline`, `stat`, `timer`); đơn vị ("giờ", "phút", "ngày") dùng Be Vietnam Pro |
| Mascot | Empty state (neutral), mốc streak và tổng kết phiên (happy), pha Nghỉ của Solo (sleepy/happy). **Không** khi streak bị gãy, không trong pha Tập trung |
| Dữ liệu nhất quán | Số trong mỗi frame phải khớp luật: streak 0 thì hôm qua < 15 phút và hôm nay < 15 phút (mẫu `streak-zero`: T7 10 phút, CN 0 phút, tuần 3 giờ 15 phút); tổng các cột = tổng tuần; streak N thì đúng N ô đặc liền nhau tính tới hôm nay, ô ngay trước đó rỗng (mẫu `streak-milestone`: 7 ngày, tuần này T2 20 phút, tổng 4 giờ 55 phút). (v1.9, CR-23) Thanh tiến độ hôm nay = cột hôm nay; lịch tháng = các cột của những tuần trong tháng; dòng lịch sử phiên cộng theo ngày = cột của ngày đó và cộng theo loại = "Phòng học … · Một mình …"; dòng so sánh và trung bình tính đúng theo luật ở S-STUDY-03 |
| Dữ liệu mẫu | Streak 6 ngày (T3–CN); tuần này 4 giờ 35 phút (T2 0 · T3 50 · T4 40 · T5 35 · T6 60 · T7 45 · CN 45 phút); An đang ở "Phòng học im lặng". Mọi tổng kết phiên lúc 21:47 ghi "Chuỗi 6 ngày liên tiếp" (riêng `midnight` lúc 00:41 thứ Hai: 7 ngày) |
| Giờ mẫu & kịch bản (chốt 22/10/2026) | **21:47, Chủ Nhật 18/10/2026**, cùng kịch bản với 03 › Quy ước: phiên học của Phòng học im lặng bắt đầu 21:11, đang Vòng 2 còn 18 phút; CN 45 phút = 14 phút học một mình buổi chiều + 31 phút trong phiên. Các frame Solo (S-STUDY-02, S-ROOM-08 `solo`) là nhánh An học một mình thay vì vào phòng: 50/10, Vòng 1 bắt đầu 21:29, lúc 21:47 còn 32:10 (đã học 17 phút) |
| Thống kê mẫu (v1.9, CR-23) | Phút từng ngày (★ = đủ 15 phút). **Tuần 12/10–18/10:** T2 0 · T3 50★ · T4 40★ · T5 35★ · T6 60★ · T7 45★ · CN 45★ = 4 giờ 35 phút (Phòng học 3 giờ 20 phút · Một mình 1 giờ 15 phút). **Tuần 05/10–11/10:** T2 20★ · T3 0 · T4 25★ · T5 15★ · T6 10 · T7 30★ · CN 15★ = 1 giờ 55 phút (Phòng học 1 giờ 10 phút · Một mình 45 phút). **Tuần 28/9–4/10:** 28/9 15★ · 29/9 30★ · 30/9 0 · 1/10 30★ · 2/10 0 · 3/10 45★ · 4/10 40★ = 2 giờ 40 phút. **Tuần 21/9–27/9:** 20★ · 0 · 15★ · 10 · 25★ · 0 · 30★. **Tuần 14/9–20/9:** 30★ · 25★ · 0 · 40★ · 20★ · 15★ · 0. **Tháng 10/2026** (1–18/10): 8 giờ 25 phút (Phòng học 6 giờ 10 phút · Một mình 2 giờ 15 phút); 1–18/9: 9 giờ 10 phút. Dài nhất 14 ngày (tháng 8–9, ngoài các tuần trên). Từ trước tới nay 86 giờ (86 giờ 12 phút). Ngày đầu tiên có dữ liệu: trước tháng 12/2025 (đủ cho `year-boundary`) |
| Phòng & bạn bè mẫu (lúc 21:47) | Bạn bè của An: Bình, Chi, Dũng, Lan (đều trong Phòng học im lặng), Tuấn, Minh. **Phòng học im lặng** · Ôn thi GT2 · Tập trung còn 18 phút · 9 người kể cả An → "Bình, Chi và 6 người". **Phòng thảo luận nhóm** · Nhóm đồ án Mobile · Nghỉ ngắn còn 3 phút · "Tuấn và 2 người". **Góc học khuya** · CLB Guitar PTIT · Tập trung còn 41 phút · "4 người". Thêm ở `many-rooms` / S-STUDY-06: **Phòng ôn tập 2** · Ôn thi GT2 · Nghỉ ngắn còn 2 phút · "Minh và 4 người"; **Phòng luyện đề** · Toán rời rạc · Tập trung còn 12 phút · "8 người". "{N} người" không tính An và không tính các bạn đã nêu tên. Một người chỉ ở một phòng hoặc đang học một mình, không cả hai. **Hai nhánh (rà 31/10/2026):** nhánh chính 3 phòng — Minh **đang học một mình** (dòng bạn bè, `friends-sheet`, `solo-running`, 03 `incoming-call` Minh gọi khi không ở phòng nào); nhánh `many-rooms` / S-STUDY-06 / edge `many-friends` thêm 2 phòng và Minh **ở Phòng ôn tập 2** thay vì học một mình (vẫn 6 bạn đang học). Hai nhánh không cùng xuất hiện trong một frame; frame của nhánh này không dùng vị trí của Minh ở nhánh kia |

---

## S-STUDY-01 · Tổng quan tab Học

**Mục đích:** thấy ngay ai đang học và vào học trong ≤ 3 chạm (NFR-USAB-02).
**REQ:** SRS 3.1 (Tab Học), STUDY-03/10, 3.5.
**Mở từ:** `TabBar` › Học. **Đi tới:** S-ROOM-02 `not-joined` (chạm hàng phòng), S-ROOM-02 (chạm "Vào"), S-STUDY-06 ("Xem tất cả"), S-ROOM-06 (vào phòng khi đang Solo), S-STUDY-02 (Bắt đầu học một mình), S-STUDY-03 (chạm "Tuần này").

### Bố cục
```
┌ Status bar ──────────────────────────────┐
│ Học                                      │  title-1
│                                          │
│ Đang học lúc này                3 phòng  │  headline + label (tổng số phòng)
│ [lamp] Tập trung · còn 18 phút           │  PhaseBadge · S · list
│ Phòng học im lặng            [Bạn ở đây] │  body 600
│ (B)(C) Bình, Chi và 6 người · Ôn thi GT2 │  avatar bạn bè + label
│ ──────────────────────────────────────── │
│ [cup] Nghỉ ngắn · còn 3 phút             │
│ Phòng thảo luận nhóm              [Vào]  │  Button · secondary · S
│ (T) Tuấn và 2 người · Nhóm đồ án Mobile  │
│ ──────────────────────────────────────── │
│ (Xem tất cả ({N}) — chỉ khi > 3 phòng)   │  Button · text, xem state many-rooms
│                                          │
│ ┌ Học một mình ───────────────────────┐  │  khối duy nhất có viền, rounded.button
│ │ Học một mình        [▶ Bắt đầu] tắt │  │  Button · primary · M, disabled vì An đang trong phiên học
│ │ Chu kỳ 50/10 ⌄                      │  │  chạm dòng này → chọn chu kỳ (cycle-sheet)
│ │ Bạn đang trong phiên học ở Phòng học im lặng │  dòng lý do (label, text-secondary)
│ └─────────────────────────────────────┘  │
│                                          │
│ Tuần này                              ›  │  chạm cả khối → S-STUDY-03
│ 6 ngày liên tiếp     4 giờ 35 phút       │  stat + đơn vị
│ Hôm nay 45 phút · đã đủ 15 phút          │  TodayProgress: label + thanh 6 (v1.9, CR-23)
│ ████████████████████████████████████     │
│ ▁ ▅ ▄ ▃ ▆ ▄ █                            │  cột 7 ngày, hôm nay màu primary
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ 15 phút        │  vạch 15 phút, nằm DƯỚI cột và số
│ T2 T3 T4 T5 T6 T7 CN                     │
├ MiniPlayer (khi đang trong phòng/Solo) ──┤
├ TabBar (Học) ────────────────────────────┤
```

### Component
`PhaseBadge · S`, `Avatar` (chồng 22), `Button`, `BottomSheet` (chọn chu kỳ, dùng lại phần lựa chọn của S-ROOM-03), `TodayProgress`, `EmptyState · inline`, `Skeleton`, `Banner`, `MiniPlayer`, `TabBar`.

### Biểu đồ tuần (tab Học và Thống kê)
Không phải component dùng chung; luật thể hiện ở đây cho cả S-STUDY-01 và S-STUDY-03.
- Cột theo ngày T2 → CN; thang cột = **max(cột cao nhất của tuần, 15 phút)** để vạch 15 phút luôn nằm trong khung (tuần toàn ngày < 15 phút: vạch ở đỉnh khung). Ngày > 0 cao tối thiểu 4. Màu cột: đủ 15 phút `surface-3`, chưa đủ hoặc 0 phút `border`, hôm nay `primary` (như `week-spike`).
- **Vạch 15 phút (v1.9, CR-23):** ngang, gạch đứt, `border-input`, ở mức 15 phút theo cùng thang; nhãn "15 phút" (`label`, `text-tertiary`) ở đầu phải, ngoài vùng cột (biểu đồ chừa lề phải cho nhãn). Vạch vẽ **dưới** cột và số trên cột: số "14" của cột 14 phút không bị gạch đè. Ngày đạt hay chưa đọc được khi chụp đen trắng (cột cắt qua vạch).
- Ngày tương lai: không cột, không số, nhãn ngày `text-tertiary` (`empty-week`).

### Tiến độ hôm nay (`TodayProgress`, v1.9 CR-23)
Cấu tạo, hai dạng chữ và luật cập nhật: 00-components › `TodayProgress`. Ở tab Học: trong khối "Tuần này", giữa dòng chuỗi và biểu đồ, rộng hết khối (S-STUDY-03 có chỗ riêng, xem Bố cục ở đó). Có ở mọi state có khối "Tuần này", kể cả `streak-zero` ("Hôm nay 0 / 15 phút", thanh rỗng, câu "Học 15 phút hôm nay để bắt đầu chuỗi mới" giữ ở dòng chuỗi); `never-studied` không có thanh (EmptyState thay cả khối).

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề màn hình | "Học" |
| Mục phòng | "Đang học lúc này" · "{N} phòng" (N = tổng số phòng, bằng số trong "Xem tất cả ({N})") |
| Hàng phòng — pha | "Tập trung · còn {18} phút" / "Nghỉ ngắn · còn {3} phút" / "… · còn dưới 1 phút" / "Tạm dừng" (không số). Chỉ hiện phút, không đếm giây (C-16 › `list`) |
| Hàng phòng — người | "{Bạn A}, {Bạn B} và {N} người · {Server}" / "{N} người · {Server}" (không có bạn bè) |
| Nút hàng phòng | "Vào" · nhãn "Bạn ở đây" (phòng user đang ở) |
| Khối Solo | "Học một mình" · "Chu kỳ {50/10}" (bật nghỉ dài: "Chu kỳ {120/30} · nghỉ dài {60}") · "Bắt đầu". Chu kỳ là **lựa chọn gần nhất** (lần đầu: 50/10). Cùng cách ghi với "Chu kỳ 50/10 · Sửa" ở S-STUDY-02 và tên preset trong sheet. Dòng chu kỳ xuống tối đa 2 dòng, ⌄ không bao giờ bị nút che; 200%: nút "Bắt đầu" xuống dưới, rộng hết khối (chốt 17/10/2026) |
| Khối Solo đang chạy (v1.9, CR-23) | Ghi **phút**, không đếm giây (`MiniPlayer` cùng màn đã đếm giây): `PhaseBadge · S · list` "Tập trung · còn {32} phút" (Nghỉ ngắn / Nghỉ dài tương tự; < 1 phút "còn dưới 1 phút") + `Button · secondary · S` "Mở"; tạm dừng "Tạm dừng" (không số); đang chờ "Hết giờ nghỉ · còn {8} phút để học tiếp" + "Mở" |
| Mục thống kê | "Tuần này" · "{6} ngày liên tiếp" · "{4} giờ {35} phút" · tiến độ "Hôm nay {45} phút · đã đủ 15 phút" / "Hôm nay {14} / 15 phút" · nhãn vạch "15 phút" |
| Trục biểu đồ | "T2 T3 T4 T5 T6 T7 CN" |

### Sắp xếp "Đang học lúc này"
Mọi Study Room đang có phiên học trong các server của user mà user có `VIEW_CHANNEL` + `CONNECT` (SRS 3.1). Chốt 17/10/2026:

- **Thứ tự:** phòng user đang ở → phòng có bạn bè (nhiều bạn trước) → đông người trước → **bắt đầu phiên học sớm hơn** trước (mốc cố định, phá mọi thế hòa). "Bạn bè" = bạn đã kết bạn.
- **Không giới hạn số phòng mỗi server.** Mỗi phòng xét riêng; 3 hàng có thể cùng một server — tên server ở cuối hàng để phân biệt. Ví dụ (đổi 22/10/2026 cho khớp bộ bạn bè mẫu): Phòng học im lặng (GT2, bạn ở đây) → Phòng ôn tập 2 (GT2, 1 bạn, 5 người) → Phòng thảo luận nhóm (Nhóm đồ án Mobile, 1 bạn, 3 người); Phòng luyện đề (Toán rời rạc, 0 bạn, 8 người) và Góc học khuya (0 bạn, 4 người) nằm trong "Xem tất cả (5)".
- **Chỉ xếp lại khi mở tab** (hoặc quay lại tab) **và khi kéo để làm mới.** Lúc đang xem: số người và thời gian vẫn cập nhật, thứ tự giữ nguyên. Phòng hết phiên học → hàng mờ dần rồi biến mất, hàng dưới dồn lên (`medium`; Giảm chuyển động → biến mất tức thì). Phòng mới bắt đầu phiên → chỉ tăng số "{N} phòng"; nếu đang hiện < 3 hàng thì nối vào cuối.
- Tối đa 3 hàng; "Xem tất cả ({N})" khi N > 3, N là tổng số phòng → S-STUDY-06.
- Phòng đầy (`user_limit`, REQ-VC-07) thuộc v1.x — đặc tả khi làm tới.

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục: user đang trong phiên học ở "Phòng học im lặng", có `MiniPlayer`; vì vậy khối Học một mình đã ở trạng thái `in-room-solo-blocked` (nút "Bắt đầu" tắt + dòng lý do). Áp dụng cho mọi frame có An trong phòng (`default · light`, `many-rooms`, edge `streak-huge`, 03 › S-ROOM-08 `room-session` / `camera-on` / `paused`). Khối "Tuần này" có thanh "Hôm nay 45 phút · đã đủ 15 phút" và vạch 15 phút (v1.9, CR-23) | |
| `idle` | User không ở phòng nào: không `MiniPlayer`, mọi hàng phòng có nút "Vào", nút "Bắt đầu" bật; khối "Tuần này" như `default` | |
| `cycle-sheet` 🆕 | Chạm dòng chu kỳ của khối Solo → `BottomSheet` "Chọn chu kỳ": 25/5 · 50/10 · Tùy chỉnh (dùng lại phần lựa chọn và nghỉ dài của S-ROOM-03), lựa chọn hiện tại được chọn sẵn. Frame vẽ **Tùy chỉnh** đang mở: 120 / 30, nghỉ dài 60 sau mỗi 4 vòng (khớp `long-cycle`), dòng tóm tắt "120 phút tập trung · nghỉ 30 · nghỉ dài 60 sau mỗi 4 vòng"; chạm ô số → bàn phím số, sheet theo `keyboard-open` của C-09 (như S-ROOM-03 `custom`, không vẽ lại); nút chính `primary · L` "Bắt đầu" → chạy Solo ngay. Vuốt/chạm nền để đóng → **giữ lựa chọn mới**, khối Solo cập nhật | "Chọn chu kỳ" · "App nhớ lựa chọn này cho lần sau." · "Bắt đầu" |
| `long-cycle` 🆕 | Kiểm chữ dài: chu kỳ dài nhất có nghỉ dài | "Chu kỳ 120/30 · nghỉ dài 60" |
| `many-rooms` 🆕 | 5 phòng: 3 hàng theo ví dụ ở mục Sắp xếp (Phòng học im lặng, Phòng ôn tập 2 — 2 phòng cùng server Ôn thi GT2 — rồi Phòng thảo luận nhóm) + `Button · text` "Xem tất cả (5)"; tiêu đề "5 phòng" | → S-STUDY-06 |
| `no-active-rooms` | Mục phòng thành `EmptyState · inline` (không mascot) | "Chưa có phòng nào đang học" · "Vào một Phòng học và bấm Bắt đầu phiên học, hoặc học một mình bên dưới." |
| `no-server` | User chưa ở server nào: mục phòng thành `EmptyState · inline` | "Bạn chưa ở server nào" · nút `secondary` "Tạo Study Server" |
| `never-studied` | Chưa từng học: mục "Tuần này" thành `EmptyState` có Runtime neutral 96. Màn chỉ có **một** nút primary là "Bắt đầu" của khối Solo; nút của EmptyState là `Button · secondary` (chốt 22/10/2026) | "Chưa có phút học nào" · "Học 15 phút để bắt đầu chuỗi ngày đầu tiên." · "Bắt đầu Tập trung 25 phút" (SRS 3.5) → mở Solo với 25/5 |
| `streak-zero` | Hôm qua không đủ 15 phút: số streak "0"; dòng phụ trung tính, **không mascot**; thanh "Hôm nay 0 / 15 phút" rỗng; biểu đồ (T7 10, CN 0) có vạch 15 phút nằm trên cột T7 | "Học 15 phút hôm nay để bắt đầu chuỗi mới" |
| `solo-running` | User đang Solo (50/10, còn 32:10 lúc 21:47): khối Solo thành `PhaseBadge · S · list` "Tập trung · còn 32 phút" + nút `secondary` "Mở" (v1.9, CR-23: ghi phút, không đếm giây); `MiniPlayer · solo` "Tập trung 32:10"; khối "Tuần này" theo nhánh Solo: CN 31 phút (14 + 17), tuần 4 giờ 21 phút, "Hôm nay 31 phút · đã đủ 15 phút" | Tạm dừng: "Tạm dừng"; đang chờ: "Hết giờ nghỉ · còn 8 phút để học tiếp" + "Mở" (03 › S-ROOM-08 `solo-waiting`) |
| `in-room-solo-blocked` | User đang là Participant của phiên học ở phòng: nút "Bắt đầu" `disabled` + dòng giải thích. Đây là cách khối Solo hiện ở **mọi** frame có An trong phòng **có phiên** (kể cả `default`); frame riêng giữ làm mẫu chuẩn của luật. Ở phòng voice / Phòng học **chưa có phiên**: khối Solo bình thường, "Bắt đầu" bật; bắt đầu thì `MiniPlayer · voice-solo` (03 › S-ROOM-08) (v1.9, CR-22) | "Bạn đang trong phiên học ở Phòng học im lặng" (`40903`) |
| `loading` | `Skeleton` cho 3 hàng phòng và khối thống kê | |
| `offline` | `Banner · offline` nằm **ngay dưới tiêu đề tab "Học"** (luật chung cho màn gốc của tab, cùng 07 › S-ME-02 `offline`, chốt 22/10/2026); mục phòng: "Cần kết nối mạng để xem phòng đang học"; thống kê hiện bản cache (cả thanh tiến độ và vạch 15 phút); Học một mình vẫn bắt đầu được | SRS 3.5, 7.3.2 |
| `large-text` | 200%: hàng phòng xuống dòng, nút "Vào" xuống dưới chữ (canh trái, cùng cột với chữ); biểu đồ giữ nguyên, nhãn ngày `tab`; chữ tiến độ xuống dòng, thanh rộng hết khối dưới chữ; nhãn "15 phút" giữ một dòng ở đầu phải vạch | |
| `default · 360` | Khung 360 × 800: cùng nội dung `default`; dòng người cắt `…` (tên server mất trước), nút "Vào" / nhãn "Bạn ở đây" không bị đẩy ra ngoài; nhãn "15 phút" không chồng cột CN | Checklist 360 |

### Tương tác
- Chạm hàng phòng (ngoài nút) → S-ROOM-02 `not-joined` (xem trước phòng đang có phiên, REQ-VC-01); chạm "Vào" → vào phòng ngay (đang Solo thì S-ROOM-06).
- Chạm "Xem tất cả ({N})" → S-STUDY-06.
- Chạm dòng chu kỳ của khối Solo → state `cycle-sheet`; app nhớ lựa chọn gần nhất (kể cả khi đóng sheet không bấm Bắt đầu).
- Chạm "Bắt đầu" → S-ROOM-09 nếu chưa từng xin quyền thông báo, rồi S-STUDY-02.
- Kéo xuống để làm mới (SRS 3.4).

### Checklist duyệt
- [ ] 14 state, mỗi state một frame; `default`, `no-active-rooms`, `never-studied` ở cả hai theme; `default · 360`.
- [ ] Bắt đầu học một mình từ tab Học: 1 chạm ("Bắt đầu") — đạt NFR-USAB-02.
- [ ] `streak-zero` không có mascot, không màu ngữ nghĩa, không câu trách móc.
- [ ] Biểu đồ là dữ liệu thật (tổng khớp "4 giờ 35 phút").
- [ ] Vạch 15 phút nằm dưới cột và số; thanh tiến độ khớp cột hôm nay (45 → "đã đủ 15 phút", thanh đầy).
- [ ] Khối Solo đang chạy không có số đếm giây (chỉ `MiniPlayer` đếm giây).

---

## S-STUDY-02 · Học một mình (Solo Session)

**Mục đích:** học một mình theo chu kỳ, khóa màn hình được, và vẫn thấy mình không học một mình.
**REQ:** STUDY-10/15, 4.9.1, 7.3.6, UF-05.
**Mở từ:** "Bắt đầu" / "Mở" ở S-STUDY-01; `MiniPlayer · solo`; notification "Hết giờ nghỉ, bấm để học tiếp". **Đi tới:** S-STUDY-01 (Dừng / Xong), S-STUDY-03 (từ tổng kết), sheet "Bạn bè đang học" → S-ROOM-06 / S-ROOM-02 `not-joined`.

### Bố cục
```
┌ Status bar ──────────────────────────────┐
│ ‹ Học        Học một mình                │  header 56: IconButton back + headline
│                                          │
│          ╭───────────╮                   │
│          │[lamp] Tập trung│              │  FocusTimer · ring (không có ghế)
│          │   32:10   │                   │
│          │Vòng 1 · nghỉ lúc 22:19│       │
│          ╰───────────╯                   │
│                                          │
│  (B)(C)(D)+3 6 bạn đang học lúc này  ›   │  tối đa 3 avatar bạn bè + "+N" + label → sheet Bạn bè đang học
│  Chu kỳ 50/10 · Sửa                      │  Button · text → sheet Sửa chu kỳ
│                                          │
│   (⏭ Bỏ qua pha)  (⏸ Tạm dừng)  (■ Dừng) │  RoomControl: 2 nút + bản chính
├ TabBar (Học) ────────────────────────────┤
```
Nền tràn viền theo pha như Study Room (DESIGN.md › Colors, chốt 16/10/2026).

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Header | "Học một mình" |
| Dòng bạn bè | "{6} bạn đang học lúc này" (mẫu: Bình, Chi, Dũng, Lan ở Phòng học im lặng · Tuấn ở Phòng thảo luận nhóm · Minh đang học một mình) / ẩn khi không có ai |
| Chu kỳ | "Chu kỳ 50/10 · Sửa" |
| Nút | "Bỏ qua pha" · "Tạm dừng"/"Tiếp tục" · "Dừng" |

### Trạng thái
| State | Khác gì so với default (`focus`) | Chữ / hành động riêng |
|---|---|---|
| `focus` | Như bố cục | |
| `short-break` | Nền `phase-short-room`, vòng nét gạch, Runtime sleepy giữa vòng; "06:40" | "Hết nghỉ lúc 21:54" — Solo không tự quay lại Tập trung; hết nghỉ sang `waiting` |
| `long-break` | Nền `phase-long-room`, vòng đôi, Runtime happy; "21:15" · "Hết nghỉ lúc 22:08" | Dòng chu kỳ "Chu kỳ 50/10 · nghỉ dài 30 · Sửa" (chỉ có nghỉ dài khi chu kỳ bật nó) |
| `paused` | `FocusTimer · paused`; nút chính "Tiếp tục". Tạm dừng trong Nghỉ ngắn / Nghỉ dài: giữ nền và nét vòng của pha (`short-break` / `long-break`), **không mascot** ở mọi pha (chốt 07/11/2026; frame chỉ vẽ pha Tập trung) | "Đã tạm dừng" · "Đồng hồ đứng yên, không tính phút" |
| `waiting` | `FocusTimer · waiting` (đếm ngược 10:00 tới lúc hết hạn); `Button · primary · L` "Học tiếp" dưới vòng; ẩn "Bỏ qua pha"; **không mascot** (Runtime đang ngủ ngược với lời mời học tiếp) | "Hết giờ nghỉ" · "Bấm Học tiếp để bắt đầu vòng mới" (STUDY-10) |
| `ended-summary` | Màn hình tổng kết: Runtime happy 120, số phút `stat`, dòng streak | "Bạn đã tập trung {1} giờ {15} phút" · "Chuỗi {6} ngày liên tiếp" (icon `flame`) · nút "Học thêm" (`secondary`) · "Xong" (`primary`) |
| `ended-expired` | Hết 10 phút chờ không bấm: như `ended-summary` nhưng có dòng giải thích, không mascot happy (neutral) | "Phiên học kết thúc lúc 21:45 vì chưa học tiếp" (mốc đã qua, sớm hơn giờ status bar 21:47) |
| `edit-cycle-sheet` 🆕 | Chạm "Chu kỳ 50/10 · Sửa" → `BottomSheet` "Sửa chu kỳ", cùng nội dung `cycle-sheet` (ví dụ đang chọn 25/5); nút chính "Áp dụng từ vòng sau" → `pending-config`. Đồng hồ vẫn chạy phía sau | "Sửa chu kỳ" · "Vòng đang chạy giữ nguyên, chu kỳ mới áp dụng từ vòng sau." (STUDY-11, cùng luật cho Solo). Chốt 17/10/2026 |
| `pending-config` | Dòng phụ trong vòng "Từ vòng sau: 25/5" | STUDY-11 (cùng luật cho Solo) |
| `offline` | `Banner · offline` "Bạn đang offline"; đồng hồ vẫn chạy; dòng dưới đồng hồ chỉ nói phần còn lại (không lặp "Bạn đang offline") | "Phút học được ghi khi có mạng" (STUDY-15 (3)) |
| `exact-alarm-off` | Chỉ Android 12+, khi app chưa có quyền "Báo thức và lời nhắc" (Android 14 mặc định tắt): dòng `label` `text-secondary` dưới đồng hồ + `Button · text · S` bên dưới. Bấm → trang cài đặt "Báo thức và lời nhắc" của app; quay lại app mà đã có quyền → dòng và nút ẩn ngay. iOS không bao giờ hiện | "Báo chuyển pha có thể trễ vài phút" · nút "Cho phép báo đúng giờ" (SRS 7.3.6, STUDY-01 AC4 ≤ 60 giây). Chốt 17/10/2026 |
| `friends-sheet` 🆕 | Chạm dòng "{6} bạn đang học lúc này" → `BottomSheet` "Bạn bè đang học" trên nền Solo (vẫn chạy); mẫu 6 hàng: Bình, Chi, Dũng, Lan (Phòng học im lặng · Tập trung còn 18 phút) → Tuấn (Phòng thảo luận nhóm · Nghỉ ngắn còn 3 phút) → Minh (Đang học một mình — được đếm vì "Hiện hoạt động học" mặc định bật, v1.9 CR-24) | Xem mục "Bạn bè đang học" bên dưới. Chốt 17/10/2026; luật đếm sửa v1.9 (CR-24), frame không đổi |

### Tương tác
- "Dừng" → kết thúc ngay, **không xác nhận** (STUDY-10) → `ended-summary`.
- Rời màn hình (back, chuyển tab) → `MiniPlayer · solo`; phiên vẫn chạy.
- Chạm dòng bạn bè → `BottomSheet` "Bạn bè đang học" (state `friends-sheet`), không rời màn Solo. (Trước đây về S-STUDY-01 — trùng nút back và không thấy được bạn đang học một mình.)

### Bạn bè đang học (BottomSheet)
- **Ai được đếm** trong "{N} bạn đang học lúc này" và có mặt trong sheet (v1.9, CR-24 — cùng luật hiện / ẩn hoạt động học của REQ-AUTH-05): bạn bè đang ở Room Session (phòng có phiên) — kể cả phòng user **không** xem được — và bạn bè đang Học một mình. Không đếm bạn đặt trạng thái Ẩn, tắt "Hiện hoạt động học" (07 › S-ME-04; mặc định bật, một công tắc cho cả học một mình), hai người có chặn theo bất kỳ chiều nào, tài khoản đã xóa. Bạn chỉ ở phòng voice không có phiên thì không đếm.
- **Mỗi hàng một người**, `Avatar` 32 + tên (`body` 600) + dòng phụ (`label`, `text-secondary`):
  - Trong phòng user xem được (`VIEW_CHANNEL` + `CONNECT`, cùng tập phòng với S-STUDY-01): "{Phòng học im lặng} · {Ôn thi GT2}" + `PhaseBadge · S · list` của phòng + `Button · secondary · S` "Vào". Chạm "Vào" → S-ROOM-06 (vì đang Solo). Chạm hàng (ngoài nút) → S-ROOM-02 `not-joined-other-session` (03).
  - Trong phòng user không xem được (khác server, kênh riêng tư) (v1.9, CR-24): "Đang học cùng nhóm" — không tên phòng, không server, không pha / thời gian, không nút "Vào", không bấm được.
  - Học một mình: "Đang học một mình", không nút, không bấm được.
- **Thứ tự:** bạn trong phòng xem được trước (theo thứ tự phòng của S-STUDY-01 › Sắp xếp; cùng phòng thì theo tên), rồi bạn "Đang học cùng nhóm" (theo tên), rồi bạn học một mình (theo tên). Danh sách chụp lúc mở sheet, không xếp lại khi đang xem.
- Mẫu `friends-sheet` không có hàng "Đang học cùng nhóm": cả 6 bạn của An đều đã có chỗ trong kịch bản 21:47 (README › Bộ dữ liệu mẫu), thêm bạn sẽ làm lệch "6 bạn" ở mọi frame S-STUDY-02. Hàng này vẽ ở edge `many-friends-sheet`.
- Tiêu đề sheet "Bạn bè đang học" + số "{6} bạn" (`label`). Kéo xuống hoặc chạm nền mờ để đóng.

### Checklist duyệt
- [ ] 12 state; `focus`, `short-break`, `waiting`, `ended-summary` ở cả hai theme; `waiting · 360`.
- [ ] `waiting` có hành động chính rõ ràng, nhìn thấy không cần cuộn ở khung 360.
- [ ] Không có nút Mic/Camera (Solo không có voice).

---

## S-STUDY-03 · Thống kê (P1)

**Mục đích:** nhìn lại tiến độ theo tuần / tháng và từng phiên, không gây cảm giác tội lỗi. **REQ:** STUDY-03/15/17 (REQ-STUDY-17 mới ở v1.9, CR-23). **Mở từ:** khối "Tuần này" ở S-STUDY-01 (mở ở Tuần, kỳ hiện tại); tổng kết Solo. **Đi tới:** back về màn trước. Dòng lịch sử chỉ đọc, không bấm được.

### Bố cục (v1.9, CR-23 — vẽ lại toàn màn)
```
│ ‹ Học        Thống kê                    │  ScreenHeader
│ [ ● Tuần  |  Tháng ]                     │  SegmentedControl rộng hết khung
│ (‹)       12/10 – 18/10           (›)    │  IconButton 48 · nhãn kỳ (headline) · IconButton 48
│ [flame] 6 ngày liên tiếp                 │  stat + đơn vị
│ Dài nhất: 14 ngày                        │  label
│ Hôm nay 45 phút · đã đủ 15 phút          │  TodayProgress
│ █████████████████████████████████████    │
│ TUẦN NÀY                                 │  tiêu đề nhóm (label, chữ hoa)
│ 4 giờ 35 phút                            │  stat
│ +2 giờ 40 phút so với tuần trước         │  label, text-secondary
│ Trung bình 39 phút / ngày                │  label, text-secondary
│ ▁ ▅ ▄ ▃ ▆ ▄ █   (cột theo ngày, có số)   │  biểu đồ tuần (S-STUDY-01 › Biểu đồ tuần)
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ 15 phút        │  vạch 15 phút
│ T2 T3 T4 T5 T6 T7 CN                     │
│ Phòng học 3 giờ 20 phút · Một mình 1 giờ 15 phút │  label
│ ■ ■ ■ ■ ■ ■ □  (4 tuần, mỗi ô một ngày)  │  lưới 4 tuần — chỉ ở Tuần
│ Từ trước tới nay 86 giờ                  │  body
│ LỊCH SỬ PHIÊN                            │  tiêu đề nhóm
│ [lamp] Phòng học im lặng · Ôn thi Giải tích 2 [Đang học]  31 phút │  SessionRow (56)
│        CN 18/10 · 21:11 – bây giờ        │
│ [timer] Học một mình              14 phút │
│        CN 18/10 · 15:20 – 15:34          │
│ …                                        │  cuộn tới cuối tải tiếp 20 dòng
```
Cả màn cuộn dưới `ScreenHeader`. Thứ tự từ trên xuống (CR-23 #6): chọn kỳ → chuỗi + dài nhất → tiến độ hôm nay → con số của kỳ → biểu đồ / lịch tháng + "Phòng học … · Một mình …" → lưới 4 tuần (chỉ Tuần) → từ trước tới nay → lịch sử phiên.

**Tháng** thay biểu đồ bằng lịch tháng (`MonthCalendar`), bỏ lưới 4 tuần:
```
│ [ Tuần  |  ● Tháng ]                     │
│ (‹)       Tháng 10/2026           (›)    │
│ … chuỗi, tiến độ hôm nay như Tuần …      │
│ THÁNG 10/2026                            │
│ 8 giờ 25 phút                            │
│ −45 phút so với tháng trước              │
│ Trung bình 28 phút / ngày                │
│ Tháng 10/2026 · 8 giờ 25 phút            │  tiêu đề lịch
│ T2  T3  T4  T5  T6  T7  CN               │
│             ┌1─┐┌2─┐┌3─┐┌4─┐            │  ô ≈ 46 × 52 ở 390, cách 4
│             │30││— ││45││40│            │
│ …5 hàng tuần (5/10 … 31/10)…             │
│ Phòng học 6 giờ 10 phút · Một mình 2 giờ 15 phút │
│ Từ trước tới nay 86 giờ                  │
│ LỊCH SỬ PHIÊN …                          │
```

### Component
`ScreenHeader`, `SegmentedControl`, `IconButton`, `TodayProgress`, `MonthCalendar`, `SessionRow`, `EmptyState`, `Skeleton`, `Banner`, `Button · text`. Ô lưới 4 tuần: đặc `primary` = Qualified Day; rỗng viền `border-input` = chưa đủ; hôm nay có viền `text-primary`; ngày tương lai để trống không viền. Phân biệt bằng **đặc/rỗng**, không chỉ bằng màu. Cấu tạo ô lịch tháng và hàng lịch sử: 00-components › `MonthCalendar`, `SessionRow`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Header | "Thống kê" |
| Chọn kỳ | "Tuần" · "Tháng"; nhãn kỳ "12/10 – 18/10" / "Tháng 10/2026"; kỳ không nằm trọn trong năm nay thì ghi năm: "29/12/2025 – 04/01/2026" / "Tháng 12/2025". Nhấn giữ "‹" khi tắt: "Chưa có dữ liệu trước kỳ này" |
| Chuỗi | "{6} ngày liên tiếp" · "Dài nhất: {14} ngày" |
| Tiến độ hôm nay | như S-STUDY-01 (`TodayProgress`) — luôn là số hôm nay, không theo kỳ |
| Tiêu đề kỳ | "TUẦN NÀY" / "TUẦN 05/10 – 11/10" / "THÁNG 10/2026" (cả tháng hiện tại lẫn tháng đã qua) |
| Tổng kỳ | "{4} giờ {35} phút" (`stat`; < 60 phút: "{45} phút"; 0: "0 phút") |
| So sánh | "+2 giờ 40 phút so với tuần trước" / "−45 phút so với tháng trước" (dấu trừ "−", không mũi tên, không màu đỏ / xanh) · "Tuần trước chưa học" / "Tháng trước chưa học" · "Bằng tuần trước" / "Bằng tháng trước". Nhấn giữ dòng khi kỳ đang chạy dở: "Tính tới cùng ngày của kỳ trước" |
| Trung bình | "Trung bình {39} phút / ngày"; từ 60 phút: "Trung bình 1 giờ 40 phút / ngày" |
| Tách loại | "Phòng học {3} giờ {20} phút · Một mình {1} giờ {15} phút" |
| Lịch tháng | Tiêu đề "Tháng 10/2026 · 8 giờ 25 phút"; hàng thứ "T2 … CN"; ô: số ngày + số phút (0 phút: "—") |
| Từ trước tới nay | "Từ trước tới nay {86} giờ" (< 10 giờ: "8 giờ 25 phút"; từ 10 giờ chỉ giờ, làm tròn xuống) |
| Lịch sử | Tiêu đề "LỊCH SỬ PHIÊN"; dòng 1 "{Phòng học im lặng} · {Ôn thi Giải tích 2}" / "Học một mình" + phút bên phải ("31 phút", "1 giờ 5 phút", "dưới 1 phút"); dòng 2 "{T7 17/10} · {20:00 – 20:50}" (+ "· vào {2} lần"); nhãn "Đang học" + "21:11 – bây giờ" cho phiên đang chạy. Trống: "Chưa có phiên nào trong kỳ này". Lỗi: "Không tải được lịch sử phiên" + "Thử lại" |
| Offline, kỳ chưa tải | "Cần kết nối mạng để xem kỳ này" |

### Thể hiện kỳ và lịch sử (v1.9, CR-23)
Hành vi (kỳ nào áp cho phần nào, so sánh với khoảng nào, cách tính trung bình, luật gộp / tách dòng lịch sử, tên phòng theo quyền hiện tại, phân trang): REQ-STUDY-17. Ở đây chỉ ghi cách hiện.
- Ba số luôn là hiện tại, không đổi theo kỳ: chuỗi (+ dài nhất), tiến độ hôm nay, từ trước tới nay — đứng ngoài nhóm "TUẦN …" / "THÁNG …" để không bị đọc là số của kỳ.
- Nút kỳ tắt: `IconButton` `disabled` (không ẩn), nhấn giữ "‹" hiện tooltip "Chưa có dữ liệu trước kỳ này".
- Dòng so sánh và trung bình: `label` `text-secondary`, mỗi dòng một ý; ẩn dòng so sánh thì trung bình dồn lên.
- Lịch tháng: đủ 15 phút nền `primary` chữ `on-primary`; chưa đủ viền `border-input`; hôm nay viền 2 `text-primary`; ngày tương lai chỉ số ngày, không viền, không số phút; ngày ngoài tháng không có ô.
- Lưới 4 tuần: chỉ ở Tuần, kết thúc ở tuần đang xem.
- Lịch sử: `SessionRow` 56; icon `lamp-desk` cho phiên chung (kể cả "Phòng đã bị xóa · …", "Một phòng của …", "Phòng học"), `timer` cho Học một mình; dòng 2 nối thêm "· vào 2 lần" / "(40 phút tính cho tuần sau)" và cắt "…" ở cuối nếu thiếu chỗ (giờ không bị cắt). Đang tải thêm: `Skeleton` 2 hàng ở cuối danh sách.

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `default` | Như bố cục, Tuần, kỳ 12/10–18/10 lúc 21:47 CN (số: Quy ước › Thống kê mẫu); "›" tắt. Lịch sử: Phòng học im lặng · Ôn thi Giải tích 2 — "Đang học" · CN 18/10 · 21:11 – bây giờ · 31 phút → Học một mình · CN 18/10 · 15:20 – 15:34 · 14 phút → Phòng học im lặng · Ôn thi Giải tích 2 · T7 17/10 · 20:00 – 20:50 · 45 phút → Phòng thảo luận nhóm · Nhóm đồ án Mobile · T6 16/10 · 19:30 – 20:40 · 1 giờ → (dưới mép) Học một mình · T5 15/10 · 35 phút; Phòng ôn tập 2 · Ôn thi Giải tích 2 · T4 14/10 · 40 phút; Phòng ôn tập 2 · T3 13/10 · 24 phút; Học một mình · T3 13/10 · 26 phút | "TUẦN NÀY" · "4 giờ 35 phút" · "+2 giờ 40 phút so với tuần trước" · "Trung bình 39 phút / ngày" · "Từ trước tới nay 86 giờ" |
| `streak-milestone` | Mốc 7 / 30 / 100 ngày: khối chúc mừng trên cùng (dưới chọn kỳ) với Runtime happy 120; tuần này T2 20 phút, tổng 4 giờ 55 phút; tuần trước CN 11/10 chỉ 10 phút (để chuỗi đúng 7) nên tuần trước 1 giờ 50 phút | "7 ngày liên tiếp — giữ nhịp tốt lắm" · "+3 giờ 5 phút so với tuần trước" · "Trung bình 42 phút / ngày" |
| `empty` | Chưa từng học: chọn kỳ còn nhưng "‹" và "›" đều tắt; dưới đó chỉ `EmptyState` Runtime neutral — không chuỗi, không thanh tiến độ, không con số, không lịch sử | "Chưa có phút học nào" · `secondary` "Bắt đầu Tập trung 25 phút" |
| `streak-zero` | Số "0", dòng trung tính, không mascot; tuần T2 0 · T3 50 · T4 40 · T5 35 · T6 60 · T7 10 · CN 0 = 3 giờ 15 phút; thanh "Hôm nay 0 / 15 phút" rỗng; lịch sử không có dòng CN | "Học 15 phút hôm nay để bắt đầu chuỗi mới · Dài nhất: 14 ngày" ("14 ngày" không bị tách dòng) · "+1 giờ 20 phút so với tuần trước" · "Trung bình 27 phút / ngày" |
| `previous-week` 🆕 | Bấm "‹" một lần: kỳ 05/10–11/10, "‹" và "›" đều bật; chuỗi và tiến độ hôm nay vẫn là số hiện tại; biểu đồ tuần đó, **không** có cột hôm nay (không cột `primary`); lưới 4 tuần kết thúc ở 5/10–11/10. Lịch sử: Học một mình · CN 11/10 · 16:00 – 16:15 · 15 phút → Phòng học im lặng · Ôn thi Giải tích 2 · T7 10/10 · 19:00 – 19:45 · vào 2 lần · 30 phút → Học một mình · T6 09/10 · 22:02 – 22:03 · dưới 1 phút → Học một mình · T6 09/10 · 18:00 – 18:10 · 10 phút → … | "TUẦN 05/10 – 11/10" · "1 giờ 55 phút" · "−45 phút so với tuần trước" · "Trung bình 16 phút / ngày" · "Phòng học 1 giờ 10 phút · Một mình 45 phút" |
| `month` 🆕 | Chọn "Tháng": "Tháng 10/2026", "›" tắt; lịch tháng (bố cục thứ hai) với số từng ngày theo Thống kê mẫu, 19–31/10 chỉ số ngày; ô 18 viền 2 `text-primary`; không lưới 4 tuần; lịch sử của cả tháng (đầu danh sách như `default`) | "THÁNG 10/2026" · "8 giờ 25 phút" · "−45 phút so với tháng trước" · "Trung bình 28 phút / ngày" · "Tháng 10/2026 · 8 giờ 25 phút" · "Phòng học 6 giờ 10 phút · Một mình 2 giờ 15 phút" |
| `history-loading` 🆕 | Màn cuộn xuống tới "LỊCH SỬ PHIÊN" (Tuần hiện tại): phần trên đã có số, dưới tiêu đề là `Skeleton` 2 hàng cao 56. Cùng 2 hàng này khi cuộn tới cuối để tải tiếp | — |
| `history-error` 🆕 | Như `history-loading` nhưng tải lỗi: dưới tiêu đề là dòng chữ + `Button · text · S`; phần thống kê phía trên vẫn đủ | "Không tải được lịch sử phiên" · "Thử lại" |
| `offline` 🆕 | `Banner · offline` ngay dưới `ScreenHeader`. Đang xem kỳ đã tải: như thường. Frame vẽ kỳ **chưa tải** (bấm "‹" tới "28/09 – 04/10"): chuỗi, tiến độ hôm nay, từ trước tới nay hiện bản cache; phần con số của kỳ, biểu đồ, lưới, lịch sử thay bằng `EmptyState · inline` (không mascot) | "Cần kết nối mạng để xem kỳ này" |

### Checklist duyệt
- [ ] 9 state; `default`, `month` ở cả hai theme; `month · 360` (ô lịch ≈ 43 × 52, số "60" không tràn ô, dòng lịch sử cắt tên phòng trước số phút).
- [ ] Ô ngày (lưới 4 tuần, lịch tháng) đọc được khi chụp đen trắng; tổng các cột khớp tổng tuần; lịch tháng cộng lại khớp "8 giờ 25 phút".
- [ ] Dòng so sánh chỉ có dấu + / −, không màu, không mũi tên.
- [ ] Lịch sử khớp biểu đồ: cộng theo ngày = cột của ngày; cộng theo loại = "Phòng học … · Một mình …".
- [ ] Không mascot ở `streak-zero`, `offline`, lịch sử.

---

## S-STUDY-06 · Đang học lúc này — tất cả phòng

**Mục đích:** xem đủ mọi phòng đang học khi có hơn 3 phòng. **REQ:** SRS 3.1 (Tab Học). **Mở từ:** "Xem tất cả ({N})" ở S-STUDY-01. **Đi tới:** S-ROOM-02 `not-joined` (chạm hàng), S-ROOM-02 (chạm "Vào"; đang Solo thì S-ROOM-06).

### Bố cục
```
┌ Status bar ──────────────────────────────┐
│ ‹ Học        Đang học lúc này            │  header 56: IconButton back + headline
│ 5 phòng                                  │  label, text-secondary
│ [lamp] Tập trung · còn 18 phút           │  cùng kiểu hàng phòng với S-STUDY-01
│ Phòng học im lặng            [Bạn ở đây] │
│ (B)(C) Bình, Chi và 6 người · Ôn thi GT2 │
│ ──────────────────────────────────────── │
│ … (mọi phòng, cuộn được)                 │
├ MiniPlayer (khi đang trong phòng/Solo) ──┤
├ TabBar (Học) ────────────────────────────┤
```
- Cùng hàng, cùng thứ tự và cùng luật ổn định thứ tự với S-STUDY-01 (mục "Sắp xếp"); không giới hạn số hàng, **không chia nhóm theo server**.
- Kéo xuống để làm mới (xếp lại thứ tự).

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `default` | Như bố cục, 5 phòng theo thứ tự ví dụ ở S-STUDY-01 › Sắp xếp; pha, số phút còn lại và người của từng phòng giống hệt S-STUDY-01 (`default` / `many-rooms`) cùng lúc 21:47 | |
| `all-ended` | Mọi phòng hết phiên khi đang xem: `EmptyState · inline` (không mascot) | "Không còn phòng nào đang học" · nút `secondary` "Về tab Học" |

### Checklist duyệt
- [ ] 2 state; `default` ở cả hai theme; thứ tự khớp ví dụ ở S-STUDY-01 › Sắp xếp.

---

## S-STUDY-04 · Leaderboard server (P3) và S-STUDY-05 · Study Event (P3)

Đặc tả khi làm khu vực P3 (REQ-STUDY-04, REQ-STUDY-12). Đã biết: leaderboard mặc định tắt, có "Ẩn tôi khỏi bảng xếp hạng"; sự kiện có "Quan tâm", tự bắt đầu phiên học, nhắc 15 phút trước.

---

## Edge case (rà ngày 17/10/2026)

Frame nằm trong nhóm "04 · Tab Học — Edge case", tên `S-STUDY-EDGE · <tình huống>` (17 frame từ v1.9). Khi rà đã sửa thêm: lưới `S-STUDY-03 · streak-zero` lệch biểu đồ (T3–T6 ≥ 15 phút phải là ô đặc); `Banner` có thêm ô hành động (`mic-denied`: "Mở cài đặt" tách khỏi câu). Hàng "‹ Tuần trước / Tuần sau ›" của S-STUDY-03 đã bỏ ở v1.9 (CR-23), thay bằng chọn kỳ "Tuần | Tháng" + "‹ 12/10 – 18/10 ›".

### Có frame

| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `room-ended-on-join` — bấm "Vào" đúng lúc phiên học của phòng vừa hết | Vào phòng như phòng chưa có phiên (S-ROOM-01 `study-room-idle`); `Toast` icon `timer-off` "Phiên học vừa kết thúc lúc 21:46". Đang Solo: **không** hỏi S-ROOM-06, Solo vẫn chạy, toast thêm "· bạn vẫn đang học một mình" | STUDY-01, STUDY-10 |
| `lost-access` — vừa mất quyền vào phòng (bị kick khỏi server, đổi quyền) khi đang xem tab Học | Bấm "Vào" → `Toast` icon `lock` "Bạn không còn quyền vào Phòng thảo luận nhóm"; hàng đó biến mất, "2 phòng". Bị kick khỏi server → mọi hàng của server đó biến mất | SRS 3.1, ROLE-05 |
| `stopped-other-device` — cùng tài khoản bấm Dừng Solo ở máy khác | Máy này chuyển sang `ended-summary` (vẫn Runtime happy, số phút của cả phiên, chuỗi 6 ngày) + dòng icon `smartphone` "Đã dừng trên thiết bị khác lúc 21:46" | STUDY-10 (1 Focus Session/user) |
| `notif-denied` — quyền thông báo của hệ điều hành bị tắt khi đang Solo | `Banner` trung tính icon `bell-off` dưới header: "Thông báo đang tắt · bạn sẽ không biết lúc hết giờ nghỉ" + hành động "Bật thông báo" (→ cài đặt hệ điều hành). Có banner này thì ẩn dòng `exact-alarm-off` (vô nghĩa khi không có thông báo) | STUDY-10 AC1, NFR-MOB |
| `too-short` — bấm Dừng khi chưa đủ 1 phút Tập trung | Tổng kết **không mascot**, không dòng streak: "Chưa đủ 1 phút nên chưa có phút nào được ghi" · nút "Học lại" (`secondary`) · "Xong" (`primary`); khối chữ và hai nút đứng liền nhau ở giữa màn hình, không để trống nửa màn | DEC-24 (làm tròn xuống) |
| `long-session` — phiên rất dài, chạm trần ngày | Tổng kết "Bạn đã tập trung 6 giờ 40 phút" + dòng `text-secondary` "Hôm nay đã đủ 16 giờ, mức tối đa được ghi trong một ngày"; chuỗi 6 ngày | STUDY-15 (4) |
| `many-friends` / `many-friends-sheet` — rất nhiều bạn đang học | Dòng bạn bè: 3 avatar + "+21" · "24 bạn đang học lúc này"; sheet "Bạn bè đang học" cao tối đa 85% màn hình, danh sách cuộn (hàng cuối bị cắt). Các hàng thấy được dùng người trong bộ mẫu, đúng phòng của họ: Bình, Chi, Dũng, Lan (Phòng học im lặng) → Minh, Nam (Phòng ôn tập 2) → Tuấn (Phòng thảo luận nhóm) → Phúc (Phòng luyện đề) → Quân ("Đang học cùng nhóm": ở một phòng An không xem được — không tên phòng, không pha, không nút "Vào"; v1.9, CR-24) → Vũ, Phong (đang học một mình) | 04 › Bạn bè đang học, REQ-AUTH-05 |
| `long-names` — tên phòng, server, bạn bè rất dài | Hàng phòng: tên phòng 1 dòng cắt `…` **trong cột chữ** (không chạy xuống dưới nút "Vào"); dòng người cắt `…` ở cuối (tên server mất trước); tên hiển thị dài của người trong bộ mẫu ("Trần Nguyễn Thanh Bình", "Hoàng Anh Tuấn"); `accessibilityLabel` đọc đủ. Sheet bạn bè cùng luật | C-05 › Chữ dài |
| `streak-huge` / `streak-huge-stats` — chuỗi 412 ngày | Tab Học: "412 ngày liên tiếp" và "4 giờ 55 phút" vẫn chung một hàng (tuần có T2 20 phút vì chuỗi gồm cả T2; An đang trong phòng nên khối Solo tắt như `default`); thanh "Hôm nay 45 phút · đã đủ 15 phút" + vạch 15 phút (v1.9). S-STUDY-03 (bố cục v1.9): "412 ngày liên tiếp" · "Dài nhất: 412 ngày"; tuần như `streak-milestone` (4 giờ 55 phút) nhưng tuần trước đủ 15 phút mọi ngày (T2 20 · T3 15 · T4 25 · T5 15 · T6 15 · T7 30 · CN 15 = 2 giờ 15 phút) → "+2 giờ 40 phút so với tuần trước", "Trung bình 42 phút / ngày"; lưới 4 tuần đặc hết; "Từ trước tới nay 212 giờ" | STUDY-03, STUDY-17 |
| `week-spike` — một ngày học vọt | T4 540 phút, ngày khác 15–40 (mẫu T2 15 · T3 20 · T5 40 · T6 25 · T7 30 · CN 15): cột cao nhất = 540 (cao 54); ngày > 0 cao tối thiểu 4; màu cột: đủ 15 phút `surface-3`, chưa đủ hoặc 0 phút `border`, hôm nay `primary`; số trên cột luôn là phút ("540"). Tổng "11 giờ 25 phút". (v1.9, CR-23) Vạch 15 phút theo cùng thang nên gần sát đáy (≈ 1,5) — vẫn vẽ, vẫn có nhãn "15 phút"; thanh "Hôm nay 15 phút · đã đủ 15 phút"; nếu frame là Thống kê thì theo bố cục mới | STUDY-03 |
| `empty-week` — tuần này chưa học (hôm nay T4 14/10) | Tổng "0 phút", ẩn dòng tách Phòng học / Một mình; cột T2–T4 vạch `border` số "0"; **ngày tương lai T5–CN không cột, không số, nhãn `text-tertiary`**; lưới: ô tương lai để trống không viền; streak 0 không mascot. (v1.9, CR-23) Thang = 15 nên vạch 15 phút ở đỉnh khung; thanh "Hôm nay 0 / 15 phút" rỗng. Thống kê: chọn kỳ "‹ 12/10 – 18/10 ›" ("‹" bật, "›" tắt); "TUẦN NÀY" · "0 phút" · "−45 phút so với tuần trước" (T2–T4 tuần trước: 20 + 0 + 25) · "Trung bình 0 phút / ngày"; lịch sử "Chưa có phiên nào trong kỳ này" | STUDY-03, STUDY-17 |
| `midnight` — phiên 23:30–00:40 | Tổng kết lúc 00:41: "Bạn đã tập trung 1 giờ 10 phút" + dòng "Hôm qua 30 phút · hôm nay 40 phút" + "Chuỗi 7 ngày liên tiếp" (cả hai ngày đều đủ 15 phút) | STUDY-03 AC3 |
| `midnight-history` 🆕 — dòng lịch sử qua nửa đêm | (v1.9, CR-23) Cùng nhánh `midnight` (Solo 23:30 CN – 00:40 T2, An không vào phòng tối CN): Thống kê lúc 00:45 T2 19/10, đã bấm "‹" về 12/10–18/10. CN = 14 phút buổi chiều + 30 phút = 44 phút; tuần 4 giờ 34 phút · "+2 giờ 39 phút so với tuần trước" · "Trung bình 39 phút / ngày" · "Phòng học 2 giờ 49 phút · Một mình 1 giờ 45 phút" (biểu đồ và tách loại chỉ tính 30 phút trước 00:00); chuỗi 7 ngày; "Hôm nay 40 phút · đã đủ 15 phút". Dòng lịch sử đầu: Học một mình · "CN 18/10 · 23:30 – 00:40 (T2) · (40 phút tính cho tuần sau)" · "1 giờ 10 phút"; dòng kế: Học một mình · CN 18/10 · 15:20 – 15:34 · 14 phút | STUDY-03 AC3, STUDY-17 AC4 |
| `history-rules` 🆕 — các luật dòng lịch sử | (v1.9, CR-23) Thống kê, kỳ 05/10–11/10 (như `previous-week`), cuộn tới "LỊCH SỬ PHIÊN", đủ 7 dòng: Học một mình · CN 11/10 · 16:00 – 16:15 · 15 phút → Phòng học im lặng · Ôn thi Giải tích 2 · T7 10/10 · 19:00 – 19:45 · vào 2 lần · 30 phút → Học một mình · T6 09/10 · 22:02 – 22:03 · dưới 1 phút → Học một mình · T6 09/10 · 18:00 – 18:10 · 10 phút → Phòng đã bị xóa · Nhóm đồ án Mobile · T5 08/10 · 20:10 – 20:25 · 15 phút → Một phòng của CLB Guitar PTIT (mất quyền xem kênh) · T4 07/10 · 21:00 – 21:25 · 25 phút → Học một mình · T2 05/10 · 20:00 – 20:20 · 20 phút | STUDY-17 AC3, AC5 |
| `year-boundary` 🆕 — kỳ vắt qua năm | (v1.9, CR-23) Thống kê, Tuần, đã lùi về "‹ 29/12/2025 – 04/01/2026 ›": "TUẦN 29/12/2025 – 04/01/2026" · "3 giờ 10 phút" (T2 30 · T3 0 · T4 30 · T5 20 · T6 45 · T7 40 · CN 25) · "+40 phút so với tuần trước" · "Trung bình 27 phút / ngày"; chuỗi, tiến độ hôm nay, từ trước tới nay là số hiện tại (6 ngày · 45 phút · 86 giờ). Lịch sử: Học một mình · CN 04/01 · 15:00 – 15:25 · 25 phút → Góc học khuya · CLB Guitar PTIT · T7 03/01 · 21:00 – 21:45 · 40 phút → Góc học khuya · CLB Guitar PTIT · T6 02/01 · 20:00 – 20:50 · 45 phút → Học một mình · T4 31/12/2025 · 23:30 – 00:20 (T5) · 50 phút → Học một mình · T2 29/12/2025 · 20:00 – 20:30 · 30 phút. Ngày năm 2026 không ghi năm (năm nay), ngày năm 2025 ghi năm | STUDY-17 |

### Chỉ ghi luật (giao diện không đổi)

| Tình huống | Luật |
|---|---|
| Bỏ qua pha khi Học một mình | Bỏ qua Tập trung → sang Nghỉ (ngắn/dài theo chu kỳ). Bỏ qua Nghỉ → **vào thẳng Tập trung**, không qua `waiting` (user đã chủ động bấm) |
| Học qua 00:00 | Phần trước 00:00 tính cho ngày cũ (STUDY-03 AC3); phiên không bị ngắt; streak tính lại ngay lúc qua ngày |
| Trần 16 giờ/ngày | Phút vượt trần không được ghi (STUDY-15 (4)); đồng hồ vẫn chạy, không chặn user; chỉ báo ở tổng kết (`long-session`) |
| Mở lại app giữa pha | Đồng hồ khôi phục từ backend (STUDY-10 AC3), nhảy thẳng tới pha hiện tại; mở lại sau khi hết 10 phút chờ → thẳng `ended-expired` |
| Đổi timezone | Tối đa 1 lần/24h (STUDY-03); không có giao diện riêng trong tab Học |
| Chuyển pha khi đang mở sheet "Sửa chu kỳ" | Sheet giữ nguyên; "từ vòng sau" tính theo vòng mới |
| Chọn kỳ ở S-STUDY-03 (v1.9, CR-23) | Theo REQ-STUDY-17 và S-STUDY-03 › Thể hiện kỳ và lịch sử: "›" tắt ở kỳ hiện tại, "‹" tắt ở kỳ đầu tiên có dữ liệu; đổi Tuần ↔ Tháng giữ ngày đang xem; không khoảng ngày tự chọn, không xem theo năm |
| Qua nửa đêm khi đang mở Thống kê (v1.9, CR-23) | Giữ kỳ đang xem (kể cả khi kỳ hiện tại đổi sang tuần / tháng mới: "›" bật lại); chuỗi và tiến độ hôm nay tính lại ngay ("Hôm nay 0 / 15 phút") |

## Câu hỏi còn mở

Không còn.
