# 06 · Thông báo

Tab Thông báo: hộp thư trong app gom mọi việc cần user để ý mà không nằm sẵn trong một kênh — ai nhắc tới mình, ai trả lời mình, ai muốn kết bạn, ai giao việc cho mình, cuộc gọi nhỡ, việc sắp tới hạn, báo cáo đã được xem xét.

- Hành vi: SRS v1.9 Mục 3.1 (Tab Thông báo), 3.5, 5.4 (`NOTIFICATION_CREATE`, `NOTIFICATION_READ`, `NOTIFICATION_DELETE`), 7.3.2, bảng `notifications` (Mục 9), REQ-NOTIF-01, REQ-NOTIF-02, REQ-NOTIF-05, REQ-MSG-03, REQ-FRIEND-01/02, REQ-DMVC-03, REQ-STUDY-06 (giao việc, nhắc hạn), REQ-ROLE-05 (`moderation`), REQ-SAFE-01 (`report_reviewed`, `reports_pending`), DEC-34, DEC-36.
- Component: [00-components.md](00-components.md) — `NotificationRow` (C-31, mới), `TabBar` (C-03), `Avatar` / `Badge` (C-13), `EmptyState` / `Skeleton` / `Toast` / `Banner` (C-14), `Button` (C-01). Nhìn thế nào: [DESIGN.md](../../../DESIGN.md) (chế độ **Operate**).
- Hành vi chốt 20/10/2026 khi viết spec này (19 câu, chủ dự án đồng ý cả 19): chỉ 5 loại ở MVP (+ `task_unassigned`); đọc trong kênh = đọc trong hộp thư; đồng bộ đã đọc qua `NOTIFICATION_READ`; @everyone / @here / @role có mục, DM không; nút kết bạn trên hàng; cuộc gọi nhỡ mở DM, không nút gọi lại; nguồn biến mất thì mục ẩn; mới nhất trên cùng, không gộp, không xếp lại dưới ngón tay; chưa đọc = chấm + chữ đậm; "Đọc hết" + ⚙; không xóa / lọc / đánh dấu chưa đọc; giữ 90 ngày; badge mẫu 4; không mascot; mở mention → S-HOME-01 `from-notification`; offline: đọc vào outbox, trả lời lời mời cần mạng; banner quyền thông báo không đóng được. Phần là hành vi mới ghi ở `SRS_v1.2_change_notes.md` mục 10 (CR-05, đã áp vào SRS v1.6 ngày 21/10/2026).
- **(v1.9, 30/10/2026)** Một mục cho mỗi tin liên quan tới mình (CR-12); nhãn "Tạm khóa", mục đổi thời hạn, Toast "Bạn không còn ở {Server}" (CR-17); `report_reviewed`, `reports_pending` (CR-18); dòng phụ "đã rút khỏi việc" (CR-20); `task_assigned`, `friend_accepted`, xóa việc thì mục biến mất, đọc ở hộp thư không đọc tin trong kênh, nhắc hạn ghi "Còn 24 giờ tới hạn" (CR-21); lời nhắn của lời mời kết bạn (CR-25). Bỏ hai luật cũ: "không ghi 'Còn N giờ'" và "việc bị xóa thì mục nhắc hạn giữ chữ".
- Nhãn UI: tab "Thông báo", tiêu đề "Thông báo".

## Quy ước chung của khu vực

| Hạng mục | Quy ước |
|---|---|
| Khung | 390 × 844; kiểm thêm 360 × 800 cho `default` (hàng có chữ dài nhất và nút kết bạn) |
| Vị trí | S-NOTI-01 là màn gốc của tab **Thông báo** (`TabBar`, Thông báo đang chọn; tiêu đề `title-1` trong thân, không header — giống tab Học, tab Việc). Không có màn con: chạm một mục là đi sang màn đích của area khác |
| Loại thông báo ở MVP | (v1.9 — một danh sách duy nhất cho `notifications.type`, REQ-NOTIF-05) `mention`, `reply`, `friend_request`, `friend_accepted`, `task_assigned`, `task_reminder`, `task_unassigned`, `missed_call`, `owner_transferred`, `moderation`, `report_reviewed`, `reports_pending`, (v1.10, CR-27) `profile_reset`, `server_removed`. **Không** có Study Event sắp bắt đầu (REQ-STUDY-12 là v1.x) và mời vào phòng học (Backlog, DEC-36). **Tin liên quan tới mình** (CR-12: mention có hiệu lực tới mình, hoặc trả lời một tin của mình) trong server tạo **một** mục: `mention` khi có mention có hiệu lực (kể cả tin vừa trả lời vừa nhắc tới An), `reply` khi chỉ trả lời; tự trả lời tin của mình không tạo mục. Mention / reply trong DM và Group DM **không** vào hộp thư (đã có badge 💬). Tên người trong tin nhắc hạn của kênh không phải mention (không có mục) |
| Push | Có push: `mention`, `reply`, `friend_request`, `task_assigned`, `task_reminder`, `missed_call`, `owner_transferred` (REQ-NOTIF-02). **Không** push: `task_unassigned`, `friend_accepted`, `moderation`, `report_reviewed`, `reports_pending`, `profile_reset`, `server_removed` |
| Badge tab Thông báo | Số thông báo **chưa đọc** (C-03, NOTIF-05); 1–99, "99+"; 0 thì ẩn. Badge các tab khác giữ như mọi area: Home "3" (2 mention ở Nhóm đồ án Mobile + 1 DM, 02), Việc "3" (05) — từ 20/10/2026 badge Home nằm trong master `TabBar` nên hiện ở mọi tab, không chỉ khi đang ở tab Home |
| Thời gian | Nhóm theo ngày của timezone user: "HÔM NAY" / "HÔM QUA" / "TRƯỚC ĐÓ". Giờ gửi luôn ở **góc trên phải**, cùng dòng tiêu đề, căn phải (chốt 20/10/2026 khi duyệt — trước đó giờ nằm cuối dòng meta nên trôi theo độ dài tên server): hôm nay và hôm qua `HH:mm`; trước đó `dd/MM` ("16/10"), khác năm `dd/MM/yyyy`. **Ngày giờ trong nội dung mục** (v1.9, CR-21 #4): luôn kiểu tuyệt đối "ngày · giờ" — "Hạn 18/10 · 21:00" (năm khi khác năm: "Hạn 05/01/2027 · 09:00"); không dùng "Hôm nay" / "Ngày mai" vì chữ của mục đứng yên từ lúc tạo |
| Chưa đọc | Chấm 8 `primary` ngay dưới giờ gửi (cùng cột phải) + tiêu đề đậm 600. Đã đọc: tiêu đề 400, không chấm. Không đổi nền hàng (phân biệt được không cần màu: có chấm và chữ đậm) |
| Màu ngữ nghĩa | `danger` chỉ cho icon cuộc gọi nhỡ trên avatar; không dùng màu pha |
| Mascot | **Không**, kể cả `empty` (DESIGN.md › Mascot: không bao giờ ở notification; nhất quán với tab Việc) |
| Toast | Trên `TabBar` (hoặc trên `MiniPlayer` khi có) |
| Dữ liệu nhất quán | Badge tab = số mục chưa đọc trong danh sách. (v1.9, CR-21 #3) Mục `mention` / `reply` **chưa đọc ⇒** tin đó chưa đọc trong kênh (đọc ở kênh thì mục tự thành đã đọc, CR-05); **chiều ngược lại không bắt buộc**: đọc ở hộp thư không đọc tin trong kênh. 2 mention chưa đọc ở "Nhóm đồ án Mobile" khớp badge mention "2" của server này trên rail ở 02. Tin "@An tối nay 20:30…" của Bình ở `#hoi-dap` đã đọc (An đã trả lời lúc 20:11 ở S-HOME-01). Nhắc hạn đúng mốc 24 giờ và 2 giờ trước hạn của việc ở 05; không nhắc việc đã xong. Mỗi dòng Lịch sử "{Tên} đã thêm bạn" trong 90 ngày ở 05 có một mục `task_assigned` (mẫu: "Bình giao cho bạn: Nộp báo cáo giữa kỳ" · "Hạn 20/10 · 23:59" hôm qua 21:40, đã đọc — khớp S-TASK-02 `history`; hạn trên mục là hạn **lúc giao**, sau đó Bình đổi sang 23/10). An là Owner của Ôn thi Giải tích 2 nên có mục `reports_pending` mỗi đợt hàng đợi báo cáo đi từ trống thành có (khớp 08 S-SET-05: hồ sơ của Nam 19:40 mở đợt hiện tại; đợt 16/10 mở bởi báo cáo tin của Phúc 15:40). Bây giờ **20:12, Chủ Nhật 18/10/2026** (cùng mốc với 02, 05, 08) |
| Dữ liệu mẫu | Xem bảng dưới. Chưa đọc: **4** (badge "4") |

### Hộp thư mẫu của An (`default`)

| Nhóm | Giờ | Loại | Nội dung | Đọc |
|---|---|---|---|---|
| HÔM NAY | 20:01 | mention | Chi nhắc tới bạn · "@An thứ 4 họp nhóm lúc 9h ở thư viện nhé" · `#viec-nhom · Nhóm đồ án Mobile` | ● |
| | 19:52 | mention | Dũng nhắc tới bạn · "@An mình đẩy code sửa lỗi đăng nhập lên rồi, review giúp mình nhé" · `#viec-nhom · Nhóm đồ án Mobile` | ● |
| | 19:48 | friend_request | Giang muốn kết bạn · lời nhắn "Mình là Giang lớp K22, xin vào nhóm ôn cùng nhé" · `giang.vo` · nút "Chấp nhận" / "Từ chối" | ● |
| | 19:00 | task_reminder (2 giờ trước hạn) | Còn 2 giờ tới hạn: Đọc tài liệu chương 5 · Hạn 18/10 · 21:00 · `#viec-nhom · Ôn thi Giải tích 2` | ● |
| | 20:10 | mention | Bình nhắc tới bạn · "@An tối nay 20:30 vào Phòng học im lặng ôn tiếp nhé" · `#hoi-dap · Ôn thi Giải tích 2` | đã đọc |
| | 19:40 | reports_pending | Có báo cáo mới cần xem ở Ôn thi Giải tích 2 · nguồn `Ôn thi Giải tích 2` | đã đọc |
| | 15:20 | reply | Chi trả lời bạn · "Slide chương 4 ở đây nhé, có cả bài tập" · `#tai-lieu · Ôn thi Giải tích 2` | đã đọc |
| HÔM QUA | 23:00 | task_reminder (24 giờ) | Còn 24 giờ tới hạn: Ôn chương 4 — tích phân bội · Hạn 18/10 · 23:00 · `#viec-nhom · Ôn thi Giải tích 2` | đã đọc |
| | 21:40 | task_assigned | Bình giao cho bạn: Nộp báo cáo giữa kỳ · Hạn 20/10 · 23:59 · `#viec-nhom · Ôn thi Giải tích 2` | đã đọc |
| | 21:00 | task_reminder (24 giờ) | Còn 24 giờ tới hạn: Đọc tài liệu chương 5 · Hạn 18/10 · 21:00 · `#viec-nhom · Ôn thi Giải tích 2` | đã đọc |
| | 16:45 | missed_call | Cuộc gọi nhỡ từ Bình · Cuộc gọi thoại | đã đọc |
| TRƯỚC ĐÓ | 16/10 (21:59) | task_reminder (2 giờ) | Còn 2 giờ tới hạn: Sửa lỗi đăng nhập · Hạn 16/10 · 23:59 · `#viec-nhom · Nhóm đồ án Mobile` | đã đọc |
| | 16/10 (15:40) | reports_pending | Có báo cáo mới cần xem ở Ôn thi Giải tích 2 · nguồn `Ôn thi Giải tích 2` | đã đọc |

Danh sách xếp **mới nhất trên cùng** theo thời điểm tạo; bảng trên ghi theo nhóm nên mục 20:10 (đã đọc) nằm trên mục 20:01 khi vẽ. Thứ tự vẽ trong HÔM NAY: 20:10 Bình · 20:01 Chi · 19:52 Dũng · 19:48 Giang · 19:40 báo cáo · 19:00 nhắc hạn · 15:20 Chi. HÔM NAY có 7 hàng nên khung 844 dừng trong HÔM NAY; nhóm HÔM QUA (có mục `task_assigned`) thấy ở `new-arrived` (frame đã cuộn xuống HÔM QUA). Lời nhắn của Giang khớp 09 S-DM-04 `pending` (hàng lời mời đến).

---

## S-NOTI-01 · Thông báo

**Mục đích:** thấy ngay điều gì cần mình phản hồi, chạm một lần là tới đúng chỗ.
**REQ:** NOTIF-05 (AC1–AC12), NOTIF-01, NOTIF-02 (banner khi bị từ chối quyền), SRS 3.1, 3.5.
**Mở từ:** `TabBar` › Thông báo; "Xem" trên Toast "Bạn không còn ở {Server}" (02 S-HOME-EDGE `removed-while-offline`, CR-17 #15 — mở tab ở đầu danh sách, không tự đánh dấu đã đọc). **Đi tới:** S-HOME-01 `from-notification` (mention / reply ở kênh text, cuộn tới tin); S-HOME-08 (mention trong chat phòng voice); S-TASK-02 với dữ liệu hiện tại (`task_assigned`, `task_reminder`, `task_unassigned`; mình đã bị gỡ khỏi việc → dạng người chỉ xem; mất quyền hoặc Task Board của kênh đang tắt → `lost-access`); S-DM-02 DM 1-1 với người gọi (cuộc gọi nhỡ, area 09); S-HOME-10 ngữ cảnh ngoài server (`outside-server`, CR-25) của người gửi lời mời (chạm vào phần thân hàng kết bạn) hoặc của người đã chấp nhận (`friend_accepted`, quan hệ Bạn bè); S-DM-02 ("Nhắn tin" trên `friend_accepted` / lời mời đã chấp nhận); S-HOME-01 ở cuối kênh (`report_reviewed` về tin trong server); 08 S-SET-05 `pending` (`reports_pending`); 08 S-SET-01 (`owner_transferred`); cài đặt hệ điều hành ("Mở cài đặt" trên banner); S-ME-05 (⚙, area 07).

### Bố cục
```
┌ Status bar ──────────────────────────────┐
│ Thông báo                   Đọc hết  [⚙] │  title-1 · Button·text · IconButton
│ HÔM NAY                                  │  tiêu đề nhóm, label 600
│ (B)@ Bình nhắc tới bạn            20:10  │  tiêu đề body (≤ 2 dòng) · giờ gửi góc phải
│      @An tối nay 20:30 vào Phòng học im  │  nội dung body-sm, ≤ 2 dòng, cắt …
│      lặng ôn tiếp nhé                    │
│      #hoi-dap · Ôn thi Giải tích 2       │  nguồn label text-tertiary, 1 dòng
│ (C)@ Chi nhắc tới bạn             20:01  │  chưa đọc: tiêu đề 600
│      @An thứ 4 họp nhóm lúc 9h ở…    ●   │  chấm primary ngay dưới giờ
│      #viec-nhom · Nhóm đồ án Mobile      │
│ (D)@ Dũng nhắc tới bạn            19:52  │
│ (G)+ Giang muốn kết bạn           19:48  │  friend_request
│      Mình là Giang lớp K22, xin vào  ●   │  lời nhắn (CR-25), ≤ 2 dòng, cắt …
│      nhóm ôn cùng nhé                    │
│      giang.vo                            │  nguồn = username
│      [ Chấp nhận ]  [ Từ chối ]          │  Button·primary·S + Button·secondary·S
│ [⚑] Có báo cáo mới cần xem ở Ôn   19:40  │  reports_pending: ô icon flag
│      thi Giải tích 2                     │
│      Ôn thi Giải tích 2                  │
│ [⏰] Còn 2 giờ tới hạn: Đọc tài   19:00  │  task_reminder: ô icon thay avatar
│      liệu chương 5                   ●   │
│      Hạn 18/10 · 21:00                   │
│      #viec-nhom · Ôn thi Giải tích 2     │
│ (C)↩ Chi trả lời bạn              15:20  │  reply
│ HÔM QUA                                  │  (dưới mép khung)
│ …                                        │
├ TabBar (Thông báo ④) ────────────────────┤
```

### Component
`NotificationRow` (C-31, mới), tiêu đề nhóm (như tiêu đề nhóm của S-TASK-01), `Button · text` "Đọc hết", `IconButton` `settings`, `Banner · offline` / `push-denied`, `EmptyState · inline`, `Skeleton`, `Toast`, `TabBar`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Thông báo" |
| Hành động | "Đọc hết" (chỉ hiện khi có mục chưa đọc) · ⚙ (`accessibilityLabel` "Cài đặt thông báo") |
| Nhóm | "HÔM NAY" · "HÔM QUA" · "TRƯỚC ĐÓ" |
| `mention` | "{Tên} nhắc tới bạn" · @everyone / @here / @role: "{Tên} nhắc tới @everyone" · preview tin (2 dòng, cắt `…`) · nguồn "#{kênh} · {Server}" (kênh voice: "🔊 {phòng} · {Server}"). Tên kênh nằm ở dòng nguồn để không bao giờ bị ngắt giữa chữ (sửa 20/10/2026 khi vẽ: "#viec-nhom" bị ngắt ở dấu gạch nối). Tin vừa trả lời vừa nhắc tới An: một mục loại này |
| `reply` | "{Tên} trả lời bạn" · preview tin trả lời · nguồn "#{kênh} · {Server}" |
| `friend_request` | "{Tên} muốn kết bạn" · nội dung = **lời nhắn** kèm lời mời (v1.9, CR-25 #12; ≤ 2 dòng, cắt "…"; không có lời nhắn thì không có dòng nội dung) · nguồn "{username}" · "Chấp nhận" / "Từ chối" |
| `friend_request` đã chấp nhận (hàng của **người nhận**, state `friend-accepted`) | "Bạn và {Tên} đã là bạn bè" · "{username}" · "Nhắn tin" (`Button · secondary · S`). Lời nhắn bị xóa khi lời mời được chấp nhận nên hàng không còn dòng nội dung |
| `friend_accepted` 🆕 (v1.9, CR-21 #6 — mục của **người gửi** lời mời; khác state `friend-accepted` ở trên) | "{Tên} đã chấp nhận lời mời kết bạn" · nguồn "{username}" · `Button · secondary · S` "Nhắn tin" → S-DM-02; avatar + ô icon loại `user-check`; chạm thân hàng → S-HOME-10 (ngoài server, quan hệ Bạn bè). Không push. Mẫu (không có trong `default`): "Hà đã chấp nhận lời mời kết bạn" · `ha.nguyen` |
| `missed_call` | "Cuộc gọi nhỡ từ {Tên}" · "Cuộc gọi thoại" / "Cuộc gọi video". Không có nút gọi lại trên hàng (tránh gọi nhầm; "Gọi lại" nằm ở tin hệ thống trong DM, DMVC-03). Có cả khi An đang bận lúc được gọi (CR-25 #2) |
| `task_assigned` 🆕 (v1.9, CR-21 #1) | "{Tên} giao cho bạn: {tiêu đề việc}" · "Hạn {dd/MM} · {HH:mm}" / "Không hạn" (hạn **lúc giao**) · nguồn "#{kênh} · {Server}"; avatar người giao + ô icon loại `list-checks`. Chữ giữ nguyên khi việc đổi hạn, xong hay mình bị gỡ. Mỗi việc một mục, không gộp. Có push |
| `task_unassigned` (người tạo) | "Việc {tiêu đề} không còn ai làm" · "{Tên} đã rời {Server}" hoặc (v1.9, CR-20 #1) "{Tên} đã rút khỏi việc" · nguồn "#{kênh} · {Server}". Ô icon `user-x`. Người rút là chính người tạo thì không có mục |
| `task_reminder` (Assignee) | (v1.9, CR-21 #4) "Còn 24 giờ tới hạn: {tiêu đề việc}" / "Còn 2 giờ tới hạn: {tiêu đề việc}" (cùng câu với tin nhắc hạn trong kênh, không cắt 60 ký tự — hàng tự cắt 2 dòng) · "Hạn {dd/MM} · {HH:mm}" · nguồn "#{kênh} · {Server}". Ô icon `alarm-clock` |
| `task_reminder` (người tạo, việc không còn ai làm) | Cùng tiêu đề "Còn 24 giờ tới hạn: {tiêu đề việc}" · nội dung "Chưa có ai làm · Hạn 18/10 · 21:00" |
| `owner_transferred` (CR-08 mục 4, ghi vào bảng ngày 22/10/2026) | "{Tên} đã chuyển quyền Owner của {Server} cho bạn" · nguồn "{Server}". Ô icon `crown`. Chạm → 08 S-SET-01 của server đó. Có push (REQ-NOTIF-02) |
| `moderation` (22/10/2026, area 08 — CR-10 mục 14; nhãn sửa v1.9, CR-17 #1) | Tạm khóa: "Bạn bị tạm khóa ở {Server} đến {HH:mm}" (giờ hết khác ngày tạo mục: "đến {dd/MM} · {HH:mm}", theo luật ngày giờ trong nội dung) · nội dung "Lý do: …" nếu có · nguồn "{Server}"; chạm → kênh mở gần nhất của server (ô nhập bị khóa). **Đổi thời hạn tạm khóa** (CR-17 #12): mục **mới** cùng tiêu đề với giờ hết mới, nội dung "Thời hạn tạm khóa đã được đổi."; mục cũ giữ nguyên chữ. Kick: "Bạn đã bị mời ra khỏi {Server}" · "Lý do: …" (nếu có) · "Bạn có thể quay lại nếu được mời lại."; chạm: không đi đâu. Ban: "Bạn đã bị cấm khỏi {Server}" · "Lý do: …" (nếu có); chạm: không đi đâu. Ô icon `shield-alert` (`text-secondary`, không dùng `danger`). Không nêu tên người xử lý. **Không push.** Gỡ tạm khóa / bỏ cấm không có mục |
| `profile_reset` 🆕 (v1.10, CR-27, REQ-ADMIN-03) | "Hồ sơ của bạn đã được đặt lại vì vi phạm quy tắc" · nội dung "Lý do: {lý do}", rồi lời nhắn của admin nếu có (cả nội dung ≤ 2 dòng, cắt "…") · không nguồn. Ô icon `shield-alert` (`text-secondary`, như `moderation`). Không push. Chạm → 07 S-ME-01 (Sửa hồ sơ) |
| `server_removed` 🆕 (v1.10, CR-27, REQ-ADMIN-05) | Mục của **Owner**: "Server {tên} đã bị gỡ" · "Lý do: {lý do}", rồi lời nhắn nếu có · không nguồn. Ô icon `shield-alert`. Không push (kèm một email cùng nội dung). Chạm: chỉ đánh dấu đã đọc. Không bị ẩn khi server biến mất (ngoại lệ của luật nguồn biến mất, như `moderation`) |
| `report_reviewed` 🆕 (v1.9, CR-18 #7) | Tin trong server: "Báo cáo của bạn về tin nhắn của {Tên} đã được xem xét" · nguồn "#{kênh} · {Server}"; tin trong DM: cùng tiêu đề · nguồn "Tin nhắn riêng"; hồ sơ: "Báo cáo của bạn về hồ sơ của {Tên} đã được xem xét" · nguồn "{Server}"; server: "Báo cáo của bạn về {Server} đã được xem xét" · không nguồn. Không nêu hành động hay người xử lý. Ô icon `flag`. Không push. Chạm: tin trong server → mở kênh ở **cuối** (tin có thể đã bị xóa); còn lại → chỉ đánh dấu đã đọc |
| `reports_pending` 🆕 (v1.9, CR-18 #8) | "Có báo cáo mới cần xem ở {Server}" · nguồn "{Server}". Ô icon `flag`. Không push. Một mục mỗi đợt (hàng đợi người đó thấy đi từ trống thành có). Chạm → 08 S-SET-05 `pending` |
| Tài khoản đã xóa | Tên thành "Tài khoản đã bị xóa", avatar `deleted` |
| Chữ dài | Mỗi hàng có chiều cao tối đa: tiêu đề ≤ 2 dòng (200%: 3), nội dung ≤ 2 dòng, nguồn 1 dòng (cắt tên server trước, giữ tên kênh) — đều cắt `…`. Không có màn chi tiết thông báo: chạm hàng là tới nơi có đủ nội dung (chốt 20/10/2026) |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục, dữ liệu mẫu ở trên; 4 mục chưa đọc, badge tab "4" | |
| `loading` | Lần đầu, chưa có cache: 6 `Skeleton` hàng thông báo (vòng 40 + 2 dòng); ẩn "Đọc hết" | |
| `empty` | Chưa từng có thông báo: `EmptyState` giữa vùng danh sách; ẩn "Đọc hết"; badge ẩn | "Chưa có thông báo nào" · (v1.9, CR-21 #7) "Khi có người nhắc tới bạn, trả lời bạn, giao việc hay mời kết bạn, bạn sẽ thấy ở đây." |
| `error` | Không có cache và tải lỗi: khối lỗi giữa vùng danh sách, icon `cloud-off` 56 | "Không tải được thông báo" · "Kiểm tra kết nối rồi thử lại." · `Button · secondary` "Thử lại" |
| `offline` | `Banner · offline` dưới tiêu đề; danh sách lần đồng bộ gần nhất. Chạm mục vẫn mở màn đích từ cache nhưng không đánh dấu đã đọc; "Đọc hết" `disabled` kèm dòng "Cần kết nối mạng để đánh dấu đã đọc" (CR-28: outbox ở MVP chỉ cho tin nhắn). "Chấp nhận" / "Từ chối" `disabled` kèm dòng "Cần kết nối mạng để trả lời lời mời" (lời mời có thể đã bị hủy) | "Bạn đang offline" |
| `push-denied` | `Banner · push-denied` dưới tiêu đề (NOTIF-02); danh sách như `default` | "Thông báo đang tắt" · "Mở cài đặt" |
| `all-read` | Sau "Đọc hết": mọi chấm mất, tiêu đề về 400, nút "Đọc hết" ẩn, badge tab ẩn; `Toast` "Đã đánh dấu tất cả là đã đọc". (v1.9, CR-21 #3) Badge **Home giữ "3"**: đọc ở hộp thư không đọc tin trong kênh, 2 mention ở Nhóm đồ án Mobile vẫn chưa đọc tới khi An xem trong kênh | |
| `new-arrived` | Đang cuộn xuống phần HÔM QUA thì có mục mới: danh sách giữ nguyên vị trí, nút nổi `Button · secondary · S` "↑ 1 thông báo mới" giữa trên, dưới tiêu đề; badge tab tăng (4 → 5). Vùng thấy được: cuối HÔM NAY (15:20 Chi), HÔM QUA đủ 4 mục (23:00 nhắc hạn · 21:40 `task_assigned` · 21:00 nhắc hạn · 16:45 cuộc gọi nhỡ), đầu TRƯỚC ĐÓ | Chạm → cuộn lên đầu, nút ẩn |
| `friend-accepted` | Vừa chạm "Chấp nhận" trên hàng của Giang: hàng đổi tại chỗ thành "Bạn và Giang đã là bạn bè" + "Nhắn tin" (không còn lời nhắn), đã đọc; badge 4 → 3. (Khác loại `friend_accepted`: Giang — người gửi — mới là người nhận mục "An đã chấp nhận lời mời kết bạn") | "Nhắn tin" → DM 1-1 với Giang (S-DM-02) |
| `end-of-list` | Cuộn tới cuối (mục cũ nhất trong 90 ngày): sau mục cuối có dòng chữ `label` `text-tertiary` căn giữa | "Đã hiện hết thông báo trong 90 ngày qua" |
| `report-reviewed` 🆕 | (v1.9, CR-18 #7) Như `default` + mục `report_reviewed` **chưa đọc** 20:05 nằm giữa Bình 20:10 và Chi 20:01: "Báo cáo của bạn về tin nhắn của Vũ đã được xem xét" · nguồn "#hoi-dap · Nhóm đồ án Mobile"; ô icon `flag`; không dòng nội dung. Badge tab 4 → 5 | Chạm → `#hoi-dap` của Nhóm đồ án Mobile ở cuối kênh |
| `reports-pending` 🆕 | (v1.9, CR-18 #8) **Góc nhìn Bình** (Trưởng nhóm, có `MANAGE_MESSAGES`, xem được `#hoi-dap`): HÔM NAY: `reports_pending` **chưa đọc** 19:40 "Có báo cáo mới cần xem ở Ôn thi Giải tích 2" · nguồn "Ôn thi Giải tích 2"; TRƯỚC ĐÓ: `reports_pending` đã đọc 16/10 (giờ "16/10") cùng chữ — hai đợt, mỗi đợt một mục (báo cáo tin của Khánh 20:07 không tạo thêm vì hàng đợi chưa về trống). Badge tab Thông báo "1"; badge Home / Việc như 08 S-SET-EDGE `owner-transferred-inbox` (cùng góc nhìn Bình) | Chạm → 08 S-SET-05 `pending` |
| `profile-reset` 🆕 | (v1.10, CR-27) **Góc nhìn Nam**, thế giới W1 (19/10/2026 21:52; admin đặt lại hồ sơ của Nam ở việc #55 lúc 21:50): đầu HÔM NAY mục `profile_reset` **chưa đọc** 21:50, không lời nhắn; badge tab +1 | "Hồ sơ của bạn đã được đặt lại vì vi phạm quy tắc" · "Lý do: Spam hoặc quảng cáo" — chạm → S-ME-01 với hồ sơ đã đặt lại (tên hiển thị "nam.ho", không avatar, không giới thiệu) |
| `server-removed` 🆕 | (v1.10, CR-27) **Góc nhìn Khánh**, thế giới W1 (26/10/2026 22:05 — vừa hết khóa 7 ngày của việc #57; admin gỡ Chợ tài liệu K22 ở việc #58 lúc 19/10/2026 21:48): TRƯỚC ĐÓ có mục **chưa đọc** giờ "19/10" | "Server Chợ tài liệu K22 đã bị gỡ" · "Lý do: Gian lận học tập" · "Server chia sẻ đề thi có đáp án là vi phạm quy tắc học tập." — chạm: chỉ đánh dấu đã đọc |

Không áp dụng: `forbidden` (hộp thư là của riêng user, không có quyền RBAC; mục thuộc kênh mất quyền thì bị ẩn — xem Luật hộp thư), `os-permission` dạng màn riêng (quyền thông báo bị tắt chỉ hiện `Banner · push-denied`; màn giải thích là S-ROOM-09).

### Tương tác
- Chạm một hàng → đánh dấu đã đọc (chấm mất ngay, badge giảm) rồi mở màn đích (cột "Đi tới"). Hàng `friend_request` chưa trả lời: chạm thân hàng → S-HOME-10 của người gửi; hai nút làm việc riêng.
- "Chấp nhận" → `friend-accepted` (Giang nhận mục `friend_accepted`). "Từ chối" → hàng biến mất, `Toast` "Đã từ chối lời mời của Giang" (người gửi không được báo, FRIEND-02).
- "Đọc hết" → `all-read`, không hỏi xác nhận (NOTIF-05 AC3).
- Mở tab **không** tự đánh dấu đã đọc.
- Kéo xuống để làm mới (SRS 3.4). Cuộn tới cuối tải trang tiếp (cursor, 30 mục mỗi trang; đang tải: 2 `Skeleton` hàng ở cuối).
- Mục mới qua `NOTIFICATION_CREATE`: đang ở đầu danh sách → chèn trên cùng (trượt xuống 200ms; Giảm chuyển động: hiện ngay); đang cuộn xuống → `new-arrived`. Danh sách không xếp lại dưới ngón tay.

### Luật hộp thư (chốt 20/10/2026, hành vi ở CR-05; sửa v1.9)
- **Đọc:** chạm mục hoặc "Đọc hết" làm mục thành đã đọc; (v1.9, CR-21 #3) hai thao tác này **chỉ đổi trạng thái của mục** — không gửi `MESSAGE_ACK`, không giảm mention badge hay vạch chưa đọc của kênh; badge kênh / server / tab Home giữ tới khi tin thật sự được xem trong kênh. Chiều kênh → hộp thư giữ: đọc tin trong kênh (`MESSAGE_ACK` qua tin) làm mục tương ứng thành đã đọc. Trạng thái đọc đồng bộ mọi thiết bị qua `NOTIFICATION_READ`. Mở tab không đánh dấu gì. Đánh dấu đã đọc lúc offline vào outbox.
- **Nguồn biến mất** (backend báo bằng `NOTIFICATION_DELETE`): tin bị xóa → mục biến mất; (v1.9, CR-21 #2) **việc bị xóa → mọi mục của việc đó** (`task_assigned`, `task_reminder`, `task_unassigned`) biến mất; mất `VIEW_CHANNEL`, rời server, bị kick / ban → ẩn mọi mục của kênh / server đó, **trừ mục `moderation`** (là lời giải thích duy nhất khi user không mở app lúc bị xử lý — 22/10/2026); mất `MANAGE_MESSAGES` → ẩn mục `reports_pending` của server đó; chặn người gửi → ẩn mục của người đó (kể cả lời mời kết bạn). Badge tính lại theo danh sách còn lại.
- **Lời mời kết bạn được xử lý nơi khác** (S-DM-01, máy khác) → hàng đổi theo: đã chấp nhận thành "Bạn và {Tên} đã là bạn bè"; bị từ chối hoặc người gửi hủy → hàng biến mất.
- **Mục của việc sau khi việc đổi** (v1.9): việc đổi hạn / xong / mình bị gỡ → mục `task_assigned` / `task_reminder` giữ nguyên chữ lúc tạo; chạm → S-TASK-02 với dữ liệu hiện tại (bị gỡ: dạng người chỉ xem). Việc thuộc Task Board đang tắt → mục giữ nguyên, chạm → S-TASK-02 `lost-access` (CR-17 #11).
- **Không có ở MVP:** xóa từng mục, lọc, đánh dấu chưa đọc, gộp nhiều mention cùng kênh, nút "Đánh dấu đã đọc" từng mục. Hộp thư giữ 90 ngày.

### Checklist duyệt
- [ ] 12 state; `default` cả hai theme và khung 360.
- [ ] Badge tab = số mục có chấm (4); 2 mention chưa đọc thuộc Nhóm đồ án Mobile; `all-read` vẫn có badge Home "3".
- [ ] Nhắc hạn ghi "Còn … giờ tới hạn: …" + "Hạn dd/MM · HH:mm"; không còn "Sắp tới hạn" hay "Hạn 21:00, 18/10".
- [ ] Chưa đọc / đã đọc phân biệt được khi chụp đen trắng.
- [ ] Mỗi loại thông báo có icon riêng trên avatar / ô icon (`report_reviewed` và `reports_pending` cùng `flag`, phân biệt bằng chữ); không loại nào chỉ phân biệt bằng màu.
- [ ] Không còn Study Event hay mời vào phòng học trong bất kỳ frame nào.

---

## Ma trận trạng thái

| State chuẩn | S-NOTI-01 |
|---|---|
| `default` | ✅ |
| `loading` | ✅ |
| `empty` | ✅ |
| `error` | ✅ (chỉ khi không có cache) |
| `offline` | ✅ |
| `forbidden` | — hộp thư riêng của user |
| `os-permission` | ✅ dạng `push-denied` (banner) |
| Riêng | `all-read`, `new-arrived`, `friend-accepted`, `end-of-list`, `report-reviewed`, `reports-pending` |

Màn của area khác thêm trên đường đi: S-HOME-01 `from-notification` (sở hữu ở 02, frame trong hàng S-HOME-01).

## Edge case (rà ngày 20/10/2026; sửa v1.9 ngày 30/10/2026)

Frame nằm trong nhóm "06 · Thông báo — Edge case", tên `S-NOTI-EDGE · <trường hợp>`. Chủ dự án chọn cả 18 trường hợp; v1.9 thay một luật và thêm 6 luật (CR-17, CR-18, CR-21).

### Có frame
| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `message-deleted` — tin bị xóa đúng lúc bấm mục mention | (v1.9, CR-21 #5) S-HOME-01 mở `#viec-nhom` **như chạm vào kênh**: tới tin chưa đọc đầu tiên kèm vạch "Tin nhắn mới" (không có thì đáy) — tin 19:52 của Dũng đã bị xóa nên vạch nằm ngay trên tin 20:01 của Chi; `Toast` trên `Composer` "Tin nhắn này đã bị xóa" (icon `message-square-x`). Mục của Dũng biến mất khỏi hộp thư; tin của Chi hiện trên màn nên được đọc theo luật đọc của 02 (đủ điều kiện thấy) → mục của Chi thành đã đọc: badge Thông báo 4 → 2, Home 3 → 1 (badge Home chỉ giảm theo tin thật sự thấy; tin của Dũng đã xóa không còn là tin chưa đọc) | NOTIF-05 AC11, CR-21 #5 |
| `lost-access-tap` — bấm mục của kênh vừa mất quyền xem, trước khi hộp thư kịp ẩn | Ở lại hộp thư, `Toast` "Bạn không còn xem được kênh này" (icon `eye-off`); mọi mục của `#viec-nhom` (Chi 20:01, Dũng 19:52) biến mất, badge Thông báo 4 → 2; badge **Home 3 → 1** vì 2 mention chưa đọc nằm trong kênh vừa mất quyền (chỉ còn 1 DM) | ROLE-08, CR-05 mục 6 |
| `invite-cancelled` — Giang hủy lời mời đúng lúc An bấm "Chấp nhận" | Hàng của Giang biến mất, `Toast` "Lời mời này không còn hiệu lực" (icon `user-x`); badge 4 → 3. Không lộ lý do (hủy, chặn hay xóa tài khoản đều cùng chữ) | FRIEND-02, FRIEND-01 AC4 |
| `many-unread` — mở lại app sau nhiều ngày, hơn 99 mục chưa đọc | Badge tab "99+"; mọi hàng nhìn thấy đều có chấm; "Đọc hết" giữ kiểu `Button · text` như thường (không thêm kiểu mới). Trong 24 giờ có nhiều @everyone của CLB Guitar PTIT, mỗi lần một hàng | NOTIF-05, C-13 |
| `long-content` — chữ rất dài | Tên người dài: tiêu đề xuống 2 dòng rồi cắt `…`; tin 2000 ký tự: nội dung 2 dòng cắt `…`; tên kênh và server dài: nguồn 1 dòng, cắt tên server trước ("#thao-luan-do-an · Câu lạc bộ Ôn…"); tên việc 200 ký tự: tiêu đề "Còn 24 giờ tới hạn: {tên việc}" 2 dòng cắt `…` (mẫu: nhắc mốc 24 giờ gửi 19:30, nội dung "Hạn 19/10 · 19:30" — đúng luật 24 giờ / 2 giờ, và việc hạn ngày mai nên không đổi badge tab Việc). Giờ ở góc phải luôn hiện đủ | C-31, MSG-01 (≤ 2000), STUDY-06 (≤ 200), SRV-01 (≤ 100) |
| `large-text` — cỡ chữ 200% | Tiêu đề màn hình ×1.5 (42), "Đọc hết" và ⚙ xuống hàng dưới, căn phải (không đủ chỗ cùng dòng); frame vẽ ở **vị trí đã cuộn thật** tới hàng kết bạn: tiêu đề màn hình, "Đọc hết", nhóm HÔM NAY và hàng Bình đã cuộn khỏi màn, hàng Chi bị cắt ở mép trên, rồi Dũng, Giang — đúng thứ tự `default` (Bình → Chi → Dũng → Giang; cách xếp "Đọc hết" / ⚙ ở trên chỉ ghi bằng chữ, không thấy trong frame); tiêu đề hàng tối đa 3 dòng; nội dung (lời nhắn của Giang) 2 dòng cắt `…`; nguồn 1 dòng cắt `…`; giờ vẫn ở góc phải; hai nút kết bạn xếp dọc, rộng hết cột chữ; avatar giữ 40; nhãn `TabBar` giới hạn ×1.3 | DESIGN.md › Typography (200%), NFR-A11Y-03 |

### Chỉ ghi luật (giao diện không đổi)
| Tình huống | Luật |
|---|---|
| Mục bị gỡ khi đang mở hộp thư (tin bị xóa, việc bị xóa, bị kick) | Hàng mờ dần 200ms rồi danh sách khép lại (Giảm chuyển động: biến mất ngay); badge tính lại. Không toast — user không làm gì |
| Chạm mục của việc vừa bị xóa (trước khi mục kịp biến mất) (v1.9, CR-21 #2) | Ở lại hộp thư, `Toast` "Việc này đã bị xóa" (icon `trash-2`); mục biến mất, badge tính lại. Push / deep link của việc đã xóa vẫn mở S-TASK-02 `lost-access` |
| Chạm mục của việc thuộc Task Board đang tắt (v1.9, CR-17 #11) | Mục giữ nguyên; mở S-TASK-02 `lost-access`. Bật lại Task Board thì chạm mở chi tiết như thường |
| Đọc trên máy khác | Chấm mất ngay khi nhận `NOTIFICATION_READ` (hoặc `MESSAGE_ACK` của tin tương ứng); badge giảm theo |
| Người gửi đã xóa tài khoản | Tên "Tài khoản đã bị xóa", avatar `deleted` (biến thể `deleted-actor` của C-31); vẫn bấm được, đích hiện như mọi tin của tài khoản đã xóa |
| Offline lâu rồi có mạng lại | (CR-28: không còn lần đánh dấu nào chờ gửi) Tải mục mới bằng cursor từ mục mới nhất đã có; mục mới chèn trên cùng theo luật `new-arrived` |
| Bị mời ra / cấm khi không kết nối (v1.9, CR-17 #15) | Sau `READY`, mỗi mục `moderation` mời ra / cấm chưa đọc chưa từng báo trên máy → Toast icon `log-out` "Bạn không còn ở {Server}" + "Xem" (≥ 2 mục: "Bạn không còn ở 2 server"); "Xem" mở tab này ở đầu danh sách, mục `moderation` vẫn chưa đọc tới khi chạm hoặc "Đọc hết". Mỗi mục toast tối đa một lần trên một máy (02 S-HOME-EDGE `removed-while-offline`) |
| Đổi thời hạn tạm khóa (v1.9, CR-17 #12) | Mục `moderation` mới, chưa đọc, giờ hết mới, nội dung "Thời hạn tạm khóa đã được đổi."; mục cũ giữ chữ và trạng thái đọc |
| Chạm `report_reviewed` (v1.9, CR-18 #7) | Tin trong server → S-HOME-01 ở cuối kênh, không toast kể cả khi tin đã bị xóa; hồ sơ / server / DM → chỉ đánh dấu đã đọc, ở lại hộp thư. Báo cáo trong server mà An đã rời → không có mục |
| Chạm `reports_pending` khi hàng đợi đã trống / mất quyền (v1.9, CR-18 #8) | Hàng đợi đã được người khác xử lý hết → 08 S-SET-05 `empty`. Mất `MANAGE_MESSAGES` → mục đã bị ẩn theo luật nguồn biến mất; chạm đúng lúc vừa mất → Toast "Bạn không còn quyền làm việc này" (bảng mã lỗi chung, 10 S-MOD-04), ở lại hộp thư |
| Thông báo mới khi đang mở tab Thông báo | Không push (thiết bị đang foreground, DEC-34); mục chèn vào danh sách như `new-arrived` / chèn trên cùng |
| Bấm "Đọc hết" đúng lúc có mục mới tới | Chỉ đánh dấu tới mục mới nhất đang có trong danh sách (`{all: true, before_id}` — CR-05 mục 8); mục vừa tới vẫn chưa đọc, badge còn 1 |
| Chấp nhận kết bạn trên hai máy cùng lúc | Máy sau nhận `40908` (đã là bạn): không báo lỗi, hàng chuyển thành "Bạn và Giang đã là bạn bè" |
| Bị spam mention (30 lần @everyone liền nhau) | 30 hàng riêng, không gộp (Luật hộp thư); badge đếm đủ 30 |
| Qua nửa đêm | Nhóm HÔM NAY / HÔM QUA và cách ghi giờ tính lại lúc 00:00 theo timezone của user (mục 19:00 hôm qua sang nhóm HÔM QUA, vẫn ghi "19:00") |
| Hộp thư trải qua năm mới | Mục năm trước ghi "28/12/2025" ở cột giờ |
| Bấm mục của việc đã xong / đổi hạn / mình bị gỡ (v1.9 thay luật "… bị xóa giữ chữ") | Chữ trên hàng giữ nguyên lúc tạo; S-TASK-02 hiện dữ liệu hiện tại (bị gỡ: dạng người chỉ xem). Việc bị xóa: theo luật "Chạm mục của việc vừa bị xóa" |
| Mục quá 90 ngày bị dọn khi đang mở | Không biến mất dưới tay; lần làm mới hoặc mở tab sau mới mất; `end-of-list` vẫn ghi "trong 90 ngày qua" |

## Câu hỏi còn mở

Không còn. 19 câu chốt 20/10/2026 (chủ dự án đồng ý cả 19); hành vi mới ở `SRS_v1.2_change_notes.md` mục 10 (CR-05, đã áp vào SRS v1.6 ngày 21/10/2026). Thông báo cho người nhận quyền Owner (câu A4 ở README) để tới area 08. Thay đổi v1.9 theo CR-12, CR-17, CR-18, CR-20, CR-21, CR-25 (mục 17, 22, 23, 25, 26, 30 của cùng file), đã áp vào SRS v1.9 ngày 30/10/2026.
