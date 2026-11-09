# 02 · Home & Chat

Tab Home: chat trong kênh text, hai drawer (server rail + danh sách kênh, và Thành viên / Việc / Ghim), thao tác trên tin nhắn, đính kèm, trình xem tệp, tạo / tham gia server, mời bạn, và chat của phòng voice.

- Hành vi: SRS v1.9 Mục 3.1, 3.4, 3.5, 3.6 UF-02/03/06/08/09, 7.3.2, 8.4.5, REQ-SRV-01..05/07, REQ-ROLE-05/07, REQ-MSG-01..11, REQ-SEARCH-02, REQ-NOTIF-01/02/05, REQ-STUDY-05/06/08/16, REQ-SAFE-01, REQ-FRIEND-01..04, REQ-AUTH-05/06, DEC-35, DEC-36, DEC-39.
- Component: [00-components.md](00-components.md) — luật của tin nhắn (C-10 `MessageBubble`), ô soạn tin (C-11 `Composer`), hàng task (C-12 `TaskRow`), thẻ lời mời (`InviteEmbed`), trình xem tệp (`MediaViewer`) và các component mới của area này nằm ở đó, vì kênh text, chat của phòng và DM (area 09) dùng chung. Nhìn thế nào: [DESIGN.md](../../../DESIGN.md) (chế độ **Operate**).
- Nhãn UI: README › Thuật ngữ hiển thị trên UI.
- Hành vi chốt 18/10/2026 khi viết spec này (15 câu, chủ dự án đồng ý cả 15): tin dạng hàng phẳng; không 🔍 ở MVP; TabBar vẫn hiện trong chat; drawer 334 có dải 56; luật cuộn & chưa đọc; thành viên theo quyền xem kênh; Task Board nhóm theo trạng thái; chat của phòng (S-HOME-08) chỉ tăng badge; nút "Mời vào phòng" trong thân phòng; tạo server xong mở sheet mời; lỗi mã mời báo dưới ô; dùng lại link mời; thêm S-HOME-09, S-HOME-10; tải tệp ngay khi chọn. Phần là hành vi mới đã ghi ở `SRS_v1.2_change_notes.md` mục 9 (đã áp vào SRS v1.5, CR-04).
- **Cập nhật theo SRS v1.9 (30/10/2026):** CR-12 (tin liên quan tới mình), CR-13 (bỏ nhãn "Im lặng"), CR-14 (bỏ `no-history`), CR-15 (Back hệ thống), CR-16 (bỏ S-ONB-02), CR-17 (kênh `#chao-mung`, nhãn "Tạm khóa", rời server khi ở phòng, bị mời ra / cấm), CR-18 (báo cáo), CR-19 (chat & tin nhắn, màn mới S-HOME-11), CR-20 (Task Board), CR-21 (đọc ở hộp thư), CR-24 (hoạt động học), CR-25 (hồ sơ, username). Đoạn đổi ghi "(v1.9, CR-xx)"; luật cũ bị thay đã xóa (bản cũ: `SRS_v1.2_change_notes.md` mục 17–30).

## Quy ước chung của khu vực

| Hạng mục | Quy ước |
|---|---|
| Khung | 390 × 844; kiểm thêm 360 × 800 cho S-HOME-01 `default` và S-HOME-02 `default` (nhiều chữ nhất) |
| Vị trí | Mọi màn hình trong tab **Home** (`TabBar`, Home đang chọn). Khi user đang ở phòng voice / phiên học / Học một mình mà không đứng ở màn hình phòng: `MiniPlayer` nằm ngay trên `TabBar` (SRS 3.1). Thứ tự từ đáy lên: `TabBar` → `MiniPlayer` → `Composer`. S-HOME-11 là màn toàn khung: không `TabBar`, không `MiniPlayer` |
| Bàn phím | Bàn phím mở thì `TabBar` và `MiniPlayer` ẩn, `Composer` nằm ngay trên bàn phím (NFR-MOB-14). Danh sách tin giữ tin cuối ngay trên `Composer` |
| Header | Kênh dùng `ChannelHeader` (C-04): `≡` mở drawer trái, `👥` mở drawer phải. **Không có 🔍** ở MVP (tìm kiếm tin nhắn REQ-SEARCH-01 là v1.x): chỗ đó để trống, không hiện nút vô hiệu. Màn con (tạo server, mời) dùng `ScreenHeader` (C-22) hoặc sheet |
| Drawer | Cả hai drawer rộng **334** (khung 390 − dải 56 của màn hình chat ló ra, phủ scrim `bg` 60%); trên khung 360 rộng 304. Chạm dải ló ra, vuốt ngược, hoặc nút Back hệ thống đóng drawer. `TabBar` vẫn hiện dưới drawer. Cử chỉ theo SRS 3.1 (không nhận ở mép Back hệ thống, không nhận trên phần tử cuộn ngang) |
| Nút Back hệ thống | (v1.9, CR-15) Theo thứ tự của SRS 3.1: đóng sheet / dialog → đóng drawer → về màn trước trong stack của tab Home (S-HOME-06, S-HOME-11, S-TASK-02 mở từ drawer…) → ở gốc của Home (kênh đang mở, drawer đóng): **đưa app ra nền, không mở drawer**. Ở S-HOME-02 `no-server` (drawer là gốc, không đóng được): Back đưa app ra nền. Predictive back (Android 14+) xem trước đúng màn sắp về. Không có nút ← → riêng trên rail hay header. Luật bằng chữ, không đổi frame |
| Góc nhìn | An là **Owner** của "Ôn thi Giải tích 2" nên không thể bị tạm khóa, mời ra, cấm, và luôn có `MANAGE_MESSAGES` ở server này. State cần góc nhìn **thành viên thường** (S-HOME-01 `forbidden`, `timed-out`; S-HOME-04 `own-message`, `others-message`, `timed-out`; S-HOME-09 `member`, `leave-confirm*`; S-HOME-EDGE `kicked`, `banned*`, `removed-while-offline`) vẫn vẽ trên nền "Ôn thi Giải tích 2" nhưng đọc là màn của một thành viên không role (như `forbidden` từ trước) — ghi lại 30/10/2026 để không ai sửa frame theo vai Owner |
| Thứ tự tin | Mới nhất ở đáy. Mở kênh: nhảy tới tin chưa đọc đầu tiên nếu có (kèm vạch "Tin nhắn mới"), không thì tới đáy. Tin mới đến khi user đang ở đáy: tự cuộn; đang cuộn lên xem tin cũ: **không** tự cuộn, hiện nút "N tin mới ↓" |
| Đã đọc | (v1.9, CR-19 #1) Tin chỉ thành đã đọc khi An **thật sự thấy**: app ở foreground (máy mở khóa — socket sống ở nền trong phòng voice không tính); màn chat là màn trên cùng của tab đang chọn, không bị drawer hay S-HOME-11 che (BottomSheet không tính là che); tin hiện ≥ 50% chiều cao trong vùng tin (tin cao hơn vùng tin: phủ hết vùng). Gom 1 giây, gửi **một** `MESSAGE_ACK` cho tin mới nhất đã thấy. Tin đến lúc không đủ điều kiện vẫn chưa đọc (badge tăng như thường). Vạch "Tin nhắn mới" giữ tới khi rời kênh; ngoại lệ duy nhất: quay lại foreground mà kênh đang mở có tin chưa đọc mới → vạch chuyển tới tin chưa đọc đầu tiên đó. (v1.9, CR-21 #3) Đọc ở hộp thư (chạm mục, "Đọc hết") **không** đọc tin trong kênh: badge kênh / server / tab Home giữ tới khi tin được thấy ở đây |
| Thời gian | 24 giờ `HH:mm`. (v1.9, CR-19 #3) **Giờ ở đầu tin** (tin `default`, `reply`, tin hệ thống, `pinned`): hôm nay "20:02" · hôm qua "Hôm qua 20:00" · cũ hơn "16/10/2026 20:00" (luôn đủ ngày tháng năm). Tên người gửi dài cắt `…` trước để giờ luôn đủ. Vạch ngày "Hôm nay" / "Hôm qua" / "Thứ Năm, 15/10/2026". Tin gộp nhóm không có giờ; nhấn giữ → giờ của chính tin đó hiện ở cột avatar của tin được nhấc lên (S-HOME-04). Mọi giờ theo timezone của user (REQ-STUDY-03) |
| Màu ngữ nghĩa | Được dùng trong chat (không phải Study Room): lỗi gửi `danger` icon + chữ; mention badge `danger`. Badge số báo cáo đang chờ là `Badge · count · neutral` (không đỏ — đỏ là nhắc tới / chưa đọc; v1.9, CR-18 #10). Màu pha chỉ ở `ChannelRow · focus-running`, `MiniPlayer`, tin hệ thống của phiên học (icon pha, không phủ nền) và icon pha của dòng / khối hoạt động học (S-HOME-03, S-HOME-08, S-HOME-10; v1.9, CR-24) |
| Toast | Ngay trên `Composer` (màn chat) hoặc trên `TabBar`/`MiniPlayer` (drawer) — không che ô soạn tin. Hình toast theo C-14 (đảo màu, v1.9, CR-24) |
| Mascot | **Không** trong chat, drawer phải, action sheet, đính kèm, trình xem tệp (DESIGN.md › Mascot: không bao giờ trong chat). Chỉ ở S-HOME-02 `no-server` (empty state, neutral 96) |
| Giọng văn | Xưng "bạn"; lỗi nói chuyện gì xảy ra và cách sửa (NFR-USAB-03); không lộ mã lỗi thô. Lỗi không có chữ riêng dùng bảng Toast chung của 10 S-MOD-04 (v1.9, CR-17 #16) |
| Dữ liệu nhất quán | Badge mention của kênh = số tin chưa đọc **liên quan tới An** trong kênh đó (nhắc tới An hoặc trả lời một tin của An — CR-12, 23/10/2026; mỗi tin như vậy có nền mention; tin nhắc hạn task **không** tính — v1.9, CR-20 #3); badge trên icon server ở rail = tổng badge mention của các kênh trong server; badge 💬 trên rail = số cuộc DM có tin chưa đọc; badge tab Home = tổng mention mọi server + DM chưa đọc (C-03). (v1.9, CR-19 #13) **Gộp nhóm:** tin cùng người gửi, cách **tin đầu nhóm** ≤ 5 phút, không bị tin khác / vạch ngày / vạch "Tin nhắn mới" chen vào thì gộp (chỉ tin đầu có avatar, tên, giờ); ví dụ Bình gửi 21:07, 21:10, 21:13, 21:16 → nhóm "21:07" (21:07, 21:10) và nhóm "21:13" (21:13, 21:16). Số người "đang nhập" ≤ số thành viên online. Reaction: mỗi emoji đếm ≥ 1, chip của emoji An đã bấm có viền `primary`. Task: "quá hạn" chỉ khi deadline < bây giờ và chưa `done`; việc Xong không bao giờ "Quá hạn" (v1.9, CR-20 #6). Hoạt động học chỉ hiện với người được thấy theo luật REQ-AUTH-05 (bạn bè hoặc cùng server; không khi Ẩn, tắt "Hiện hoạt động học", có chặn, `cannot-message`, tài khoản đã xóa, hàng của chính An — v1.9, CR-24 #1) |
| Dữ liệu mẫu | Bây giờ **20:12, Chủ Nhật 18/10/2026**. Server **"Ôn thi Giải tích 2"** (Study Server, 24 thành viên, 6 online: An, Bình, Chi, Dũng, Hà, Khánh), kênh `#hoi-dap`. An là **Owner** của server (tạo server, vào sớm nhất: "Thành viên từ 01/10/2026"), có thêm vai trò "Trưởng nhóm" (README › Dữ liệu mẫu; sửa 22/10/2026, trước đây ghi An chỉ là thành viên). (v1.9, CR-17 #2) Kênh của server: THÔNG TIN — `#chao-mung` (**đứng đầu**, kênh tin chào mừng, mọi người gửi được), `#thong-bao`, `#tai-lieu`, `#hoi-dap`, `#viec-nhom`; PHÒNG HỌC — Phòng học im lặng, Phòng thảo luận nhóm. Tin "X đã tham gia server" chỉ nằm ở `#chao-mung` (mẫu ở bảng dưới). Server khác trên rail: "Nhóm đồ án Mobile" (mention 2), "CLB Guitar PTIT" (chưa đọc, không mention; server thường, kênh `#general`, "Phòng thoại chung"). Tin mẫu ở S-HOME-01 `default`. Invite mẫu `k7Qm2xPa`. (v1.9, CR-18) Hàng đợi báo cáo An thấy: **2** đối tượng (hồ sơ của Nam; tin của Khánh 20:05 với 2 báo cáo). (v1.9, CR-18 #2) Giới thiệu: An "Sinh viên năm 3 PTIT · đang ôn Giải tích 2" (07), Bình "Lớp trưởng D22CN05 · hỏi bài cứ tag mình", Khánh "Bán tài liệu ôn thi giá rẻ · inbox mình", Dũng "Mới vào nhóm, nhờ mọi người chỉ giáo", Giang "Tối nào cũng học lúc 20:00", Hà "K22 Điện tử", Phong "Sinh viên K23 PTIT", Minh "Thích chạy bộ và Giải tích", Mai "Sinh viên K22 PTIT" (thẻ tra cứu ở 09 S-DM-05); Quân chưa viết giới thiệu. (v1.9, CR-24) Hoạt động học lúc 20:12: Dũng đang học một mình (Tập trung · còn 12 phút); Hà ở phòng có phiên của một server An không ở ("Đang học cùng nhóm"); không ai khác đang học |

### Tin mẫu của `#hoi-dap` (S-HOME-01 `default`)

| Giờ | Người gửi | Nội dung |
|---|---|---|
| 20:02 | Bình | "Mọi người ơi, câu 3 đề giữa kỳ năm ngoái giải thế nào vậy?" |
| 20:04 | Chi | "Đổi sang tọa độ cực rồi tính tích phân kép là ra nhé" |
| 20:04 | Chi (gộp nhóm) | Ảnh `cau3.jpg` (thumbnail) |
| 20:05 | Khánh | "Bán đề thi giữa kỳ có đáp án 50k, ai cần inbox mình" (tin spam bị báo cáo ở 10 S-MOD-02 và xử lý ở 08; thêm 22/10/2026 để tin bị báo cáo có thật trong kênh — có ở mọi frame vẽ đoạn 20:04–20:06 của `#hoi-dap`) |
| 20:06 | Dũng (trả lời Chi) | "Cảm ơn Chi, mình ra `8π/3` rồi" — reaction 👍 3 (có An), 🎉 1 |
| — | vạch | "Tin nhắn mới" |
| 20:10 | Bình | "@An tối nay 20:30 vào Phòng học im lặng ôn tiếp nhé" (nhắc tới An → nền mention) |
| 20:11 | An | "Ok, mình vào sớm giữ chỗ" |
| — | typing | "Chi đang nhập…" |

(v1.9, CR-17 #2) Tin hệ thống 19:58 "Dũng đã tham gia server" **bỏ khỏi** `#hoi-dap` — chuyển sang `#chao-mung`.

### Tin mẫu của `#chao-mung` (S-HOME-01 `welcome-channel`, v1.9, CR-17)

| Giờ ở đầu tin | Người gửi | Nội dung |
|---|---|---|
| — | vạch | "Thứ Năm, 15/10/2026" |
| 15/10/2026 21:14 | (hệ thống) | "**Hà** đã tham gia server" |
| 15/10/2026 21:15 | Hà | "Chào mọi người, mình là Hà, K22 Điện tử" |
| 15/10/2026 21:20 | Bình | "Chào Hà, hỏi bài ở `#hoi-dap` nhé" (chip kênh) |
| — | vạch | "Hôm nay" |
| 19:58 | (hệ thống) | "**Dũng** đã tham gia server" |
| 19:59 | Dũng | "Chào cả nhà, mình mới vào nhóm" |

### Tin mẫu của `#tai-lieu` (S-HOME-01 `link-previews`, `attachments`, `message-link`; v1.9, CR-19)

| Giờ ở đầu tin | Người gửi | Nội dung |
|---|---|---|
| 16/10/2026 19:55 | Hà | "Có ai có lời giải đề giữa kỳ năm ngoái không?" |
| 16/10/2026 20:00 | Tuấn | "Lời giải đề giữa kỳ 2024 mình để đây nhé" + thẻ PDF `loi-giai-giua-ky-2024.pdf` · 3,2 MB (đích của link tin ở `message-link`) |
| 16/10/2026 20:03 | Bình | "Cảm ơn Tuấn!" |
| 18:30 | Bình | "Video chữa đề giữa kỳ 2024 nè https://www.youtube.com/watch?v=Xk2pQ7" → thẻ `large` video: ảnh 16:9 có ▶ ở giữa, "YouTube" · "Chữa đề giữa kỳ Giải tích 2 – PTIT 2024" · mô tả 2 dòng |
| 18:34 | Chi | "Tóm tắt lý thuyết tích phân bội https://vi.wikipedia.org/wiki/Tích_phân_bội" → thẻ `small` (ảnh 64 vuông bên phải): "Wikipedia" · "Tích phân bội – Wikipedia tiếng Việt" · mô tả 2 dòng |
| 18:40 | Tuấn | "Bảng công thức https://toanhoc247.vn/bang-cong-thuc-tich-phan" → thẻ `text` (không ảnh): "toanhoc247.vn" · "Bảng công thức tích phân đầy đủ" · mô tả 2 dòng |
| 19:30 | Chi | "Ảnh chụp lời giải câu 1–3 nè" + lưới 3 ảnh `loi-giai-1.jpg`, `loi-giai-2.jpg`, `loi-giai-3.jpg` |
| 19:41 | Bình | Video `chua-de-cau-5.mp4` (thumbnail + `play` + "2:14") |
| 19:45 | Lan | Thẻ âm thanh `giai-thich-cau-2.m4a` (An đang nghe: `pause` + thanh tiến độ + "0:42 / 3:15") |
| 19:50 | Tuấn | "Đề cương ôn tập chương 4–5" + thẻ PDF `de-cuong-on-tap.pdf` · 1,8 MB |
| 19:52 | Hà | Thẻ tệp `tong-hop-cong-thuc.docx` · 2,4 MB |

Dũng vào server lúc 19:58 hôm nay nên không có tin của Dũng trước giờ đó ở bất kỳ kênh nào của server.

---

## S-HOME-01 · Kênh text

**Mục đích:** đọc và gửi tin trong một kênh text của server.
**REQ:** MSG-01..11, SEARCH-02, NOTIF-01, ROLE-05, FRIEND-03, SRS 3.1 (Deep link), 3.4, 3.5, 8.4.5.
**Mở từ:** tab Home (kênh mở gần nhất); chạm `ChannelRow · text` ở S-HOME-02; push mention/reply và mục mention / reply ở tab Thông báo (state `from-notification`, NOTIF-02 AC3, NOTIF-05 AC2); deep link kênh; (v1.9, CR-19 #2) link tin nhắn — chip link tin trong chat hoặc App Link từ ngoài (state `message-link`); tạo / tham gia server xong (v1.9, CR-17 #2: kênh text đầu tiên xem được = `#chao-mung`, hoặc kênh trong `?channel=`); chạm chip kênh trong tin (v1.9, CR-19 #11). **Đi tới:** S-HOME-02 (`≡` / vuốt phải), S-HOME-03 (`👥` / vuốt trái), S-HOME-04 (nhấn giữ tin), S-HOME-05 (`+`), S-HOME-10 (chạm avatar / tên), S-HOME-11 (chạm ảnh, thẻ PDF, video), S-MOD-01 (chạm chữ link mời), S-ROOM-01/02 `not-joined` (chip phòng; chạm tin hệ thống của phòng — chỉ ở S-HOME-08), S-TASK-02 ("Xem việc" ở tin nhắc hạn; link `/tasks/<id>`), kênh khác (chip kênh).

### Bố cục
```
┌ Status bar ──────────────────────────────┐
│ ≡  # hoi-dap                         👥  │  ChannelHeader · text (dòng phụ: tên server)
│    Ôn thi Giải tích 2                    │
├──────────────────────────────────────────┤
│ ── Hôm nay ──                            │  vạch ngày
│ (B) Bình  20:02                          │  MessageBubble · default
│     Mọi người ơi, câu 3 đề giữa kỳ…      │
│ (C) Chi  20:04                           │
│     Đổi sang tọa độ cực rồi tính…        │
│     ┌──────────┐                         │  ảnh (gộp nhóm, không lặp tên, không giờ)
│     │ cau3.jpg │                         │
│     └──────────┘                         │
│ (K) Khánh  20:05                         │
│     Bán đề thi giữa kỳ có đáp án 50k…    │
│   ╭ Chi: Đổi sang tọa độ cực rồi…        │  dòng trả lời
│ (D) Dũng  20:06                          │
│     Cảm ơn Chi, mình ra 8π/3 rồi         │
│     [👍 3] [🎉 1] [☺+]                   │  reaction
│ ───────── Tin nhắn mới ─────────         │  vạch, danger
│▌(B) Bình  20:10                          │  nền mention (thanh trái 2 + nền surface-1)
│▌    @An tối nay 20:30 vào Phòng học…     │
│ (A) An  20:11                            │
│     Ok, mình vào sớm giữ chỗ             │
│ Chi đang nhập…                           │  dòng typing, label
├──────────────────────────────────────────┤
│ [+] [ Nhắn #hoi-dap            ] [☺] [➤] │  Composer
├ TabBar (Home) ───────────────────────────┤
```
(v1.9, CR-17) Không còn tin "Dũng đã tham gia server" 19:58 ở đầu đoạn.

### Component
`ChannelHeader · text`, `MessageBubble` (C-10, mọi biến thể, kể cả `highlight`, chip link NezFocus, thẻ xem trước link, thẻ âm thanh / PDF), `InviteEmbed`, `Composer` (C-11, kể cả bộ đếm ký tự), `Avatar`, `Badge`, `Banner`, `Toast`, `Skeleton`, `EmptyState · inline`, `MiniPlayer`, `TabBar`, `OS/Keyboard`, `MentionSuggest` (C-27).

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Placeholder ô soạn | "Nhắn #hoi-dap" |
| Vạch chưa đọc | "Tin nhắn mới" |
| Nút cuộn xuống | "3 tin mới" + `arrow-down` (khi có tin mới chưa xem) · chỉ `arrow-down` (khi chỉ đang cuộn lên) |
| Nhảy tới chưa đọc (đầu danh sách, khi vạch nằm ngoài màn hình) | "12 tin nhắn mới từ 19:40" · "Đánh dấu đã đọc" |
| Typing | "Chi đang nhập…" · "Chi và Dũng đang nhập…" · "Nhiều người đang nhập…" (≥ 3) |
| Đầu kênh | "Chào mừng tới #hoi-dap" · "Đây là đầu kênh. Hãy gửi tin nhắn đầu tiên." |
| Bộ đếm ký tự (v1.9, CR-19 #4) | "còn 120" (khi còn ≤ 200) · "−12" + dòng "Tin nhắn dài quá 2000 ký tự" |
| Toast link (v1.9, CR-19 #2, #11) | "Bạn không xem được tin nhắn này" · "Bạn không xem được kênh này" · "Tin nhắn này đã bị xóa" |
| Toast tệp (v1.9, CR-19 #8) | "Đã lưu vào Tải xuống" · "Không có ứng dụng mở được tệp .docx" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `loading` | 6 `Skeleton` hàng tin (avatar tròn + 2 dòng dài ngắn khác nhau); ô soạn vẫn dùng được | SRS 3.5 |
| `empty` | Kênh mới chưa có tin: khối đầu kênh ở **đáy** danh sách (icon `hash` 56 trong vòng `surface-2`, tiêu đề `title-2`, `body` `text-secondary`), không mascot | "Chào mừng tới #hoi-dap" · "Đây là đầu kênh. Hãy gửi tin nhắn đầu tiên." Cuộn tới đầu lịch sử của mọi kênh cũng gặp khối này |
| `error` | Tải lịch sử thất bại, không có cache: khối giữa vùng tin, icon `cloud-off` + chữ + `Button · secondary` | "Không tải được tin nhắn" · "Thử lại" |
| `offline` | `Banner · offline` dưới header; tin từ cache; tin An gửi lúc offline ở dạng `pending` kèm icon `clock-3` + chữ "Sẽ gửi khi có mạng" | "Bạn đang offline" (SRS 3.5); vẫn soạn và gửi vào outbox |
| `reconnecting` | `Banner · reconnecting` | "Đang kết nối lại…" (sau 3 giây mất Gateway) |
| `forbidden` | Không có `SEND_MESSAGES` (mẫu: member thường ở `#thong-bao`): `Composer · disabled` thay ô nhập bằng dòng lý do, icon `lock` | "Bạn không có quyền gửi tin nhắn trong kênh này" (40302) |
| `timed-out` | (Góc nhìn thành viên thường) `Composer · disabled` icon `timer`; reaction và "Trả lời" không có trong S-HOME-04 | (v1.9, CR-17 #1) "Bạn đang bị tạm khóa đến 21:30 · chưa gửi tin được" (40307; ngày nếu khác hôm nay: "đến 21:30, 20/10") |
| `blocked-message` | Tin của người An đã chặn thu gọn thành một dòng; nhiều tin liền nhau gộp một dòng; chạm "Hiện" mở ra tại chỗ (ẩn lại khi rời kênh) | "1 tin nhắn bị chặn · Hiện" / "3 tin nhắn bị chặn · Hiện" (FRIEND-03) |
| `system-messages` | Đủ loại tin hệ thống của kênh text, frame ở `#viec-nhom`: (v1.9, CR-20 #3, #4) nhắc hạn 19:00 icon `alarm-clock` "Còn 2 giờ tới hạn: **Đọc tài liệu chương 5** · bạn · **Xem việc**" (hạn hôm nay 21:00, đúng mốc 2 giờ trước hạn như 06; chỉ An được giao nên ghi "bạn"; tên người là chữ thường, **không** nền mention, không cộng badge), tin của Chi 20:01, "Chi đã ghim một tin nhắn · Xem" 20:03. (v1.9, CR-17) Tin tham gia server **không** còn ở đây — xem `welcome-channel`. Tin hệ thống của phiên học **không** có ở kênh text, chỉ ở S-HOME-08 (sửa 22/10/2026) | Chữ: C-10 › Tin hệ thống. Tên việc dài cắt ở ranh giới từ, tối đa 60 ký tự + "…"; quá 3 người: "bạn, Bình, Chi và 4 người khác" |
| `welcome-channel` 🆕 | (v1.9, CR-17 #2) Kênh tin chào mừng `#chao-mung`: tin theo bảng "Tin mẫu của `#chao-mung`" (tin tham gia 15/10/2026 21:14 và 19:58, chào hỏi của Hà, Bình, Dũng); giờ đầu tin theo luật v1.9 ("15/10/2026 21:15"); `Composer` bình thường vì mọi người gửi được | Placeholder "Nhắn #chao-mung" |
| `message-states` | Một frame gom: tin `pending` (mờ 50%), `failed` (icon `circle-alert` + "Không gửi được · Thử lại" `danger`), (v1.9, CR-19 #7) `failed` vì tệp bị chặn ("Không gửi được · 1 tệp bị chặn", chạm → S-HOME-04 `failed-file-blocked`), "(đã chỉnh sửa)", trả lời tin đã xóa. **Bỏ** "tin có tệp bị chặn" (tệp bị chặn từ trước khi gửi — S-HOME-05 `rejected`) | 8.4.5; MSG-04 AC3; MSG-05 AC6 |
| `new-messages` | Mở kênh có 12 tin chưa đọc mà vạch nằm ngoài màn hình: dải "12 tin nhắn mới từ 19:40" ghim dưới header. Màn hình đang ở đáy nên chỉ thấy phần cuối của 12 tin chưa đọc (Bình 20:02 → Bình 20:10 nhắc @An; v1.9 bỏ tin 19:58), không có tin nào của An sau 19:40; vạch "Tin nhắn mới" nằm phía trên, ngoài màn hình (sửa 22/10/2026) | Chạm dải → cuộn tới vạch; "Đánh dấu đã đọc" → ẩn dải, gửi `MESSAGE_ACK` |
| `scrolled-up` | Đang xem tin cũ, có 3 tin mới đến: nút nổi tròn "3 tin mới ↓" góc phải trên `Composer`; danh sách không nhảy. Vùng tin đầy lịch sử cũ hơn (Hà 19:12 … An 19:38), tràn qua mép trên | Chạm → cuộn xuống đáy |
| `mention-suggest` | Gõ "@": danh sách gợi ý (C-27) mọc trên ô soạn, (v1.9, CR-19 #14) có tiêu đề nhóm "THÀNH VIÊN"; tối đa 5 hàng, người online trước (online gồm cả Idle và DND), trong nhóm xếp theo tên; không gợi ý chính mình; gõ tiếp thì lọc không dấu ("@bi" → Bình). Frame: THÀNH VIÊN — Bình, Chi, Dũng, Hà, Khánh | Nhóm VAI TRÒ và `@everyone`/`@here` theo C-27; gõ "#" gợi ý kênh (tiêu đề "KÊNH") |
| `mention-suggest-roles` 🆕 | (v1.9, CR-19 #14) Gõ "@tr": THÀNH VIÊN — Bình, Mai (khớp đầu một từ của username `binh.tran`, `mai.tran` — C-27 khớp cả tên hiển thị lẫn username; Bình online trước, Mai ngoại tuyến sau); VAI TRÒ — "Trưởng nhóm" · "2 thành viên", "Quản trị" · "1 thành viên" (An là Owner nên có `MENTION_EVERYONE` → thấy mọi vai trò trừ `@everyone`). Hàng vai trò: icon `users` 24 trong ô tròn `surface-2` + tên + số thành viên `label` `text-tertiary` | Chạm "Trưởng nhóm" → chèn chip `@Trưởng nhóm` |
| `reply-mode` | Dải "Đang trả lời Chi" + `x` trên ô soạn; ô soạn focus, bàn phím mở | Gửi → tin có dòng trả lời; `x` → hủy |
| `edit-mode` | Dải "Đang sửa tin nhắn" + `x`; ô soạn chứa nội dung cũ; nút gửi thành `check` | Lưu rỗng → hỏi xóa tin (S-HOME-04 `delete-confirm`) |
| `keyboard-open` | `OS/Keyboard · text`; `TabBar` ẩn; `Composer` trên bàn phím, ô soạn cao tới 5 dòng rồi cuộn trong ô | Enter xuống dòng, chỉ ➤ gửi (SRS 3.4) |
| `char-counter` 🆕 | (v1.9, CR-19 #4) Bàn phím mở, ô soạn đầy 5 dòng (đang cuộn trong ô). Hai frame: `char-counter · near` — còn 120 ký tự: "còn 120" `label` `text-tertiary` góc phải dưới ô nhập, ➤ `primary`; `char-counter · over` — vượt 12 ký tự: "−12" `danger` ở cùng chỗ + dòng trên ô soạn icon `circle-alert` "Tin nhắn dài quá 2000 ký tự" (`danger`), ➤ `disabled` | Áp cả `edit-mode`; chữ dán vào không bị cắt |
| `rate-limited` | Tin thứ 6 trong 5 giây ở `failed` (icon `circle-alert` + chữ `danger`) kèm chữ đếm ngược, tự thử lại khi hết giờ. Frame: 6 tin của An lúc 20:12 là một nhóm mới có avatar, tên, giờ (cách tin 19:38 quá 5 phút) | "Bạn gửi quá nhanh · tự gửi lại sau 4 giây" (MSG-08) |
| `in-session` | An đang ở phiên học nhưng mở chat: `MiniPlayer` giữa `Composer` và `TabBar` | MiniPlayer theo C-08 |
| `from-notification` | (thêm 20/10/2026, area 06) Mở từ mục mention trong tab Thông báo hoặc push: kênh `#viec-nhom` của Nhóm đồ án Mobile, tin được nhắc (Dũng 19:52) nằm ở 1/3 trên vùng tin ở trạng thái (v1.9, CR-19 #2) **`highlight`** (nền `surface-2` nhấp 2 lần, mỗi lần `short`; thanh trái mention vẫn giữ vì tin liên quan tới An). Tin chưa có trong cache thì tải quanh tin (`around`, Skeleton trên và dưới). `TabBar` sáng tab **Home**; Back hệ thống về tab Thông báo (bước "về màn trước" của CR-15). (v1.9, CR-21 #3) Chạm mục chỉ đánh dấu **mục** đã đọc; tin trong kênh được ack theo luật Đã đọc: tin Dũng 19:52 và tin của Chi 20:01 hiện ≥ 50% trên màn nên được ack → hai mục tương ứng thành đã đọc, badge tab Thông báo 4 → 2 | (v1.9, CR-21 #5) Tin đã bị xóa: mở kênh như chạm vào kênh (tới tin chưa đọc đầu tiên kèm vạch, không có thì đáy) + `Toast` icon `message-square-x` "Tin nhắn này đã bị xóa"; mục biến mất |
| `message-link` 🆕 | (v1.9, CR-19 #2) Chạm chip "#tai-lieu › Tin nhắn" ở `nezfocus-links`: mở `#tai-lieu`, tin Tuấn "16/10/2026 20:00" "Lời giải đề giữa kỳ 2024 mình để đây nhé" + thẻ PDF nằm ở 1/3 trên vùng tin, trạng thái `highlight` (frame vẽ lúc nền `surface-2` đang sáng); phía trên vạch "Thứ Sáu, 16/10/2026" và tin Hà 19:55; phía dưới tin Bình 20:03 "Cảm ơn Tuấn!". Không có vạch "Tin nhắn mới" | Giảm chuyển động: nền giữ 1 giây rồi tắt. Lỗi: ở lại màn đang xem + `Toast` "Bạn không xem được tin nhắn này"; tin đã xóa → mở kênh như chạm vào kênh + `Toast` "Tin nhắn này đã bị xóa"; mở từ ngoài khi chưa là thành viên → 10 S-MOD-01 `members-only` |
| `nezfocus-links` 🆕 | (v1.9, CR-19 #11) `#hoi-dap`, đoạn "Hôm qua": Bình "Hôm qua 21:05" "Lời giải đề giữa kỳ 2024 đã có ở `#tai-lieu` nhé:" + chip `message-square` "#tai-lieu › Tin nhắn"; Chi "Hôm qua 21:07" "Tối mai học ở" + chip `lamp-desk` "Phòng học im lặng"; Tuấn "Hôm qua 21:09" "Bên nhóm đồ án cũng đang hỏi câu này:" + chip "Nhóm đồ án Mobile › #hoi-dap"; Khánh "Hôm qua 21:12" "Ai chơi guitar thì vào" + chip `volume-2` "CLB Guitar PTIT › Phòng thoại chung"; Hà "Hôm qua 21:15" "Nhóm lớp mình cũng có lời giải:" + chip `lock` "Không xem được" (`text-secondary`, không tên). Chip thay chữ của link | Chip theo C-10 › Nội dung đặc biệt. Chạm "Không xem được" → `Toast` "Bạn không xem được kênh này" (link tin: "Bạn không xem được tin nhắn này"), không chuyển màn |
| `invite-cards` 🆕 · **v1.x** (CR-28 #8) | (v1.9, CR-19 #12) `#hoi-dap`, đoạn "Hôm qua"; thẻ `InviteEmbed` dưới chữ của tin (chữ link vẫn hiện). Ba frame. **`invite-cards`**: Chi "Hôm qua 21:20" "Nhóm Xác suất của mình, ai cần thì vào nhé https://nezfocus.app/invite/Xs7Lp3Qd" → thẻ "Ôn thi Xác suất thống kê" · "18 thành viên · 4 đang online" + "Tham gia"; Bình "Hôm qua 21:22" "https://nezfocus.app/invite/k7Qm2xPa" → thẻ "Ôn thi Giải tích 2" · "24 thành viên · 6 đang online" + "Mở server" + ghi chú "Bạn đã ở server này"; Tuấn "Hôm qua 21:25" "Vào phòng học cùng nhé https://nezfocus.app/invite/k7Qm2xPa?channel=…" → thẻ có thêm dòng `lamp-desk` "Mời vào học ở Phòng học im lặng" + "Mở phòng" + "Bạn đã ở server này"; Khánh "Hôm qua 21:28" "https://nezfocus.app/invite/Mb2Wq9Tz" → thẻ `Skeleton` (đang tải). **`invite-cards · errors`** (cùng đoạn, sau khi bấm): thẻ của Chi sau khi bấm "Tham gia" → `40306`: nút biến mất, icon `circle-alert` "Bạn không thể tham gia Ôn thi Xác suất thống kê" `danger`; thẻ của Khánh tải xong là lời mời hỏng: thẻ chung icon `link-2-off` "Lời mời không còn hiệu lực", không tên server, không nút. **`invite-cards · max`** (An đã ở 100 server): thẻ của Chi có "Tham gia" `disabled` + icon `info` "Bạn đã ở 100 server, mức tối đa." | "Tham gia" vào thẳng (không qua S-MOD-01), nút `loading`, xong đi như S-MOD-01 khi tham gia xong; mất mạng khi bấm → `Toast` "Cần kết nối mạng để tham gia", thẻ giữ nguyên |
| `link-previews` 🆕 · **v1.x** (CR-28 #8) | (v1.9, CR-19 #15) `#tai-lieu`, đoạn 18:30–18:40: ba kiểu thẻ xem trước link theo bảng tin mẫu — `large` có ▶ (Bình 18:30), `small` (Chi 18:34), `text` (Tuấn 18:40) | Chạm thẻ → mở trình duyệt / app của trang; video **không phát trong chat**. Tin gửi ngay, thẻ tới sau 1–3 giây (không Skeleton); tối đa 3 thẻ mỗi tin |
| `attachments` 🆕 | (v1.9, CR-19 #8) `#tai-lieu`, đoạn 19:30–19:52: lưới 3 ảnh (Chi), thumbnail video có `play` + "2:14" (Bình), thẻ âm thanh **đang phát** "0:42 / 3:15" (Lan), thẻ PDF bấm được `de-cuong-on-tap.pdf` · 1,8 MB (Tuấn), thẻ `tong-hop-cong-thuc.docx` · 2,4 MB (Hà) | Chạm ảnh / PDF / video → S-HOME-11; âm thanh phát trong tin, một tệp một lúc, rời màn chat thì dừng |

Không áp dụng: `os-permission` (kênh text không cần quyền hệ điều hành; ảnh/camera xử lý ở S-HOME-05). (v1.9, CR-14) **Bỏ `no-history`**: `READ_MESSAGE_HISTORY` không còn, ai xem được kênh thì đọc mọi tin.

### Tương tác
- Chạm `≡` / vuốt phải → S-HOME-02; chạm `👥` / vuốt trái → S-HOME-03.
- Nhấn giữ tin → S-HOME-04 (rung nhẹ). Chạm tin `failed` → S-HOME-04 `failed-message` (tin lỗi vì tệp bị chặn → `failed-file-blocked`).
- Chạm avatar hoặc tên → S-HOME-10. Chạm mention `@Bình` → S-HOME-10 của Bình; chạm chip `#kênh` → mở kênh đó.
- Chạm chip reaction → bật/tắt reaction của An (rung nhẹ); nhấn giữ chip → sheet "Ai đã thả cảm xúc" (danh sách người, C-09 BottomSheet).
- Chạm dòng trả lời → cuộn tới tin gốc và nhấp nền tin gốc 1 lần (`short`); tin gốc đã xóa → không làm gì.
- (v1.9, CR-19 #8) Chạm ảnh → S-HOME-11 `image`; chạm thẻ PDF → S-HOME-11 `pdf`; chạm thumbnail video → S-HOME-11 `video` (không tự phát trong danh sách). Chạm `play` / `pause` trên thẻ âm thanh → phát / dừng ngay trong tin. Chạm thẻ Office / nén / tệp chữ → tải rồi mở bằng ứng dụng của máy (không có ứng dụng → `Toast` "Không có ứng dụng mở được tệp .docx"). Nút `download` của mọi thẻ → lưu vào Tải xuống + `Toast` "Đã lưu vào Tải xuống".
- (v1.9, CR-19 #11) Chạm chip link NezFocus → mở **ngay trong app** (không qua trình duyệt): kênh → S-HOME-01 kênh đó; phòng → S-ROOM-01/02 `not-joined` (không tự kết nối; đang ở phòng khác: nút "Chuyển sang phòng này"; phòng / cuộc gọi đang có giữ nguyên `MiniPlayer`); link tin → `message-link`; "Không xem được" → `Toast`, không chuyển màn. Link `/tasks/<id>` là link thường, chạm → S-TASK-02. Đường dẫn NezFocus khác → link thường, mở như link ngoài.
- (v1.9, CR-19 #12) Chạm chữ link mời → S-MOD-01; nút trên thẻ lời mời như state `invite-cards`.
- (v1.9, CR-20 #4) Chạm "Xem việc" trên tin nhắc hạn → S-TASK-02 (việc đã xóa / mất quyền → `lost-access`); chạm phần còn lại của tin không làm gì.
- Kéo tới đầu danh sách → tải 50 tin cũ hơn (Skeleton 2 hàng ở đầu); hết lịch sử → khối đầu kênh.
- (v1.9, CR-19 #1) Đọc theo luật Đã đọc ở Quy ước (thay "Đọc tới đáy → `MESSAGE_ACK`"); vạch "Tin nhắn mới" giữ tới khi rời kênh, trừ ngoại lệ quay lại foreground.

### Checklist duyệt
- [ ] 28 state (31 frame: `char-counter` 2 frame, `invite-cards` 3 frame); `default` cả hai theme và khung 360.
- [ ] Không có 🔍 trên header; không mascot.
- [ ] Tin gộp nhóm đúng luật 5 phút tính từ tin đầu nhóm; badge và nền mention khớp dữ liệu mẫu; tin nhắc hạn không có nền mention.
- [ ] Giờ đầu tin đúng ba dạng ("20:02", "Hôm qua 21:05", "16/10/2026 20:00").
- [ ] `failed` và mention đọc được không cần màu (icon + chữ, thanh trái); "−12" có dòng lỗi icon + chữ.
- [ ] Không còn tin tham gia server ở `#hoi-dap`; `#chao-mung` có tin tham gia.
- [ ] Ở 200%: tên + giờ xuống dòng được, nội dung tin xuống dòng tự do, code block cuộn ngang, nhãn chip reaction không cắt; chip link cắt theo luật Edge case.

---

## S-HOME-02 · Drawer trái (server rail + danh sách kênh)

**Mục đích:** chuyển server, chuyển kênh, thấy phòng nào đang học, tạo / tham gia server.
**REQ:** SRV-02, NOTIF-01, STUDY-01/02/11, SAFE-01 (số báo cáo chờ), SRS 3.1.
**Mở từ:** `≡` hoặc vuốt phải ở S-HOME-01 / S-HOME-08 / S-ROOM-01/02; tab Home khi chưa có server (01 › Điều hướng sau đăng nhập; v1.9, CR-16 #5: hoàn tất tài khoản xong mà không có lời mời đang chờ). **Đi tới:** S-HOME-01 (kênh text), S-ROOM-01/02 (kênh voice / phòng học), S-DM-01 (💬), S-HOME-06 (＋), S-HOME-07 ("Mời bạn"), S-HOME-09 (chạm tên server).

### Bố cục
```
┌ Status bar ─────────────────────────────────┐
│┌────┬───────────────────────────────┐░░░░░│
││ 💬 │ Ôn thi Giải tích 2          ⌄ │░░░░░│  tên server (headline) → S-HOME-09
││ ── │ Study Server · 24 thành viên  │░░░░░│  label, text-tertiary
││▌G1 │ [👤+ Mời bạn]                 │░░░░░│  Button · secondary · S
││ G2②│ ▾ THÔNG TIN                   │░░░░░│  tiêu đề category (chạm để thu gọn)
││ G3•│   # chao-mung                 │░░░░░│  ChannelRow · text — kênh tin chào mừng, đầu danh mục (v1.9, CR-17)
││ ＋ │   # thong-bao                 │░░░░░│
││    │   # tai-lieu                  │░░░░░│
││    │   # hoi-dap          (chọn)   │░░░░░│  selected
││    │   # viec-nhom                 │░░░░░│
││    │ ▾ PHÒNG HỌC                   │░░░░░│
││    │   [lamp] Phòng học im lặng    │░░░░░│  ChannelRow · study-room (không nhãn "Im lặng", v1.9, CR-13)
││    │   [lamp] Phòng thảo luận nhóm │░░░░░│
│└────┴───────────────────────────────┘░░░░░│  dải 56 của màn chat, scrim
├ TabBar (Home) ──────────────────────────────┤
```
Sơ đồ là `default` (sửa 22/10/2026 cho khớp canvas): không kênh nào có mention, không phòng nào đang có phiên học — hàng `focus-running` xem state `focus-running`, mention `#viec-nhom ①` xem `unread-mention`. Rail rộng 72, nền `bg`; danh sách kênh nền `surface-1`, mép phải bo `sheet`. Thứ tự server trên rail: theo thứ tự user vào server (cũ trên cùng) — kéo thả sắp xếp là v1.x. (v1.9, CR-13) "Phòng học im lặng" chỉ còn là tên kênh: không còn Silent Room, không còn nhãn "Im lặng" trên hàng.

### Component
`ServerRail` (C-26: `RailItem · dm / server / add`), `ChannelRow` (C-05), tiêu đề category, `Button · secondary · S`, `Badge` (kể cả `count · neutral`), `EmptyState`, `Skeleton`, `Banner`, `Toast`, `MiniPlayer`, `TabBar`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Dòng phụ dưới tên server | "Study Server · 24 thành viên" / "24 thành viên" (server thường) |
| Nút | "Mời bạn" |
| Category | Tên viết hoa, giữ dấu: "THÔNG TIN", "PHÒNG HỌC" |
| Accessibility rail | "Tin nhắn trực tiếp, 1 cuộc chưa đọc" · "Nhóm đồ án Mobile, 2 lượt nhắc tới bạn" · "Tạo hoặc tham gia server" |
| Accessibility tên server (v1.9, CR-18 #10) | "Ôn thi Giải tích 2, 2 báo cáo đang chờ" |
| Toast kéo thả (v1.9, CR-17 #3) | "PHÒNG HỌC đã có kênh #viec-nhom" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục: G1 "Ôn thi Giải tích 2" đang chọn (vạch trái 4 × 40 `text-primary`), `#hoi-dap` selected | |
| `no-server` | Rail chỉ có 💬 và ＋; vùng danh sách là `EmptyState` (mascot neutral 96); **không có dải chat** (không có kênh để quay về), drawer không đóng được (Back hệ thống đưa app ra nền — v1.9, CR-15); tab Việc không badge (chưa ở server nào thì không có việc nhóm) | "Chưa có server nào" · "Tạo Study Server để học cùng bạn bè, hoặc nhập mã mời bạn bè gửi." · "Tạo Study Server" (`primary`) · "Nhập mã mời" (`secondary`) (SRS 3.5) |
| `focus-running` | Hai phòng có phiên học (`ChannelRow · focus-running`); An đang ở "Phòng học im lặng" → hàng `connected`; `MiniPlayer` trên `TabBar` | Pha theo `PhaseBadge · list` ("Tập trung · còn 12 phút", "Nghỉ ngắn · còn 3 phút") |
| `unread-mention` | Rail: G1 badge "1", G2 badge "2", G3 chấm chưa đọc; 💬 badge "1"; danh sách: `#tai-lieu` unread, `#viec-nhom` mention "1"; badge tab Home "4" (1 + 2 + 1 DM) | |
| `collapsed` | Category "THÔNG TIN" thu gọn (`▸`): chỉ còn hàng kênh đang chọn hoặc có mention nằm dưới tiêu đề (`#chao-mung` không chọn, không mention nên ẩn) | Trạng thái thu gọn nhớ theo máy, theo server |
| `loading` | Rail hiện icon server từ cache; danh sách kênh 8 `Skeleton` hàng | |
| `offline` | `Banner · offline` trên đầu danh sách kênh; dữ liệu cache | "Bạn đang offline" |
| `no-connect` | "Phòng thảo luận nhóm" thiếu `CONNECT`: `ChannelRow · no-connect`; chạm → `Toast` | "Bạn không có quyền vào phòng này" |
| `channel-menu` 🆕 | (21/10/2026, area 08) Có `MANAGE_CHANNELS` (hoặc `MANAGE_STUDY_ROOMS` với kênh voice), nhấn giữ một kênh: `ActionSheet` tên kênh + "Cài đặt kênh" (→ 08 S-SET-06 · voice / S-SET-06) + "Sắp xếp kênh" (chỉ `MANAGE_CHANNELS`) | Không có quyền: nhấn giữ không làm gì |
| `category-menu` 🆕 | (21/10/2026, area 08 Q13–Q14; đổi 22/10) Có `MANAGE_CHANNELS`: nhấn giữ tiêu đề danh mục → `ActionSheet` "THÔNG TIN" · "Danh mục · 5 kênh" (v1.9: thêm `#chao-mung`): "Đổi tên danh mục" (→ 08 `category-rename`) · "Quyền của danh mục" (→ 08 `category-overwrites`) · "Xóa danh mục" (→ 08 `category-delete-confirm`); tiêu đề danh mục có nút `plus` 24 bên phải (→ 08 S-SET-09 với danh mục chọn sẵn) | Không có quyền: không có `plus`, nhấn giữ chỉ thu gọn như chạm |
| `reordering` (P2) | Chọn "Sắp xếp kênh" ở `channel-menu` (đổi 21/10/2026, trước đây nhấn giữ là kéo ngay): hàng nổi lên (`surface-3`, bóng sheet), kéo được qua category; hàng khác dịch chỗ; kéo tới mép trên / dưới thì danh sách tự cuộn. Cuối danh sách có dòng `label` `text-tertiary` "Kéo để đổi vị trí kênh" (như frame). Danh sách có `#chao-mung` đầu THÔNG TIN | Thả → lưu (SRV-02 AC1). Kéo lên vùng trên cùng (trước tiêu đề danh mục đầu tiên) là bỏ kênh ra khỏi danh mục; thả dưới một tiêu đề là đưa vào danh mục đó (22/10/2026, CR-11) |
| `drop-blocked` 🆕 | (v1.9, CR-17 #3) Thả `#viec-nhom` (THÔNG TIN) vào PHÒNG HỌC khi PHÒNG HỌC đã có một kênh text `#viec-nhom` (frame: PHÒNG HỌC gồm Phòng học im lặng, Phòng thảo luận nhóm, `# viec-nhom`): hàng về chỗ cũ trong THÔNG TIN, không gọi API, `Toast` trên `TabBar` | "PHÒNG HỌC đã có kênh #viec-nhom" (vùng trên cùng: "Trên cùng danh sách đã có kênh #tai-lieu") |
| `uncategorized` 🆕 | (22/10/2026, CR-11) Kênh không thuộc danh mục nào nằm **trên cùng danh sách, trước danh mục đầu tiên, không có tiêu đề nhóm**, xếp theo `position`. Frame vẽ sau khi xóa danh mục THÔNG TIN: `#chao-mung`, `#thong-bao`, `#tai-lieu`, `#hoi-dap`, `#viec-nhom` ở trên cùng (v1.9: thêm `#chao-mung` đầu), rồi tiêu đề PHÒNG HỌC | Kênh không danh mục không thu gọn được (không có tiêu đề để chạm) |
| `reports-pending` 🆕 | (v1.9, CR-18 #10) An thấy hàng đợi báo cáo: `Badge · count · neutral` "2" (nền `surface-3`, chữ `text-primary`) ngay sau tên server "Ôn thi Giải tích 2", trước `⌄`; cùng số với menu server (S-HOME-09) và Cài đặt server › Báo cáo; "99+" khi nhiều | `accessibilityLabel` thêm ", 2 báo cáo đang chờ". Không thấy hàng đợi: không có badge |

Không áp dụng: `error` (danh sách server/kênh luôn có cache từ `READY`; lỗi kết nối dùng `reconnecting` ở S-HOME-01), `forbidden` (kênh không có `VIEW_CHANNEL` thì không hiện), `os-permission`.

### Tương tác
- Chạm icon server → danh sách kênh đổi sang server đó (drawer vẫn mở); chạm kênh → đóng drawer, mở kênh.
- Chạm kênh voice / phòng học → S-ROOM-01 `not-joined` hoặc S-ROOM-02 `not-joined` (xem trước, chưa vào phòng — 03).
- Chạm 💬 → S-DM-01 thay chỗ danh sách kênh (rail giữ nguyên, 💬 có vạch chọn).
- Chạm ＋ → S-HOME-06. Chạm tên server → S-HOME-09. Chạm "Mời bạn" → S-HOME-07.
- Nhấn giữ icon server: không làm gì ở MVP.

### Checklist duyệt
- [ ] 14 state (gồm `channel-menu`, `reordering`, `category-menu`, `uncategorized`, `drop-blocked`, `reports-pending`); `default` và `focus-running` cả hai theme; khung 360 (drawer 304, tên phòng dài cắt `…`).
- [ ] Mọi frame có danh mục THÔNG TIN của "Ôn thi Giải tích 2" có `# chao-mung` đứng đầu; không còn nhãn "Im lặng".
- [ ] Badge rail = tổng mention các kênh của server (khớp dữ liệu mẫu); badge báo cáo trung tính, không đỏ.
- [ ] Hàng `focus-running` đọc pha không cần màu.
- [ ] Ở 200%: tên server và tên kênh 1 dòng cắt `…`; dòng phụ pha bỏ avatar trước khi cắt chữ (C-05).

---

## S-HOME-03 · Drawer phải: Thành viên / Việc / Ghim

**Mục đích:** xem ai trong kênh, việc của nhóm, tin đã ghim.
**REQ:** STUDY-06, MSG-10, NOTIF-01, AUTH-05, SRS 3.1, UF-06, UF-08.
**Mở từ:** `👥` hoặc vuốt trái ở S-HOME-01 / S-HOME-08. **Đi tới:** S-HOME-10 (chạm thành viên), S-TASK-02 (chạm task), S-TASK-03 ("Thêm việc"; "Sửa" ở menu hàng việc), S-HOME-01 cuộn tới tin (chạm tin ghim), S-SET-06 ("Bật Task Board").

### Bố cục
```
┌ Status bar ──────────────────────────────┐
│░░░░░┌────────────────────────────────────┤
│░░░░░│ # hoi-dap                          │  tên kênh, headline
│░░░░░│ [● Thành viên | Việc | Ghim · 3]   │  SegmentedControl (C-20)
│░░░░░│ TRỰC TUYẾN — 6                    │  tiêu đề nhóm, label
│░░░░░│ (A)● An  an.nguyen          Owner  │  MemberRow (C-28): tên + username, role bên phải
│░░░░░│ (B)● Bình  binh.tran  Trưởng nhóm  │
│░░░░░│ (C)◐ Chi  chi.le  Điều phối phòng… │
│░░░░░│ (D)● Dũng  dung.pham               │  hàng 56: dòng 2 hoạt động học dạng ngắn
│░░░░░│      [lamp] Một mình · còn 12 phút │
│░░░░░│ (H)● Hà  ha.nguyen                 │
│░░░░░│      Đang học cùng nhóm            │
│░░░░░│ (K)⊖ Khánh  khanh.le               │
│░░░░░│ NGOẠI TUYẾN — 18                   │
│░░░░░│ (G)○ Giang  giang.vo               │  mờ: tên text-secondary
│░░░░░└────────────────────────────────────┤
├ TabBar (Home) ───────────────────────────┤
```
(v1.9, CR-25 #14, #15) Dòng 1 mọi hàng: tên + username `label` `text-tertiary`; thiếu chỗ thì cắt username "…" trước, rồi role, rồi tên. Hàng có hoạt động cao 56, không có 48.

### Component
`SegmentedControl` (C-20, 3 mục), `MemberRow` (C-28, username + dòng hoạt động), `TaskRow` (C-12), `SearchField` (C-02), `ActionSheet` (C-09), `MessageBubble · pinned` (C-10), `Button`, `EmptyState · inline`, `Skeleton`, `Toast`, `TabBar`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Segmented | "Thành viên" · "Việc" · "Ghim" (kèm số khi > 0: "Ghim · 3") |
| Nhóm thành viên | "TRỰC TUYẾN — 6" · "NGOẠI TUYẾN — 18" |
| Nhóm task | "ĐANG LÀM — 1" · "CẦN LÀM — 4" · "XONG — 4" (nhóm Xong thu gọn sẵn) |
| Nút task | "Thêm việc" (`plus`) |
| Ô tìm việc (v1.9, CR-20 #8) | "Tìm việc theo tên" |
| Không có kết quả | "Không có việc nào khớp "{từ khóa}"" · "Thử từ khóa khác." · offline: "Đang offline · chỉ tìm trong việc đã lưu trên máy" |
| Toast đổi trạng thái (v1.9, CR-20 #2, #10) | "Đã xong · Hoàn tác" · "Đã mở lại · Hoàn tác" · "Đã chuyển sang Đang làm · Hoàn tác" · "Đã chuyển sang Cần làm · Hoàn tác" · "Đã sao chép link việc" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `members` | Như bố cục. Chỉ thành viên **xem được kênh này** (`VIEW_CHANNEL`); online gồm cả Idle và DND; mỗi nhóm xếp theo tên (bảng chữ cái tiếng Việt), phá hòa bằng username; bên phải theo C-28: An "Owner", Bình "Trưởng nhóm", Chi "Điều phối phòng học" (sửa 21/10/2026 — frame cũ thiếu nhãn của An và Chi). (v1.9, CR-25) Mọi hàng có username; Dũng có dòng 2 icon `lamp-desk` (`phase-focus`) "Một mình · còn 12 phút", Hà có dòng 2 "Đang học cùng nhóm" (dạng ngắn, C-28); hàng của An không có hoạt động | Phần "còn N phút" không bao giờ bị cắt; câu đầy đủ ở `accessibilityLabel` và ở khối hoạt động của S-HOME-10 |
| `task-board` | Ở `#viec-nhom`: (v1.9, CR-20 #8) `SearchField` "Tìm việc theo tên" ngay dưới `SegmentedControl`, rồi nút "Thêm việc" (có `CREATE_TASKS`); 3 nhóm theo trạng thái; trong nhóm: deadline tăng dần, không hạn xuống cuối, phá hòa bằng thời điểm tạo. Mẫu (sửa 19/10/2026 cho khớp 05; v1.9, CR-20 #5 hạn luôn có giờ): ĐANG LÀM "Giải đề giữa kỳ 2024" ("Quá hạn · 16/10 · 23:59", Dũng); CẦN LÀM — 4: "Đọc tài liệu chương 5" ("Hôm nay · 21:00", An), "Ôn chương 4 — tích phân bội" ("Hôm nay · 23:00", An + Chi), "Nộp báo cáo giữa kỳ" ("Thứ 6, 23/10 · 23:59", An + Bình), "Làm slide thuyết trình" ("Không hạn", Chưa giao); XONG — 4 **vẽ ở dạng đã mở** (chạm tiêu đề) để thấy hàng Xong (v1.9, CR-20 #6: dòng phụ icon `check` + "Xong · {ngày} · {giờ}", không "Quá hạn"), mới xong trên cùng: "Tóm tắt chương 3 — đạo hàm riêng" ("Xong · 17/10 · 22:05", An), "Đặt phòng thư viện cho buổi ôn" ("Xong · 16/10 · 09:30", An), "Lập lịch ôn tập" ("Xong · 12/10 · 20:30", Bình), "Tạo kênh tài liệu" ("Xong · 10/10 · 09:15", Tuấn) — hai việc đầu là hai việc Xong của An ở Ôn thi Giải tích 2 trong 05 (rà 31/10/2026: việc Xong có An ở kênh này phải trùng tên, trùng giờ với danh sách Đã xong của 05 và ngược lại); hai hàng cuối nằm dưới mép, danh sách cuộn | (v1.9, CR-20 #9) XONG giữ **mọi** việc đã xong, thu gọn sẵn, tải 50 việc / lần + "Xem thêm"; offline "Xem thêm" `disabled` |
| `task-search` 🆕 | (v1.9, CR-20 #8) Gõ "chuong" vào ô tìm: "Thêm việc" ẩn; kết quả thay danh sách thường, chia nhóm (nhóm rỗng ẩn): CẦN LÀM — 2 "Đọc tài liệu chương 5", "Ôn chương 4 — tích phân bội"; XONG — 1 (mở sẵn) "Tóm tắt chương 3 — đạo hàm riêng" ("Xong · 17/10 · 22:05", An — khớp 05 S-TASK-01 `search`). Không tô phần khớp; bàn phím mở | Không phân biệt dấu, hoa thường ("đ" = "d"), tìm sau khi ngừng gõ 300 ms, từ 1 ký tự; không có kết quả: chữ ở Nội dung chữ |
| `task-row-menu` 🆕 | (v1.9, CR-20 #10) Nhấn giữ "Nộp báo cáo giữa kỳ": hàng nhấc lên trên scrim (`surface-2`) + `ActionSheet` tiêu đề "Nộp báo cáo giữa kỳ" (1 dòng, cắt "…"): nhóm "TRẠNG THÁI" — "Cần làm" (✓) · "Đang làm" · "Xong"; "Sửa" (`pencil`) → S-TASK-03 `edit`; "Sao chép link việc" (`link`); "Xóa việc" (`trash-2`, `danger`) → S-TASK-02 `delete-confirm` | Chỉ hiện mục người xem làm được (tối thiểu "Sao chép link việc"); rung nhẹ khi mở. Đổi trạng thái từ sheet gửi ngay, `Toast` tương ứng; hàng đổi nhóm khi toast ẩn |
| `task-empty` | Task Board bật nhưng chưa có task | "Chưa có việc nào" · "Thêm việc đầu tiên để cả nhóm cùng theo dõi." · "Thêm việc đầu tiên" (SRS 3.5) |
| `task-board-off` | Kênh chưa bật Task Board. Frame vẽ trường hợp **có** `MANAGE_CHANNELS` (sửa 22/10/2026: mỗi frame một trường hợp) | Có quyền: "Kênh này chưa bật Task Board" + `Button · secondary` "Bật Task Board" → S-SET-06. Không có quyền (chỉ ghi luật, không vẽ): không có nút, thay bằng dòng "Người quản lý kênh có thể bật trong cài đặt kênh." |
| `pins` | Tin ghim mới nhất trên cùng, mỗi tin dạng `MessageBubble · pinned` (tên, giờ theo luật v1.9, 3 dòng đầu, cắt `…`). Mẫu của `#hoi-dap` (sửa 22/10/2026 — bản cũ trùng tin của `#thong-bao` mà lệch ngày; v1.9, CR-19 #3 cách ghi giờ): Bình "Hôm qua 21:05" "Lời giải đề giữa kỳ 2024 đã có ở #tai-lieu…", Chi "16/10/2026 19:40" công thức tọa độ cực, Tuấn "12/10/2026 08:30" "Hỏi bài nhớ ghi rõ chương và số câu…" | Nhấn giữ (có `MANAGE_MESSAGES`) → "Bỏ ghim" |
| `pins-empty` | Chưa có tin ghim | "Chưa có tin nhắn được ghim" · "Người quản lý kênh nhấn giữ một tin nhắn để ghim." |
| `loading` | `Skeleton` 8 hàng thành viên / 4 hàng task | |
| `offline` | Dữ liệu cache, `Banner · offline`; "Thêm việc" và ô trạng thái `disabled` (CR-28: outbox ở MVP chỉ cho tin nhắn); tìm việc chỉ trong dữ liệu đã lưu, dòng `label` dưới ô tìm | "Đang offline · chỉ tìm trong việc đã lưu trên máy" · dòng lý do "Cần kết nối mạng để thêm hoặc đổi việc" |

Mục đang chọn của `SegmentedControl` nhớ theo kênh trong phiên mở app; mở lần đầu là "Thành viên". Kênh voice (S-HOME-08): chỉ 2 mục "Thành viên" · "Ghim", nhóm đầu là "TRONG PHÒNG — 9".

Không áp dụng: `error` (dữ liệu có từ cache / `READY`), `forbidden` (ai mở được kênh thì xem được cả 3 mục), `os-permission`.

### Tương tác
- Chạm thành viên → S-HOME-10. Chạm task → S-TASK-02 (cùng màn hình với tab Việc; TabBar vẫn sáng Home; Back về kênh, drawer phải mở lại ở mục Việc). "Thêm việc" → S-TASK-03 `create`. Chạm tin ghim → đóng drawer, cuộn tới tin (tải `around=<id>` nếu chưa có).
- (v1.9, CR-20 #2) Chạm ô trạng thái → công tắc Xong / mở lại như ở tab Việc (C-12), **gửi ngay**; "Hoàn tác" là một lần đổi mới về trạng thái trước lần chạm; `Toast` 6 giây, hàng đổi nhóm khi toast ẩn. Offline: công tắc `disabled` (CR-28; "Hoàn tác rút lần đổi khỏi outbox" là v1.x).
- (v1.9, CR-20 #10) Nhấn giữ hàng việc → `task-row-menu`. Hàng `pending` / lưu thất bại giữ luật cũ (nhấn giữ → "Xóa bản nháp").
- Danh sách thành viên không tự xếp lại khi có người đổi online/offline lúc đang mở; xếp lại khi mở lại drawer. Dòng hoạt động cập nhật mỗi phút, không đếm giây.

### Checklist duyệt
- [ ] 10 state; `members` và `task-board` cả hai theme.
- [ ] Mọi hàng thành viên có username; dòng hoạt động không cắt phần "còn N phút".
- [ ] Hạn ở hàng việc luôn có giờ; việc Xong ghi "Xong · …", không "Quá hạn"; task quá hạn có icon + chữ "Quá hạn", không chỉ màu (C-12).
- [ ] Ở 200%: tên thành viên cắt `…`, username xuống dòng riêng một dòng, role xuống dòng dưới tên; tiêu đề task tối đa 2 dòng.

---

## S-HOME-04 · Action sheet tin nhắn (nhấn giữ)

**Mục đích:** thao tác trên một tin nhắn.
**REQ:** MSG-02, MSG-05, MSG-10, MSG-11, SAFE-01, SRS 3.1, UF-09.
**Mở từ:** nhấn giữ tin ở S-HOME-01 / S-HOME-08; chạm tin `failed`. **Đi tới:** S-HOME-01 (`reply-mode` / `edit-mode`), S-MOD-02 (Báo cáo), `EmojiPicker` (C-25), dialog xóa, dialog gỡ xem trước link.

### Bố cục
```
│ (scrim)                                  │
├──────────────────────────────────────────┤
│              ───                         │  thanh kéo
│ [👍] [❤️] [😂] [😮] [🎉] [🙏]   [☺+]    │  hàng reaction nhanh, ô 48
│ ──────────────────────────────────────── │
│ ↩  Trả lời                               │  ActionSheet hàng 56
│ ✎  Sửa tin nhắn                          │  chỉ tin của mình
│ 📌 Ghim tin nhắn                         │  MANAGE_MESSAGES
│ ⧉  Sao chép văn bản                      │  tin có chữ
│ 🔗 Sao chép link tin                     │  tin đã gửi (v1.9, CR-19 #2)
│ ⛓ Gỡ xem trước link                      │  tin có thẻ xem trước + người xem được gỡ (v1.9, CR-19 #15)
│ ⚑  Báo cáo                               │  chỉ tin người khác
│ 🗑  Xóa tin nhắn                          │  danger
└──────────────────────────────────────────┘
```
Không có hàng "Hủy" riêng: vuốt xuống, chạm scrim hoặc nút Back hệ thống đóng sheet (C-09).
Tin đang nhấn giữ được **nhấc lên trên scrim** với nền `surface-2` (cả tin, đúng vị trí trong danh sách) để user thấy mình đang thao tác trên tin nào; áp dụng cho mọi state kể cả `delete-confirm` (tin nằm dưới dialog) và `emoji-picker` (sửa 22/10/2026). (v1.9, CR-19 #13) Tin gộp nhóm khi được nhấc lên hiện giờ của chính nó ("20:04", `label` `text-tertiary`, chỉ `HH:mm`) ở cột avatar.
Icon: "Sao chép link tin" `link`, "Gỡ xem trước link" `link-2-off`. "Sao chép link tin" đứng ngay sau "Sao chép văn bản"; "Gỡ xem trước link" ngay sau đó.

### Trạng thái
| State | Hàng có trong sheet |
|---|---|
| `own-message` | (Góc nhìn thành viên thường; ở "Ôn thi Giải tích 2" An là Owner nên có thêm "Ghim tin nhắn") Reaction · Trả lời · Sửa tin nhắn · Sao chép văn bản · Sao chép link tin · Xóa tin nhắn |
| `others-message` | (Góc nhìn thành viên thường) Reaction · Trả lời · Sao chép link tin · Báo cáo. (v1.9, CR-19 #13) Frame vẽ trên **tin gộp** Chi 20:04 (ảnh `cau3.jpg`) để thấy giờ "20:04" ở cột avatar khi nhấc lên; tin chỉ có ảnh nên không có "Sao chép văn bản" (tin có chữ: thêm hàng này trước "Sao chép link tin") |
| `moderator` | Tin người khác, An có `MANAGE_MESSAGES`: Reaction · Trả lời · Ghim tin nhắn (hoặc "Bỏ ghim") · Sao chép văn bản · Sao chép link tin · Gỡ xem trước link (chỉ khi tin có thẻ) · Báo cáo · Xóa tin nhắn. Tin của moderator khác cũng vậy (xóa và gỡ thẻ không theo thứ bậc role, MSG-05, MSG-02). (v1.9) Frame vẽ trên tin Bình 18:30 ở `#tai-lieu` (thẻ `large` YouTube, nền `link-previews`) để có đủ 8 hàng |
| `system-message` | Tin hệ thống, An có `MANAGE_MESSAGES`: chỉ "Xóa tin nhắn". Không có quyền: nhấn giữ không mở sheet (MSG-11). Không có "Sao chép link tin" |
| `failed-message` | Tin của An gửi lỗi: "Gửi lại" · "Xóa tin nhắn" (xóa khỏi outbox, không hỏi lại). Không có "Sao chép link tin" (tin chưa gửi được) |
| `failed-file-blocked` 🆕 | (v1.9, CR-19 #7) Tin của An "Không gửi được · 1 tệp bị chặn" (đã bấm ➤ khi tệp còn đang tải, sau đó `cong-thuc.png` bị chặn): "Gửi không kèm tệp bị chặn" · "Xóa tin nhắn" |
| `timed-out` | (Góc nhìn thành viên thường) An đang bị tạm khóa: chỉ "Sao chép văn bản", "Sao chép link tin" và "Báo cáo" (không reaction, không trả lời) |
| `delete-confirm` | `Dialog`: "Xóa tin nhắn?" · `body` "Tin nhắn sẽ bị xóa với mọi người." + (v1.9, CR-18 #6) "2 báo cáo về tin này sẽ chuyển sang Đã xử lý." + bản xem trước tin (2 dòng, `surface-2`) · "Hủy" / "Xóa" (`danger`). Frame vẽ trên tin Khánh 20:05 (An xóa với vai Owner; tin đang có 2 báo cáo chờ mà An thấy). Câu báo cáo chỉ hiện khi người xóa thấy báo cáo đó (CR-18 #3); xóa tin của mình / tin không bị báo cáo: không có câu này |
| `embed-remove-confirm` 🆕 · **v1.x** (CR-28 #8; MVP không có hàng "Gỡ xem trước link") | (v1.9, CR-19 #15) Chạm "Gỡ xem trước link" trên tin Bình 18:30: `Dialog` "Gỡ xem trước link?" · "Thẻ xem trước sẽ biến mất với mọi người. Link trong tin vẫn giữ." · "Hủy" / "Gỡ" (`danger`); tin có thẻ nằm dưới dialog, nhấc lên |
| `emoji-picker` | Chạm `☺+` → sheet `EmojiPicker` (C-25) thay chỗ action sheet |

### Tương tác
- Chạm reaction nhanh → thả (hoặc gỡ nếu đã thả), đóng sheet, rung nhẹ. Tin đã đủ 20 loại → `Toast` "Tin nhắn này đã đủ 20 loại cảm xúc" (40905).
- "Sao chép văn bản" → `Toast` "Đã sao chép". (v1.9, CR-19 #2) "Sao chép link tin" → chép `https://nezfocus.app/channels/<server_id>/<channel_id>/<message_id>` (DM: `…/dm/<channel_id>/<message_id>`) + `Toast` "Đã sao chép". "Ghim" → tin hệ thống "An đã ghim một tin nhắn"; đủ 50 tin → `Toast` "Kênh đã có 50 tin ghim. Bỏ ghim bớt để ghim tin mới." (40904).
- (v1.9, CR-19 #15) "Gỡ" ở `embed-remove-confirm` → mọi thẻ của tin biến mất với mọi người; sửa tin sau đó không tạo lại thẻ đã gỡ.
- (v1.9, CR-18 #6) Xóa tin đang bị báo cáo → mọi báo cáo đang chờ về tin chuyển sang Đã xử lý; không có Toast thêm.
- (v1.9, CR-19 #7) "Gửi không kèm tệp bị chặn" → gửi lại tin bỏ tệp bị chặn, các tệp còn lại giữ.
- Thao tác thất bại do mất quyền giữa chừng (40302) → `Toast` "Bạn không còn quyền làm việc này".

### Checklist duyệt
- [ ] 10 state, mỗi state một frame.
- [ ] "Sao chép link tin" có ở `own-message`, `others-message`, `moderator`, `timed-out`; không có ở `system-message`, `failed-message`.
- [ ] Tin gộp nhấc lên có giờ ở cột avatar.
- [ ] Hàng phá hủy: icon + chữ `danger`; dialog dùng `Button · danger` "Xóa" / "Gỡ".
- [ ] Ở 200%: hàng reaction cuộn ngang, các hàng thao tác cao theo chữ.

---

## S-HOME-05 · Đính kèm & tải lên (P2)

**Mục đích:** gửi ảnh, video, tệp.
**REQ:** MSG-04, NFR-MOB-07/10.
**Mở từ:** `+` trên `Composer`. **Đi tới:** photo picker của hệ thống, camera (S-MOD-05 `camera` nếu bị từ chối), bộ chọn tệp của hệ thống; S-HOME-01 sau khi gửi.

### Bố cục (`uploading`)
```
│ ┌──────┐┌──────┐┌────────────────────┐   │  AttachmentTray (C-29), cao 64, cuộn ngang
│ │ ◔    ││  ✓   ││ [PDF] de-giua…2025.pdf│ │  ảnh 64 × 64 · tệp không phải ảnh 64 × 160 (v1.9, CR-19 #9)
│ │   [x]││   [x]││       1,8 MB     [x]│   │  icon loại 24 + tên label 500 (cắt giữa, giữ đuôi) + cỡ label text-tertiary
│ └──────┘└──────┘└────────────────────┘   │
│ Đang tải lên 1/3                         │  label, text-secondary
│ [+] [ Thêm chú thích…          ] [☺] [➤] │  Composer
```

### Trạng thái

**(05/11/2026, CR-28) MVP-Đồ án chỉ gửi ảnh** (REQ-MSG-04): `picking` chỉ còn hai lựa chọn "Ảnh" (photo picker, chỉ ảnh) và "Chụp ảnh" — frame `S-HOME-05 · picking` đã sửa theo. Phần dành cho tệp không phải ảnh (ô tệp 64 × 160 và ô PDF trong `uploading` / `checking`, `unsupported` với tệp thực thi, lý do virus của `rejected`) là **v1.x**: frame giữ nguyên để dùng sau, bản MVP chỉ dựng phần ảnh (`rejected · fake-type`, `too-large`, `too-many` vẫn áp cho ảnh).

| State | Khác gì | Chữ / hành động riêng |
|---|---|---|
| `picking` | `BottomSheet` 2 lựa chọn, icon + nhãn (CR-28; v1.x thêm lại "Tệp" và video) | "Ảnh" (photo picker, không cần quyền thư viện) · "Chụp ảnh" |
| `uploading` | Như bố cục: thumbnail ảnh là **ảnh xem trước** (cắt vuông) ngay từ lúc chọn; tệp đang tải phủ scrim + vòng tiến độ; tệp xong có dấu ✓ (tròn `primary` 24, `check` `on-primary`) ở giữa; (v1.9, CR-19 #9) ô tệp không phải ảnh rộng 160: icon loại + tên + cỡ ("de-giua…2025.pdf" · "1,8 MB"); ô có lớp phủ trạng thái thì chữ trạng thái thay tên + cỡ. Tải lên ngay khi chọn; ➤ bấm được — tin vào `pending` và chỉ gửi khi mọi tệp xong và qua kiểm tra | "Đang tải lên 1/3"; `x` trên thumbnail → hủy tệp đó; TalkBack: "de-giua-ky-2025.pdf, đang tải lên 62%" |
| `checking` 🆕 | (v1.9, CR-19 #7) Ô tải xong chờ backend kiểm tra: lớp phủ + vòng xoay + "Đang kiểm tra" (ô PDF: chữ thay tên + cỡ; ô ảnh: chỉ vòng xoay). Frame: ảnh ✓, PDF `checking` | |
| `upload-failed` | Thumbnail lỗi: icon `rotate-cw` thay vòng tiến độ, viền `danger` | "Tải lên thất bại · chạm để thử lại" (mạng rớt, MSG-04 AC4 — không tạo tin trùng) |
| `rejected` 🆕 | (v1.9, CR-19 #6, #7) Backend từ chối ở bước kiểm tra: ô viền 2 `danger`, lớp phủ, icon `file-x` + "Bị chặn", chỉ còn `x`; dòng dưới khay `danger` nêu lý do. Hai frame: **`rejected · fake-type`** — ảnh `cong-thuc.png` (`40014`), dòng "cong-thuc.png không phải tệp ảnh thật nên không gửi được"; **`rejected · virus`** — ô tệp `bai-tap-ve-nha.zip` 64 × 160 (`40019`), dòng "bai-tap-ve-nha.zip không an toàn nên không gửi được" | Loại khác của `40014`: "{tên} không đúng loại tệp nên không gửi được". Còn ô `rejected` / `upload-failed` mà bấm ➤ → không gửi, dòng thành "Gỡ hoặc thử lại tệp lỗi để gửi" |
| `unsupported` 🆕 | (v1.9, CR-19 #5) Chọn tệp thực thi / cài đặt (.exe, .msi, .apk, .aab, .bat, .cmd, .scr, .jar, .dll) hoặc media ngoài danh sách từ "Ảnh & video" (vd. .3gp, .mov): không vào khay; `Toast` trên `Composer`. Frame: khay trống, toast một tệp | "Không gửi được tệp .exe" · nhiều tệp: "Không gửi được 2 tệp vì loại tệp không hỗ trợ" |
| `too-large` | Tệp > 25MB không được thêm vào khay; `Toast` | "\"bao-cao-cuoi-ky.pdf\" lớn hơn 25MB nên không gửi được" (40013, kiểm tra trước khi tải) |
| `too-many` | Chọn quá 10 tệp: chỉ thêm 10 tệp đầu; `Toast` | "Mỗi tin gửi tối đa 10 tệp" |

(v1.9, CR-19 #5, #6) **Bỏ `blocked-file`**: tệp không còn bị chặn sau khi gửi (tin đã hiện rồi mất tệp); mọi kiểm tra xong trước khi gửi (`checking` → `rejected`). Loại tệp cho phép theo REQ-MSG-04; đuôi lạ khác vẫn tải lên để bước kiểm tra quyết theo nội dung. Ảnh HEIC / HEIF từ "Ảnh & video" hoặc "Chụp ảnh" được chuyển sang JPEG trên máy trước khi tải (không có giao diện riêng).

Không áp dụng: `empty`, `loading`, `forbidden` (không có `ATTACH_FILES` thì `+` ẩn — C-11), `offline` (chọn tệp được, tải lên chờ có mạng như outbox: dùng `upload-failed` với chữ "Sẽ tải lên khi có mạng").

### Checklist duyệt
- [ ] 8 state (9 frame: `rejected` 2 frame); thumbnail ảnh hiện trước khi tải xong (NFR-MOB-07); ô tệp 64 × 160 có tên cắt giữa giữ đuôi.
- [ ] Lỗi tệp có icon + chữ, không chỉ viền đỏ.

---

## S-HOME-06 · Tạo / tham gia server

**Mục đích:** tạo Study Server (hoặc server thường), hoặc vào server bằng mã mời.
**REQ:** SRV-01, SRV-04, SRV-07, STUDY-05, UF-02, UF-03, NFR-USAB-01.
**Mở từ:** ＋ trên rail; "Tạo Study Server" / "Nhập mã mời" ở S-HOME-02 `no-server`. (v1.9, CR-16 #5) Không còn mở từ S-ONB-02 (màn đã bỏ). **Đi tới:** S-HOME-01 `#chao-mung` của server mới (v1.9, CR-17 #2) kèm S-HOME-07 mở sẵn; S-MOD-01 (mã hợp lệ); S-ROOM-09 `first-server` (sau khi đóng S-HOME-07, nếu chưa từng xin quyền thông báo).

### Bố cục (`choose-template`)
```
┌ Status bar ──────────────────────────────┐
│ ‹  Thêm server                           │  ScreenHeader
│ Tạo server mới                           │  title-2
│ ┌──────────────────────────────────────┐ │
│ │ [lamp] Study Server        Gợi ý     │ │  thẻ chọn (radio), viền primary khi chọn
│ │ Có sẵn kênh chào mừng, thông báo, tài│ │
│ │ liệu, hỏi đáp, việc nhóm và 2 phòng  │ │  (v1.9, CR-17: 5 kênh text)
│ │ học 25/5.                            │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ [hash] Server thường                 │ │
│ │ Một kênh chat và một phòng thoại.    │ │
│ └──────────────────────────────────────┘ │
│ Đã có lời mời?                           │  title-2
│ [ticket] Nhập mã mời                   › │  SettingsRow (C-15)
│                                          │
│ [            Tiếp tục            ]       │  Button · primary · L
```

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `choose-template` | Như bố cục; Study Server chọn sẵn | "Tiếp tục" → `name-server`. Mô tả thẻ: "Có sẵn kênh chào mừng, thông báo, tài liệu, hỏi đáp, việc nhóm và 2 phòng học 25/5." |
| `name-server` | `ScreenHeader` "Tạo Study Server"; ô ảnh tròn 96 "Thêm ảnh" (tùy chọn, photo picker); `TextField` "Tên server" placeholder "VD: Ôn thi Giải tích 2"; nút "Tạo server". (08/11/2026, P1-A1.3) Chọn "Server thường": header "Tạo server thường", placeholder "VD: CLB Guitar PTIT"; frame giữ bản Study Server | Kiểm tra khi bấm: "Tên server cần 2–100 ký tự" (40001) |
| `creating` | Nút "Tạo server" `loading`; ô nhập khóa | |
| `create-error` | `FormMessage` trên nút | 40011: "Bạn đã ở 100 server, mức tối đa. Rời bớt một server để tạo server mới." · mạng: "Không tạo được server. Kiểm tra kết nối rồi thử lại." |
| `created` | Không có màn chúc mừng riêng: vào thẳng S-HOME-01 `#chao-mung` của server mới (`empty`; v1.9, CR-17 #2 — kênh text đầu tiên xem được; server thường: `#general`), S-HOME-07 mở sẵn | Tiêu đề sheet S-HOME-07: "Mời bạn vào Ôn thi Giải tích 2" |
| `join-by-code` | `ScreenHeader` "Nhập mã mời"; `TextField` "Mã hoặc link mời" (JetBrains Mono khi có chữ) + nút "Dán" bên trong ô; gợi ý dưới ô; nút "Tiếp tục" | Gợi ý: "VD: k7Qm2xPa hoặc https://nezfocus.app/invite/k7Qm2xPa". Dán link → app tự tách mã |
| `join-error` | Lỗi dưới ô, giữ user ở màn này | Sai định dạng: "Mã mời gồm 8–10 chữ và số, hoặc dán cả link". 40041: "Lời mời không tồn tại hoặc đã hết hạn. Xin bạn bè gửi lời mời mới." 40306: "Bạn không thể tham gia server này". 40029: "Bạn thử quá nhiều mã. Thử lại sau 1 phút." |
| `keyboard-open` | `OS/Keyboard · text` ở `name-server` (phím "Xong") và `join-by-code` (phím "Tiếp"); nút chính nằm ngay trên bàn phím (C-02). Hai frame: `keyboard-open · name`, `keyboard-open · code` | |
| `offline` | Nút chính `disabled` kèm dòng "Cần kết nối mạng để tạo hoặc tham gia server" (`wifi-off`) | |
| `restore` 🆕 | (21/10/2026, area 08 Q16) An có server đã xóa trong 30 ngày: dưới "Nhập mã mời" thêm `SettingsRow` "Server đã xóa" (icon `archive-restore`, giá trị "1") | Chỉ hiện khi có |
| `restore-list` 🆕 | Chạm hàng → màn "Server đã xóa": mỗi hàng icon server + tên + "Còn 30 ngày để khôi phục" + `Button · secondary · S` "Khôi phục" → server về rail, mở server đó + `Toast` "Đã khôi phục Ôn thi Đại số tuyến tính". Server đã xóa mẫu là **"Ôn thi Đại số tuyến tính"** (đổi 22/10/2026 — trùng tên server đang dùng gây nhầm), tên 1 dòng cắt `…` | Offline: nút `disabled` |

(v1.9, CR-16 #5) **Bỏ `from-onboarding`**: S-ONB-02 không còn; hoàn tất tài khoản xong không có lời mời thì vào Home `no-server`, từ đó mở màn này như thường (có `TabBar`).

Không áp dụng: `loading`, `empty`, `forbidden` (ai đã xác nhận email cũng tạo được server), `os-permission` (photo picker không cần quyền).

### Tương tác
- "Tiếp tục" ở `join-by-code` → tra mã → S-MOD-01 `valid` (hoặc `already-member`); Tham gia ở S-MOD-01 → S-HOME-01 `#chao-mung` (v1.9, CR-17; hoặc kênh trong `?channel=`).
- Back ở `name-server` → `choose-template` (giữ tên đã gõ).

### Checklist duyệt
- [ ] 11 frame state (10 state có frame, `keyboard-open` 2 frame; `created` không có frame riêng); `choose-template` và `name-server` cả hai theme; `keyboard-open` cho 2 form.
- [ ] Mô tả thẻ Study Server có "kênh chào mừng".
- [ ] Gợi ý dưới ô mã xuống dòng trước "https://", không ngắt giữa link.
- [ ] Nút "Dán" chỉ đọc bộ nhớ tạm khi bấm (SRV-07).

---

## S-HOME-07 · Tạo & chia sẻ lời mời

**Mục đích:** lấy link mời và gửi qua Zalo / Messenger.
**REQ:** SRV-03, STUDY-16, DEC-39, UF-02, NFR-USAB-01.
**Mở từ:** "Mời bạn" ở S-HOME-02 / S-HOME-09; tạo server xong (S-HOME-06); "Mời vào phòng" trong Study Room và `alone` của S-ROOM-02 (biến thể `room`). **Đi tới:** bảng chia sẻ của hệ điều hành.

### Bố cục (`default`, BottomSheet)
```
├──────────────────────────────────────────┤
│              ───                         │
│ Mời bạn vào Ôn thi Giải tích 2           │  title-2
│ Gửi link này qua Zalo, Messenger…        │  body, text-secondary
│ ┌──────────────────────────────┬───────┐ │
│ │ nezfocus.app/invite/k7Qm2xPa │Sao chép│ │  ô link, JetBrains Mono
│ └──────────────────────────────┴───────┘ │
│ Hết hạn sau 7 ngày · không giới hạn lượt │  label + "Sửa" · "Thu hồi" (text; "Thu hồi" chữ danger — v1.9, CR-17 #7)
│ [         Chia sẻ link mời         ]     │  Button · primary · L
└──────────────────────────────────────────┘
```

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `loading` | Ô link là `Skeleton`; hai nút `disabled` ("Sao chép" chữ `text-tertiary`, "Chia sẻ link mời" nền `surface-3`); "Sửa" · "Thu hồi" ẩn | Dùng lại invite còn hạn của An với cùng thiết lập nếu có, không thì tạo mới |
| `default` | Như bố cục | Chữ chia sẻ soạn sẵn: "Vào server Ôn thi Giải tích 2 trên NezFocus học cùng mình nhé: https://nezfocus.app/invite/k7Qm2xPa" |
| `copied` | `Toast` ngay trên mép trên của sheet, cách mép ≥ 8 | "Đã sao chép link mời" |
| `edit-settings` | Sheet đổi sang 2 nhóm lựa chọn (radio chip): "Hết hạn sau" 30 phút · 1 giờ · 1 ngày · **7 ngày** · Không bao giờ; "Số lượt dùng" **Không giới hạn** · 1 · 5 · 10 · 25 · 50 · 100; nút "Tạo link mới" | Link cũ vẫn dùng được tới khi hết hạn |
| `revoked` 🆕 | (v1.9, CR-17 #7) Chạm "Thu hồi" (không hỏi lại): ô link thành "Link đã bị thu hồi" (`text-tertiary`, Be Vietnam Pro), "Sao chép" ẩn, dòng thiết lập giữ, "Sửa" · "Thu hồi" ẩn; nút chính thành "Tạo link mới" (cùng thiết lập) | Người tạo **hoặc** `MANAGE_SERVER` thu hồi được; sheet chỉ hiện invite của chính An nên luôn có "Thu hồi" |
| `share-sheet` | Bảng chia sẻ của Android (`OS/ShareSheet`) phủ lên, chữ soạn sẵn ở trên | |
| `room` | **Không có sheet trong app** (STUDY-16 AC1): chạm "Mời vào phòng" mở thẳng `OS/ShareSheet` (frame vẽ trên nền S-ROOM-02 `focus-host`) | "Mình đang học ở Phòng học im lặng (Ôn thi Giải tích 2), vào học cùng nhé: https://nezfocus.app/invite/k7Qm2xPa?channel=…" |
| `error` | Ô link thay bằng dòng lỗi + "Thử lại" | "Không tạo được link mời. Thử lại." |
| `forbidden` | Không có `CREATE_INVITE`: nút "Mời bạn" ở S-HOME-02 / S-HOME-09 **ẩn**; biến thể `room` chia sẻ link kênh `https://nezfocus.app/channels/…` (chỉ thành viên mở được) với chữ "…vào học cùng nhé (dành cho thành viên server):" | STUDY-16 |
| `offline` | Ô link hiện invite đã có trong cache nếu còn hạn; không có thì dòng "Cần kết nối mạng để tạo link mời"; "Thu hồi" `disabled` | |

Không áp dụng: `empty`, `os-permission`.

### Checklist duyệt
- [ ] 10 state; `default` cả hai theme.
- [ ] Link dùng JetBrains Mono, không cắt mã (cắt phần `https://` nếu thiếu chỗ); "Thu hồi" chữ `danger` cạnh "Sửa".

---

## S-HOME-08 · Chat của phòng voice (DEC-35) 🆕

**Mục đích:** nhắn tin trong một phòng voice / phòng học, xem tin hệ thống của phiên học.
**REQ:** DEC-35, MSG-01..11 (cùng luật kênh text), STUDY-01, AUTH-05.
**Mở từ:** nút chat (`message-square` + badge) trên header S-ROOM-01/02 (kể cả `not-joined`); push mention trong chat của phòng. **Đi tới:** S-ROOM-01/02 (back, hoặc chạm `MiniPlayer`), S-HOME-03 (biến thể kênh voice), S-HOME-04, S-HOME-11.

### Bố cục
```
┌ Status bar ──────────────────────────────┐
│ ‹  [lamp] Phòng học im lặng          👥  │  ChannelHeader · room-chat (back thay ≡)
│    Chat của phòng                        │
│ [lamp] Bình đã bắt đầu phiên học · 25/5  │  MessageBubble · system (icon pha)
│   21:11                                  │
│ (C) Chi  21:37                           │
│     Ai có file đề cương không?           │
│ …                                        │
│ [+] [ Nhắn Phòng học im lặng   ] [☺] [➤] │  Composer
│ [lamp] Phòng học im lặng · Tập trung 18:42 [mic][rời] │  MiniPlayer (đang ở phòng)
├ TabBar (Home) ───────────────────────────┤
```

### Trạng thái
| State | Khác gì so với S-HOME-01 cùng tên | Chữ riêng |
|---|---|---|
| `default` | Header `room-chat`; có tin hệ thống phiên học; `MiniPlayer` (An đang ở phòng) | Tin hệ thống: "Bình đã bắt đầu phiên học · 25/5" · "Phiên học đã kết thúc · 1 giờ 40 phút" |
| `not-in-room` | Mở từ S-ROOM-01/02 `not-joined`: không `MiniPlayer` | |
| `empty` | Chưa có tin; frame vẽ ở "Phòng thảo luận nhóm" (phòng chưa có ai nhắn) | "Chat của Phòng thảo luận nhóm" · "Tin nhắn ở đây dành cho người trong và ngoài phòng. Thông báo phiên học cũng hiện ở đây." |
| `forbidden` | Không có `SEND_MESSAGES` ở kênh voice | Như S-HOME-01 `forbidden` |
| `members-drawer` | Drawer phải của kênh voice: 2 mục "Thành viên" · "Ghim"; nhóm "TRONG PHÒNG — 9" (`MemberRow · in-room`, icon mic thay role, 6 hàng + "+3 người") rồi "TRỰC TUYẾN — 3" đủ 3 hàng: Nam, Quân, Tuấn. (v1.9, CR-25 #14, #15) Mọi hàng có username cạnh tên; nhóm TRỰC TUYẾN có dòng hoạt động dạng ngắn (C-40): Nam `nam.ho` và Quân `quan.ng` icon `lamp-desk` `text-secondary` "Đang ở Phòng thảo luận nhóm" (phòng của Ôn thi GT2, chưa có phiên — 03 › Dữ liệu mẫu), Tuấn `tuan.hoang` icon `coffee` (`phase-short`) "Nghỉ ngắn · còn 3 phút" (Phòng thảo luận nhóm của Nhóm đồ án Mobile — 04); nhóm TRONG PHÒNG **không** có dòng hoạt động. (Rà 31/10/2026: Khánh, Lan, Hà, Mai đều nằm trong 9 người của Phòng học im lặng ở 03 nên không thể ở nhóm TRỰC TUYẾN — thay bằng ba người đang online ngoài phòng) | |

Các state khác (loading, offline, message-states, keyboard-open…) giống hệt S-HOME-01, không vẽ riêng. Luật Đã đọc (CR-19 #1) áp như kênh text: chat của phòng chỉ ack khi đang là màn trên cùng.

Dữ liệu mẫu của S-HOME-08 theo 03: bây giờ **21:47**, phiên học "Phòng học im lặng" bắt đầu 21:11 (25/5), Tập trung còn 18:42; tin chat lúc nghỉ ngắn 21:37–21:39. S-ROOM-02 `short-break` (22:07, nghỉ ngắn vòng 2) có badge "2" trên nút chat: hai tin mới gửi trong lúc nghỉ, không toast, không xem trước.

**Trong Study Room** (đã sửa 03 › S-ROOM-01/02): header phòng là `≡ [lamp] Tên phòng  [message-square] [👥]` — nút chat nằm ở **ô phải** của `ChannelHeader`, cùng chỗ mà kênh text để trống ở MVP (C-04). Từ v1.x, 🔍 đặt ở header của màn chat này, không thêm vào header phòng. Tin mới chỉ tăng badge trên nút chat (số; `danger` khi có mention), **không** toast hay xem trước nội dung trong phòng, ở mọi pha.

### Checklist duyệt
- [ ] 5 state (gồm `members-drawer`); `default` cả hai theme.
- [ ] Tin hệ thống phiên học có icon pha, không phủ màu pha lên nền chat.
- [ ] `members-drawer`: username ở mọi hàng; dòng hoạt động chỉ ở TRỰC TUYẾN / NGOẠI TUYẾN.

---

## S-HOME-09 · Menu server 🆕

**Mục đích:** các thao tác cấp server từ drawer trái.
**REQ:** SRV-02, SRV-03, SRV-05, SAFE-01, STUDY-11.
**Mở từ:** chạm tên server ở S-HOME-02. **Đi tới:** S-HOME-07, S-SET-01, tạo kênh (S-SET-09 — area 08), S-MOD-02, dialog rời server, S-SET-08 (chuyển quyền Owner).

### Bố cục (ActionSheet)
```
│ [G1] Ôn thi Giải tích 2                  │  icon server 40 + tên, headline
│      Study Server · 24 thành viên        │
│ 👤+ Mời bạn                              │  CREATE_INVITE
│ ＋  Tạo kênh                             │  MANAGE_CHANNELS
│ ⚙  Cài đặt server                  (2)  │  có ít nhất một quyền quản lý; Badge · count · neutral = số báo cáo chờ (v1.9, CR-18 #10)
│ ⚑  Báo cáo server                        │
│ ⎋  Rời server                            │  danger
```

### Trạng thái
| State | Hàng có trong sheet |
|---|---|
| `member` | (Góc nhìn thành viên thường) Mời bạn · Báo cáo server · Rời server |
| `owner` | Mời bạn · Tạo kênh · Cài đặt server (Badge "2", v1.9) · Rời server (chạm → `owner-leave`) |
| `moderator` 🆕 | (v1.9, CR-18 #10) Góc nhìn Bình (Trưởng nhóm, thấy hàng đợi báo cáo, không có `MANAGE_CHANNELS` — khớp 08 S-SET-01 `moderator`): Mời bạn · Cài đặt server (Badge "2") · Báo cáo server · Rời server |
| `owner-leave` | (chốt 19/10/2026, thay toast — toast là ngõ cụt) Owner chạm "Rời server": `Dialog` "Bạn đang là Owner của Ôn thi Giải tích 2" · "Chuyển quyền Owner cho một thành viên khác trước khi rời server." · nút xếp dọc: "Chuyển quyền Owner" (`primary` → S-SET-08) / "Để sau" (`secondary`). App chặn trước, không gọi API (40012, SRV-05 AC3) |
| `leave-confirm` | (Góc nhìn thành viên thường) `Dialog` "Rời Ôn thi Giải tích 2?" · "Bạn sẽ cần lời mời mới để quay lại." · "Hủy" / "Rời server" (`danger`) |
| `leave-confirm-in-room` 🆕 | (v1.9, CR-17 #9) Đang ở "Phòng học im lặng" của server (`MiniPlayer` trên nền): như `leave-confirm`, thân thêm câu "Bạn cũng sẽ rời Phòng học im lặng." |
| `leave-confirm-host` 🆕 | (v1.9, CR-17 #9) Đang là Host của phiên đang chạy ở "Phòng học im lặng": thân "Bạn sẽ cần lời mời mới để quay lại. Bạn cũng sẽ rời Phòng học im lặng. Chi sẽ điều khiển phiên học." Không ai đủ quyền nhận Host: câu cuối là "Phiên học vẫn chạy nhưng chưa có người điều khiển." |

Rời server khi đang ở phòng: rời phòng luôn, phút đã học giữ như Stop; không hỏi lần hai, **không** có Toast "Đã rời … · Vào lại" (CR-17 #9).

### Checklist duyệt
- [ ] 7 state; hàng chỉ hiện khi có quyền (không hiện hàng bị vô hiệu); Badge ở "Cài đặt server" trung tính, cùng số với S-HOME-02 `reports-pending`.

---

## S-HOME-10 · Hồ sơ thành viên (sheet) 🆕

**Mục đích:** xem nhanh một người — trong server hoặc ngoài server — và nhắn tin / kết bạn.
**REQ:** FRIEND-01..04, DM-01/02, SAFE-01, ROLE-05, AUTH-05, AUTH-06.
**Mở từ:** trong server — chạm avatar / tên / mention ở S-HOME-01, S-HOME-08; chạm hàng ở S-HOME-03 và drawer S-HOME-08; hàng Người tạo ở S-TASK-02 (v1.9, CR-20 #7). (v1.9, CR-25 #11) Ngoài server — chạm tên / avatar trên `ChannelHeader · dm` hoặc avatar trong tin DM (09 S-DM-02, kể cả người không chung server); chạm avatar trên hàng ở màn Bạn bè (S-DM-04); mục lời mời / chấp nhận kết bạn ở tab Thông báo (06). **Đi tới:** S-DM-02 ("Nhắn tin"), S-MOD-02 `target-user` ("Báo cáo hồ sơ"), S-SET-03 (thao tác kiểm duyệt), S-DM-04 `unfriend-confirm` / `block-confirm` (menu ⋯), S-HOME-01 của server chung (ngoài server).

### Bố cục (BottomSheet, trong server)
```
│              ───                         │
│ (Avatar 96)⊖                             │
│ Khánh                                    │  title-2
│ khanh.le                                 │  body, text-secondary
│ Bán tài liệu ôn thi giá rẻ · inbox mình  │  giới thiệu (v1.9, CR-18 #2): body, ≤ 3 dòng cắt …; không có thì bỏ dòng
│ Thành viên từ 12/10/2026                 │  label: vai trò · ngày vào (chỉ trong server)
│ ┌──────────────────────────────────────┐ │  khối hoạt động (v1.9, CR-24) — chỉ khi đang học và được thấy
│ │ [lamp] Tập trung · còn 18 phút        │ │
│ │        Phòng học im lặng              │ │
│ └──────────────────────────────────────┘ │
│ [ Nhắn tin ]  [ Kết bạn ]  [⋯]           │  Button primary · nút / ChipStatus quan hệ · IconButton 48 (v1.9, CR-25 #10)
```
(v1.9, CR-25 #10) Hàng nút = [Nhắn tin] [nút hoặc nhãn quan hệ] [⋯]. Nút thật duy nhất về quan hệ: "Kết bạn" (chưa là bạn) hoặc "Chấp nhận" (người kia đã mời). Còn lại là `ChipStatus` không bấm được: "Bạn bè" (`user-check`), "Đã gửi lời mời" (`send`), "Đã chặn" (`ban`). Hàng chữ "⚑ Báo cáo" cũ **bỏ** — chuyển vào ⋯ thành "Báo cáo hồ sơ".

**Khối hoạt động** (v1.9, CR-24 #1): nền `surface-2`, bo `button`, đệm 12, rộng hết sheet trừ lề; nội dung **dạng đủ** theo người xem (luật hiện / ẩn ở Quy ước › Dữ liệu nhất quán). Hình và câu chữ theo C-40 `block` (icon 14; chỉ icon mang màu pha, chữ không tô màu pha). Phòng có phiên, xem được kênh: dòng 1 icon pha 14 (màu pha) + "Tập trung · còn 18 phút" (Nghỉ ngắn / Nghỉ dài tương tự), dòng 2 tên phòng `label` `text-secondary`. Tạm dừng: dòng 1 icon `pause` + "Tạm dừng" (không số), dòng 2 tên phòng. Học một mình: dòng 1 icon pha + "Tập trung · còn 12 phút", dòng 2 "Đang học một mình"; Solo đang chờ: dòng 1 icon `coffee` + "Hết giờ nghỉ", dòng 2 "Đang học một mình". Một dòng: phòng không có phiên "Đang ở Phòng thảo luận nhóm" (icon `lamp-desk` / `volume-2` theo loại kênh, `text-secondary`); không xem được kênh "Đang học cùng nhóm" / "Đang ở một phòng voice" (icon `lamp-desk` / `volume-2` `text-secondary` như C-40, không tên, không thời gian). Mỗi dòng một dòng cắt "…"; "còn N phút" cập nhật mỗi phút, không đếm giây.

**Menu ⋯** (`ActionSheet`, tiêu đề là tên người đó): "Sao chép username" (`copy`, `Toast` "Đã sao chép") · theo quan hệ: "Hủy kết bạn" (`user-minus`, → S-DM-04 `unfriend-confirm`) / "Hủy lời mời" / "Từ chối lời mời" / "Bỏ chặn" (không hỏi lại) · "Báo cáo hồ sơ" (`flag`, → S-MOD-02 `target-user`; mở ngoài server thì vào hàng đợi Platform Admin) · "Chặn" (`ban`, `danger`, → S-DM-04 `block-confirm`; không có khi đã chặn). `self` và tài khoản đã xóa không có ⋯.

**Ngoài server** (v1.9, CR-25 #11): không vai trò, không "Thành viên từ…", không nhóm Kiểm duyệt; thay bằng tiêu đề nhóm "SERVER CHUNG — 2" (`label` 600 `text-tertiary`) và danh sách đủ server chung theo thứ tự trên rail của An (hàng 48: icon server 32 `rounded.server` + tên, cắt "…"), hoặc dòng "Chưa ở chung server nào" (`label` `text-secondary`). Mở từ DM của chính người đó: không có "Nhắn tin".

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `not-friend` | Như bố cục, người mẫu **Khánh** (sửa 20/10/2026 khi làm 09: Bình là bạn của An ở 04 và 09); chấm presence DND như ở drawer S-HOME-03; giới thiệu "Bán tài liệu ôn thi giá rẻ · inbox mình"; không khối hoạt động (Khánh không học) | "Nhắn tin" · "Kết bạn" · ⋯ |
| `friend` | Bình; giới thiệu "Lớp trưởng D22CN05 · hỏi bài cứ tag mình"; dòng "Trưởng nhóm · Thành viên từ 02/10/2026"; nút quan hệ thành `ChipStatus` | "Bạn bè" (`user-check`, không bấm được) |
| `request-sent` | Hà (An đã mời, khớp 09 › Đang chờ); giới thiệu "K22 Điện tử"; khối hoạt động một dòng "Đang học cùng nhóm" (khớp drawer) | `ChipStatus` "Đã gửi lời mời" (`send`); ⋯ có "Hủy lời mời" |
| `request-received` 🆕 | Giang (đã mời An lúc 19:48, khớp 06); giới thiệu "Tối nào cũng học lúc 20:00"; nút quan hệ thành "Chấp nhận" (`primary`), nút "Nhắn tin" thành `secondary` | "Giang muốn kết bạn với bạn" (label trên hàng nút); ⋯ có "Từ chối lời mời" |
| `self` | Chỉ thông tin, nút "Sửa hồ sơ" → S-ME-01; không ⋯, không khối hoạt động; giới thiệu "Sinh viên năm 3 PTIT · đang ôn Giải tích 2" | Dòng phụ "Owner · Thành viên từ 01/10/2026" (An vào sớm nhất) |
| `moderator` | Khánh như `not-friend`, thêm nhóm "Kiểm duyệt" dưới hàng nút: (v1.9, CR-17 #1) "Tạm khóa" · "Mời ra khỏi server" · "Cấm khỏi server" (chỉ khi role của An cao hơn, mỗi hàng theo quyền tương ứng) — chạm mở thẳng sheet / dialog của 08 S-SET-03 (`timeout-sheet` tiêu đề "Tạm khóa Khánh", `kick-confirm`, `ban-confirm`) trên hồ sơ; thêm "Vai trò ›" (`MANAGE_ROLES`) → 08 S-SET-03 `member-detail` | Người đang bị tạm khóa: hàng thành "Đổi thời hạn tạm khóa ›" + "Gỡ tạm khóa" (08) |
| `moderator-voice` 🆕 | (21/10/2026, area 08 Q3) Người đó đang ở phòng thoại: nhóm Kiểm duyệt thêm trên cùng hàng hành động "Tắt mic" (`MUTE_MEMBERS`, icon `mic-off`, chạm là tắt ngay, không hỏi lại — không dùng công tắc để tránh phủ định kép, D12 22/10/2026) và "Ngắt khỏi phòng" (`MOVE_MEMBERS`, không hỏi lại). (v1.9, CR-24) Dòng "Đang ở Phòng học im lặng" dưới tên **thay bằng khối hoạt động** một dòng "Đang ở Phòng học im lặng" (phòng chưa có phiên lúc 20:12). Không có "Tắt loa" (chuyển sang v1.x, 22/10/2026) | Đã tắt thì cùng hàng đổi thành "Bật lại mic" (icon `mic`), chạm là gỡ ngay |
| `activity` 🆕 | (v1.9, CR-24 #1) Dũng (bạn của An, vào server hôm nay): giới thiệu "Mới vào nhóm, nhờ mọi người chỉ giáo"; dòng "Thành viên từ 18/10/2026"; khối hoạt động dòng 1 icon `lamp-desk` (`phase-focus`) "Tập trung · còn 12 phút", dòng 2 "Đang học một mình"; nút "Nhắn tin" · `ChipStatus` "Bạn bè" · ⋯ | |
| `menu` 🆕 | (v1.9, CR-25 #10) Chạm ⋯ trên `friend` (Bình): `ActionSheet` tiêu đề "Bình": "Sao chép username" · "Hủy kết bạn" · "Báo cáo hồ sơ" · "Chặn" (`danger`) | |
| `blocked` 🆕 | (v1.9, CR-25 #9) Phong (An đã chặn): giới thiệu "Sinh viên K23 PTIT"; không "Nhắn tin", không "Kết bạn": hàng nút chỉ còn `ChipStatus` "Đã chặn" (`ban`) bên trái + ⋯ bên phải; không khối hoạt động | ⋯ còn "Sao chép username" · "Bỏ chặn" · "Báo cáo hồ sơ". Bỏ chặn không tự kết bạn lại |
| `outside-server` 🆕 | (v1.9, CR-25 #11) Mở từ avatar trên hàng Bạn bè (S-DM-04): Bình, không vai trò / ngày vào; "SERVER CHUNG — 2": Ôn thi Giải tích 2, Nhóm đồ án Mobile; "Nhắn tin" · "Bạn bè" · ⋯ | Chạm server → đóng sheet, mở server đó ở kênh mở gần nhất |
| `outside-server-none` 🆕 | (v1.9, CR-25 #11) Minh (bạn của An, không chung server; `minh.do`, giới thiệu "Thích chạy bộ và Giải tích"), mở từ S-DM-04 | "Chưa ở chung server nào"; "Nhắn tin" · "Bạn bè" · ⋯ |
| `cannot-message` | Quân. `40303` (người kia chặn An **hoặc** tắt DM từ thành viên server — không phân biệt): "Nhắn tin" `disabled` + dòng lý do; không dòng giới thiệu (Quân chưa viết); không khối hoạt động (CR-24: ẩn ở mọi chỗ `40303`) | "Không thể gửi tin nhắn cho người dùng này" (FRIEND-03 AC1; sửa 20/10/2026 — câu cũ "Bình chỉ nhận tin nhắn từ bạn bè" lộ lý do); vẫn có "Kết bạn" · ⋯ |
| `deleted` | Avatar `deleted`, tên "Tài khoản đã bị xóa", không username, không giới thiệu, không nút, không ⋯ | |

### Checklist duyệt
- [ ] 14 state (gồm `request-received`; `moderator-voice` do area 08 vẽ); không hiện thao tác kiểm duyệt khi role không đủ.
- [ ] Mọi state có người (trừ `deleted`, `cannot-message` của Quân) có dòng giới thiệu ≤ 3 dòng; không còn hàng "⚑ Báo cáo".
- [ ] Quan hệ ngoài "Kết bạn" / "Chấp nhận" là `ChipStatus`, không phải nút.
- [ ] Ngoài server: không vai trò, không ngày vào, không Kiểm duyệt.

---

## S-HOME-11 · Trình xem tệp 🆕 (v1.9, CR-19 #8)

**Mục đích:** xem ảnh, PDF, video gửi trong chat mà không rời app.
**REQ:** MSG-04, NOTIF-01 (màn toàn khung che chat → tin không được ack khi đang xem), 7.3.5.
**Mở từ:** chạm ảnh, thẻ PDF, thumbnail video trong S-HOME-01, S-HOME-08, 09 S-DM-02. **Đi tới:** màn trước (vuốt xuống, Back hệ thống, `x`), ứng dụng khác ("Mở bằng ứng dụng khác"), thư mục Tải xuống.

### Bố cục (`image`)
```
┌ Status bar ──────────────────────────────┐
│ x  (C) Chi · 19:30                  [⤓]  │  dải trên surface-1, kẻ dưới border: IconButton x · Avatar 24 + tên body 600 + giờ (luật v1.9) · IconButton download "Tải về"
│    loi-giai-2.jpg · 1,2 MB               │  label text-secondary, tên cắt giữa giữ đuôi
├──────────────────────────────────────────┤
│                                          │
│                                          │
│           [ ảnh vừa khung ]              │  nền bg (không đen — DESIGN.md › Colors), ảnh vừa khung giữ tỉ lệ
│                                          │
│                                          │
│                  2 / 3                   │  label text-secondary, chỉ khi tin có ≥ 2 ảnh
└ Nav bar ─────────────────────────────────┘
```
Màn toàn khung: không `TabBar`, không `MiniPlayer` (phòng / cuộc gọi vẫn chạy; ô nổi cuộc gọi C-07 `floating` vẫn hiện nếu có). Component: `MediaViewer` (00), `IconButton`, `Avatar`, `Button · secondary`, `Skeleton`, `Toast`.

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `image` | Như bố cục: ảnh 2 trong 3 ảnh của tin Chi 19:30 (`#tai-lieu`, `attachments`); vuốt ngang giữa các ảnh của cùng tin; chụm / chạm đúp để phóng to | "2 / 3" |
| `pdf` | Tuấn 19:50 `de-cuong-on-tap.pdf` · 1,8 MB: thân là các trang PDF cuộn dọc (trang rộng hết khung, nền `surface-2` giữa các trang, cách 8), chụm để phóng to; nhãn trang nổi giữa đáy (`label`, nền `surface-1`, bo `full`); dải trên thêm IconButton `external-link` "Mở bằng ứng dụng khác" cạnh "Tải về" | "Trang 3 / 12" |
| `pdf-error` | Không hiển thị được: thân là icon `file-text` 48 `text-tertiary` + chữ `body` + `Button · secondary` | "Không xem được tệp này" · "Mở bằng ứng dụng khác" |
| `video` | Bình 19:41 `chua-de-cau-5.mp4`: video vừa khung, điều khiển của trình phát nền tảng (play / pause, thanh thời gian) | "0:42 / 2:14" (của trình phát) |
| `loading` | Ảnh: thumbnail đã có (NFR-MOB-07) phóng vừa khung + vòng xoay 24 ở giữa tới khi ảnh gốc tải xong; PDF: 1 trang `Skeleton`. Frame: ảnh | |

Không áp dụng: `empty`, `forbidden` (ai thấy tin thì xem được tệp), `os-permission` (lưu vào Tải xuống không cần quyền). `error` của ảnh / video và `offline` khi tệp chưa tải: ở lại chat, `Toast` lỗi chung của 10 S-MOD-04 ("Không kết nối được · kiểm tra mạng rồi thử lại"); tệp đã tải xem được khi offline.

### Tương tác
- Vuốt xuống / Back hệ thống / `x` → đóng, về chat đúng vị trí cũ; luật Đã đọc chạy lại khi về chat.
- "Tải về" → lưu vào Tải xuống + `Toast` "Đã lưu vào Tải xuống". "Mở bằng ứng dụng khác" → hộp chọn ứng dụng của Android.
- TalkBack: dải trên đọc "Ảnh 2 trên 3, loi-giai-2.jpg, Chi gửi lúc 19:30".

### Checklist duyệt
- [ ] 5 state; `image` cả hai theme; nền không đen.
- [ ] Tên tệp cắt giữa giữ đuôi; "2 / 3", "Trang 3 / 12" đọc được ở 200%.

---

## Ma trận trạng thái chuẩn

| Màn hình | default | loading | empty | error | offline | forbidden | os-permission |
|---|---|---|---|---|---|---|---|
| S-HOME-01 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (+ `timed-out`; v1.9 bỏ `no-history`) | — không cần quyền |
| S-HOME-02 | ✔ | ✔ | ✔ `no-server` | — cache từ `READY` | ✔ | ✔ `no-connect` | — |
| S-HOME-03 | ✔ `members` | ✔ | ✔ `task-empty`, `pins-empty` | — cache | ✔ | — ai mở kênh cũng xem được | — |
| S-HOME-04 | ✔ | — tức thì | — | toast | thao tác cần mạng `disabled` kèm lý do; "Gửi lại" / "Xóa tin nhắn" của tin lỗi vẫn được (CR-28) | ✔ `timed-out` | — |
| S-HOME-05 | ✔ `uploading` | — (`checking` là bước kiểm tra) | — | ✔ `upload-failed`, `rejected` | ✔ (chữ riêng) | `+` ẩn | photo picker không cần; camera → S-MOD-05 |
| S-HOME-06 | ✔ | — | — | ✔ `create-error`, `join-error` | ✔ | — | — |
| S-HOME-07 | ✔ | ✔ | — | ✔ | ✔ | ✔ | — |
| S-HOME-08 | ✔ | như 01 | ✔ | như 01 | như 01 | ✔ | — |
| S-HOME-09 | ✔ `member` | — | — | toast | — | hàng ẩn theo quyền | — |
| S-HOME-10 | ✔ | — từ cache | — | toast | nút gọi mạng `disabled` | ✔ `cannot-message`, `blocked` | — |
| S-HOME-11 | ✔ `image` | ✔ | — | ✔ `pdf-error` (ảnh / video: toast) | tệp đã tải xem được; chưa tải: toast | — | — |

## Edge case (rà ngày 19/10/2026; cập nhật v1.9 ngày 30/10/2026)

Frame nằm trong nhóm "02 · Home & Chat — Edge case", tên `S-HOME-EDGE · <trường hợp>`. Chủ dự án chọn cả 15 trường hợp (19/10/2026); v1.9 thêm 2 frame (`banned-in-room`, `removed-while-offline`) và 2 luật.

### Có frame
| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `kicked` — bị kick khi đang mở app | (Góc nhìn thành viên thường.) (v1.9, CR-17 #14) **Nền đổi trước, rồi mới hiện Dialog:** nhận event → ngắt phòng của server đó (`MiniPlayer` biến mất), đóng sheet / dialog / màn con thuộc server đó (S-HOME-10, S-MOD-02, 08 S-SET-*), bỏ bản nháp, outbox và tệp đang tải của server (không thành `failed`, không Toast lỗi — CR-17 #17), xóa server khỏi rail; đang ở tab Home trên server đó → mở server kế tiếp trên rail ở kênh mở gần nhất (không còn server → S-HOME-02 `no-server`); đang ở tab khác → giữ nguyên. Frame: nền là S-HOME-01 `#viec-nhom` của **Nhóm đồ án Mobile**, rail không còn G1; `Dialog` "Bạn đã bị mời ra khỏi Ôn thi Giải tích 2" · "Bạn có thể quay lại nếu được mời lại." · lý do nếu người kick có ghi ("Lý do: …", `label`) · một nút "Đã hiểu" (rộng hết dialog), chỉ đóng Dialog. Không nêu tên người kick. Đồng thời có mục `moderation` trong tab Thông báo, đánh dấu đã đọc (06); app đóng lúc bị kick → `removed-while-offline` | ROLE-05, SRV-05 AC4 |
| `banned` — bị ban | Như `kicked` (nền đổi trước), chữ "Bạn đã bị cấm khỏi Ôn thi Giải tích 2" · "Bạn không thể tham gia lại server này." | ROLE-05, ROLE-07 |
| `banned-in-room` 🆕 — bị ban khi đang ở phiên học của server đó | (v1.9, CR-17 #14) Như `banned`; nền không còn `MiniPlayer` (phòng đã ngắt); Dialog thêm dòng "31 phút đã học trong phiên học vẫn được tính." (phút tập trung của An trong phiên, từ 60 phút: "1 giờ 54 phút"; chỉ khi ≥ 1 phút) trước nút "Đã hiểu" | ROLE-05, STUDY-15 |
| `removed-while-offline` 🆕 — bị mời ra / cấm lúc app đóng hoặc mất kết nối | (v1.9, CR-17 #15) Sau `READY`, mục `moderation` mời ra / cấm chưa đọc chưa từng báo trên máy này → `Toast` icon `log-out` "Bạn không còn ở Ôn thi Giải tích 2" + "Xem" (→ tab Thông báo). Frame: S-HOME-01 `#viec-nhom` của Nhóm đồ án Mobile (rail không còn G1) + toast trên `Composer`; badge tab Thông báo có mục đó | ≥ 2 mục: "Bạn không còn ở 2 server" + "Xem". Mỗi mục toast tối đa một lần trên một máy; mục đã đọc ở máy khác → không toast |
| `channel-removed` — kênh đang xem bị xóa hoặc mất `VIEW_CHANNEL` | Chuyển về kênh text đầu tiên mình còn xem được (v1.9, CR-17: mẫu `#chao-mung`) + `Toast` "#hoi-dap không còn khả dụng" (icon `hash`). Bản nháp của kênh cũ bị bỏ | SRV-02, ROLE-08 |
| `long-names-drawer` — tên rất dài ở drawer | Tên server 1 dòng cắt `…` ("Câu lạc bộ Ôn thi Giả…"), dòng phụ giữ nguyên; tên kênh 1 dòng cắt `…`; chữ viết tắt trên rail theo tên server ("CL"); (v1.9) danh mục THÔNG TIN có `# chao-mung` đầu | C-04, C-05, SRV-01 (≤ 100 ký tự) |
| `long-names-chat` — tên rất dài ở header, tin nhắn | Header 1 dòng cắt `…`; tên người gửi dài cắt `…` để giờ luôn hiện; một người dùng một tên hiển thị ở mọi tin (Bình 20:02 và 20:10 đều "Nguyễn Hoàng Bình (K22 – CNTT…", avatar "N"); placeholder ô soạn theo tên kênh dài, cắt `…` ("Nhắn #hoi-dap-bai-ta…") | C-04, C-10 |
| `many-servers` — rất nhiều server | Rail cuộn dọc (không có thanh cuộn hiện sẵn), ＋ ở cuối danh sách (cuộn tới mới thấy); badge mention lớn ghi "99+", nằm gọn trong rail 72 (lệch vào trong, không tràn mép phải); badge tab Home "99+" | NOTIF-01, C-13 |
| `long-message` — tin 2000 ký tự, code block dài, 20 loại reaction | Tin hiện đủ, không "Xem thêm"; code block giữ mỗi dòng code trên 1 dòng, **cuộn ngang**; chip reaction xuống nhiều hàng | MSG-01 (≤ 2000), MSG-02, MSG-05 (≤ 20 emoji) |
| `alone-in-server` — vừa tạo server, chỉ có mình | Drawer phải `members`: "TRỰC TUYẾN — 1" chỉ An (`an.nguyen`, nhãn phải "Owner" — người tạo server) + khối `EmptyState · inline` "Chỉ có mình bạn ở đây" · "Mời bạn bè để cùng học." · `Button · secondary` "Mời bạn" (→ S-HOME-07) | SRV-03, UF-02 |
| `large-text-chat` / `large-text-drawer` — cỡ chữ 200% | Chat: nội dung tin xuống dòng tự do, tên + giờ xuống 2 dòng được, header 1 dòng cắt `…` (tiêu đề giới hạn ×1.6), nhãn `TabBar` giới hạn ×1.3. Drawer: tên server, kênh 1 dòng cắt `…`; hàng kênh cao theo chữ; dòng phụ pha bỏ avatar trước khi cắt chữ; icon không phóng (v1.9, CR-13: bỏ nhãn "Im lặng"; THÔNG TIN có `# chao-mung` đầu) | DESIGN.md › Typography (200%), NFR-A11Y-03 |

### Chỉ ghi luật (giao diện không đổi)
| Tình huống | Luật |
|---|---|
| Server bị Owner xóa khi đang xem | Như `kicked` (nền đổi trước), chữ "Ôn thi Giải tích 2 đã bị xóa" · "Owner đã xóa server này." (SRV-05 AC4) |
| Tin đang trả lời bị xóa | Dải trên ô soạn đổi thành "Đang trả lời · Tin nhắn gốc đã bị xóa"; gửi vẫn được, tin gửi đi hiện dòng trả lời "Tin nhắn gốc đã bị xóa" (MSG-05 AC6) |
| Tin đang sửa bị xóa (moderator xóa) | Thoát chế độ sửa, ô soạn trở lại trống, `Toast` "Tin nhắn này đã bị xóa" |
| Bị tạm khóa ngay khi đang gõ | (v1.9, CR-17 #1) `Composer` chuyển `disabled` ("Bạn đang bị tạm khóa đến 21:30 · chưa gửi tin được"), bản nháp giữ lại, hiện lại khi hết hạn (ROLE-05, 40307) |
| Mất kết nối lâu rồi có lại | `Banner · reconnecting` biến mất; tải phần thiếu bằng `after=<last_message_id>`, tin mới chèn đúng thứ tự, vạch "Tin nhắn mới" đặt ở tin chưa đọc đầu tiên; outbox gửi lần lượt theo thứ tự tạo (7.3.2, 7.3.3) |
| Quay lại foreground khi kênh đang mở có tin mới | (v1.9, CR-19 #1) Vạch "Tin nhắn mới" chuyển tới tin chưa đọc đầu tiên mới đến; ack chỉ khi tin hiện ≥ 50% (một `MESSAGE_ACK` sau 1 giây) |
| Tin chờ gửi quá 24 giờ / app bị kill khi đang tải tệp | Quá 24 giờ → `failed` (8.4.5). Mở lại app: tệp chưa tải xong tiếp tục tải từ đầu bằng cùng `nonce`, không tạo tin trùng (MSG-04 AC4, MSG-09) |
| Hai người cùng ghim tin thứ 50 | Người bấm sau nhận `Toast` 40904 như S-HOME-04 |
| Hai người cùng xóa một tin | Người bấm sau không thấy lỗi: tin đã biến mất là kết quả mong muốn (xóa là idempotent phía app) |
| Qua nửa đêm | Vạch ngày tính lại khi qua 00:00 theo timezone của user ("Hôm nay" thành "Hôm qua"; giờ đầu tin "20:02" thành "Hôm qua 20:02"); hai tin ở hai bên vạch ngày không gộp nhóm dù cách nhau ≤ 5 phút |
| Đã ở đủ 100 server | Tham gia bằng mã / link cũng báo 40011: ở S-HOME-06 `join-error` "Bạn đã ở 100 server, mức tối đa. Rời bớt một server để tham gia server mới."; ở S-MOD-01 cùng chữ, nút "Tham gia" `disabled`; thẻ lời mời trong chat: S-HOME-01 `invite-cards · max` |
| Chip link tên dài | (v1.9, CR-19 #11) Chip rộng tối đa cột nội dung tin (306 ở khung 390); tên server co trước, tối thiểu 80, rồi "…", sau đó tới tên kênh / phòng; "› Tin nhắn" không cắt. Ví dụ "Câu lạc bộ Ôn thi Giả… › #hoi-dap-bai-tap-chuong-4" |

## Câu hỏi còn mở

Không còn. Bốn câu mở của README (chỉ Android, chat trong phòng voice, DEC-36, nút mời vào phòng) đã chốt 18/10/2026 trong spec này và 03.
