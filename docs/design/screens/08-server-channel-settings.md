# 08 · Cài đặt Server & kênh

Cài đặt cấp server (role, thành viên, lời mời, báo cáo, chuyển Owner / xóa server) và cấp kênh (tổng quan, quyền, Task Board, Phòng học).

- **Tiến độ:** lần chạy đầu (21/10/2026) chỉ làm **S-SET-07** (P1) cùng hai điểm vào tối thiểu của nó. Lần chạy thứ hai (21/10/2026, P2) thêm S-SET-01…05, phần còn lại của S-SET-06 (kênh text, Quyền, Task Board, danh mục), **S-SET-09 Tạo kênh** (mới — S-HOME-09 trỏ tới "tạo kênh" nhưng chưa có màn) và S-SET-08. Hành vi P2 chốt 21/10/2026 (17 câu, chủ dự án đồng ý cả 17 — mục "Câu hỏi chốt P2"); hành vi mới ghi ở `SRS_v1.2_change_notes.md` mục 15 (CR-10, đã áp vào SRS v1.7).
- **(v1.9, 30/10/2026)** Bỏ Silent Room (CR-13) và quyền "Đọc tin cũ" (CR-14); nhãn "Tạm khóa", kênh tin chào mừng, không trùng tên kênh / danh mục / vai trò, kênh riêng tư lúc tạo, tắt Task Board không hỏi, sheet tạm khóa nêu giờ hết + đổi thời hạn, người thực hiện có username (CR-17); Báo cáo gom theo đối tượng, xử lý người kèm xóa tin, badge trung tính (CR-18); công tắc "Bật phòng học" khi tạo kênh thoại (CR-22). Hành vi ở SRS v1.9; từng CR ở `SRS_v1.2_change_notes.md` mục 18, 19, 22, 23, 27.
- Hành vi P2: SRS v1.9 (gốc v1.6) REQ-ROLE-01…05/07/08, REQ-SRV-01/02/03/05, REQ-SAFE-01, REQ-STUDY-06, 8.5 (bit quyền, thuật toán, hierarchy). Mã lỗi thêm: `40301`, `40306`, `40102`, `40303`, `40041`, `40901` (đối tượng báo cáo đã được xử lý).
- Hành vi: SRS v1.9 Mục 3.2 (cây Channel Settings), 3.4, REQ-STUDY-01, REQ-STUDY-02, REQ-STUDY-11, REQ-SRV-02, DEC-22. Mã lỗi: `40001`, `40302`.
- Component: [00-components.md](00-components.md) — `ScreenHeader` (C-22), `SettingsRow` (C-15), `RadioRow` (C-34), `BottomSheet` / `ActionSheet` / `Dialog` (C-09), `TextField` (C-02), `Toast` / `Banner` (C-14), `Skeleton`; mới: `Switch` (biến thể switch của C-15, vốn để P2). Nhìn thế nào: [DESIGN.md](../../../DESIGN.md) (chế độ **Operate**).
- Hành vi chốt 21/10/2026 cho S-SET-07 (12 câu, chủ dự án đồng ý cả 12): nhấn giữ kênh mở menu "Cài đặt kênh / Sắp xếp kênh"; Cài đặt kênh là danh sách mục (vẽ bản tối thiểu S-SET-06 · voice); lưu ngay khi chạm, chỉ sheet chu kỳ có "Lưu"; đóng sheet không lưu; RadioRow có mô tả; Tắt ẩn nhóm chu kỳ; dòng nhắc Host giữ quyền khi chuyển "Chỉ người quản lý"; `Switch` thành master; đổi Phòng im lặng áp dụng cho người vào sau; chu kỳ mặc định không đổi phiên đang chạy; `MANAGE_STUDY_ROOMS` không đổi được Phòng im lặng; dòng "Đang có phiên học · N người". Hành vi mới ghi ở `SRS_v1.2_change_notes.md` mục 13 (CR-08, đã áp vào SRS v1.6 ngày 21/10/2026). **(v1.9, CR-13)** Silent Room đã bỏ: mọi phòng vào đều tắt mic sẵn, S-SET-07 không còn nhóm Âm thanh — các ý về Phòng im lặng ở trên chỉ còn là lịch sử.

## Quy ước chung của khu vực

| Hạng mục | Quy ước |
|---|---|
| Khung | 390 × 844; kiểm thêm 360 × 800 cho S-SET-07 `full-access` |
| Vị trí | Màn con trong tab **Home** (`TabBar` Home đang chọn, badge mặc định Home 3 · Việc 3 · Thông báo 4), có `ScreenHeader` back. Mở từ drawer trái (S-HOME-02). Bàn phím mở thì **ẩn** `TabBar` (bàn phím nằm đè đáy màn) |
| Lưu thay đổi | Công tắc và lựa chọn **lưu ngay khi chạm** (kiểu cài đặt Android), không có nút "Lưu" chung. Chỉ sheet chu kỳ có nút "Lưu" vì nhập nhiều ô. Lưu thành công không có toast (giá trị trên màn đã đổi); lỗi thì trả giá trị cũ + `Toast` "Chưa lưu được thay đổi · Thử lại" |
| Số chu kỳ | Như 03 S-ROOM-03: "25/5", "50/10"; tùy chỉnh "45/10 · nghỉ dài 20 sau mỗi 4 vòng"; nghỉ dài tắt thì "· không nghỉ dài". Số bằng Unbounded `tabular-nums` |
| Màu | Không màu pha, không màu ngữ nghĩa trừ dialog tắt Phòng học (`danger`). Số báo cáo đang chờ là `Badge · count · neutral` (C-13; không đỏ — đỏ là nhắc tới / chưa đọc) (v1.9, CR-18) |
| Mascot | Không (cài đặt — DESIGN.md › Mascot) |
| Hiện theo quyền (P2) | Hàng / mục / nút **ẩn** khi người xem không có quyền (như S-HOME-09), không hiện bản `disabled`. Ngoại lệ có lý do để giải thích: quyền chạm tới được nhưng bị hierarchy chặn (role ngang / cao hơn) — hiện, khóa, kèm dòng lý do |
| Ô chữ (P2) | Màn có ô chữ (tên server, tên role, tên kênh) có "Lưu" ở `ScreenHeader`, chỉ bật khi đã đổi; back khi chưa lưu → `Dialog` "Bỏ thay đổi?" (như S-SET-06 `discard-confirm`). Công tắc trên cùng màn vẫn lưu ngay |
| Dữ liệu mẫu server (P2) | **Ôn thi Giải tích 2** (Study Server, 24 thành viên, Owner An). Role theo `position` giảm dần (đổi 22/10/2026 theo D5 của đợt rà soát: "Quản trị" đặt **trên** Trưởng nhóm): **Quản trị** (3; `MANAGE_ROLES`, `MANAGE_CHANNELS`, `KICK_MEMBERS`, `BAN_MEMBERS`, `MODERATE_MEMBERS`, `MANAGE_MESSAGES` — không có `CREATE_INVITE` trên role, tạo lời mời được nhờ @everyone; Tuấn), **Trưởng nhóm** (2; bộ quyền template 8.5.3; An, Bình), **Điều phối phòng học** (1; chỉ `MANAGE_STUDY_ROOMS`; Chi), **@everyone** (0; 24; các bit ✔ ở 8.5.1). Góc nhìn: An = Owner; **Bình** (Trưởng nhóm) = moderator không có `MANAGE_ROLES` / `BAN_MEMBERS` / `MANAGE_SERVER`, đứng dưới Tuấn; **Tuấn** = role cao nhất là Quản trị, có `MANAGE_ROLES`: sửa được Trưởng nhóm, Điều phối phòng học, @everyone; không sửa được chính Quản trị (ngang mình) và không đụng được An (Owner); chỉ cấp được quyền mình có (thiếu `ADMINISTRATOR`, `MANAGE_SERVER`, `MENTION_EVERYONE`, `MUTE_MEMBERS`, `MOVE_MEMBERS`, `MANAGE_STUDY_ROOMS`, `MANAGE_TASKS`). Username (một bộ cho mọi area): an.nguyen, binh.tran, chi.le, dung.pham, giang.vo, ha.nguyen, khanh.le, lan.vu, mai.tran, minh.do, nam.ho, quan.ng, tuan.hoang, phuc.le, vu.dang, phong.vu. **Báo cáo đang chờ: 2 đối tượng** (v1.9, CR-18 — gom theo đối tượng; đợt hiện tại mở lúc 19:40, khớp mục `reports_pending` 19:40 ở 06): (1) **hồ sơ của Nam** (`nam.ho`) — 1 báo cáo "Spam hoặc quảng cáo" 19:40, mô tả "Giới thiệu toàn quảng cáo làm bài hộ"; giới thiệu của Nam lúc báo cáo: "Nhận làm hộ bài tập lớn, đồ án môn học, giá sinh viên. Inbox mình nhé!"; (2) **tin của Khánh** 20:05 ở `#hoi-dap` "Bán đề thi giữa kỳ có đáp án 50k, ai cần inbox mình" — 2 báo cáo: "Gian lận học tập" 20:07 (mô tả "Bán đề thi có đáp án ngay trong nhóm ôn thi") và "Lừa đảo" 20:09 (không mô tả). **Đã xử lý (đợt 16/10/2026**, mở bởi báo cáo tin của Phúc 15:40, khớp mục `reports_pending` 16/10 ở 06): tin của Phúc ở `#tai-lieu` "Nạp 50k nhận tài khoản Wolfram Alpha Pro trọn đời, chuyển khoản trước nhé" — "Lừa đảo" 15:40 → Tuấn xóa tin trong kênh 16:00; tin của Phong ở `#tai-lieu` — "Spam hoặc quảng cáo" 15:55 → Bình xóa tin và tạm khóa 1 ngày 16:30; hồ sơ của Mai — "Khác" 16:10 → An bỏ qua 21:05. Người báo cáo không bao giờ hiện ở 08. Quân đang bị tạm khóa tới 21:12 (Bình đặt 1 giờ lúc 20:12, lý do "Gửi tin liên tục") — Khánh chưa bị xử lý vì báo cáo còn chờ. Đã cấm: **Vũ** (15/10/2026, "Spam link cá cược", bởi An). Lời mời: An `k7Qm2xPa` (7 ngày, không giới hạn, 5 lượt — khớp 02 S-HOME-07), Bình `Rt4nW8eq` (1 ngày, 3/10 lượt). **Kênh tin chào mừng** (v1.9, CR-17): `#chao-mung`, đứng đầu THÔNG TIN — THÔNG TIN có 5 kênh: `#chao-mung`, `#thong-bao`, `#tai-lieu`, `#hoi-dap`, `#viec-nhom` |
| Dữ liệu nhất quán | Kênh mẫu **"Phòng học im lặng"** (Ôn thi Giải tích 2): `focus_control = everyone`, chu kỳ mặc định 25/5 không nghỉ dài ("im lặng" chỉ còn là tên kênh — CR-13). Đang có phiên học **9 người**, An là Host (khớp 03 S-ROOM-05 `focus-off`). An là Owner → đủ quyền. `study-rooms-only`: người xem là **Chi**, vai trò chỉ có `MANAGE_STUDY_ROOMS`. Bây giờ 20:12 CN 18/10/2026 |

---

## Điểm vào (thêm vào màn đã có)

### S-HOME-02 · `channel-menu` 🆕 (ActionSheet khi nhấn giữ kênh)
Nhấn giữ một `ChannelRow` (chỉ khi có `MANAGE_CHANNELS` hoặc, với kênh voice, `MANAGE_STUDY_ROOMS`) → `ActionSheet`:
```
│ [lamp-desk] Phòng học im lặng            │  icon kênh 40 + tên (headline) + "Phòng học" (v1.9: bỏ "· Im lặng", CR-13)
│ ⚙  Cài đặt kênh                          │  → S-SET-06 · voice
│ ⇅  Sắp xếp kênh                          │  chỉ MANAGE_CHANNELS → S-HOME-02 `reordering`
```
Cùng khung với menu server 02 S-HOME-09 (không có hàng "Hủy"; kéo xuống / chạm scrim để đóng). Thay cho "nhấn giữ là kéo ngay" của S-HOME-02 `reordering` (02): kéo-thả bắt đầu từ hàng "Sắp xếp kênh". Không có quyền: nhấn giữ không làm gì (như cũ).

### S-SET-06 · `voice` (danh sách mục Cài đặt kênh — bản tối thiểu)
`ScreenHeader` "Cài đặt kênh"; dòng phụ dưới header: icon kênh + "Phòng học im lặng"; các `SettingsRow · nav` có icon: "Tổng quan" · "Quyền" · "Phòng học" (giá trị: "Mọi người bắt đầu được" / "Chỉ người quản lý" / "Tắt"). Người chỉ có `MANAGE_STUDY_ROOMS` chỉ thấy hàng "Phòng học", kèm dòng "Vai trò của bạn chỉ chỉnh được mục Phòng học của kênh này." (frame `voice · study-rooms-only`, góc nhìn của Chi; frame `voice` là góc nhìn của An — Owner). Hàng "Quyền" **chưa có đích** — vẽ cùng S-SET-02 (P2), ghi ở README › Câu hỏi còn mở. Phần còn lại của S-SET-06 (kênh text, Quyền, Task Board) làm ở P2.

### S-SET-06 · `overview` (Tổng quan của kênh voice — chốt 21/10/2026, 7 câu)
**REQ:** SRV-02, SRS 3.4, STUDY-01. **Mở từ:** hàng "Tổng quan" ở S-SET-06 · `voice`. **Đi tới:** S-SET-06 · `voice` (lưu xong / back); S-MOD-03 `type-name` bản xóa kênh; S-HOME-02 `default` (xóa xong).
```
│ ‹  Tổng quan                       Lưu   │  ScreenHeader; "Lưu" chỉ bật khi tên đã đổi
│ Tên kênh                         17/100  │  TextField + bộ đếm
│ [ Phòng học im lặng                    ] │
│                                          │
│ 🗑 Xóa kênh                               │  SettingsRow, icon + chữ danger
```
| State | Khác gì | Chữ |
|---|---|---|
| `overview` | Như trên; "Lưu" `text-tertiary` (chưa đổi gì) | — |
| `editing` | Đang sửa: ô focus, `OS/Keyboard · text` (phím "Xong"), "Lưu" màu `primary` | "Phòng học im lặng buổi tối" · "26/100" |
| `name-error` | Bấm Lưu khi ô trống: ô `error` | "Tên kênh cần 1–100 ký tự" (`40001`); quá 100 ký tự thì ô chặn gõ, không báo lỗi |
| `discard-confirm` | Back khi chưa lưu → `Dialog` | "Bỏ thay đổi?" · "Tên kênh mới chưa được lưu." · "Ở lại" / "Bỏ thay đổi" (`danger`) |
| `delete-confirm` | Chạm "Xóa kênh" → 10 › S-MOD-03 `type-name`, chữ theo kênh | "Xóa Phòng học im lặng?" · "Tin nhắn trong chat của phòng sẽ bị xóa và không khôi phục được. Phiên học đang chạy (9 người) kết thúc, mọi người rời phòng." (không có phiên thì bỏ câu thứ hai) · "Nhập tên kênh để xác nhận" · "Xóa kênh" (`danger`) |
| `deleted` | Về 02 S-HOME-02: kênh không còn trong danh sách + `Toast` trên TabBar | "Đã xóa Phòng học im lặng" |
| `offline` | `Banner · offline`; ô `readonly`, "Lưu" và "Xóa kênh" `disabled` | "Bạn đang offline" |

Lưu tên thành công → về S-SET-06 · `voice` + `Toast` "Đã đổi tên kênh". Người đang ở trong phòng khi kênh bị xóa: ngắt voice, về drawer, `Toast` "Phòng học im lặng đã bị xóa", phút đã học giữ như Stop (luật bằng chữ ở Edge case; như 02 S-HOME-EDGE `channel-removed`). Bản Tổng quan của kênh text (xem trước slug) làm cùng S-SET-06 ở P2.

---

## S-SET-07 · Cài đặt kênh › Phòng học

**Mục đích:** bật / tắt Phòng học, chọn ai được bắt đầu phiên học và chu kỳ mặc định cho một kênh voice.
**REQ:** STUDY-11, STUDY-01, SRV-02, DEC-22.
**Mở từ:** hàng "Phòng học" ở S-SET-06 · `voice`. **Đi tới:** sheet chu kỳ (`cycle-sheet`); 03 S-ROOM-05 `focus-off` (đổi sang Tắt khi đang có phiên học); back → S-SET-06 · `voice`.

### Bố cục (`full-access`)
```
┌ Status bar ──────────────────────────────┐
│ ‹  Phòng học                             │  ScreenHeader
│ ⓘ Đang có phiên học · 9 người            │  dòng trung tính (chỉ khi có phiên chạy)
│ AI ĐƯỢC BẮT ĐẦU PHIÊN HỌC                │  nhãn nhóm (label 600, text-secondary)
│ (•) Mọi người                            │  RadioRow + dòng mô tả
│     Ai trong phòng cũng bắt đầu được     │
│ ( ) Chỉ người quản lý                    │
│     Người có quyền Quản lý phòng học     │
│ ( ) Tắt                                  │
│     Phòng voice thường, không có phiên học│
│ CHU KỲ MẶC ĐỊNH                          │
│ Chu kỳ                25/5 · không nghỉ dài › │  SettingsRow · nav
│ Điền sẵn khi bắt đầu phiên học           │  label, text-secondary
└ TabBar ──────────────────────────────────┘
```
(v1.9, CR-13) Bỏ nhóm "ÂM THANH" và công tắc "Chế độ im lặng": mọi phòng voice vào đều tắt mic sẵn, không còn `voice_mode`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Phòng học" |
| Phiên đang chạy | icon `info` + "Đang có phiên học · 9 người" |
| Nhóm 1 | "AI ĐƯỢC BẮT ĐẦU PHIÊN HỌC" · "Mọi người" / "Ai trong phòng cũng bắt đầu được" · "Chỉ người quản lý" / "Người có quyền Quản lý phòng học" · "Tắt" / "Phòng voice thường, không có phiên học" |
| Nhóm 2 | "CHU KỲ MẶC ĐỊNH" · "Chu kỳ" / giá trị "25/5 · không nghỉ dài" · mô tả "Điền sẵn khi bắt đầu phiên học. Phiên đang chạy không đổi." |
| Sheet chu kỳ | Tiêu đề "Chu kỳ mặc định"; lựa chọn "25/5" · "50/10" · "Tùy chỉnh" (như S-ROOM-03); nút "Lưu" |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `loading` | Skeleton 3 nhóm (dải nhãn + hàng 56) | — |
| `full-access` | Như bố cục: Mọi người · 25/5; có dòng phiên đang chạy | — |
| `managers` | Chọn "Chỉ người quản lý" khi đang có phiên: dòng trung tính dưới nhóm 1 | "Bạn vẫn điều khiển phiên học đang chạy. Luật mới áp dụng từ lần bắt đầu sau." (STUDY-11: Host giữ quyền tới khi rời phòng) |
| `off` | "Tắt" được chọn (không có phiên): nhóm "CHU KỲ MẶC ĐỊNH" ẩn; không còn dòng phiên đang chạy | Dòng dưới nhóm 1: "Kênh là phòng voice thường. Chọn Mọi người hoặc Chỉ người quản lý để bật lại Phòng học." |
| `switch-off-confirm` | Chạm "Tắt" khi đang có phiên → 03 S-ROOM-05 `focus-off` trên màn này; radio chưa đổi tới khi xác nhận | "Tắt Phòng học và dừng phiên học (9 người)?" · "Hủy" / "Tắt Phòng học" (`danger`). Hủy → giữ "Mọi người" |
| `cycle-sheet` | Chạm "Chu kỳ" → `BottomSheet` "Chu kỳ mặc định", lựa chọn hiện tại chọn sẵn (25/5), nút "Lưu" | Ghi chú: "Áp dụng cho lần bắt đầu sau" |
| `cycle-custom` | Chọn "Tùy chỉnh": như S-ROOM-03 `custom` (2 ô số + công tắc Nghỉ dài), bàn phím số mở, nút "Lưu" ngay trên bàn phím | Ô "Tập trung (5–120)", "Nghỉ ngắn (1–30)" |
| `cycle-invalid` | Ô ngoài khoảng: `TextField · error` | "Tập trung phải từ 5 đến 120 phút" (`40001`) |
| `save-error` | Lưu thất bại (vd chọn "Chỉ người quản lý"): radio về giá trị cũ + `Toast` trên TabBar | "Chưa lưu được thay đổi · Thử lại" |
| `offline` | `Banner · offline` dưới header; mọi điều khiển `disabled`; giá trị là cache | "Bạn đang offline" |

(v1.9, CR-13) Bỏ state `study-rooms-only` của S-SET-07: điều duy nhất nó khóa là công tắc Phòng im lặng. Chi (chỉ `MANAGE_STUDY_ROOMS`) giờ thấy màn này giống `full-access`; phần khác biệt của Chi chỉ còn ở danh sách mục (S-SET-06 `voice · study-rooms-only`).

Không áp dụng: `empty` (kênh voice luôn có các thuộc tính này), `forbidden` (không có quyền thì không có đường vào — điểm vào ẩn), `os-permission`, `error` khi tải (dùng cache từ `READY`; không có cache thì `loading` rồi `offline`).

### Tương tác
- Chạm một `RadioRow` → lưu ngay (`PATCH /channels/{id}`); không có phiên hoặc không phải chuyển sang Tắt thì không hỏi lại.
- Chạm "Chu kỳ" → `cycle-sheet`; "Lưu" → đóng sheet, giá trị hàng đổi. Kéo xuống / Back đóng sheet **không lưu**.

### Checklist duyệt
- [ ] Mỗi vị trí của radio (Mọi người / Chỉ người quản lý / Tắt) có frame; không frame nào còn nhóm "ÂM THANH" (v1.9).
- [ ] `off` không còn nhóm chu kỳ; `switch-off-confirm` dùng đúng chữ của S-ROOM-05.
- [ ] Số chu kỳ cùng định dạng với S-ROOM-03.

---

## Edge case S-SET-07 & S-SET-06 (kênh voice) (rà ngày 21/10/2026)

Frame nằm trong nhóm "08 · Cài đặt Server & kênh — Edge case", tên `S-SET-EDGE · <trường hợp>` (5 frame). Chủ dự án chọn làm cả 15 trường hợp.

### Có frame
| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `changed-by-other` — người quản lý khác đổi cài đặt khi An đang xem | Màn cập nhật ngay theo `CHANNEL_UPDATE` (Bình đổi sang "Chỉ người quản lý": radio đổi, hiện dòng "Bạn vẫn điều khiển…") + `Toast` "Bình vừa đổi cài đặt phòng học" | STUDY-11, SRV-02 AC1 |
| `long-name-hub` — tên kênh dài 100 ký tự ở danh sách mục | Dòng tên kênh dưới header cắt 1 dòng `…`; header "Cài đặt kênh" không đổi | C-04 › Chữ dài |
| `long-name-overview` — sửa tên dài 100 ký tự | Ô "Tên kênh" xuống dòng hiện đủ tên (người sửa cần thấy hết), bộ đếm "100/100" | SRV-02 |
| `large-text` — S-SET-07 ở chữ 200% | Màn cuộn (frame vẽ ở nửa dưới: cuối nhóm "Ai được bắt đầu" và nhóm Chu kỳ — nhóm Âm thanh đã bỏ ở v1.9); tiêu đề nhóm, nhãn, mô tả và giá trị xuống dòng tự do; hàng cao theo chữ; công tắc giữ cỡ, căn trên | NFR-A11Y-03, C-34, C-15 |
| `long-cycle-360` — chu kỳ ở giá trị biên trên khung 360 | Giá trị hàng "Chu kỳ" "120/30 · nghỉ dài 60 sau mỗi 8 vòng" xuống dòng, không cắt | STUDY-01 (khoảng giá trị) |

### Chỉ ghi luật (giao diện không đổi)
| Tình huống | Luật |
|---|---|
| Bị thu hồi quyền khi đang ở S-SET-06 / S-SET-07 | Màn tự đóng về drawer S-HOME-02 (09/11/2026, P1-A2.6 #63: trước ghi "về kênh"; cùng đích với kênh bị xóa và S-SET-01), `Toast` "Bạn không còn quyền chỉnh kênh này"; thao tác đang lưu bị từ chối `40302` cũng đi đường này |
| Kênh bị người khác xóa khi đang ở S-SET-06 / S-SET-07 | Về drawer S-HOME-02, `Toast` "Kênh này đã bị xóa" |
| Phiên học kết thúc khi đang mở dialog tắt Phòng học | Dialog đóng; radio "Tắt" áp dụng ngay (không còn phiên để xác nhận) |
| Phiên học bắt đầu / kết thúc khi đang xem | Dòng "Đang có phiên học · N người" hiện / biến mất ngay; N cập nhật thưa (khi có người vào / rời) |
| Hai người cùng đổi "Ai được bắt đầu phiên học" | Ai lưu sau thắng (last write wins); màn người kia cập nhật qua `CHANNEL_UPDATE` (không toast nếu chính mình vừa lưu) |
| Xác nhận tắt Phòng học đúng lúc Host bấm Dừng | Phiên kết thúc một lần, phút chốt một lần (backend idempotent theo session) |
| Đổi tên trùng tên kênh khác (v1.9, CR-17 — thay luật "Cho phép") | Không cho trùng tên với kênh **cùng loại** trong cùng danh mục (hoặc cùng nhóm không danh mục), không phân biệt hoa thường, có phân biệt dấu: bấm Lưu → ô `error` "PHÒNG HỌC đã có phòng Phòng học im lặng" (`40001`, như S-SET-06 `name-taken`). Trùng tên với kênh text cùng danh mục thì được |
| Mất mạng đúng lúc lưu một lựa chọn | Như `save-error`: trả giá trị cũ + `Toast` "Chưa lưu được thay đổi · Thử lại" |
| App bị kill khi đang sửa tên chưa lưu | Thay đổi mất; không lưu nháp |
| Chọn "Tắt" khi phiên đang tạm dừng | Vẫn hỏi xác nhận (phiên còn tồn tại) |
| Phòng chỉ còn mình Host | Dialog bỏ số người: "Tắt Phòng học và dừng phiên học?" (cùng luật cho `stop` của S-ROOM-05: "Dừng phiên học?") |

## Quyết định trước cho S-SET-08 (chốt 21/10/2026, chuyển từ README › Câu hỏi còn mở)

S-SET-08 (P2) vẽ sau; các quyết định đã có:

| # | Quyết định |
|---|---|
| A1 | Danh sách chọn Owner mới: mọi thành viên trừ chính mình; ẩn tài khoản đang chờ xóa / bị khóa; có ô tìm kiếm |
| A2 | Xác nhận bằng sheet 10 › S-MOD-03 `password`: "Chuyển quyền Owner cho Bình?" + hệ quả + ô mật khẩu, nút "Chuyển quyền" `danger`, sai mật khẩu báo dưới ô (`40102`) |
| A3 | Đi từ luồng rời server (02 S-HOME-09 `owner-leave`): chuyển xong → `Toast` "Bình đã là Owner" rồi mở luôn dialog rời server. Đi từ Cài đặt server: chỉ `Toast`, ở lại màn cài đặt |
| A4 | Người nhận có mục trong tab Thông báo: "An đã chuyển quyền Owner của Ôn thi Giải tích 2 cho bạn" (loại mới — CR-08 mục 4) |

---

# P2 — Cài đặt server

## S-SET-01 · Cài đặt server

**Mục đích:** một chỗ vào mọi việc quản trị server mà người xem có quyền.
**REQ:** SRS 3.2 (cây Server Settings), SRV-01, SRV-05.
**Mở từ:** "Cài đặt server" ở 02 S-HOME-09 (hiện khi có ít nhất một quyền quản lý; hàng mang cùng `Badge · count · neutral` số báo cáo chờ — v1.9); mục `owner_transferred` ở 06. **Đi tới:** `overview`, S-SET-02 `list`, S-SET-03 `list`, S-SET-04 `invites` / `bans`, S-SET-05 `pending`, S-SET-08 `transfer-picker` / `delete-confirm`; back → drawer S-HOME-02.

### Bố cục (`owner`)
```
│ ‹  Cài đặt server                        │  ScreenHeader
│ [G1] Ôn thi Giải tích 2                  │  icon server 48 + tên (headline)
│      Study Server · 24 thành viên        │  label, text-secondary
│ ⓘ  Tổng quan                          ›  │  MANAGE_SERVER
│ 🛡  Vai trò                    4      ›  │  MANAGE_ROLES — giá trị: số role
│ 👥 Thành viên                 24      ›  │  KICK / BAN / MODERATE_MEMBERS hoặc MANAGE_ROLES
│ 🔗 Lời mời                     2      ›  │  MANAGE_SERVER
│ ⛔ Danh sách cấm               1      ›  │  BAN_MEMBERS
│ ⚑  Báo cáo                   (2)     ›  │  MANAGE_MESSAGES — Badge · count · neutral (v1.9): số đối tượng đang chờ
│ CHỈ OWNER                                │  nhãn nhóm (text-tertiary)
│ 👑 Chuyển quyền Owner                 ›  │
│ 🗑 Xóa server                            │  chữ + icon danger
└ TabBar (Home) ───────────────────────────┘
```

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `owner` | Như bố cục (An). (v1.9, CR-18) Badge ở hàng "Báo cáo" là `Badge · count · neutral` "2" (nền `surface-3`, chữ `text-primary`), cùng số với badge cạnh tên server ở drawer và hàng "Cài đặt server" của menu server (02); `accessibilityLabel` hàng "Báo cáo, 2 báo cáo đang chờ" | — |
| `moderator` | Bình (Trưởng nhóm): chỉ "Thành viên" và "Báo cáo" (Badge trung tính "2" — Bình xem được `#hoi-dap` nên thấy cả hai đối tượng); không có nhóm Owner; dòng ghi chú dưới danh sách | "Bạn thấy các mục mà vai trò Trưởng nhóm được quản lý." |
| `overview` | Màn con "Tổng quan": ảnh server 96 (chạm → sheet "Đổi ảnh server": Chọn ảnh · Chụp ảnh · Xóa ảnh, như 07 S-ME-01 `avatar-sheet`, crop vuông) + ô "Tên server" với bộ đếm "18/100"; "Lưu" ở header. (v1.9, CR-17 #2) Dưới ô tên: `SettingsRow · nav` "Kênh tin chào mừng" giá trị "# chao-mung" + mô tả `label` `text-secondary` | "Tin “X đã tham gia server” được gửi vào kênh này." |
| `welcome-picker` 🆕 | (v1.9) Chạm "Kênh tin chào mừng" → `BottomSheet` "Kênh tin chào mừng": `RadioRow` "Không gửi" (mô tả "Không tạo tin khi có người vào") ở đầu, rồi mọi kênh text của server theo thứ tự drawer, icon `#`: chao-mung (đang chọn) · thong-bao · tai-lieu · hoi-dap · viec-nhom (danh sách dài thì cuộn trong sheet). Chạm là **lưu ngay** và đóng sheet (luật lưu của khu vực; không cần "Lưu" ở header) | — |
| `welcome-off` 🆕 | (v1.9) Đã chọn "Không gửi": giá trị hàng "Không gửi", mô tả đổi | "Không tạo tin khi có người vào" |
| `overview-editing` | Ô focus + bàn phím, "Lưu" `primary` | "Ôn thi Giải tích 2 – K22" · "24/100" |
| `overview-name-error` | Bấm Lưu khi tên < 2 ký tự | "Tên server cần 2–100 ký tự" (`40001`, SRV-01 AC2) |
| `overview-icon-uploading` | Ảnh mới mờ + vòng tiến độ như 07 S-ME-01 `uploading`; dòng "Đổi ảnh server" thành chữ `label` `text-secondary` (theo frame, 12/11/2026); lỗi → `upload-error` của 07 | "Đang tải ảnh lên…" |
| `offline` | `Banner · offline`; hàng vẫn mở được (màn con tự xử lý offline); "Xóa server" `disabled` | "Bạn đang offline" |

Lưu tổng quan xong → về danh sách + `Toast` "Đã lưu thay đổi". (09/11/2026, P1-A2.3 #60) Back khi tên server chưa lưu → `Dialog` "Bỏ thay đổi?" · "Tên server mới chưa được lưu." · "Ở lại" / "Bỏ thay đổi" (`danger`). Mất hết quyền quản lý khi đang ở S-SET-01 (hoặc lưu bị `40302`) → màn tự đóng về drawer + `Toast` "Bạn không còn quyền quản lý server này" (một luật với S-SET-06 / S-SET-02 › Edge case). Không có mô tả server hay mục v1.x (Audit Log, Leaderboard, Events) trong MVP — các hàng đó **ẩn** (Q15). (v1.9, CR-17 #2) **Kênh tin chào mừng** thay luật "không đổi kênh tin hệ thống" của Q15: chỉ người có `MANAGE_SERVER`; kênh đang chọn bị xóa thì hàng thành "Không gửi"; kênh tin chào mừng đổi tên / chuyển danh mục / đặt riêng tư như kênh thường. Không áp dụng: `loading` (dữ liệu có từ `READY`), `empty`, `error` (lưu lỗi dùng `Toast` chung), `forbidden` (không quyền thì không có điểm vào), `os-permission` (ảnh: photo picker không cần quyền; camera → 10 S-MOD-05).

---

## S-SET-02 · Vai trò

**Mục đích:** tạo, sắp xếp, sửa quyền và gán người cho role.
**REQ:** ROLE-01, ROLE-02, ROLE-04, 8.5.1, 8.5.3.
**Mở từ:** "Vai trò" ở S-SET-01. **Đi tới:** `edit-role`, `create-sheet`, `role-members`; back → S-SET-01.

### Bố cục (`list`)
```
│ ‹  Vai trò                      Sắp xếp  │  ScreenHeader + action (text)
│ Vai trò cao hơn quản lý được vai trò     │  label, text-secondary
│ thấp hơn. Kéo để đổi thứ tự.             │
│ 🛡 Quản trị                1 người    ›  │  SettingsRow · nav (cao nhất trên cùng)
│ 🛡 Trưởng nhóm             2 người    ›  │
│ 🛡 Điều phối phòng học     1 người    ›  │
│ 👥 @everyone               Mọi người  ›  │  luôn ở cuối, không kéo được
│ [＋ Tạo vai trò]                         │  Button · secondary
```

### Màn sửa role (`edit-role`, Quản trị, góc nhìn An)
```
│ ‹  Quản trị                         Lưu  │
│ Tên vai trò                       8/100  │  TextField
│ [ Quản trị                             ] │
│ Cho phép nhắc @Quản trị           [  ○]  │  SettingsRow + Switch (is_mentionable)
│ Ai trong server cũng gõ được @Quản trị   │  mô tả: báo cho mọi người có vai trò này
│ 👥 Thành viên              1 người    ›  │  → role-members
│ QUYỀN CHUNG                              │
│ Quản trị viên                     [  ○]  │  mô tả: "Có mọi quyền, bỏ qua quyền riêng của kênh…"
│ Quản lý server                    [  ○]  │
│ Quản lý kênh                      [●  ]  │
│ Quản lý vai trò                   [●  ]  │
│ Tạo lời mời                       [  ○]  │  role không có CREATE_INVITE (đã có ở @everyone)
│ THÀNH VIÊN · TIN NHẮN · THOẠI · HỌC TẬP  │  các nhóm tiếp theo (cuộn)
│ 🗑 Xóa vai trò                            │  danger, cuối màn
```

### Nhóm quyền (nhãn tiếng Việt cho bit 8.5.1 — chỉ bit có giao diện MVP, Q2)
| Nhóm | Hàng (bit) |
|---|---|
| QUYỀN CHUNG | Quản trị viên (`ADMINISTRATOR`) · Quản lý server (`MANAGE_SERVER`) · Quản lý kênh (`MANAGE_CHANNELS`) · Quản lý vai trò (`MANAGE_ROLES`) · Tạo lời mời (`CREATE_INVITE`) |
| THÀNH VIÊN | Mời ra khỏi server (`KICK_MEMBERS`) · Cấm thành viên (`BAN_MEMBERS`) · Tạm khóa thành viên (`MODERATE_MEMBERS`; nhãn v1.9, CR-17) |
| TIN NHẮN | Xem kênh (`VIEW_CHANNEL` — xem kênh là đọc được mọi tin, kể cả tin cũ) · Gửi tin nhắn (`SEND_MESSAGES`) · Đính kèm file (`ATTACH_FILES`) · Hiện xem trước link (`EMBED_LINKS`) · Thêm reaction (`ADD_REACTIONS`) · Nhắc @everyone và mọi vai trò (`MENTION_EVERYONE`) · Quản lý tin nhắn (`MANAGE_MESSAGES`) |
| THOẠI | Vào phòng thoại (`CONNECT`) · Nói (`SPEAK`) · Bật camera (`VIDEO`) · Tắt mic người khác (`MUTE_MEMBERS`) · Ngắt / chuyển người khỏi phòng (`MOVE_MEMBERS`) |
| HỌC TẬP | Quản lý phòng học (`MANAGE_STUDY_ROOMS`) · Tạo việc (`CREATE_TASKS`) · Quản lý việc (`MANAGE_TASKS`) |
| Ẩn ở MVP | `VIEW_AUDIT_LOG`, `MANAGE_EVENTS` (màn ở v1.x), `CHANGE_NICKNAME`, `MANAGE_NICKNAMES` (nickname theo server không có trong MVP — CR-09 mục 1), `DEAFEN_MEMBERS` (tắt loa chuyển sang v1.x — CR-10 mục 3, 22/10/2026). Giá trị bit giữ nguyên, không bị xóa khi lưu |
| Đã bỏ (v1.9, CR-14) | "Đọc tin cũ" (`READ_MESSAGE_HISTORY`, bit 13 giữ chỗ, không dùng): không còn hàng ở màn sửa vai trò lẫn quyền riêng của kênh (`overwrite-edit`) |

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `list` | Như bố cục (An) | — |
| `reorder` | Chạm "Sắp xếp": hàng có tay nắm `grip-vertical`, kéo được; @everyone cố định; header đổi "Xong". (v1.9, CR-17 #10) Không ai đưa role lên ngang hoặc trên role cao nhất của mình: thả ở chỗ đó → hàng về chỗ cũ, không gọi API; backend vẫn trả `40301` (dữ liệu cũ) → `Toast` chung của mã này (10 S-MOD-04) | Thả → lưu ngay (`PATCH /roles/positions`) |
| `create-sheet` | `BottomSheet` "Tạo vai trò": ô tên + nút "Tạo"; role mới đặt **ngay dưới role cao nhất của người tạo** (Owner hoặc người không có role: trên cùng), không quyền nào; tạo xong mở `edit-role`. Tên 1–100 ký tự, không trùng trong server (không phân biệt hoa thường, có phân biệt dấu), không được là `everyone` / `here` (có hoặc không `@`) — v1.9, CR-17 #10 | "Tên vai trò" · "Tạo" |
| `create-name-taken` 🆕 | (v1.9) `create-sheet` gõ "trưởng nhóm", bấm "Tạo": ô `error`, bàn phím vẫn mở, sheet không đóng | "Đã có vai trò Trưởng nhóm" (`40001`, lỗi field `name`) |
| `edit-role` | Như bố cục; công tắc quyền lưu ngay | — |
| `edit-role-name-taken` 🆕 | (v1.9, CR-17 #10) An sửa "Điều phối phòng học", gõ tên "everyone", bấm "Lưu": ô `error`; cùng chỗ hiện lỗi trùng ("Đã có vai trò Trưởng nhóm") khi đổi sang tên đã có | "Tên này dành cho hệ thống" (`40001`) |
| `edit-role-middle` | Cuộn tiếp từ `edit-role` (frame đó dừng ở nhãn THÀNH VIÊN): nhóm THÀNH VIÊN (3 quyền: Mời ra khỏi server · Cấm thành viên · **Tạm khóa thành viên**) và TIN NHẮN tới "Nhắc @everyone và mọi vai trò" (v1.9: không còn hàng "Đọc tin cũ") | — |
| `edit-role-lower` | Cuộn tiếp: "Quản lý tin nhắn", nhóm THOẠI và HỌC TẬP. Cuối danh sách ("Xóa vai trò") thấy ở `delete-confirm`. Bốn frame `edit-role` → `edit-role-middle` → `edit-role-lower` → `delete-confirm` nối liền, không bỏ hàng nào | — |
| `everyone` | "@everyone": không có ô tên, không "Xóa", không "Thành viên"; header không có "Lưu" (màn không có ô chữ, công tắc lưu ngay); dòng đầu | "Quyền của mọi người trong server. Vai trò khác cộng thêm quyền vào đây." |
| `hierarchy-blocked` | Góc nhìn Tuấn (role cao nhất là Quản trị): chỉ hàng "Quản trị" có icon `lock`, giá trị đổi thành "Ngang bạn", không kéo được; Trưởng nhóm, Điều phối phòng học, @everyone vẫn bình thường (sửa được) | Dòng đầu danh sách: "Bạn chỉ quản lý được vai trò thấp hơn Quản trị." |
| `role-readonly` | Tuấn mở "Quản trị" (vai trò của chính mình, ngang mình): mọi ô `disabled` nhưng vẫn thấy giá trị thật (Quản lý kênh, Quản lý vai trò, Mời ra, Cấm, Tạm khóa thành viên bật), không "Lưu" / "Xóa"; dòng trên cùng | "Vai trò này ngang hoặc cao hơn vai trò cao nhất của bạn nên bạn chỉ xem được." (`40301`) |
| `permission-locked` | Tuấn sửa "Điều phối phòng học": công tắc của quyền Tuấn không có `disabled` (chữ `text-tertiary`, công tắc mờ) + mô tả. Frame vẽ phần đầu (Quản trị viên, Quản lý server khóa); frame `permission-locked-lower` vẽ phần cuộn xuống: Tắt mic người khác, Ngắt / chuyển người khỏi phòng, **Quản lý phòng học** (đang bật, khóa — Tuấn không gỡ được) và Quản lý việc khóa; Quản lý tin nhắn, Vào phòng thoại, Nói, Bật camera, Tạo việc sửa được (Tuấn có qua Quản trị hoặc @everyone) | "Bạn cần có quyền này để cấp cho người khác" (ROLE-01 AC2, `40302`) |
| `admin-on` | Bật "Quản trị viên": các công tắc khác vẫn giữ giá trị nhưng mờ; dòng dưới hàng | "Vai trò có mọi quyền và bỏ qua quyền riêng của kênh. Vẫn không quản lý được vai trò cao hơn." |
| `role-members` | Màn con "Thành viên · Quản trị": danh sách `MemberRow` + nút "Thêm thành viên" (→ danh sách chọn có `Checkbox` + tìm kiếm); mỗi hàng có `x` để gỡ (lưu ngay, `Toast` "Đã gỡ Quản trị khỏi Tuấn · Hoàn tác") | — |
| `role-members-add` | "Thêm thành viên" → `BottomSheet` "Thêm vào Quản trị": `SearchField` + danh sách `MemberRow · username` + `Checkbox` (người đã có role chọn sẵn, mờ, nhãn "Đã có vai trò" — Tuấn); mẫu đang chọn Dũng và Giang; nút "Thêm (2)" | — |
| `delete-confirm` | Danh sách cuộn tới cuối (HỌC TẬP + "Xóa vai trò") + `Dialog` | "Xóa vai trò Quản trị?" · "1 thành viên sẽ mất các quyền của vai trò này. Không hoàn tác được." · "Hủy" / "Xóa vai trò" (`danger`) |
| `limit` | Đã có 250 role: dòng giải thích đầu màn đổi thành dòng giới hạn, thêm nhãn nhóm "250 VAI TRÒ", không có nút "Tạo vai trò" (cuối danh sách). Frame vẽ đầu danh sách: Quản trị, Trưởng nhóm, "Nhóm ôn đề 248", 247… (sửa 22/10/2026: frame cũ chỉ có 3 role, không khớp con số 250) | "Server đã có 250 vai trò, mức tối đa. Xóa bớt vai trò để tạo vai trò mới." (ROLE-01) |
| `save-error` | Công tắc trả về giá trị cũ + `Toast` | "Chưa lưu được thay đổi · Thử lại" |
| `offline` | `Banner · offline`; mọi điều khiển `disabled`; danh sách là cache | "Bạn đang offline" |

Hàng role **không có màu và không có "Hiển thị riêng" (hoist)** ở MVP (Q1). Không áp dụng: `loading` (role đã tải cùng server khi mở drawer — `GET /servers/{id}`, 09/11/2026 P1-A3.1 #64; trước ghi "có trong `READY`"), `empty` (luôn có @everyone), `os-permission`.

---

## S-SET-03 · Thành viên & kiểm duyệt

**Mục đích:** tìm một thành viên, gán role, tạm khóa (timeout), mời ra (kick) hoặc cấm (ban).
**REQ:** ROLE-04, ROLE-05, ROLE-07, 8.5.2 (hierarchy).
**Mở từ:** "Thành viên" ở S-SET-01; nhóm "Kiểm duyệt" ở 02 S-HOME-10 `moderator` (mở thẳng sheet / dialog tương ứng trên hồ sơ, không chuyển màn — Q5); (v1.9, CR-18) `act-sheet` của S-SET-05 ("Xử lý {tên}") mở thẳng sheet / dialog bên dưới trên màn báo cáo, biến thể `*-from-report`. **Đi tới:** `member-detail`, các sheet / dialog bên dưới; back → S-SET-01.

### Bố cục (`list`)
```
│ ‹  Thành viên                            │
│ [🔍 Tìm theo tên hoặc username         ] │  SearchField
│ 24 THÀNH VIÊN                            │  nhãn nhóm
│ (A)● An                     Owner        │  MemberRow · username (C-28): tên + username,
│      an.nguyen                           │  bên phải role cao nhất / "Owner"
│ (B)● Bình             Trưởng nhóm        │
│      binh.tran                           │
│ (Q)○ Quân             Tạm khóa tới 21:12 │  nhãn text-secondary thay chỗ role (v1.9: "Tạm khóa")
│ …                                        │
```
Thứ tự: theo tên (bảng chữ cái tiếng Việt), phá hòa bằng username — một luật với drawer 02 S-HOME-03; không chia online / offline. Không tự xếp lại khi đang xem. Nhãn bên phải theo C-28: Owner ghi "Owner", người khác ghi role cao nhất.

### Màn thành viên (`member-detail`, Khánh, góc nhìn An)
```
│ ‹  Khánh                                 │
│ (Avatar 64)● Khánh · khanh.le            │
│ Thành viên từ 05/10/2026                 │  label
│ VAI TRÒ                                  │
│ ☐ Quản trị                               │  Checkbox (C-23), lưu ngay; thứ tự theo position
│ ☐ Trưởng nhóm                            │
│ ☐ Điều phối phòng học                    │
│ KIỂM DUYỆT                               │
│ ⏱ Tạm khóa                            ›  │  MODERATE_MEMBERS → timeout-sheet
│ ⎋ Mời ra khỏi server                     │  KICK_MEMBERS → kick-confirm (chữ danger)
│ ⛔ Cấm khỏi server                        │  BAN_MEMBERS → ban-confirm (chữ danger)
```

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `list` | Như bố cục | — |
| `search` | Gõ "kh": lọc không dấu theo tên và username, bàn phím mở | "1 KẾT QUẢ" |
| `search-empty` | Không khớp | "Không có thành viên nào tên “xyz”" |
| `member-detail` | Như bố cục | — |
| `member-blocked` | Tuấn mở An (Owner): không có nhóm KIỂM DUYỆT; mọi checkbox role `disabled` (giữ giá trị: An có Trưởng nhóm); dòng lý do có icon `lock`. Cùng luật khi người xem mở người có role cao nhất ngang / cao hơn mình (vd Bình mở Tuấn): không có KIỂM DUYỆT; nếu người xem có `MANAGE_ROLES` thì checkbox role `disabled` (không quản lý vai trò thì nhóm VAI TRÒ ẩn như luật hiện theo quyền) | "An là Owner của server nên bạn không gán vai trò hay kiểm duyệt được." / "Tuấn có vai trò cao hơn bạn nên bạn không gán vai trò hay kiểm duyệt được." (`40301`, ROLE-05) |
| `timed-out` | Quân: dòng `ChipStatus` "Tạm khóa tới 21:12 · Gửi tin liên tục" dưới tên; hàng "Tạm khóa" thay bằng hai hàng (v1.9, CR-17 #12): "Đổi thời hạn tạm khóa ›" (→ `timeout-change-sheet`) và "Gỡ tạm khóa" | Gỡ → lưu ngay + `Toast` "Đã gỡ tạm khóa cho Quân" |
| `timeout-sheet` | `BottomSheet` "Tạm khóa Khánh": RadioRow 60 giây · 5 phút · 10 phút · **1 giờ** · 1 ngày · 1 tuần (Q6); (v1.9, CR-17 #12) ngay dưới các mức một dòng `label` `text-secondary` icon `clock-3` ghi giờ hết theo mức đang chọn, đổi khi chọn mức khác; + ô "Lý do (không bắt buộc)" 0/512, gợi ý trong ô "Người bị xử lý sẽ thấy lý do này" + nút "Tạm khóa" | Mô tả: "Khánh vẫn đọc được tin nhắn nhưng không gửi tin, thả reaction hay vào phòng thoại được." · giờ hết: "Hết lúc 21:12 hôm nay" (1 giờ); khác ngày: "Hết lúc 20:12, 19/10" (1 ngày) |
| `timeout-sheet-in-room` 🆕 | (v1.9) Như `timeout-sheet`, Khánh đang ở Phòng học im lặng (phòng của server này): thêm dòng `FormMessage` trung tính icon `info` dưới dòng giờ hết | "Khánh đang ở Phòng học im lặng nên sẽ bị ngắt khỏi phòng; giờ đã học được giữ." |
| `timeout-change-sheet` 🆕 | (v1.9) Từ `timed-out` › "Đổi thời hạn tạm khóa": **cùng sheet** với `timeout-sheet`, tiêu đề "Đổi thời hạn tạm khóa Quân", không có ô lý do; mẫu chọn "1 ngày" → "Hết lúc 20:12, 19/10" (thời hạn tính lại từ bây giờ, không gỡ rồi khóa lại); nút "Đổi thời hạn" | Xong → `Toast` "Đã đổi thời hạn tạm khóa Quân"; chip đổi thành "Tạm khóa tới 20:12, 19/10 · Gửi tin liên tục"; Quân nhận mục `moderation` mới (06) |
| `kick-confirm` | `Dialog` có ô lý do (gợi ý "Người bị xử lý sẽ thấy lý do này" — một gợi ý cho cả tạm khóa / mời ra / cấm) | "Mời Khánh ra khỏi server?" · "Khánh có thể quay lại bằng lời mời mới." · ô "Lý do (không bắt buộc)" · "Hủy" / "Mời ra" (`danger`) |
| `ban-confirm` | `Dialog` có ô lý do + 3 RadioRow "Xóa tin nhắn gần đây": **Không xóa** · 1 ngày qua · 7 ngày qua | "Cấm Khánh khỏi server?" · "Khánh bị mời ra và không vào lại được bằng lời mời nào cho tới khi được bỏ cấm." · "Hủy" / "Cấm" (`danger`) (SRS 3.4, ROLE-05 AC1) |
| `ban-keyboard` | Gõ lý do: dialog đẩy lên trên bàn phím | "Bán đề thi có đáp án" |
| `done` | Kick / ban xong → về danh sách, người đó biến mất + `Toast` | "Đã mời Khánh ra khỏi server" / "Đã cấm Khánh" |
| `*-from-report` (biến thể) | (v1.9, CR-18 #5) `timeout-sheet`, `kick-confirm`, `ban-confirm` mở từ `act-sheet` của S-SET-05 khi đối tượng là **tin còn tồn tại**: thêm `Checkbox` **tick sẵn** "Xóa cả tin bị báo cáo" ngay trên nút chính (sheet) / trên hàng nút (dialog); dialog Cấm giữ thêm RadioRow "Xóa tin nhắn gần đây". Đối tượng hồ sơ hoặc tin đã bị xóa: không có Checkbox. Vẽ ở S-SET-05 `act-timeout`, `act-ban`; `kick-confirm` theo cùng luật | "Xóa cả tin bị báo cáo" · Toast: "Đã xóa tin và tạm khóa Khánh 1 giờ" / "Đã xóa tin và mời Khánh ra khỏi server" / "Đã xóa tin và cấm Khánh" (bỏ tick: chữ như `done` / không có phần "xóa tin") |
| `save-error` | Gán role lỗi: checkbox trả lại + `Toast` chung | — |
| `offline` | `Banner · offline`; checkbox và hàng kiểm duyệt `disabled` | — |

Người bị xử lý nhận mục `moderation` trong tab Thông báo (06, không push) cho tạm khóa / đổi thời hạn tạm khóa / kick / ban (CR-10 mục 14, CR-17 #12). Kick / ban khi đang mở app theo **02 S-HOME-EDGE `kicked` / `banned`** (đã duyệt 19/10/2026; hiện ở mọi màn): `Dialog` phân biệt bị mời ra hay bị cấm, kèm "Lý do: …" nếu người xử lý có ghi, không nêu tên người xử lý; (v1.9, CR-17 #14) server biến khỏi rail và nền đổi **trước** khi hiện dialog. Đang trong phòng thoại thì bị ngắt ngay (ROLE-05 AC4). (Sửa 22/10/2026: Q7 lúc đầu ghi "chỉ toast, không lý do" — lệch với 02, đã bỏ.) Timeout → 02 S-HOME-01 `timed-out` đã có. Không áp dụng: `loading` (danh sách thành viên có trong cache; tải thêm trang dùng `Skeleton` hàng cuối), `empty` (luôn có ít nhất chính mình), `os-permission`.

---

## S-SET-04 · Lời mời & Danh sách cấm

**REQ:** SRV-03, ROLE-07. **Mở từ:** "Lời mời" / "Danh sách cấm" ở S-SET-01 (hai màn riêng, cùng mẫu danh sách). **Đi tới:** dialog thu hồi / bỏ cấm; back → S-SET-01.

### `invites` (MANAGE_SERVER — Q8)
```
│ ‹  Lời mời                               │
│ Lời mời còn hiệu lực, mới nhất trên cùng.│  label, text-secondary
│ Rt4nW8eq                     bởi Bình    │  mã JetBrains Mono · người tạo
│ 3/10 lượt · hết hạn sau 23 giờ       ⋯   │  label; ⋯ → ActionSheet `invite-actions` (v1.9)
│ k7Qm2xPa                       bởi An    │
│ 5 lượt · hết hạn sau 6 ngày          ⋯   │
```
Mới nhất trên cùng; lời mời hết hạn, hết lượt hoặc đã thu hồi không hiện. Hàng giữ tên hiển thị người tạo ("bởi Bình"); username chỉ ở `invite-actions`. (v1.9, CR-17 #7) Người tạo cũng tự thu hồi được link của mình ngay trong sheet mời (02 S-HOME-07 `revoked`); màn này vẫn chỉ cho người có `MANAGE_SERVER`.

### `bans` (BAN_MEMBERS)
```
│ ‹  Danh sách cấm                         │
│ [🔍 Tìm người bị cấm                   ] │  chỉ khi > 10 người
│ (V) Vũ                                   │  Avatar 40 + tên
│     Spam link cá cược · 15/10 · bởi An   │  label, cắt 1 dòng
```
(v1.9, CR-17 #13) Danh sách cấm xếp **mới cấm nhất trên cùng**; hàng giữ tên hiển thị người cấm ("bởi An").

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `invites` | Như bố cục | — |
| `invite-actions` 🆕 | (v1.9, CR-17 #13) ⋯ của `Rt4nW8eq` → `ActionSheet` có đầu: mã `Rt4nW8eq` (JetBrains Mono, `headline`) + dòng `label` `text-secondary`; hai hàng "Sao chép link" (`link`) · "Thu hồi" (`danger`, → `revoke-confirm`) | "Rt4nW8eq" · "Tạo bởi Bình (binh.tran) · 3/10 lượt" |
| `invites-empty` | `EmptyState · inline` | "Chưa có lời mời nào còn hiệu lực" · "Lời mời tạo từ “Mời bạn” sẽ hiện ở đây." |
| `revoke-confirm` | `Dialog` | "Thu hồi lời mời k7Qm2xPa?" · "Link này sẽ không dùng được nữa. Người đã vào server vẫn ở lại." · "Hủy" / "Thu hồi" (`danger`) → `Toast` "Đã thu hồi lời mời" |
| `bans` | Như bố cục | — |
| `bans-empty` | `EmptyState · inline` | "Chưa cấm ai" |
| `ban-detail` | Chạm hàng → `BottomSheet`: avatar, tên, username, lý do đầy đủ, dòng người cấm có username (v1.9, CR-17 #13), nút "Bỏ cấm" (`secondary`) | "Cấm ngày 15/10/2026 bởi An (an.nguyen)" |
| `unban-confirm` | `Dialog` | "Bỏ cấm Vũ?" · "Vũ có thể vào lại server bằng lời mời hợp lệ." · "Hủy" / "Bỏ cấm" → `Toast` "Đã bỏ cấm Vũ" (ROLE-07 AC2) |
| `offline` | Cache + `Banner · offline`; ⋯ và "Bỏ cấm" `disabled` | — |

`loading` theo luật C-14 (`Skeleton` 4 hàng, không vẽ frame riêng). Không áp dụng: `forbidden` (không quyền → hàng ở S-SET-01 ẩn), `os-permission`.

---

## S-SET-05 · Báo cáo (moderator)

**Mục đích:** người quản lý xem bằng chứng và xử lý báo cáo trong server, mỗi **đối tượng bị báo cáo** (một tin / một hồ sơ) một lần.
**REQ:** SAFE-01 (AC4–AC11), ROLE-05, NOTIF-05 (`reports_pending`, `report_reviewed`). **Mở từ:** "Báo cáo" ở S-SET-01; mục `reports_pending` ở 06 (→ `pending`). **Đi tới:** `evidence` / `user-report` (chạm hàng), `act-sheet` → sheet / dialog của S-SET-03 (biến thể `*-from-report`); back → S-SET-01.

### Bố cục (`pending`) — v1.9, CR-18: một hàng mỗi đối tượng
```
│ ‹  Báo cáo                               │
│ [● Đang chờ · 2 | Đã xử lý ]             │  SegmentedControl; số = số đối tượng
│ 👤 Hồ sơ của Nam       1 báo cáo · 19:40 │  icon theo loại + đối tượng · số báo cáo + giờ (label, căn phải)
│    Spam hoặc quảng cáo                   │  lý do gộp, không lặp (label 600)
│    Nhận làm hộ bài tập lớn, đồ án môn…   │  trích đối tượng: giới thiệu (text-secondary, 1 dòng)
│ 💬 Tin nhắn của Khánh · #hoi-dap         │
│                    2 báo cáo · từ 20:07  │  nhiều báo cáo: "· từ {giờ báo cáo đầu}"
│    Gian lận học tập · Lừa đảo            │
│    “Bán đề thi giữa kỳ có đáp án 50k…”   │  trích tin bị báo cáo
```
Đang chờ xếp theo báo cáo **đầu tiên**, cũ trên cùng; báo cáo mới về đối tượng đã có chỉ tăng số, không đẩy hàng lên. "Đã xử lý" xếp mới xử lý trên cùng. Cột phải "{n} báo cáo · {giờ}" không bao giờ bị cắt; tên đối tượng / kênh cắt "…" trước (360: số và giờ có thể xuống dòng dưới tên như hàng Khánh ở trên). Giờ của ngày khác ghi "16/10 15:40".

### Chi tiết đối tượng (`evidence`, tin của Khánh, góc nhìn An)
```
│ ‹  Tin nhắn của Khánh                    │  ScreenHeader
│ #hoi-dap · 2 báo cáo · từ 20:07          │  label text-secondary
│ Ảnh chụp lúc báo cáo · 20:07             │  label (ảnh chụp của báo cáo đầu tiên)
│ ┌ khối bằng chứng (cuộn bên trong) ────┐ │  MessageBubble thu nhỏ; tin bị báo cáo viền primary
│ └──────────────────────────────────────┘ │
│ BÁO CÁO — 2                              │  nhãn nhóm
│ Gian lận học tập · 20:07                 │  label 600
│ “Bán đề thi có đáp án ngay trong nhóm    │  mô tả, body-sm text-secondary
│ ôn thi”                                  │
│ Lừa đảo · 20:09                          │
│ Không có mô tả                           │  text-tertiary
│ [          Xử lý Khánh          ]        │  Button · secondary · L (→ act-sheet)
│ [  Bỏ qua  ]      [ Xóa tin nhắn ]       │  secondary + danger, chia đôi
```
Hàng nút ghim đáy màn; phần trên cuộn. Không hiện người báo cáo ở đâu cả (AC5).

### Trạng thái
| State | Khác gì | Chữ |
|---|---|---|
| `pending` | Như bố cục | — |
| `empty` | Không còn đối tượng chờ | `EmptyState`: "Không có báo cáo nào đang chờ" · "Báo cáo của thành viên về tin nhắn hoặc hồ sơ trong server sẽ hiện ở đây." |
| `evidence` | Như bố cục chi tiết: khối bằng chứng = tối đa 5 tin trước, **tin bị báo cáo** (viền `primary`), tối đa 5 tin sau **tính tới lúc báo cáo đầu tiên** (mọi tin ≤ 20:07), dạng `MessageBubble` thu nhỏ; khối cuộn bên trong (frame cắt tin ở mép trên / dưới để thấy là cuộn được). Mẫu: Lan 19:58, Mai 20:00, Hà 20:01, Dũng 20:02, Hà 20:04 · **Khánh 20:05** · Bình 20:06, Chi 20:06, Mai 20:06, Lan 20:06. Ba nút: "Xử lý Khánh" · "Bỏ qua" · "Xóa tin nhắn" | "Ảnh chụp lúc báo cáo · 20:07" · "BÁO CÁO — 2" · "Gian lận học tập · 20:07" / “Bán đề thi có đáp án ngay trong nhóm ôn thi” · "Lừa đảo · 20:09" / "Không có mô tả" |
| `act-sheet` 🆕 | (v1.9) Chạm "Xử lý Khánh" → `ActionSheet` tiêu đề "Xử lý Khánh": "Tạm khóa" (`clock-3`) · "Mời ra khỏi server" (`log-out`, `danger`) · "Cấm khỏi server" (`ban`, `danger`) — chỉ mục người xem có quyền **và** tác động được theo hierarchy. Không tác động được người đó (vai trò ngang / cao hơn) → không có nút "Xử lý" ở chi tiết, thay bằng dòng `FormMessage` trung tính | "Bạn không xử lý được Tuấn vì vai trò của Tuấn ngang hoặc cao hơn bạn." |
| `act-timeout` 🆕 | (v1.9) "Tạm khóa" → S-SET-03 `timeout-sheet` biến thể `*-from-report` trên màn chi tiết: "Tạm khóa Khánh", **1 giờ**, "Hết lúc 21:12 hôm nay", ô lý do trống, `Checkbox` tick sẵn "Xóa cả tin bị báo cáo" ngay trên nút "Tạm khóa" | Xong → về `pending` (hàng Khánh biến mất, "Đang chờ · 1") + `Toast` "Đã xóa tin và tạm khóa Khánh 1 giờ"; kết quả ở Đã xử lý "An đã xóa tin và tạm khóa 1 giờ · 20:12" |
| `act-ban` 🆕 | (v1.9) "Cấm khỏi server" → S-SET-03 `ban-confirm` biến thể `*-from-report`: "Cấm Khánh khỏi server?" + câu hệ quả, ô lý do, RadioRow "Xóa tin nhắn gần đây" (**Không xóa** · 1 ngày qua · 7 ngày qua), rồi `Checkbox` tick sẵn "Xóa cả tin bị báo cáo", "Hủy" / "Cấm" (`danger`). Chọn "1 ngày qua" / "7 ngày qua" đã bao gồm tin bị báo cáo: Checkbox giữ tick, `disabled` | Xong → `Toast` "Đã xóa tin và cấm Khánh"; các đối tượng **khác** của Khánh (nếu có) vẫn chờ |
| `delete-confirm` | `Dialog` khi bấm "Xóa tin nhắn" (v1.9: nêu số báo cáo) | "Xóa tin nhắn của Khánh?" · "Tin bị xóa với mọi người trong kênh. 2 báo cáo chuyển sang Đã xử lý." · "Hủy" / "Xóa tin nhắn" (`danger`) |
| `message-gone` | Tác giả đã tự xóa tin: khối bằng chứng vẫn hiện (ảnh chụp) + dòng; nút "Xóa tin nhắn" ẩn, còn "Xử lý Khánh" và "Bỏ qua"; đối tượng vẫn chờ (tác giả tự xóa không đóng báo cáo) | "Tin nhắn gốc đã bị xóa." (AC1) |
| `user-report` | Chi tiết hồ sơ Nam (`ScreenHeader` "Hồ sơ của Nam"): "Ảnh chụp hồ sơ lúc báo cáo · 19:40"; khối bằng chứng: avatar 64, "Nam", `nam.ho`, **giới thiệu** đầy đủ (v1.9, CR-18 #2); "BÁO CÁO — 1": "Spam hoặc quảng cáo · 19:40" / “Giới thiệu toàn quảng cáo làm bài hộ”; nút "Xử lý Nam" (→ `act-sheet`, không còn mở `member-detail`) + "Bỏ qua" (không có "Xóa tin nhắn"). Hồ sơ đã đổi sau khi báo cáo: thêm dòng `label` `text-secondary` dưới khối bằng chứng | Giới thiệu: "Nhận làm hộ bài tập lớn, đồ án môn học, giá sinh viên. Inbox mình nhé!" · hồ sơ đã đổi: "Hồ sơ đã thay đổi sau khi báo cáo." |
| `user-report-done` | Tạm khóa Nam từ "Xử lý Nam" → đối tượng tự chuyển sang Đã xử lý; màn chi tiết: nút biến mất, `FormMessage` (trung tính) ghi kết quả đủ mọi hành động (CR-10 mục 12, sửa v1.9) | "Bình đã tạm khóa Nam 1 giờ · 20:10" |
| `handled` | Tab "Đã xử lý" (segment "Đang chờ · 2" vẫn giữ số): mỗi hàng thêm dòng kết quả ghi **mọi** hành động. Mẫu (đợt 16/10, mới xử lý trên cùng): hồ sơ của Mai (Khác, 1 báo cáo) · tin của Phong ở `#tai-lieu` (Spam hoặc quảng cáo, 1 báo cáo) · tin của Phúc ở `#tai-lieu` (Lừa đảo, 1 báo cáo) | "An đã bỏ qua · 16/10 21:05" / "Bình đã xóa tin và tạm khóa 1 ngày · 16/10 16:30" / "Tuấn đã xóa tin trong kênh · 16/10 16:00" |
| `deleted-in-channel` 🆕 | (v1.9, CR-18 #6) Chạm hàng Phúc ở Đã xử lý: chi tiết tin của Phúc — "Ảnh chụp lúc báo cáo · 16/10 15:40", khối bằng chứng (tin của Phúc viền `primary`: "Nạp 50k nhận tài khoản Wolfram Alpha Pro trọn đời, chuyển khoản trước nhé"), "BÁO CÁO — 1": "Lừa đảo · 16/10 15:40" / "Không có mô tả"; không có nút; `FormMessage` trung tính kết quả | "Tuấn đã xóa tin trong kênh · 16/10 16:00" |
| `member-status` 🆕 | (v1.9, CR-18 #5–6) Nhánh: Tuấn vừa mời Khánh ra khỏi server từ màn Thành viên (ngoài màn Báo cáo — không đóng báo cáo). Chi tiết tin của Khánh vẫn ở Đang chờ: `FormMessage` trung tính icon `info` dưới dòng "#hoi-dap · 2 báo cáo · từ 20:07"; nút "Xử lý Khánh" ẩn, còn "Bỏ qua" · "Xóa tin nhắn". Đang bị tạm khóa (không phải đã rời): dòng thay bằng "Khánh đang bị tạm khóa tới 21:12", giữ đủ ba nút | "Khánh không còn ở server." |
| `handled-by-other` | Người quản lý khác xử lý trước khi An bấm (thao tác sau bị `40901`): nút biến mất + `FormMessage` | "Báo cáo này đã được xử lý: Bình đã xóa tin · 20:11." |
| `handled-by-admin` 🆕 | (v1.10, CR-27) **Góc nhìn An**, thế giới W1 (19/10/2026 21:52): tab "Đã xử lý" ("Đang chờ · 2" — #63 Quân, #66 Phúc mới báo cáo hôm nay); hai hàng đầu do admin xử lý: tin của Khánh · `#hoi-dap` (2 báo cáo) và hồ sơ của Nam (1 báo cáo). Ghi "Đội ngũ NezFocus" thay tên admin, đủ mọi hành động, **không** lý do, lời nhắn hay tên admin (SRS 4.11, REQ-SAFE-01). Chạm hàng Khánh → chi tiết như `deleted-in-channel`, `FormMessage` cùng câu | "Đội ngũ NezFocus đã xóa tin và khóa tài khoản 7 ngày · 21:46" / "Đội ngũ NezFocus đã đặt lại hồ sơ · 21:50" |
| `offline` | Cache + `Banner · offline`; nút xử lý `disabled` | — |

### Ai thấy gì (v1.9, CR-18 #3 — luật bằng chữ)
- Báo cáo về **tin** chỉ hiện với người có `MANAGE_MESSAGES` **xem được kênh của tin** (tính lúc mở danh sách). Báo cáo về người có `MANAGE_MESSAGES` hoặc Owner không vào đây (AC4). Không còn ai đủ điều kiện → chỉ hàng đợi Platform Admin.
- Số "Đang chờ · n", Badge ở S-SET-01 / drawer / menu server đếm **đối tượng người xem thấy**; hai người quản lý có thể thấy số khác nhau.
- **Một lần xử lý đóng mọi báo cáo đang chờ của đối tượng**; mỗi người báo cáo nhận một mục `report_reviewed` (06, không nêu hành động). Mời ra / cấm chỉ đóng đối tượng đang xem; đối tượng khác của cùng người vẫn chờ, kèm dòng "{tên} không còn ở server." (`member-status`).
- Xóa tin bị báo cáo **ngoài** màn này (menu tin 02 S-HOME-04, hoặc "Xóa tin nhắn gần đây" khi cấm) → đối tượng sang Đã xử lý với kết quả "{Người} đã xóa tin trong kênh · {giờ}" (`deleted-in-channel`). Tạm khóa / mời ra / cấm làm ngoài màn này **không** đóng báo cáo.
- Người quản lý nhận mục `reports_pending` (06, **không push**) khi hàng đợi mình thấy đi từ trống thành có; không có mục nữa tới khi hàng đợi về trống. (Thay ghi chú Q10 cũ "số ở S-SET-01 là chỗ duy nhất báo có việc".)

Không áp dụng: `forbidden`, `os-permission`.

---

## S-SET-06 · Cài đặt kênh — phần P2

### `text` (danh sách mục, kênh text `#viec-nhom`)
```
│ ‹  Cài đặt kênh                          │
│ # viec-nhom                              │
│ ⓘ  Tổng quan                          ›  │
│ 🔒 Quyền                     Đồng bộ  ›  │  giá trị: "Đồng bộ" / "Riêng"
│ ☑  Task Board                    [●  ]   │  Switch lưu ngay (STUDY-06)
│    Bảng việc chung của kênh              │
```
Tổng quan kênh text như `overview` của kênh voice, thêm dòng xem trước tên sẽ lưu dưới ô: gõ "Việc nhóm K22" → "Sẽ lưu là # việc-nhóm-k22" (SRV-02 AC2). (v1.9, CR-17 #4) Ô tên **giữ nguyên chữ người gõ**, chỉ chuẩn hóa khi lưu (chữ thường; khoảng trắng → `-`; giữ chữ cái kể cả dấu, chữ số, `-`, `_`; bỏ ký tự khác; gộp `-` liền nhau, bỏ `-` ở hai đầu); dòng "Sẽ lưu là # …" **chỉ hiện khi tên lưu khác chữ đang gõ**. Kết quả rỗng (vd "???") → ô `error` "Tên kênh cần ít nhất một chữ cái hoặc chữ số" (`40001`).

**Không trùng tên** (v1.9, CR-17 #3; áp cho đổi tên ở đây, tạo kênh S-SET-09, kéo thả / đổi danh mục ở 02, xóa danh mục): trong cùng danh mục (hoặc cùng nhóm không danh mục) không có hai kênh **cùng loại** trùng tên; trong server không có hai danh mục trùng tên. So sánh không phân biệt hoa thường, **có phân biệt dấu** ("bàn" ≠ "bạn"); kênh text so trên tên đã chuẩn hóa ("hỏi-đáp" cạnh "hoi-dap" được). Lỗi là `40001` field `name`, hiện dưới ô khi bấm Lưu / Tạo: "{DANH MỤC} đã có kênh #{tên}" · "{DANH MỤC} đã có phòng {tên}" · "Trên cùng danh sách đã có kênh #{tên}" · "Trên cùng danh sách đã có phòng {tên}" (nhóm không danh mục; câu của kênh thoại thêm 09/11/2026 khi làm P1-A2.4) · "Server đã có danh mục {TÊN}".

| State | Khác gì | Chữ |
|---|---|---|
| `text` | Như trên | — |
| `welcome-text` 🆕 | (v1.9, CR-17 #2) Danh sách mục của `#chao-mung` (kênh tin chào mừng): như `text`, dưới dòng "# chao-mung" thêm dòng `label` `text-secondary` icon `door-open` | "Kênh tin chào mừng của server." |
| `welcome-delete-confirm` 🆕 | (v1.9) Tổng quan của `#chao-mung` › "Xóa kênh" → 10 › S-MOD-03 `type-name`, chữ theo kênh text; câu thứ hai chỉ có ở kênh tin chào mừng | "Xóa #chao-mung?" · "Tin nhắn trong kênh sẽ bị xóa và không khôi phục được. Server sẽ không gửi tin chào mừng tới khi bạn chọn kênh khác." · "Nhập tên kênh để xác nhận" · "Xóa kênh" (`danger`) |
| `text-overview` | Ô tên đang sửa (chữ người gõ giữ nguyên) + dòng tên sẽ lưu (vì khác chữ đang gõ) | "Việc nhóm K22" · "Sẽ lưu là # việc-nhóm-k22" |
| `name-taken` 🆕 | (v1.9) Tổng quan `#viec-nhom`, gõ "Tai lieu", bấm "Lưu": dòng "Sẽ lưu là # tai-lieu" + ô `error` (icon `octagon-x`), bàn phím vẫn mở, "Lưu" giữ `primary` | "THÔNG TIN đã có kênh #tai-lieu" |
| `taskboard-off` 🆕 | (v1.9, CR-17 #11 — thay `taskboard-off-confirm`, Q11) Tắt Task Board **không hỏi**: công tắc lưu ngay về tắt; còn việc chưa xong → `Toast` trên TabBar có hành động (6 giây); dòng mô tả dưới công tắc đổi thành câu giải thích (còn tới khi bật lại hoặc hết việc chưa xong) | Toast: "Đã tắt Task Board · 5 việc chưa xong đã ẩn" · "Hoàn tác". Dưới công tắc: "5 việc chưa xong đang ẩn khỏi kênh và Việc cần làm, không nhắc hạn. Bật lại thì hiện lại như cũ." |
| `overwrites-synced` | Từ hàng "Quyền" của Phòng học im lặng (kênh voice, đồng bộ với PHÒNG HỌC): công tắc bật; dòng "Danh mục PHÒNG HỌC chưa đặt quyền riêng: mọi người dùng quyền theo vai trò trong server." + "Sửa quyền danh mục ›" | — |
| `overwrites` | Màn "Quyền" (`#thong-bao`, quyền riêng): công tắc "Đồng bộ với danh mục THÔNG TIN" trên cùng; danh sách đối tượng có quyền riêng (@everyone, role, người — hàng người dùng `MemberRow · username`), mỗi hàng ghi tóm tắt "2 cho phép · 1 từ chối"; nút "Thêm vai trò hoặc thành viên". Frame mẫu chỉ có hai hàng role: "@everyone" "1 từ chối" (Gửi tin nhắn, khớp `overwrite-edit`) và "Trưởng nhóm" "1 cho phép" | Khi đồng bộ: các hàng là quyền của danh mục, `disabled` + dòng "Đang dùng quyền của danh mục THÔNG TIN. Tắt đồng bộ để đặt quyền riêng." + "Sửa quyền danh mục ›" |
| `overwrite-edit` | Màn quyền của một đối tượng ("@everyone ở #thong-bao"): mỗi quyền một hàng với điều khiển 3 nấc **Từ chối ✕ · Mặc định ⁄ · Cho phép ✓** (SegmentedControl nhỏ, mỗi nấc có icon + nhãn đọc màn hình); lưu ngay. (v1.9, CR-14) Không còn hàng "Đọc tin cũ" | Mẫu: Gửi tin nhắn = Từ chối (8.5.3); dòng đầu "Mặc định = theo quyền của vai trò trong server." |
| `overwrite-edit-voice` | Cùng màn cho kênh voice: chỉ các quyền áp dụng (Xem kênh, Vào phòng thoại, Nói, Bật camera, Gửi tin trong chat phòng, Quản lý phòng học, + hàng THOẠI của Q3) | — |
| `add-target` | Danh sách chọn: nhóm "VAI TRÒ" (role chưa có quyền riêng ở kênh, theo position: Quản trị, Điều phối phòng học) rồi "THÀNH VIÊN" (`MemberRow · username`), có tìm kiếm; role ngang / cao hơn người xem `disabled` (hierarchy; frame là góc nhìn An nên không hàng nào khóa) | — |
| `category-rename` | "Đổi tên danh mục" ở 02 S-HOME-02 `category-menu` → `Dialog` có ô tên (chữ tự do 1–100, bàn phím mở) | "Đổi tên danh mục" · ô "Tên danh mục" "THÔNG TIN" · "Hủy" / "Lưu"; ô trống: "Tên danh mục cần 1–100 ký tự" (thêm 09/11/2026, P1-A2.5; cũng dùng cho S-SET-09 `category`) |
| `category-rename-taken` 🆕 | (v1.9) Đổi tên "PHÒNG HỌC" thành "Thông tin", bấm "Lưu": dialog không đóng, ô `error` | "Server đã có danh mục THÔNG TIN" |
| `category-overwrites` | "Quyền của danh mục" → màn như `overwrites` nhưng tiêu đề "Quyền · THÔNG TIN", không có công tắc đồng bộ, thêm dòng "Kênh trong danh mục đang bật đồng bộ sẽ dùng quyền này." | — |
| `category-delete-confirm` | "Xóa danh mục" → `Dialog` trên drawer (v1.9: THÔNG TIN có 5 kênh vì thêm `#chao-mung`) | "Xóa danh mục THÔNG TIN?" · "5 kênh trong danh mục sẽ chuyển ra ngoài, không bị xóa." · "Hủy" / "Xóa danh mục" (`danger`) (SRV-02 AC5) |
| `category-delete-blocked` 🆕 | (v1.9, CR-17 #3) Nhánh: server đã có một kênh `#tai-lieu` **không danh mục** (tạo cho frame này). "Xóa danh mục" THÔNG TIN → app không gọi API, hiện `Dialog` trên drawer | "Chưa xóa được danh mục THÔNG TIN" · "Đã có kênh #tai-lieu nằm ngoài danh mục. Đổi tên một trong hai kênh trước." · "Đã hiểu" (kênh thoại trùng: "Đã có phòng {tên} nằm ngoài danh mục. Đổi tên một trong hai phòng trước." — thêm 09/11/2026, P1-A2.5) |

Tắt công tắc đồng bộ không hỏi lại: quyền của danh mục được chép sang làm điểm bắt đầu (CR-10 mục 9). Menu nhấn giữ tiêu đề danh mục và nút ＋ là 02 S-HOME-02 `category-menu` (Q13–Q14); menu có thẳng "Đổi tên danh mục" · "Quyền của danh mục" · "Xóa danh mục", không có màn "Cài đặt danh mục" riêng (đổi 22/10/2026 khi duyệt). Hàng "Quyền" ở `voice` (câu hỏi mở #2 của README) trỏ tới `overwrites-synced`. Chỉ sửa được đối tượng thấp hơn mình và chỉ đặt "Cho phép" cho quyền mình có (8.5.2). "Hoàn tác" trên Toast `taskboard-off` bật lại Task Board (một lần lưu mới); Task Board đang tắt thì mục hộp thư của các việc ẩn vẫn giữ, chạm → 05 S-TASK-02 `lost-access`.

---

## S-SET-09 · Tạo kênh 🆕

**REQ:** SRV-02 (AC2, AC3, AC6), STUDY-05, STUDY-11, ROLE-03 (kênh riêng tư lúc tạo — v1.9). **Mở từ:** "Tạo kênh" ở 02 S-HOME-09 (`MANAGE_CHANNELS`); "＋" cạnh tiêu đề danh mục (tạo sẵn trong danh mục đó — Q14). **Đi tới:** kênh mới (text → 02 S-HOME-01 `empty`; voice → 03 xem trước phòng); danh mục mới → drawer.

### Bố cục (`text`, BottomSheet)
```
│ ─────                                    │
│ Tạo kênh                                 │  title-2
│ (•) Kênh văn bản                         │  RadioRow + mô tả "Nhắn tin, gửi file, Task Board"
│ ( ) Kênh thoại                           │  "Nói chuyện, học cùng nhau"
│ ( ) Danh mục                             │  "Nhóm các kênh lại"
│ Tên kênh                          0/100  │
│ [ vd: tài-liệu-chương-5               ]  │  gợi ý giữ dấu (SRV-02 AC2)
│ Danh mục                  THÔNG TIN   ›  │  SettingsRow → danh sách chọn ("Không có danh mục")
│ Kênh riêng tư                    [  ○]   │  SettingsRow + Switch (v1.9, CR-17 #5)
│ Chỉ Owner, Quản trị viên và các vai trò  │  mô tả label text-secondary
│ được chọn thấy kênh này.                 │
│ [          Tạo kênh           ]          │  Button primary L
```
Thứ tự hàng: Tên kênh · Danh mục · (chỉ kênh thoại) "Bật phòng học" · "Kênh riêng tư" (+ "Vai trò được xem" khi bật) · nút. Chọn "Danh mục" thì không có "Bật phòng học" và "Kênh riêng tư" (danh mục dùng "Quyền của danh mục").

| State | Khác gì | Chữ |
|---|---|---|
| `text` | Như bố cục. Mỗi lựa chọn có icon loại kênh `#` / `volume-2` / `folder` (ô `type icon` của RadioRow C-34, thêm 23/10/2026) + nhãn + mô tả | — |
| `text-slug` | Gõ "Tài liệu chương 5" + bàn phím: sheet đẩy lên trên bàn phím, **giữ đủ** nhóm chọn loại kênh (sheet cao tới dưới status bar; nội dung dài hơn thì sheet cuộn, không ẩn nhóm nào). Ô giữ chữ người gõ; dòng tên sẽ lưu chỉ hiện vì khác chữ đang gõ (gõ "tài-liệu-chương-5" thì không có dòng) — luật chuẩn hóa ở S-SET-06 | Dòng dưới ô: "Sẽ lưu là # tài-liệu-chương-5" |
| `voice` | (v1.9, CR-22 #7 — thay dòng trung tính cũ) Chọn Kênh thoại trong Study Server (Ôn thi Giải tích 2), tên "Phòng ôn đề", Danh mục "PHÒNG HỌC": thêm `Switch` "Bật phòng học" **bật** sẵn + mô tả; "Kênh riêng tư" tắt | "Bật phòng học" · "Mọi người bắt đầu được phiên học · chu kỳ 25/5. Đổi trong Cài đặt kênh." |
| `voice-off` 🆕 | (v1.9) Cùng sheet ở server thường (CLB Guitar PTIT), tên "Phòng tập đàn", Danh mục "Không có danh mục": "Bật phòng học" **tắt** sẵn (mặc định theo loại server); mô tả giữ nguyên | Cùng chữ với `voice` |
| `category` | Chọn Danh mục: ẩn hàng "Danh mục", "Kênh riêng tư"; nhãn ô "Tên danh mục" | — |
| `name-error` | Bấm Tạo khi ô trống | "Tên kênh cần 1–100 ký tự" (`40001`); tên chỉ có ký tự bị bỏ (vd "???"): "Tên kênh cần ít nhất một chữ cái hoặc chữ số" |
| `name-taken` 🆕 | (v1.9, CR-17 #3) Kênh thoại, Danh mục "PHÒNG HỌC", gõ "phòng học im lặng", bấm Tạo: ô `error`, bàn phím vẫn mở | "PHÒNG HỌC đã có phòng Phòng học im lặng" (`40001`) |
| `private` 🆕 | (v1.9, CR-17 #5) An tạo kênh văn bản "ban quan tri" ở THÔNG TIN (dòng "Sẽ lưu là # ban-quan-tri"), bật "Kênh riêng tư": dưới mô tả xuất hiện `SettingsRow · nav` "Vai trò được xem" giá trị "2" (đã chọn Quản trị, Trưởng nhóm ở `private-roles`) | "Kênh riêng tư" · "Chỉ Owner, Quản trị viên và các vai trò được chọn thấy kênh này." · "Vai trò được xem · 2 ›" |
| `private-roles` 🆕 | (v1.9) Chạm "Vai trò được xem" → **cùng sheet** đổi nội dung (như `category-picker`): tiêu đề "Vai trò được xem" có `chevron-left`; danh sách `Checkbox` theo `position` (không có @everyone): Quản trị ☑ · Trưởng nhóm ☑ · Điều phối phòng học ☐. Vai trò có `ADMINISTRATOR`: tick + khóa (`Checkbox` `checked-locked`, C-23) + nhãn "Luôn thấy kênh" (mẫu không có vai trò nào như vậy) | "Vai trò được xem" |
| `private-self-warning` 🆕 | (v1.9) Góc nhìn **Tuấn** (không phải Owner, không `ADMINISTRATOR`, có `MANAGE_CHANNELS`): ở `private-roles`, "Quản trị" (vai trò cao nhất của Tuấn) được tick sẵn kèm nhãn `label` `text-tertiary` "Vai trò của bạn"; Tuấn bỏ tick nó (Trưởng nhóm vẫn tick) → `FormMessage` trung tính icon `eye-off` dưới danh sách (cũng hiện trên nút "Tạo kênh" khi quay lại form); không chặn tạo | "Bạn sẽ không thấy kênh này sau khi tạo" |
| `limit` | Server đã có 500 kênh: `FormMessage` trên nút, nút `disabled` | "Server đã có 500 kênh, mức tối đa." |
| `category-picker` 🆕 | Chạm hàng "Danh mục" → **cùng sheet** đổi nội dung thành "Chọn danh mục" (một tay nắm, không chồng sheet thứ hai), tiêu đề có `chevron-left` để quay lại form: "Không có danh mục" ở đầu (mô tả "Kênh nằm trên cùng danh sách"), rồi các danh mục theo thứ tự trong drawer; mục đang chọn có dấu `check` `primary`; chạm là chọn và trở lại form Tạo kênh (22/10/2026) | "Chọn danh mục" · "Không có danh mục" · "THÔNG TIN" · "PHÒNG HỌC" |
| `created` | Vào kênh mới + `Toast` ngay trên composer; khối chào đầu kênh nằm trên toast, không bị che. (09/11/2026, P1-A2.4) Kênh thoại: vào xem trước phòng + `Toast` "Đã tạo Phòng ôn đề"; danh mục: không toast, danh mục mới hiện trong drawer | "Đã tạo # tài-liệu-chương-5" |

Kênh riêng tư lúc tạo (v1.9): tạo xong kênh có @everyone bị từ chối "Xem kênh" và mỗi vai trò được chọn được cho phép "Xem kênh" (xem ở S-SET-06 `overwrites`, không đồng bộ với danh mục); chọn được cả vai trò ngang / cao hơn người tạo (chỉ cấp Xem kênh). Không áp dụng: `loading`, `empty`, `offline` (nút "Tạo kênh" ở S-HOME-09 vẫn mở được; bấm Tạo khi offline → `FormMessage` "Cần kết nối mạng để tạo kênh"), `os-permission`.

---

## S-SET-08 · Chuyển quyền Owner & Xóa server

**REQ:** SRV-05, SRS 3.4; quyết định A1–A4 ở trên. **Mở từ:** "Chuyển quyền Owner" / "Xóa server" ở S-SET-01; 02 S-HOME-09 `owner-leave`; 07 S-ME-03 `delete-blocked-owner`. **Đi tới:** 10 S-MOD-03 `password` / `type-name`; xong thì xem A3 và `deleted`.

### Bố cục (`transfer-picker`)
```
│ ‹  Chuyển quyền Owner                    │
│ Chọn người sẽ là Owner của Ôn thi Giải   │  body, text-secondary
│ tích 2. Bạn vẫn giữ các vai trò hiện có. │
│ [🔍 Tìm thành viên                     ] │
│ (B)● Bình                Trưởng nhóm     │  MemberRow · username, chạm → S-MOD-03 password
│      binh.tran                           │
│ (C)◐ Chi       Điều phối phòng học       │
│ …                                        │  không có An, tài khoản chờ xóa / bị khóa (A1)
```

| State | Khác gì | Chữ |
|---|---|---|
| `transfer-picker` | Như bố cục | — |
| `transfer-search` | Gõ "bi" → Bình | — |
| `transfer-alone` | Server chỉ còn An: `EmptyState` | "Server chưa có thành viên khác" · "Mời bạn bè vào trước, hoặc xóa server nếu không dùng nữa." · "Xóa server" (`danger · text`) |
| `transfer-confirm` | 10 S-MOD-03 `password` trên danh sách (A2) | "Chuyển quyền Owner cho Bình?" |
| `transferred` | Từ Cài đặt server: về S-SET-01 ở góc nhìn mới (An còn Trưởng nhóm → `moderator`-like, mất nhóm CHỈ OWNER) + `Toast` "Bình đã là Owner" (A3) | Dòng ghi chú như `moderator`: "Bạn thấy các mục mà vai trò Trưởng nhóm được quản lý." |
| `transferred-leave` | Từ luồng rời server: `Toast` + mở ngay 02 S-HOME-09 `leave-confirm` (A3) | — |
| `delete-confirm` | 10 S-MOD-03 `type-name` (chữ đã có ở 10) | — |
| `deleted` | Một luật với 02 S-HOME-EDGE `kicked`: server biến khỏi rail, mở server kế tiếp trên rail (Nhóm đồ án Mobile, kênh mở gần nhất) + `Toast`; không còn server → 02 S-HOME-02 `no-server` | "Đã xóa Ôn thi Giải tích 2 · Khôi phục được trong 30 ngày" |
| `restore` | Khôi phục nằm ở 02 S-HOME-06 `restore` / `restore-list` (màn Thêm server, Q16) — không vẽ lại ở đây. Server đã xóa mẫu ở đó là **"Ôn thi Đại số tuyến tính"** (server khác, An là Owner), không trùng server đang dùng; frame `deleted` ở trên là nhánh "nếu An xóa Ôn thi Giải tích 2" nên giữ tên đó | — |

Không áp dụng: `loading` (danh sách thành viên từ cache), `offline` (nút xác nhận ở S-MOD-03 tự xử lý), `os-permission`.

---

## Edge case P2 (rà ngày 22/10/2026)

Frame nằm trong nhóm "08 · Cài đặt Server & kênh — Edge case P2" (hàng dưới S-SET-08), tên `S-SET-EDGE · <trường hợp>` (10 frame; `mod-deafened` bỏ ngày 22/10/2026 vì tắt loa chuyển sang v1.x). Chủ dự án chọn làm cả 21 trường hợp; v1.9 sửa chữ hai frame, thay một luật và thêm 4 luật (CR-17, CR-18). Bốn frame đầu thuộc màn của area khác (06, 03) nhưng phát sinh từ thao tác kiểm duyệt ở đây.

### Có frame
| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `moderation-inbox` — người bị xử lý xem tab Thông báo (góc nhìn Khánh) | 06 S-NOTI-01, nhóm HÔM NAY: `moderation` chưa đọc "Bạn đã bị cấm khỏi Ôn thi Giải tích 2" · "Lý do: Bán đề thi có đáp án" (20:12); TRƯỚC ĐÓ: `moderation` đã đọc "Bạn bị tạm khóa ở Ôn thi Giải tích 2 đến 16/10 · 21:30" (v1.9, CR-17: nhãn "Tạm khóa"; mục tạo 15/10 — cột giờ "15/10" — tạm khóa 1 ngày nên giờ hết khác ngày, ghi kiểu "ngày · giờ" của 06) và "Bạn đã bị mời ra khỏi CLB Guitar PTIT" · "Bạn có thể quay lại nếu được mời lại." Không có mục nào khác của Ôn thi Giải tích 2 (đã ẩn vì bị ban) | CR-10 mục 14, CR-17 #1, 06 › Luật hộp thư |
| `owner-transferred-inbox` — Bình nhận quyền Owner | 06 S-NOTI-01: mục `owner_transferred` chưa đọc "An đã chuyển quyền Owner của Ôn thi Giải tích 2 cho bạn" (20:12), ô icon `crown` | A4, CR-08 mục 4 |
| `disconnected-by-mod` — bị ngắt khỏi phòng | 03 xem trước phòng (`not-joined`) + `Toast` "Bạn đã bị ngắt khỏi phòng"; phút đã học chốt như Stop của riêng mình; vào lại được ngay | REQ-VC-04, CR-10 mục 3 |
| `timed-out-voice` — đang bị tạm khóa mà mở phòng thoại (giờ của 03: 21:47) | Xem trước phòng: nút "Vào phòng" `disabled` + `FormMessage` (trung tính) "Bạn đang bị tạm khóa đến 22:47 · chưa vào phòng được" (v1.9, CR-17 #1). Không có Mic / Camera ở màn xem trước (CR-22 #4) | REQ-ROLE-05 (timeout không vào voice), 8.5.2 bước 5 |
| `long-role-name` — tên vai trò 100 ký tự | S-SET-02 `list`: hàng cắt 1 dòng `…`, giá trị "1 người" luôn hiện. Tên mẫu: "Nhóm phụ trách tài liệu ôn tập chương 1 đến chương 5 và đề thi giữa kỳ các năm trước lớp K22 CNTT 01" | ROLE-01 (1–100), C-15 |
| `long-ban-reason` — lý do cấm 512 ký tự | S-SET-04 `ban-detail`: sheet cao tới dưới status bar, nút "Bỏ cấm" ghim đáy; ở chữ 100% lý do 512 ký tự hiện đủ, chữ lớn hơn thì khối lý do cuộn bên trong. Hàng ở danh sách cắt phần lý do, giữ "· 15/10 · bởi An" | `server_bans.reason` ≤ 512 |
| `edit-role-large-text` — màn sửa vai trò ở chữ 200% | Nhãn, mô tả xuống dòng tự do, hàng cao theo chữ; công tắc giữ cỡ, căn trên; ô tên cao theo chữ | NFR-A11Y-03, C-15 |
| `overwrite-large-text` — quyền 3 nấc ở chữ 200% | Nhãn quyền xuống dòng bên trái, `TriState` giữ cỡ 40 × 32 mỗi nấc, căn trên. Tiêu đề chỉ còn tên đối tượng ("@everyone"); tên kênh xuống dòng phụ "Quyền riêng ở kênh" / "#thong-bao" để tên kênh không bị ngắt ở dấu gạch nối | NFR-A11Y-03, C-20 `tri-state` |
| `overwrite-360` — quyền 3 nấc ở khung 360 | Nhãn dài ("Nhắc @everyone và mọi vai trò") xuống 2 dòng, cụm 3 nấc không co. Cùng dữ liệu với `overwrite-edit` (chỉ Gửi tin nhắn = Từ chối, còn lại Mặc định — khớp tóm tắt "1 từ chối" ở `overwrites`) | C-20 `tri-state` |
| `roles-empty` — server chỉ có @everyone | S-SET-02 `list`: chỉ hàng @everyone + dòng gợi ý "Chưa có vai trò nào. Tạo vai trò để giao việc quản lý cho bạn bè." + nút "Tạo vai trò" | ROLE-01 |

### Chỉ ghi luật (giao diện không đổi)
| Tình huống | Luật |
|---|---|
| Đang sửa vai trò thì mất quyền Quản lý vai trò | Màn tự đóng về S-SET-01 (hoặc drawer nếu không còn quyền nào) + `Toast` "Bạn không còn quyền quản lý vai trò"; công tắc đang lưu bị từ chối `40302` đi cùng đường này (một luật với S-SET-07 › Edge case) |
| Đang sửa vai trò thì vai trò của mình bị hạ xuống ngang / dưới vai trò đang sửa | Màn chuyển ngay sang `role-readonly` + `Toast` "Vai trò này giờ ngang hoặc cao hơn vai trò của bạn" (`40301`) |
| Hai người cùng sửa một vai trò | Ai lưu sau thắng; màn người kia cập nhật qua `ROLE_UPDATE` (công tắc đổi, tên đổi nếu ô chưa sửa). Đang sửa dở tên mà người kia đổi tên → giữ chữ đang gõ, bấm Lưu thì ghi đè |
| Đang mở chi tiết thành viên thì người đó rời server hoặc bị người khác kick / ban | Hàng KIỂM DUYỆT và VAI TRÒ ẩn, dòng trung tính "Khánh không còn trong server"; back về danh sách đã bỏ người đó |
| Kick / ban đúng lúc người kia vừa có vai trò ngang hoặc cao hơn | Dialog không đóng; `FormMessage` "Khánh vừa có vai trò ngang hoặc cao hơn bạn nên bạn không thể thực hiện." (`40301`); nút chính `disabled` |
| Thu hồi lời mời đúng lúc có người đang vào bằng nó | Ai tới backend trước thắng: người đã vào thì ở lại; sau khi thu hồi, link trả `40041` → 10 S-MOD-01 `expired` |
| Chuyển Owner đúng lúc người nhận rời server | Theo 10 S-MOD-03 › Edge case: "Bình không còn trong server", về danh sách chọn |
| Owner xóa server khi thành viên khác đang mở Cài đặt server | Như 02 S-HOME-EDGE "Server bị Owner xóa khi đang xem": dialog "Ôn thi Giải tích 2 đã bị xóa", đóng → server kế tiếp |
| Rất nhiều lời mời / người bị cấm / báo cáo | Danh sách tải theo trang (cuộn tới cuối tải tiếp, `Skeleton` 2 hàng); ô tìm ở Danh sách cấm hiện khi > 10 người; Lời mời và Báo cáo không có ô tìm (thường ít, xếp theo thời gian); số trên hàng S-SET-01 (`Badge · count · neutral`) hiện tới "99+" |
| Mất mạng đúng lúc bấm Cấm / Mời ra / Tạm khóa | Dialog / sheet không đóng, nút về bình thường; `FormMessage` "Chưa thực hiện được. Kiểm tra kết nối rồi thử lại." (như 10 S-MOD-03 `error`) |
| App bị tắt khi đang sửa tên vai trò / tên server / tên kênh chưa lưu | Thay đổi mất, không lưu nháp (một luật với S-SET-06 › Edge case) |
| Bị tạm khóa khi đang ở trong phòng thoại | Bị ngắt khỏi phòng ngay (ROLE-05 AC4) như `disconnected-by-mod`, `Toast` "Bạn bị tạm khóa đến 21:12 nên đã rời phòng" (v1.9, CR-17 #1); phút đã học chốt như Stop của riêng mình |
| Bị mời ra / cấm khi đang mở Cài đặt server / kênh (v1.9, CR-17 #14, #17) | Mọi màn S-SET-* (và sheet / dialog) thuộc server đó đóng **ngay**, server biến khỏi rail, nền đổi theo 02 S-HOME-EDGE `kicked` / `banned` **rồi** mới hiện Dialog; request đang chờ của server bị hủy, lỗi trả về sau đó không hiện Toast |
| Kênh tin chào mừng bị xóa (v1.9, CR-17 #2) | Hàng "Kênh tin chào mừng" ở S-SET-01 `overview` thành "Không gửi" (`welcome-off`); không tự chọn kênh khác. Người vào server sau đó không tạo tin hệ thống |
| Xử lý báo cáo đúng lúc người quản lý khác vừa xử lý (v1.9, CR-18 #4) | Thao tác sau bị `40901` → chi tiết chuyển sang `handled-by-other` (không Toast lỗi); sheet / dialog đang mở từ `act-sheet` đóng |
| Tắt Task Board rồi bấm "Hoàn tác" (v1.9, CR-17 #11) | Công tắc bật lại (một lần lưu mới), việc ẩn hiện lại như cũ, dòng giải thích dưới công tắc biến mất. Hết 6 giây thì chỉ bật lại bằng công tắc |

## Ma trận trạng thái

| Màn | default | loading | empty | error | offline | forbidden | os-permission |
|---|---|---|---|---|---|---|---|
| S-SET-01 | ✔ `owner` | — `READY` | — | toast | ✔ | ✔ `moderator` (hàng ẩn) | — |
| S-SET-02 | ✔ `list` | — | — | ✔ `save-error` | ✔ | ✔ `hierarchy-blocked`, `role-readonly`, `permission-locked` | — |
| S-SET-03 | ✔ `list` | Skeleton hàng cuối khi tải trang | ✔ `search-empty` | ✔ `save-error` | ✔ | ✔ `member-blocked` | — |
| S-SET-04 | ✔ | C-14 | ✔ `invites-empty`, `bans-empty` | toast | ✔ | — (không quyền → hàng ẩn) | — |
| S-SET-05 | ✔ `pending` | C-14 | ✔ `empty` | ✔ `handled-by-other`, `message-gone` | ✔ | ✔ một phần: `act-sheet` không có "Xử lý" khi bị hierarchy chặn | — |
| S-SET-06 (P2) | ✔ `text` | — | — | toast; ✔ `name-taken`, `category-rename-taken`, `category-delete-blocked` | như voice | ✔ hierarchy ở `add-target` | — |
| S-SET-09 | ✔ `text` | — | — | ✔ `name-error`, `name-taken`, `limit` | FormMessage | — | — |
| S-SET-08 | ✔ `transfer-picker` | — | ✔ `transfer-alone` | ở S-MOD-03 | ở S-MOD-03 | — | — |
| S-SET-07 | ✔ `full-access` | ✔ | — | ✔ `save-error`, `cycle-invalid` | ✔ | — không quyền thì không vào được (v1.9: bỏ `study-rooms-only`) | — |
| S-SET-06 · voice | ✔ | — (dùng cache) | — | — | ✔ (như S-SET-07) | — | — |
| S-HOME-02 `channel-menu` | ✔ | — | — | — | — (menu mở được; hàng đích tự xử lý offline) | — | — |

## Câu hỏi còn mở

Không còn. Câu hỏi mở #2 của README (hàng "Quyền" ở S-SET-06 · voice) đóng ngày 21/10/2026: trỏ tới S-SET-06 `overwrites` (Q12).

## Câu hỏi chốt P2 (21/10/2026 — đồng ý cả 17 khuyến nghị)

| # | Quyết định | Ghi ở |
|---|---|---|
| Q1 | Role MVP không có màu và hoist; MemberRow hiện role cao nhất (sửa drawer 02: An "Trưởng nhóm", Chi "Điều phối phòng học") | CR-10 mục 1; S-SET-02 |
| Q2 | Chỉ hiện bit có giao diện MVP; 4 bit ẩn, giá trị giữ | CR-10 mục 2; S-SET-02 › Nhóm quyền |
| Q3 | Hồ sơ thành viên (02 S-HOME-10 `moderator-voice`) có "Tắt mic" · "Ngắt khỏi phòng" khi người đó đang ở phòng thoại (sửa 22/10/2026: bỏ "Tắt loa" — tự tắt loa và mod-deafen chuyển sang v1.x; "Tắt mic" là hàng hành động, đã tắt thì đọc "Bật lại mic" — không dùng công tắc, D12) | CR-10 mục 3; 02, 03 |
| Q4 | Công tắc lưu ngay; ô chữ có "Lưu" ở header | Quy ước khu vực |
| Q5 | Danh sách thành viên theo tên + tìm kiếm; `member-detail`; thao tác từ S-HOME-10 mở sheet / dialog ngay trên hồ sơ | S-SET-03 |
| Q6 | Timeout 6 mức, mặc định 1 giờ, có lý do, gỡ sớm được. **v1.9 (CR-17):** nhãn "Tạm khóa"; sheet ghi giờ hết; đổi thời hạn khi đang bị tạm khóa | CR-10 mục 5; CR-17 #1, #12; S-SET-03 |
| Q7 | Kick / ban: dialog + lý do ≤ 512; ban có xóa tin 0/1/7 ngày (mặc định Không xóa). Phía người bị xử lý theo 02 S-HOME-EDGE `kicked` / `banned` (sửa 22/10/2026) | S-SET-03 |
| Q8 | Danh sách lời mời cần `MANAGE_SERVER`. **v1.9 (CR-17 #7):** người tạo cũng tự thu hồi link của mình (ở 02 S-HOME-07); ⋯ của lời mời ghi người tạo có username | CR-10 mục 6; CR-17 #7, #13; S-SET-04 |
| Q9 | Danh sách cấm: sheet chi tiết + "Bỏ cấm" có dialog; ô tìm khi > 10 người | S-SET-04 |
| Q10 | Báo cáo: 2 tab, không push cho moderator, người bấm trước thắng. **v1.9 (CR-18):** một hàng mỗi đối tượng bị báo cáo; người quản lý có mục `reports_pending` (không push) mỗi đợt; badge trung tính — thay "số ở S-SET-01 là chỗ duy nhất báo có việc" | CR-10 mục 7; CR-18; S-SET-05 |
| Q11 | Tắt Task Board: giữ task, ẩn, dừng nhắc. **v1.9 (CR-17 #11):** không hỏi — Toast có "Hoàn tác" + dòng dưới công tắc (bỏ dialog) | CR-10 mục 8; CR-17 #11; S-SET-06 `taskboard-off` |
| Q12 | Quyền kênh 3 nấc; đồng bộ thì khóa; tắt đồng bộ chép quyền danh mục | CR-10 mục 9; S-SET-06; 00 › C-20 `tri-state` |
| Q13 | Nhấn giữ tiêu đề danh mục → menu 3 mục "Đổi tên danh mục" · "Quyền của danh mục" · "Xóa danh mục" (đổi 22/10/2026 khi duyệt: không có màn "Cài đặt danh mục" riêng) | S-SET-06; 02 S-HOME-02 `category-menu` |
| Q14 | Tạo kênh là sheet 3 loại + xem trước slug; "＋" cạnh tiêu đề danh mục. **v1.9:** kênh riêng tư lúc tạo (CR-17 #5), "Bật phòng học" cho kênh thoại (CR-22 #7), không trùng tên (CR-17 #3) | S-SET-09; 02 S-HOME-02 |
| Q15 | Tổng quan server: tên + ảnh; không mô tả; mục v1.x ẩn. **v1.9 (CR-17 #2):** thêm "Kênh tin chào mừng" (thay "không kênh tin hệ thống") | CR-10 mục 11; CR-17 #2; S-SET-01 |
| Q16 | Khôi phục server ở 02 S-HOME-06 `restore` | CR-10 mục 10; S-SET-08 |
| Q17 | Thứ tự mục S-SET-01; hàng thiếu quyền ẩn | S-SET-01 |
