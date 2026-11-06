# 03 · Study Room & Phiên học ⭐ vertical slice

Màn hình phòng voice, phiên học (Room Session) và các thành phần đi kèm. Đây là nửa đầu của vertical slice: vẽ đủ mọi state, ở cả hai theme, trước các khu vực khác.

- Hành vi: SRS v1.9 Mục 4.9 (REQ-STUDY-01/02/10/11/15), 4.9.1, 4.9.2, 7.3.6, REQ-VC-01/02/03/04/05, REQ-NOTIF-02.
- Component: [00-components.md](00-components.md). Nhìn thế nào: [DESIGN.md](../../../DESIGN.md).
- Nhãn UI: Room Session = **"Phiên học"**, Host = **"Đang điều khiển"** (README › Thuật ngữ hiển thị trên UI).

## Quy ước chung của khu vực

| Hạng mục | Quy ước |
|---|---|
| Khung | 390 × 844; kiểm thêm 360 × 800 cho S-ROOM-02 và S-ROOM-03 |
| Vị trí | Màn hình phòng nằm trong tab **Home** (SRS 3.1): `ChannelHeader · study-room` hoặc `· voice` ở trên, `TabBar` (Home đang chọn) ở dưới. Không có `MiniPlayer` của **chính phòng đó** trên màn hình phòng. `MiniPlayer` của một phiên khác của mình vẫn hiện (v1.9, CR-22): xem trước phòng khác khi đang có Room Session / Học một mình (`not-joined-other-session`), hoặc đang Học một mình ngay trong phòng chưa có phiên (`MiniPlayer · solo`, S-ROOM-03 `solo-confirm`); khi đó `MiniPlayer` nằm giữa hàng nút và `TabBar` |
| Nền | Phòng **chưa có** phiên học: `bg`. Phòng **có** phiên học: nền tràn viền theo pha (`phase-focus-room` / `phase-short-room` / `phase-long-room`) — Study Room là bề mặt duy nhất được phủ màu (DESIGN.md › Colors) |
| Mic khi vào phòng (v1.9, CR-13) | Vào phòng voice nào mic cũng tắt sẵn (REQ-STUDY-02); không còn Silent Room, không nhãn "Im lặng", không toast "Mic đang tắt sẵn". "Phòng học im lặng" chỉ là **tên kênh** mẫu. Không xin quyền mic khi vào phòng; xin khi chạm Mic lần đầu (10 › S-MOD-05 `mic`), ở trong phòng hay ở màn xem trước. Trạng thái mic của mình ở nút Mic; trên ô / ghế chỉ đánh dấu người **bật** mic (C-07). Mọi frame của area không có chỉ báo `mic-off` của người tự tắt mic |
| Màu ngữ nghĩa | Không dùng trong phòng; lỗi và mất kết nối dùng `Banner`/`Toast` trung tính |
| Toast | Trên màn hình phòng, `Toast` hiện **ngay dưới header** (dưới chip vai trò nếu có; hàng `RoomControl` chiếm đáy màn hình); ở các màn hình khác vẫn hiện trên `MiniPlayer`/`TabBar` |
| Mascot | Chỉ ở pha Nghỉ (giữa vòng), tổng kết phiên (`host-stopped` và các biến thể, ngoài pha Tập trung) và màn hình giải thích quyền (S-ROOM-09); **không** ở pha Tập trung |
| Dữ liệu mẫu | Server "Ôn thi Giải tích 2"; kênh 🔊 "Phòng học im lặng" (Study Room, 25/5) và 🔊 "Phòng thảo luận nhóm" (Study Room); An là user chính; Bình, Chi, Dũng, Giang, Hà, Khánh, Lan, Mai. Lúc 21:47 "Phòng thảo luận nhóm" của Ôn thi GT2 **chưa có phiên**, có Nam và Quân (đều tắt camera) — dùng cho frame chuyển phòng (S-ROOM-05 `host-switch`) và `left-voice-toast`; khác "Phòng thảo luận nhóm" của Nhóm đồ án Mobile (đang Nghỉ ngắn, 04 › Phòng & bạn bè mẫu) |
| Nhánh "Học một mình" (v1.9, CR-22) | Frame có An đang Solo dùng đúng Solo của 04 (50/10, Vòng 1 bắt đầu 21:29, lúc 21:47 còn 32:10, đã học 17 phút): `not-joined-other-session`, S-ROOM-06, S-ROOM-03 `solo-confirm`, edge `solo-stopped-by-room-start`. Hai frame Solo ở phòng **chưa có phiên** (`solo-confirm`, `solo-stopped-by-room-start`) dùng nhánh "Phòng học im lặng chưa có phiên lúc 21:47" của S-ROOM-01 / S-ROOM-03 (4 người: An, Bình, Chi, Dũng — như S-ROOM-03 `conflict`) |
| Giờ mẫu & kịch bản (chốt 22/10/2026) | **21:47, Chủ Nhật 18/10/2026** (cùng area 04). Phiên học của "Phòng học im lặng" bắt đầu **21:11** (25/5): Vòng 1 21:11–21:36, nghỉ tới 21:41, lúc 21:47 đang **Vòng 2, còn 18:42, nghỉ ngắn lúc 22:06**. Phòng có 9 người (An + Bình, Chi, Dũng, Giang, Hà, Khánh, Lan, Mai); Chi bật camera và mic ("Lưới · 📹1"). An học một mình 14 phút buổi chiều, vào phòng từ 21:11 nên lúc 21:47 có 31 phút trong phiên, **45 phút hôm nay** (khớp cột CN ở tab Học), chuỗi **6 ngày** (T3–CN). Frame dùng giờ khác ghi rõ ở state của nó (`short-break` 22:07, edge `streak-reached` 21:12) |
| Đếm người | "{N} người đang Tập trung cùng bạn" / "đang chờ cùng bạn": N **không tính bạn** (phòng 9 người → "8 người…"). Khi chưa vào phòng (`not-joined`): "{N} người đang Tập trung" là số người trong phòng |

---

## S-ROOM-01 · Phòng voice chưa có phiên học

**Mục đích:** vào phòng, thấy ai đang ở đây, bắt đầu phiên học (nếu là Study Room).
**REQ:** VC-01/05, STUDY-01/02/11, NOTIF-02.
**Mở từ:** chạm `ChannelRow · voice/study-room` trong drawer trái; deep link kênh. **Đi tới:** S-ROOM-03 (Bắt đầu), S-ROOM-02 (khi có phiên học), S-ROOM-09 (lần đầu bắt đầu/tham gia phiên học), 10 › S-MOD-05 `mic` / `camera` (chạm Mic / Camera lần đầu, kể cả ở màn xem trước).

### Bố cục
```
┌ Status bar ──────────────────────────────┐
│ ≡  [lamp] Phòng học im lặng        💬 👥 │  ChannelHeader · study-room (💬 chat của phòng, 02 › S-HOME-08)
│ ┌────────┐┌────────┐                     │  VideoGrid · voice — LUÔN lưới ô (chốt 16/10/2026)
│ │  (A)   ││  (B)   │                     │  người tắt camera = ô avatar; lưới cuộn khi đông
│ │ Bạn    ││ Bình 🎙│                     │  chỉ người BẬT mic có chỉ báo (C-07, v1.9 CR-13)
│ └────────┘└────────┘                     │
│ ┌ Chưa có phiên học  [Bắt đầu phiên học] ┐│  thanh Start gọn (chỉ Study Room)
│                                          │
│  (mic) (camera)            (rời phòng)   │  RoomControl
├ TabBar (Home) ───────────────────────────┤
```

### Component
`ChannelHeader`, `ChipStatus`, `VideoGrid · voice` (ô `ParticipantTile · video`), `Button`, `RoomControl`, `Banner`, `Toast`, `TabBar`. Phòng chưa có phiên học **luôn** hiển thị người trong phòng dạng lưới ô, có hay không có camera (chốt 16/10/2026).

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Thanh Start | "Chưa có phiên học" (cấu hình mặc định hiện trong sheet S-ROOM-03) |
| Nút mời (chốt 18/10/2026) | "Mời vào phòng" (`Button · text · S`, `user-plus`) ngay dưới lưới ô, chỉ khi đã vào **Study Room** (REQ-STUDY-16) — mở thẳng bảng chia sẻ của Android |
| Nút | "Bắt đầu phiên học" |
| Nút vào (chưa vào phòng) | "Vào phòng"; đang ở một phòng voice khác: "Chuyển sang phòng này" (v1.9, CR-13) |
| Nút ở màn xem trước (v1.9, CR-22) | `RoomControl` "Mic" · "Camera" (mặc định `off`) bên trái nút vào |
| Ô của mình khi bật Camera ở màn xem trước | "Bạn" |

### Màn xem trước: Mic, Camera, ô của mình (v1.9, CR-22)
Áp cho mọi màn xem trước phòng voice (S-ROOM-01 `not-joined`, S-ROOM-02 `not-joined`, `not-joined-other-session`).
- Hàng đáy, cùng chỗ hàng `RoomControl` trong phòng: Mic · Camera (56, nhãn "Mic" / "Camera", mặc định `off`) rồi `Button · primary · L` "Vào phòng" / "Chuyển sang phòng này" chiếm phần còn lại của hàng. Hàng không đổi theo việc phòng có phiên hay không.
- Chạm Mic / Camera lần đầu → 10 › S-MOD-05 `mic` / `camera`, rồi hộp quyền hệ thống. Vào phòng mà chưa chạm Mic → không xin quyền mic.
- Bật Camera → ô `ParticipantTile · video · self` 96 × 128 (3:4, lật gương, tên "Bạn") nổi ở góc dưới phải, cách mép phải 16, đáy cách đỉnh hàng nút 16; không đẩy bố cục (lưới / vòng vẫn ở chỗ cũ, ô nổi đè lên). Tắt Camera → ô biến mất.
- Đã bật Camera ở đây thì trong phiên đăng nhập đó, vào phòng rồi bật Camera **không** qua `camera-self-preview`. Vào phòng với đúng trạng thái Mic / Camera đang chọn.
- Offline, bị tạm khóa (08 › S-SET-EDGE `timed-out-voice`), thiếu `CONNECT`: **không** có Mic, Camera, ô của mình — chỉ nút vào `disabled` kèm lý do như hiện có.

### Trạng thái
| State | Khác gì so với default (`study-room-idle`: đã vào, Study Room, chưa có phiên) | Chữ / hành động riêng |
|---|---|---|
| `not-joined` | Chưa vào phòng: lưới ô avatar (chưa tải hình camera) + thanh "Chưa có phiên học · vào phòng để bắt đầu" (không nút) + hàng đáy Mic `off` · Camera `off` · `Button · primary · L` "Vào phòng" (mục "Màn xem trước" ở trên); không có các nút trong phòng (Rời phòng…) | Chạm "Vào phòng" → vào ngay với mic tắt, **không** xin quyền mic (v1.9, CR-13) |
| `camera-on-before-join` 🆕 | Như `not-joined`, đã bật Camera: nút Camera `on`; ô "Bạn" 96 × 128 lật gương ở góc dưới phải trên hàng nút | (v1.9, CR-22) |
| `study-room-idle` | Như bố cục | |
| `not-study-room` | Kênh voice thường (`focus_control = off`): **không** có thanh Start; lưới ô chiếm thân màn hình | REQ-STUDY-01 AC8 |
| `managers-only` | `focus_control = managers`, user không có quyền: thanh Start chỉ còn chữ "Chưa có phiên học · chỉ người quản lý bắt đầu được", không nút | REQ-STUDY-11 |
| `voice-video-grid` | Có người bật camera: ô của người đó hiện hình camera, người đang nói có `speaking-ring`; bố cục giữ nguyên | Mẫu là Study Room "Phòng thảo luận nhóm", nên có thanh Start |
| `camera-self-preview` | Đã vào phòng, chạm Camera lần đầu trong phiên đăng nhập **mà chưa bật Camera ở màn xem trước** (v1.9, CR-22): `BottomSheet` "Xem trước camera" với ô `ParticipantTile · video · self` (lật gương), nút "Bật camera" / "Hủy" | REQ-VC-01: không phát hình khi chưa xem trước |
| `offline` | `Banner · offline`; không có Mic, Camera ở hàng đáy (v1.9, CR-22); nút "Vào phòng"/"Bắt đầu phiên học" `disabled` kèm chữ "Cần kết nối mạng để vào phòng" | SRS 3.5 |

### Tương tác
- Chạm "Bắt đầu phiên học" → S-ROOM-09 nếu chưa từng xin quyền thông báo, rồi S-ROOM-03. Đang Học một mình trong phòng này → S-ROOM-03 rồi `solo-confirm` (v1.9, CR-22).
- Chạm "Vào phòng" khi đang Solo → S-ROOM-06 (chỉ khi phòng **đang có** phiên học; phòng chưa có phiên thì vào bình thường, Solo vẫn chạy — `MiniPlayer · solo` hiện trên màn phòng, ở màn khác là `MiniPlayer · voice-solo`, S-ROOM-08).
- Chạm "Chuyển sang phòng này" (đang ở phòng voice khác) → rời phòng cũ rồi vào phòng này; đang là Host của phiên đang chạy ở phòng cũ → S-ROOM-05 `host-switch` trước. Chuyển phòng **không** có Toast "Đã rời …" (v1.9, CR-13, CR-22).
- Rời phòng: `RoomControl` "Rời phòng" → về màn hình kênh trước đó; không hỏi lại; Toast theo mục "Rời phòng & chuyển phòng" (S-ROOM-05). Phòng chưa có phiên: thường là `left-voice-toast`.
- Chạm 💬 → chat của phòng (02 › S-HOME-08), kể cả khi chưa vào phòng (`not-joined`): đọc/gửi theo quyền của kênh voice (DEC-35).

### Checklist duyệt
- [ ] 8 state, mỗi state một frame; `study-room-idle` và `voice-video-grid` ở cả hai theme.
- [ ] Không có nút Start ở `not-study-room` và `managers-only`.
- [ ] Ô video của chính mình lật gương (cả ô 96 × 128 ở `camera-on-before-join`).
- [ ] Không ô nào có chỉ báo `mic-off`; chỉ người bật mic có chỉ báo.
- [ ] Ô "Bạn" ở `camera-on-before-join` không đẩy lưới, cách hàng nút 16.

---

## S-ROOM-02 · Phiên học đang chạy

**Mục đích:** học cùng nhau theo một đồng hồ chung; thấy ai đang học cùng.
**REQ:** STUDY-01/02/11/15, VC-01/02/04.
**Mở từ:** S-ROOM-01 sau khi Bắt đầu; chạm `ChannelRow · focus-running` hoặc hàng "Đang học lúc này" ở tab Học (→ `not-joined` trước khi vào); chạm `MiniPlayer`; notification chuyển pha. **Đi tới:** S-ROOM-04 (Điều khiển), S-ROOM-05 (Dừng), drawer phải (danh sách đầy đủ).

### Bố cục — chế độ Vòng (mặc định)
```
┌ Status bar ──────────────────────────────┐
│ ≡  [lamp] Phòng học im lặng        💬 👥 │  ChannelHeader · study-room
│ [Bạn đang điều khiển]                    │  chip
│ [● Vòng | Lưới · 📹1]                    │  SegmentedControl — luôn có trong phiên học
│                                          │
│             (An)                         │
│       (M)  ╭──────╮  (B)                 │  FocusTimer · ring + ParticipantTile · ring
│      (L)   │[lamp] Tập trung│ (C)📹      │  luật xếp ghế: 00-components › C-06
│            │ 18:42 │                     │
│      (K)   │Vòng 2 · nghỉ ngắn lúc 22:06│
│       (H)  ╰──────╯  (D)                 │
│             (G)                          │
│     8 người đang Tập trung cùng bạn      │  body, đậm 600 (không tính bạn)
│          [👤+ Mời vào phòng]             │  Button · text · S (REQ-STUDY-16)
│     Bạn đã tập trung 45 phút hôm nay     │  label, text-secondary
│                                          │
│ (mic) (camera) (⏸ Tạm dừng) (điều khiển) (rời) │  RoomControl — hàng của Host
├ TabBar (Home) ───────────────────────────┤
```

### Bố cục — chế độ Lưới
```
│ [Vòng | ● Lưới · 📹3]                    │
│ [lamp] Tập trung 18:42                   │  FocusTimer · compact
│ Vòng 2 · 9 người · 3 bật camera          │
│ ┌────────┐┌────────┐                     │  VideoGrid · study-room — mọi người, cuộn được
│ │ Bạn 📹 ││ Bình 📹│                     │  thứ tự theo luật ưu tiên ghế
│ └────────┘└────────┘                     │
│ ┌────────┐┌────────┐                     │
│ │ Chi 📹 ││  (D)   │                     │  người tắt camera = ô avatar
│ └────────┘└────────┘                     │
│ (mic) (camera) (⏸) (điều khiển) (rời)    │
```

### Component
`ChannelHeader · study-room`, chip trạng thái, `SegmentedControl`, `FocusTimer · ring/compact`, `ParticipantTile · ring/ring-more`, `VideoGrid · study-room`, `RoomControl`, `Toast`, `Banner`, `TabBar`.

### Hàng nút `RoomControl`
| Vai trò | Nút (trái → phải) |
|---|---|
| Host, hoặc có `MANAGE_STUDY_ROOMS` | Mic · Camera · **Tạm dừng/Tiếp tục** (bản chính) · Điều khiển (→ S-ROOM-04) · Rời phòng |
| Participant | Mic · Camera · Rời phòng |
| Participant, phiên **không có Host** đang tạm dừng (v1.9, CR-22) | Mic · Camera · **Tiếp tục** (bản chính, `play`) · Rời phòng — chỉ Tiếp tục, không Tạm dừng / Bỏ qua pha / Sửa chu kỳ / Dừng; bấm không thành Host |

"Bỏ qua pha", "Sửa chu kỳ", "Dừng phiên học" nằm trong S-ROOM-04 để hàng nút giữ tối đa 5 nút ở khung 360 (khác ví dụ trong bảng C-17: bảng đó chưa có nút Camera cho Host).

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Chip vai trò (khi mình là Host) | "Bạn đang điều khiển" |
| Chip vai trò (người khác là Host) | "Bình đang điều khiển" |
| Chip vai trò (không có Host) | "Chưa có người điều khiển" |
| Dòng dưới vòng | "8 người đang Tập trung cùng bạn" (không tính bạn) / "Cả phòng đang nghỉ ngắn" / "Cả phòng đang nghỉ dài" |
| Dòng phụ | "Bạn đã tập trung 45 phút hôm nay" (tổng cả ngày, khớp cột hôm nay ở tab Học) |
| Nút mời (chốt 18/10/2026) | "Mời vào phòng" (`user-plus`) — mở thẳng bảng chia sẻ của Android (02 › S-HOME-07 `room`) |
| Dòng chu kỳ (FocusTimer) | theo bảng state của C-06 |

### Trạng thái
| State | Khác gì so với default (`focus-host`) | Chữ / hành động riêng |
|---|---|---|
| `focus-host` | Như bố cục chế độ Vòng | |
| `focus-participant` | Chip "Bình đang điều khiển"; hàng nút Participant (3 nút) | |
| `not-joined` 🆕 | Xem trước phòng đang có phiên, chưa kết nối (chạm hàng phòng ở tab Học / `ChannelRow · focus-running`, REQ-VC-01): chế độ Vòng chỉ để xem, chưa có ghế của bạn (12 giờ là người đầu tiên theo luật ưu tiên, bỏ bước "bạn": Host Bình); không chip vai trò, không `SegmentedControl`; dưới vòng "8 người đang Tập trung" + dòng **"Phiên học bắt đầu lúc 21:11"** (`label`, `text-secondary`; số vòng đã có trong vòng nhịp nên không lặp); hàng đáy Mic `off` · Camera `off` · `Button · primary · L` "Vào phòng" (S-ROOM-01 › Màn xem trước, v1.9 CR-22) thay `RoomControl` trong phòng | Đang Solo → "Vào phòng" mở S-ROOM-06; đang ở phòng voice khác → nút "Chuyển sang phòng này". Chốt 17/10/2026 |
| `not-joined-other-session` 🆕 | (v1.9, CR-22) Như `not-joined`, nhưng An đang Học một mình (nhánh Solo, 21:47 còn 32:10): `MiniPlayer · solo` ("Học một mình" · `PhaseBadge · S · live` "Tập trung 32:10" · Tạm dừng · Dừng) **vẫn hiện** trên `TabBar`; giữa vòng thay số đếm giây bằng **"còn 18 phút"** (`title-1`, cập nhật mỗi phút; < 1 phút: "còn dưới 1 phút"; phòng tạm dừng: số đứng yên như cũ). Cùng luật khi An có Room Session ở phòng khác (nút thành "Chuyển sang phòng này") | Nền của S-ROOM-06. Không có phiên nào của mình (hoặc chỉ ở phòng voice không có phiên) → vòng đếm giây như `not-joined` |
| `just-joined` | Vừa vào phòng đang có phiên lúc 21:47: `Toast` icon `timer` "Bạn đang được tính giờ từ 21:47" (4 giây), đặt **dưới chip** để chip vai trò vẫn thấy; dòng phụ "Bạn đã tập trung 14 phút hôm nay" (chưa có phút nào trong phiên này) | REQ-STUDY-15 |
| `late-join` | Vào giữa pha Tập trung: đồng hồ hiện đúng thời gian còn lại ngay khung hình đầu, không đếm lại từ đầu | "Tập trung — còn 13:00" · "Vòng 1 · nghỉ ngắn lúc 22:00" · dòng phụ "Bạn vừa vào · được tính từ 21:47" (STUDY-01 AC3) |
| `short-break` | Lúc **22:07** (vừa hết Vòng 2 lúc 22:06): nền `phase-short-room`; vòng nét gạch đầy dần; Runtime sleepy 64–72 giữa vòng; "03:20" · "Tập trung lại lúc 22:11"; dòng dưới vòng "Cả phòng đang nghỉ ngắn" | |
| `long-break` | Nền `phase-long-room`; vòng đôi; Runtime happy; "11:05" · "Tập trung lại lúc 21:58" | "Cả phòng đang nghỉ dài" · "Vòng 4 xong · tập trung lại lúc 21:58" |
| `paused` | `FocusTimer · paused`; nút chính đổi thành "Tiếp tục" (`play`); dòng dưới vòng "8 người đang chờ cùng bạn"; dòng phụ "Đồng hồ đứng yên, không tính phút" | Dòng chu kỳ "Bạn đã tạm dừng" (frame vẽ An là Host tự tạm dừng; người khác tạm dừng: "Bình đã tạm dừng") |
| `pending-config` | Dòng phụ trong vòng "Từ vòng sau: 50/10" | STUDY-11 AC6 |
| `no-host` | Chip "Chưa có người điều khiển"; Participant không có nút điều khiển; người có `MANAGE_STUDY_ROOMS` vẫn thấy hàng nút Host; dòng phụ thay bằng "Người quản lý phòng học vào sẽ điều khiển phiên" | STUDY-11 AC5 |
| `no-host-paused` 🆕 | (v1.9, CR-22) `no-host` + phiên đang tạm dừng: `FocusTimer · paused`, đồng hồ đứng yên; hàng nút Participant có nút chính "Tiếp tục" (`play`) giữa Camera và Rời phòng; dòng chu kỳ "Bấm Tiếp tục để chạy lại"; dòng dưới vòng "8 người đang chờ cùng bạn" | Ai bấm trước thì phiên chạy lại; cả phòng thấy `Toast` "Bình đã tiếp tục phiên học" (dưới chip); người bấm không thành Host, chip giữ "Chưa có người điều khiển". Có Host mà tạm dừng: Participant chỉ thấy `paused` (dòng phụ "Đồng hồ đứng yên, không tính phút"), không nút |
| `host-transferred` | Bình (Host) vừa rời phòng: ghế B biến mất, 8 người còn lại chia đều lại quanh vòng; "7 người đang Tập trung cùng bạn"; `Toast` "Bạn đang điều khiển phiên học" (dưới chip) kèm hàng nút Host xuất hiện; dòng phụ "Bình đã rời phòng". Người khác nhận quyền: "Bình đang điều khiển phiên học" | STUDY-11 AC2 |
| `full-room` | ≥ 13 người: 11 ghế + chip "+N"; dòng dưới vòng ghi số người cùng bạn (phòng 32 người → "31 người đang Tập trung cùng bạn") | 00-components › C-06 › Xếp ghế |
| `camera-available` | C đang nói (vòng trắng quanh ghế C) và bật cả camera lẫn mic (hai chỉ báo). Chế độ Vòng, 3 người bật camera: mục Lưới hiện "Lưới · 📹3"; avatar có chỉ báo camera | Công tắc luôn có trong phiên học |
| `grid-view` | Chế độ Lưới (bố cục thứ hai), 9 người, 3 bật camera | Lưới vẫn dùng được khi không ai bật camera |
| `syncing` | Mất Gateway > 3 giây: `Banner · reconnecting` dưới header; số đồng hồ `text-tertiary`; dòng chu kỳ "Đang đồng bộ lại…" | SRS 3.4, 7.3.6 |
| `mod-muted` | Nút Mic `mod-muted`; `Toast` "Bạn đã bị người quản lý tắt mic" | REQ-VC-04 AC1 |
| `disconnected-by-mod` (frame 08 `S-SET-EDGE · disconnected-by-mod`) | Bị "Ngắt khỏi phòng": ngắt voice như rời phòng (phút đã học chốt như Stop của riêng mình), về xem trước phòng `not-joined` + `Toast` "Bạn đã bị ngắt khỏi phòng"; vào lại được ngay | REQ-VC-04, CR-10 mục 3 |
| `large-text` | Cỡ chữ ≥ 200%: giữ vòng và ghế; trong vòng chỉ còn số; nhãn pha + dòng chu kỳ dưới vòng (phóng to, xuống dòng); chip xếp dọc, chữ chip **xuống dòng, không cắt**; tên kênh cắt `…`; hàng `RoomControl` ghim ở đáy, nhãn nút ×1.3, phía trên hàng nút có dải nền `scrim` để không dòng chữ nào bị nút cắt ngang; thân màn hình cuộn | NFR-A11Y-03 |
| `long-focus-90` | Pha Tập trung 90 phút: "87:12", cỡ `timer` 60 như thường; "Vòng 1 · nghỉ ngắn lúc 23:14" | Luôn phút:giây |
| `long-focus-120` | Pha Tập trung 120 phút: "112:05", cỡ `timer-long` 48 **suốt cả pha** (chọn lúc pha bắt đầu); "Vòng 1 · nghỉ ngắn lúc 23:39" | Không đổi cỡ khi đếm qua 100:00 |
| `focus-host · 360` | Khung 360 × 800: vòng giữ cỡ 280 (DESIGN.md › rhythm-ring), ghế **ngồi trên chu vi** (tâm ghế cách tâm vòng 144) để giữ lề 16; 5 nút Host rộng 64, nhãn tối đa 2 dòng | Checklist 360 |

### Tương tác
- Chạm chip "+N" hoặc 👥 → drawer phải, tab Thành viên.
- Chạm 💬 → chat của phòng (02 › S-HOME-08, chốt 18/10/2026, DEC-35); đang ở phòng thì đồng hồ chuyển xuống `MiniPlayer`. Tin mới chỉ tăng badge trên 💬 (số; `danger` khi có mention), ở mọi pha: không toast, không xem trước nội dung (frame mẫu: `short-break`, badge "2").
- Chạm "Mời vào phòng" → bảng chia sẻ của Android (02 › S-HOME-07 `room`, REQ-STUDY-16).
- Chạm avatar → `BottomSheet` hồ sơ rút gọn (tên, phút hôm nay, "Nhắn tin").
- Khi chuyển pha: motion "Cả phòng thở ra" (DESIGN.md › Motion), rung một nhịp, âm báo nhẹ theo SRS 3.4.
- Rời phòng: Participant không xác nhận; Host của phiên đang chạy → S-ROOM-05 `host-leave` (không ai đủ quyền nhận Host: `no-successor`). Phút đã học được giữ (STUDY-15); sau khi rời có Toast theo S-ROOM-05 › Rời phòng & chuyển phòng (v1.9, CR-13, CR-22). Rời màn hình nhưng **vẫn ở phòng** (chuyển tab, vuốt về) → `MiniPlayer`.
- Mất kết nối không phải rời phòng (v1.9, CR-22): app bị đóng / mất mạng mà quay lại trong 3 phút → vẫn trong phòng (edge `app-restart-rejoin`); Host mất kết nối giữ quyền 3 phút (edge `host-reconnecting`).

### Checklist duyệt
- [ ] 20 state, mỗi state một frame; `focus-host`, `short-break`, `grid-view` ở cả hai theme; `focus-host · 360`.
- [ ] `not-joined-other-session`: `MiniPlayer · solo` vẫn hiện, giữa vòng "còn 18 phút" (không có số giây).
- [ ] `no-host-paused`: nút "Tiếp tục" của Participant là bản chính, hàng nút vừa khung 360.
- [ ] Mọi frame lúc 21:47 cùng một phòng: "Lưới · 📹1", ghế C có chỉ báo camera + mic; toast nằm dưới chip vai trò, không che chip.
- [ ] Ba pha phân biệt được khi chụp đen trắng.
- [ ] Hàng nút Host 5 nút vừa khung 360, nhãn tối đa 2 dòng.
- [ ] Không có mascot ở bất kỳ state Tập trung nào; không màu ngữ nghĩa trong phòng.
- [ ] Đồng hồ dùng chữ số đều (Unbounded); "120:00" dùng `timer-long`.

---

## S-ROOM-03 · Sheet Bắt đầu phiên học

**Mục đích:** chọn cấu hình chu kỳ rồi bắt đầu cho cả phòng. **REQ:** STUDY-01/11. **Mở từ:** "Bắt đầu phiên học" ở S-ROOM-01. **Đi tới:** S-ROOM-02 (`focus-host`).

### Bố cục
```
┌ BottomSheet ─────────────────────────────┐
│               ───                        │
│ Bắt đầu phiên học                        │
│ Cả 4 người trong phòng sẽ cùng nhịp.     │
│ Bạn sẽ là người điều khiển.              │
│ [ 25/5 ] [ 50/10 ] [ Tùy chỉnh ]         │  lựa chọn, mặc định = cấu hình của phòng
│ Nghỉ dài: tắt · Cấu hình mặc định của phòng │
│ [      Bắt đầu cho cả phòng      ]       │  Button · primary · L, full width
└──────────────────────────────────────────┘
```

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Bắt đầu phiên học" |
| Mô tả | "Cả {N} người trong phòng sẽ cùng nhịp. Bạn sẽ là người điều khiển." |
| Lựa chọn | "25/5" · "50/10" · "Tùy chỉnh" (số bằng Unbounded) |
| Ghi chú | "Nghỉ dài: tắt · Cấu hình mặc định của phòng" |
| Nút | "Bắt đầu cho cả phòng" |
| Tùy chỉnh — nhãn ô | "Tập trung (5–120)" · "Nghỉ ngắn (1–30)" · công tắc "Nghỉ dài" → "Nghỉ dài (5–60)" · "Sau mỗi (2–8) vòng" (đơn vị phút đã rõ từ ngữ cảnh, bỏ để nhãn vừa một dòng ở khung 360) |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Lựa chọn trùng cấu hình mặc định của phòng được chọn sẵn | |
| `custom` | Chọn "Tùy chỉnh": sheet mở rộng 2–4 `TextField` số (bàn phím số) + công tắc Nghỉ dài | `keyboard-open` theo C-09; frame thêm `custom · 360` (bàn phím mở, nút vẫn thấy) |
| `custom-long-break` | Bật công tắc "Nghỉ dài": hiện thêm hai ô "Nghỉ dài (5–60)" và "Sau mỗi (2–8) vòng" (mặc định 15 và 4); dòng tóm tắt trên nút | "45 phút tập trung · nghỉ 10 · nghỉ dài 20 sau mỗi 4 vòng" |
| `invalid` | Ô ngoài khoảng: `TextField · error` | "Tập trung phải từ 5 đến 120 phút" (`40001`) |
| `submitting` | Nút `loading` | |
| `solo-confirm` 🆕 | (v1.9, CR-22) An đang Học một mình trong phòng chưa có phiên (nhánh "Phòng học im lặng chưa có phiên", 4 người; `MiniPlayer · solo` "Tập trung 32:10" giữa hàng nút và `TabBar`) bấm "Bắt đầu cho cả phòng" → `Dialog` phủ lên sheet (sheet giữ nguyên sau scrim). App biết đang Solo nên hỏi trước, đồng ý thì gửi Start kèm `end_solo: true` | "Bắt đầu phiên học chung sẽ kết thúc phiên học một mình của bạn" · "Bạn đã học 17 phút — số phút này vẫn được tính." · "Hủy" (về sheet) / "Bắt đầu" (`primary`) → Solo kết thúc (`joined_room`), S-ROOM-02 `focus-host` của phiên mới, `MiniPlayer · solo` biến mất |
| `conflict` | Người khác vừa bắt đầu trước (`40903`): sheet đóng, `Toast` "Bình vừa bắt đầu phiên học" (dưới chip), màn hình chuyển sang S-ROOM-02 `focus-participant` của **phiên mới**: Vòng 1, "24:55" · "Vòng 1 · nghỉ ngắn lúc 22:12", 4 ghế (bạn, B, C, D cách 90°), "3 người đang Tập trung cùng bạn", nút "Mời vào phòng", dòng phụ "Bạn đã tập trung 14 phút hôm nay" | |

### Checklist duyệt
- [ ] 7 state; `custom · 360` có bàn phím mở, nút "Bắt đầu cho cả phòng" vẫn thấy (`custom-long-break` dài hơn: ở 360 sheet cuộn, nút ghim trên bàn phím).

---

## S-ROOM-04 · Sheet Điều khiển phiên học

**Mục đích:** các thao tác của Host/quản lý. **REQ:** STUDY-11. **Mở từ:** nút "Điều khiển" ở S-ROOM-02. **Đi tới:** S-ROOM-05, sheet Sửa chu kỳ (dùng lại phần Tùy chỉnh của S-ROOM-03).

| Hàng | Icon | Chữ chính | Chữ phụ |
|---|---|---|---|
| 1 | `skip-forward` | "Bỏ qua pha" | "Sang Nghỉ ngắn ngay" / "Sang Tập trung ngay" |
| 2 | `sliders-horizontal` | "Sửa chu kỳ" | "Áp dụng từ vòng sau" |
| 3 | `square` (`danger`) | "Dừng phiên học" (`danger`) | "Kết thúc cho cả {N} người" |

### Trạng thái
| State | Khác gì |
|---|---|
| `host` | Tiêu đề "Điều khiển phiên học" |
| `moderator` | Người có `MANAGE_STUDY_ROOMS` nhưng không phải Host: thêm dòng dưới tiêu đề "Bình đang điều khiển · bạn có quyền quản lý phòng học" |

### Checklist duyệt
- [ ] 2 state; hàng phá hủy có icon + chữ `danger`.

---

## S-ROOM-05 · Dialog xác nhận của phiên học (dừng, tắt Phòng học, Host rời / chuyển phòng)

**Mục đích:** xác nhận thao tác ảnh hưởng cả phòng. **REQ:** STUDY-11, VC-01, SRS 3.4.

| Biến thể | Tiêu đề | Nội dung | Nút |
|---|---|---|---|
| `stop` | "Dừng phiên học cho cả phòng ({N} người)?" | "Đồng hồ dừng cho mọi người. Mọi người vẫn ở lại phòng, phút đã học được giữ nguyên." | "Hủy" · "Dừng phiên học" (`danger`) |
| `focus-off` | "Tắt Phòng học và dừng phiên học ({N} người)?" | "Kênh sẽ thành phòng voice thường. Phút đã học được giữ nguyên." | "Hủy" · "Tắt Phòng học" (`danger`) |
| `host-leave` 🆕 (v1.9, CR-13) | "Rời phòng?" | "Bình sẽ điều khiển phiên học." | "Ở lại" · "Rời phòng" (`primary`) |
| `host-switch` 🆕 (v1.9, CR-22) | "Rời phòng?" | "Bình sẽ điều khiển phiên học." | "Ở lại" · "Chuyển phòng" (`primary`) |
| `no-successor` 🆕 (v1.9, CR-22) | "Rời phòng?" | "Phiên học vẫn chạy nhưng chưa có người điều khiển." | "Ở lại" · "Rời phòng" (`primary`); mở từ chuyển phòng thì "Chuyển phòng" |

State: `default`, `loading`, `error` (theo C-09). Mở `focus-off` từ Channel Settings › Phòng học (S-SET-07). Phòng chỉ còn 1 người (chính Host): bỏ số người — "Dừng phiên học?" / "Tắt Phòng học và dừng phiên học?" (thêm 21/10/2026, 08 › Edge case).

**Nền của ba dialog Host (lúc 21:47, An là Host của Phòng học im lặng):**
- `host-leave`: S-ROOM-02 `focus-host`, An bấm "Rời phòng". Người kế tiếp theo REQ-STUDY-11 (ở lâu nhất và đủ quyền Start) — mẫu là Bình.
- `host-switch`: S-ROOM-01 `not-joined` của "Phòng thảo luận nhóm" (Ôn thi GT2, chưa có phiên; ô Nam, Quân), `MiniPlayer · room-session` "Phòng học im lặng" · "Tập trung 18:42" vẫn hiện trên `TabBar`, An bấm "Chuyển sang phòng này".
- `no-successor`: S-ROOM-02 `focus-host` với Phòng học im lặng đặt `focus_control = managers` (08 › S-SET-07 `managers`) và An là người quản lý duy nhất trong phòng; nhìn giống `focus-host`, chỉ khác chữ dialog.

### Rời phòng & chuyển phòng (v1.9, CR-13, CR-22)
| Tình huống | Hỏi lại? | Sau khi rời |
|---|---|---|
| Rời phòng, đã là Participant của Room Session trong lần ở phòng này | Không (Host của phiên đang chạy: `host-leave` / `no-successor`) | `Toast` "Đã rời {Phòng học im lặng} · {31} phút đã được tính · Vào lại" (edge `left-room-toast`); N = 0: "Đã rời {phòng} · chưa có phút nào được tính · Vào lại" |
| Rời phòng, chưa từng là Participant (phòng voice thường, Phòng học chưa có phiên) | Không | `Toast` "Đã rời {Phòng thảo luận nhóm} · Vào lại" (edge `left-voice-toast`) |
| Chuyển sang phòng khác ("Chuyển sang phòng này") | Chỉ Host của phiên đang chạy: `host-switch` / `no-successor` | Không Toast — màn phòng mới đã hiện |
| Rời để nghe / gọi (edge `incoming-call`, 09 › S-DM-02 `call-leave-room`) | Theo sheet / dialog của cuộc gọi | Không Toast |
| Rời server khi đang ở phòng của server đó (CR-17) | Dialog rời server của 02 › S-HOME-09 (`leave-confirm-in-room`, `leave-confirm-host`) | Rời phòng luôn, phút giữ như Stop; không Toast "Đã rời …" |

Tên phòng trong Toast tối đa 24 ký tự rồi "…". "Vào lại" → vào lại đúng phòng đó (mic tắt). Toast nằm trên `TabBar` của màn trở về (không còn `MiniPlayer`). Bị ngắt (`disconnected-by-mod`), đăng xuất, bị mời ra / cấm: theo luật riêng của từng chỗ, không dùng Toast này.

---

## S-ROOM-06 · Dialog vào phòng khi đang học một mình

**REQ:** STUDY-10 (mỗi user tối đa 1 Focus Session). **Mở từ:** "Vào phòng" / chạm `ChannelRow` của Study Room **đang có phiên học** khi user đang Solo.

| Tiêu đề | Nội dung | Nút |
|---|---|---|
| "Vào phòng sẽ kết thúc phiên học một mình của bạn" | "Bạn đã học {17} phút — số phút này vẫn được tính. Phòng đang Tập trung, còn {18} phút." | "Hủy" · "Vào phòng" (`primary`) |

Đồng ý → Solo kết thúc (`joined_room`), vào S-ROOM-02 `just-joined`. Nền sau dialog là S-ROOM-02 `not-joined-other-session` (v1.9, CR-22: dialog mở khi bấm "Vào phòng" ở đó; `MiniPlayer · solo` "Tập trung 32:10" vẫn hiện, giữa vòng "còn 18 phút", "Phiên học bắt đầu lúc 21:11", hàng đáy Mic · Camera · "Vào phòng"). Số mẫu khớp Solo ở 04 › S-STUDY-02 `focus` (50/10, Vòng 1 còn 32:10 lúc 21:47 → đã học 17 phút).

Dialog này chỉ cho phòng **đang có** phiên. Đang Solo mà tự bắt đầu phiên ở phòng chưa có phiên: S-ROOM-03 `solo-confirm`; người khác bắt đầu ở phòng mình đang ngồi: edge `solo-stopped-by-room-start` (không hỏi).

---

## S-ROOM-07 · Notification chuyển pha (màn hình khóa)

**REQ:** STUDY-01 AC4, STUDY-10, 7.3.6, NOTIF-02. Local notification (`expo-notifications`, v1.11 CR-28 #16), kênh Android "Nhắc học tập". Mỗi notification có icon app; **không** mascot, không ảnh.

| State | Tiêu đề | Nội dung |
|---|---|---|
| `to-break` | "Phòng học im lặng" | "Hết giờ tập trung — nghỉ ngắn 5 phút" |
| `to-long-break` | "Phòng học im lặng" | "Hết giờ tập trung — nghỉ dài 15 phút" |
| `to-focus` | "Phòng học im lặng" | "Hết giờ nghỉ — tập trung 25 phút" |
| `solo-waiting` | "Học một mình" | "Hết giờ nghỉ, bấm để học tiếp" |
| `exact-alarm-off` (Android 12+) | — | Không phải notification: dòng chữ dưới đồng hồ ở S-ROOM-02/S-STUDY-02 "Báo chuyển pha có thể trễ vài phút · Bật báo chính xác" |

Vẽ: một frame `S-ROOM-07 · lock-screen` — màn hình khóa Android lúc 21:47 "Chủ Nhật, 18 tháng 10", xếp 3 notification mới nhất trên cùng: `to-focus` "6 phút trước" (Vòng 2 bắt đầu 21:41), `to-break` "11 phút trước" (hết Vòng 1 lúc 21:36), `solo-waiting` "1 giờ trước" (frame iOS cũ đã xóa 21/10/2026 — ngoài MVP, DEC-30). Chạm notification → mở S-ROOM-02 (hoặc S-STUDY-02 `waiting`).

---

## S-ROOM-08 · Mini-player trên các tab khác

Dùng `MiniPlayer` (C-08). Vẽ trên nền tab Học (S-STUDY-01) và tab Việc, mỗi state một frame. Chạm vùng chữ → mở lại phòng / Solo.

| State | `MiniPlayer` | Nền |
|---|---|---|
| `room-session` | "Phòng học im lặng" · `PhaseBadge · S · live` "Tập trung 18:42" · Mic · Rời phòng | Tab Học `default`: khối Học một mình có nút "Bắt đầu" tắt + dòng "Bạn đang trong phiên học ở Phòng học im lặng" (04 › `in-room-solo-blocked`) |
| `solo` | "Học một mình" · "Tập trung 32:10" · Tạm dừng · Dừng | Tab Học: khối Solo ghi phút, không đếm giây (v1.9, CR-23) — `PhaseBadge · S · list` "Tập trung · còn 32 phút" + "Mở" (04 › `solo-running`) |
| `solo-waiting` | "Hết giờ nghỉ" · "Còn 08:12 để học tiếp" · "Học tiếp" | Tab Học: khối Solo `PhaseBadge · S · list` dạng chờ "Hết giờ nghỉ · còn 8 phút để học tiếp" + "Mở" (v1.9, CR-23) |
| `voice-only` | như hiện có (`voice`) | như hiện có |
| `camera-on` | (v1.9, CR-22) Như `room-session`, thêm `IconButton` 48 Camera trạng thái `on` (`video`) trước Mic, thay icon nhắc `video` cũ; chạm → tắt camera ngay, nút biến mất (không Toast). Camera tắt thì không có nút | Như `room-session` |
| `paused` 🆕 | (v1.9, CR-22) Như `room-session`, phiên đang tạm dừng: dòng 2 "Tạm dừng 18:42" — số đứng yên, cả cụm `text-secondary` (C-16 `live · paused`) | Tab Học: hàng "Phòng học im lặng" ghi `list` "Tạm dừng" (không số); khối Solo như `room-session` |
| `voice-solo` 🆕 | (v1.9, CR-22) An ngồi ở "Phòng thảo luận nhóm" (Ôn thi GT2, **chưa có phiên**) và đang Học một mình: dòng 1 "Phòng thảo luận nhóm", dòng 2 `PhaseBadge · S · live` "Tập trung 32:10" + "· Học một mình"; nút Mic · Rời phòng. Chạm vùng chữ → S-STUDY-02 (không phải màn phòng) | Tab Việc (S-TASK-01 `default`, giờ 21:47) — tránh nền tab Học, nơi "Phòng thảo luận nhóm" của Nhóm đồ án Mobile đang có phiên và dễ đọc nhầm là cùng phòng |

Trên chính màn của phòng chưa có phiên mà mình đang Học một mình: `MiniPlayer · solo` (không phải `voice-solo`). `MiniPlayer · solo` khi Solo tạm dừng: nút "Tạm dừng" thành "Tiếp tục" (C-08 `paused`; không có frame màn hình riêng). Khung 360: tên phòng cắt `…` trước các nút (cả khi có nút Camera).

Mọi frame có nền tab Học ở bảng này cũng theo khối "Tuần này" mới (04 › S-STUDY-01: vạch 15 phút, thanh "Hôm nay 45 phút · đã đủ 15 phút"; nhánh Solo `solo` / `solo-waiting`: hôm nay 14 + 17 = 31 phút → "Hôm nay 31 phút · đã đủ 15 phút", cột CN 31, tuần 4 giờ 21 phút).

---

## S-ROOM-09 · Xin quyền thông báo theo ngữ cảnh

**REQ:** NOTIF-02, NFR-MOB-10. Màn hình giải thích hiện **trước** hộp thoại hệ thống; chỉ ở lần đầu.

### Bố cục
```
│         [Runtime · neutral 120]          │
│   Báo khi hết giờ học                    │  title-1
│   NezFocus sẽ nhắc khi chuyển sang nghỉ  │  body, text-secondary
│   và khi hết giờ nghỉ, kể cả lúc bạn     │
│   khóa màn hình.                         │
│   [        Cho phép thông báo       ]    │  Button · primary · L
│   [            Để sau                ]   │  Button · text
```

### Trạng thái
| State | Tiêu đề | Nội dung |
|---|---|---|
| `first-focus` | "Báo khi hết giờ học" | "NezFocus sẽ nhắc khi chuyển sang nghỉ và khi hết giờ nghỉ, kể cả lúc bạn khóa màn hình." |
| `first-server` | "Báo khi được nhắc tới" | "Nhận thông báo khi có người nhắc tên bạn hoặc trả lời bạn." (bỏ "mời vào phòng học" — DEC-36, chốt 18/10/2026) |
| `denied` | Không phải màn hình riêng: `Banner · push-denied` "Thông báo đang tắt · Mở cài đặt" ở tab Thông báo và Cài đặt › Thông báo; ở S-ROOM-02 thêm dòng dưới đồng hồ "Bạn sẽ không được báo khi chuyển pha" | Không hỏi lại tự động |

"Để sau" → tiếp tục luồng (bắt đầu/tham gia phiên học) mà không gọi hộp thoại hệ thống.

### Checklist duyệt
- [ ] `first-focus`, `first-server` ở cả hai theme; mascot là ảnh đã tách nền.

---

## Edge case (rà ngày 16/10/2026; cập nhật v1.9 ngày 30/10/2026)

Frame nằm trong nhóm "03 · Study Room — Edge case", tên `S-ROOM-EDGE · <tình huống>`.

### Có frame

| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `host-stopped` — phiên kết thúc khi mình đang ở màn phòng (mẫu: Bình là Host, dừng phiên; bạn là Participant) | (v1.9, CR-22: tổng kết chung cho mọi người, kể cả Host, mọi lý do kết thúc) Phòng trở về lưới (S-ROOM-01); `BottomSheet` "Phiên học đã kết thúc" · dòng lý do "Bình đã dừng phiên học cho cả phòng" · phút **của bạn** trong phiên (`stat`, "31 phút tập trung", cộng mọi lần vào lại) · "Hôm nay 45 phút · chuỗi 6 ngày" (`label`, `text-secondary`) · Runtime happy (khoảnh khắc chúc mừng, ngoài pha Tập trung) · "Ở lại phòng" (`primary`) / "Rời phòng" | STUDY-11 (AC7), STUDY-15 |
| `ended-self-host` 🆕 — chính An (Host) dừng phiên | Như `host-stopped`, dòng lý do "Bạn đã dừng phiên học"; phút của An "31 phút tập trung" | STUDY-11 (v1.9) |
| `ended-focus-off` 🆕 — người quản lý tắt Phòng học (thay `focus-off-by-other`) | Như `host-stopped`, dòng lý do "Bình đã tắt Phòng học"; phía sau sheet header đổi icon `volume-2`, lưới ô không còn thanh Bắt đầu (S-ROOM-01 `not-study-room`) | STUDY-11 AC7 |
| `ended-elsewhere` 🆕 — phiên kết thúc khi mình đang ở màn khác | Nền tab Việc (S-TASK-01 `default`, 21:47); `MiniPlayer` chuyển từ `room-session` sang `voice` ("Phòng học im lặng" · "Đang trong phòng · 9 người"); `Toast` trên `MiniPlayer` "Phiên học ở Phòng học im lặng đã kết thúc · 31 phút đã được tính". Mở lại màn phòng → sheet tổng kết như `host-stopped` | STUDY-11 (v1.9) |
| `kicked` — bị kick/ban khỏi server giữa phiên | Rời phòng ngay; `Dialog` "Bạn đã bị mời ra khỏi {Server}" (ban: "Bạn đã bị cấm khỏi {Server}") · "31 phút đã học trong phiên học vẫn được tính." · "Đã hiểu"; nền là màn hình kênh khác theo luật điều hướng của 02 › S-HOME-EDGE `kicked` / `banned-in-room` (v1.9, CR-17) | ROLE-05/07, STUDY-15 |
| `other-device` — cùng tài khoản vào phòng ở máy khác | Máy này bị ngắt, về S-ROOM-01 `not-joined`; `Dialog` "Bạn đã vào phòng trên thiết bị khác" · "Vào lại ở đây" / "Đóng" | VC-01 (1 voice/tài khoản) |
| `reconnected-gap` — mất mạng > 3 phút rồi có lại | `Toast` icon `wifi-off` "Mất kết nối {4} phút · khoảng này không được tính" (dưới chip); dòng phụ phút hôm nay đã trừ khoảng mất ("Bạn đã tập trung 41 phút hôm nay" = 45 − 4) | STUDY-15 AC2 |
| `app-restart-rejoin` 🆕 — app bị hệ điều hành đóng, mở lại trong 3 phút | (v1.9, CR-22) S-ROOM-02 `focus-host` lúc 21:47 (app bị đóng 21:45): An vẫn là Host (chip "Bạn đang điều khiển"); Mic `off`, Camera `off`; `Toast` icon `rotate-cw` "Đã vào lại Phòng học im lặng · mic đang tắt" (dưới chip); dòng phụ "Bạn đã tập trung 45 phút hôm nay" (liền mạch, không trừ khoảng mất) | VC-01, STUDY-15 (2) |
| `host-reconnecting` 🆕 — Host mất kết nối, chưa quá 3 phút | (v1.9, CR-22) S-ROOM-02 `focus-participant`: chip vẫn "Bình đang điều khiển"; ghế của Bình `away` (C-07, mờ); không Toast, không nút điều khiển cho Participant. Quá 3 phút → chuyển Host như `host-transferred` | STUDY-11 (v1.9) |
| `incoming-call` — cuộc gọi 1-1 đến khi đang trong phòng | (v1.9, CR-25) Nền S-ROOM-02 `focus-host` (An là Host); `BottomSheet`: avatar người gọi · "Minh đang gọi" · "Nghe máy sẽ rời Phòng học im lặng · 31 phút đã học được giữ · Bình sẽ điều khiển phiên học" · "Từ chối" (`danger`) / "Nghe và rời phòng" (`primary`). Người gọi là Minh (bạn của An, không ở phòng nào) — người trong phòng gọi thì chính họ đã rời phòng | VC-01, DMVC-01, STUDY-11 |
| `mic-denied` — chạm Mic mà hệ điều hành từ chối quyền | Vẫn ở phòng (nghe được); `Banner` "Chưa có quyền mic · vẫn nghe được" + hành động "Mở cài đặt"; nút Mic `no-permission` → S-MOD-05. Vào phòng không còn xin quyền mic (v1.9, CR-13), nên tình huống này chỉ xảy ra sau khi chạm Mic | NFR-MOB-10, SRS 3.5 |
| `alone` — chỉ còn mình bạn trong phiên | Vòng 1 ghế; "Bạn đang học một mình trong phòng này"; `Button · secondary` "Mời vào phòng" (icon `user-plus`; thay cho `Button · text` ở các state khác, vì đây là lúc cần mời nhất; → S-HOME-07 `room`); công tắc Lưới không có số camera | STUDY-01 |
| `streak-reached` — vừa đủ 15 phút giữa pha Tập trung | Frame lúc **21:12** (An đã học 14 phút buổi chiều, vào phiên lúc 21:11, đủ 15 phút ở phút đầu Vòng 1): đồng hồ "23:42" · "Vòng 1 · nghỉ ngắn lúc 21:36"; `Toast` icon `flame` "Đủ 15 phút hôm nay · chuỗi {6} ngày liên tiếp" (dưới chip); dòng phụ "Bạn đã tập trung 15 phút hôm nay"; **không mascot** (đang Tập trung) | STUDY-03 AC5, DEC-24 |
| `host-left-paused` — Host rời khi đang Tạm dừng | Quyền điều khiển chuyển như thường; ghế B biến mất, 8 người chia đều lại quanh vòng, "7 người đang chờ cùng bạn"; đồng hồ **vẫn đứng yên**; `Toast` "Bình đã rời phòng · bạn đang điều khiển phiên học" (dưới chip); dòng chu kỳ "Bấm Tiếp tục để chạy lại". Không ai đủ quyền nhận Host → S-ROOM-02 `no-host-paused`: mọi Participant bấm Tiếp tục được (v1.9, CR-22) | STUDY-11 |
| `solo-stopped-by-room-start` 🆕 — đang Học một mình trong phòng chưa có phiên, người khác bắt đầu | (v1.9, CR-22) Nhánh "Phòng học im lặng chưa có phiên" (4 người): Bình bắt đầu lúc 21:47 → S-ROOM-02 `focus-participant` của phiên mới, như S-ROOM-03 `conflict` (Vòng 1 "24:55" · "Vòng 1 · nghỉ ngắn lúc 22:12", 4 ghế, "3 người đang Tập trung cùng bạn"); `MiniPlayer · solo` biến mất; `Toast` icon `lamp-desk` "Phiên học chung đã bắt đầu · học một mình đã dừng · 17 phút đã được tính" (dưới chip); dòng phụ "Bạn đã tập trung 31 phút hôm nay" (14 + 17) | STUDY-10 AC9 |
| `left-room-toast` 🆕 — Participant rời phòng | (v1.9, CR-13) Về màn kênh trước đó: 02 S-HOME-01 `default` (`#hoi-dap` của Ôn thi GT2, giờ 21:47), không còn `MiniPlayer`; `Toast` trên `TabBar` "Đã rời Phòng học im lặng · 31 phút đã được tính" + hành động "Vào lại" | STUDY-11 (v1.9) |
| `left-voice-toast` 🆕 — rời phòng mà chưa từng là Participant | (v1.9, CR-22) Như `left-room-toast`, An vừa rời "Phòng thảo luận nhóm" (Ôn thi GT2, chưa có phiên): `Toast` "Đã rời Phòng thảo luận nhóm" + "Vào lại" | STUDY-11 (v1.9) |
| `huge-room` — phòng 124 người | Chip "+113"; "123 người đang Tập trung cùng bạn"; lưới cuộn | 00-components › C-06 › Xếp ghế |

### Chỉ ghi luật (giao diện không đổi)

| Tình huống | Luật |
|---|---|
| Học qua nửa đêm | Dòng "Bạn đã tập trung … hôm nay" về 0 lúc 00:00 theo timezone của user; phần trước 00:00 tính cho ngày cũ (STUDY-03 AC3). Phiên không bị ngắt |
| Đồng hồ máy lệch | Mọi thời gian tính theo `backend_time` (7.3.6); không hiển thị gì thêm |
| Chuyển pha khi đang offline | App tự chuyển pha theo lịch đã biết, giữ state `syncing`; khi có mạng thì đồng bộ lại, không báo thêm nếu khớp |
| Mở lại app sau khi đã qua nhiều pha | Đồng hồ nhảy thẳng tới pha hiện tại, không có hiệu ứng "thở ra" cho các pha đã qua, không báo |
| Sửa chu kỳ khi đang Tạm dừng | `paused` + `pending-config` cùng lúc: dòng phụ "Từ vòng sau: 50/10" hiện dưới dòng tạm dừng |
| Phòng trống 5 phút | Phiên tự kết thúc; không ai trong phòng nên không có giao diện, không ai nhận tổng kết; lần sau vào thấy S-ROOM-01 |
| Tổng kết khi chưa đủ 1 phút trong phiên (v1.9, CR-22) | Sheet như `host-stopped` nhưng thay số phút bằng "Chưa đủ 1 phút trong phiên này" (`body`), **không mascot**; dòng "Hôm nay … · chuỗi …" giữ |
| Sheet tổng kết còn bao lâu (v1.9, CR-22) | Đang ở màn khác lúc phiên kết thúc → chỉ Toast (`ended-elsewhere`); sheet hiện khi mở lại màn phòng và còn tới khi phòng có phiên mới hoặc mình rời phòng. "Ở lại phòng" đóng sheet; "Rời phòng" rời như nút Rời phòng (Toast `left-room-toast`) |
| Mở lại app sau hơn 3 phút, hoặc đã vào phòng ở máy khác (v1.9, CR-22) | Không tự vào lại; mở app như thường (không Toast). App chỉ tự vào lại khi đã ở foreground |
| Host mất kết nối quá 3 phút (v1.9, CR-22) | Chuyển Host như Host rời (`host-transferred`); bấm Rời phòng, bị ngắt, đăng xuất là rời ngay, không chờ 3 phút |
| Người khác bắt đầu đúng lúc mình đang Solo trong phòng và đang mở sheet Bắt đầu | Như S-ROOM-03 `conflict` nhưng Toast là câu của `solo-stopped-by-room-start` (Solo đã tự dừng, không hỏi `solo-confirm`) |
| Nghe / gọi khi đang ở phòng (v1.9, CR-25) | Chữ sheet `incoming-call`: phần phút chỉ khi đang là Participant của Room Session và đã có ≥ 1 phút; phòng voice không có phiên: "Nghe máy sẽ rời {Phòng thảo luận nhóm}"; câu "· {Bình} sẽ điều khiển phiên học" chỉ khi mình là Host của phiên đang chạy (không ai đủ quyền: "· Phiên học vẫn chạy nhưng chưa có người điều khiển."). App ở nền: notification thêm dòng "Nghe máy sẽ rời {phòng}", bấm "Nghe" là đồng ý luôn (09 › S-CALL-02 `notification`). Gọi đi: 09 › S-DM-02 `call-leave-room`. Rời phòng vì nghe / gọi không có Toast "Đã rời …" |
| Rời server khi đang ở phòng của server đó (v1.9, CR-17) | Hộp thoại ở 02 › S-HOME-09 (`leave-confirm-in-room`, `leave-confirm-host`) nói thêm "Bạn cũng sẽ rời {phòng}." và câu người kế tiếp khi là Host; không hỏi lần hai, không Toast "Đã rời …" (S-ROOM-05 › Rời phòng & chuyển phòng) |

### Chia sẻ màn hình (v1.x, chỉ ghi luật — chưa vẽ)

REQ-VC-03, DEC-11; component `StageView` (C-19, P3). Vị trí nút Chia sẻ trong hàng `RoomControl` chốt khi vẽ.

| Tình huống | Luật (v1.9, CR-22) |
|---|---|
| Mỗi phòng một màn hình chia sẻ | Đang có người chia sẻ → nút Chia sẻ của người khác `disabled`, nhấn giữ hiện "An đang chia sẻ màn hình". Hai người bắt đầu cùng lúc → luồng đến sau bị tắt, người đó thấy `Toast` icon `monitor-x` "An vừa chia sẻ màn hình trước bạn" |
| Người chia sẻ | Không thấy lại màn hình của mình: chỗ sân khấu là thẻ "Bạn đang chia sẻ màn hình" + "Dừng chia sẻ"; notification foreground service cũng có "Dừng chia sẻ" |
| Người xem (cả Vòng lẫn Lưới) | Một bố cục: màn hình chia sẻ 16:9 rộng hết khung ngay dưới header → `FocusTimer · compact` (nếu có phiên) → dải `ParticipantTile · video` 72 × 96 cuộn ngang (mình đầu tiên, rồi thứ tự ghế C-06). `SegmentedControl` Vòng / Lưới ẩn; dừng chia sẻ thì về cách xem trước đó. Chạm màn hình chia sẻ → toàn màn hình ngang, đồng hồ `compact` nổi ở góc |
| Kết thúc chia sẻ | Người chia sẻ rời phòng / bị ngắt / app bị đóng → chia sẻ dừng; tự vào lại (`app-restart-rejoin`) không tự chia sẻ lại. Không kèm âm thanh hệ thống |

## Câu hỏi còn mở

Không còn. Đã chốt 16/10/2026 và ghi vào REQ-VC-01: chạm kênh voice mở xem trước (`not-joined`) với nút "Vào phòng"; bật camera lần đầu mỗi phiên đăng nhập có bước xem trước (`camera-self-preview`; từ v1.9 bật Camera ở màn xem trước cũng là bước này).
