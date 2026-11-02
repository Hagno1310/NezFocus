# 09 · DM, bạn bè & cuộc gọi

Tin nhắn trực tiếp (DM 1-1, Group DM), danh sách bạn bè và lời mời kết bạn, gọi thoại / video 1-1.

- Hành vi: SRS v1.9 Mục 3.1 (rail 💬, Tab Home, MiniPlayer, Cử chỉ / Back), 3.2 (DM & Friends), 3.5, 3.6 UF-07, 5.4 (`CALL_*`, `RELATIONSHIP_*`, `PRESENCE_UPDATE.activity`), 7.3.4, 7.5.3, 8.4.1, 8.4.2, REQ-FRIEND-01..04, REQ-DM-01..03, REQ-GDM-01..03, REQ-DMVC-01/03, REQ-NOTIF-01/02/05, REQ-MSG-02/05/11, REQ-AUTH-05, DEC-03, DEC-07, DEC-29. **Không ở MVP:** gọi nhóm trong Group DM (REQ-DMVC-02, v1.x), UI gọi gốc khi app bị kill (REQ-DMVC-04, v1.x, DEC-07).
- Component: [00-components.md](00-components.md) — `ChannelHeader · dm` (C-04), `MessageBubble` (C-10, tin hệ thống cuộc gọi), `Composer` (C-11), `MemberRow` (C-28), `SegmentedControl` (C-20), `FilterChip` (C-30), `SearchField` / `TextField` (C-02), `RoomControl` (C-17), `ParticipantTile · video` / `· floating` (C-07), `MiniPlayer · call` (C-08), `ServerRail` (C-26), `ScreenHeader` (C-22), `ChipStatus` (C-21), `BottomSheet` / `ActionSheet` / `Dialog` (C-09), `DMRow` (C-32), `FriendRow` (C-33), `NotificationRow` (C-31, `friend_request`, `friend_accepted`). Nhìn thế nào: [DESIGN.md](../../../DESIGN.md) (chế độ **Operate**; màn cuộc gọi **Experience**).
- Hành vi chốt 20/10/2026 khi viết spec này (21 câu, chủ dự án đồng ý cả 21): tách Tin nhắn (drawer) / Bạn bè / Thêm bạn / Thông tin nhóm; DM xếp theo hoạt động, chưa đọc = tên đậm + badge; 40303 một câu chung ở mọi nơi; hủy kết bạn và chặn có xác nhận; DM với người chưa là bạn có dải "chưa là bạn bè"; DM 1-1 có 📞 🎥, Group DM không gọi; bật camera giữa cuộc gọi; gọi khi đang ở phòng thì hỏi rời phòng; thu nhỏ cuộc gọi thành `MiniPlayer · call`; notification cuộc gọi có nút Nghe / Từ chối; chỉ nhỡ (không phải từ chối) mới vào tab Thông báo; mascot chỉ ở empty của S-DM-01 / S-DM-04. Hành vi mới ghi ở `SRS_v1.2_change_notes.md` mục 11 (CR-06, đã áp vào SRS v1.6 ngày 21/10/2026).
- **Cập nhật 30/10/2026 theo SRS v1.9** (`SRS_v1.2_change_notes.md` §17–30): CR-25 (bạn bè, DM & cuộc gọi theo bản web — chính), CR-24 #1 (dòng hoạt động học), CR-21 #6 (`friend_accepted`), CR-19 #2, #11, #14, #15 (link tin, chip link NezFocus trong DM), CR-12 #3 (DM không highlight), CR-15 (Back). Bỏ luật cũ: "hàng bạn bè chỉ username", "S-HOME-10 không áp dụng", "chạm avatar … không thì không làm gì", "Gọi lại → gọi thoại", lỗi quan hệ sau khi gửi ở S-DM-05.
- Nhãn UI: rail 💬 "Tin nhắn"; màn bạn bè "Bạn bè"; tab Trực tuyến / Tất cả / Đang chờ / Đã chặn (nhãn "Trực tuyến" chốt 22/10/2026, không dùng "Online"); chip "Lời mời đến" / "Đã gửi"; "Nhóm" cho Group DM; "Chủ nhóm" cho Owner nhóm.

## Quy ước chung của khu vực

| Hạng mục | Quy ước |
|---|---|
| Khung | 390 × 844; kiểm thêm 360 × 800 cho S-DM-01 `default`, S-DM-04 `all` và S-CALL-01 `in-call-audio` |
| Vị trí | Mọi màn thuộc tab **Home** (`TabBar`, Home đang chọn). S-DM-01 là danh sách trong **drawer trái** (rail giữ nguyên, ô 💬 có vạch chọn — 02 › S-HOME-02). S-DM-02 là màn chat như kênh text (`ChannelHeader · dm`, `≡` mở drawer ở S-DM-01). S-DM-04 (Bạn bè) là màn con với `ScreenHeader`. S-CALL-01/02 toàn màn hình, **không** `TabBar`. Cuộc gọi thu nhỏ: `MiniPlayer · call` trên `TabBar`; camera người kia bật thì thêm ô nổi `ParticipantTile · floating` ở mọi màn trừ S-CALL-01 (v1.9, CR-25 #7 — xem S-CALL-01 `minimized-video`) |
| Badge | 💬 trên rail = số cuộc DM có tin chưa đọc (02); badge tab Home = mention mọi server + DM chưa đọc (C-03); badge trên nút "Bạn bè" và mục "Đang chờ" = số lời mời kết bạn **đến** đang chờ; `Badge` trên nút 💬 của màn cuộc gọi = số tin chưa đọc của DM đó, cùng số với `DMRow` (v1.9, CR-25 #8) |
| Thời gian | Danh sách DM và hàng lời mời: hôm nay `HH:mm`, hôm qua "Hôm qua", cũ hơn `dd/MM`, khác năm `dd/MM/yyyy`. Trong chat: như 02 (vạch ngày). Đồng hồ cuộc gọi: `mm:ss` (≥ 1 giờ: `h:mm:ss`), Unbounded `tabular-nums`, đếm từ lúc người kia nghe máy. Thời lượng trong tin hệ thống cuộc gọi: "dưới 1 phút" · "12 phút" · từ 60 phút "1 giờ 2 phút" |
| Tên + username | (v1.9, CR-25 #14) `FriendRow` và `ChannelHeader · dm`: dòng 1 = tên + username (`label` `text-tertiary`); thiếu chỗ thì username cắt `…` trước, rồi tới tên (luật hình ở C-04, C-33). `DMRow` **không** có username. Cỡ chữ 200%: username xuống dòng riêng, một dòng cắt `…`. Danh sách chọn người (S-DM-03) giữ nguyên |
| Presence & hoạt động học | `PresenceDot` theo DESIGN.md › Presence. **Dòng hoạt động** (v1.9, CR-24 #1, CR-25 #16): dạng **đủ** ở dòng phụ header DM và dòng 2 `FriendRow` (và khối hoạt động của 02 S-HOME-10); dạng **ngắn** ở dòng 2 `DMRow`. Không đang học: dòng phụ header DM "Trực tuyến" / "Vắng mặt" / "Không làm phiền", ngoại tuyến thì không có dòng phụ (không có "hoạt động lúc…"); dòng 2 `FriendRow` thêm "Ngoại tuyến". Không có hoạt động ở Group DM, khi người kia đặt Ẩn / tắt "Hiện hoạt động học", khi có chặn theo bất kỳ chiều nào, tài khoản đã xóa. Luật cắt: phần "còn N phút" không bao giờ bị cắt; tên pha, "Một mình", tên phòng cắt `…` trước (C-32, C-33). **Mọi màn có `40303`** (`cannot-message`, `blocked-mid-chat`): ẩn dòng phụ (cả hoạt động) lẫn `PresenceDot` trên avatar header — hiện trạng thái trực tuyến sẽ để lộ là mình bị chặn (chốt 22/10/2026) |
| Màu ngữ nghĩa | Nút kết thúc / từ chối cuộc gọi `danger`; nút nghe máy / gọi lại `success`; cuộc gọi nhỡ icon `phone-missed` `danger`. Tin hệ thống cuộc gọi khác: `phone-off` (từ chối, không kết nối được), `phone` / `video` (có thời lượng) màu `text-secondary` (C-10). Không dùng màu pha ngoài icon pha của dòng hoạt động. Quanh avatar ở màn cuộc gọi **không** có màu ngữ nghĩa: đang nói = speaking-ring `text-primary`; đang đổ chuông = quầng `border` (D2) |
| Mascot | Chỉ ở `empty` của S-DM-01 và S-DM-04 (neutral 96, như S-HOME-02 `no-server`). **Không** trong chat, sheet, cuộc gọi, ô nổi (DESIGN.md › Mascot) |
| Giọng văn | Xưng "bạn"; lỗi 40303 luôn **một câu chung** "Không thể gửi tin nhắn cho người dùng này" / "Không thể gửi lời mời cho người dùng này" (FRIEND-03 AC1) — không bao giờ lộ là bị chặn hay do cài đặt quyền riêng tư. Tin hệ thống cuộc gọi dựng **theo người xem**: "Bình đã gọi · …" / "Bạn đã gọi · …" (v1.9, CR-25 #1) |
| Dữ liệu nhất quán | Bạn bè của An: Bình, Chi, Dũng (trực tuyến), Tuấn (vắng mặt), Lan, Minh (ngoại tuyến) → Tất cả 6, Trực tuyến 4. Hoạt động lúc 20:12: bảng dưới. Lời mời đến: Giang (19:48, có lời nhắn, khớp 06). Đã gửi: Hà (hôm qua, gửi từ hồ sơ nên không có lời nhắn). Đã chặn: Phong. 💬 badge "1" = DM với Chi có 1 tin chưa đọc (khớp 02 `unread-mention` và badge Home "3" = 2 mention + 1 DM). Cuộc gọi nhỡ của Bình hôm qua 16:45 (khớp 06) có tin hệ thống trong DM Bình. Bây giờ **20:12, Chủ Nhật 18/10/2026** (02, 06 cùng giờ; 03, 04 dùng 21:47 nên hoạt động ở đây không phải của 04) |

### Dữ liệu mẫu

**Hoạt động học lúc 20:12 (v1.9, CR-24 #1, CR-25 #16):** không phòng nào của "Ôn thi Giải tích 2" đang có phiên (khớp 02 S-HOME-02 `default`; buổi ôn 20:30 chưa bắt đầu).

| Bạn | Presence | Dạng đủ (header DM, `FriendRow`) | Dạng ngắn (`DMRow`) |
|---|---|---|---|
| Bình | Trực tuyến | "Đang học một mình · Tập trung · còn 18 phút" (hết pha 20:30) | "Một mình · còn 18 phút" |
| Chi | Trực tuyến | "Đang ở Phòng học im lặng" (Ôn thi Giải tích 2, chưa có phiên — giữ chỗ cho buổi 20:30) | "Đang ở Phòng học im lặng" (nhưng DM Chi có tin chưa đọc nên `DMRow` hiện tin) |
| Dũng | Trực tuyến | "Nghỉ ngắn · còn 4 phút · Phòng thảo luận nhóm" (phòng của "Nhóm đồ án Mobile", An xem được kênh) | "Nghỉ ngắn · còn 4 phút" |
| Tuấn | Vắng mặt | — ("Vắng mặt") | — |
| Lan, Minh | Ngoại tuyến | — ("Ngoại tuyến" ở `FriendRow`) | — |

**Danh sách DM (S-DM-01 `default`, mới nhất trên cùng):**

| Cuộc | Dòng 2 | Giờ | Chưa đọc |
|---|---|---|---|
| Chi (trực tuyến) | "Mai đi thư viện không?" (đậm — có tin chưa đọc nên tin được ưu tiên hơn hoạt động) | 20:08 | 1 |
| Bình (trực tuyến) | Hoạt động "Một mình · còn 18 phút" (icon pha Tập trung) — tin cuối "Bạn: Ok 👍" không hiện vì Bình đang học và không có tin chưa đọc | 19:41 | — |
| Nhóm "Ôn thi cùng nhau" (An, Bình, Chi, Dũng; Chủ nhóm Bình; avatar nhóm B + C — hai người vào nhóm sớm nhất trừ mình) | "Dũng: Ai có đề 2023 không?" (Group DM không có hoạt động) | 18:30 | — |
| Tuấn (vắng mặt) | "Cuộc gọi video · 25 phút" (An gọi video Tuấn hôm qua 21:05) | Hôm qua | — |
| Minh (ngoại tuyến) | "Bạn: Cảm ơn nha" | 15/10 | — |

**DM với Bình (S-DM-02 `default`, An xem):**

| Giờ | Ai | Nội dung |
|---|---|---|
| — | vạch | "Hôm qua" |
| 16:45 | (hệ thống) | `phone-missed` (`danger`) "**Bình** đã gọi · Cuộc gọi nhỡ · **Gọi lại**" (Bình gọi thoại, An không nghe — khớp 06; Bình xem thì thấy "Bạn đã gọi · Cuộc gọi nhỡ · Gọi lại") |
| 16:46 | Bình | "Gọi không được, chắc bạn đang học. Mai nộp bài chưa?" |
| 16:52 | An | "Mình vừa ra khỏi phòng, để mình gọi lại" |
| 17:05 | (hệ thống) | `phone` "**Bạn** đã gọi · 12 phút" (An gọi lại, thoại) |
| — | vạch | "Hôm nay" |
| 19:40 | Bình | "Tối nay 20:30 ôn tiếp nhé, mình giữ chỗ trong phòng" |
| 19:41 | An | "Ok 👍" |

**Lời mời & lời nhắn (v1.9, CR-25 #12, #13):** Giang (`giang.vo`) mời An 19:48 với lời nhắn "Mình là Giang lớp K22, xin vào nhóm ôn cùng nhé" (khớp mục `friend_request` của 06). An gửi Hà (`ha.nguyen`) hôm qua từ hồ sơ (một bước) → "Không có lời nhắn". Mẫu tra cứu ở S-DM-05: `mai.tran` (Mai, cùng ở "Ôn thi Giải tích 2", chưa là bạn, không có lời mời nào giữa hai người; đổi từ Khánh ngày 31/10/2026 — Khánh là người bị báo cáo ở 02/08/10, không hợp làm mẫu kết bạn), giới thiệu "Sinh viên K22 PTIT", lời nhắn của An "Mình là An, nhóm ôn Giải tích tối nay nhé" (41/150).

**Cuộc gọi mẫu:** An gọi Bình (gọi đi, thoại); Chi gọi An (gọi đến). Đồng hồ trong cuộc gọi: "03:12". Trong cuộc gọi video, Bình gửi 1 tin vào DM → `Badge` "1" trên 💬.

---

## S-DM-01 · Tin nhắn (trong drawer)

**Mục đích:** quay lại cuộc trò chuyện riêng, thấy ai nhắn mình.
**REQ:** DM-01/03, GDM-01, NOTIF-01, FRIEND-03, AUTH-05, SRS 3.1.
**Mở từ:** chạm 💬 trên rail (S-HOME-02). **Đi tới:** S-DM-02 (chạm một cuộc), S-DM-04 `online` ("Bạn bè"), S-DM-03 `picker` (✎ "Nhóm mới"), S-HOME-02 (chạm một server trên rail), S-DM-04 `block-confirm` ("Chặn" ở `close-dm`).

### Bố cục
```
┌ Status bar ─────────────────────────────────┐
│┌────┬───────────────────────────────┐░░░░░│
││▌💬 │ Tin nhắn                   [✎]│░░░░░│  headline · IconButton (tạo nhóm)
││ ── │ [👥 Bạn bè               ①  ›]│░░░░░│  hàng điều hướng, badge lời mời đến
││ G1 │ (C)● Chi                 20:08│░░░░░│  DMRow chưa đọc: tên 600 + badge
││ G2②│      Mai đi thư viện không?  ①│░░░░░│  tin chưa đọc thắng hoạt động
││ G3•│ (B)● Bình                19:41│░░░░░│  DMRow
││ ＋ │      [lamp] Một mình · còn 18 phút│  dòng 2 = hoạt động dạng ngắn (v1.9)
││    │ (BC) Ôn thi cùng nhau    18:30│░░░░░│  DMRow · group (2 avatar chồng)
││    │      Dũng: Ai có đề 2023 không│░░░░░│
││    │ (T)◐ Tuấn              Hôm qua│░░░░░│
││    │      Cuộc gọi video · 25 phút │░░░░░│  dòng cuộc gọi (v1.9)
││    │ (M)○ Minh                15/10│░░░░░│
││    │      Bạn: Cảm ơn nha          │░░░░░│
│└────┴───────────────────────────────┘░░░░░│
├ TabBar (Home ③) ────────────────────────────┤
```

### Component
`ServerRail` (C-26, `dm` selected), `DMRow` (C-32), hàng "Bạn bè" (`SettingsRow · nav` + `Badge`), `IconButton`, `ActionSheet`, `EmptyState`, `Skeleton`, `Banner`, `TabBar`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Tin nhắn" |
| Hàng điều hướng | "Bạn bè" (+ badge số lời mời đến) |
| Dòng 2 (v1.9, CR-25 #16) | Có tin chưa đọc → tin cuối (đậm). Không có tin chưa đọc và người kia (1-1) đang học, An được thấy → hoạt động **dạng ngắn**: "Tập trung · còn 18 phút" / "Nghỉ ngắn · còn 4 phút" / "Nghỉ dài · còn 12 phút" · "Tạm dừng" · "Đang ở {Phòng thảo luận nhóm}" · "Đang học cùng nhóm" / "Đang ở một phòng voice" · "Một mình · còn 105 phút" · "Một mình · hết giờ nghỉ". Còn lại → tin cuối |
| Tin cuối | Tin của mình: "Bạn: …"; Group DM: "{Tên}: …"; tệp: "Đã gửi một ảnh" / "Đã gửi một tệp"; cuộc gọi (v1.9, CR-25 #1): "Cuộc gọi nhỡ" · "Cuộc gọi bị từ chối" · "Không kết nối được" · "Cuộc gọi · 12 phút" / "Cuộc gọi video · 12 phút"; tin của người mình đã chặn (Group DM): "Tin nhắn bị chặn" |
| Tên Group DM chưa đặt | Tên các thành viên trừ mình, theo thứ tự vào nhóm: "Bình, Chi, Dũng" (cắt `…`) |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục: đủ ba kiểu dòng 2 — tin chưa đọc (Chi), hoạt động (Bình), dòng cuộc gọi (Tuấn) | |
| `empty` | Chưa có cuộc DM nào: hàng "Bạn bè" vẫn ở trên; dưới là `EmptyState` | "Chưa có tin nhắn nào" · "Nhắn tin cho bạn bè hoặc thành viên cùng server." · `Button · secondary` "Tìm bạn bè" → S-DM-04 |
| `loading` | Lần đầu chưa có cache: 6 `Skeleton` hàng DM | |
| `offline` | `Banner · offline` trên đầu danh sách; dữ liệu cache | "Bạn đang offline" |
| `close-dm` | Nhấn giữ hàng Chi → `ActionSheet` tiêu đề "Chi", theo thứ tự: "Đóng cuộc trò chuyện" (DM-03: ẩn khỏi danh sách phía mình, mở lại khi có tin mới) · "Đánh dấu đã đọc" · "Chặn" (`danger`, v1.9 CR-25 #9) → `Dialog` `block-confirm` của S-DM-04. Người đã chặn: "Bỏ chặn" (không `danger`, không hỏi lại) thay "Chặn". Group DM: "Rời nhóm" thay "Đóng", không có "Chặn" | |

Không áp dụng: `error` (luôn có cache từ `READY`), `forbidden`, `os-permission`.

### Tương tác
- Chạm cuộc → đóng drawer, mở S-DM-02. Danh sách xếp theo hoạt động mới nhất; có tin mới khi đang xem thì cuộc đó nhảy lên đầu (không có ngón tay đang kéo). Dòng hoạt động cập nhật mỗi phút, không đổi thứ tự danh sách.
- Chạm "Bạn bè" → S-DM-04 (`online`, hoặc `pending` khi có lời mời đến).
- ✎ → S-DM-03 `picker`.

### Checklist duyệt
- [ ] 5 state; `default` khung 360 (drawer 304) — dòng hoạt động của Bình vẫn đủ "còn 18 phút".
- [ ] 💬 badge "1" = một cuộc chưa đọc (Chi); badge Home "3".
- [ ] `DMRow` không có username; DM có tin chưa đọc không hiện hoạt động.

---

## S-DM-04 · Bạn bè 🆕

> Mở thêm từ 07 S-ME-04 "Danh sách chặn" (21/10/2026): vào thẳng tab "Đã chặn" (`blocked`); Back quay về S-ME-04.

**Mục đích:** xem bạn bè ai đang trực tuyến, đang học gì; trả lời lời mời; quản lý người đã chặn.
**REQ:** FRIEND-01..04, AUTH-05, NOTIF-05.
**Mở từ:** hàng "Bạn bè" ở S-DM-01. **Đi tới:** S-DM-02 (chạm 💬 trên hàng, hoặc chạm hàng), S-HOME-10 `outside-server` / `outside-server-none` (chạm avatar trên hàng — v1.9, CR-25 #11), S-DM-05 (👤+ "Thêm bạn"), S-CALL-01 `calling` (⋯ › Gọi thoại / Gọi video).

### Bố cục (`online`)
```
┌ Status bar ──────────────────────────────┐
│ ‹  Bạn bè                         [👤+] │  ScreenHeader · hành động "Thêm bạn"
│ [Trực tuyến | Tất cả | Đang chờ · 1 | Đã chặn]│  SegmentedControl 4 mục; số lời mời đến "· 1" màu danger, đậm 700 (mục này rộng theo chữ, 3 mục kia chia đều)
│ [🔍 Tìm theo tên hoặc username       ]  │  SearchField
│ TRỰC TUYẾN — 4                           │
│ (B)● Bình binh.tran           [💬] [⋯]  │  FriendRow: tên + username (v1.9)
│      [lamp] Đang học một mình · Tập trung · còn 18 phút │  dòng 2 = hoạt động dạng đủ, 1 dòng, cắt theo C-33
│ (C)● Chi chi.le               [💬] [⋯]  │
│      Đang ở Phòng học im lặng            │
│ (D)● Dũng dung.pham           [💬] [⋯]  │
│      [coffee] Nghỉ ngắn · còn 4 phút · Phòng thảo l… │
│ (T)◐ Tuấn tuan.hoang          [💬] [⋯]  │
│      Vắng mặt                            │  không đang học: trạng thái bằng chữ
├ TabBar (Home) ───────────────────────────┤
```

### Trạng thái
| State | Khác gì | Chữ / hành động riêng |
|---|---|---|
| `online` | Như bố cục: Trực tuyến / Vắng mặt / Không làm phiền, xếp: trực tuyến → vắng mặt → không làm phiền, rồi theo tên (FRIEND-04). Dòng 2 `FriendRow` (v1.9, CR-25 #14): hoạt động dạng đủ nếu đang học, không thì "Trực tuyến" / "Vắng mặt" / "Không làm phiền" | "TRỰC TUYẾN — 4" |
| `all` | Tất cả 6: người trực tuyến trước (cùng thứ tự `online`), rồi "NGOẠI TUYẾN — 2" (Lan, Minh) theo tên, dòng 2 "Ngoại tuyến" | |
| `pending` | (v1.9, CR-25 #13) Dưới ô tìm: hai `FilterChip` chọn một "Lời mời đến · 1" (đang chọn) / "Đã gửi · 1"; không còn tiêu đề nhóm. Hàng Giang: dòng 1 "Giang" + `giang.vo` + "19:48" căn phải (`label` `text-tertiary`); dòng 2 lời nhắn trong ngoặc kép `body-sm` `text-secondary`, hiện đủ (≤ 150 ký tự) "“Mình là Giang lớp K22, xin vào nhóm ôn cùng nhé”"; dưới chữ là "Chấp nhận" / "Từ chối" (cùng hàng nút như C-31) | Không có lời nhắn: "Không có lời nhắn" (`text-tertiary`) |
| `pending-sent` 🆕 | (v1.9) Chạm chip "Đã gửi · 1": hàng Hà — "Hà" + `ha.nguyen` + "Hôm qua"; "Không có lời nhắn"; `Button · secondary · S` "Hủy lời mời" dưới chữ (C-33) | Hủy lời mời: hàng biến mất, lời nhắn bị xóa, không hỏi lại |
| `pending-empty` 🆕 | (v1.9) Sau khi An chấp nhận Giang và chạm lại chip "Lời mời đến" (chip không còn số khi bằng 0; mục "Đang chờ" của `SegmentedControl` mất "· 1"): một dòng inline dưới chip | "Không có lời mời nào đến" · chip "Đã gửi" trống: "Bạn chưa gửi lời mời nào" |
| `blocked` | "ĐÃ CHẶN — 1": Phong (`phong.vu` cạnh tên, hàng **một dòng**) + "Bỏ chặn" (`Button · secondary · S`) | Bỏ chặn không hỏi lại, không tự kết bạn lại (8.4.2) |
| `search` | Gõ "bi": lọc không dấu theo tên hiển thị và username, trong tab đang chọn (ở Đang chờ: trong chip đang chọn); phím Return "Tìm" | Không thấy: "Không có ai khớp "xyz"" |
| `empty` | Chưa có bạn bè: `EmptyState` + "Thêm bạn" | "Chưa có bạn bè" · "Kết bạn bằng username, hoặc từ hồ sơ của thành viên cùng server." · `Button · primary` "Thêm bạn" |
| `empty-online` | Có bạn nhưng không ai trực tuyến | "Chưa có bạn nào trực tuyến" (inline) |
| `row-menu` | ⋯ trên hàng Bình → `ActionSheet` tiêu đề "Bình": Gọi thoại · Gọi video · Hủy kết bạn · Chặn (`danger`). Gọi thoại / video không phụ thuộc presence (v1.9, CR-25 #4) | |
| `unfriend-confirm` | `Dialog` "Hủy kết bạn với Tuấn?" · "Tin nhắn cũ vẫn còn. Tuấn không được báo." · "Giữ lại" / "Hủy kết bạn" (`danger`) — nút thoát không dùng chữ "Hủy" để khỏi bấm nhầm với "Hủy kết bạn" (22/10/2026) | |
| `block-confirm` | Mẫu: ⋯ ở hàng Tuấn (Phong đã bị chặn sẵn). `Dialog` "Chặn Tuấn?" · "Tuấn sẽ không nhắn tin, gọi hay gửi lời mời kết bạn cho bạn được. Tuấn không được báo. Trong server, tin của Tuấn được thu gọn." · "Hủy" / "Chặn" (`danger`). **Dialog dùng chung** cho mọi chỗ chặn (v1.9, CR-25 #9): S-DM-01 `close-dm`, dải `not-friend` của S-DM-02, ⋯ của 02 S-HOME-10 (`menu`) | FRIEND-03, DEC-29 |
| `offline` | Mẫu ở tab Đang chờ, chip "Lời mời đến". `Banner · offline`; danh sách cache; **mọi nút cần mạng** (Chấp nhận / Từ chối / Hủy lời mời / Bỏ chặn) `disabled`; một dòng "Cần kết nối mạng" (`label`, `text-secondary`) ngay dưới hàng nút của lời mời đến đầu tiên, thẳng cột chữ của hàng. Đổi chip vẫn được (dữ liệu cache), nút ở chip kia chỉ mờ, không lặp dòng | "Cần kết nối mạng" |

Không áp dụng: `loading` riêng (danh sách bạn có trong cache, FRIEND-04 AC1 ≤ 300ms), `error`, `forbidden`, `os-permission`.

### Tương tác
- Chạm hàng hoặc 💬 → S-DM-02. Chạm **avatar** → 02 S-HOME-10 ngữ cảnh ngoài server (`outside-server`: "SERVER CHUNG — {N}"; `outside-server-none`: "Chưa ở chung server nào") — v1.9, CR-25 #11, thay luật "S-HOME-10 không áp dụng".
- Tab Đang chờ: chip mặc định "Lời mời đến" khi có, không có thì "Đã gửi"; gửi lời mời xong ở S-DM-05 thì về đây với "Đã gửi" chọn sẵn, hàng mới trên cùng (v1.9, CR-25 #13). Trong mỗi chip: mới nhất trên cùng.
- Chấp nhận → hàng biến mất, người đó sang Tất cả, `Toast` "Bạn và Giang đã là bạn bè"; **người gửi** nhận mục `friend_accepted` "An đã chấp nhận lời mời kết bạn" ở tab Thông báo (06; v1.9, CR-21 #6). Từ chối → hàng biến mất, người gửi không được báo. Phía An là người gửi: lời mời được chấp nhận thì hàng ở "Đã gửi" biến mất ngay và An có mục `friend_accepted`. Lời nhắn bị xóa khi lời mời được chấp nhận / bị từ chối / bị hủy.

### Checklist duyệt
- [ ] 13 state; `all` khung 360.
- [ ] Số trong tiêu đề nhóm / chip khớp số hàng; badge "Đang chờ" = số lời mời đến.
- [ ] Mọi `FriendRow` có username cạnh tên; "còn N phút" không bị cắt; Phong (đã chặn) một dòng.

---

## S-DM-05 · Thêm bạn 🆕 (BottomSheet)

**Mục đích:** tra username, xem đúng người rồi mới gửi lời mời kết bạn (kèm lời nhắn nếu muốn).
**REQ:** FRIEND-01 (AC1–AC5 + AC tra cứu / lời nhắn / giới hạn tra, v1.9), NOTIF-05 (`friend_request`), DEC-03.
**Mở từ:** 👤+ ở S-DM-04; "Thêm bạn" ở S-DM-04 `empty`, S-DM-03 `no-friends`. **Đi tới:** S-DM-04 `pending` chip "Đã gửi" (gửi được — frame `sent`), S-DM-04 `all` ("Chấp nhận" ở `card-received`, hoặc `auto-accepted`), S-DM-02 ("Nhắn tin" ở `card-friend`).

### Bố cục — bước 1 (`keyboard-open`)
```
│ Thêm bạn                                 │  title-2
│ Nhập username của người bạn muốn kết bạn.│  body, text-secondary
│ [ @ mai.tran                          ]  │  TextField, bàn phím text, không tự viết hoa
│ [               Tìm                   ]  │  Button · primary · L (Return cũng tra)
```

### Bố cục — bước 2 (`card`, v1.9 CR-25 #12)
```
│ Thêm bạn                                 │
│ Nhập username của người bạn muốn kết bạn.│
│ [ @ mai.tran                          ]  │
│ ┌──────────────────────────────────────┐ │  thẻ hồ sơ: nền surface-2, bo input, đệm 16
│ │ (M)  Mai mai.tran                    │ │  Avatar 48 · tên + username
│ │      Sinh viên K22 PTIT              │ │  giới thiệu ≤ 2 dòng, cắt … (không có thì bỏ dòng)
│ │      ────────────────────────────    │ │  kẻ mảnh border
│ │      Cùng ở Ôn thi Giải tích 2       │ │  label, text-secondary
│ └──────────────────────────────────────┘ │
│ Lời nhắn (không bắt buộc)         41/150 │  nhãn + bộ đếm label text-tertiary
│ [ Mình là An, nhóm ôn Giải tích tối nay nhé ] │  TextField nhiều dòng (tối đa 3 dòng rồi cuộn)
│ [            Gửi lời mời              ]  │  Button · primary · L
```

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Dòng server chung | "Cùng ở {Ôn thi Giải tích 2}" · "Cùng ở {Ôn thi Giải tích 2} và {Nhóm đồ án Mobile}" · "Cùng ở {A} và {N} server khác" · "Chưa ở chung server nào" |
| Quan hệ trên thẻ (một dòng `label` 600 `text-primary` dưới kẻ, trên dòng server chung; chỉ khi có quan hệ sẵn) | "Hai bạn đã là bạn bè" · "Bạn đã gửi lời mời cho {Hà}" · "{Giang} đã gửi lời mời cho bạn" · "Bạn đã chặn {Phong}" |
| Lỗi dưới ô username | `40401` "Không tìm thấy username này" · tra quá 30 lần / phút `40029` "Bạn tra cứu nhanh quá. Thử lại sau {42} giây." · 50 lời mời / ngày `40029` "Bạn đã gửi 50 lời mời hôm nay. Thử lại vào ngày mai." · username của mình (kiểm ở máy, không gọi tra) "Đây là username của bạn" · `40303` (sau khi bấm Gửi) "Không thể gửi lời mời cho người dùng này" · chỉ khi quan hệ đổi giữa lúc tra và lúc gửi: `40902` "Bạn đã gửi lời mời cho ha.nguyen rồi" / `40908` "Hai bạn đã là bạn bè" |

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `default` | Ô trống, nút "Tìm" `disabled` | |
| `keyboard-open` | Đã gõ "mai.tran"; `OS/Keyboard · text`; sheet nằm trên bàn phím, nút "Tìm" ngay trên bàn phím (C-02) | |
| `looking-up` 🆕 | Nút "Tìm" `loading`; ô vẫn sửa được | |
| `card` 🆕 | Như bố cục bước 2 (bàn phím đã đóng): thẻ Mai, lời nhắn đã gõ 41/150, nút "Gửi lời mời". Ô lời nhắn chỉ hiện khi có thẻ và còn gửi được; dừng ở 150 ký tự. Đổi chữ trong ô username → thẻ và ô lời nhắn mất, nút về "Tìm" | |
| `card-friend` 🆕 | Gõ "binh.tran": thẻ Bình + "Hai bạn đã là bạn bè" + `Button · text · S` "Nhắn tin" trong thẻ (→ đóng sheet, mở S-DM-02 Bình); không có ô lời nhắn; "Gửi lời mời" `disabled` | "Hai bạn đã là bạn bè" |
| `card-sent` 🆕 | Gõ "ha.nguyen": thẻ Hà + "Bạn đã gửi lời mời cho Hà"; không có ô lời nhắn; "Gửi lời mời" `disabled` | |
| `card-received` 🆕 | Gõ "giang.vo": thẻ Giang + "Giang đã gửi lời mời cho bạn"; không có ô lời nhắn; nút chính thành "Chấp nhận" → sheet đóng, `Toast` "Bạn và Giang đã là bạn bè", về S-DM-04 `all` | |
| `card-blocked` 🆕 | Gõ "phong.vu": thẻ Phong + "Bạn đã chặn Phong" + `Button · text · S` "Bỏ chặn" trong thẻ; "Gửi lời mời" `disabled` tới khi bỏ chặn (bỏ chặn không hỏi lại → thẻ thành như `card`, có ô lời nhắn) | |
| `sending` | Nút "Gửi lời mời" `loading` | |
| `sent` | Sheet đóng về S-DM-04 tab Đang chờ, chip "Đã gửi · 2" chọn sẵn: Mai trên cùng ("20:12", "“Mình là An, nhóm ôn Giải tích tối nay nhé”", "Hủy lời mời"), rồi Hà; `Toast` trên `TabBar` | "Đã gửi lời mời cho mai.tran" |
| `error` | Gõ "mai.trann" → lỗi dưới ô (C-02 field error), không có thẻ, nút "Tìm" | "Không tìm thấy username này" — các mã khác ở bảng Nội dung chữ |
| `lookup-limited` 🆕 | Tra quá 30 lần / phút: lỗi dưới ô, nút "Tìm" `disabled` tới hết thời gian (số giây đếm lùi mỗi giây) | "Bạn tra cứu nhanh quá. Thử lại sau 42 giây." |
| `auto-accepted` | Chỉ còn khi người kia vừa mời mình **sau** lúc tra (bình thường thẻ đã báo `card-received`): bấm "Gửi lời mời" thì hai người thành bạn (AC5), sheet đóng, `Toast` | "Bạn và Giang đã là bạn bè" |

### Tương tác
- Ô username chuẩn hóa trước khi tra: bỏ khoảng trắng hai đầu, bỏ một "@" ở đầu, chữ thường.
- Người đã chặn An: thẻ hiện bình thường như `card`; bấm "Gửi lời mời" → lỗi `40303` dưới ô (không lộ bị chặn).
- Lời nhắn hiện ở hàng lời mời (S-DM-04 `pending`) và ở dòng nội dung của mục `friend_request` trong hộp thư (06, ≤ 2 dòng cắt `…`).
- Gửi lời mời từ hồ sơ (02 S-HOME-10) hoặc dải `not-friend` của S-DM-02 vẫn **một bước, không lời nhắn**.

### Checklist duyệt
- [ ] 13 state; nút chính đúng chữ theo bước ("Tìm" / "Gửi lời mời" / "Chấp nhận").
- [ ] Quan hệ sẵn có hiện trên thẻ, không phải lỗi sau khi gửi; `40303` cùng một câu chung.

---

## S-DM-02 · Cuộc trò chuyện (DM 1-1 / Group DM)

**Mục đích:** nhắn tin riêng; bắt đầu cuộc gọi 1-1.
**REQ:** DM-01..03, GDM-01..03, FRIEND-03, DMVC-01/03, MSG-*, MSG-11, NOTIF-01, AUTH-05.
**Mở từ:** S-DM-01; S-HOME-10 "Nhắn tin"; S-DM-04 (💬 / chạm hàng); S-DM-05 `card-friend` ("Nhắn tin"); S-NOTI-01 (cuộc gọi nhỡ, "Nhắn tin" ở `friend_accepted` / sau khi kết bạn); 💬 trên màn cuộc gọi (v1.9, CR-25 #8); chip / App Link link tin DM (CR-19 #2); push DM. **Đi tới:** S-CALL-01 `calling` (📞 / 🎥 / "Gọi lại"), S-HOME-10 `outside-server` / `outside-server-none` (chạm tên / avatar ở header hoặc avatar trong tin — v1.9, CR-25 #11), S-DM-06 (chạm tên nhóm / 👥 ở Group DM), S-HOME-04 (nhấn giữ tin), S-DM-01 (`≡`), S-DM-04 `block-confirm` ("Chặn" ở dải `not-friend`).

### Bố cục (`default`, DM 1-1)
```
┌ Status bar ──────────────────────────────┐
│ ≡  (B)● Bình binh.tran        [📞] [🎥] │  ChannelHeader · dm: tên + username (v1.9)
│        [lamp] Đang học một mình · Tập trung · còn 18 phút │  dòng phụ = hoạt động dạng đủ, cắt theo C-04
│ ─────────── Hôm qua ───────────          │
│ [📵] Bình đã gọi · Cuộc gọi nhỡ · Gọi lại  16:45 │  MB/system (C-10), theo người xem
│ (B) Bình  16:46                          │
│     Gọi không được, chắc bạn đang học…   │
│ (A) An  16:52                            │
│     Mình vừa ra khỏi phòng, để mình gọi… │
│ [📞] Bạn đã gọi · 12 phút          17:05 │
│ ─────────── Hôm nay ───────────          │
│ (B) Bình  19:40 …                        │
│ (A) An  19:41  Ok 👍                     │
│ [+] Nhắn @Bình                  [☺] [➤]  │  Composer
├ TabBar (Home ③) ─────────────────────────┤
```

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục | |
| `group` | Group DM "Ôn thi cùng nhau": header avatar nhóm (2 avatar chồng), dòng phụ "4 thành viên" (không username, không hoạt động); ô phải là 👥 (không có 📞 🎥 — gọi nhóm là v1.x); có tin hệ thống "Bình đã tạo nhóm", "Bình đã thêm Dũng vào nhóm" | |
| `new-dm` | Chưa có tin: khối đầu cuộc trò chuyện ở đáy (Avatar 96, tên, username, "Đây là đầu cuộc trò chuyện của bạn và Lan.") — mẫu: Lan (bạn bè, ngoại tuyến, chưa từng nhắn); header "Lan lan.vu", không dòng phụ; 📞 🎥 vẫn hiện (gọi được người ngoại tuyến, CR-25 #4) | |
| `not-friend` | DM với người cùng server chưa là bạn (DM-02): dải dưới header "Bạn và Khánh chưa là bạn bè" · `Button · secondary · S` "Kết bạn" · `Button · text · S` "Chặn" (v1.9, CR-25 #9). Người kia đã mời mình: "Khánh muốn kết bạn" · `primary · S` "Chấp nhận" · `text · S` "Chặn" (luật bằng chữ, không frame riêng). Header "Khánh khanh.le", dòng phụ "Không làm phiền" | "Chặn" → `block-confirm` (S-DM-04) |
| `not-friend-sent` 🆕 | (v1.9) An vừa bấm "Kết bạn" (một bước, không lời nhắn): dải thành "Đã gửi lời mời kết bạn cho Khánh" · `text · S` "Hủy lời mời" · `text · S` "Chặn" | Hủy lời mời → dải về `not-friend`, không hỏi lại |
| `cannot-message` | `40303` (người kia chặn mình **hoặc** tắt DM từ thành viên server): `Composer · disabled`, icon `lock`, một câu chung; 📞 🎥 ẩn; header **không** có dòng phụ (cả hoạt động) và `PresenceDot` (D11) | "Không thể gửi tin nhắn cho người dùng này" |
| `blocked-by-me` | An đã chặn Phong: tin cũ của Phong ẩn (FRIEND-03); thay `Composer` là dải "Bạn đã chặn Phong" + `Button · secondary · S` "Bỏ chặn"; 📞 🎥 ẩn; header không có dòng hoạt động (CR-24 #1) | |
| `deleted-account` | Người kia đã xóa tài khoản: header "Tài khoản đã bị xóa" + avatar `deleted` (không username); lịch sử giữ; `Composer · disabled` | "Không thể gửi tin nhắn cho tài khoản đã bị xóa" |
| `call-leave-room` | Bấm 📞 khi đang ở phòng voice / Room Session. Frame giả định An đang là Participant phiên học ở "Phòng học im lặng" đã 31 phút (số của câu chuyện 03): `Dialog` "Gọi sẽ rời Phòng học im lặng" · "31 phút đã học được giữ." · "Hủy" / "Gọi và rời phòng" (v1.9, CR-25 #5) | Xem Tương tác cho các biến thể câu |
| `call-active` | Đang trong cuộc gọi **video** với Bình mà mở lại DM: dải `success` mảnh dưới header "Đang trong cuộc gọi · 03:12" + "Quay lại" → S-CALL-01; ô nổi `ParticipantTile · floating` của Bình góc dưới phải, đáy cách đỉnh `Composer` 16 (v1.9, CR-25 #7) — vừa nhắn vừa thấy người kia. Gọi thoại: chỉ có dải. Không có `MiniPlayer` trong DM của chính cuộc gọi | |
| `loading` / `offline` / `scrolled-up` / `keyboard-open` / … | Như S-HOME-01 (02), dùng lại luật (kể cả luật đọc CR-19 #1); khi offline 📞 🎥 vẫn hiện, chạm → `Toast` "Cần kết nối mạng để gọi" | |

Không áp dụng: `forbidden` RBAC (DM không dùng quyền server; thay bằng `cannot-message`), `os-permission` (ở S-CALL-01).

### Tương tác
- 📞 / 🎥 → S-CALL-01 `calling` (thoại / video). Nút gọi **không phụ thuộc presence**: người đang hiện Ngoại tuyến vẫn gọi được, không ai nghe thì nhỡ sau 45 giây (v1.9, CR-25 #4).
- **"Gọi lại"** trên tin hệ thống → gọi **đúng loại cũ** của cuộc gọi đó (thoại / video, theo lúc bắt đầu — v1.9, CR-25 #1).
- Đang ở phòng voice / Room Session → `call-leave-room` (v1.9, CR-25 #5): "Gọi sẽ rời {phòng}" · "{31 phút} đã học được giữ." — phần phút chỉ khi đang là Participant của Room Session và đã có ≥ 1 phút; phòng voice không có phiên: thân bỏ trống phần phút, chỉ tiêu đề "Gọi sẽ rời Phòng thảo luận nhóm"; là Host của phiên đang chạy thêm câu "Chi sẽ điều khiển phiên học." (người kế tiếp, CR-13 #2) · "Hủy" / "Gọi và rời phòng". Rời phòng vì gọi **không** hiện Toast "Đã rời … · Vào lại". Đang Học một mình thì gọi bình thường, Solo vẫn chạy (không dùng voice) — CR-06.
- Chạm avatar / tên trên header hoặc avatar trong tin → 02 S-HOME-10 ngữ cảnh ngoài server (`outside-server` / `outside-server-none`), kể cả với người không chung server; mở từ DM của chính người đó thì sheet không có "Nhắn tin" (v1.9, CR-25 #11 — bỏ luật "không thì không làm gì"). Ở Group DM chạm tên nhóm / 👥 vẫn mở S-DM-06; chạm avatar thành viên trong tin → S-HOME-10 ngoài server (có "Nhắn tin").
- Ghim, trả lời, reaction như kênh (DM: ai cũng ghim, chỉ xóa tin của mình — MSG-05/10). **Không highlight trong DM / Group DM** (v1.9, CR-12 #3): tin nhắc tới An hoặc trả lời tin của An không có nền mention, không tạo mục ở tab Thông báo (đã có badge 💬). `MentionSuggest` trong DM / Group DM không có nhóm VAI TRÒ (CR-19 #14). Gỡ xem trước link: chỉ tác giả (CR-19 #15).
- **Link tin & link NezFocus trong DM** (v1.9, CR-19 #2, #11 — luật bằng chữ, không vẽ thêm): nhấn giữ tin đã gửi → S-HOME-04 có "Sao chép link tin" (link dạng `https://nezfocus.app/dm/<channel_id>/<message_id>`, chỉ người trong cuộc mở được). Chip trong tin DM: link kênh luôn kèm tên server "Nhóm đồ án Mobile › #hoi-dap"; link tin "Tin nhắn với Bình" (DM 1-1) / "Tin nhắn trong Ôn thi cùng nhau" (Group DM) / "Nhóm đồ án Mobile › #hoi-dap › Tin nhắn" (tin ở server); không xem được → chip `lock` "Không xem được". Mở link tin DM → DM đó, tin ở 1/3 trên, trạng thái `highlight` (C-10); không ở DM đó → ở lại màn đang xem, `Toast` "Bạn không xem được tin nhắn này".
- **Back** (v1.9, CR-15): S-DM-02 là màn gốc của tab Home như một kênh (drawer đóng) → Back đưa app ra nền, không mở drawer. DM mở từ 💬 của màn cuộc gọi theo cùng luật: Back **không** quay lại S-CALL-01; về cuộc gọi bằng "Quay lại" trên dải `call-active` hoặc chạm ô nổi.

### Checklist duyệt
- [ ] 10 state riêng (+ dùng lại state của S-HOME-01); `default` khung 360 và theme sáng.
- [ ] 40303 cùng một câu ở mọi chỗ (S-DM-02, S-DM-05, S-HOME-10).
- [ ] Tin hệ thống cuộc gọi ghi đúng người gọi theo góc nhìn An; header có username, dòng hoạt động giữ đủ "còn 18 phút".

---

## S-DM-03 · Tạo nhóm / thêm vào nhóm

**Mục đích:** chọn 2–9 bạn để tạo Group DM, hoặc thêm bạn vào nhóm đang có.
**REQ:** GDM-01/02/03.
**Mở từ:** ✎ ở S-DM-01; "Thêm bạn vào nhóm" ở S-DM-06. **Đi tới:** S-DM-02 `group` (tạo xong / thêm xong).

### Bố cục (`picker`)
```
│ ‹  Nhóm mới                    Tạo (3)  │  ScreenHeader · hành động chữ
│ [Bình ×] [Chi ×] [Dũng ×]               │  chip người đã chọn, cuộn ngang
│ [🔍 Tìm bạn bè                       ]  │
│ (B)● Bình                          [✓]  │  FriendRow + Checkbox (C-23)
│ (C)● Chi                           [✓]  │
│ (D)● Dũng                          [✓]  │
│ (T)◐ Tuấn                          [ ]  │
```

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `picker` | Đã chọn 3; "Tạo (3)" bật khi chọn ≥ 2 | |
| `picker-empty` | Chưa chọn ai: "Tạo" `disabled`, dòng gợi ý | "Chọn từ 2 đến 9 bạn" |
| `limit-reached` | Có `TabBar` như mọi state của S-DM-03 (Toast nằm trên TabBar). Vẽ ở ngữ cảnh thêm vào nhóm "Ban nhạc CLB" đã đủ 10 người (An chỉ có 6 bạn nên không thể chọn đủ 9 khi tạo nhóm mới — sửa 20/10/2026 khi vẽ): dòng "Ban nhạc CLB đã đủ 10 người", mọi hàng mờ, nút "Thêm" `disabled`, chạm → `Toast`. Khi tạo nhóm mới, chọn đủ 9 thì các hàng chưa chọn mờ theo cùng luật | "Nhóm tối đa 10 người" (`40052`) |
| `add-to-group` | Mở từ S-DM-06: tiêu đề "Thêm vào nhóm", người đã ở nhóm hiện "Đã trong nhóm" (không chọn được); nút "Thêm (1)" | Nhóm đã 10 → hàng nào cũng mờ + dòng "Nhóm đã đủ 10 người" |
| `creating` | Nút `loading` | |
| `no-friends` | Chưa có bạn: `EmptyState` | "Chỉ tạo nhóm được với bạn bè" · "Kết bạn trước, rồi quay lại tạo nhóm." · "Thêm bạn" |

---

## S-DM-06 · Thông tin nhóm 🆕

**Mục đích:** xem thành viên, đổi tên nhóm, thêm người, rời nhóm.
**REQ:** GDM-02/03, MSG-11.
**Mở từ:** chạm tên nhóm hoặc 👥 ở S-DM-02 `group`. **Đi tới:** S-DM-03 `add-to-group`, S-DM-01 (rời nhóm xong).

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `member` | Avatar nhóm 96, tên nhóm, "4 thành viên"; hàng "Thêm bạn vào nhóm"; danh sách `MemberRow · username` (C-28, 22/10/2026; Chủ nhóm có nhãn "Chủ nhóm"); "Rời nhóm" (`danger`) | |
| `owner` | Mẫu: nhóm "Đồ án Mobile" do An tạo (An, Chi, Dũng) — ở "Ôn thi cùng nhau" chủ nhóm là Bình. Thêm "Đổi tên nhóm", "Đổi ảnh nhóm"; mỗi thành viên khác có ⋯ → "Xóa khỏi nhóm" | |
| `rename` | Sheet đổi tên (`TextField`, ≤ 100 ký tự), bàn phím mở, phím Return "Xong". ("Đổi ảnh nhóm" mở trình chọn ảnh của máy như 02 › S-HOME-05 `picking`, không có frame riêng) | |
| `member-menu` | (thêm 20/10/2026 khi duyệt) Chủ nhóm chạm ⋯ ở hàng Chi → `ActionSheet` tiêu đề "Chi": "Nhắn tin" · "Xóa khỏi nhóm" (`danger`). Thành viên thường không có ⋯: chạm hàng mở cùng sheet, chỉ có "Nhắn tin". Chạm hàng của chính mình: không làm gì | |
| `remove-confirm` | `Dialog` "Xóa Chi khỏi nhóm?" · "Chi sẽ không nhận tin của nhóm nữa. Bạn có thể thêm Chi lại sau." · "Hủy" / "Xóa" (`danger`); xong thì nhóm có tin hệ thống "An đã xóa Chi khỏi nhóm" (MSG-11) | GDM-02 AC3 |
| `leave-confirm` | `Dialog` "Rời nhóm Ôn thi cùng nhau?" · "Bạn sẽ không nhận tin của nhóm nữa. Chỉ được vào lại khi có người thêm bạn." (Chủ nhóm: "· Quyền chủ nhóm chuyển cho Chi.") · "Hủy" / "Rời nhóm" | GDM-02 |
| `owner-leave-confirm` | Chủ nhóm bấm "Rời nhóm" ("Đồ án Mobile"): "Rời nhóm Đồ án Mobile?" · "Bạn sẽ không nhận tin của nhóm nữa. Quyền chủ nhóm chuyển cho Chi." (Chi vào nhóm sớm nhất còn lại) · "Hủy" / "Rời nhóm" | GDM-02 |

---

## S-CALL-01 · Cuộc gọi

**Mục đích:** gọi thoại / video 1-1, rõ đang ở bước nào; vẫn nhắn được và thấy người kia khi thu nhỏ.
**REQ:** DMVC-01/03, VC-01, UF-07, 8.4.1.
**Mở từ:** 📞 / 🎥 / "Gọi lại" ở S-DM-02; ⋯ ở S-DM-04; nghe máy ở S-CALL-02; chạm `MiniPlayer · call` / ô nổi / "Quay lại" ở dải `call-active`. **Đi tới:** S-DM-02 (kết thúc; 💬 — thu nhỏ và mở DM của chính cuộc gọi), màn trước (⌄ / Back — `MiniPlayer · call`), S-MOD-05 `mic` (lần đầu) / `mic-blocked-call` (Android đã chặn).

### Bố cục (`in-call-audio`)
```
┌ Status bar ──────────────────────────────┐
│ [⌄]                                [💬] │  thu nhỏ · Nhắn tin + Badge số tin chưa đọc (v1.9)
│                                          │
│             ((  B  ))                    │  Avatar 96 + speaking-ring khi Bình nói
│               Bình                       │  title-1
│              03:12                       │  Unbounded tabular, text-secondary
│                                          │
│   (🎤)     (🔊)     (📷)     (📞✕)       │  RoomControl: Mic · Loa ngoài · Camera · Kết thúc (danger)
│   Mic   Loa ngoài  Camera  Kết thúc      │
└──────────────────────────────────────────┘
```
Nền `bg`, nội dung căn giữa ở 1/3 trên, nút ở vùng ngón cái (chế độ Experience). Nút theo C-17: Mic / Camera / Loa ngoài **bật** = nền `surface-3` + icon bật (`mic`, `video`), **tắt** = nền `surface-2` + icon tắt; chỉ nút Kết thúc / Từ chối (`danger`) và Nghe / Gọi lại (`success`) có màu. Đang gọi video có thêm nút "Đổi camera". Khi người kia đang nói, avatar có **speaking-ring** chuẩn (DESIGN.md: vòng 2 `text-primary`, khe 2 cùng màu nền, hiện ≤ 300ms, mờ dần khi ngừng, không nhấp nháy) — không dùng `success` (D2, 22/10/2026).

**Hàng đầu màn hình** (v1.9, CR-25 #8): ⌄ trái, `IconButton` 💬 (`message-square`, `accessibilityLabel` "Nhắn tin") phải, kèm `Badge · count` khi DM có tin chưa đọc (cùng số với `DMRow`). Có ở mọi state đang gọi (`calling`, `calling-video`, `connecting`, `in-call-*`, `camera-on`, `muted`, `peer-camera-off`, `reconnecting`). Màn kết thúc có "Gọi lại" / "Đóng" (`declined`, `busy`, `no-answer`, `connect-failed`, `call-dropped`): không có ⌄ (không còn gì để thu nhỏ), vẫn có 💬 (chạm → đóng màn, mở DM). `ended` (tự đóng sau 2 giây): không có hàng này. Gọi video: ⌄ · tên + giờ · 💬 nằm trên cùng dải mờ đầu màn hình.

### Trạng thái
| State | Khác gì so với `in-call-audio` | Chữ |
|---|---|---|
| `calling` | Gọi đi, chưa ai nghe: dòng giờ thay bằng "Đang gọi…"; chỉ còn Mic · Loa · Kết thúc (hủy). Người kia hiện Ngoại tuyến vẫn gọi bình thường (CR-25 #4) | "Đang gọi…" |
| `calling-video` | Gọi video: nền là camera của mình (mờ 30%; trên canvas là ô giữ chỗ "(camera của bạn)" như ô của Bình ở `in-call-video`), avatar Bình ở giữa; nút Mic · Loa ngoài · Camera (bật) · Đổi camera · Hủy | "Đang gọi video…" |
| `connecting` | Bình vừa nghe: "Đang kết nối…" (mục tiêu ≤ 3 giây, DMVC-01 AC3; quá 15 giây → `connect-failed`) | |
| `in-call-audio` | Như bố cục; 💬 không badge (DM Bình đã đọc hết) | |
| `camera-on` | Đang gọi thoại, An bật camera (cả hai phía đều bật được, CR-06): chuyển sang bố cục `in-call-video` ở phía Bình; phía An thấy camera mình ở ô nhỏ 96 × 128 góc phải, **ngay dưới hàng đầu màn hình** (không chồng 💬), ô Bình vẫn là avatar | |
| `minimized` | Bấm ⌄ hoặc Back: về màn trước. Frame mẫu: từ `camera-on` (camera An đang bật), An sang tab Thông báo: `MiniPlayer · call` trên `TabBar` ("Bình" · "03:12" · **Camera** (`video`, `on`) · Mic · Kết thúc — v1.9, CR-25 #6); không ô nổi (camera Bình tắt). Chạm Camera = tắt camera, nút ẩn đi, không Toast; bật camera chỉ ở màn cuộc gọi. Camera của mình tắt: không có nút Camera. Trong DM của chính cuộc gọi đó: chỉ có dải `call-active` dưới header, **không** `MiniPlayer` (tránh hai chỗ cùng nói một việc) | |
| `minimized-video` 🆕 | (v1.9, CR-25 #7) Thu nhỏ từ `in-call-video` sang 02 S-HOME-01 `#hoi-dap`: ô nổi `ParticipantTile · floating` 108 × 144 của Bình (hình camera, dải tên "Bình" ở đáy, viền 2 `text-primary` khi Bình nói, **không đồng hồ**) ở góc dưới phải, cách mép phải 16, đáy cách đỉnh `Composer` 16; `MiniPlayer · call` có Camera (camera An đang bật) | |
| `tile-menu` 🆕 | (v1.9) Nhấn giữ ô nổi ở `minimized-video` → `ActionSheet` tiêu đề "Bình": "Đổi góc" (sang góc kế tiếp theo chiều kim đồng hồ) · "Ẩn ô" (ẩn tới hết cuộc gọi, `MiniPlayer` vẫn còn). Hai mục này cũng là `accessibilityActions` của ô (thay cho kéo) | |
| `in-call-video` | Camera Bình phủ màn hình (`ParticipantTile · video`), camera mình ô nhỏ 96 × 128 góc phải **dưới dải đầu màn hình** (kéo được), thêm nút "Đổi camera"; dải mờ đầu màn hình: ⌄ · "Bình" + "03:12" · 💬 với `Badge` "1" (Bình vừa gửi một tin); chạm màn hình ẩn / hiện nút | |
| `muted` | Mic tắt: nút Mic `off`; phía Bình thấy icon `mic-off` cạnh tên | |
| `peer-camera-off` | Bình tắt camera trong cuộc gọi video: ô Bình thành avatar 96 trên `surface-2` | |
| `reconnecting` | Mất mạng: "Đang kết nối lại…" thay giờ, nút vẫn bấm được; quá 30 giây thì kết thúc | |
| `connect-failed` 🆕 | (v1.9, CR-25 #2) Đã nghe máy mà 15 giây chưa có media: cả hai phía thấy "Không kết nối được"; "Gọi lại" (`success`) / "Đóng". DM (An xem): `phone-off` "Bạn đã gọi · Không kết nối được · **Gọi lại**" (không thời lượng) | "Không kết nối được" |
| `declined` | "Cuộc gọi bị từ chối" (DMVC-03 AC2); "Gọi lại" / "Đóng". DM: `phone-off` "Bạn đã gọi · Cuộc gọi bị từ chối · **Gọi lại**"; Bình không có mục `missed_call` | |
| `busy` | "Bình đang bận" (DMVC-01 AC4 — Bình đang trong cuộc gọi khác, đang gọi đi hoặc đang đổ chuông một cuộc đến); "Gọi lại" / "Đóng". DM: `phone-missed` "Bạn đã gọi · Cuộc gọi nhỡ · **Gọi lại**"; phía Bình: không chuông, chỉ có "An đã gọi · Cuộc gọi nhỡ · Gọi lại" + mục `missed_call` | |
| `no-answer` | Hết 45 giây: "Bình không trả lời"; "Gọi lại" / "Đóng". DM: "Bạn đã gọi · Cuộc gọi nhỡ · **Gọi lại**" | DMVC-03 AC1 |
| `ended` | "Cuộc gọi đã kết thúc · 03:15" (nối tiếp đồng hồ 03:12 của chuỗi mẫu); tự đóng sau 2 giây về S-DM-02, DM có "Bạn đã gọi · 3 phút" | |
| `mic-denied` | Mic đã bị Android chặn khi bấm gọi: sheet 10 › S-MOD-05 `mic-blocked-call` trên S-DM-02 "Cần quyền mic để gọi" · "Bật quyền Mic cho NezFocus trong Cài đặt của máy để Bình nghe thấy bạn." · "Mở cài đặt" / "Để sau"; không gọi. Lần gọi đầu tiên đi qua sheet giải thích S-MOD-05 `mic` (đổi từ dialog tạm ngày 21/10/2026) | |

"Gọi lại" ở mọi màn kết thúc gọi đúng loại cũ (thoại / video). Không áp dụng: `loading`, `empty`, `offline` (không gọi được khi offline — chặn ở S-DM-02), `forbidden` (`40303` → `cannot-message` ở S-DM-02).

### Tương tác
- 💬 → thu nhỏ cuộc gọi và mở S-DM-02 của chính cuộc gọi (cuộn tới vạch "Tin nhắn mới" nếu có), dù màn trước đó là gì (đang ở tab khác thì chuyển sang tab Home). Back từ DM theo luật Back của CR-15 (S-DM-02 › Tương tác).
- **Ô nổi** (v1.9, CR-25 #7): hiện khi cuộc gọi đang thu nhỏ và camera người kia bật (hoặc đã bật lúc thu nhỏ), ở mọi màn trừ S-CALL-01 — kể cả DM của chính cuộc gọi (cùng dải `call-active`). Đã hiện thì ở lại tới hết cuộc gọi: người kia tắt camera → avatar 56 trên `surface-2`, ô không biến mất. **Kéo được**, thả ra hít vào góc gần nhất trong 4 góc (góc trên nằm dưới header; góc dưới: đáy cách đỉnh `MiniPlayer` / `Composer` / bàn phím 16, lấy cái cao nhất); app nhớ góc trên máy cho các cuộc gọi sau. Chạm ô → S-CALL-01. Nhấn giữ → `tile-menu`. `Toast` nằm **trên** ô khi ô ở góc dưới; sheet / dialog phủ lên ô.
- Ở màn có `TabBar` và cuộc gọi đang thu nhỏ: thứ tự từ đáy lên `TabBar` → `MiniPlayer · call` → `Composer` (02 › Vị trí) → ô nổi.

### Checklist duyệt
- [ ] 18 state; `in-call-audio` khung 360 và theme sáng (có 💬).
- [ ] Phân biệt các trạng thái kết thúc không chỉ bằng màu (chữ riêng); mỗi màn kết thúc ghi đúng tin hệ thống trong DM.
- [ ] Ô của mình không chồng 💬; ô nổi không có đồng hồ, không bóng đổ ngoài quy định của C-07.

---

## S-CALL-02 · Cuộc gọi đến

**Mục đích:** biết ai gọi, nghe hoặc từ chối trong 1 chạm.
**REQ:** DMVC-01 (AC1, AC2, AC4), DMVC-03, NOTIF-02.
**Mở từ:** `CALL_CREATE` khi app đang mở; bấm push cuộc gọi khi app ở nền. **Đi tới:** S-CALL-01 `connecting` (Nghe), màn trước (Từ chối / người gọi hủy).

### Bố cục (`foreground`)
```
│             (·( C )·)                    │  Avatar 96 + quầng chuông trung tính
│                Chi                       │  title-1
│        Cuộc gọi thoại đến                │  body, text-secondary
│                                          │
│      (📞✕)                  (📞)         │  RoomControl/main danger · success
│      Từ chối                Nghe         │
```

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `foreground` | Như bố cục; nhạc chuông + rung theo chế độ chuông của máy. **Đang đổ chuông** không dùng vòng màu: quanh avatar là quầng `border` mềm (rộng 12, mờ 60%) phập phồng mờ–rõ theo nhịp chuông (mỗi lần chuyển `medium`); Giảm chuyển động: quầng đứng yên ở mức rõ; canvas vẽ khoảnh khắc rõ nhất. Không dùng speaking-ring (vòng đó chỉ nghĩa là "đang nói") và không dùng `success` (D2, 22/10/2026) | "Cuộc gọi thoại đến" |
| `video` | "Cuộc gọi video đến"; nền camera của mình mờ (nếu đã có quyền camera); cùng quầng chuông như `foreground` | |
| `notification` | App ở nền: notification ưu tiên cao kênh "Cuộc gọi" trên màn hình khóa / đầu màn hình. Frame mẫu: An đang ở "Phòng học im lặng" (app ở nền): "Chi · Cuộc gọi thoại đến" · dòng "Nghe máy sẽ rời Phòng học im lặng" (v1.9, CR-25 #5) + hai nút "Từ chối" / "Nghe" (CR-06; nút "Nghe" mở app vào S-CALL-01 `connecting`, là đồng ý rời phòng luôn — không hỏi thêm, không Toast "Đã rời …"); chuông lặp tới khi hết 45 giây. Không ở phòng: không có dòng rời phòng | |
| `in-room` | Đang ở phòng voice / Room Session, app mở: dùng sheet `incoming-call` đã chốt ở 03 (S-ROOM-EDGE) — không mở màn toàn màn hình. Chữ theo CR-25 #5: "Nghe máy sẽ rời Phòng học im lặng · 31 phút đã học được giữ" (+ "· Chi sẽ điều khiển phiên học" khi là Host) · "Từ chối" / "Nghe và rời phòng" (03 vẽ) | |
| `caller-cancelled` | Frame vẽ ngữ cảnh: An đang mở sẵn DM với Chi khi cuộc gọi đến, nên màn đóng là thấy ngay tin nhỡ trong DM Chi. Chi hủy trước khi An nghe: màn đóng; DM có `phone-missed` "**Chi** đã gọi · Cuộc gọi nhỡ · **Gọi lại**"; mục `missed_call` ở tab Thông báo. An bấm **Từ chối** thì DM ghi `phone-off` "Chi đã gọi · Cuộc gọi bị từ chối · Gọi lại" và **không** tạo mục ở tab Thông báo (CR-06) | |

S-CALL-02 chỉ chứa **một** cuộc gọi: đang đổ chuông một cuộc mà có cuộc thứ hai tới → người gọi thứ hai thấy `busy`, An không có chuông / màn / Toast / notification heads-up cho cuộc đó, chỉ có tin nhỡ trong DM và mục `missed_call` (v1.9, CR-25 #2).

---

## Ma trận trạng thái

| Màn hình | default | loading | empty | error | offline | forbidden | os-permission |
|---|---|---|---|---|---|---|---|
| S-DM-01 | ✔ | ✔ | ✔ | — cache | ✔ | — | — |
| S-DM-04 | ✔ `online` | — cache | ✔ `empty`, `empty-online`, `pending-empty` | — | ✔ | — | — |
| S-DM-05 | ✔ | ✔ `looking-up` | — | ✔ `error`, `lookup-limited` | nút `disabled` | ✔ `40303` trong `error` | — |
| S-DM-02 | ✔ | như 01 | ✔ `new-dm` | như 01 | như 01 | ✔ `cannot-message`, `blocked-by-me` | — |
| S-DM-03 | ✔ `picker` | — | ✔ `no-friends` | toast | nút `disabled` | — | — |
| S-DM-06 | ✔ `member` | — | — | toast | nút `disabled` | ✔ (`member` không có thao tác của chủ nhóm) | ảnh nhóm: photo picker không cần quyền |
| S-CALL-01 | ✔ `in-call-audio` | — | — | ✔ `declined`, `busy`, `no-answer`, `connect-failed`, `reconnecting` | chặn trước khi gọi | — | ✔ `mic-denied` (camera bị từ chối: nút Camera `no-permission`) |
| S-CALL-02 | ✔ `foreground` | — | — | — | — | — | ✔ thông báo bị tắt: chỉ nhận cuộc gọi khi app đang mở (06 `push-denied`) |

Màn của area khác sửa trên đường đi: 02 › S-HOME-10 (hàng nút [Nhắn tin] [nút / `ChipStatus` quan hệ] [⋯]; state `menu`, `blocked`, `outside-server`, `outside-server-none`, khối hoạt động `activity` — CR-24 #1, CR-25 #9–#11; câu chữ `40303` chung); 03 › S-ROOM-EDGE `incoming-call` (chữ có phút + câu Host); 06 › `friend_request` có lời nhắn, `friend_accepted`; component: C-04 `dm`, C-07 `floating`, C-08 `call` (+ Camera), C-10 tin hệ thống cuộc gọi, C-21 `ChipStatus` quan hệ, C-30 `FilterChip`, C-32 `DMRow`, C-33 `FriendRow`.

## Edge case (rà ngày 21/10/2026; cập nhật 30/10/2026 theo SRS v1.9)

Frame nằm trong nhóm "09 · DM, bạn bè & cuộc gọi — Edge case", tên `S-DM-EDGE · <trường hợp>` / `S-CALL-EDGE · <trường hợp>`. Chủ dự án chọn cả 20 trường hợp. 8 frame (22/10/2026 thêm `long-names-dm-header`, `long-names-call`).

### Có frame
| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `blocked-mid-chat` — người kia chặn An khi An đang nhắn | Tin vừa gửi ở trạng thái lỗi kèm câu chung "Không thể gửi tin nhắn cho người dùng này" (không "Thử lại"); `Composer` chuyển `cannot-message`; 📞 🎥 ẩn; header ẩn dòng phụ (cả hoạt động) và `PresenceDot` (như mọi màn `40303`). Mẫu: DM với Khánh | FRIEND-03 AC1, DM-02 |
| `removed-from-group` — An bị xóa khỏi nhóm khi đang xem | Tin hệ thống "Bình đã xóa An khỏi nhóm"; header giữ avatar + tên nhóm nhưng **ẩn** dòng "n thành viên" và nút 👥, chạm tên không mở S-DM-06; câu "Bạn không còn ở nhóm này" xuất hiện **một lần**, ở `Composer · disabled` (icon `lock`, như `cannot-message`) — không thêm dải dưới header; lịch sử vẫn đọc được; rời màn thì nhóm biến khỏi S-DM-01 | GDM-02, MSG-11 |
| `call-dropped` — mất mạng quá 30 giây trong cuộc gọi | Màn kết thúc "Mất kết nối · 08:41" + "Đóng" / "Gọi lại" (+ 💬 ở góc phải, không ⌄); DM ghi `phone` "Bạn đã gọi · 8 phút" (v1.9, CR-25 #1) | DMVC-01, 8.4.1 |
| `long-names` — tên rất dài (3 frame) | `long-names` (danh sách DM): tên 1 dòng cắt `…`, giờ luôn hiện; dòng 2 1 dòng cắt `…`; tên nhóm dài cắt `…`; hàng của "Nguyễn Hoàng Phương Thảo Nguyên" (không có tin chưa đọc, đang ở phòng) có dòng hoạt động "Đang ở Phòng thảo luận nhóm đồ án Mobile" cắt `…` ở tên phòng (v1.9, CR-25 #16). `long-names-dm-header`: header DM dòng 1 = tên + username `phuongthao.nguyenhoang` — **username nhường chỗ trước** (cắt `…`, hết chỗ thì không còn), rồi tên mới cắt `…` (C-04; v1.9, CR-25 #14); dòng phụ và 📞 🎥 giữ nguyên chỗ. `long-names-call`: màn cuộc gọi tên tối đa 2 dòng, căn giữa, quá 2 dòng thì cắt `…`; đồng hồ luôn hiện đủ; ⌄ và 💬 giữ chỗ. Mẫu: "Nguyễn Hoàng Phương Thảo Nguyên" (tên hiển thị dài, cùng người ở danh sách) | C-32, C-04, DEC-03 (username ≤ 32) |
| `large-text-friends` — cỡ chữ 200% ở Bạn bè | Tên 1 dòng cắt `…`; username **xuống dòng riêng**, 1 dòng cắt `…` (v1.9, CR-25 #14); dòng hoạt động vẫn 1 dòng, "còn N phút" không cắt; `SegmentedControl` nhãn ×1.3, cắt `…` (C-20); hàng có lời mời: nút xếp dọc rộng hết cột chữ; 💬 ⋯ giữ 48 | DESIGN.md › Typography (200%), C-20, C-33 |
| `large-text-call` — cỡ chữ 200% ở màn cuộc gọi | Tên tối đa 2 dòng, đồng hồ ×1.5 (Unbounded) luôn đủ, hàng nút ghim ở đáy, nhãn nút ×1.3 (C-17); ⌄ và 💬 giữ 48 ở hàng đầu; phần trên cuộn nếu thiếu chỗ | C-17, NFR-A11Y-03 |

### Chỉ ghi luật (giao diện không đổi)
| Tình huống | Luật |
|---|---|
| Người kia xóa tài khoản khi đang DM / đang gọi | Cuộc gọi kết thúc ("Cuộc gọi đã kết thúc"); DM chuyển `deleted-account` khi nhận sự kiện |
| Hủy kết bạn khi đang ở DM | DM vẫn mở; còn chung server thì nhắn tiếp được (DM-02), không thì lần gửi sau thành `blocked-mid-chat` (cùng câu chung) |
| Hủy kết bạn giữa cuộc gọi (v1.9, CR-25 #3) | Cuộc gọi tiếp tục tới khi một bên kết thúc; gọi lần sau theo REQ-DM-02 |
| Bị chặn giữa cuộc gọi (v1.9, CR-25 #3) | Cuộc gọi kết thúc ngay ở cả hai phía; phía bị chặn thấy như kết thúc thường "Cuộc gọi đã kết thúc · mm:ss" (không nói lý do), `MiniPlayer` / ô nổi biến mất, DM chuyển `cannot-message` ở lần nhận sự kiện / thao tác kế tiếp; phía chặn thấy DM `blocked-by-me` |
| Nghe máy ở máy khác cùng tài khoản | Máy này đóng màn cuộc gọi đến, `Toast` "Đã nghe trên thiết bị khác" |
| Người thứ ba gọi khi An đang bận (v1.9, CR-25 #2) | An **bận** khi đang trong cuộc gọi, đang gọi đi (đang đổ chuông phía người kia) hoặc đang đổ chuông một cuộc đến. Không ngắt cuộc đang có; người gọi thấy `busy`; An **không** chuông, không S-CALL-02, không Toast, không notification heads-up — chỉ có tin "{Tên} đã gọi · Cuộc gọi nhỡ · Gọi lại" trong DM và mục `missed_call` ở tab Thông báo (DMVC-01 AC4, DMVC-03 AC3) |
| Đã nghe máy mà 15 giây chưa có media (v1.9, CR-25 #2) | `connect-failed` ở cả hai phía; tin hệ thống không có thời lượng |
| Gọi người đang hiện Ngoại tuyến (v1.9, CR-25 #4) | Nút gọi vẫn bật; S-CALL-01 `calling` như thường; không ai nghe thì `no-answer` sau 45 giây. Không chặn nút theo presence (sẽ lộ người đặt Ẩn) |
| Cuộc gọi điện thoại thường của máy đến giữa cuộc gọi app | App tự tắt mic; nghe máy thường thì cuộc gọi app vào `reconnecting`, quá 30 giây thì kết thúc như `call-dropped` |
| App bị tắt hẳn khi đang gọi | Phía bên kia vào `reconnecting`, quá 30 giây thì kết thúc. UI gọi gốc là v1.x (DMVC-04) |
| Chưa có quyền camera khi bật camera | Nút Camera `no-permission`; chạm → S-MOD-05 `camera` (area 10); cuộc gọi tiếp tục bằng thoại |
| An và Bình gọi nhau cùng lúc | Mỗi DM chỉ một cuộc gọi đang diễn ra (`uq_call_active_per_channel`): yêu cầu sau được xem là nghe máy, hai người vào cùng cuộc gọi, không ai thấy `busy` |
| Ô nổi khi bàn phím mở / có Toast / có sheet (v1.9, CR-25 #7) | Bàn phím mở: ô ở góc dưới nằm cách đỉnh bàn phím 16; Toast nằm trên ô; sheet / dialog phủ lên ô. Đã "Ẩn ô" thì không hiện lại tới hết cuộc gọi |
| Chấp nhận lời mời đúng lúc người kia hủy | `Toast` "Lời mời này không còn hiệu lực" (như 06 `invite-cancelled`), hàng biến mất |
| Quan hệ đổi giữa lúc tra và lúc gửi ở S-DM-05 | `40902` "Bạn đã gửi lời mời cho {username} rồi" / `40908` "Hai bạn đã là bạn bè" dưới ô; người kia vừa mời mình → `auto-accepted` |
| Hai người cùng thêm người thứ 10 vào nhóm | Người sau nhận `Toast` "Nhóm tối đa 10 người" (`40052`) |
| 200 bạn bè | Danh sách cuộn, đọc từ cache ≤ 300ms (FRIEND-04 AC1); tiêu đề nhóm ghi số thật ("TRỰC TUYẾN — 37"); ô tìm kiếm luôn ở đầu |
| Nhóm đủ 10 người | Header "10 thành viên"; S-DM-06 "Thêm bạn vào nhóm" `disabled` + dòng "Nhóm đã đủ 10 người" |
| Cuộc gọi dài hơn 1 giờ / dưới 1 phút | Đồng hồ "1:02:15"; tin hệ thống "Bạn đã gọi · 1 giờ 2 phút" / "Bạn đã gọi · dưới 1 phút" |
| Cuộc gọi video và camera bật / tắt giữa chừng | Tin hệ thống theo loại lúc bắt đầu: "Bình đã gọi video · 12 phút" (icon `video`); gọi thoại rồi bật camera vẫn ghi "đã gọi · …" (icon `phone`) |
| Nhóm chỉ còn 1 người (GDM-02 AC2) | Nhóm ẩn khỏi S-DM-01 của người còn lại, giữ lịch sử, hiện lại khi có người được thêm |

## Câu hỏi còn mở

Không còn. 21 câu chốt 20/10/2026 (chủ dự án đồng ý cả 21); hành vi mới ở `SRS_v1.2_change_notes.md` mục 11 (CR-06, đã áp vào SRS v1.6 ngày 21/10/2026). Cập nhật 30/10/2026 theo CR-12, CR-15, CR-19, CR-21, CR-24, CR-25 (đã áp vào SRS v1.9, Phụ lục 11.13).
