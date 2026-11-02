# 00 · Component dùng chung

Đặc tả các component dùng lại trên nhiều màn hình. Mỗi màn hình trong các file spec khác chỉ **gọi tên** component ở đây (ví dụ `ChannelRow · study-room · focus-running`), không mô tả lại.

- **Nhìn thế nào** (màu, chữ, khoảng cách, bo góc, motion, mascot): [DESIGN.md](../../../DESIGN.md). Spec này chỉ trỏ tên token, không chép giá trị.
- **Hành vi**: SRS v1.9, trỏ theo REQ-ID. Các thay đổi của đợt CR-12 → CR-25 (30/10/2026) ghi "(v1.9, CR-xx)" ở chỗ sửa; nội dung đầy đủ từng CR ở `Docs/SRS_v1.2_change_notes.md` §17–30.
- **Tên token** viết như trong `DESIGN.md`: màu `surface-2`, chữ `label`, bo góc `rounded.button`, khoảng cách `space-3`. Trong Pencil là `$surface-2`, `$type-label`, `$radius-button`, `$space-3` (quy tắc ở mục *Variables trong Pencil* của `DESIGN.md`).

## Mục lục

| ID | Component | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|
| [C-01](#c-01--button) | `Button`, `IconButton` | P0 | ✅ ✅ ✅ |
| [C-02](#c-02--textfield-searchfield) | `TextField`, `SearchField` | P0 | ✅ ✅ ✅ |
| [C-03](#c-03--tabbar) | `TabBar` | P0 | ✅ ✅ ✅ |
| [C-04](#c-04--channelheader) | `ChannelHeader` | P0 | ✅ ✅ ✅ (v1.9: `dm`) |
| [C-05](#c-05--channelrow) | `ChannelRow` | P0 | ✅ ✅ ✅ (v1.9: bỏ `+silent`) |
| [C-06](#c-06--focustimer) | `FocusTimer` (vòng nhịp) | P0 | ✅ ✅ ✅ (v1.9: `other-session`, `paused · no-host`) |
| [C-07](#c-07--participanttile) | `ParticipantTile` (4 kích cỡ) | P0 | ✅ ✅ ✅ (v1.9: chỉ báo mic, `camera-off`, `floating`) |
| [C-08](#c-08--miniplayer) | `MiniPlayer` | P0 | ✅ ✅ ✅ (v1.9: `camera-on`, `paused`, `voice-solo`, `call` + Camera) |
| [C-09](#c-09--bottomsheet-actionsheet-dialog) | `BottomSheet`, `ActionSheet`, `Dialog` | P0 | ✅ ✅ ✅ (v1.9: đầu và nhóm của `ActionSheet`) |
| [C-13](#c-13--avatar-presencedot-badge) | `Avatar`, `PresenceDot`, `Badge` | P0 | ✅ ✅ ✅ (v1.9: `count · neutral`) |
| [C-14](#c-14--emptystate-skeleton-toast-banner) | `EmptyState`, `Skeleton`, `Toast`, `Banner` | P0 | ✅ ✅ ✅ (v1.9: Toast đảo màu) |
| [C-16](#c-16--phasebadge) | `PhaseBadge` 🆕 | P0 | ✅ ✅ ✅ (v1.9: `live · paused`) |
| [C-17](#c-17--roomcontrol) | `RoomControl` 🆕 | P0 | ✅ ✅ ✅ (v1.9: màn xem trước, "Tiếp tục" của Participant) |
| [C-18](#c-18--videogrid) | `VideoGrid` 🆕 | P0 | ✅ ✅ ✅ |
| [C-20](#c-20--segmentedcontrol) | `SegmentedControl` 🆕 | P0 | ✅ ✅ ✅ |
| [C-21](#c-21--chipstatus) | `ChipStatus` 🆕 | P0 | ✅ ✅ ✅ (v1.9: nhãn quan hệ) |
| [C-15](#c-15--settingsrow-đưa-lên-p1-17102026) | `SettingsRow` (biến thể `value`, `nav`) | P1 | ✅ ✅ ✅ |
| [C-22](#c-22--screenheader-17102026) | `ScreenHeader` 🆕 | P1 | ✅ ✅ ✅ |
| [C-23](#c-23--checkbox-17102026) | `Checkbox` 🆕 | P1 | ✅ ✅ ✅ (v1.9: `checked-locked`) |
| [C-24](#c-24--codeinput-17102026) | `CodeInput` 🆕 | P1 | ✅ ✅ ✅ |
| [C-10](#c-10--messagebubble-18102026-area-02) | `MessageBubble` (hàng phẳng, không bong bóng) | P1 | ✅ ✅ ✅ (v1.9: giờ, gộp nhóm, `highlight`, chip, thẻ, tin hệ thống) |
| [C-11](#c-11--composer-18102026-area-02) | `Composer` | P1 | ✅ ✅ ✅ (v1.9: bộ đếm, dòng lỗi khay, chữ tạm khóa) |
| [C-12](#c-12--taskrow-18102026-area-02) | `TaskRow` | P1 | ✅ ✅ ✅ (v1.9: hạn, hàng Xong, nhấn giữ) |
| [C-25](#c-25--emojipicker-18102026-area-02) | `EmojiPicker` 🆕 | P1 | ✅ ✅ ✅ (phần vẽ thêm duyệt 23/10/2026) |
| [C-26](#c-26--serverrail-18102026-area-02) | `ServerRail` 🆕 | P1 | ✅ ✅ ✅ |
| [C-27](#c-27--mentionsuggest-18102026-area-02) | `MentionSuggest` 🆕 | P1 | ✅ ✅ ✅ (v1.9: nhóm VAI TRÒ) |
| [C-28](#c-28--memberrow-18102026-area-02) | `MemberRow` 🆕 | P1 | ✅ ✅ ✅ (v1.9: username, dòng hoạt động) |
| [C-29](#c-29--attachmenttray-18102026-area-02) | `AttachmentTray` 🆕 | P2 | ✅ ✅ ✅ (v1.9: ô 64 × 160, `checking`, `rejected`) |
| [C-30](#c-30--filterchip-19102026-area-05) | `FilterChip` 🆕 | P1 | ✅ ✅ ✅ |
| [C-31](#c-31--notificationrow-20102026-area-06) | `NotificationRow` 🆕 | P1 | ✅ ✅ ✅ (v1.9: 4 loại mới, chữ hạn) |
| [C-32](#c-32--dmrow-c-33--friendrow-20102026-area-09) | `DMRow` 🆕 | P1 | ✅ ✅ ✅ (v1.9: dòng 2) |
| [C-33](#c-32--dmrow-c-33--friendrow-20102026-area-09) | `FriendRow` 🆕 | P1 | ✅ ✅ ✅ (v1.9: cấu tạo mới) |
| [C-34](#c-34--radiorow-21102026-area-10) | `RadioRow` 🆕 (+ `Switch`, `TriState`, `MemberRow/username` trên cùng bảng) | P2 | ✅ ✅ ✅ (phần vẽ thêm duyệt 23/10/2026) |
| [C-35](#c-35--inviteembed-v19-cr-19) | `InviteEmbed` 🆕 (v1.9, CR-19) | P1 | ✅ ✅ ✅ |
| [C-36](#c-36--mediaviewer-v19-cr-19) | `MediaViewer` 🆕 (v1.9, CR-19) | P2 | ✅ ✅ ✅ |
| [C-37](#c-37--todayprogress-v19-cr-23) | `TodayProgress` 🆕 (v1.9, CR-23) | P1 | ✅ ✅ ✅ |
| [C-38](#c-38--monthcalendar-v19-cr-23) | `MonthCalendar` 🆕 (v1.9, CR-23) | P2 | ✅ ✅ ✅ |
| [C-39](#c-39--sessionrow-v19-cr-23) | `SessionRow` 🆕 (v1.9, CR-23) | P2 | ✅ ✅ ✅ |
| [C-40](#c-40--activityline-v19-cr-24-cr-25) | `ActivityLine` 🆕 (v1.9, CR-24, CR-25) | P1 | ✅ ✅ ✅ |
| [C-41](#c-41--logo-icon-app--splash-cr-26-01112026) | Logo, icon app & splash 🆕 (CR-26) | P1 | ✅ ✅ ✅ |
| [C-42](#c-42--adminsidebar) | `AdminSidebar` 🆕 (web quản trị, CR-27) | P0 | ✅ ✅ ✅ |
| [C-43](#c-43--datatable) | `DataTable` 🆕 (web quản trị) | P0 | ✅ ✅ ✅ |
| [C-44](#c-44--pagination) | `Pagination` 🆕 (web quản trị) | P0 | ✅ ✅ ✅ |
| [C-45](#c-45--filterbar) | `FilterBar` 🆕 (web quản trị) | P0 | ✅ ✅ ✅ |
| [C-46](#c-46--pageheader-casepager) | `PageHeader`, `CasePager` 🆕 (web quản trị) | P0 | ✅ ✅ ✅ |
| [C-47](#c-47--keyvaluestrip) | `KeyValueStrip` 🆕 (web quản trị) | P0 | ✅ ✅ ✅ |
| [C-48](#c-48--evidenceframe) | `EvidenceFrame` 🆕 (web quản trị) | P0 | ✅ ✅ ✅ |
| [C-49](#c-49--subjectcard) | `SubjectCard` 🆕 (web quản trị) | P0 | ✅ ✅ ✅ |
| [C-50](#c-50--decisionpanel) | `DecisionPanel` 🆕 (web quản trị) | P0 | ✅ ✅ ✅ |
| [C-53](#c-53--admindialog-w1-01112026) | `AdminDialog` 🆕 (web quản trị, W1) | P0 | ✅ ✅ ✅ |
| [C-56](#c-56--historypopover-w1-01112026) | `HistoryPopover` 🆕 (web quản trị, W1) | P0 | ✅ ✅ ✅ |
| [C-51](#c-51--statstrip-w3-02112026) | `StatStrip` 🆕 (web quản trị, W3) | P0 | ✅ ✅ ✅ |
| [C-52](#c-52--biểu-đồ-và-kpitable-w3-02112026) | Biểu đồ, `KpiTable` 🆕 (web quản trị, W3) | P0 | ✅ ✅ ✅ |
| [C-55](#web-quản-trị--component-p1-đặc-tả-khi-tới-area) | `NarrowBlock` — **bỏ** (W4, 02/11/2026) | — | — |
| [C-54](#web-quản-trị--component-p1-đặc-tả-khi-tới-area) | Toast web — **bỏ** (W4, 02/11/2026) | — | — |
| [C-19](#component-p1p3--đặc-tả-sau) | `StageView` | P3 | ☐ ☐ ☐ |

**Đợt v1.9 (30/10/2026):** ◐ ở cột Vẽ = bảng component cần vẽ thêm / sửa phần ghi trong ngoặc (danh sách việc vẽ theo từng component ở worklist canvas của đợt này); phần cũ của bảng vẫn đúng.

## Quy ước chung

| Hạng mục | Quy ước |
|---|---|
| Vùng chạm | Mọi phần tử bấm được ≥ 48 × 48. Phần nhìn thấy nhỏ hơn (nút 44, icon 24) thì mở rộng vùng chạm (`hitSlop`), không phóng to hình. |
| Trạng thái tương tác | Mỗi component bấm được có: `default`, `pressed`, `disabled`; nếu gọi mạng thì thêm `loading`. `focused` (bàn phím ngoài, Switch Access) dùng viền 2 màu `primary` cách 2. |
| Chữ dài | Ghi rõ ở từng component: xuống dòng hay cắt `…`, ở cỡ chữ thường và 200%. |
| Theme | Chỉ dùng token. Không component nào có giá trị riêng cho từng theme. |
| Accessibility | Mỗi component có `accessibilityRole` và `accessibilityLabel` bằng tiếng Việt; trạng thái (đã chọn, tắt tiếng, đang tải) đọc qua `accessibilityState`/`accessibilityValue`. |
| Màu pha & màu ngữ nghĩa | Theo 3 quy tắc cứng ở `DESIGN.md` › Colors: màu pha chỉ trong thành phần của phiên học; màu ngữ nghĩa không vào Study Room; `warning` chỉ là icon + chữ. |
| Dữ liệu mẫu | Theo [README](README.md#bộ-dữ-liệu-mẫu-dùng-chung-mọi-màn-hình): An, Bình, Chi, Dũng; "Ôn thi Giải tích 2"… |

### Dựng trong Pencil (`Des/nezfocus.pen`)

- Component đặt ở hàng trên cùng của canvas, phía trên các màn hình; mỗi component một frame bảng `C-XX · Tên`.
- Mỗi **biến thể** là một component reusable: `C-05 ChannelRow / study-room`. Mỗi **state** là một instance có override, xếp trong bảng state của component đó.
- Dựng bảng state ở theme tối, rồi sao chép cả bảng và đặt theme sáng — không vẽ lại.
- Đặt tên node con duy nhất trong component (`Badge count`, không chỉ `Count`) để sửa hàng loạt không đụng nhầm.
- Mọi giá trị lấy từ variables; không mã hex, không cỡ chữ lạc.
- pen.dev không có thuộc tính cắt chữ `…`: frame ví dụ "tên dài" ghi sẵn chuỗi đã cắt; code dùng `numberOfLines={1}`.
- Mascot dùng ảnh đã tách nền trong `Des/assets/runtime-<mood>.webp` (ảnh gốc trong `Des/nez-mascot/build/moods/` có nền đặc). App thật dùng file Rive.
- Ảnh trong ô video là ảnh stock (Unsplash) chân dung một người, chỉ để minh họa.

**Board web quản trị (01/11/2026):** hàng y = 4600, x ≥ 66000 — C-42…C-50 và `C-01 · C-23 · trạng thái web`, mỗi board bản sáng (theme dẫn dắt của web) và bản tối ngay dưới.

**Trạng thái vẽ (16/10/2026):** 15 bảng component P0 ở theme tối (hàng trên, bên phải `00 · Tokens`) và bản sao theme sáng ngay bên dưới mỗi bảng. Chủ dự án duyệt 16/10/2026.

**Cập nhật bảng (22/10/2026, theo rà soát D8):** sửa chữ/luật cũ (C-06, C-07, C-14, C-16, C-18, C-20); vẽ thêm biến thể màn đã dùng (MiniPlayer `call`, nút cuộc gọi của RoomControl, NotificationRow `owner_transferred` / `moderation`, TriState đủ 3 nấc, SegmentedControl 4 mục, master `EmojiPicker`, master `Dialog` + `BottomSheet`); bổ sung bảng sáng còn thiếu (C-04, C-15, C-34, Chat). Bảng sáng của Chat nằm **bên phải** bảng C-34 (x 26063, y 0), không nằm dưới bảng tối: dưới bảng tối không đủ chỗ trước hàng màn hình (y 5240). State chỉ có trong checklist mà không vẽ trên bảng thì ghi **"xem ở màn …"** ở từng component.

---

## C-01 · Button

**Mục đích:** hành động bấm được. **REQ:** NFR-A11Y-04, NFR-USAB-02. **Dùng ở:** mọi nơi.

### Biến thể

| Biến thể | Khi nào | Hình |
|---|---|---|
| `primary` | Hành động chính, **tối đa một** trên mỗi màn hình | Nền `primary`, chữ `on-primary` |
| `secondary` | Hành động phụ đứng cạnh primary, hoặc hành động trên hàng (ví dụ "Vào") | Viền `border-input` 1, chữ `primary`, nền trong suốt |
| `text` | Hành động nhẹ trong dialog, "Xem tất cả" | Chỉ chữ `primary`, không viền |
| `danger` | Thao tác phá hủy đã qua xác nhận ("Dừng phiên", "Xóa") | Nền `danger`, chữ `bg` |
| `IconButton` | Header, mini-player, thanh công cụ | Icon 22–24 `text-secondary` trong vùng 48 × 48, không nền |

**Kích cỡ:** `L` cao 48 (CTA cuối form, onboarding) · `M` cao 44 (mặc định) · `S` cao 40 (nút trên hàng danh sách). Đệm ngang `space-3`. Có thể kèm icon trái 16–20, cách chữ `space-1`.

### Trạng thái

| State | Khác gì so với default |
|---|---|
| `pressed` | Nền tối đi 8% (`primary`, `danger`); `secondary`/`text`/`IconButton`: nền `surface-2` |
| `disabled` | Nền `surface-3`, chữ `text-tertiary`; `secondary` viền `border`. Không đổi kích thước. Nếu lý do không hiển nhiên, có dòng giải thích cạnh nút (SRS 3.5) |
| `loading` | Giữ nguyên chiều rộng; chữ thay bằng vòng xoay nhỏ màu chữ của biến thể; không bấm lại được |
| `focused` | Viền 2 `primary` cách 2 |

### Nội dung & chữ dài

Nhãn là động từ cụ thể, tối đa 2 dòng ở 200%: "Bắt đầu", "Vào", "Học tiếp", "Dừng phiên", "Thử lại". Không viết "OK"/"Xác nhận" trừ khi ngữ cảnh đã nói rõ hành động.

### Checklist duyệt
- [ ] Đủ 5 biến thể × 4 state, cả hai theme.
- [ ] Nhãn dài nhất ("Tạo Study Server") vừa ở 360 × 800; ở 200% xuống 2 dòng, nút cao lên, không cắt chữ.
- [ ] `IconButton` có vùng chạm 48 dù icon 22.

**Xem ở màn (22/10/2026, không vẽ lại trên bảng):** `IconButton` `pressed` / `disabled` chưa có frame riêng (luật ở bảng trạng thái đủ để code). `focused` chỉ xuất hiện khi dùng bàn phím ngoài / Switch Access — không vẽ frame, code theo luật "viền 2 `primary` cách 2".

---

## C-02 · TextField, SearchField

**Mục đích:** nhập chữ. **REQ:** AUTH-01/02, SRV-01, STUDY-06, NFR-USAB-03, NFR-I18N-03. **Dùng ở:** đăng ký, đăng nhập, tạo server/task, tìm kiếm.

### Cấu tạo
```
Nhãn                                  12/200     ← label · bộ đếm (tùy chọn)
┌──────────────────────────────────────────┐
│ [icon]  Nội dung / placeholder      [⊗]  │     ← cao 48, rounded.input
└──────────────────────────────────────────┘
ⓘ Dòng hướng dẫn hoặc lỗi                         ← label, xuống dòng tự do
```

### Biến thể
- `TextField`: nhãn luôn nằm **trên** ô (không làm nhãn nổi trong ô — nhãn nổi dễ cắt dấu tiếng Việt). Kiểu con: `password` (nút hiện/ẩn mật khẩu: mặc định ẩn `eye`; đang hiện thì chữ thật + icon `eye-off`), `multiline` (mô tả task, cao tối đa 5 dòng rồi cuộn).
- `SearchField`: không nhãn; icon `search` trái, nút xóa `x` phải khi có chữ; nền `surface-2`, không viền. Tìm không phân biệt dấu (NFR-I18N-03) — placeholder ghi rõ: "Tìm thành viên, kênh…".

### Trạng thái

| State | Khác gì so với default (viền `border-input` 1, nền `surface-1`) |
|---|---|
| `focused` | Viền 2 `primary` |
| `filled` | Như default, chữ `text-primary` |
| `error` | Viền 2 `danger`; dòng dưới: icon `octagon-x` + thông điệp theo mã lỗi (SRS 11.1), màu `danger` |
| `disabled` | Nền `surface-2`, chữ `text-tertiary`, kèm lý do nếu không hiển nhiên |
| `readonly` | Không viền, nền `surface-2` |

### Lỗi trong form (chốt 17/10/2026)
- **Lỗi của một ô** nằm ngay dưới ô đó (state `error`).
- **Lỗi không thuộc ô nào** (sai mật khẩu, trùng, giới hạn tần suất, lỗi lưu) nằm trong **khối lỗi** (master `FormMessage`) ngay trên nút chính: icon `octagon-x` + chữ `label` màu `danger`, xuống dòng tự do. Không dùng toast cho lỗi form — toast tự biến mất trước khi user đọc xong. Thông báo không phải lỗi (giới hạn, chưa xác nhận, offline) dùng biến thể trung tính: icon `info`, chữ `text-secondary`.
- **Điều kiện mật khẩu** (master `PasswordRules`, chốt 17/10/2026): ngay dưới ô mật khẩu khi tạo hoặc đặt lại mật khẩu, luôn hiện (không chờ focus). Lưới 2 cột: "Ít nhất 8 ký tự" · "Chữ hoa (A–Z)" · "Chữ thường (a–z)" · "Chữ số (0–9)" · "Ký tự đặc biệt (!@#…)". Mỗi điều kiện 3 trạng thái: chưa đạt (icon `circle`, chữ `text-tertiary`), đạt (icon `circle-check` màu `success`, chữ `text-secondary`), lỗi khi bấm gửi mà chưa đạt (icon `circle-x` + chữ màu `danger`). Phân biệt bằng icon, không chỉ bằng màu. Ở cỡ chữ 200% lưới chuyển thành 1 cột. Mật khẩu **chính là** email, phần trước @ của email hay username (v1.9, CR-16 #6; chỉ cấm *là*, không cấm *chứa*): báo bằng state `error` dưới ô mật khẩu, **không** thêm điều kiện vào lưới (chữ ở 01).
- Lỗi trùng (`40901`) không bao giờ nói email "đã được dùng" (AUTH-01 AC2): ghi "Email này không khả dụng".
- Nút chính của form **luôn bấm được**; kiểm tra khi bấm và hiện lỗi dưới từng ô sai. Nút mờ không cho biết còn thiếu gì.
- **Ngắt dòng** (22/10/2026): email dài chỉ ngắt **sau `@` hoặc `.`**, không ngắt giữa chữ ("an.nguyen.ptit2026@" / "gmail.com", không phải "…gmail.co" / "m"). Số + đơn vị và cụm tên đi liền nhau, không tách dòng: "14 ngày", "24 giờ", "GMT+9 · Tokyo", tên thiết bị "Xiaomi Redmi Note 12"; URL mời không ngắt trước mã. Code: khoảng trắng không ngắt (U+00A0) trong các cụm này; frame ghi sẵn chỗ ngắt đúng.
- Bàn phím: email → bàn phím email; username → tắt tự viết hoa và tự sửa; mật khẩu → ô ẩn có nút hiện/ẩn (mặc định ẩn). Phím Return "Tiếp" chuyển ô, ô cuối "Xong" gửi form. Bàn phím mở thì form cuộn để ô đang nhập luôn nằm trên bàn phím (NFR-MOB-14); nếu còn chỗ thì nút chính cũng nằm trên bàn phím, form dài thì nút chính cuộn tới được. **Khi bàn phím mở** (chốt 19/10/2026): vùng nội dung chỉ thu lại phía trên bàn phím — không giấu ô nào, form cuộn được, ô đang nhập luôn nhìn thấy; nút chính của form nằm ngay trên bàn phím (khoảng trống, nếu có, ở giữa form và nút, không ở giữa nút và bàn phím).

### Checklist duyệt
- [ ] Placeholder và chữ nhập dùng chữ thật: "an.nguyen@gmail.com", "Nộp báo cáo giữa kỳ".
- [ ] Lỗi đọc được không cần màu (icon + chữ).
- [ ] Chữ có dấu chồng ("Ẩ", "Ữ") không bị cắt trong ô cao 48 ở mọi độ đậm.

---

## C-03 · TabBar

**Mục đích:** chuyển 5 khu vực chính. **REQ:** SRS 3.1, NOTIF-01. **Dùng ở:** mọi màn hình cấp 1.

### Cấu tạo
```
──────────────────────────────────────────────────────── ← kẻ trên border
  [house]     [timer]   [list-checks]³  [bell]¹²   [circle-user]
   Home        Học        Việc        Thông báo     Cá nhân
──────────────────────────────────────────────────────── cao 56 + safe area, nền surface-1
```

- Phẳng, nền `surface-1`, không capsule kính mờ, không nổi (DESIGN.md › Components).
- Tab đang chọn: icon + nhãn `primary`, nhãn đậm 600. Tab khác: `text-tertiary`.
- Nhãn chữ `tab` (11) — ngoại lệ duy nhất của cỡ tối thiểu; ở cỡ chữ lớn nhãn **không** phóng, nhấn giữ hiện tooltip có nhãn đầy đủ.

### Badge

| Tab | Badge | Nguồn |
|---|---|---|
| Home | Số mention + DM chưa đọc | Giống badge icon app (NOTIF-01) |
| Học | Chấm (không số) khi user đang trong một Focus Session | SRS 3.1 (chốt 16/10/2026) |
| Việc | Số task **quá hạn + hạn hôm nay** | SRS 3.1 (chốt 16/10/2026) |
| Thông báo | Số thông báo chưa đọc | SRS 3.1 |
| Cá nhân | Không | — |

### Trạng thái
`default` · `badge-count` (1–99, "99+") · `badge-dot` · `pressed` (icon co 0.96, không đổi màu).

### Back hệ thống (v1.9, CR-15)
Thứ tự xử lý nút / cử chỉ Back theo DESIGN.md › Platform & Touch. Phần của `TabBar`: ở **gốc** của một tab khác Home, Back về tab Home (tab cũ giữ nguyên trạng thái, chọn lại thì về đúng chỗ cũ); ở gốc của Home (kênh đang mở, drawer đóng), Back đưa app ra nền — **không** mở drawer. Không có nút ← → riêng trong app (rail, header). Không đổi frame.

### Checklist duyệt
- [ ] Mỗi tab làm tab đang chọn một lần (5 frame), cả hai theme.
- [ ] Badge "99+" không đè lên icon tab bên cạnh ở khung 360.

---

## C-04 · ChannelHeader

**Mục đích:** cho biết đang ở đâu; mở drawer, tìm kiếm. **REQ:** SRS 3.1. **Dùng ở:** S-HOME-01, S-ROOM-01/02, S-DM-02.

### Cấu tạo
```
[≡]  [icon kênh] Tên kênh                          [ô phải] [👥]
     dòng phụ (tùy chọn): server · trạng thái
```
Cao 56 (một dòng) hoặc 64 (có dòng phụ). `IconButton` 48 hai bên.

**Ô phải** (chốt 18/10/2026, area 02) — một chỗ, mỗi biến thể dùng một kiểu: kênh text **để trống ở MVP** (🔍 tìm kiếm tin nhắn là v1.x, REQ-SEARCH-01; không hiện nút vô hiệu); phòng voice / Study Room là **nút chat** `message-square` + `Badge` (số tin chưa đọc, `danger` khi có mention) mở S-HOME-08 (DEC-35). Từ v1.x, 🔍 vào ô phải của kênh text và của `room-chat` — không thêm vào header phòng.

| Biến thể | Icon kênh | Dòng phụ |
|---|---|---|
| `text` | `hash` | Tên server ("Ôn thi Giải tích 2", cắt `…`) — kênh không có mô tả từ v1.2 |
| `voice` | `volume-2` | "4 người trong phòng" |
| `study-room` | `lamp-desk` | — (pha hiển thị ở thân màn hình, không lặp ở header) |
| `room-chat` 🆕 | `‹` back thay `≡`; icon `lamp-desk` / `volume-2` | "Chat của phòng" |
| `dm` | `Avatar` 24 + `PresenceDot` | "Trực tuyến" / "Vắng mặt" / "Không làm phiền" (ngoại tuyến: không dòng phụ — 09) / "Tài khoản đã bị xóa"; người kia đang học và mình được thấy: `ActivityLine · full` (C-40) thay trạng thái (v1.9, CR-24 #1, CR-25 #14) |

**`dm` dòng tên (v1.9, CR-25 #14):** tên + username `label` `text-tertiary` cùng một dòng ("Bình  binh.tran"); thiếu chỗ thì cắt username `…` trước, rồi tới tên. Group DM không có username. Chạm tên / avatar → hồ sơ S-HOME-10 ngữ cảnh ngoài server (02).

**Chữ dài:** tên kênh cắt `…` ở 1 dòng; ở 200% vẫn 1 dòng, cắt `…`; tên đầy đủ đọc qua `accessibilityLabel`. `dm` ở 200% (như C-28, C-33): username xuống dòng riêng, một dòng cắt `…`; header cao theo chữ; dòng phụ một dòng theo luật cắt của C-40.

### Checklist duyệt
- [ ] 4 biến thể; tên dài nhất mẫu "Phòng thảo luận nhóm đồ án Mobile" cắt đúng ở 360.
- [ ] `dm` (v1.9): tên + username; dòng phụ trạng thái và dòng phụ hoạt động ("Tập trung · còn 18 phút · Phòng học im lặng"); tên dài cắt username trước.

---

## C-05 · ChannelRow

**Mục đích:** một kênh trong danh sách kênh của drawer trái. **REQ:** SRV-02, NOTIF-01, STUDY-01/02/11, VC-01. **Dùng ở:** S-HOME-02.

### Cấu tạo
```
  [icon]  ten-kenh                               [@3]     ← cao 40 (vùng chạm 48), đệm trái space-3
  [lamp]  Phòng học im lặng                               ← Study Room
          [lamp] Tập trung · còn 12 phút   (B)(C)(D) +5   ← dòng phụ khi có Room Session
```

### Biến thể

| Biến thể | Icon | Ghi chú |
|---|---|---|
| `text` | `hash` | |
| `voice` | `volume-2` | Kênh voice thường (`focus_control = off`) |
| `study-room` | `lamp-desk` | Study Room (REQ-STUDY-11) — biểu tượng riêng theo README › Thuật ngữ |

**Bỏ `+silent` (v1.9, CR-13 #1):** không còn Silent Room, không còn nhãn "Im lặng" trên hàng kênh. "Phòng học im lặng" chỉ là **tên kênh** trong mẫu Study Server, hiện như mọi tên khác.

### Trạng thái

| State | Khác gì so với default (tên `text-secondary`, đậm 500) |
|---|---|
| `selected` | Nền `surface-2`, tên `text-primary` |
| `unread` | Tên `text-primary` đậm 600 + chấm 8 `text-primary` ở mép trái |
| `mention` | Như `unread` + `Badge` số màu `danger` bên phải |
| `focus-running` | Dòng phụ: `PhaseBadge · S · list` ("Tập trung · còn 12 phút") + tối đa 3 `Avatar` 20 chồng nhau + "+N". Bạn bè xếp trước |
| `voice-occupied` | Kênh voice thường có người: dòng phụ là tối đa 3 avatar + "+N" |
| `connected` | User đang ở kênh voice này: icon và tên `primary` |
| `no-connect` | Thiếu quyền `CONNECT`: icon `lock` nhỏ, tên `text-tertiary`; chạm → toast lý do (SRS 3.5) |
| `pressed` | Nền `surface-2` |

**Chữ dài:** tên cắt `…` 1 dòng; dòng phụ ẩn phần avatar trước khi cắt chữ pha. Ở drawer khung 390 nhãn pha đã rộng ~170 nên `focus-running` **chỉ hiện nhãn pha, không avatar** (áp lại luật này cho mọi frame ngày 22/10/2026 — trước đó avatar và "+N" bị cắt ở mép drawer); `voice-occupied` vẫn hiện tối đa 3 avatar + "+N". Ở chữ 200% (chốt 19/10/2026): hàng cao theo chữ.

### Checklist duyệt
- [ ] Đủ: text/voice/study-room × default/selected/unread/mention; study-room × focus-running; voice × occupied; connected; no-connect. Không còn ô nào có nhãn "Im lặng" (v1.9, CR-13).
- [ ] Dòng `focus-running` đọc được pha không cần màu (icon + nhãn).
- [ ] Thời gian dùng `numeric-inline` (Unbounded, chữ số đều), kiểu `list` ("còn N phút").

**Xem ở màn (22/10/2026):** `voice` / `study-room` × `selected` / `unread` / `mention` không vẽ thêm trên bảng — xem S-HOME-02 `default`, `unread-mention`, `focus-running` (và bản `· light`).

---

## C-06 · FocusTimer

**Mục đích:** đồng hồ chung của Focus Session — nhân vật chính của Study Room và Solo Session. **REQ:** STUDY-01/10/11/15, SRS 4.9.1. **Dùng ở:** S-ROOM-02, S-STUDY-02.

### Cấu tạo (`ring`, cỡ 280 — DESIGN.md › Components › rhythm-ring)
```
              ╭───────────╮
          ╭───╯ (A)  (B)  ╰───╮        ← ParticipantTile · ring, tối đa 12 (chỉ Room Session)
        (M)    [lamp] Tập trung  (C)
        │          18:42          │    ← timer (Unbounded 60, chữ số đều)
        (L)  Vòng 2 · nghỉ lúc 22:06 (D)
          ╰───╮  (K)  (H)   ╭───╯
              ╰───────────╯
```
- Vòng: track `border`, tiến độ theo màu pha, dày 7% đường kính. Kiểu nét theo pha: `focus` nét đặc, **vơi dần**; `short_break` nét gạch, **đầy dần**; `long_break` vòng đôi, **đầy dần** (DESIGN.md › Colors).
- **Chiều quay** (chốt 17/10/2026): cung luôn neo ở **12 giờ**, mép cung chạy **theo chiều kim đồng hồ** như kim giây ở mọi pha. Tập trung: phần màu là thời gian còn lại, mép cung ăn dần theo chiều kim đồng hồ, hết pha thì về 12 giờ. Nghỉ: phần màu mọc từ 12 giờ theo chiều kim đồng hồ, hết pha thì kín vòng. Cùng chiều với thứ tự ghế.
- Trong vòng, từ trên xuống: `PhaseBadge · M` → số `timer` → dòng chu kỳ (`label`, `text-secondary`).
- Pause, chờ, mất kết nối **không phải pha**: giữ màu và kiểu nét của pha hiện tại, đổi nhãn và dòng chu kỳ như bảng dưới.

### Biến thể
- `ring` (280): Study Room ở chế độ **Vòng**, Solo Session.
- `compact` (thanh trên cùng): **bỏ vòng**, một hàng `PhaseBadge · M` + số `stat` (Unbounded 32, chữ số đều), dòng dưới "Vòng 2 · 9 người" (`label`). Dùng ở chế độ **Lưới** của Study Room.
- **Cỡ chữ ≥ 200%** (chốt 16/10/2026): **giữ vòng** và ghế quanh vòng; trong vòng chỉ còn số (không phóng); nhãn pha và dòng chu kỳ chuyển xuống **dưới vòng**, phóng to và xuống dòng tự do. Không chuyển sang danh sách.

### Chế độ xem Vòng / Lưới (chốt 16/10/2026, thay "Vòng / Camera")
Trong phiên học, dưới chip luôn có `SegmentedControl` **"Vòng / Lưới"**. Khi có ≥ 1 người bật camera (kể cả mình), mục Lưới thêm icon `video` + số: "Lưới · 📹3".
- **Mỗi người tự chọn**; người khác bật/tắt camera **không** đổi chế độ của mình.
- Chế độ **Vòng**: `FocusTimer · ring` + ghế. Chế độ **Lưới**: `FocusTimer · compact` + `VideoGrid · study-room` (**mọi người**, người tắt camera là ô avatar, thứ tự theo luật ưu tiên ghế bên dưới). Lưới cho thấy **tên** từng người — vòng chỉ có chữ cái đầu.
- Mặc định Vòng; app nhớ lựa chọn gần nhất trên máy. Bấm Bắt đầu khi đang xem lưới của phòng → chuyển sang chế độ đã nhớ (lần đầu: Vòng). Phiên học kết thúc → phòng trở lại lưới (S-ROOM-01).
- Không còn luật "camera cuối cùng tắt thì về Vòng".

### Dòng chu kỳ

"Vòng {n} · {pha kế tiếp} lúc {HH:MM}" — `n` đếm số pha Tập trung từ đầu phiên. **Không có tổng số vòng**: phiên học chạy tới khi Dừng (hoặc phòng trống 5 phút, SRS 4.9.1). Khi bật nghỉ dài, pha kế tiếp ghi đúng tên ("nghỉ dài lúc 23:40"), không ghi "2/4".

### Xếp ghế trên vòng (chốt 16/10/2026, chỉ Room Session)

- **≤ 12 người:** chia đều quanh vòng (3 người cách 120°, 9 người cách 40°…). Bạn luôn ở vị trí 12 giờ, những người khác theo chiều kim đồng hồ.
- **≥ 13 người:** 11 ghế + chip `PT/ring-more` "+N" ở ghế cuối. Chạm "+N" → danh sách `ParticipantTile · list` (drawer phải, tab Thành viên).
- **Thứ tự ưu tiên** — bạn → Host → bạn bè → người đang bật camera hoặc mic → còn lại theo thứ tự vào phòng — chỉ dùng ở **hai lúc**:
  1. **Lúc mở màn hình phòng** (vừa vào, hoặc mở lại từ mini-player): xếp một lần những người đang có mặt.
  2. **Khi phòng kín 12 ghế và một ghế trống ra:** người ưu tiên cao nhất trong "+N" lên ghế đó.
- **Ngoài hai lúc đó, người vào sau nối vào cuối** (theo chiều kim đồng hồ), bất kể ưu tiên; thứ tự người đã ngồi không bao giờ bị đảo. Ví dụ: đang có bạn, Host, một người lạ bật mic; bạn của bạn vào → thành bạn, Host, người lạ, bạn của bạn (4 ghế cách 90°). Phòng đã kín thì người mới vào nằm trong "+N", không ai bị đẩy khỏi ghế.
- Thứ tự được tính **trên máy từng người** ("bạn" và "bạn bè" khác nhau với mỗi người), nên hai người cùng phòng có thể thấy thứ tự khác nhau.
- **Người vào/ra:** các ghế trượt tới vị trí chia đều mới trong 320ms (`medium`); Giảm chuyển động → đổi chỗ tức thì.
- Dòng dưới vòng luôn ghi tổng số: "32 người đang Tập trung cùng bạn".
- Cỡ chữ ≥ 200%: giữ vòng và ghế; chữ trong vòng chuyển ra dưới vòng (xem Biến thể).

### Trạng thái

| State | Nhãn trong vòng | Số | Dòng chu kỳ | Ghi chú |
|---|---|---|---|---|
| `focus` | [lamp-desk] Tập trung | còn lại | "Vòng 2 · nghỉ ngắn lúc 22:06" | |
| `short-break` | [coffee] Nghỉ ngắn | còn lại | "Tập trung lại lúc 22:11" | Có thể có Runtime sleepy 64–72 ở giữa (DESIGN.md › Mascot) |
| `long-break` | [moon] Nghỉ dài | còn lại | "Tập trung lại lúc 22:30" | Runtime happy |
| `paused` | [pause] Tạm dừng · Tập trung | đứng yên | "Bình đã tạm dừng" (tên người thao tác, STUDY-11) | Vòng giữ nguyên vị trí, không chạy |
| `paused · no-host` (v1.9, CR-22 #13) | như `paused` | đứng yên | "Bấm Tiếp tục để chạy lại" | Phiên không có Host đang tạm dừng: ai trong phòng cũng Tiếp tục được (nút ở C-17). Có Host mà đang tạm dừng: Participant chỉ thấy dòng phụ "Đồng hồ đứng yên, không tính phút" (như cũ) |
| `other-session` (v1.9, CR-22 #5) | như pha của phòng đang xem | "còn 18 phút" (`title-1`, cập nhật mỗi phút; < 1 phút "còn dưới 1 phút"; phòng tạm dừng: số đứng yên như cũ) | như pha hiện tại | Vòng của **phòng khác** khi mình đang có phiên ở chỗ khác (Room Session phòng khác, Học một mình): màn xem trước phòng có phiên (S-ROOM-02 `not-joined-other-session`), nền S-ROOM-06. Không đếm giây vì `MiniPlayer` của mình cùng màn đã đếm giây. Không có phiên nào của mình → vòng đếm giây như cũ |
| `waiting` (Solo) | [coffee] Hết giờ nghỉ | đếm ngược 10:00 tới lúc hết hạn | "Bấm Học tiếp để bắt đầu vòng mới" | STUDY-10. Hành động "Học tiếp" là `Button · primary` dưới vòng |
| `pending-config` | như pha hiện tại | | thêm dòng "Từ vòng sau: 50/10" | STUDY-11, sửa chu kỳ áp dụng từ pha sau |
| `syncing` | như pha hiện tại | màu `text-tertiary` | "Đang đồng bộ lại…" | Mất kết nối Gateway; app vẫn tính từ `phase_ends_at` |
| `ended` (Solo) | — | tổng phút | "Bạn đã tập trung 1 giờ 15 phút" | Màn hình tổng kết S-STUDY-02 |

### Tương tác & accessibility
- Không bấm được bản thân vòng. Chạm avatar → hồ sơ rút gọn (BottomSheet).
- Cả cụm đọc thành một phần tử: "Tập trung, vòng 2, còn 18 phút 42 giây". Cập nhật lời đọc mỗi phút, không đọc mỗi giây.
- Chuyển pha: thông báo bằng lời "Chuyển sang Nghỉ ngắn, 5 phút"; motion "Cả phòng thở ra" (DESIGN.md › Motion).

### Checklist duyệt
- [ ] 8 state ở theme tối + `focus`, `short-break`, `paused` ở theme sáng.
- [ ] (v1.9) `paused · no-host` (dòng chu kỳ "Bấm Tiếp tục để chạy lại"), `other-session` ("còn 18 phút" `title-1` giữa vòng) — cả hai theme.
- [ ] Số "00:00" và "120:00" (focus tối đa 120 phút) vừa trong vòng 280. Định dạng luôn phút:giây; cỡ số chọn theo độ dài pha lúc bắt đầu (≥ 100 phút → `timer-long` 48 cho cả pha), không đổi cỡ giữa lúc đếm.
- [ ] Ba pha phân biệt được khi chụp ảnh đen trắng (kiểu nét + icon + nhãn).

---

## C-07 · ParticipantTile

**Mục đích:** một người trong phòng voice / Room Session. **REQ:** VC-01/02/04, STUDY-02/11/15. **Dùng ở:** S-ROOM-01/02, drawer phải, S-CALL-01.

### Bốn kích cỡ

| Kích cỡ | Cấu tạo | Dùng ở |
|---|---|---|
| `ring` (40) | `Avatar` 40 + tối đa hai chỉ báo 16 (dưới-phải: mic, dưới-trái: camera) + vòng `speaking` | Quanh `FocusTimer` |
| `ring-more` (40) | Tròn nền `surface-2`, viền `border-input`, chữ "+N" `label` đậm 600 | Ghế cuối khi phòng ≥ 13 người |
| `list` (hàng 56) | `Avatar` 40 · tên · nhãn vai trò · icon mic/camera theo bảng chỉ báo · phút hôm nay (`numeric-inline`) | Danh sách người trong phòng, drawer phải, chế độ `compact` |
| `video` (ô 3:4) | `video-tile` (DESIGN.md › Components): hình camera phủ ô; dải dưới: tên + icon mic theo bảng chỉ báo | `VideoGrid`, cuộc gọi. Cỡ cố định nhỏ (v1.9): 96 × 128 — ô `self` xem trước camera ở màn xem trước phòng (03, CR-22 #4); 72 × 96 — dải ô khi có người chia sẻ màn hình (v1.x, 03, CR-22 #9) |
| `floating` 🆕 (108 × 144, v1.9, CR-25 #7) | `video-tile` của người kia trong cuộc gọi đang thu nhỏ, nổi trên mọi màn (xem mục dưới) | Cuộc gọi 1-1 thu nhỏ khi camera người kia bật |

### Chỉ báo (hai vị trí cố định — chốt 17/10/2026; luật mic sửa v1.9, CR-13 #1)

`ring` có **hai** chỗ chỉ báo 16, viền cắt màu nền phía sau: **dưới-phải = mic**, **dưới-trái = camera**. Người bật cả camera lẫn mic hiện cả hai.

**Một luật mic cho mọi phòng và cuộc gọi:** đánh dấu người **bật** mic. Không còn Silent Room (vào phòng voice nào mic cũng tắt sẵn), nên không có chỉ báo `mic-off` cho người tự tắt mic.

| Vị trí | Chỉ báo | Khi nào | Hình |
|---|---|---|---|
| Dưới-phải (mic) | `mod-muted` | Bị quản trị tắt tiếng (VC-04) — ưu tiên hơn dòng dưới | icon `mic-off` `text-tertiary` trên `surface-3`; ở `list`: chữ "Bị tắt tiếng"; ở `video` / `floating`: icon `mic-off` `text-tertiary` trong dải tên |
| Dưới-phải (mic) | `mic-on` | Người này đang bật mic | icon `mic` 12 trên `surface-3`; ở `list`: icon `mic`; ở `video` / `floating`: icon `mic` trong dải tên |
| Dưới-trái (camera) | `camera-on` | Người này đang bật camera | icon `video` 12 trên `surface-3` (ở `video` không cần: hình camera đã nói) |
| — | — | Còn lại (tự tắt mic, tắt camera) | không chỉ báo |

### Trạng thái

| State | Hình |
|---|---|
| `default` | Như trên |
| `self` | Tên hiển thị "Bạn"; ở `ring` avatar nền `primary` khi chưa có ảnh; `video` lật gương hình của chính mình |
| `speaking` | `speaking-ring` (DESIGN.md › Components): vòng cách avatar khe 2px (`PTR speaking` trong `PT/ring`) / viền quanh ô video; hiện–mờ theo giọng nói, không nhấp nháy |
| `away` | Mất heartbeat / mất kết nối: mờ 45% (DESIGN.md › Components); ở `list` thêm chữ "Tạm vắng" |
| `host` | Chỉ ở `list`: nhãn "Đang điều khiển" (nhãn chờ chốt, README câu hỏi #2) |
| `camera-off` (`video`, `floating`) | Ô nền `surface-2`, `Avatar` 56 nằm giữa phần **phía trên dải tên**, không phải giữa cả ô (v1.9, CR-22 #8; DESIGN.md › video-tile) — áp cho lưới, cuộc gọi, dải ô chia sẻ, ô nổi |
| `connecting` (`video`) | Ô nền `surface-2` + vòng xoay nhỏ |
| `deleted` | Tên "Tài khoản đã bị xóa", avatar mặc định |

### `floating` — ô nổi của cuộc gọi thu nhỏ (v1.9, CR-25 #7)

- **Khi nào:** cuộc gọi đang thu nhỏ (`MiniPlayer · call`) và camera người kia bật (hoặc đã bật lúc thu nhỏ). Hiện trên mọi màn của app **trừ** S-CALL-01, kể cả DM của chính cuộc gọi (cùng dải `call-active`). Đã hiện thì ở lại tới hết cuộc gọi: người kia tắt camera → `camera-off` (avatar 56 trên `surface-2`), ô không biến mất.
- **Hình:** 108 × 144 (3:4), `video-tile`; hình người kia, dải tên ở đáy (tên + chỉ báo mic theo bảng trên); người kia nói → `speaking-ring` (viền 2 `text-primary`). **Không đồng hồ** (đồng hồ ở `MiniPlayer` / dải `call-active`). Không bóng (DESIGN.md › Elevation).
- **Vị trí:** mặc định góc dưới phải, cách mép 16, đáy cách đỉnh `MiniPlayer` / `Composer` / bàn phím 16. **Kéo được**; thả ra hít vào góc gần nhất trong 4 góc (góc trên nằm dưới header); app nhớ góc trên máy cho các cuộc gọi sau.
- **Chạm** → S-CALL-01. **Nhấn giữ** → `ActionSheet` "Đổi góc" (sang góc kế tiếp theo chiều kim đồng hồ) · "Ẩn ô" (ẩn tới hết cuộc gọi, `MiniPlayer` vẫn còn). Hai mục này cũng là `accessibilityActions` của ô (thay cho kéo, WCAG 2.5.7). `accessibilityLabel` "Video của Bình, chạm để mở cuộc gọi".
- **Chồng lớp:** `Toast` nằm **trên** ô khi ô ở góc dưới; sheet / dialog phủ lên ô.

### Checklist duyệt
- [ ] `ring`: default, self, speaking, away + 3 chỉ báo (`mod-muted`, `mic-on`, `camera-on`); một ghế có cả camera lẫn mic; `deleted` (vẽ 22/10/2026; `list` cũng có `deleted`). Không còn ô `mic-off` của người tự tắt mic (v1.9, CR-13).
- [ ] `list`: default, self+host, mod-muted, away, tên dài cắt `…`.
- [ ] `video`: có hình, camera-off (avatar giữa phần trên dải tên — v1.9), connecting, speaking, self (lật gương), tên dài; dải tên có icon `mic` khi bật mic, không icon khi tắt.
- [ ] `floating` (v1.9): có hình, `camera-off`, speaking; 4 góc trên khung 390 (trên `MiniPlayer`, trên `Composer`, trên bàn phím, góc trên dưới header); `tile-menu` (ActionSheet "Đổi góc" · "Ẩn ô").

---

## C-08 · MiniPlayer

**Mục đích:** giữ phiên voice/Focus khi rời màn hình phòng. **REQ:** SRS 3.1, STUDY-10, VC-01. **Dùng ở:** S-ROOM-08, mọi tab khi đang trong phòng hoặc Solo.

### Cấu tạo (cao 64, nằm ngay trên `TabBar`, nền `surface-2`, kẻ trên `border`)
```
[icon pha]  Phòng học im lặng                         [mic] [rời]
            Tập trung 18:42
```

### Biến thể & trạng thái

| Biến thể / state | Dòng 1 | Dòng 2 | Nút phải |
|---|---|---|---|
| `voice` | Tên kênh | "Đang trong phòng · 4 người" | Mic · Rời phòng |
| `room-session` | Tên kênh | `PhaseBadge · S · live` ("Tập trung 18:42") | Mic · Rời phòng |
| `solo` | "Học một mình" | `PhaseBadge · S · live` | Tạm dừng · Dừng |
| `solo-waiting` | "Hết giờ nghỉ" | "Còn 08:12 để học tiếp" | `Button · primary · S` "Học tiếp" |
| `paused` 🆕 (v1.9, CR-22 #6) — cho `room-session` và `solo` | như biến thể gốc | `PhaseBadge · S · live · paused` "Tạm dừng 18:42" (số đứng yên, cả cụm `text-secondary`, C-16) | `room-session`: Mic · Rời phòng; `solo`: nút "Tạm dừng" thành "Tiếp tục" (`play`) · Dừng |
| `voice-solo` 🆕 (v1.9, CR-22 #11d) | Tên phòng (đang ở phòng voice / Phòng học **chưa có phiên** mà Học một mình) | `PhaseBadge · S · live` của Solo + "· Học một mình" ("Tập trung 18:42 · Học một mình") | Mic · Rời phòng. Chạm vùng chữ → S-STUDY-02 (không phải màn phòng). Trên màn của chính phòng đó hiện `MiniPlayer · solo` |
| `camera-on` (sửa v1.9, CR-22 #12) | như biến thể gốc | như biến thể gốc | **`IconButton` 48 Camera trạng thái bật** (`video`, nền `surface-3` như `RoomControl · on`) đứng trước nút Mic, thay icon nhắc `video` cũ. Chạm = tắt camera ngay, nút biến mất, không Toast. Camera tắt thì **không có nút** (bật camera phải ở màn phòng / màn cuộc gọi). `solo`, `solo-waiting`, `voice-solo` không có Camera |
| `reconnecting` | như biến thể gốc | "Đang kết nối lại…" | như biến thể gốc |
| `call` (20/10/2026, area 09; Camera v1.9, CR-25 #6) | Tên người đang gọi ("Bình") | Icon `phone` `success` + đồng hồ cuộc gọi "03:12" (Unbounded `tabular-nums`) | [Camera] · Mic · Kết thúc (`danger`). Camera theo luật `camera-on` ở trên: chỉ khi camera của mình đang bật, chạm = tắt |

- Chạm vào vùng chữ → mở lại màn hình phòng / Solo / cuộc gọi (đồng hồ luôn cách 1 chạm).
- **Hiện ở đâu** (v1.9, CR-22 #5): mọi màn khi đang trong phòng / Solo / cuộc gọi, **chỉ ẩn** trên màn của chính phòng mình đang ở (với `call`: trên S-CALL-01). Trên màn xem trước một phòng khác (S-ROOM-01/02 `not-joined`) `MiniPlayer` của mình **vẫn hiện**.
- Không mascot, không màu ngữ nghĩa; màu pha chỉ ở icon và dòng 2.
- **Khung 360:** tên phòng / tên người cắt `…` trước các nút; tối đa 3 nút (Camera · Mic · Rời phòng / Kết thúc), không nút nào bị ẩn vì thiếu chỗ.

### Checklist duyệt
- [ ] 7 biến thể/state + `call`, cả hai theme, ở khung 360 tên kênh dài cắt `…` trước các nút. `call` vẽ 22/10/2026 theo S-CALL-01 `minimized`.
- [ ] (v1.9) `camera-on` vẽ lại: `IconButton` Camera bật thay icon nhắc, trên `room-session` và `voice`; `call` + Camera; `paused` cho `room-session` và `solo` ("Tiếp tục"); `voice-solo`; ở khung 360 có 3 nút mà tên vẫn còn ≥ 1 chữ + `…`.

---

## C-09 · BottomSheet, ActionSheet, Dialog

**Mục đích:** thao tác phụ và xác nhận. **REQ:** SRS 3.1, 3.4, STUDY-01/10/11. **Dùng ở:** S-ROOM-03/04/05/06, S-HOME-04, S-MOD-02/03/05.

**Chọn loại** (chốt 21/10/2026, area 10): `Dialog` = xác nhận **không** có ô nhập. `BottomSheet` = mọi lớp phủ có ô nhập hoặc danh sách lựa chọn (báo cáo, xác nhận gõ tên / mật khẩu — S-MOD-03) và sheet giải thích quyền mic / camera (S-MOD-05) — sheet nằm trên bàn phím. Màn toàn khung = preview lời mời (S-MOD-01), giải thích quyền thông báo (S-ROOM-09).

### Biến thể

| Biến thể | Cấu tạo | Ví dụ |
|---|---|---|
| `BottomSheet` | Mép trên `rounded.sheet`, thanh kéo 36 × 4 `border-input`, tiêu đề `title-2`, nội dung, hành động cuối (`Button` L full width) | Sheet Start (S-ROOM-03), sheet điều khiển Host (S-ROOM-04) |
| `ActionSheet` | Danh sách hàng 56: icon 22 + nhãn `body`; hàng phá hủy dùng icon + chữ `danger`; hàng "Hủy" tách riêng cuối. **Đầu sheet tùy chọn** (v1.9): tiêu đề `headline` 1 dòng cắt `…` (tên việc — CR-20 #10; tên người — CR-25 #10; mã lời mời "Rt4nW8eq") + dòng phụ `label` `text-secondary` tùy chọn ("Tạo bởi Bình (binh.tran) · 3/10 lượt" — CR-17 #13). **Nhóm chọn một** (v1.9, CR-20 #10): nhãn nhóm `label` 600 `text-tertiary` cao 28 ("TRẠNG THÁI"), mục đang chọn có `check` 20 `primary` ở cuối hàng | Nhấn giữ tin nhắn (S-HOME-04), nhấn giữ hàng việc (C-12), ⋯ hồ sơ (S-HOME-10), ô nổi cuộc gọi (C-07 `floating`) |
| `Dialog` | Giữa màn hình, rộng tối đa 320, `rounded.sheet`, nền `surface-1`; tiêu đề `headline`, nội dung `body`, hai nút ngang (`text` "Hủy" · `primary`/`danger` hành động) | "Dừng phiên học cho cả phòng (9 người)?" (S-ROOM-05), "Vào phòng sẽ kết thúc phiên học một mình của bạn" (S-ROOM-06) |

**Master (22/10/2026):** bảng C-09 có master `Dialog` (`Dialog title`, `Dialog body`, hàng nút `Dialog actions`: `Button · text` "Hủy" + `Button · danger`/`primary`) và `BottomSheet` (thanh kéo `Handle row`, `Sheet title`, vùng nội dung `Sheet content` — slot, thay bằng Replace — và `Sheet action` `Button · primary` L). Dựng từ S-ROOM-05 và sheet Start của S-ROOM-03. Các màn đã vẽ trước đó (S-ROOM-03/04/05/06, S-HOME-09 `leave-confirm`, S-MOD-02/03…) **giữ bản vẽ riêng**, không thay bằng instance; màn mới dùng master. Dialog nút xếp dọc (nhãn dài) dùng master rồi override hàng nút thành dọc. `ActionSheet` chưa có master (mỗi màn một danh sách `ActionRow`); đợt v1.9 dựng master `ActionSheet` (đầu sheet + nhóm chọn một) vì có thêm 4 chỗ dùng.

Chung: scrim `bg` 60%; bóng sheet/dialog theo DESIGN.md › Elevation; nút Back Android và vuốt xuống đóng sheet (SRS 3.1).

**Nhấn giữ một hàng** (tin nhắn S-HOME-04; hàng việc C-12, v1.9 CR-20 #10): hàng được **nhấc lên** trên scrim (giữ nguyên hình, nằm trên scrim), `ActionSheet` mở bên dưới; rung nhẹ khi mở. Chỉ hiện mục người xem làm được; các mục cũng là `accessibilityActions` của hàng. Dialog phá hủy: nút hành động là động từ cụ thể ("Dừng phiên", không phải "Đồng ý").

**Nút của Dialog** (chốt 17/10/2026): hai nút ngắn (≤ 2 từ mỗi nút, vd "Hủy" · "Vào phòng") xếp ngang, căn phải. Nhãn dài hơn, hoặc chỉ có một nút, thì **xếp dọc, rộng hết dialog**: nút chính trên (`primary`/`danger`), nút phụ dưới (`secondary`). Nút phụ không dùng chữ gợi ý hành động nguy hiểm khi bấm vào chỉ là thoát (vd "Để sau" thay vì "Không khôi phục").

### Trạng thái
`default` · `loading` (nút hành động `loading`, không đóng được khi đang gửi) · `error` (dòng lỗi icon + chữ trên hàng nút) · `keyboard-open` (BottomSheet có ô nhập đẩy lên trên bàn phím, NFR-MOB-14).

**Ngoại lệ nút mờ** (chốt 21/10/2026): ở sheet xác nhận gõ tên (S-MOD-03 `type-name`), nút `danger` `disabled` tới khi gõ khớp — nhãn ô đã nói đúng điều còn thiếu. Mọi form khác giữ luật "nút luôn bấm được" (C-02).

### Checklist duyệt
- [ ] Mỗi biến thể một ví dụ chữ thật ở trên; dialog phá hủy dùng `Button · danger`.
- [ ] Ở 200%, dialog cuộn nội dung, hàng nút luôn nhìn thấy.
- [ ] (v1.9) `ActionSheet` có đầu (tiêu đề + dòng phụ) và nhóm "TRẠNG THÁI" có `check` ở mục đang chọn; master `ActionSheet` (dựng từ menu hàng việc) để các màn mới dùng instance.

---

## C-13 · Avatar, PresenceDot, Badge

**REQ:** AUTH-05/06, NOTIF-01, FRIEND-04. **Dùng ở:** mọi nơi.

### Avatar
- Cỡ: 20 (chồng trong hàng) · 24 (header DM) · 32 · 40 (mặc định) · 56 (video tắt camera) · 96 (hồ sơ).
- Hình tròn (`rounded.full`). Chưa có ảnh: chữ cái đầu của tên hiển thị trên nền `surface-3`, chữ `text-primary` đậm 600; người dùng hiện tại nền `primary`, chữ `on-primary`.
- Chồng avatar: lệch −6, viền 2 màu nền phía sau; tối đa 3 rồi "+N" (`label`, `text-secondary`).
- `deleted`: biểu tượng người mặc định trên `surface-3`.

### PresenceDot

Hình dạng, màu, cỡ và nơi được hiện: theo DESIGN.md › Colors › Presence (Online chấm đặc · Idle trăng khuyết · DND tròn gạch ngang · Offline vòng rỗng). State: `online`, `idle`, `dnd`, `offline` × cỡ 10 / 14.

### Badge
- `count`: cao 16, đệm ngang `space-1`, `rounded.full`, nền `danger`, chữ `tab` đậm 700 màu `bg`; 1–99, "99+".
- `count · neutral` 🆕 (v1.9, CR-18 #10): cùng hình `count`, nền `surface-3`, chữ `text-primary` (12.31 sáng · 10.84 tối). **Không đỏ** — đỏ dành cho nhắc tới / chưa đọc. Dùng cho số báo cáo đang chờ của người thấy hàng đợi: cạnh tên server ở đầu danh sách kênh (drawer), trước `chevron-right` của hàng "Cài đặt server" (menu server) và hàng "Báo cáo" (Cài đặt server) — ba chỗ cùng một số. `accessibilityLabel` của hàng thêm ", 2 báo cáo đang chờ".
- `dot`: chấm 8 màu `danger` (unread không đếm số dùng chấm `text-primary` — xem `ChannelRow`).

### Checklist duyệt
- [ ] Avatar 6 cỡ × có ảnh / chữ cái / deleted.
- [ ] 4 presence phân biệt được khi chụp đen trắng.
- [ ] Badge "1", "12", "99+".
- [ ] (v1.9) `count · neutral` "2", "99+" cả hai theme, đặt cạnh `Badge · count` đỏ để thấy khác nhau.

**Xem ở màn (22/10/2026):** avatar có ảnh — S-ME-01 `uploading` / `crop`; `PresenceDot` cỡ 14 — avatar lớn ở hồ sơ rút gọn S-HOME-10. Bảng C-13 chỉ có chữ cái và `deleted`.

---

## C-14 · EmptyState, Skeleton, Toast, Banner

**REQ:** SRS 3.4, 3.5, NFR-A11Y-05. **Dùng ở:** mọi danh sách và màn hình có tải dữ liệu.

### EmptyState
```
            [Runtime · neutral 96–120]   ← tùy chọn, theo DESIGN.md › Mascot
            Chưa có việc nào              ← title-2
   Thêm việc đầu tiên để cả nhóm cùng theo dõi.   ← body, text-secondary, tối đa 2 dòng
            [ Thêm việc đầu tiên ]        ← Button · primary hoặc secondary
```
Căn giữa (ngoại lệ có chủ đích: một khối duy nhất trên màn hình trống). Câu chữ lấy từ SRS 3.5. Biến thể `inline` (không mascot, trong một khu vực của màn hình, ví dụ "Chưa có phòng nào đang học").

### Skeleton
Khối `surface-2` đúng hình dạng nội dung thật (hàng kênh, hàng task, tin nhắn), `rounded.badge`. Chuyển động nhịp sáng nhẹ 1.2 giây; **tắt** khi bật Giảm chuyển động. Không spinner toàn màn hình quá 1 giây (SRS 3.5).

### Toast (đảo màu — v1.9, CR-24 #3)
Nổi phía dưới, ngay trên `MiniPlayer`/`TabBar` (vị trí ở các màn khác, hàng đợi, thời gian giữ, luật trên sheet / dialog và ưu tiên: 10 › S-MOD-04; trên ô nổi cuộc gọi: C-07 `floating`). Hình theo `toast` ở DESIGN.md › Components:
- Nền `text-primary`, chữ và icon `bg`, `rounded.button`, **không bóng**. Đây là bề mặt đảo màu thứ hai của app (sau `room-control-main`).
- Icon tùy chọn + câu ngắn (cỡ chữ như bản cũ) + hành động `Button · text` màu `primary-inverse` đậm 600 ("Thử lại", "Hoàn tác", "Vào lại", "Xem").
- **Mọi icon cùng màu chữ** (`bg`), kể cả lỗi `octagon-x` và thành công `circle-check`: không dùng `danger` / `success` trên nền đảo màu (dưới 3:1) — câu chữ nói lỗi gì.
- Bỏ hình cũ nền `surface-3` (trước 30/10/2026).

Tự ẩn sau 4 giây (6 giây nếu có hành động). Ví dụ: "Không gửi được tin nhắn · Thử lại", "Bạn đang được tính giờ từ 20:12" (S-ROOM-02 `just-joined`).

### Banner
Dải tràn viền ngay dưới header, cao 40, nền `surface-2`, chữ `label`, **màu trung tính** (dùng được cả trong Study Room):

| Biến thể | Icon | Chữ |
|---|---|---|
| `offline` | `wifi-off` | "Bạn đang offline" |
| `reconnecting` | vòng xoay | "Đang kết nối lại…" (sau 3 giây mất Gateway, SRS 3.4) |
| `mic-denied` | `mic-off` | "Chưa có quyền mic · vẫn nghe được" + hành động "Mở cài đặt" |
| `push-denied` | `bell-off` | "Thông báo đang tắt" + hành động "Mở cài đặt" (Solo: "Thông báo đang tắt · bạn sẽ không biết lúc hết giờ nghỉ" + "Bật thông báo") |

Giới hạn tần suất chung là **toast**, không phải banner (bỏ biến thể `rate-limited` ngày 21/10/2026 — SRS 3.4; luật chồng banner, 3 giây chờ: 10 › S-MOD-04).

**Hành động** (chốt 17/10/2026): ô chữ `label` đậm 600 màu `primary` ở cuối dải, tách khỏi câu — không viết hành động lẫn vào chữ thường. Chữ dài thì dải cao theo nội dung (đệm 8), không cắt.

### Checklist duyệt
- [ ] EmptyState có/không mascot; Skeleton cho 3 loại hàng; 4 Banner (`offline`, `reconnecting`, `push-denied`, `mic-denied`), cả hai theme.
- [ ] Toast (v1.9): có / không hành động × theme sáng / tối; một toast lỗi có icon `octagon-x` cùng màu chữ; hành động màu `primary-inverse`; không bóng.

---

## C-16 · PhaseBadge

**Mục đích:** hiển thị pha ở mọi nơi ngoài vòng nhịp, luôn đủ icon + nhãn (+ thời gian). **REQ:** SRS 4.9.1, NFR-A11Y-02. **Dùng ở:** `FocusTimer`, `ChannelRow`, `MiniPlayer`, hàng "Đang học lúc này" (S-STUDY-01), notification.

| Kích cỡ | Icon | Nhãn | Thời gian |
|---|---|---|---|
| `S` | 14 | `label` đậm 600 | `numeric-inline` |
| `M` | 18 | `body` đậm 600 | — (số lớn nằm riêng trong `FocusTimer`) |

**Hai kiểu ghi thời gian** (chốt 17/10/2026; chỗ dùng sửa v1.9, CR-23 #2) — số luôn là **thời gian còn lại của pha**:
- `live` — "Tập trung 18:42", phút:giây, đếm từng giây. **Chỉ** ở `MiniPlayer` (phiên của chính user). Đồng hồ trên chính màn phòng / Học một mình là `FocusTimer` (C-06), không phải `PhaseBadge`.
- `list` — "Tập trung · còn 18 phút", chỉ phút, cập nhật mỗi phút; < 1 phút: "còn dưới 1 phút"; `paused` không ghi số. Dùng ở mọi chỗ còn lại: phòng của **người khác** trong danh sách (`ChannelRow · focus-running`, hàng "Đang học lúc này" S-STUDY-01/06, chữ trong dialog S-ROOM-06), **khối Học một mình ở tab Học** (v1.9, CR-23 #2: "Tập trung · còn 32 phút"; tạm dừng "Tạm dừng"; đang chờ "Hết giờ nghỉ · còn 8 phút để học tiếp" — vì `MiniPlayer` cùng màn đã đếm giây), và icon pha của `ActivityLine` (C-40). Lý do: danh sách nhiều số nhảy từng giây kéo mắt; số trần "18:42" không nói rõ còn lại hay đã trôi qua.

Màu icon + nhãn + thời gian = màu pha (`phase-focus` / `phase-short` / `phase-long`). Không nền, không viền (không phải chip). State: `focus`, `short-break`, `long-break`, `paused` (icon `pause`, màu `text-secondary`), `waiting` (icon `coffee`, nhãn "Hết giờ nghỉ").

**`paused` theo kiểu** (v1.9, CR-22 #6): `live · paused` = "Tạm dừng 18:42" — số **đứng yên** ở thời gian còn lại lúc dừng, cả cụm (icon, nhãn, số) `text-secondary` (thay luật cũ "`live` tạm dừng không ghi số"). `list · paused` = "Tạm dừng", không số (giữ).

### Checklist duyệt
- [ ] 5 state × 2 cỡ × 2 theme; tương phản màu pha trên `bg` và `surface-2` đạt AA (bảng ở DESIGN.md).
- [ ] Cỡ S có hai hàng (vẽ 22/10/2026): `live` và `list` ("Tập trung · còn 18 phút", "còn dưới 1 phút", `paused` không ghi số). Pencil: `list` = instance `PhaseBadge/S`, nhãn "… · còn", số phút ở `PB time`, bật `PB unit` "phút".
- [ ] (v1.9) Ô `live · paused` vẽ lại thành "Tạm dừng 18:42" `text-secondary` (bản 22/10 không ghi số).

---

## C-17 · RoomControl

**Mục đích:** nút điều khiển tròn trong Study Room / phòng voice / cuộc gọi. **REQ:** VC-01/04, STUDY-01/02/10/11. **Dùng ở:** S-ROOM-01/02, S-STUDY-02, S-CALL-01.

```
   ( icon )      ← 56 tròn, nền surface-2, viền border  ·  bản chính 64, nền text-primary, icon bg
     Nhãn        ← label, text-secondary, tối đa 2 dòng
```

| Nút | Ai thấy | State |
|---|---|---|
| Mic | Mọi người | `off` (`mic-off`) · `on` (`mic`, nền `surface-3`) · `mod-muted` (`mic-off` + nhãn "Bị tắt tiếng", disabled) · `no-permission` (chạm → S-MOD-05). Vào phòng nào mic cũng `off`; quyền mic chỉ xin khi chạm Mic lần đầu (v1.9, CR-13 #1) |
| Camera | Mọi người | `off` (`video-off`) · `on` (`video`, nền `surface-3`) · `no-permission` |
| Tạm dừng / Tiếp tục (bản chính) | Host, `MANAGE_STUDY_ROOMS`, Solo | `pause` ↔ `play` |
| Tiếp tục của Participant (bản chính, v1.9, CR-22 #13) | Mọi người trong phòng, **chỉ khi** phiên không có Host và đang tạm dừng | `play`, nhãn "Tiếp tục", nằm giữa Camera và Rời phòng. Chỉ Tiếp tục (không Tạm dừng, Bỏ qua pha, Sửa chu kỳ, Dừng); người bấm không thành Host |
| Bỏ qua pha | Host, `MANAGE_STUDY_ROOMS`, Solo | `skip-forward` |
| Điều khiển khác | Host, `MANAGE_STUDY_ROOMS` | `sliders-horizontal` → sheet S-ROOM-04 (sửa chu kỳ, Dừng phiên) |
| Rời phòng | Mọi người | `log-out` |
| Loa ngoài (S-CALL-01, 20/10/2026) | Trong cuộc gọi | `volume-2`; `on` nền `surface-3` |
| Đổi camera (S-CALL-01) | Khi camera của mình đang bật | `refresh-ccw` |
| Kết thúc / Từ chối · Nghe / Gọi lại (S-CALL-01/02) | Cuộc gọi | Nút tròn 56 nền `danger` (`phone-off`) / `success` (`phone`, `video`), icon `bg` — ngoại lệ duy nhất có màu, chỉ ở màn cuộc gọi |

- Không dùng màu pha hay `primary` cho nút trong phòng (DESIGN.md › Components).
- Người không có quyền điều khiển **không thấy** nút Host (không hiện nút bị vô hiệu).
- Hàng nút tối đa 4 nút + 1 nút chính, nằm ở vùng ngón cái.
- **Màn xem trước phòng** (v1.9, CR-22 #4; S-ROOM-01 / S-ROOM-02 `not-joined`, mọi phòng voice): hàng đáy Mic · Camera (mặc định `off`, nhãn "Mic" / "Camera") + `Button · primary · L` "Vào phòng" / "Chuyển sang phòng này". Chạm Mic / Camera lần đầu → S-MOD-05 `mic` / `camera` rồi hộp quyền hệ thống. Bật Camera ở đây → ô `ParticipantTile · video · self` 96 × 128 (C-07) nổi góc dưới phải, cách hàng nút 16, không đẩy bố cục; tắt thì ô biến mất. Bị tạm khóa, thiếu `CONNECT`, offline: không có Mic, Camera, ô của mình — chỉ nút `disabled` + lý do (03).
- Nhãn nút giới hạn phóng ×1.3 (như nhãn `TabBar`), nhấn giữ hiện tooltip có nhãn đầy đủ. Khi chữ ≥ 200%, hàng nút **ghim ở đáy**, phần thân màn hình cuộn phía trên.

### Checklist duyệt
- [ ] Mỗi nút × mỗi state; hàng nút Host và hàng nút Participant ở khung 360.
- [ ] Nút cuộc gọi (vẽ 22/10/2026 theo S-CALL-01/02): Loa ngoài off/on, Đổi camera, Kết thúc / Từ chối (`danger`), Nghe (`phone`, `video`) / Gọi lại (`success`) — instance của `RoomControl`, đổi nền + icon bằng override.
- [ ] (v1.9) Hàng Participant khi `no-host` + tạm dừng: Mic · Camera · **Tiếp tục** (bản chính) · Rời phòng; hàng màn xem trước: Mic · Camera + "Vào phòng" (và bản Camera bật có ô 96 × 128), khung 360.

---

## C-18 · VideoGrid

**Mục đích:** nhìn thấy nhau qua camera mà không mất đồng hồ chung. **REQ:** VC-01/05, STUDY-02, NFR-MOB-04/07. **Dùng ở:** S-ROOM-01 `voice-video-grid`, S-ROOM-02 `grid-view` (chế độ Lưới), S-CALL-01.

Lưới 2 cột `ParticipantTile · video` (3:4), cách `space-2`; quá 6 ô thì cuộn; người đang nói có `speaking-ring`.

| Biến thể | Ô nào được hiện |
|---|---|
| `study-room` (chế độ Lưới) | Mọi người trong phòng; người tắt camera là ô avatar; thứ tự giống hệt vòng (luật xếp ghế của C-06), nên chuyển Vòng ↔ Lưới không đổi thứ tự người |
| `voice` (phòng chưa có phiên học, cuộc gọi) | Mọi người trong phòng; người tắt camera là ô `camera-off`. Thứ tự theo **cùng luật xếp ghế của C-06, bỏ bước Host**: bạn → bạn bè → bật camera/mic → vào trước; người vào sau nối vào cuối (chốt 17/10/2026). Nhờ vậy bấm Bắt đầu không làm đảo thứ tự |

- Tiết kiệm dữ liệu (NFR-MOB-07): khi bật "Tiết kiệm dữ liệu", ô video của người khác chỉ tải khi user chạm "Hiện video".
- 1 ô: chiếm cả chiều ngang (tỉ lệ 3:4 giữ nguyên); 2 ô: một hàng; 3 ô: hàng 2 + hàng 1 căn trái.

### Checklist duyệt
- [ ] `study-room` 1, 2, 3, 7 ô (có cuộn, có ô avatar của người tắt camera — vẽ 22/10/2026); `voice` 4 người có 1 người tắt camera; một ô đang nói; ô của chính mình lật gương.

---

## C-20 · SegmentedControl

**Mục đích:** chuyển giữa 2–4 chế độ xem cùng một nội dung (4 mục từ 20/10/2026: Bạn bè Online / Tất cả / Đang chờ / Đã chặn). **REQ:** SRS 3.1 (drawer phải: Thành viên / Task Board / Ghim), chế độ Vòng / Lưới, FRIEND-04, STUDY-17. **Dùng ở:** S-ROOM-02, S-HOME-03, S-DM-04, S-STUDY-03 ("Tuần | Tháng" rộng hết khung — v1.9, CR-23 #4).

```
┌──────────────┬──────────────┐
│ ● Vòng       │ Lưới · 📹3   │   ← cao 36 (vùng chạm 48), nền surface-2, rounded.button
└──────────────┴──────────────┘
```
- Mục đang chọn: nền `surface-1`, chữ `text-primary` đậm 600; mục khác: chữ `text-secondary`. Không dùng `primary` hay màu pha.
- Mục có thể kèm số đếm (`label`) hoặc icon 16.
- State: `default`, `pressed`, `disabled` (một mục), chữ dài cắt `…` (mỗi mục chia đều chiều ngang; mục có số đếm rộng theo chữ, các mục còn lại chia đều).
- Cỡ chữ 200% (chốt 20/10/2026, area 09): nhãn chỉ phóng tối đa ×1.3 (như nhãn `TabBar`, `RoomControl`), vẫn một hàng, thiếu chỗ thì cắt `…`; nhấn giữ hiện tooltip nhãn đầy đủ.
- Accessibility: `accessibilityRole="tablist"`, mỗi mục là `tab` có `selected`.

### Biến thể `tri-state` (21/10/2026, area 08 — quyền riêng của kênh)
```
┌────┬────┬────┐
│ ✕  │ ⁄  │ ✓  │   ← 3 mục chỉ icon, mỗi mục 40 × 32 (vùng chạm 48), nằm bên phải hàng quyền
└────┴────┴────┘
```
- Ba nấc cố định theo thứ tự **Từ chối · Mặc định · Cho phép**; không phải chuyển chế độ xem mà là chọn giá trị, nên là `radiogroup`.
- Nấc đang chọn: nền `surface-1`; icon `x` màu `danger` (Từ chối), `slash` màu `text-secondary` (Mặc định), `check` màu `success` (Cho phép). Nấc khác: icon `text-tertiary`. Ý nghĩa nằm ở icon, màu chỉ củng cố (NFR-A11Y-02).
- Đọc màn hình: "Gửi tin nhắn, Từ chối, 1 trên 3". State thêm: `disabled` cả cụm (kênh đang đồng bộ với danh mục); `allow-disabled` chỉ nấc Cho phép mờ (người xem không có quyền đó — 8.5.2).
- 200%: cụm giữ cỡ, nhãn quyền xuống dòng bên trái, cụm căn trên.

### Checklist duyệt
- [ ] 2 mục (Vòng / Lưới, có và không có số camera) và 3 mục (Thành viên / Task / Ghim), cả hai theme, ở khung 360.
- [ ] `tri-state`: cả 3 nấc được chọn có frame; phân biệt được khi xem đen trắng.
- [ ] 4 mục (Bạn bè: Trực tuyến / Tất cả / Đang chờ · 1 / Đã chặn) — vẽ 22/10/2026.

**Pencil:** master `Segment/item` (nhãn mặc định "Lưới") trên bảng C-20. Master `TriState` nằm trên bảng **`C-34 · RadioRow · Switch · TriState · MemberRow/username · OS/PermissionDialog`**, hàng TriState: Mặc định (master), Từ chối, Cho phép, `disabled` (cả cụm mờ 40%), `allow-disabled` (chỉ nấc Cho phép mờ 40%).

---

## C-21 · ChipStatus

**Mục đích:** một trạng thái không bấm được, dạng chip. **Dùng ở:** S-ROOM-01/02 (vai trò trong phiên học), S-HOME-10 (quan hệ, v1.9), C-39 (phiên đang chạy, v1.9). Theo `chip-status` trong DESIGN.md: cao 28, đệm ngang `space-3`, icon 14 + nhãn `label`, viền `border`, `rounded.full`, không nền, chữ và icon `text-secondary`. Không bấm được.

| Nhóm | Ví dụ |
|---|---|
| Vai trò trong phiên học | "Bạn đang điều khiển" (`timer`), "Bình đang điều khiển" (`user-round`), "Chưa có người điều khiển" (`user-round-x`) |
| Quan hệ trong hồ sơ 🆕 (v1.9, CR-25 #9, #10) | "Bạn bè" (`user-check`), "Đã gửi lời mời" (`send`), "Đã chặn" (`ban`) — đứng giữa "Nhắn tin" và ⋯ ở hàng nút S-HOME-10, cao 28 nhưng hàng vẫn căn giữa theo nút 40. Nút thật về quan hệ chỉ còn "Kết bạn" / "Chấp nhận" (`Button`) |
| Phiên đang chạy 🆕 (v1.9, CR-23 #6) | "Đang học" (`lamp-desk`) trên `SessionRow` (C-39) |

Không còn chip "Im lặng" (v1.9, CR-13 #1 bỏ Silent Room).

Bảng `C-21` trong Pencil có thêm `OS/StatusBar` — thanh trạng thái của hệ điều hành, chỉ dùng để dựng màn hình, không phải component của app.

`OS/Keyboard` (thêm 17/10/2026) — bàn phím hệ thống, cùng loại với `OS/StatusBar`: chỉ để dựng frame `keyboard-open`. Biến thể `text`, `email`, `number`; cao 291 (chữ, email) / 260 (số), nền `surface-2`. Thay cho các bàn phím số vẽ rời ở S-ROOM-03.

---

## C-15 · SettingsRow (đưa lên P1, 17/10/2026)

**Mục đích:** một hàng cài đặt hoặc một lựa chọn có giá trị. **REQ:** SRS 3.2, STUDY-03. **Dùng ở:** S-ONB-01 (múi giờ), S-HOME-06, S-TASK-02/03, Cá nhân › Cài đặt (07).

```
  Nhãn                          Giá trị   ›     ← cao 56; master không có đệm ngang — nơi dùng đặt (thường 16)
  Dòng mô tả (tùy chọn)                          ← label, text-secondary
```

| Biến thể | Bên phải |
|---|---|
| `value` | Giá trị `text-secondary` + `chevron-right`; chạm → màn hình hoặc sheet chọn |
| `switch` | Công tắc (P2, đặc tả khi làm 07) |
| `nav` | Chỉ `chevron-right` |
| `value · avatar` (22/10/2026, S-TASK-03) | Giá trị là **avatar chồng**: `Avatar` 24 viền 2 màu `bg`, lệch −6, tối đa 3 rồi "+N", kèm tên ("An, Bình") `text-secondary` + `chevron-right`. Pencil: Replace ô giá trị `Mk28S` của instance `SettingsRow` bằng cụm avatar |

| State | Khác gì so với default |
|---|---|
| `pressed` | Nền `overlay-pressed` |
| `disabled` | Chữ `text-tertiary` + dòng lý do |

**Xem ở màn (22/10/2026):** `pressed` không vẽ trên bảng; `disabled` + dòng lý do — S-SET-07 `off`, S-TASK-02 `viewer`.

Chữ dài (sửa 19/10/2026 — bản cũ để cột nhãn giãn nên giá trị dài ép nhãn "Kênh" xuống từng chữ ở S-TASK-02): **hàng một dòng** — nhãn giữ đủ độ rộng, không bao giờ xuống dòng; giá trị chiếm phần còn lại, căn phải, 1 dòng, cắt `…` (frame ghi sẵn chuỗi đã cắt, vd "#viec-nhom · Nhóm đồ á…"). **Hàng có mô tả** — cột nhãn + mô tả giãn hết chiều ngang, giá trị rộng theo chữ. Ở 200% giá trị xuống dưới nhãn.

---

## C-22 · ScreenHeader (17/10/2026)

**Mục đích:** header của màn hình con (không phải kênh). **Dùng ở:** Học một mình, Thống kê, "Đang học lúc này", các form của 01. Thay cho các header vẽ rời trước đây.

```
  ‹   Tiêu đề màn hình                    [hành động]     ← cao 56
```
`IconButton` back `chevron-left` + tiêu đề `headline` (1 dòng, cắt `…`) + tối đa một `IconButton` hoặc `Button · text` bên phải. Biến thể `no-back` (màn hình gốc của một stack; v1.9: 01 không còn dùng — S-AUTH-03 có ‹, màn Hoàn tất tài khoản S-ONB-01 không có header, tiêu đề nằm trong thân). Ở 200% tiêu đề vẫn 1 dòng, tên đầy đủ qua `accessibilityLabel`.

**Back** (v1.9, CR-15): ‹ của `ScreenHeader` làm đúng việc của Back hệ thống ở bước "quay lại màn trước trong stack của tab" (thứ tự đủ: DESIGN.md › Platform & Touch); màn đẩy chồng luôn giữ ‹. Không thêm nút → (tiến tới). Predictive back (Android 14+) xem trước màn sắp về khi đang vuốt. Không đổi frame.

---

## C-23 · Checkbox (17/10/2026)

**Mục đích:** xác nhận một điều (tuổi, điều khoản), hoặc chọn nhiều mục trong danh sách. **REQ:** AUTH-01, DEC-18, NFR-PRIV-01, SRV-02, SAFE-01. **Dùng ở:** S-ONB-01 Hoàn tất tài khoản (01, giữ ID, đổi nội dung — CR-16 #3: ≥ 18 tuổi, điều khoản; trước v1.9 ở S-AUTH-02); danh sách chọn nhiều người (C-28); "Vai trò được xem" của kênh riêng tư (08 S-SET-09, CR-17 #5); "Xóa cả tin bị báo cáo" (08 S-SET-03 mở từ báo cáo, CR-18 #5).

```
  [☐]  Nội dung xác nhận, xuống dòng tự do       ← ô 22, vùng chạm cả hàng ≥ 48
  [☐]  Tôi đồng ý với Điều khoản sử dụng          ← khối điều khoản (`CB links`): dòng 1 = chữ dẫn + link 1,
       và Chính sách quyền riêng tư              dòng 2 = "và" + link 2; hai link là hai phần tử bấm riêng
```

Khối điều khoản đọc liền thành một câu (sửa master 23/10/2026; trước đó chữ dẫn đứng riêng một dòng). Ở chữ 200% hai dòng xuống dòng tự do: chữ dẫn và link 1 tách dòng, link 2 xuống dòng trong cột chữ.

| State | Khác gì so với default (ô viền `border-input` 2, `rounded.badge`) |
|---|---|
| `checked` | Ô nền `primary`, dấu `check` màu `on-primary` |
| `error` | Viền `danger` + dòng lỗi dưới (icon `octagon-x` + chữ), như C-02 |
| `disabled` | Viền `border`, chữ `text-tertiary` |
| `checked-locked` 🆕 (v1.9, CR-17 #5) | Đã tick và **không bỏ được**: ô nền `surface-3`, dấu `check` `text-secondary`, chữ `text-primary`, dòng mô tả `label` `text-tertiary` lý do ("Luôn thấy kênh" — role có `ADMINISTRATOR`). Cả hàng không bấm được; `accessibilityState` checked + disabled. Phân biệt với `checked` bằng màu ô **và** dòng lý do |

Link trong câu (vd "Điều khoản sử dụng") là phần tử bấm riêng màu `primary`, không làm tick ô. Câu điều khoản đọc **liền một câu** (22/10/2026): dòng 1 "Tôi đồng ý với **Điều khoản sử dụng**", dòng 2 "và **Chính sách quyền riêng tư**" — hai link vẫn là hai phần tử bấm riêng (Pencil: Replace `CB links` của instance bằng khối `CB terms` 2 hàng, như S-ONB-01 `scrolled` — trước v1.9 là S-AUTH-02; khối cũ của master từng dùng ở S-AUTH-02 `large-text`, frame này đã bỏ ở v1.9, S-ONB-01 `large-text` dùng `CB terms` xuống dòng tự do). Bo góc ô: `rounded.badge` (4) — trước 22/10 vẽ cứng 6.

**Xem ở màn:** `error` — S-ONB-01 `field-error` (01; trước v1.9 là S-AUTH-02 `field-error`); `disabled` chưa dùng ở màn nào; `checked-locked` — 08 S-SET-09 `private-roles` (vẽ trên bảng C-23, v1.9). Ô xác nhận (tuổi, điều khoản) mặc định **chưa tick** (đồng ý phải là hành động của user); ô trong danh sách chọn có thể tick sẵn theo luật của màn (vd "Xóa cả tin bị báo cáo", role của người tạo kênh).

---

## C-24 · CodeInput (17/10/2026)

**Mục đích:** nhập mã xác nhận 6 số. **REQ:** AUTH-13, AUTH-08. **Dùng ở:** S-AUTH-03 (mã OTP đăng ký / đăng nhập), S-AUTH-05 `reset-form` (đặt lại mật khẩu một màn: ô mã + mật khẩu mới — v1.9, CR-16 #7), 07 S-ME-03 `password-code` (Đổi mật khẩu bằng mã OTP, CR-16 #10). Màn có thêm ô mật khẩu (S-AUTH-05, S-ME-03) **không tự gửi** khi đủ 6 số — gửi bằng nút của màn (luật ở 01 / 07). (v1.9: không còn dùng ở S-AUTH-03 `verified` — frame đó đã bỏ.)

```
  [ 4 ][ 8 ][ 2 ][ | ][   ][   ]     ← 6 ô 48 × 56, cách 8, rounded.input; số Unbounded (`stat` nhỏ, chữ số đều)
```
Một ô nhập ẩn phía sau nhận cả chuỗi (để hệ điều hành gợi ý mã `oneTimeCode` và dán được 6 số một lần); 6 ô chỉ để hiển thị. Bàn phím số. Đủ 6 số thì tự gửi, không cần nút — trừ màn có ô mật khẩu (xem Dùng ở).

| State | Khác gì so với default (ô viền `border-input` 1, nền `surface-1`) |
|---|---|
| `focused` | Ô đang nhập viền 2 `primary` + con trỏ |
| `filled` | Ô đã có số: chữ `text-primary` |
| `verifying` | Mọi ô chỉ đọc (nền `surface-2`) |
| `error` | Mọi ô viền 2 `danger`; lỗi trong `FormMessage` bên dưới; gõ số mới thì xóa trắng và bắt đầu lại |
| `disabled` | Nền `surface-2`, chữ `text-tertiary` (sai 5 lần, hết hạn, offline) |

Ở 200%: ô cao 72, số phóng theo; 6 ô vẫn một hàng (thu khoảng cách còn 4).

**Xem ở màn (22/10/2026):** `verifying` — S-AUTH-03 `verifying`; `disabled` theo lý do — S-AUTH-03 `too-many-attempts`, `code-expired`, `offline`. Bảng C-15 có default, focused, error, disabled.

---

## C-10 · MessageBubble (18/10/2026, area 02)

**Mục đích:** một tin nhắn trong danh sách chat. **REQ:** MSG-01..11, FRIEND-03, SRS 3.4, 8.4.5. **Dùng ở:** S-HOME-01, S-HOME-08, S-HOME-03 (`pinned`), S-DM-02.

Tên giữ là `MessageBubble` cho khớp SRS, nhưng **không vẽ bong bóng**: tin là một hàng phẳng, căn trái, tràn viền như Discord (DESIGN.md › Layout › Operate: danh sách tràn viền, không bọc thẻ). Tin của mình cũng nằm bên trái, chỉ khác avatar nền `primary` (C-13).

### Cấu tạo
```
 (Avatar 40)  Tên  20:04                 ← tên body đậm 600 text-primary · giờ label text-tertiary
              Nội dung tin…              ← body, xuống dòng tự do
              [tệp / ảnh / embed]
              [👍 3] [🎉 1] [☺+]          ← ReactionChip, cao 32, rounded.full
```
Đệm trái `space-3`, khoảng avatar → chữ 12, khoảng giữa hai nhóm tin `space-3`, giữa hai tin trong nhóm `space-1`.

**Giờ ở đầu tin** (v1.9, CR-19 #3), theo múi giờ của user: hôm nay "20:02" · hôm qua "Hôm qua 20:00" · cũ hơn "16/10/2026 20:00" (luôn đủ ngày tháng năm). Dùng cho `default`, `reply`, `system` và `pinned`. Tên người gửi dài cắt `…` trước để giờ luôn đủ.

**Gộp nhóm** (v1.9, CR-19 #13, thay "≤ 5 phút giữa hai tin liền nhau"): cùng người, cách **tin đầu nhóm** ≤ 5 phút, không bị tin khác / vạch ngày / vạch "Tin nhắn mới" chen. Ví dụ Bình gửi 21:07, 21:10, 21:13, 21:16 → nhóm "21:07" (21:07, 21:10) và nhóm "21:13" (21:13, 21:16). Tin gộp bỏ avatar, tên, giờ; nhấn giữ vẫn mở cả tin (state `lifted` bên dưới).

### Biến thể

| Biến thể | Khác gì |
|---|---|
| `default` | Như cấu tạo |
| `grouped` | Không avatar / tên / giờ; nội dung thẳng cột với nội dung tin trên |
| `reply` | Dòng trên tên: đường cong nối + `Avatar` 16 + tên người được trả lời (đậm) + 1 dòng nội dung tin gốc, `label` `text-secondary`, cắt `…`. Tin gốc đã xóa: "Tin nhắn gốc đã bị xóa" nghiêng |
| `mention` | Tin **liên quan tới mình** (CR-12, 23/10/2026; v1.9): nhắc tới mình (`@An`, `@everyone`/`@here` hợp lệ, role của mình) **hoặc trả lời một tin của mình** (dòng trích ghi "An"). Thanh trái 2 `primary` + nền `surface-1` cả hàng; kết hợp được với `reply` và `highlight`. Không áp dụng: tự trả lời tin của mình, mọi tin trong DM / Group DM, và tin nhắc hạn việc (tên trong đó là chữ thường — v1.9, CR-20 #3). Bảng Chat có hai ô: `mention` và `mention · trả lời tin của mình` |
| `system` | Không avatar: icon 16 `text-tertiary` (cột avatar) + chữ `label` `text-secondary` + giờ. Tên người trong chữ đậm 600 `text-primary`. Không có reaction, không trả lời |
| `blocked` | Một dòng `label` `text-tertiary`: "1 tin nhắn bị chặn · **Hiện**" (`Hiện` đậm, `primary`) |
| `pinned` | Dùng trong S-HOME-03: avatar 24, tên + giờ (theo luật giờ ở trên), nội dung tối đa 3 dòng cắt `…`, không reaction |

### Trạng thái hiển thị (v1.9)

| State | Trình bày |
|---|---|
| `highlight` 🆕 (CR-19 #2) | Tin được mở tới (chạm chip link tin, App Link, mục hộp thư, push): nền `surface-2` cả hàng **nhấp 2 lần**, mỗi lần 200 ms (`short`), rồi về như cũ. Tin liên quan tới mình giữ thanh trái 2 `primary` trong lúc nhấp. Giảm chuyển động: nền `surface-2` giữ 1 giây rồi tắt, không nhấp. Tạm thời — khác nền cố định của `mention`. Thay luật cũ "nền mention nhấp 2 lần". Vị trí tin khi mở (1/3 trên vùng tin): 02 |
| `lifted` (CR-19 #13) | Tin được nhấc lên trên scrim khi nhấn giữ (C-09, S-HOME-04). Tin gộp khi nhấc lên hiện **giờ của chính nó** "20:04" (`label` `text-tertiary`, chỉ `HH:mm` vì nhóm không qua vạch ngày) ở cột avatar |

### Nội dung đặc biệt

| Loại | Trình bày |
|---|---|
| Mention trong chữ | Chip chữ `@Bình`: nền `surface-2`, chữ `primary` đậm 600, `rounded.badge`. Mention mình: nền `surface-3`. `@everyone` không có quyền: chữ thường (MSG-03 AC1) |
| Kênh | `#tai-lieu` như chip mention |
| Link NezFocus (v1.9, CR-19 #11) | App phân loại theo đường dẫn (một bảng mẫu dùng chung với linking config); worker **không** tải trang `nezfocus.app`, không có thẻ "NezFocus". Mọi chip cùng hình chip mention (nền `surface-2`, chữ `primary` 600, `rounded.badge`), icon 14 đầu chip, rộng tối đa cột nội dung tin (306 ở khung 390). Dạng chip: **kênh** `/channels/<server>/<channel>` → như chip `#kênh`; **phòng** → icon `lamp-desk` (Phòng học) / `volume-2` (voice) + tên phòng; **server khác hoặc trong DM** → thêm tên server "Nhóm đồ án Mobile › #hoi-dap" (tên server co trước, tối thiểu 80, rồi `…`, sau đó tới tên kênh); **link tin** → icon `message-square` "#hoi-dap › Tin nhắn" (server khác: "Nhóm đồ án Mobile › #hoi-dap › Tin nhắn"; DM: "Tin nhắn với Bình"; Group DM: "Tin nhắn trong {tên nhóm}"); **không xem được** (kênh / tin / server không xem được theo dữ liệu app đang có, kể cả server chưa vào) → icon `lock` "Không xem được", chữ `text-secondary`, không tên; chạm → Toast "Bạn không xem được kênh này" / "Bạn không xem được tin nhắn này", không chuyển màn. **Lời mời** `/invite/<code>` → chữ link giữ + thẻ `InviteEmbed` (C-35) dưới tin. `/tasks/<id>` và đường dẫn NezFocus khác → link thường. Chạm chip / link NezFocus mở **ngay trong app** (đích từng loại: 02 S-HOME-01 › Tương tác) |
| Inline code | JetBrains Mono, nền `surface-2`, `rounded.badge` |
| Code block | JetBrains Mono 14, nền `surface-2`, viền `border`, `rounded.input`, đệm 12, **cuộn ngang** (không xuống dòng); cử chỉ drawer không nhận trên vùng này |
| Quote | Thanh trái 4 `border-input`, chữ `text-secondary` |
| Spoiler | Khối `surface-3` che chữ; chạm để hiện |
| Link | Chữ `primary` gạch dưới; link `javascript:` hiện dạng chữ thường (MSG-02 AC4) |
| Thẻ xem trước link (v1.9, CR-19 #10, #15) | Thẻ dưới tin, viền trái 4 `border-input`, rộng tối đa cột nội dung; tin gửi ngay, thẻ tới sau qua `MESSAGE_UPDATE` (1–3 giây, **không Skeleton**), chèn dưới tin, không làm tin phía trên nhảy chỗ. Tối đa **3 thẻ** mỗi tin, theo thứ tự link. Ba kiểu: **`large`** (ảnh ≥ 400 px chiều ngang) — ảnh 16:9 rộng hết thẻ ở trên, rồi tên trang `label` `text-tertiary`, tiêu đề `body` đậm 600, mô tả 2 dòng `body-sm` `text-secondary`; **`small`** — cột chữ như trên + ảnh 64 vuông `rounded.badge` bên phải; **`text`** — chỉ chữ. **Link video** (YouTube…) là `large` có nút ▶ tròn 48 giữa ảnh (nền `scrim`, icon `play` `text-primary`); chạm mở trình duyệt / app của trang, **không phát trong chat**. Ảnh thẻ chỉ tải từ storage NezFocus; ảnh lỗi → thẻ không ảnh, không báo lỗi. Gỡ thẻ ("Gỡ xem trước link"): 02 S-HOME-04 |
| Ảnh / video | Thumbnail rộng tối đa 240, cao tối đa 320, `rounded.button`; video có nút `play` + thời lượng. Nhiều ảnh: lưới 2 cột. Thumbnail trước, ảnh gốc khi mở (NFR-MOB-07). Chạm ảnh → `MediaViewer · image` (C-36, vuốt giữa các ảnh của cùng tin); chạm video → `MediaViewer · video` (trình phát của nền tảng), không tự phát trong danh sách (v1.9, CR-19 #8) |
| Âm thanh (mp3, m4a) 🆕 (v1.9, CR-19 #8) | Thẻ cao 56 như thẻ tệp: `IconButton` tròn 40 `play` / `pause` (nền `surface-3`, icon `text-primary`) + tên tệp (1 dòng, cắt giữa giữ đuôi) + thanh tiến độ cao 4 `rounded.full` (rãnh `surface-3`, phần đã phát `text-primary`) + "0:42 / 3:15" (`numeric-inline` `text-secondary`) + nút `download`. Phát ngay trong tin; một tệp một lúc (bấm tệp khác thì tệp đang phát dừng); rời màn chat thì dừng. `accessibilityLabel` "ghi-am-buoi-2.m4a, 0 phút 42 giây trên 3 phút 15 giây" |
| Tệp | Thẻ cao 56: icon loại tệp 32 + tên (1 dòng, cắt giữa: "bao-cao-cu…ky.pdf") + cỡ (`label`) + nút `download`. **PDF** (v1.9): chạm thẻ → `MediaViewer · pdf` (C-36). **Office, nén, tệp chữ:** chạm thẻ → tải rồi mở bằng ứng dụng của máy; không có ứng dụng → Toast "Không có ứng dụng mở được tệp .docx". Nút `download` của mọi thẻ → lưu vào Tải xuống + Toast "Đã lưu vào Tải xuống" |
| Đã sửa | "(đã chỉnh sửa)" `label` `text-tertiary` cuối nội dung |

### Trạng thái gửi (8.4.5)

| State | Trình bày |
|---|---|
| `sent` | Bình thường |
| `pending` | Cả tin mờ 50%; offline thêm dòng `label` icon `clock-3` "Sẽ gửi khi có mạng" |
| `retrying` | Như `pending` (user không cần phân biệt) |
| `failed` | Nội dung bình thường; dòng dưới icon `circle-alert` + "Không gửi được · **Thử lại**" màu `danger`; rate limit: "Bạn gửi quá nhanh · tự gửi lại sau 4 giây" |
| `failed · file-blocked` 🆕 (v1.9, CR-19 #7) | Đã bấm ➤ khi còn tệp đang tải, sau đó một tệp bị chặn ở bước kiểm tra: dòng dưới icon `circle-alert` + "Không gửi được · 1 tệp bị chặn" màu `danger`, không có "Thử lại"; chạm tin → S-HOME-04 `failed-message` ("Gửi không kèm tệp bị chặn" · "Xóa tin nhắn") |

Bỏ state `blocked-file` (v1.9, CR-19 #6): tệp được kiểm tra **trước khi gửi** (C-29 `checking` / `rejected`), không còn tin đã hiện rồi mất tệp.

### Tin hệ thống (MSG-11)

Câu chữ dựng ở app **theo người xem** từ loại + tham số của tin, bằng ngôn ngữ giao diện của người xem; tên server / kênh / phòng / người / việc là dữ liệu, không dịch (v1.9, CR-24 #4).

| Loại | Icon | Chữ |
|---|---|---|
| Tham gia server | `arrow-right` | "**Dũng** đã tham gia server" (vào kênh tin chào mừng của server — 02, CR-17 #2) |
| Ghim | `pin` | "**Chi** đã ghim một tin nhắn · **Xem**" |
| Phiên học bắt đầu (chat của phòng) | icon pha `lamp-desk` màu `phase-focus` | "**Bình** đã bắt đầu phiên học · 25/5" |
| Phiên học kết thúc (chat của phòng) | `square` | "Phiên học đã kết thúc · 1 giờ 40 phút" |
| Buổi học (Study Event) kết thúc | `calendar-check` | "Buổi học đã kết thúc" |
| Nhắc hạn việc (v1.9, CR-20 #3, #4) | `alarm-clock` | "Còn 24 giờ tới hạn: **Nộp báo cáo giữa kỳ** · bạn, Bình, Chi và 4 người khác · **Xem việc**" / "Còn 2 giờ tới hạn: …". Không ghi lại ngày giờ của hạn. Tên việc đậm 600 `text-primary`, cắt ở ranh giới từ, tối đa **60 ký tự** + "…". Tên người là **chữ thường** `text-secondary` (không phải mention, không đậm): tối đa **3**, người đang xem đứng đầu nếu được giao (ghi "bạn"), còn lại theo lúc được giao, rồi "và N người khác"; không còn người được giao nào xem được kênh → tên người tạo. "**Xem việc**" (đậm, `primary`, như "· **Xem**" của tin ghim) → S-TASK-02; chạm phần còn lại không làm gì; việc đã xóa / mất quyền → S-TASK-02 `lost-access` |
| Cuộc gọi (DM / Group DM, v1.9, CR-25 #1, #2) | xem bảng dưới | Ghi ai gọi, theo người xem |

**Tin hệ thống cuộc gọi** (v1.9, thay "Cuộc gọi nhỡ · Gọi lại" / "Cuộc gọi đã kết thúc · 12 phút"). `{Người gọi}` = "**Bình** đã gọi" hoặc "**Bạn** đã gọi"; gọi video (theo `has_video` lúc bắt đầu, bật / tắt camera sau đó không đổi): "**Bình** đã gọi video". Tên người gọi đậm 600 `text-primary` như mọi tin hệ thống.

| Kết quả | Icon 16 | Chữ |
|---|---|---|
| Nhỡ (không ai nghe; người nhận bận) | `phone-missed` (`danger`) | "{Người gọi} · Cuộc gọi nhỡ · **Gọi lại**" |
| Bị từ chối | `phone-off` | "{Người gọi} · Cuộc gọi bị từ chối · **Gọi lại**" |
| Không kết nối được (15 giây không có media) | `phone-off` | "{Người gọi} · Không kết nối được · **Gọi lại**" (không thời lượng) |
| Có thời lượng | `phone` / `video` | "{Người gọi} · 12 phút" (dưới 1 phút: "dưới 1 phút"; từ 60 phút: "1 giờ 2 phút") |

"**Gọi lại**" (đậm, `primary`) gọi **đúng loại cũ** (thoại / video). Dòng cuối ở `DMRow`: C-32.

### Tương tác & accessibility
- Cả tin là một phần tử đọc: "Bình, 20:04: Mọi người ơi…, 3 cảm xúc" (giờ đọc theo đúng chữ hiện: "Bình, hôm qua 20:00: …"); tin gộp cũng đọc tên + giờ của chính nó; hành động phụ (Trả lời, Thả cảm xúc) qua `accessibilityActions` thay cho nhấn giữ.
- `ReactionChip`: emoji 16 + số `label`; nền `surface-2`; mình đã thả: viền 1 `primary` + nền `surface-3`. Đọc "Thích, 3 người, bạn đã thả".

### Chữ dài & 200%
Nội dung xuống dòng tự do; tên + giờ xuống 2 dòng được (tên cắt `…` trước khi giờ bị thiếu chỗ — giờ luôn đủ); chip reaction xuống hàng; code block cuộn ngang; ảnh giữ kích thước. Chip link NezFocus: một dòng, cắt theo luật ở bảng Nội dung đặc biệt (tên server trước, tên kênh sau).

### Checklist duyệt
- [ ] 7 biến thể × theme tối; `default`, `mention`, `system` cả hai theme.
- [ ] Trạng thái gửi `sent`, `pending`, `retrying`, `failed`, `failed · file-blocked`; `failed` đọc được không cần màu.
- [ ] Mọi loại nội dung đặc biệt có một ví dụ chữ thật.
- [ ] (v1.9) Giờ đầu tin 3 dạng ("20:02", "Hôm qua 20:00", "16/10/2026 20:00"); `highlight` (2 khung: nền `surface-2` và nền thường) + `highlight` trên tin `mention`; `lifted` của tin gộp có "20:04" ở cột avatar.
- [ ] (v1.9) Chip link NezFocus: kênh, phòng học, voice, server khác (dài, co tên server), link tin (cùng server / server khác / DM), "Không xem được".
- [ ] (v1.9) Thẻ xem trước `large`, `small`, `text`, video (▶); thẻ âm thanh (đang phát / dừng); thẻ PDF.
- [ ] (v1.9) Tin hệ thống nhắc hạn mới (có "bạn, Bình, Chi và 4 người khác"; tên việc dài cắt 60 ký tự); 4 kết quả cuộc gọi × "Bình đã gọi" / "Bạn đã gọi video".

**Xem ở màn (22/10/2026, không vẽ lại trên bảng):** `blocked` — S-HOME-01 `blocked-message`; `pinned` — S-HOME-03 `pins`; `pending` / `retrying` / `failed` / rate limit — S-HOME-01 `message-states`, `rate-limited`; tin hệ thống — S-HOME-01 `system-messages`; nội dung đặc biệt (code, quote, embed, ảnh, tệp) — S-HOME-01 `message-states`, S-HOME-EDGE `long-message`. **v1.9:** `highlight` — S-HOME-01 `message-link`, `from-notification`; chip — S-HOME-01 `nezfocus-links`; thẻ lời mời — S-HOME-01 `invite-cards`; ảnh / video / âm thanh / PDF / docx — S-HOME-01 `attachments`; `failed · file-blocked` — S-HOME-01 `message-states`; tin cuộc gọi — S-DM-02 `default`, S-CALL-01 `busy` / `declined` / `no-answer`.

---

## C-11 · Composer (18/10/2026, area 02)

**Mục đích:** soạn và gửi tin. **REQ:** MSG-01/03/04/06, SRS 3.4, 3.5. **Dùng ở:** S-HOME-01, S-HOME-08, S-DM-02.

### Cấu tạo
```
 [Dải ngữ cảnh: Đang trả lời Chi                 x]   ← tùy chọn, cao 36, nền surface-2
 [AttachmentTray]                                     ← tùy chọn (C-29)
 (+)  [ Nhắn #hoi-dap                 ]  (☺)  (➤)
```
Nền `surface-1`, kẻ trên `border`, đệm `space-2`. Ô nhập `TextField` nền `surface-2`, `rounded.input`, cao 40 → tối đa 5 dòng rồi cuộn trong ô. `IconButton` 48 cho `+`, `☺`, `➤`.

### Trạng thái

| State | Khác gì |
|---|---|
| `empty` | Placeholder "Nhắn #ten-kenh" (DM: "Nhắn Bình"); ➤ `disabled` (`text-tertiary`) |
| `typing` | Có chữ hoặc tệp: ➤ màu `primary` |
| `reply` | Dải "Đang trả lời **Chi**" + `x` |
| `edit` | Dải "Đang sửa tin nhắn" + `x`; ➤ đổi thành `check` |
| `uploading` | Có `AttachmentTray` |
| `char-counter` 🆕 (v1.9, CR-19 #4) | Còn ≤ 200 ký tự tới giới hạn 2000: "còn 200" `label` `text-tertiary` ở góc phải dưới ô nhập (bên trong ô, trên dòng chữ cuối) |
| `too-long` 🆕 (v1.9, CR-19 #4) | Vượt 2000: số âm "−12" `label` màu `danger` ở cùng chỗ + dòng trên ô soạn (trên dải ngữ cảnh / khay nếu có) icon `circle-alert` + "Tin nhắn dài quá 2000 ký tự" `label` `danger`; ➤ `disabled`. Chữ dán vào **không** bị cắt bớt (để user tự sửa) |
| `tray-error` 🆕 (v1.9, CR-19 #7) | Khay có ô `rejected` / `failed` (C-29): dòng dưới khay `label` `danger` nêu lý do (bảng dưới); ➤ vẫn bấm được nhưng không gửi |
| `disabled` | Thay cả hàng bằng dòng `label` `text-secondary` có icon: `lock` "Bạn không có quyền gửi tin nhắn trong kênh này" · `timer` "Bạn đang bị tạm khóa đến 21:30 · chưa gửi tin được" (khác ngày: "đến 21:30, 20/10" — v1.9, CR-17 #1, thay "tạm khóa chat tới") · DM: "Bạn không thể nhắn tin cho người này" (area 09) |
| `no-attach` | Không có quyền `ATTACH_FILES`: ẩn `+` |
| `keyboard-open` | Nằm ngay trên `OS/Keyboard` |

**Bộ đếm ký tự** (v1.9, CR-19 #4) chạy ở mọi chế độ, cả `edit`. Đếm như backend: chuẩn hóa NFC rồi đếm code point, một hàm dùng chung trong `packages/shared`. Backend vẫn trả `40001` cho 2001 ký tự. `accessibilityLabel` của ô thêm "còn 200 ký tự" / "dài quá 12 ký tự".

**Dòng dưới khay** (v1.9, CR-19 #7; thay dòng "Đang tải lên 1/3" ở C-29 về đây cho một chỗ):

| Tình huống | Chữ (`label`) |
|---|---|
| Đang tải | "Đang tải lên 1/3" `text-secondary` |
| `40014` (ảnh) | "cong-thuc.png không phải tệp ảnh thật nên không gửi được" `danger` |
| `40014` (loại khác) | "{tên} không đúng loại tệp nên không gửi được" `danger` |
| `40019` | "{tên} không an toàn nên không gửi được" `danger` |
| Bấm ➤ khi còn ô `rejected` / `failed` | "Gỡ hoặc thử lại tệp lỗi để gửi" `danger` (thay dòng lý do; không gửi) |

Tệp bị chặn **trước khi vào khay** (tệp thực thi / cài đặt, media ngoài danh sách) không có dòng này mà là Toast — C-29.

- Enter xuống dòng; chỉ ➤ gửi (SRS 3.4). Gửi xong: ô xóa trắng, bàn phím vẫn mở.
- Gõ `@` hoặc `#` → `MentionSuggest` (C-27) phía trên. `☺` đổi bàn phím thành `EmojiPicker` (C-25) cùng chiều cao; chạm ô nhập trở lại bàn phím chữ.
- Gửi typing tối đa 1 lần / 8 giây khi đang gõ (MSG-06, DEC-33).
- Bản nháp giữ theo kênh khi rời kênh, mất khi thoát app.

### Checklist duyệt
- [ ] 8 state; `disabled` 2 lý do; khung 360.
- [ ] (v1.9) `char-counter` ("còn 120"), `too-long` ("−12" + dòng lỗi, ➤ mờ), `tray-error` (3 lý do + "Gỡ hoặc thử lại tệp lỗi để gửi"); `disabled` chữ tạm khóa mới.

**Xem ở màn (22/10/2026):** `uploading` — S-HOME-05 `uploading`; `keyboard-open` — S-HOME-01 `keyboard-open`; `disabled` tạm khóa — S-HOME-01 `timed-out`; `no-attach` chưa có frame (chỉ ẩn nút `+`). **v1.9:** `char-counter` / `too-long` — S-HOME-01 `char-counter`; `tray-error` — S-HOME-05 `rejected`.
- [ ] Ở 200%: ô nhập cao theo chữ, 3 nút giữ 48, placeholder cắt `…`.

---

## C-12 · TaskRow (18/10/2026, area 02)

**Mục đích:** một task trong Task Board (S-HOME-03) và Việc cần làm (S-TASK-01). **REQ:** STUDY-06, STUDY-08.

```
 (○)  Nộp báo cáo giữa kỳ                     (A)(B)    ← ô trạng thái 24 · tiêu đề body (2 dòng) · avatar 20 chồng
      [calendar] Thứ 6, 23/10 · Ôn thi Giải tích 2      ← label, text-secondary; ở S-TASK-01 thêm tên server (bỏ khi đang lọc một server), ở Task Board chỉ hạn
```

| Phần | Luật |
|---|---|
| Ô trạng thái | `todo`: vòng rỗng `border-input` · `doing`: vòng nửa đặc `primary` · `done`: vòng đặc `success` + `check`, tiêu đề gạch ngang `text-tertiary` (canvas pen.dev không giữ gạch ngang nên frame chỉ có `text-tertiary`; code vẫn gạch). Chạm ô → đổi trạng thái (nếu có quyền; không có quyền thì ô không bấm được, không hiện) |
| Deadline | Dạng **"ngày · giờ"**, **luôn có giờ** (chốt 22/10/2026; v1.9, CR-20 #5): hôm nay "Hôm nay · 21:00" · ngày mai "Ngày mai · 23:59" · trong 7 ngày tới "Thứ 6, 23/10 · 23:59" · xa hơn "05/11 · 23:59"; ghi năm chỉ khi khác năm hiện tại ("05/01/2027 · 09:00"); không có hạn: icon `calendar-off` + "Không hạn". Quá hạn: icon `alarm-clock-off` + "Quá hạn · 16/10 · 23:59"; quá hạn trong hôm nay: "Quá hạn · Hôm nay · 21:00" — màu `danger` (icon + chữ, không chỉ màu). Không dùng dấu phẩy giữa ngày và giờ |
| Hàng Xong (v1.9, CR-20 #6) | Việc Xong **không bao giờ** "Quá hạn": dòng phụ là icon `check` + "Xong · {ngày} · {giờ}" theo `completed_at` ("Xong · Hôm nay · 20:12", "Xong · 15/10 · 21:40", năm khi khác năm) **thay** cho hạn, `text-secondary` (không `danger`, không `success`). Hạn của việc Xong chỉ ở S-TASK-02 |
| Dòng phụ một dòng (v1.9, CR-20 #5) | Thiếu chỗ (khung 360) thì **cắt tên server trước** ("Quá hạn · 16/10 · 23:59 · Nhóm đồ…"); phần hạn / "Xong · …" không bao giờ bị cắt |
| Assignee | Tối đa 3 `Avatar` 20 chồng (An luôn đầu, nền `primary`), người thứ 4 trở đi gộp thành "+N" (`label` đậm 600, `text-secondary`, cách avatar cuối 10 — không chồng lên avatar); chưa giao: chữ "Chưa giao" `label` `text-tertiary` thay avatar |
| Mất quyền | Dòng phụ thêm icon `eye-off` + "Người được giao mất quyền truy cập" |
| Chạm ô trạng thái (chốt 19/10/2026; luật gửi sửa v1.9, CR-20 #2 — DEC-41) | Công tắc hai chiều: ô rỗng / nửa đặc → **Xong** (gạch ngang tại chỗ + `Toast` "Đã xong · Hoàn tác"); tick xanh → **mở lại** về Cần làm (`Toast` "Đã mở lại · Hoàn tác"). Lần đổi **gửi ngay**; "Hoàn tác" là một lần đổi mới về **trạng thái trước lần chạm** (kể cả "Đang làm"). Toast 6 giây; hàng chỉ đổi nhóm khi toast ẩn (luật hiển thị, không phải luật gửi). Offline / vướng 500 việc: 05 › Edge case |
| Nhấn giữ hàng 🆕 (v1.9, CR-20 #10) | Hàng nhấc lên trên scrim + `ActionSheet` (C-09) tiêu đề là tên việc (1 dòng, cắt `…`): nhóm "TRẠNG THÁI" chọn một "Cần làm" · "Đang làm" · "Xong" (`check` ở trạng thái hiện tại; chỉ khi được đổi trạng thái) · "Sửa" (`pencil`; người tạo / `MANAGE_TASKS`) → S-TASK-03 `edit` · "Sao chép link việc" (`link`; ai xem được việc) → chép `https://nezfocus.app/tasks/<id>`, Toast "Đã sao chép link việc" · "Xóa việc" (`trash-2`, `danger`; người tạo / `MANAGE_TASKS`) → S-TASK-02 `delete-confirm`. Chỉ hiện mục người xem làm được (tối thiểu còn "Sao chép link việc"). Đổi trạng thái từ sheet giống chạm ô (gửi ngay): Toast "Đã chuyển sang Đang làm · Hoàn tác" / "Đã chuyển sang Cần làm · Hoàn tác" / "Đã xong · Hoàn tác"; Task Board: hàng đổi nhóm khi toast ẩn; Việc cần làm: chỉ ô trạng thái đổi (Xong vẫn sang Đã xong khi toast ẩn). Hàng `pending` / lưu thất bại giữ luật cũ (nhấn giữ → "Xóa bản nháp"). Rung nhẹ khi mở; TalkBack: các mục là `accessibilityActions` của hàng |
| 200% | Tiêu đề tối đa 2 dòng ở danh sách; dòng phụ gộp hạn · server thành một chữ xuống dòng tự do (quá hạn: cả dòng `danger`); avatar 28 chuyển xuống nhóm `TR avatars below` dưới dòng phụ, nhóm bên phải ẩn |

State: `default`, `pressed`, `done` (dòng phụ "Xong · …" — v1.9), `overdue`, `overdue-today` (v1.9), `unassigned`, `lost-access`, `pending` (tạo lúc offline, mờ 50%), `lifted` (nhấn giữ, v1.9).

### Checklist duyệt
- [ ] 7 state; tiêu đề dài 2 dòng; ở 200% avatar xuống dưới dòng phụ.
- [ ] (v1.9) `done` với "Xong · Hôm nay · 20:12"; `overdue` "Quá hạn · 16/10 · 23:59"; `overdue-today` "Quá hạn · Hôm nay · 21:00"; ở khung 360 dòng phụ dài nhất "Quá hạn · 16/10 · 23:59 · Nhóm đồ án Mobile" cắt tên server; `lifted` + `ActionSheet` menu hàng việc (đủ mục và bản người chỉ xem: chỉ "Sao chép link việc").

Chữ cái trong avatar 20 dùng `type-tab` (11), avatar 28 (200%) dùng `type-label` — trước 22/10 vẽ cứng 10. **Xem ở màn:** `pressed` không vẽ; `pending` — S-TASK-01 `offline`; `overdue` / các nhóm — S-TASK-01 `default`.

---

## C-25 · EmojiPicker (18/10/2026, area 02)

**Mục đích:** chọn emoji cho reaction hoặc chèn vào tin. **Dùng ở:** S-HOME-04, `Composer`.
Panel cao bằng bàn phím (trong `Composer`) hoặc `BottomSheet` (reaction): `SearchField` "Tìm emoji" (tìm không dấu, từ khóa tiếng Việt và tiếng Anh) · hàng "Dùng gần đây" · lưới 8 cột ô 44 theo nhóm, thanh nhóm ở đáy. Emoji là emoji hệ thống. State: `default`, `search-results`, `search-empty` ("Không tìm thấy emoji").

**Pencil (22/10/2026):** master `EmojiPicker` trên bảng Chat (hàng EmojiPicker, dựng từ sheet của S-HOME-04 `emoji-picker`), kèm instance `search-results` ("tim") và `search-empty` (bật node ẩn `EP empty`). Frame S-HOME-04 `emoji-picker` giữ bản vẽ riêng.

---

## C-26 · ServerRail (18/10/2026, area 02)

**Mục đích:** cột chuyển server trong drawer trái. **REQ:** SRS 3.1, NOTIF-01. Rộng 72, nền `bg`, cuộn dọc.

| RailItem | Hình |
|---|---|
| `dm` | Ô 48 `rounded.server` nền `surface-2`, icon `message-circle` |
| `server` | Ảnh server 48 `rounded.server`; chưa có ảnh: chữ cái đầu của 2 từ đầu ("ÔT") `label` đậm 700 trên `surface-2` |
| `add` | Ô 48 viền đứt `border-input`, icon `plus` `primary` |
| Kẻ chia | 32 × 2 `border` dưới `dm` |

State mỗi ô: `default`, `selected` (vạch trái 4 × 40 `text-primary`, bo phải), `unread` (vạch trái 4 × 8), `mention` (`Badge · count` góc dưới phải, viền 3 màu `bg`), `pressed`. Accessibility: tên server + số mention.

---

## C-27 · MentionSuggest (18/10/2026, area 02)

Danh sách nổi trên `Composer`, nền `surface-1`, kẻ trên `border`, tối đa 5 hàng 48 (cuộn nếu nhiều hơn; có nhóm vẫn tối đa 5 hàng): `Avatar` 24 + tên đậm + username `text-tertiary` (người) · `hash` + tên kênh. **Khớp người** (chốt 31/10/2026) theo **tên hiển thị và username**: chuỗi gõ khớp đầu tên hoặc đầu một từ (từ trong username tách bởi `.` / `_`), không phân biệt dấu và hoa thường — "@bi" → Bình; "@tr" → Bình qua `binh.tran`, Mai qua `mai.tran`. Ưu tiên người online, rồi theo tên. `@everyone` / `@here` cuối danh sách, chỉ khi có `MENTION_EVERYONE`.

**Nhóm** (v1.9, CR-19 #14): tiêu đề nhóm "THÀNH VIÊN" / "VAI TRÒ" / "KÊNH" (`label` 600 `text-tertiary`, cao 28). Thứ tự khi gõ `@`: THÀNH VIÊN → VAI TRÒ → `@everyone` / `@here`. **VAI TRÒ:** vai trò bật "Cho phép nhắc" (`is_mentionable`), hoặc mọi vai trò (trừ `@everyone`) nếu người gõ có `MENTION_EVERYONE`; hàng 48: icon `users` 24 trong ô tròn `surface-2` + tên vai trò + "{N} thành viên" `label` `text-tertiary`; khớp không dấu ở đầu tên hoặc đầu một từ (như người). DM / Group DM không có nhóm VAI TRÒ. Luật hiệu lực của mention: REQ-MSG-03.

State: `users`, `roles` (v1.9: gõ "@tr" → THÀNH VIÊN Bình (`binh.tran`), Mai (`mai.tran`) + VAI TRÒ "Trưởng nhóm · 2 thành viên", "Quản trị · 1 thành viên" — khớp 02 S-HOME-01 `mention-suggest-roles`), `channels`, `no-match` (ẩn danh sách).

---

## C-28 · MemberRow (18/10/2026, area 02)

Hàng trong danh sách thành viên (drawer Thành viên S-HOME-03, S-HOME-08): `Avatar` 32 + `PresenceDot` 10 · **dòng 1:** tên `body` (offline: `text-secondary`) + username `label` `text-tertiary` cùng dòng (v1.9, CR-25 #14) · bên phải role cao nhất `label` `text-tertiary` — Owner ghi "Owner", không có role ngoài @everyone thì để trống (chốt 21/10/2026, area 08). Thiếu chỗ: cắt username `…` trước, rồi tới tên; role cắt `…` sau username. **Dòng 2** (v1.9, CR-25 #15): `ActivityLine · short` (C-40) khi người đó đang học và người xem được thấy; hàng có dòng 2 cao **56**, không có thì **48**. Thay luật "danh sách chỉ để xem giữ một dòng" (22/10/2026).

**Biến thể `username`** (22/10/2026, master `MemberRow/username`; giữ nguyên ở v1.9): hàng 56, username nằm **dưới** tên, `label` `text-tertiary`, cắt 1 dòng; không có dòng hoạt động. **Luật:** mọi danh sách để **chọn hoặc xử lý** một người dùng biến thể này (08 thành viên / chọn Owner / thêm vào vai trò / quyền kênh, 05 chọn và danh sách người được giao, hàng "Người tạo" ở S-TASK-02 — v1.9, CR-20 #7, 09 thành viên nhóm / S-DM-03) để phân biệt người trùng tên. **Danh sách chọn nhiều người:** `Checkbox` nằm **bên phải** hàng (05 chọn người được giao, 08 thêm vào vai trò, 09 tạo nhóm).

Biến thể `in-room` (nhóm "TRONG PHÒNG" của S-HOME-08 drawer): icon mic nhỏ bên phải thay role theo luật chỉ báo của C-07 (`mic` khi bật, `mic-off` `text-tertiary` khi bị quản trị tắt tiếng, không icon khi tự tắt — v1.9, CR-13); không có dòng hoạt động.

State: `default`, `pressed`, `offline`, `deleted` ("Tài khoản đã bị xóa", không username, không dòng hoạt động), `activity` (v1.9: có dòng 2), `self` (v1.9, biến thể `username` ở hàng Người tạo: tên + "(bạn)"), `left-server` (v1.9, biến thể `username`: tên + "(đã rời server)", không `PresenceDot`). Ở 200%: username xuống dòng riêng dưới tên, một dòng cắt `…`; role xuống dòng dưới username; dòng hoạt động vẫn một dòng theo luật cắt của C-40.

**Pencil:** master `MemberRow` ở bảng Chat (hàng Lists, có `offline`); master `MemberRow/username` ở bảng **C-34** (hàng MemberRow/username: master, `offline`, `deleted`). Avatar 32 + PresenceDot 10 giữ kích thước số theo C-13 (cỡ avatar không có token riêng). **Xem ở màn:** `in-room` — drawer S-HOME-08 `members-drawer`; chọn nhiều có `Checkbox` — S-SET-02 `role-members-add`, S-TASK-03 `assignee-picker`. **v1.9:** dòng 1 có username + `activity` — S-HOME-03 `members`, S-HOME-08 `members-drawer`; `self` / `left-server` — S-TASK-02 hàng Người tạo.

**Checklist (v1.9):** master `MemberRow` vẽ lại dòng 1 tên + username; thêm `activity` (cao 56, "Tập trung · còn 18 phút"); tên dài cắt username trước ("Nguyễn Thị Phương Th…" không còn username) và role cắt sau; 200% username xuống dòng; `MemberRow/username` thêm `self` "(bạn)" và `left-server` "(đã rời server)".

---

## C-29 · AttachmentTray (18/10/2026, area 02)

Hàng cuộn ngang trên ô nhập của `Composer`, **một hàng cao 64**, nút `x` 24 góc trên phải mỗi ô (vùng chạm 48), `rounded.input`.

**Ô** (v1.9, CR-19 #9):
- **Ảnh:** 64 × 64, thumbnail.
- **Tệp không phải ảnh:** 64 × 160: icon loại 24 + tên `label` 500 một dòng, **cắt giữa giữ đuôi** ("de-giua…2025.pdf") + cỡ `label` `text-tertiary` ("1,8 MB" — một chữ số thập phân, dấu phẩy). Frame ghi sẵn chuỗi đã cắt.
- Trạng thái có lớp phủ (`uploading`, `checking`, `failed`, `rejected`): chữ trạng thái thay tên + cỡ; TalkBack vẫn đọc tên đầy đủ: "de-giua-ky-2025.pdf, đang tải lên 62%".

| State mỗi ô | Hình |
|---|---|
| `uploading` | Vòng tiến độ trên scrim `bg` 60%; ô tệp: "Đang tải 62%" |
| `checking` 🆕 (v1.9, CR-19 #7) | Tải xong, chờ `complete`: lớp phủ scrim + vòng xoay nhỏ + "Đang kiểm tra" |
| `done` | Như ô thường |
| `failed` | Icon `rotate-cw` (chạm thử lại), viền 2 `danger` |
| `rejected` 🆕 (v1.9, CR-19 #7) | Bị từ chối ở bước kiểm tra (`40014`, `40019`): viền 2 `danger`, lớp phủ, icon `file-x` + "Bị chặn"; **chỉ gỡ được** (không thử lại) |

Dòng dưới khay (tiến độ, lý do bị chặn): C-11 › Dòng dưới khay.

**Chặn trước khi vào khay** (v1.9, CR-19 #5): tệp thực thi / cài đặt (.exe, .msi, .apk, .aab, .bat, .cmd, .scr, .jar, .dll) và media chọn từ "Ảnh & video" có MIME ngoài danh sách (vd video .3gp, .mov) không vào khay; Toast "Không gửi được tệp .exe" · nhiều tệp: "Không gửi được 2 tệp vì loại tệp không hỗ trợ". Đuôi lạ khác vẫn vào khay, bước kiểm tra quyết theo nội dung. Ảnh HEIC / HEIF được chuyển sang JPEG trên máy trước khi tải (ô hiện như ảnh thường).

**Checklist (v1.9):** ô ảnh 64 × 64 và ô tệp 64 × 160 × `uploading` / `checking` / `done` / `failed` / `rejected`; tên tệp dài cắt giữa giữ đuôi; khay 3 ô cuộn ngang ở khung 360.

---

## OS/ShareSheet (18/10/2026, area 02)

Bảng chia sẻ của Android, cùng loại với `OS/StatusBar` / `OS/Keyboard`: chỉ để dựng frame `share-sheet`. Nền `surface-1`, đoạn chữ soạn sẵn ở đầu, hàng ứng dụng (Zalo, Messenger, Gmail, Sao chép), lưới ứng dụng. Không phải component của app.


## OS/DatePicker, OS/TimePicker (19/10/2026, area 05)

Dialog chọn ngày và chọn giờ của Android (Material), cùng loại với `OS/Keyboard`: chỉ để dựng frame `date-picker` / `time-picker`, app gọi bộ chọn của hệ điều hành. DatePicker: tiêu đề "Chọn ngày" + ngày đang chọn, lịch tháng, tuần bắt đầu thứ 2 (locale vi), hôm nay có viền, ngày đang chọn nền `primary`; ngày đã qua mờ khi màn hình đặt `minimumDate` (hạn task). TimePicker: 24 giờ, giờ / phút trong hai ô lớn (Unbounded), mặt số hai vòng (0–11 ngoài, 12–23 trong). Nút "Hủy" / "OK" theo chữ của hệ điều hành. Không phải component của app.
---

## C-30 · FilterChip (19/10/2026, area 05)

**Mục đích:** chọn một (hoặc nhiều) giá trị trong một hàng lựa chọn ngắn. **Dùng ở:** S-TASK-01 (lọc server), S-HOME-07 `edit-settings` (thời hạn, lượt dùng), S-TASK-03 `deadline-sheet` (chip nhanh), S-DM-04 tab Đang chờ ("Lời mời đến · 1" / "Đã gửi · 2" — v1.9, CR-25 #13).

Cao 36 (vùng chạm 48), đệm ngang 14, `rounded.full`. Thường: viền 1 `border`, chữ `body-sm` `text-secondary`. Đang chọn: nền `surface-3`, viền 2 `primary`, chữ `text-primary` đậm 600. Hàng chip cuộn ngang khi thiếu chỗ (không xuống hàng ở danh sách lọc; xuống hàng được trong sheet). Chip đang chọn luôn hiện đủ: chọn một chip bị khuất thì hàng tự cuộn tới nó; mở lại màn hình thì hàng cuộn sẵn tới chip đang chọn (chốt 19/10/2026). Chữ dài cắt `…` ở 1 dòng. State: `default`, `selected`, `pressed`, `disabled`. Accessibility: `radio` (chọn một) hoặc `checkbox` (chọn nhiều) kèm `selected`. **Xem ở màn (22/10/2026):** bảng chỉ có default + selected; các state khác — S-HOME-07 `edit-settings`, S-TASK-01 `filter-server`, S-TASK-03 `deadline-sheet`.

---

## C-31 · NotificationRow (20/10/2026, area 06)

**Mục đích:** một mục trong hộp thư tab Thông báo (S-NOTI-01). **REQ:** NOTIF-05.

```
 (C)@  Chi nhắc tới bạn                     20:01   ← avatar 40 + icon loại 20 · tiêu đề body (≤ 2 dòng) · giờ gửi label, căn phải
       @An thứ 4 họp nhóm lúc 9h ở thư…       ●     ← nội dung body-sm text-secondary, ≤ 2 dòng, cắt … · chấm chưa đọc dưới giờ
       #viec-nhom · Nhóm đồ án Mobile                ← nguồn label text-tertiary, 1 dòng (cắt tên server trước)
       [ Chấp nhận ]  [ Từ chối ]                       ← chỉ friend_request chưa trả lời
```

| Phần | Luật |
|---|---|
| Hình bên trái | Loại có người gây ra: `Avatar` 40 + ô icon loại 20 (icon 12) ở góc dưới phải (nền `surface-3`, viền 2 màu nền): `mention` `at-sign` · `reply` `reply` · `friend_request` `user-plus` · `missed_call` `phone-missed` (icon `danger`) · `task_assigned` `list-checks` (avatar người giao — v1.9, CR-21 #1) · `friend_accepted` `user-check` (avatar người chấp nhận — v1.9, CR-21 #6). Loại hệ thống: ô vuông 40 `rounded.input` nền `surface-2`, icon 20 `text-secondary`: `task_reminder` `alarm-clock` · `task_unassigned` `user-x` · `owner_transferred` `crown` · `moderation` `shield-alert` (thêm 22/10/2026) · `report_reviewed` `flag` · `reports_pending` `flag` (v1.9, CR-18 #7, #8) |
| Tiêu đề | `body`, một kiểu chữ cho cả dòng (không in đậm riêng tên); tối đa 2 dòng (200%: 3 dòng), cắt `…`. Tên kênh không nằm trong tiêu đề mà ở dòng nguồn. Câu chữ từng loại: 06 › Nội dung chữ |
| Cột phải (chốt 20/10/2026) | Giờ gửi `label` `text-tertiary` căn phải, cùng dòng tiêu đề; chấm chưa đọc ngay dưới giờ. Cột rộng theo giờ, mọi hàng thẳng một cột |
| Nội dung · nguồn | Nội dung (preview tin, "Hạn 18/10 · 21:00", lý do; `friend_request`: **lời nhắn** của lời mời, ≤ 2 dòng cắt `…`, không có lời nhắn thì không có dòng — v1.9, CR-25 #12) ≤ 2 dòng; nguồn luôn "#{kênh} · {Server}" (hoặc username / loại cuộc gọi / "{Server}" / "Tin nhắn riêng" khi không có kênh), 1 dòng, cắt tên server trước. Chiều cao hàng có trần: cao nhất ≈ 130 (+ 46 khi có nút) |
| Ngày giờ trong nội dung (23/10/2026; dạng sửa v1.9, CR-21 #4) | Ghi **ngày giờ tuyệt đối** kiểu "ngày · giờ": "Hạn 18/10 · 21:00" (năm khi khác năm: "Hạn 05/01/2027 · 09:00"), thay "Hạn 21:00, 18/10", vì chữ của mục đứng yên từ lúc gửi; không dùng "Hôm nay" / "Ngày mai". Tiêu đề nhắc hạn "Còn 24 giờ tới hạn: …" / "Còn 2 giờ tới hạn: …" là chữ cố định theo mốc nhắc, được dùng (bỏ luật "không ghi 'Còn N giờ'" — CR-21). Khác chủ ý với hạn trong `TaskRow` (C-12, "Hôm nay · 21:00") vì danh sách việc luôn tính lại theo giờ hiện tại |
| Chưa đọc | Chấm 8 `primary` dưới giờ gửi + tiêu đề 600. Đã đọc: tiêu đề 400, không chấm. Không đổi nền hàng |
| Nút | `friend_request` chưa trả lời: `Button · primary · S` "Chấp nhận" + `Button · secondary · S` "Từ chối" dưới dòng meta, cách 8; đã chấp nhận: một `Button · secondary · S` "Nhắn tin". `friend_accepted` (v1.9): một `Button · secondary · S` "Nhắn tin" → S-DM-02; chạm thân hàng → S-HOME-10 `friend`. 200%: hai nút xếp dọc, rộng hết cột chữ |
| Khung | Đệm 16 ngang, 12 dọc; cột chữ cách hình 12; hàng chia bằng kẻ mảnh `border` thụt lề từ cột chữ (Operate, DESIGN.md › Layout) |
| Accessibility | Cả hàng là một nút; `accessibilityLabel` = "Chưa đọc. " (nếu có) + tiêu đề + preview + meta; nút kết bạn là phần tử riêng |

State: `unread`, `read`, `pressed`, `friend-pending`, `friend-accepted`, `offline-disabled` (nút kết bạn `disabled` + dòng "Cần kết nối mạng để trả lời lời mời"), `deleted-actor` (avatar `deleted`, "Tài khoản đã bị xóa").

**Đừng nhầm** (v1.9, CR-21 #8): state `friend-accepted` là hàng `friend_request` **của người nhận** sau khi họ bấm "Chấp nhận" (nút thành "Nhắn tin"); loại `friend_accepted` là mục mới **của người gửi** ("Giang đã chấp nhận lời mời kết bạn" · "giang.vo" · "Nhắn tin").

### Checklist duyệt
- [ ] 6 loại (mention, reply, friend_request, missed_call, task_reminder, task_unassigned) × unread / read; thêm `owner_transferred` (crown) và `moderation` (shield-alert) × unread / read — vẽ 22/10/2026 ở bảng Chat.
- [ ] (v1.9) 4 loại mới × unread / read: `task_assigned` ("Bình giao cho bạn: Nộp báo cáo giữa kỳ" · "Hạn 20/10 · 23:59" — hạn lúc giao, sau đó đổi sang 23/10 (05 `history`) · "#viec-nhom · Ôn thi Giải tích 2"), `friend_accepted` (+ "Nhắn tin"), `report_reviewed` ("Báo cáo của bạn về tin nhắn của Vũ đã được xem xét" · "#hoi-dap · Nhóm đồ án Mobile" — khớp 06 `report-reviewed`; báo cáo tin của Khánh ở Ôn thi Giải tích 2 vẫn đang chờ ở 08), `reports_pending` ("Có báo cáo mới cần xem ở Ôn thi Giải tích 2"); `task_reminder` sửa chữ ("Còn 2 giờ tới hạn: Đọc tài liệu chương 5" · "Hạn 18/10 · 21:00"); `friend_request` có lời nhắn.
- [ ] Chưa đọc phân biệt được khi chụp đen trắng.

---

## C-32 · DMRow, C-33 · FriendRow (20/10/2026, area 09)

**DMRow** — một cuộc trò chuyện trong S-DM-01 (drawer, rộng 262 ở khung 390). **REQ:** DM-01/03, GDM-01, NOTIF-01.

```
 (C)●  Chi                                20:08   ← Avatar 40 + PresenceDot 10 · tên body · giờ label text-tertiary căn phải
       Mai đi thư viện không?              (1)    ← dòng cuối body-sm text-secondary, 1 dòng, cắt … · Badge count
```

| Phần | Luật |
|---|---|
| Hình | 1-1: `Avatar` 40 + `PresenceDot` 10 (không chấm khi ngoại tuyến hay tài khoản đã xóa). Group DM: 2 `Avatar` 28 chồng chéo (người gửi gần nhất + người kế), không PresenceDot |
| Chưa đọc | Tên và dòng cuối đậm 600, dòng cuối `text-primary`; `Badge · count` số tin chưa đọc dưới giờ. Đã đọc: tên 400 (500 cho dễ đọc), dòng cuối `text-secondary`, không badge |
| Dòng 2 (v1.9, CR-25 #16) | 1-1: người kia đang học (và mình được thấy, luật CR-24 #1) **và** cuộc trò chuyện không có tin chưa đọc → `ActivityLine · short` (C-40) thay tin cuối; có tin chưa đọc → tin cuối (đậm) được ưu tiên. Group DM không có hoạt động |
| Tin cuối là cuộc gọi (v1.9, CR-25 #1) | "Cuộc gọi nhỡ" · "Cuộc gọi bị từ chối" · "Không kết nối được" · "Cuộc gọi · 12 phút" / "Cuộc gọi video · 12 phút" |
| Không username | DMRow **không** có username (khác C-28, C-33, C-04 `dm` — v1.9, CR-25 #14) |
| Chữ dài | Tên 1 dòng cắt `…`, giờ luôn hiện; dòng cuối 1 dòng cắt `…` (200%: 2 dòng); dòng hoạt động một dòng theo luật cắt của C-40 |

State: `default`, `unread`, `pressed`, `selected` (đang mở cuộc này: nền `surface-2`), `group`, `deleted` (avatar `deleted`, "Tài khoản đã bị xóa"), `activity` (v1.9: dòng 2 là hoạt động), `call` (v1.9: dòng cuối là cuộc gọi). Nhấn giữ hàng DM 1-1 → `ActionSheet` "Đóng cuộc trò chuyện" · "Đánh dấu đã đọc" · "Chặn" (`danger`) / "Bỏ chặn" (v1.9, CR-25 #9; màn: 09 S-DM-01 `close-dm`).

**FriendRow** — một người trong S-DM-04 / S-DM-03 (cấu tạo mới v1.9, CR-25 #13, #14):

```
 (G)●  Giang  giang.vo                                   ← dòng 1: tên body + username label text-tertiary
       Tập trung · còn 18 phút · Phòng học im lặng       ← dòng 2: ActivityLine · full, hoặc trạng thái bằng chữ
                                          [💬] [⋯]
```

| Phần | Luật |
|---|---|
| Hình | `Avatar` 40 + `PresenceDot` 10 |
| Dòng 1 | Tên `body` + username `label` `text-tertiary` cùng dòng; thiếu chỗ cắt username `…` trước, rồi tới tên. 200%: username xuống dòng riêng, một dòng cắt `…` |
| Dòng 2 | `ActivityLine · full` (C-40) nếu đang học và mình được thấy; không thì trạng thái bằng chữ `label` `text-secondary`: "Trực tuyến" / "Vắng mặt" / "Không làm phiền" / "Ngoại tuyến". Tab Đã chặn: không có dòng 2 (hàng một dòng) |
| Bên phải | `IconButton` 💬 + ⋯ (bạn bè), `Checkbox` (chọn người ở S-DM-03), "Bỏ chặn" (đã chặn) |
| Hàng lời mời (tab Đang chờ) | Dòng 1: tên + username + **thời điểm căn phải** (`label` `text-tertiary`: "19:48" / "Hôm qua" / "15/10" / "15/10/2025", theo 09 › Quy ước Thời gian). Dòng 2: lời nhắn trong ngoặc kép `body-sm` `text-secondary`, **hiện đủ** (≤ 150 ký tự, xuống dòng tự do), hoặc "Không có lời nhắn" `text-tertiary`. Nút **dưới chữ**: lời mời đến "Chấp nhận" (`primary · S`) / "Từ chối" (`secondary · S`); đã gửi "Hủy lời mời" (`secondary · S`) |

State: `default`, `pressed`, `offline` (tên `text-secondary`), `disabled` (đã trong nhóm / vượt giới hạn: mờ 50%), `activity` (v1.9), `request-in` / `request-out` (v1.9, có / không lời nhắn), `blocked` (một dòng). Hàng chọn người ở S-DM-03 (có `Checkbox`) **giữ nguyên như đã vẽ** — không theo cấu tạo mới, không có dòng hoạt động (CR-25 #14).

### Checklist duyệt
- [ ] DMRow 6 state; FriendRow 5 kiểu phải × default / offline.
- [ ] (v1.9) DMRow `activity` ("Tập trung · còn 18 phút"), `unread` khi người kia đang học (tin cuối thắng), `call` (4 chữ cuộc gọi). FriendRow vẽ lại theo cấu tạo mới: bạn bè có hoạt động / có trạng thái chữ; lời mời đến có lời nhắn + thời điểm; đã gửi "Hủy lời mời" + "Không có lời nhắn"; đã chặn một dòng; tên dài cắt username trước; 200%.

**Bảng Chat (22/10/2026):** DMRow master + `unread`, `group` (Bình + Chi); FriendRow master + lời mời đến, đã gửi, đã chặn, chọn (S-DM-03) — các ô FriendRow vẽ lại ở v1.9. **Xem ở màn:** DMRow `selected` / `pressed` / `deleted` — S-DM-01 `default`, `close-dm`; FriendRow `offline` — S-DM-04 `all`, `offline`; `disabled` — S-DM-03 `limit-reached`, `add-to-group`; lời mời — S-DM-04 `pending`, `pending-sent`.

---

## Component P1–P3 — đặc tả sau

Viết chi tiết trước khi làm feature area dùng chúng. Đã biết từ SRS:

| ID | Component | Ưu tiên | Đã biết |
|---|---|---|---|
| C-19 🆕 | `StageView` | P3 (v1.x) | xem screen share: một luồng chiếm vùng Stage, người chia sẻ ghi tên, chuyển xoay ngang; Android phát, iOS chỉ xem — VC-03, DEC-11. **v1.9 (CR-22 #9):** mỗi phòng một màn hình chia sẻ một lúc; người xem (cả Vòng lẫn Lưới) thấy một bố cục: màn hình chia sẻ 16:9 rộng hết khung ngay dưới header → `FocusTimer · compact` (nếu có phiên) → dải `ParticipantTile · video` 72 × 96 cuộn ngang; người chia sẻ thấy thẻ "Bạn đang chia sẻ màn hình" + "Dừng chia sẻ". Luật đủ ở 03; đặc tả component khi làm v1.x |

---

## Câu hỏi còn mở

Không còn câu hỏi mở cho các component P0.

---

## C-34 · RadioRow (21/10/2026, area 10)

**Mục đích:** chọn đúng một mục trong danh sách ngắn. **REQ:** SAFE-01. **Dùng ở:** S-MOD-02 (lý do báo cáo); về sau các lựa chọn một-trong-nhiều ở 07 / 08.

- Hàng cao 56 (vùng chạm cả hàng), icon 22 + nhãn `body`, cách `space-3`. Dòng mô tả tùy chọn (`RR desc`, `label` `text-secondary`) dưới nhãn — có mô tả thì hàng cao theo chữ, icon căn trên (thêm 21/10/2026, S-SET-07). Chưa chọn: icon `circle` màu `text-tertiary`. Đã chọn: `circle-dot` màu `primary`. Phân biệt bằng hình icon, không chỉ bằng màu.
- Nhãn xuống dòng tự do (cả ở 200%), hàng cao theo chữ.
- **Icon loại tùy chọn** (`RR type icon`, 20, `text-secondary`, mặc định tắt — thêm 23/10/2026): nằm giữa nút radio và cột chữ, dùng khi các lựa chọn là các loại đối tượng có icon riêng (S-SET-09: `hash` / `volume-2` / `folder`).
- Accessibility: `accessibilityRole="radio"`, `accessibilityState.checked`; nhóm hàng là `radiogroup`.
- Pencil: master `RadioRow` trong bảng `C-34 · RadioRow · Switch · TriState · MemberRow/username · OS/PermissionDialog` (cùng `OS/PermissionDialog` — hộp thoại quyền Android, chỉ để dựng frame). Mỗi ô trên bảng có chú thích: RadioRow default / selected / có mô tả / selected + mô tả; Switch off / on / disabled; TriState (xem C-20); MemberRow/username (xem C-28).

### Switch (biến thể của C-15, dựng 21/10/2026 khi làm S-SET-07)
- Công tắc 48 × 28 (theo bản đã vẽ ở S-ROOM-03), núm tròn 22, đệm 3. **Bật:** nền `primary`, núm `on-primary` bên phải. **Tắt:** nền `surface-3`, núm `text-secondary` bên trái. **Vô hiệu:** như vị trí hiện tại nhưng mờ 40%, kèm dòng lý do dưới hàng. Phân biệt bật / tắt bằng vị trí núm, không chỉ bằng màu.
- Dùng trong `SettingsRow` (cả hàng bấm được) hoặc đứng riêng trong form (S-ROOM-03 "Nghỉ dài"). Đổi giá trị lưu ngay nếu ở màn cài đặt (08).
- Accessibility: `accessibilityRole="switch"`, `accessibilityState.checked`.
- Pencil: master `Switch` (thuộc tính `on` qua override) trong bảng `C-34 · RadioRow · Switch · TriState · MemberRow/username · OS/PermissionDialog`.

---

## C-35 · InviteEmbed (v1.9, CR-19)

**Mục đích:** thẻ lời mời dưới tin có link `https://nezfocus.app/invite/<code>`, cho vào server ngay trong chat. **REQ:** MSG-02, SRV-04, SRV-07 (CR-19 #12). **Dùng ở:** `MessageBubble` (C-10) ở S-HOME-01, S-HOME-08, S-DM-02.

```
 ┌──────────────────────────────────────────────┐
 │ [ÔT]  Ôn thi Giải tích 2                     │  ← icon server 48 rounded.server · tên body 600 (2 dòng rồi …)
 │       24 thành viên · 6 đang online          │  ← label text-secondary (số của Ôn thi Giải tích 2, như 02 / 10)
 │       [lamp] Mời vào học ở Phòng học im lặng │  ← chỉ lời mời vào phòng
 │ [ Tham gia ]  ghi chú                        │  ← Button · secondary · S + ghi chú label
 └──────────────────────────────────────────────┘
```

- Nằm dưới chữ của tin (chữ link vẫn hiện; chạm chữ link → S-MOD-01 như cũ). Nền `surface-1`, viền 1 `border`, `rounded.button`, đệm 12, rộng hết cột nội dung tin (306 ở khung 390).
- Icon server chưa có ảnh: chữ cái đầu của 2 từ đầu ("ÔT") như `RailItem · server` (C-26).
- Dữ liệu `GET /invites/{code}` lấy khi thẻ lần đầu hiện trên màn, nhớ tới khi rời kênh. Thẻ dựng ở app **theo người xem**, không lưu vào `embeds` (mỗi người xem thấy nút khác nhau).

| State | Trình bày |
|---|---|
| `loading` | Thẻ `Skeleton` cùng khung (ô 48 + 2 dòng + nút) |
| `not-member` | Nút "Tham gia" — vào thẳng, không qua S-MOD-01 (cùng kiểm tra như `POST /invites/{code}/accept`); xong thì đi như S-MOD-01 khi tham gia xong (kênh / phòng đích, màn giải thích quyền thông báo lần đầu vào server) |
| `joining` | Nút "Tham gia" `loading` |
| `member` | Nút "Mở server" + ghi chú "Bạn đã ở server này" `label` `text-tertiary` |
| `room-invite` | Thêm dòng icon `lamp-desk` "Mời vào học ở {phòng}"; đã ở server: nút "Mở phòng" |
| `server-limit` | "Tham gia" `disabled` + icon `info` "Bạn đã ở 100 server, mức tối đa." `label` `text-secondary` |
| `banned` | Chỉ biết khi bấm (`40306`): nút biến mất, icon `circle-alert` "Bạn không thể tham gia {server}" `label` `danger` |
| `invalid` | Lời mời hỏng / hết hạn lúc hiện hoặc lúc bấm (`40041`): thẻ chung icon `link-2-off` 24 `text-tertiary` + "Lời mời không còn hiệu lực" `body-sm` `text-secondary`; không tên server, không nút |
| `offline-tap` | Mất mạng khi bấm: thẻ giữ nguyên + Toast "Cần kết nối mạng để tham gia" |

**Chữ dài & 200%:** tên server 2 dòng rồi `…`; dòng thành viên xuống dòng tự do; ở 200% ghi chú xuống dưới nút.

**Accessibility:** cả thẻ đọc "Lời mời vào Ôn thi Giải tích 2, 18 thành viên, 4 đang online"; nút là phần tử riêng.

### Checklist duyệt
- [ ] 9 state ở theme tối; `not-member`, `member`, `invalid` cả theme sáng; khung 360 (thẻ rộng 276).
- [ ] Tên server dài 2 dòng + `…`; lời mời phòng có dòng `lamp-desk`.

---

## C-36 · MediaViewer (v1.9, CR-19)

**Mục đích:** xem ảnh, PDF, video của tin ngay trong app, toàn màn hình. **REQ:** MSG-04 (CR-19 #8), NFR-MOB-07. **Dùng ở:** S-HOME-11 · Trình xem tệp (02) — mở từ C-10 (ảnh, video, thẻ PDF) ở mọi màn chat.

```
 [‹]  (B) Bình · Hôm qua 20:00                [⇗] [⤓]   ← dải trên
          de-cuong-giai-tich.pdf · 1,8 MB
 ┌──────────────────────────────────────────────────┐
 │                 nội dung (ảnh / trang PDF)        │
 └──────────────────────────────────────────────────┘
                     2 / 3   ·   Trang 3 / 12          ← chỉ số, label
```

- Nền `bg`; nội dung phủ khung (ảnh vừa khung, giữ tỉ lệ). Dải trên nền `surface-1`, thanh trạng thái hệ thống giữ.
- Dải trên: `IconButton` ‹ (đóng) · `Avatar` 24 + tên người gửi `label` 600 + giờ theo luật giờ của C-10 (`label` `text-tertiary`) · dòng 2 tên tệp · cỡ (`label` `text-secondary`, tên cắt giữa giữ đuôi) · bên phải `IconButton` `download` (`accessibilityLabel` "Tải về") → lưu vào Tải xuống + Toast "Đã lưu vào Tải xuống".
- Chạm nội dung: ẩn / hiện dải trên và chỉ số. Vuốt xuống hoặc Back hệ thống: đóng (‹ là lối đóng không cần cử chỉ).

| State | Trình bày |
|---|---|
| `image` | Một ảnh; chụm để phóng to, chạm đúp phóng / thu |
| `image-multi` | Vuốt ngang giữa các ảnh của **cùng tin**; chỉ số "2 / 3" giữa đáy |
| `pdf` | Trang PDF cuộn dọc, chụm để phóng to; chỉ số "Trang 3 / 12"; dải trên thêm `IconButton` `external-link` ("Mở bằng ứng dụng khác") trước nút tải |
| `pdf-error` | Không hiển thị được: icon `file-text` 48 `text-tertiary` + "Không xem được tệp này" `body` + `Button · secondary` "Mở bằng ứng dụng khác", giữa khung |
| `video` | Trình phát của nền tảng (`expo-video`) toàn màn hình; điều khiển của trình phát |
| `loading` | Thumbnail đã có (NFR-MOB-07) phủ khung + vòng xoay nhỏ giữa; PDF: `Skeleton` trang |

- Link đọc trả `Content-Disposition: inline` chỉ cho tệp đã xác nhận là PDF; loại khác không mở ở đây (C-10 › Tệp).
- **Accessibility:** ảnh đọc "Ảnh 2 trên 3, gửi bởi Bình"; PDF đọc "Trang 3 trên 12"; nút có `accessibilityLabel`.

### Checklist duyệt
- [ ] 6 state ở theme tối; `image-multi` và `pdf` cả theme sáng; khung 360; tên tệp dài cắt giữa giữ đuôi.

---

## C-37 · TodayProgress (v1.9, CR-23)

**Mục đích:** cho thấy hôm nay còn bao nhiêu phút nữa là đủ Qualified Day 15 phút. **REQ:** STUDY-03, STUDY-17 (CR-23 #3), DEC-43. **Dùng ở:** khối "Tuần này" của tab Học (S-STUDY-01, giữa dòng chuỗi và biểu đồ), S-STUDY-03 (sau chuỗi + dài nhất).

```
 Hôm nay 14 / 15 phút
 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░      ← cao 6, rounded.full
```

- Nhãn `label` `text-secondary`, số `numeric-inline` (đơn vị "phút" bằng Be Vietnam Pro). Thanh cao 6 `rounded.full`, rộng hết cột, cách nhãn `space-1`: rãnh `surface-2`, phần đầy `primary`.
- **Không mascot, không màu ngữ nghĩa** (đạt 15 phút không đổi sang `success`).
- Cập nhật mỗi phút khi mình đang ở pha Tập trung (phiên chung hoặc một mình); không đếm giây.

| State | Nhãn | Thanh |
|---|---|---|
| `below` | "Hôm nay {14} / 15 phút" | đầy 14/15 |
| `zero` | "Hôm nay 0 / 15 phút" | rãnh trống |
| `reached` | "Hôm nay {45} phút · đã đủ 15 phút" | đầy |

- Không có thanh ở `never-studied` / `empty` (EmptyState thay cả khối). `streak-zero` giữ câu chuỗi "Học 15 phút hôm nay để bắt đầu chuỗi mới" ở dòng chuỗi (04).
- **Accessibility:** `accessibilityRole="progressbar"`, `accessibilityValue` "14 trên 15 phút"; đã đủ: "45 phút, đã đủ 15 phút".
- 200%: nhãn xuống dòng tự do, thanh giữ cao 6.

### Checklist duyệt
- [ ] `below`, `zero`, `reached` × hai theme; khung 360.

---

## C-38 · MonthCalendar (v1.9, CR-23)

**Mục đích:** xem số phút từng ngày của một tháng và ngày nào đủ 15 phút. **REQ:** STUDY-17 (CR-23 #4). **Dùng ở:** S-STUDY-03 khi chọn "Tháng" (thay biểu đồ cột).

```
 Tháng 10/2026 · 8 giờ 25 phút                       ← headline + tổng (numeric-inline)
  T2   T3   T4   T5   T6   T7   CN                    ← label text-tertiary
 ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐
 │1  ││2  ││3  ││4  ││5  ││6  ││7  │                  ← số ngày góc trên trái, label text-tertiary
 │ 25││ — ││ 40││ 12││   ││   ││   │                  ← phút giữa ô, numeric-inline
 └───┘└───┘└───┘└───┘└───┘└───┘└───┘
```

- Tiêu đề "Tháng 10/2026 · 8 giờ 25 phút" (`headline`; số `numeric-inline`, đơn vị Be Vietnam Pro). Hàng thứ T2 … CN (`label` `text-tertiary`, tuần bắt đầu thứ 2). 5–6 hàng tuần.
- Ô: 7 cột chia đều, cách 4 (≈ 46 × 52 ở khung 390, ≈ 42 × 52 ở 360), `rounded.input`. Số ngày góc trên trái `label` `text-tertiary`; giữa ô số phút `numeric-inline` (0 phút: "—"). Không ghi đơn vị trong ô.

| State ô | Hình |
|---|---|
| `reached` | Đủ 15 phút: nền `primary`, số ngày và số phút `on-primary` |
| `below` | Chưa đủ (kể cả 0 phút "—"): viền 1 `border-input`, nền trong suốt, số phút `text-primary` |
| `today` | Viền 2 `text-primary` (chồng lên `reached` / `below`) |
| `future` | Để trống: chỉ số ngày, không viền, không số phút |
| ngày ngoài tháng | Không có ô (chỗ trống) |

- Phân biệt đủ / chưa đủ bằng nền đặc vs viền rỗng (đọc được khi chụp đen trắng), không chỉ bằng màu.
- **Accessibility:** mỗi ô một phần tử: "Thứ bảy 17 tháng 10, 50 phút, đã đủ 15 phút"; tương lai: "Thứ năm 29 tháng 10, chưa tới".
- 200%: số trong ô giới hạn phóng ×1.3 (như nhãn `TabBar`), nhấn giữ ô hiện tooltip đọc đủ; lưới giữ 7 cột; tiêu đề xuống dòng tự do.

### Checklist duyệt
- [ ] Một tháng đủ các state (`reached`, `below` có số, `below` "—", `today` đạt / chưa đạt, `future`), tháng 5 hàng và 6 hàng; hai theme; khung 360.

---

## C-39 · SessionRow (v1.9, CR-23)

**Mục đích:** một dòng trong "LỊCH SỬ PHIÊN" của Thống kê. **REQ:** STUDY-17, STUDY-15 (CR-23 #6). **Dùng ở:** S-STUDY-03 (cuối màn).

```
 [lamp]  Phòng học im lặng · Ôn thi Giải tích 2          50 phút   ← icon 20 · body 600 1 dòng … · numeric-inline
         T7 17/10 · 20:00 – 20:50 · vào 2 lần                       ← label text-tertiary
```

- Hàng 56, **chỉ đọc** (không bấm). Icon 20 `text-secondary`: `lamp-desk` (phiên chung) / `timer` (học một mình). Dòng 1 `body` 600 một dòng cắt `…`: "{phòng} · {server}" / "Học một mình". Phút bên phải `numeric-inline` (đơn vị Be Vietnam Pro); từ 60 phút "1 giờ 5 phút". Dòng 2 `label` `text-tertiary`. Chia hàng bằng kẻ mảnh `border` (Operate).
- **Luật dòng:** phiên chung là **một** dòng cho mình (cộng các lần vào lại; giờ = lần vào đầu → lần rời cuối, thêm "· vào {2} lần"); phòng bắt đầu phiên mới → dòng mới; 1–59 giây "dưới 1 phút"; 0 giây không có dòng; năm khác năm nay thì ghi năm ("T7 17/10/2025 · …").

| State | Trình bày |
|---|---|
| `room` | Như cấu tạo |
| `solo` | Icon `timer`, "Học một mình" |
| `running` | `ChipStatus` "Đang học" (`lamp-desk`) trước phút; dòng 2 "21:11 – bây giờ"; phút tăng mỗi phút; luôn đứng đầu danh sách |
| `multi-join` | Dòng 2 thêm "· vào 2 lần" |
| `under-minute` | Phút: "dưới 1 phút" |
| `cross-midnight` | Dòng 2 "T7 17/10 · 23:30 – 00:40 (T2)" — thuộc kỳ của giờ bắt đầu |
| `cross-period` | Vắt sang kỳ sau: dòng 2 thêm "(40 phút tính cho tuần sau)" / "(… tháng sau)" |
| `room-deleted` | Dòng 1 "Phòng đã bị xóa · {Server}" |
| `no-access` | Mất quyền xem kênh: "Một phòng của {Server}" |
| `left-server` | Đã rời / server bị xóa: "Phòng học" |
| `skeleton` | Hàng `Skeleton` (danh sách tải thêm hiện 2 hàng) |

- Chữ của cả danh sách (trống, lỗi, tải thêm): 04 S-STUDY-03.
- **Chữ dài & 200%:** dòng 1 một dòng cắt `…` (tên server cắt trước); dòng 2 xuống dòng tự do, hàng cao theo chữ; phút không bao giờ bị cắt.
- **Accessibility:** cả hàng một phần tử: "Phòng học im lặng, Ôn thi Giải tích 2, thứ bảy 17 tháng 10, 20 giờ đến 20 giờ 50, vào 2 lần, 50 phút".

### Checklist duyệt
- [ ] 11 state ở theme tối; `room`, `solo`, `running` cả theme sáng; khung 360 với tên phòng + server dài.

---

## C-40 · ActivityLine (v1.9, CR-24, CR-25)

**Mục đích:** cho bạn bè và người cùng server thấy một người đang học / đang ở phòng nào. **Một chỗ** giữ câu chữ, icon và luật cắt của hoạt động học; các hàng chỉ gọi tên dạng. **REQ:** AUTH-05, STUDY-10 (CR-24 #1, CR-25 #15, #16). **Dùng ở:** `DMRow` (C-32, `short`), `MemberRow` (C-28, `short`), `FriendRow` (C-33, `full`), `ChannelHeader · dm` (C-04, `full`), khối hoạt động S-HOME-10 (02, `block`).

**Ai thấy** (luật hành vi ở REQ-AUTH-05 / CR-24 #1, tóm tắt để vẽ đúng): bạn bè và người cùng ≥ 1 server. Không hiện khi người đó đặt Ẩn, tắt "Hiện hoạt động học", có chặn theo bất kỳ chiều nào, ở mọi chỗ `40303`, tài khoản đã xóa; không hiện trên hàng của chính mình và trong Group DM. Không thấy thì hàng hiện như không có hoạt động.

### Câu chữ

| Hoạt động | `short` (DMRow, MemberRow) | `full` (FriendRow, header DM, `accessibilityLabel` của hàng) | Icon 14 |
|---|---|---|---|
| Phòng có phiên, xem được kênh | "Tập trung · còn 18 phút" / "Nghỉ ngắn · còn 4 phút" / "Nghỉ dài · còn 12 phút" | "Tập trung · còn 18 phút · Phòng học im lặng" | icon pha, màu pha (như `PhaseBadge · list`) |
| Phiên tạm dừng | "Tạm dừng" | "Tạm dừng · Phòng học im lặng" (không số) | `pause` `text-secondary` |
| Phòng không có phiên | "Đang ở Phòng thảo luận nhóm" | "Đang ở Phòng thảo luận nhóm" | icon theo loại kênh như `ChannelRow`: `lamp-desk` (Phòng học) / `volume-2` (phòng voice thường), `text-secondary` |
| Không xem được kênh (khác server, kênh riêng tư) | "Đang học cùng nhóm" (có phiên) / "Đang ở một phòng voice" | như `short` — không tên, không thời gian | `lamp-desk` / `volume-2` `text-secondary` |
| Học một mình | "Một mình · còn 105 phút" | "Đang học một mình · Tập trung · còn 12 phút" | icon pha, màu pha |
| Học một mình, đang chờ | "Một mình · hết giờ nghỉ" | "Đang học một mình · Hết giờ nghỉ" | `coffee` như `PhaseBadge · waiting` |

- Chữ `label` `text-secondary`, **cả dòng một kiểu chữ** (Be Vietnam Pro, kể cả số phút — DESIGN.md › Typography, chốt 31/10/2026: Unbounded chỉ cho đồng hồ đếm giây). Chỉ icon mang màu pha (DESIGN.md › Colors, quy tắc 1). "còn N phút" cập nhật **mỗi phút**, không đếm giây (DESIGN.md › Typography); < 1 phút "còn dưới 1 phút".
- **Cắt (một dòng, cả ở 200%):** phần "còn N phút" (tới 3 chữ số) **không bao giờ bị cắt**; tên pha, "Một mình", tên phòng cắt `…` trước. Câu đầy đủ đọc qua `accessibilityLabel` của hàng.

### `block` — khối hoạt động ở hồ sơ (S-HOME-10)
Nền `surface-2`, `rounded.button`, đệm 12: dòng 1 icon 14 theo bảng icon (icon pha mang màu pha) + "Tập trung · còn 18 phút" (`body-sm` 600 `text-primary` — chữ không tô màu pha); dòng 2 tên phòng / "Đang học một mình" / "Đang học cùng nhóm" (`label` `text-secondary`); mỗi dòng một dòng cắt `…` theo luật trên. Vị trí trong sheet và state của màn: 02 S-HOME-10.

### Checklist duyệt
- [ ] `short`: 3 pha, tạm dừng, phòng không phiên, "Đang học cùng nhóm", "Đang ở một phòng voice", một mình, một mình chờ; `full`: 6 dòng tương ứng; `block`: phòng có phiên và học một mình. Hai theme.
- [ ] Khung 360 trong `DMRow` (drawer 262): tên phòng dài cắt trước, "còn 105 phút" còn đủ; 200% vẫn một dòng.

---

## C-41 · Logo, icon app & splash (CR-26, 01/11/2026)

**Mục đích:** dấu hiệu NezFocus ngoài giao diện app: icon trên launcher và màn splash lúc mở app. Luật diện mạo ở `DESIGN.md` › Illustration & Mascot › Logo; hình học lấy từ `nez-mascot` (`ChestLogo`, chữ N trên áo Runtime) — chung với bản web (web 00 X-02). **Board** `C-41 · Logo, icon app & splash` (`prmrg`) ở x 42000, y 0 trong `Des/nezfocus.pen`.

| Phần | Mô tả | Tệp (repo code `apps/mobile/assets/`) |
|---|---|---|
| Icon app | 1024, ô vuông tràn viền `brand-primary`, chữ N trắng 62% | `icon.png` |
| Adaptive · nền | `#547FE4` (`app.config.ts` › `adaptiveIcon.backgroundColor`) | `android-icon-background.png` |
| Adaptive · lớp trước | Chữ N trắng 42% cạnh, trong vùng an toàn 66% — mặt nạ tròn, squircle, bo góc đều không cắt chữ | `android-icon-foreground.png` |
| Adaptive · đơn sắc | Chữ N trắng; Android 13 themed icon tự tô màu | `android-icon-monochrome.png` |
| Splash | Nền `bg` theo theme hệ thống (sáng `#F6F8FE` / tối `#11162A`), chữ N `brand-primary` ~100dp ở giữa; không mascot, không chữ | `splash-icon.png` (chữ N 42% vì Android 12+ cắt tròn 2/3) |

Trong giao diện app chưa có chỗ nào hiện logo (màn đăng nhập dùng chữ "Chào mừng tới NezFocus"). Splash cần cài `expo-splash-screen` khi code (cấu hình ở CR-26 #4).

### Checklist duyệt
- [ ] Icon qua mặt nạ tròn, squircle và themed icon; splash sáng và tối; chữ N không bị cắt ở mặt nạ nào.

---

# Web quản trị — component (CR-27, 01/11/2026)

Component của web quản trị (`apps/admin`, SRS v1.10 › 4.11). Diện mạo riêng của web ở `DESIGN.md` › Web quản trị; hành vi ở REQ-ADMIN-01…06, REQ-SAFE-02. Các skill dùng hồ sơ **web** trong `PLATFORMS.md`. Bản xem trước đã duyệt (vùng x ≥ 66000) chứng minh hệ thống; master dưới đây là bản chính thức.

## Quy ước chung (web quản trị)

| Hạng mục | Quy ước |
|---|---|
| Vùng bấm | ≥ 32 × 32 (WCAG 2.2 yêu cầu 24). Hàng bảng bấm được cả hàng. |
| Trạng thái tương tác | Mọi component bấm được có `default`, `hover` (nền lên một bậc: trên `surface-1` → `surface-2`; trên `bg` → `surface-2`), `focus-visible` (component `focus-ring` của `DESIGN.md`: viền 2 `primary` cách 2; trong hàng bảng thì lùi vào trong), `pressed` (như hover, tối thêm `overlay-pressed` với nút đặc), `disabled` (nói lý do ngay cạnh, không chỉ làm mờ); gọi mạng thì thêm `loading`. Hover và focus không bao giờ là cách duy nhất làm lộ hành động. |
| Bàn phím | Tab theo thứ tự đọc; Enter (và Space với nút) kích hoạt; Esc đóng menu / dialog và trả focus về phần tử đã mở; mũi tên di chuyển trong menu, nhóm lựa chọn, bộ lọc liền nút. |
| Hàng là link | Hàng bảng và mục điều hướng là link thật: Ctrl / ⌘ + bấm hoặc bấm chuột giữa mở tab mới. |
| Chữ dài | pen.dev không có `…`: frame ví dụ ghi sẵn chuỗi đã cắt; code dùng `text-overflow: ellipsis` một dòng ở ô bảng, tiêu đề cột không bao giờ cắt (cột đủ rộng cho nhãn). |
| Thông tin & câu chữ | Theo `DESIGN.md` › Web quản trị › Thông tin và câu chữ: không nối thông tin khác loại bằng "·"; mỗi thông tin có nhãn hoặc dòng / cột riêng; câu trạng thái thể khẳng định. |
| Người dùng | **(W1, 01/11/2026 — SRS 4.11 "Gọi tên người dùng")** Chỗ gọi tên một người dùng chỉ dùng **username** (không đổi được, duy nhất): "Tin nhắn của khanh.le", "Khóa khanh.le 7 ngày". Ngoại lệ: ảnh chụp bằng chứng giữ tên hiển thị như người dùng đã thấy; trang chi tiết người dùng hiện tên hiển thị như một trường hồ sơ. Admin gọi bằng tên (tên admin không trùng nhau). Thay luật cũ "tên hiển thị kèm username". |
| Theme | Chỉ token; bảng dựng ở theme **sáng** (theme dẫn dắt của web quản trị) rồi sao chép sang tối. |
| Dữ liệu mẫu | Bộ dữ liệu mẫu của README; admin mẫu "Hiếu" (`hieupt1003@gmail.com`); việc mẫu #57 "Tin nhắn của khanh.le" ở #hoi-dap · Ôn thi Giải tích 2 (18/10/2026 20:07). |

**Dùng lại master của app** (không tạo component mới; trạng thái web của Button và Checkbox vẽ trên board riêng `C-01 · C-23 · trạng thái web`, vùng web quản trị): C-01 `Button` (thêm `hover`, `focus-visible`; cỡ `S` 40 cho thanh công cụ, `M` 44 cho nút xác nhận của `DecisionPanel`), C-13 `Badge · count · neutral` (= `badge-count-neutral`), C-21 `ChipStatus` (thêm nhãn trạng thái của web, xem C-43 › ô trạng thái), C-23 `Checkbox` (thêm `hover`, `focus-visible`), C-10 `MessageBubble` (trong `EvidenceFrame`), C-14 `EmptyState` (hàng đợi trống có mascot).

---

## C-42 · AdminSidebar

**Mục đích:** điều hướng chính của web quản trị và lối vào menu tài khoản. **REQ:** REQ-ADMIN-01 (menu tài khoản), 4.11. **Dùng ở:** mọi trang sau đăng nhập.

### Cấu tạo
```
┌─ admin-sidebar 232, nền bg, kẻ phải border, đệm 12 ─┐
│ [N] NezFocus            ← khối thương hiệu cao 52     │
│     Quản trị                                          │
│                                                       │
│ [▦] Tổng quan                                         │
│ [⚑] Báo cáo                       (12) ← AdminNavItem │
│ [👥] Người dùng                         cao 40, bo input│
│ [≡] Server                                            │
│ [📜] Nhật ký                                          │
│               (khoảng trống co giãn)                  │
│ ───────────────────────────────────── kẻ trên border  │
│ (H) Hiếu                         ⇕  ← AccountButton   │
│     Tài khoản admin                                   │
└───────────────────────────────────────────────────────┘
```
Logo là chữ N `primary` cao 20 (hình học `Logo` của C-41); "NezFocus" `headline` 700, "Quản trị" `label` `text-secondary`.

### Biến thể
| Biến thể | Khác gì | Ghi chú |
|---|---|---|
| `AdminNavItem` | icon lucide 18 + nhãn `body-sm` 500 `text-secondary`; tùy chọn `Badge · count · neutral` sát phải | Icon: Tổng quan `layout-dashboard`, Báo cáo `flag`, Người dùng `users`, Server `server`, Nhật ký `scroll-text` |
| `AccountButton` | chữ cái đầu tên admin trong vòng 32 nền `surface-3`; tên `body-sm` 600 + dòng "Tài khoản admin" `label`; icon `chevrons-up-down` | Admin không có avatar ảnh |
| `AccountMenu` | menu bật lên phía trên `AccountButton`, rộng bằng sidebar trừ đệm, nền `surface-1`, viền `border`, bo `input`, bóng `shadow` | Xem Luật |

### Trạng thái
| Trạng thái | Khác gì so với default |
|---|---|
| `AdminNavItem · hover` | nền `surface-2` |
| `AdminNavItem · selected` | nền `surface-3`; icon `primary`; nhãn `text-primary` 600; `aria-current="page"`; **không** vạch màu bên trái |
| `AdminNavItem · selected + hover` | giữ `surface-3` |
| `AdminNavItem · selected + badge` | badge đổi nền sang `surface-1` (nền `surface-3` của badge trùng nền mục, mất hình viên; phát hiện khi dựng board 01/11/2026) |
| `AdminNavItem · focus-visible` | `focus-ring` |
| `AdminNavItem · with-badge` | badge ở mép phải; quá 99 ghi "99+" |
| `AccountButton · hover` / `open` | nền `surface-2`; `open` giữ nền và `aria-expanded="true"` |
| `AccountMenu · open` | xem Cấu tạo menu ở Luật |

### Luật
- **Badge Báo cáo (chốt 01/11/2026, SRS v1.10 REQ-ADMIN-03):** đếm số đối tượng thuộc nhóm "Cần admin" (Chỉ admin + việc có người quản lý server quá 24 giờ chưa xử lý); 0 thì không hiện badge. Cập nhật khi mở trang hoặc chuyển trang, không realtime. Chỉ mục Báo cáo có badge.
- **Menu tài khoản (chốt 01/11/2026):** đầu menu là tên + email (`label` `text-secondary`, xuống dòng nếu dài, không cắt) + **(W4, 02/11/2026)** dòng gợi ý "Đổi tên hoặc mật khẩu: nhờ người vận hành NezFocus." (`label` `text-tertiary`, cách email 4) — web không sửa được tài khoản admin (SRS REQ-ADMIN-01), cùng giọng dòng trợ giúp của màn đăng nhập; không có trang hồ sơ, không đổi ngôn ngữ (chỉ tiếng Việt, SRS 4.11); nhóm "Giao diện" ba lựa chọn "Theo hệ thống" · "Sáng" · "Tối" (dấu chọn ở lựa chọn hiện tại, ghi nhớ trong trình duyệt); kẻ mảnh; "Đăng xuất" (icon `log-out`, chữ `text-primary`, không `danger` — đăng xuất không phá hủy gì). Esc hoặc bấm ra ngoài đóng menu.
- **Không thu gọn:** sidebar giữ 232 và nhãn ở mọi độ rộng ≥ 1024 (5 mục, nhãn rõ quan trọng hơn chỗ).

### Accessibility
Sidebar là `nav` có nhãn "Điều hướng quản trị". Mục Báo cáo đọc "Báo cáo, 12 việc cần admin". `AccountButton` đọc "Tài khoản: Hiếu, mở menu".

### Checklist duyệt
- [ ] Mỗi trạng thái của `AdminNavItem` có instance, cả hai theme; `selected` không có vạch trái.
- [ ] Badge "99+" vừa mép phải không chạm nhãn "Người dùng" dài nhất.
- [ ] Menu tài khoản với email dài nhất (`hieupt1003@gmail.com`) xuống dòng, không tràn.

---

## C-43 · DataTable

**Mục đích:** danh sách dày đặc dữ liệu của mọi trang danh sách (Người dùng, Server, Báo cáo, Nhật ký) và bảng nhỏ trong trang chi tiết. **REQ:** REQ-ADMIN-03…06. **Dùng ở:** S-ADM-* (danh sách), bảng "Báo cáo" trong trang xử lý một việc.

### Cấu tạo
```
Đầu cột   │ Người dùng          Email             Trạng thái          Ngày tạo    Báo cáo chờ │  cao 40, label 500 text-secondary
──────────┼───────────────────────────────────────────────────────────────────────────────────── kẻ border
Hàng      │ (K) khanh.le        khanh.le@gmail…   Hoạt động           03/09/2026            2 │  cao 48, body-sm
──────────┼───────────────────────────────────────────────────────────────────────────────────── kẻ border
```
Nền `surface-1` (component `data-table`), không bọc thẻ, không kẻ dọc; đệm ngang mỗi ô `space-3`. Cột số căn phải, các cột khác căn trái.

### Biến thể
| Biến thể | Khác gì | Ghi chú |
|---|---|---|
| `Cell · person` | Avatar 28 + username `body-sm` 500 `text-primary` (W2: ô tìm không nhận tên hiển thị nên không có dòng tên hiển thị) | Theo luật Người dùng (W1: bỏ tên hiển thị) |
| `Cell · text` | `body-sm` `text-primary` hoặc `text-secondary` (cột phụ như email) | Cắt `…` một dòng. **Ngoại lệ (duyệt W2, 02/11/2026):** bảng trong trang chi tiết (trang người dùng, trang server), cột Lý do / Kết quả xuống tối đa 2 dòng, không cắt — hàng giữ cao 48 (vừa 2 dòng như ô "người quản lý server") |
| `Cell · mono` | `mono` cỡ `label` `text-secondary` | Ngày (dd/MM/yyyy), giờ (HH:mm), mã việc "#57" |
| `Cell · number` | Unbounded `numeric-inline` 500, căn phải; 0 hiện "–" (Be Vietnam Pro `text-tertiary`) | |
| `Cell · status` | Icon 16 mang màu + chữ `text-secondary`; trạng thái bình thường là chữ trơn | Bảng nhãn ở Luật |
| `ReportItem` (W1, thay `Table · compact` ngày 02/11/2026 — `DESIGN.md` Decisions Log) | Danh sách không đầu cột, **cũ nhất trên cùng** (báo cáo đầu tiên — lý do chọn sẵn, ảnh chụp — luôn ở đầu): dòng 1 lý do `body-sm` 600 + thời điểm đầy đủ mono `label` sát phải ("18/10/2026 22:30" — luôn có ngày, 02/11/2026); dòng 2 mô tả `body-sm` (trống: "Không có mô tả" `text-tertiary`); dòng 3 avatar 24 + username `text-secondary`; đệm dọc 12, kẻ dưới `border`; không nền hover | Khối "Báo cáo" trong trang xử lý một việc. Master `ReportItem` (đổi tên từ `Compact/row`); `Compact/head` không còn dùng |
| `Cell · object` (W1) | icon loại 16 `text-secondary` (`message-square` / `user` / `server`) + chữ `body-sm` 500 | Cột Đối tượng của trang Báo cáo |
| `Cell · two-line` (W1) | hai dòng `body-sm` (chính `text-primary`, phụ `text-secondary`), dòng phụ tùy chọn | Cột Nơi (server / #kênh), Người xử lý (tên / "người quản lý server") |
| `Queue/row`, `Handled/row` (W1) | hàng ghép sẵn các ô của tab Đang chờ / Đã xử lý; 1024 tắt ô Nơi và Báo cáo đầu | Trang Báo cáo; W2 dùng lại trong khối báo cáo của trang người dùng / server (tắt Báo cáo, Phạm vi, đổi độ rộng theo trang) |
| `Users/head` + `Users/row` (W2) | Người dùng 232 (avatar 28 + username) · Email 248 · Trạng thái (giãn) · Ngày tạo 128 · Hoạt động gần nhất 168 · Báo cáo chờ 132 (đủ chỗ icon sắp xếp); 1024 tắt Email, Ngày tạo | Danh sách người dùng |
| `Servers/head` + `Servers/row` (W2) | Server (icon 28 `radius-server` + tên, giãn) · Owner 220 (`Cell · person`) · Ngày tạo 160 · Thành viên 120 · Báo cáo chờ 140; 1024 tắt Ngày tạo | Danh sách server |
| `UserServer/head` + `UserServer/row` (W2) | rộng 744: Server (giãn) · Vai trò 140 · Thành viên 120 · Vào server 140; 1024 tắt Thành viên, Vào server | Khối Server của trang người dùng |
| `Log/head` + `Log/row` (W3) | ô mở rộng 32 (nút `chevron-right` 16 `text-secondary`, xoay xuống khi mở) · Thời gian 160 (`Cell · mono`; dấu thời gian rộng 125 — không cắt) · Người làm 176 ("Người vận hành (CLI)" 144 — không cắt) · Hành động 216 · Đối tượng 208 (`Cell · object`; thêm icon `shield` cho tài khoản admin, `user-x` cho tài khoản đã xóa) · Việc 64 (mã mono / "–") · Lý do 152 · Ghi chú nội bộ (giãn); **link tô `primary`** (chữ đối tượng, mã việc; hover gạch chân) vì hàng không phải link — email tài khoản admin không link, giữ `text-primary`; 1024: Người làm 176, Hành động 176, Đối tượng 136, tắt Lý do, Ghi chú. **Edge case W3:** tên admin dài (tối đa 64) xuống tối đa 2 dòng trong ô Người làm (hàng vẫn 48), quá 2 dòng thì cắt "…" ở cuối dòng 2 — tên đầy đủ ở menu lọc Người làm (đo khi vẽ: tên 31 ký tự đã cần 3 dòng ở ô 176); server đã xóa hẳn: icon `server` + tên lúc làm `text-primary`, không link | Nhật ký |
| `Log/detail` (W3) | phần mở rộng ngay dưới hàng: khối nền `surface-2`, bo `input`, đệm 12 / 16, thụt theo cột Thời gian; **bốn dòng cố định** nhãn 80 `label` `text-secondary` + giá trị `body-sm` xuống dòng: "Chi tiết" · "Lý do" · "Lời nhắn" (ngoặc kép) · "Ghi chú" ("#mã" link); trống "–" `text-tertiary` | Nhật ký |

### Trạng thái
| Trạng thái | Khác gì so với default |
|---|---|
| `Row · hover` | nền `surface-2`, con trỏ tay |
| `Row · focus-visible` | `focus-ring` lùi vào trong hàng |
| `Row · selected` | nền `surface-3`; chữ phụ trong hàng lên `text-secondary` (luật bậc bề mặt) — dùng cho hàng đang mở ở danh sách có panel; **(W3)** dòng Nhật ký mở từ "Xem trong Nhật ký" (`Log/detail` bên dưới giữ `surface-2`) |
| `Row · expanded` (W3) | chevron xoay xuống, `Log/detail` hiện dưới hàng, kẻ dưới chuyển xuống dưới khối chi tiết; nền hàng không đổi |
| `Table · loading` | 8 hàng skeleton: thanh `surface-2` đứng yên theo độ rộng từng cột, đầu cột vẫn hiện |
| `Table · empty` | một vùng cao 240 căn giữa vùng bảng: icon 24 `text-tertiary` + câu `body-sm` theo trang (vd "Không có người dùng nào khớp “khanh”") + nút `text` "Xóa bộ lọc" khi đang lọc |
| `Table · error` | như `empty`, icon `octagon-x` `danger` + "Không tải được danh sách." + nút `secondary` "Thử lại" |
| `Head · sortable` (W2) | đầu cột sắp xếp được: nhãn + icon `chevrons-up-down` 14 `text-tertiary` sau nhãn (cột số căn phải: icon vẫn sau nhãn); hover: nhãn và icon `text-primary`, con trỏ tay; `focus-visible`: `focus-ring` quanh ô đầu cột |
| `Head · sorted` (W2) | cột đang xếp: nhãn `text-primary` 600 + icon `arrow-down` (giảm dần) / `arrow-up` (tăng dần) 14 `text-primary` |
| `Table · narrow` (1024–1279) | ẩn các cột trang đó đánh dấu "ẩn ở 1024" (Người dùng: Email, Ngày tạo); không cuộn ngang |

### Luật
- **Thứ tự (chốt 01/11/2026, SRS 4.11):** theo trang — Người dùng, Server: mới tạo trên cùng; Báo cáo › Đang chờ: báo cáo đầu tiên cũ nhất trên cùng; Đã xử lý và Nhật ký: mới nhất trên cùng. Phá hòa bằng id giảm dần. Không xếp lại khi đang xem; chỉ khi đổi bộ lọc, đổi trang, bấm Làm mới.
- **Sắp xếp theo cột (chốt 01/11/2026; sửa W2 02/11/2026 — SRS REQ-ADMIN-01):** chỉ danh sách Người dùng (Ngày tạo, Hoạt động gần nhất, Báo cáo chờ) và Server (Ngày tạo, Thành viên, Báo cáo chờ); các bảng khác đầu cột không bấm được. Bấm (hoặc Enter / Space) đầu cột: lần đầu giảm dần, bấm lại đảo chiều; một cột một lúc; mặc định Ngày tạo giảm dần nên cột này luôn có mũi tên khi chưa chọn cột khác. Cột đang xếp bị ẩn ở 1024 (Ngày tạo của Người dùng) thì không cột nào hiện mũi tên đậm; thứ tự giữ nguyên. Hàng "–" (0) đứng cuối khi giảm dần.
- **Nhãn ô trạng thái tài khoản:** "Hoạt động" (chữ trơn) · "Bị khóa tới {dd/MM/yyyy}" (`lock` `warning`) · "Bị khóa vĩnh viễn" (`ban` `danger`) · "Chờ xóa tới {dd/MM/yyyy}" (`clock` `text-tertiary`). Giờ cụ thể chỉ ở trang chi tiết.
- **Nhãn ô trạng thái việc:** "Đang chờ" (`circle-dashed` `text-secondary`) · "Quá 24 giờ" (`clock-alert` `warning`) · "Đã xử lý" (`circle-check` `success`). Phạm vi: "Chỉ admin" (`shield`) · "Có người quản lý server" (`users`), cả hai `text-secondary`.
- **Hàng mở chi tiết:** bấm hàng (hoặc Enter khi hàng có focus) mở trang chi tiết; hàng là link (Quy ước chung). **Ngoại lệ Nhật ký (W3 Q11, 02/11/2026):** một dòng nhật ký có tới ba đích (đối tượng, việc, "#mã" trong ghi chú) nên hàng **không** là link: bấm vùng trống của hàng hoặc nút mở rộng (Enter / Space, `aria-expanded`) thì mở / thu `Log/detail` tại chỗ; mở được nhiều hàng; link nằm trong ô.

### Accessibility
Bảng là `table` có `caption` ẩn theo trang ("Danh sách người dùng"); đầu cột là `th scope="col"`; đầu cột sắp xếp được chứa một `button`, cột đang xếp có `aria-sort="descending"` / `"ascending"`, đổi thứ tự thì thông báo "Đã xếp theo Thành viên, giảm dần" qua vùng `aria-live`. Ô trạng thái đọc chữ, không đọc tên icon. Ô "–" đọc "không có".

### Checklist duyệt
- [ ] Đủ 5 kiểu ô, hàng ở 4 trạng thái, bảng `loading` / `empty` / `error` / `narrow`, cả hai theme.
- [ ] Ngày mono thẳng cột; số căn phải thẳng cột; "–" thay cho 0.
- [ ] Hàng `selected` không có chữ `text-tertiary`.

---

## C-44 · Pagination

**Mục đích:** chuyển trang và đổi số mục mỗi trang dưới mọi bảng danh sách. **REQ:** REQ-ADMIN-04…06 (50 mục / trang). **Dùng ở:** dưới `DataTable` của các trang danh sách. Kiểu theo bản web NezFocus (chốt 01/11/2026).

### Cấu tạo
```
Hiện [50 ▾] trong số 1.284 người dùng                 ‹  1  2  3  4  5  …  26  ›
└ PageSize: select 72 × 32, viền border-input, bo input   └ PageButton 32 × 32, bo input, gap 4
```

### Biến thể
| Biến thể | Khác gì | Ghi chú |
|---|---|---|
| `PageButton · number` | số `body-sm` `text-secondary` | |
| `PageButton · current` | nền `surface-3`, chữ `text-primary` 600, `aria-current="page"` | |
| `PageButton · ellipsis` | "…" không bấm được | |
| `PageButton · prev` / `next` | icon `chevron-left` / `chevron-right` 16 | |

### Trạng thái
| Trạng thái | Khác gì so với default |
|---|---|
| `hover` | nền `surface-2` (trừ `current`, `ellipsis`) |
| `focus-visible` | `focus-ring` |
| `disabled` | icon `text-tertiary` (prev ở trang 1, next ở trang cuối); không bấm được |
| `PageSize · open` | danh sách 25 / 50 / 100, dấu chọn ở giá trị hiện tại |

### Luật
- **Dãy số (chốt 01/11/2026):** luôn hiện trang 1 và trang cuối; tối đa 7 ô số kể cả "…"; quanh trang hiện tại hiện 1 trang mỗi bên ("1 … 7 8 9 … 26").
- **Số mục mỗi trang (chốt 01/11/2026):** 25 / 50 / 100, mặc định 50; đổi số mục về trang 1; ghi nhớ trong trình duyệt theo từng bảng.
- **Tóm tắt:** "trong số {tổng} {đối tượng}" với tổng định dạng "1.284"; đối tượng theo trang ("người dùng", "server", "việc", "mục nhật ký"). Không còn mục nào: ẩn cả thanh phân trang.

### Accessibility
Thanh là `nav` "Phân trang"; nút số đọc "Trang 2"; trang hiện tại đọc "Trang 1, trang hiện tại".

### Checklist duyệt
- [ ] Trang 1 (prev vô hiệu), trang giữa ("1 … 7 8 9 … 26"), trang cuối (next vô hiệu); PageSize mở; cả hai theme.

---

## C-45 · FilterBar

**Mục đích:** thanh tìm kiếm và lọc ở đầu mỗi trang danh sách. **REQ:** REQ-ADMIN-03…06. **Dùng ở:** trang danh sách Người dùng, Server, Báo cáo, Nhật ký.

### Cấu tạo
```
[🔍 Tìm username, tên hoặc email      ✕]   [Tất cả|Hoạt động|Bị khóa|Chờ xóa]   [Lý do ▾]
└ SearchInput 320–360 × 40, nền surface-1,   └ SegmentFilter cao 36, viền          └ FilterSelect (khi lọc
  viền border-input, bo input                  border-input, ô chọn nền text-primary   nhiều giá trị: Lý do, Loại)
```

### Biến thể
| Biến thể | Khác gì | Ghi chú |
|---|---|---|
| `SearchInput` | icon `search` 16 + ô nhập `body-sm`; nút ✕ khi có chữ | `type="search"`, nhãn ẩn theo trang |
| `SegmentFilter` | 2–5 lựa chọn liền nhau; lựa chọn đang chọn nền `text-primary` chữ `bg` 600; cao 36 trong thanh lọc, **40 khi đứng cùng hàng với nút S** (W3: bộ chọn khoảng cạnh tiêu đề Tổng quan) | Trạng thái tài khoản, phạm vi báo cáo, khoảng thời gian Tổng quan |
| `FilterSelect` | nút "{Tên bộ lọc}: {giá trị}" + `chevron-down`; menu nhiều lựa chọn có ô tick | Lý do, Loại đối tượng, Người làm, Khoảng ngày |
| `FilterSelect · single` (W1) | nút luôn ghi giá trị đang chọn ("Phạm vi: Cần admin"); menu một lựa chọn, dấu `check` ở giá trị hiện tại (như menu của `SelectField`) | Phạm vi báo cáo, Người xử lý; Người làm của Nhật ký (W3) |
| `FilterSelect · grouped` (W3) | menu nhiều lựa chọn có nhãn nhóm (`label` 600 `text-secondary`, không bấm được) và kẻ mảnh giữa nhóm | Hành động của Nhật ký ("Xử lý vi phạm", "Tài khoản admin") |
| `FilterSelect · searchable` (W3) | menu **luôn** có ô tìm 36 ở đầu (icon `search` 14, placeholder theo bộ lọc; không dùng ngưỡng số lựa chọn — một bộ lọc một hình dạng); nhóm có nhãn và kẻ mảnh; cao tối đa 320, phần danh sách cuộn, ô tìm đứng yên; không khớp: dòng `body-sm` `text-secondary` "Không có {đối tượng} nào khớp “…”"; mũi tên lên / xuống đi qua kết quả, Enter chọn | Người làm của Nhật ký |
| `DateRangeMenu` (W3) | menu của `FilterSelect · single` "Thời gian": các mục có sẵn ("Mọi lúc" · "Hôm nay" · "7 ngày qua" · "30 ngày qua") + "Chọn khoảng ngày…" mở ngay trong menu hai ô 40 "Từ ngày" / "Đến ngày" (gõ dd/mm/yyyy, viền `border-input`) và nút `primary` S "Áp dụng"; đã áp thì nút lọc ghi "Thời gian: 01/09 – 30/09/2026" | Nhật ký |

### Trạng thái
| Trạng thái | Khác gì so với default |
|---|---|
| `SearchInput · focus` | viền 2 `primary` (thay viền 1) |
| `SearchInput · filled` | chữ `text-primary`, hiện ✕ |
| `SegmentFilter · hover` | lựa chọn không chọn nền `surface-2` |
| `SegmentFilter · focus-visible` | `focus-ring` trên lựa chọn; mũi tên trái / phải đổi lựa chọn |
| `FilterSelect · active` | khi đang lọc: nhãn `text-primary` 600 và số lựa chọn trong ngoặc ("Lý do (2)"); bản `single`: nhãn 600 khi giá trị khác mặc định |
| `ClearFilters` (W1) | nút `text` "Xóa bộ lọc" cuối thanh, chỉ hiện khi có bộ lọc khác mặc định; bấm → về mặc định của trang (Báo cáo: phạm vi Cần admin, không lọc loại / lý do), giữ ô tìm |
| `DateRangeMenu · invalid` (W3) | ngày kết thúc trước ngày bắt đầu hoặc ngày không có thật: viền 2 `danger` ở ô sai + dòng `label` icon `octagon-x` ("Ngày kết thúc phải sau ngày bắt đầu." / "Ngày không hợp lệ."); "Áp dụng" vô hiệu. Ngày sau hôm nay được nhận (không có mục nào, không phải lỗi) |

### Luật
- **Cách tìm (chốt 01/11/2026):** tìm khi đang gõ (chờ 300ms sau phím cuối), không phân biệt hoa thường và dấu; ô tìm, bộ lọc và trang hiện tại nằm trong URL (Back của trình duyệt quay lại đúng bộ lọc, gửi link được cho admin khác). Đổi tìm / lọc về trang 1.
- **Trang Báo cáo:** ô tìm nhận "57" / "#57" → mở thẳng chi tiết việc đó (SRS REQ-ADMIN-03); chữ khác tìm trong tóm tắt và tên người bị báo cáo.

### Accessibility
`SegmentFilter` là `radiogroup` có nhãn ("Lọc theo trạng thái"). Kết quả tìm đổi số đọc qua vùng `aria-live` lịch sự: "Tìm thấy 3 người dùng".

### Checklist duyệt
- [ ] Ô tìm trống / focus / có chữ; SegmentFilter chọn / hover / focus; FilterSelect thường / đang lọc / mở; cả hai theme.

---

## C-46 · PageHeader, CasePager

**Mục đích:** đầu mỗi trang. **REQ:** 4.11. **Dùng ở:** mọi trang; `CasePager` chỉ ở trang xử lý một việc.

### Biến thể
| Biến thể | Cấu tạo | Ghi chú |
|---|---|---|
| `PageHeader · list` | tiêu đề `title-1` 700, **không số tổng** (W2 Q9, 02/11/2026: tổng chỉ ở thanh phân trang, như trang Báo cáo); hành động phải (vd "Làm mới" `secondary` S) | |
| `PageHeader · detail` | dòng trên: `BackLink` "‹ {Danh sách}" (`primary` 500, icon `chevron-left` 18); dưới: tiêu đề (+ mã việc mono `text-tertiary` khi là việc) + `ChipStatus` trạng thái; **(W2)** ô `PHD avatar` (avatar 40) và `PHD server icon` (icon server 40) trước tiêu đề, tắt sẵn — trang người dùng / server bật một ô, tắt mã việc và `CasePager` | |
| `CasePager` | nút `chevron-left` 32 · "Việc {n} / {tổng}" `body-sm` `text-secondary` · nút `chevron-right` 32, viền `border`, bo `input` | Sát phải dòng `BackLink` |
| `PageTabs` (W1) | các tab nhãn `body-sm`, cao 40, kẻ dưới `border` hết chiều rộng; tab đang chọn chữ `text-primary` 600 + gạch chân 2 `primary`, tab khác `text-secondary` 500; không có số đếm | Báo cáo: "Đang chờ" · "Đã xử lý" |

### Trạng thái
| Trạng thái | Khác gì so với default |
|---|---|
| `BackLink · hover` | gạch chân |
| nút `CasePager · hover` / `focus-visible` | nền `surface-2` / `focus-ring` |
| `CasePager · first` / `last` | nút trái / phải vô hiệu (icon `text-tertiary`) |

### Luật
- **CasePager (chốt 01/11/2026):** đi theo hàng đợi đang lọc lúc mở việc (giữ thứ tự của tab "Đang chờ"); "Việc 3 / 12" đếm trong hàng đợi đó; mở việc từ nơi khác (link, tìm "#57", Nhật ký) thì không có `CasePager`. Phím J / K làm như hai nút. **(W1)** Danh sách cố định từ lúc mở: việc đã xử lý vẫn nằm trong đó (mở lại thấy biên nhận), "Việc 3 / 12" không đổi sau khi xử lý; việc người khác xử lý trong lúc đó vẫn mở được và hiện biên nhận của họ.
- **BackLink (W1):** trang việc luôn ghi "‹ Hàng đợi"; mở từ hàng đợi thì về đúng URL hàng đợi đã rời, mở từ nơi khác thì về hàng đợi mặc định.
- **Chữ dài:** tiêu đề việc tối đa 2 dòng, không cắt.

### Checklist duyệt
- [ ] `list`, `detail` có và không có mã việc; `CasePager` thường / đầu / cuối / hover / focus; cả hai theme.

---

## C-47 · KeyValueStrip

**Mục đích:** tóm tắt vài thông tin khác loại của một đối tượng mà không nối bằng "·". **REQ:** REQ-ADMIN-03…05. **Dùng ở:** đầu trang xử lý một việc, trang chi tiết người dùng / server.

### Cấu tạo
```
──────────────────────────────────────────────────────────────── kẻ trên border
Nơi                Báo cáo đầu tiên     Số báo cáo     Ai xử lý được          ← nhãn label 500 text-secondary
#hoi-dap           18/10/2026           2              👥 Admin và người…     ← giá trị body-sm 600 (số: Unbounded title-2)
Ôn thi Giải tích 2 lúc 20:07                           Ai xử lý trước thì…    ← dòng phụ body-sm text-secondary (tùy chọn)
──────────────────────────────────────────────────────────────── kẻ dưới border
```
2–7 ô ở 1440, tối đa 5 ô ở 1024 (trang ghi ô nào ẩn ở 1024 — duyệt W2, 02/11/2026: dải của trang server có thêm "Trạng thái", "Lý do gỡ"); **dải từ 6 ô** (sửa sau duyệt 02/11/2026): mọi ô rộng theo chữ, một dòng, dàn đều trên cả bề rộng (khoảng cách giữa các ô bằng nhau, tối thiểu 24) — chia đều bề rộng thì ô chữ dài ("Chờ xóa tới 18/11/2026") xuống dòng, còn trộn ô cố định với ô giãn thì các ô dồn sát một bên; **dải đến 5 ô** chia đều bề rộng, đệm dọc 14, khoảng giữa ô 20; không kẻ dọc.

### Biến thể
| Biến thể | Khác gì |
|---|---|
| `Item · text` | giá trị + dòng phụ tùy chọn |
| `Item · number` | giá trị Unbounded `title-2` 600 |
| `Item · icon` | icon 16 `text-secondary` đứng trước giá trị |

### Luật
- Mỗi ô **một** thông tin; ngày giờ viết bằng Be Vietnam Pro ("18/10/2026" + "lúc 20:07"), không mono (mono chỉ ở cột bảng, nhật ký, biên nhận).
- Ở 1024 bỏ dòng phụ của ô nào trang đánh dấu "bỏ ở 1024"; giá trị xuống tối đa 2 dòng.

### Checklist duyệt
- [ ] 4 ô ở 1440 và 1024; ô số; ô có icon; cả hai theme.

---

## C-48 · EvidenceFrame

**Mục đích:** hiện ảnh chụp bằng chứng đúng như người dùng đã thấy trong app. **REQ:** REQ-SAFE-01 (ảnh chụp), REQ-ADMIN-03. **Dùng ở:** trang xử lý một việc.

### Cấu tạo
```
📷 Ảnh chụp lúc báo cáo, 18/10/2026 lúc 20:07          ← chú thích label text-secondary, ngoài khung
┌─ nền surface-2, bo input, đệm ngang 16, cao cố định ─────────┐
│  (M) Mai 20:00  Mình mới ôn xong chương 4      ← bị cắt ngang │
│  (D) Dũng 20:02 …                                             │
│ ┌ nền surface-3, bo input ────────────────────────────────┐   │
│ │ ⚑ Tin bị báo cáo                                         │   │
│ │ (K) Khánh 20:05  Bán đề thi giữa kỳ có đáp án 50k, …     │   │
│ └─────────────────────────────────────────────────────────┘   │
│  (B) Bình 20:06 …                                             │
│  (C) Chi 20:06 …                               ← bị cắt ngang │
└───────────────────────────────────────────────────────────────┘
```

### Biến thể
| Biến thể | Nội dung | Ghi chú |
|---|---|---|
| `message` | 5 tin trước + tin bị báo cáo + 5 tin sau, mỗi tin là instance `MessageBubble` (C-10) cỡ `body` | Cao 330 (300 ở 1024), tự cuộn để tin bị báo cáo ở giữa khi mở |
| `profile` | Ảnh chụp hồ sơ: banner, avatar 56, tên `headline`, username, giới thiệu | Cao theo nội dung, không cuộn |
| `ProfileCard/compact` (W2, master riêng) | Hồ sơ **hiện tại** ở trang người dùng: một hàng nền `surface-2` bo `input` đệm 16 — avatar 48 + cột chữ (tên hiển thị `headline` 600, giới thiệu `body-sm`; trống "Chưa viết giới thiệu" `text-tertiary`); dải banner 64 tắt sẵn, chỉ bật khi người dùng có banner | Không chú thích ảnh chụp; "Sửa lần cuối …" nằm ở dòng phụ của tiêu đề khối |
| `server` | Ảnh chụp server: icon 56, tên `headline`, số thành viên | Cao theo nội dung |

### Trạng thái
| Trạng thái | Khác gì so với default |
|---|---|
| `message · short` | đoạn ít hơn 11 tin (đầu kênh): khung co theo nội dung, không cuộn |
| `message · deleted-now` | chú thích thêm dòng "Tin đã bị xóa khỏi kênh" (icon `trash-2` `text-tertiary`); ảnh chụp giữ nguyên |
| `changed` (W1, 02/11/2026 — mọi biến thể) | đối tượng đã đổi sau khi báo cáo: hàng chú thích thêm nút chuyển `SegmentFilter` cao 28 "Lúc báo cáo" · "Hiện tại" sát phải (mặc định "Lúc báo cáo"), và dòng `pencil` `label` `text-secondary` ngay dưới: tin "Tin đã được sửa lúc {dd/MM/yyyy HH:mm}", hồ sơ / server "Đã đổi sau khi báo cáo: {trường}" (trường: tên, ảnh, giới thiệu; số thành viên không tính — server không có mô tả ở MVP, W2 Q1) |
| `changed · current` | đang xem "Hiện tại": chú thích thành "Bản hiện tại" (tin: chỉ bong bóng bị báo cáo đổi sang nội dung hiện tại, các tin xung quanh vẫn là ảnh chụp, cờ "Tin bị báo cáo" giữ nguyên); hồ sơ / server: thẻ hiện tại. Chuyển tức thì, không lớp phủ, không đổi gì ở panel Quyết định |
| `message · attachment` | tin có tệp hiện thẻ tệp của `MessageBubble`; ảnh trong ảnh chụp mở `MediaViewer` (C-36) bản web |

### Luật
- **Phạm vi (chốt 01/11/2026, SRS v1.10):** chỉ nội dung của ảnh chụp; không có nút xem thêm lịch sử kênh.
- **Tin bị báo cáo** luôn có cờ chữ "Tin bị báo cáo", không chỉ nền (tín hiệu không cần màu).
- Bong bóng trong khung không bấm được (không reaction, không menu), trừ mở ảnh.

### Accessibility
Khung là vùng cuộn có nhãn "Ảnh chụp đoạn chat lúc báo cáo"; tin bị báo cáo đọc "Tin bị báo cáo: Khánh, 20:05, …"; khi mở trang, focus không nhảy vào khung.

### Checklist duyệt
- [ ] `message` (giữa đoạn và `short`), `deleted-now`, `profile`, `profile · changed`, `server`; cả hai theme; tin trên / dưới bị cắt ngang báo cuộn được.

---

## C-49 · SubjectCard

**Mục đích:** tóm tắt người (hoặc server) bị báo cáo và tình trạng hiện tại của họ, ngay đầu cột Quyết định. **REQ:** REQ-ADMIN-03, REQ-SAFE-01 (trạng thái hiện tại). **Dùng ở:** `DecisionPanel`.

### Cấu tạo
```
┌─ nền surface-2, bo input, đệm 14 ─────────────┐
│ (K)  khanh.le                                 │  ← Avatar 40 + username headline 600 (W1: bỏ tên hiển thị)
│ ───────────────────────────────── kẻ border   │
│ 💬 Tin vẫn còn trong kênh                     │  ← StatusLine: icon 16 text-secondary + câu body-sm
│ ✓ Tài khoản đang hoạt động                    │
│ 👥 Vẫn ở Ôn thi Giải tích 2                   │
│ ↺ Bị admin xử lý 1 lần                 Xem ›  │  ← link primary 500 sát phải
└───────────────────────────────────────────────┘
```

### Biến thể / câu tình trạng
| Dòng | Các câu (thể khẳng định) |
|---|---|
| Tin (đối tượng tin) | "Tin vẫn còn trong kênh" (`message-square`) · "Tin đã được sửa sau khi báo cáo" (`pencil`, W1) · "Tin đã bị xóa" (`trash-2`) |
| Hồ sơ (đối tượng hồ sơ, W1) | không có dòng khi chưa đổi · "Hồ sơ đã đổi sau khi báo cáo" (`pencil`) |
| Tài khoản | "Tài khoản đang hoạt động" (`circle-check`) · "Đang bị khóa tới {dd/MM/yyyy HH:mm}" (`lock`, icon `warning`) · "Bị khóa vĩnh viễn" (`ban`, icon `danger`) · "Tài khoản chờ xóa" (`clock`) |
| Server (việc trong server) | "Vẫn ở {Server}" (`users`) · "Đã rời {Server}" (`log-out`) · "Đã bị cấm khỏi {Server}" (`ban`) |
| Lịch sử | "Chưa từng bị admin xử lý" (không link) · "Bị admin xử lý {n} lần" + "Xem ›" (mở `HistoryPopover` C-56 tại chỗ; W1) |
| `server` (đối tượng server) | icon server 40 + tên; dòng: "{N} thành viên", "Owner: {username}", "Chưa từng bị gỡ"; thẻ luôn hiện tên **hiện tại** (khác tiêu đề việc khi server đã đổi tên, W1); thêm "Server đã đổi sau khi báo cáo" (`pencil`) khi đã đổi |

### Luật
- Câu "Đã rời / Đã bị cấm khỏi {Server}" kéo theo: hành động mời ra / cấm không tồn tại ở web quản trị (SRS), nên chỉ ảnh hưởng tới chữ, không ẩn nút nào; khóa tài khoản vẫn được.
- Đối tượng hồ sơ / tin trong DM: không có dòng Server.
- **Link (W2 Q14, 02/11/2026):** cả dòng đầu thẻ (avatar + username; ở `SubjectCard/server`: icon + tên) là link sang trang người dùng / server: chữ giữ `text-primary` 600, icon `chevron-right` 16 `text-secondary` ở mép phải dòng đầu (như dấu bấm của một hàng), hover gạch chân tên, `focus-ring`; tài khoản đã xóa tắt icon và không phải link (W1 `subject-deleted`).

### Accessibility
Khối là một vùng có tiêu đề ẩn "Người bị báo cáo"; các câu đọc theo thứ tự.

### Checklist duyệt
- [ ] Bộ câu bình thường (như #57), bộ câu bất thường (tin đã xóa, đang bị khóa, đã rời server, có lịch sử), biến thể `server`; cả hai theme.

---

## C-50 · DecisionPanel

**Mục đích:** nơi admin chọn và xác nhận một hành động, luôn nằm cạnh bằng chứng. **REQ:** REQ-ADMIN-03 (hành động, lý do, lời nhắn, ghi chú), REQ-SAFE-02. **Dùng ở:** trang xử lý một việc (cột phải 360, 320 ở 1024).

### Cấu tạo
```
┌─ kẻ trái border, đệm trái 28 (20 ở 1024) ─┐
│ ┌─ DecisionScroll (cuộn bên trong) ─────┐ │
│ │ SubjectCard (C-49)                    │ │
│ │ Hành động          ← nhãn nhóm label 600 text-secondary
│ │ ○ Bỏ qua           ← ActionOption cao 32
│ │ ○ Xóa tin                              │ │
│ │ ◉ Khóa tài khoản   ← chọn: nền surface-2, icon circle-dot primary, chữ 600
│ │ Thời hạn khóa                          │ │
│ │ [1 ngày|7 ngày|30 ngày|Vĩnh viễn]  ← SegmentFilter (C-45)
│ │ Lý do khanh.le sẽ thấy                    │ │
│ │ [Lừa đảo                         ▾]  ← SelectField 40
│ │ ☑ Xóa luôn tin bị báo cáo  ← Checkbox (C-23)
│ │ Lời nhắn cho khanh.le (không bắt buộc)    │ │
│ │ [                              ]  ← TextArea 56, 0/200
│ │ Ghi chú nội bộ (chỉ admin thấy)        │ │
│ │ [                              ]  ← TextArea 44, 0/500
│ └───────────────────────────────────────┘ │
│ [🔒 Khóa khanh.le 7 ngày và xóa tin ]  ← Button danger M, rộng hết, ngoài vùng cuộn
└───────────────────────────────────────────┘
```

### Biến thể
| Biến thể | Khác gì |
|---|---|
| `ActionOption` | icon radio 18 + nhãn `body-sm`; vô hiệu: chữ `text-tertiary` + dòng lý do `label` dưới nhãn ("Tin đã bị xóa") |
| `SelectField` | ô 40 viền `border-input`, giá trị + `chevron-down`; menu như `FilterSelect` một lựa chọn |
| `TextArea` | ô viền `border-input`, placeholder `text-tertiary`; bộ đếm "{n}/{max}" `label` `text-tertiary` sát phải dưới ô, hiện khi đã gõ. **(W1)** Ô tự cao theo nội dung (đệm 10 / 12), tối đa 6 dòng rồi cuộn trong ô — chữ không bao giờ tràn khỏi viền |
| `Receipt` | thay cả panel sau khi xử lý (xem Luật): icon `circle-check` `success` + câu biên nhận `body-sm` (chủ ngữ là tên admin, kể cả khi người xem là chính admin đó — cùng câu với Nhật ký: "Hiếu đã khóa khanh.le 7 ngày và xóa tin"; W1 Q8) + dòng dấu vết mono `label` + "Xem trong Nhật ký ›" + nút `primary` "Sang việc #58" |
| `Receipt · by-other` | câu của người xử lý khác ("Người quản lý server binh.tran đã bỏ qua"), không có nút xác nhận; nút "Sang việc #58" giữ nguyên |
| Dòng của `Receipt` (W1; **bộ dòng cố định — duyệt W2, 02/11/2026**) | mỗi thông tin một dòng nhãn 80 + giá trị (giá trị xuống dòng, không cắt), **luôn đủ bốn dòng, cùng thứ tự với `HistoryItem` (C-56):** "Lúc" (mono) · "Lý do" · "Lời nhắn" (nguyên văn trong ngoặc kép) · "Ghi chú" (ghi chú nội bộ, "#mã" thành link); dòng không có giá trị ghi "–" `text-tertiary` (Bỏ qua / Xóa tin không có lý do). Không có dòng Admin (câu biên nhận đã có tên) và Việc (là chính trang đang mở). Người quản lý server không có lý do / lời nhắn / ghi chú nên `Receipt · by-other` của họ chỉ có "Lúc" |
| Biên nhận trong panel (W1) | `SubjectCard` giữ ở đầu panel và cập nhật tình trạng mới; các nhóm lựa chọn ẩn; `Receipt` ngay dưới; rồi nút "Sang việc #58" (hoặc `secondary` "Về hàng đợi"). Dòng "Người làm" của `Receipt` bỏ (câu biên nhận đã có tên admin) |

### Trạng thái
| Trạng thái | Khác gì so với default |
|---|---|
| `ActionOption · hover` / `focus-visible` | nền `surface-2` / `focus-ring`; mũi tên lên / xuống đổi lựa chọn trong nhóm |
| `empty` (chưa chọn hành động) | chỉ nhóm Hành động; nút xác nhận `primary` vô hiệu, nhãn "Chọn một hành động", dòng lý do dưới nút không cần (nhãn đã nói) |
| `dismiss` (chọn Bỏ qua) | ẩn Thời hạn, Lý do, Lời nhắn, ô xóa tin; nút `primary` "Bỏ qua {n} báo cáo" |
| `delete-message` | ẩn Thời hạn, Lý do, Lời nhắn; nút `danger` "Xóa tin của {tên}" |
| `suspend` | như sơ đồ; nút `danger` "Khóa {tên} {thời hạn}[ và xóa tin]" |
| `suspend · permanent` | thời hạn "Vĩnh viễn"; nút `danger` "Khóa vĩnh viễn {tên}…" mở dialog xác nhận (chốt 01/11/2026) |
| `reset-profile` (đối tượng hồ sơ) | ẩn Thời hạn và ô xóa tin; nút `danger` "Đặt lại hồ sơ của {tên}" |
| `remove-server` (đối tượng server) | nút `danger` "Gỡ server {tên}" luôn mở dialog gõ tên (SRS) |
| `missing-reason` | bấm xác nhận khi chưa chọn lý do: viền 2 `danger` trên `SelectField` + dòng "Chọn lý do khanh.le sẽ thấy" (icon `octagon-x`). Chỉ xảy ra khi không có lý do chọn sẵn (khóa / đặt lại hồ sơ từ trang Người dùng, W2); mở từ báo cáo thì luôn có lý do sẵn và ô chọn không có giá trị trống (W1 Q11) |
| `DP info` (W2) | ô `info` dùng chung, tắt sẵn, ngay dưới nhóm Hành động: icon 16 + câu `label` `text-secondary` (việc chờ không đóng, "đăng nhập được ngay sau khi mở khóa", việc sẽ đóng khi gỡ server, giải thích tài khoản chờ xóa / đã xóa khi panel không có lựa chọn; **(W4)** icon `history` + "Đã khôi phục lựa chọn bạn đang làm dở trước khi phiên đăng nhập kết thúc." khi nháp được khôi phục sau đăng nhập lại — mất khi admin đổi lựa chọn hoặc rời trang) |
| `already-suspended` (W1) | người bị báo cáo đang bị khóa: dưới nhóm Thời hạn thêm dòng `label` `text-secondary` icon `info` "{Tên} đang bị khóa tới {dd/MM/yyyy HH:mm}. Khóa mới thay thời hạn này." (SRS REQ-ADMIN-03 AC9) |
| `pending-deletion` (W1) | tài khoản chờ xóa: `ActionOption` "Khóa tài khoản" và "Đặt lại hồ sơ" vô hiệu kèm dòng "Tài khoản đang chờ xóa"; "Bỏ qua", "Xóa tin" vẫn chọn được |
| `submitting` | nút `loading`, mọi ô khóa |
| `conflict` (`40901`) | panel thành `Receipt · by-other` kèm dòng "Việc đã được xử lý trước khi bạn xác nhận." |
| `error` | khối lỗi `FormMessage` (C-15/C-22 nhóm form) trên nút: "Chưa xử lý được. Thử lại." |

### Luật
- **Nhãn nút nói đủ hậu quả (chốt 01/11/2026):** nhãn ghép từ hành động, tên người, thời hạn, và "và xóa tin" khi ô xóa tin được tick; đổi ngay khi lựa chọn đổi.
- **Xác nhận (chốt 01/11/2026):** Bỏ qua, Xóa tin, khóa có thời hạn, Đặt lại hồ sơ xác nhận ngay trên panel; **Khóa vĩnh viễn** và **Gỡ server** mở dialog (C-53).
- **Sau khi xử lý (chốt 01/11/2026):** panel thu lại thành `Receipt` tại chỗ ("Dấu vết in xuống", `DESIGN.md` › Web quản trị › Motion), chip đầu trang đổi "Đã xử lý", badge sidebar giảm một; **không** tự chuyển sang việc khác; focus vào nút "Sang việc #58" (không có việc tiếp theo: nút `secondary` "Về hàng đợi"). Không dùng toast cho kết quả.
- **Mặc định khi mở:** chưa chọn hành động; lý do chọn sẵn theo báo cáo đầu tiên (SRS REQ-SAFE-02) khi chọn hành động cần lý do; ô xóa tin tick sẵn với đối tượng tin còn (SRS).
- **Giới hạn:** Lời nhắn ≤ 200, Ghi chú ≤ 500 ký tự (SRS v1.10); vượt thì không gõ thêm được và bộ đếm `danger`.
- **Cuộn:** phần lựa chọn cuộn bên trong; nút xác nhận luôn trong khung nhìn.
- **Hành động theo loại đối tượng (SRS REQ-ADMIN-03, W1):** tin — Bỏ qua · Xóa tin · Khóa tài khoản; hồ sơ — Bỏ qua · Đặt lại hồ sơ · Khóa tài khoản; server — Bỏ qua · Gỡ server (khóa Owner làm từ trang Người dùng).
- **Trang người dùng / server (W2 Q4, 02/11/2026):** cùng panel, **không** `SubjectCard`; lý do không chọn sẵn (bấm khi chưa chọn → `missing-reason`). Lựa chọn theo trạng thái tài khoản: Hoạt động — Khóa tài khoản · Đặt lại hồ sơ; Bị khóa — Mở khóa · Khóa tài khoản · Đặt lại hồ sơ; Chờ xóa — không có lựa chọn, thay bằng khối chữ giải thích (Q11). Mở khóa: chỉ Ghi chú nội bộ, nút `primary` "Mở khóa {username}". Server: một lựa chọn Gỡ server (luôn mở dialog `type-name`). Khi người này còn việc đang chờ, chọn Khóa / Đặt lại hồ sơ hiện dòng `info` "Khóa từ đây không đóng {n} việc đang chờ về {username} (#60, #68)." (Q10). Xong: biên nhận tại chỗ + nút `secondary` "Hành động khác" (đưa panel về chưa chọn); trang server không có nút.

### Accessibility
Nhóm Hành động là `radiogroup` "Hành động"; nút xác nhận đọc đúng nhãn hậu quả; biên nhận đọc qua `aria-live` ("Đã khóa khanh.le 7 ngày và xóa tin").

### Checklist duyệt
- [ ] Các trạng thái `empty`, `dismiss`, `delete-message`, `suspend`, `suspend · permanent`, `reset-profile`, `missing-reason`, `submitting`, `Receipt`, `Receipt · by-other`; cả hai theme.
- [ ] Ở khung 1024 × 768 nút xác nhận luôn thấy; phần dưới (Lời nhắn, Ghi chú) có một frame trạng thái đã cuộn.

---

## C-53 · AdminDialog (W1, 01/11/2026)

**Mục đích:** hỏi lại trước hành động không hoàn tác được, hoặc trước khi bỏ chữ đang viết. **REQ:** REQ-ADMIN-03 (Khóa vĩnh viễn, Gỡ server mở dialog), REQ-ADMIN-05 (gõ tên server), SRS 4.11. **Dùng ở:** S-ADM-RPT-02 (W1); trang Người dùng, Server (W2).

### Cấu tạo
```
░░░░░░░░░░░░░░░░░ scrim ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░   ┌─ rộng 480, nền surface-1, bo sheet, bóng shadow, đệm 24 ─┐
░   │ Khóa vĩnh viễn khanh.le?                  ← title-2 700      │
░   │ khanh.le không đăng nhập được nữa cho tới  ← body text-secondary, mỗi hệ quả một đoạn
░   │ khi admin mở khóa.                                       │
░   │ [ô nhập — chỉ biến thể type-name]                         │
░   │                          [  Hủy  ] [ Khóa vĩnh viễn ]     │ ← Button secondary S + danger S, căn phải
░   └──────────────────────────────────────────────────────────┘
```
Dialog căn giữa khung nhìn; nút căn phải theo thứ tự đọc "Hủy" rồi hành động (quy ước desktop).

### Biến thể
| Biến thể | Khác gì | Ghi chú |
|---|---|---|
| `confirm` | tiêu đề + 1–3 đoạn hệ quả + hai nút | Khóa vĩnh viễn |
| `type-name` | thêm `TextField` 40 "Gõ tên server để xác nhận" (nhãn `label` 500 trên ô); nút hành động vô hiệu tới khi chữ gõ **đúng** tên (so phân biệt hoa thường và dấu, bỏ khoảng trắng hai đầu) | Gỡ server (REQ-ADMIN-05 AC2) |
| `discard` | nút "Ở lại" (`secondary`) + "Bỏ và sang việc" (`primary`, không `danger` — chỉ mất chữ chưa gửi); trang người dùng / server: "Bỏ và rời trang" | Chuyển việc khi đã gõ lời nhắn / ghi chú (W1 Q14); rời trang qua link trong trang (W2 Q13 — Back / tải lại / đóng tab của trình duyệt không hỏi) |

### Trạng thái
| Trạng thái | Khác gì so với default |
|---|---|
| `type-name · typed` | chữ khớp tên: nút `danger` bấm được |
| `submitting` | nút hành động `loading`; "Hủy" và Esc vô hiệu |
| `error` | `FormMessage` lỗi trên hàng nút: "Chưa xử lý được. Thử lại."; dialog giữ nguyên |

### Luật
- Mở: focus vào nút "Hủy" (`confirm`, `discard`) hoặc vào ô nhập (`type-name`). Tab chỉ chạy trong dialog. Esc / "Hủy" / bấm scrim đóng, trả focus về nút đã mở dialog.
- Enter trong ô nhập = bấm nút hành động khi đã khớp tên; chưa khớp thì không làm gì.
- Không có URL riêng; Back của trình duyệt đóng dialog trước khi rời trang.
- Câu hệ quả nói việc sẽ xảy ra, không lặp nhãn nút; chỉ nêu câu áp dụng (vd câu Owner chỉ khi người bị khóa sở hữu server).

### Accessibility
`role="alertdialog"`, `aria-labelledby` tiêu đề, `aria-describedby` các đoạn hệ quả.

### Checklist duyệt
- [ ] `confirm`, `type-name` trống / đã gõ đúng, `discard`; cả hai theme; tiêu đề dài 2 dòng không đẩy nút ra ngoài.

---

## C-56 · HistoryPopover (W1, 01/11/2026)

**Mục đích:** cho admin xem các lần admin đã xử lý một người **mà không rời trang việc** — lịch sử tái phạm cũng là bằng chứng. **REQ:** REQ-ADMIN-03 ("Bị admin xử lý {n} lần" → lịch sử tại chỗ). **Dùng ở:** `SubjectCard` (C-49) trong trang xử lý một việc.

### Cấu tạo
```
┌─ rộng 360, nền surface-1, viền border, bo input, bóng shadow, đệm 16 ─┐
│ Lịch sử xử lý của khanh.le                 ← body-sm 600              │
│ Chỉ tính các lần admin xử lý.              ← label text-secondary     │
│ ──────────────────────────────────────────                            │
│ Khóa tài khoản 1 ngày                      ← HistoryItem: body-sm 600 │
│ Lúc        19/10/2026 09:00                ← mono; bộ dòng cố định W2 │
│ Admin      Trâm                                                       │
│ Việc       Từ trang người dùng                                        │
│ Lý do      Lừa đảo                         ← dòng nhãn 72 + giá trị   │
│ Lời nhắn   –                               ← trống: "–"               │
│ Ghi chú    Nhiều người nhắn riêng báo bị lừa mua tài liệu.            │
│ ──────────────────────────────────────────                            │
│ Đặt lại hồ sơ                                                         │
│ Lúc        10/10/2026 14:20                                           │
│ Admin      Hiếu                                                       │
│ Việc       #23                             ← link                     │
│ Lý do      Spam hoặc quảng cáo                                        │
│ Lời nhắn   –                                                          │
│ Ghi chú    –                                                          │
│ ──────────────────────────────────────────                            │
│ Mở trang người dùng ›                      ← link primary 500          │
└───────────────────────────────────────────────────────────────────────┘
```

### Luật
- Neo dưới dòng "Bị admin xử lý {n} lần", căn mép phải theo `SubjectCard`; chỉ lật lên trên khi phía trên còn nhiều chỗ hơn phía dưới. Mới nhất trên cùng. **(duyệt W2, 02/11/2026)** Cao tối đa = chỗ còn lại giữa điểm neo và mép khung nhìn trừ 16 (không quá 420); nội dung cao hơn thì vùng danh sách `HP list` cuộn bên trong (mục cuối bị cắt ngang báo còn cuộn được), đầu và link chân đứng yên; không bao giờ dời popover đè lên dòng neo của nó.
- **Bộ dòng cố định (duyệt W2, 02/11/2026 — thay luật "dòng trống thì ẩn"):** mọi mục luôn đủ sáu dòng, cùng thứ tự: "Lúc" (mono) · "Admin" · "Việc" ("#57" link `primary`; xử lý từ trang Người dùng: "Từ trang người dùng" `text-secondary`) · "Lý do" · "Lời nhắn" (nguyên văn trong ngoặc kép) · "Ghi chú"; dòng không có giá trị ghi "–" `text-tertiary` (Xóa tin không có lý do; không gửi lời nhắn; không ghi chú). Mắt đọc cùng một chỗ ở mọi mục. Không nối thông tin bằng "·". Cùng `HistoryItem` dựng khối "Lịch sử xử lý" ở trang người dùng (W2): mới nhất trên cùng, kẻ mảnh giữa các mục, hiện 5 mục rồi "Xem thêm {n} lần" mở hết tại chỗ.
- Chỉ các lần **admin** xử lý (khóa, mở khóa sớm, đặt lại hồ sơ, xóa tin, gỡ server mà người này là Owner); việc của người quản lý server không tính.
- Mở bằng "Xem ›" (Enter / Space); Esc, bấm ra ngoài hoặc bấm lại "Xem" thì đóng, focus về "Xem". Mở không đổi gì ở panel Quyết định. "#23" mở việc đó (rời trang, áp luật bỏ chữ đang gõ — W1 Q14); "Mở trang người dùng ›" sang trang Người dùng (W2) cùng luật.

### Accessibility
`role="dialog"` không chặn (non-modal), `aria-labelledby` tiêu đề; "Xem" có `aria-expanded`.

### Checklist duyệt
- [ ] 2 lần (thế giới B), 1 lần không ghi chú, cả hai theme; lật lên khi thiếu chỗ.

---

## C-51 · StatStrip (W3, 02/11/2026)

**Mục đích:** vài con số tổng đọc được trong một lần liếc, một ô dẫn thẳng tới việc cần làm. **REQ:** REQ-ADMIN-02 (thẻ số), REQ-ADMIN-03 (nhóm "Cần admin"). **Dùng ở:** S-ADM-OVR-01.

### Cấu tạo
```
──────────────────────────────────────────────────────────────────────────────── kẻ trên border
Người dùng mới   › │ Người hoạt động     │ Phút học            │ Cần admin xử lý   › ← nhãn label 500 text-secondary
3 hôm nay          │ 214                 │ 456 giờ             │ 9                   ← stat (Unbounded 32) + đơn vị body-sm 500 text-secondary
13 trong 7 ngày    │ trong 7 ngày        │ 27.390 phút trong 7…│ 12 đang chờ tất cả  ← dòng phụ body-sm text-secondary
──────────────────────────────────────────────────────────────────────────────── kẻ dưới border
```
Rộng hết vùng nội dung, các ô chia đều, **kẻ dọc `border` giữa các ô** (khác C-47: đây là các số ngang hàng, kẻ dọc giúp mắt tách số lớn), đệm ô 16 dọc / 20 ngang, không bọc thẻ, không nền riêng.

### Biến thể
| Biến thể | Khác gì |
|---|---|
| `StatCell` | nhãn · giá trị (+ đơn vị) · dòng phụ tùy chọn; không bấm được, không hover |
| `StatCell · link` | như trên + `chevron-right` 14 `text-secondary` sau nhãn; cả ô là link |

### Trạng thái
| Trạng thái | Khác gì so với default |
|---|---|
| `link · hover` | nền `surface-2`; nhãn và chevron `text-primary` |
| `link · focus-visible` | `focus-ring` lùi vào trong ô |
| `loading` | nhãn vẫn hiện; giá trị là thanh `surface-2` 96 × 32, dòng phụ thanh 120 × 14, đứng yên |
| `zero` | giá trị "–" Be Vietnam Pro `text-tertiary` cỡ `title-2` (chữ số 0 của Unbounded đọc như chữ O — `DESIGN.md` › Chỉ báo); dòng phụ giữ nguyên |

### Luật
- 2–5 ô; ở 1024 vẫn một hàng (vùng 744 chia 4 ô ≈ 186 — dòng phụ được xuống 2 dòng, giá trị không bao giờ xuống dòng). Dải cao theo ô cao nhất (1440: 114, 1024: 134), mọi ô cao bằng nhau để kẻ dọc chạy hết chiều cao — sửa sau duyệt 02/11/2026: ở 1024 dòng phụ "27.390 phút trong 7 ngày" xuống dòng và tràn qua kẻ dưới.
- Số chỉ đổi giá trị khi làm mới, không lăn (`DESIGN.md` › Motion). Nghìn có dấu chấm.
- "Cập nhật lúc …", "Làm mới" và bộ chọn khoảng (`SegmentFilter` "7 ngày | 30 ngày | 90 ngày", W3 Q16) **không** nằm trong dải mà ở hàng đầu trang: bộ chọn ngay sau tiêu đề (cách 24), "Cập nhật lúc …" + "Làm mới" sát phải. Dòng phụ ghi khoảng đang chọn ("trong 30 ngày").

### Accessibility
Dải là `dl` (nhãn `dt`, giá trị + dòng phụ `dd`); ô link đọc "Cần admin xử lý: 9. 12 đang chờ tất cả. Mở hàng đợi."

### Checklist duyệt
- [ ] 4 ô 1440 và 1024; ô link thường / hover / focus; `loading`; `zero`; cả hai theme.

---

## C-52 · Biểu đồ và KpiTable (W3, 02/11/2026)

**Mục đích:** xu hướng 30 ngày và mức đạt mục tiêu đồ án, đọc được cả khi không nhìn thấy hình. **REQ:** REQ-ADMIN-02, SRS 2.7. **Dùng ở:** S-ADM-OVR-01. Diện mạo: `DESIGN.md` › Web quản trị › Biểu đồ.

### Cấu tạo
```
Người dùng  20/09 – 19/10/2026                                   Xem dạng bảng   ← ChartBlock: title-2 + khoảng label text-secondary + nút text
Người hoạt động mỗi ngày                                                         ← tên biểu đồ nhỏ body-sm 600
150 ┤·································································               ← lưới border, nhãn trục label text-secondary căn phải
100 ┤······╲╱‾‾╲·····╱‾‾‾╲·····╱╲··························╱╲  ● 129             ← đường 2 primary; điểm cuối 8 + nhãn label 600 text-primary
  0 ┼─────────────────────────────────────────────────────────────
Người dùng mới mỗi ngày
  4 ┤
  2 ┤ ▌ ▌                                          ▌ ▌ ▌ ▐▌▐▌▐▌▐▌ █ 3            ← cột đặc primary; ngày 0 không có cột
    └ 20/09     27/09     04/10     11/10     18/10                              ← trục ngày: mỗi Chủ Nhật, dd/MM
```

### Biến thể
| Biến thể | Khác gì |
|---|---|
| `ChartBlock` | đầu khối: tiêu đề `title-2` + khoảng ngày `label` `text-secondary` + nút `text` "Xem dạng bảng" ⇄ "Xem biểu đồ" sát phải; kẻ trên `border` khi không phải khối đầu cột. **Khoảng cách (sửa sau duyệt 02/11/2026):** đầu khối cách nội dung 20; tên biểu đồ nhỏ và chú giải cách **nhãn trục trên cùng** ≥ 16 (nhãn này nhô lên trên vùng vẽ nửa dòng, nên đo tới nhãn, không tới đường lưới); hai biểu đồ nhỏ cách nhau 20 (tên biểu đồ dưới thuộc về vùng vẽ dưới, không dính vào trục 0 của vùng trên); giữa hai khối 16 + kẻ + 16 |
| `LineChart` | một chuỗi, đường 2 `primary` nối các ngày (0 vẫn là một điểm ở đáy); điểm cuối chấm 8 `primary` có vòng 2 `surface-1`, nhãn giá trị cuối `label` 600 `text-primary` ngay phải điểm |
| `ColumnChart` | một chuỗi, cột đặc `primary`, rộng = khoảng ngày trừ khe (≥ 6, khe ≥ 2), đầu cột bo 2; ngày bằng 0 **không vẽ cột** (không có vạch cao 0); nhãn giá trị trên cột cuối |
| `StackedColumnChart` | Học nhóm khối đặc `primary` ở dưới, Học một mình khối rỗng viền 2 `primary` ở trên, khe 2 nền giữa hai đoạn; đầu đoạn trên bo 2; chú giải phía trên vùng vẽ: ô 10 đặc "Học nhóm" · ô 10 rỗng viền 2 "Học một mình" (`body-sm` `text-secondary`) |
| `ChartTooltip` | nền `surface-1`, viền `border`, bo `input`, bóng `shadow`, đệm 12; dòng đầu ngày `label` 600 ("Chủ Nhật 18/10/2026"; hôm nay thêm "(tới 22:10)"); mỗi chuỗi một hàng: mẫu chuỗi 10 + tên `label` `text-secondary` + giá trị `numeric-inline` sát phải + đơn vị; xếp chồng thêm hàng "Tổng" |
| `ChartTable` | bảng thay vùng vẽ, cao bằng vùng vẽ, cuộn bên trong, đầu cột dính; hàng 36; cột Ngày `Cell · mono` ("19/10/2026"; hôm nay "19/10/2026 (tới 22:10)"), cột số `Cell · number` (0 → "–"); **mới nhất trên cùng** |
| `KpiTable` | đầu cột "Chỉ số" · "Kết quả" (căn phải) · "Mục tiêu"; hàng cao theo nội dung, tối thiểu 60 (đệm dọc 10 — sửa sau duyệt 02/11/2026: cột 360 làm tên dài xuống 3 dòng): tên `body-sm` 500 (tối đa 3 dòng) · kết quả `numeric-inline` 500 + đơn vị, dòng phụ mẫu số `label` `text-secondary` ("16 / 18 tài khoản") · mục tiêu `body-sm` ("≥ 70%", "Theo dõi"), dòng phụ "Đạt" (`circle-check` 14 `success`) / "Chưa đạt" (`circle-alert` 14 `warning`) chữ `label` `text-secondary`; câu phạm vi `body-sm` `text-secondary` dưới tiêu đề khối |

### Trạng thái
| Trạng thái | Khác gì so với default |
|---|---|
| `hover` (đường) | đường dóng dọc 1 `border` qua ngày đang trỏ, điểm của ngày đó chấm 8; tooltip phía trên, lật sang trái khi sát mép phải |
| `hover` (cột) | cột đang trỏ giữ nguyên, cột khác mờ 40%; tooltip phía trên cột |
| `table` | `ChartTable` thay vùng vẽ (cùng chiều cao), nút đổi "Xem biểu đồ"; chú giải ẩn |
| `loading` | vùng vẽ là một khối `surface-2` đứng yên; tiêu đề khối, nút bảng (vô hiệu) vẫn hiện; KPI 7 hàng skeleton |
| `KpiTable · insufficient` | ô kết quả "Chưa đủ dữ liệu" `body-sm` `text-tertiary`, không mẫu số; mục tiêu không có dòng Đạt / Chưa đạt |

### Luật
- **Đơn vị của trục (edge case W3, 02/11/2026):** nhãn trục chỉ ghi số; đơn vị ("giờ") là chú thích `label` `text-secondary` ở đầu hàng chú giải, nằm thẳng trên cột nhãn trục, và chú giải bắt đầu thẳng mép vùng vẽ (X0) — "1.200 giờ" không vừa cột nhãn 44. Thang luôn theo giá trị lớn nhất, không cắt; ngày không có dữ liệu vẽ 0 (đường chạm đáy, không cột).
- **Một trục giá trị, bắt đầu từ 0** (cột và đường); 3–4 vạch lưới ở số tròn (0 · 50 · 100 · 150; 0 · 25 · 50 · 75 giờ). Hai đại lượng khác thang → hai biểu đồ nhỏ xếp chồng chung trục ngày, cùng độ rộng vùng vẽ để các ngày thẳng hàng (`DESIGN.md` › Biểu đồ).
- **Trục ngày theo khoảng (W3 Q16):** 30 ngày — 30 cột / điểm, nhãn mỗi Chủ Nhật; 7 ngày — 7 cột / điểm, cột rộng tối đa 24, nhãn từng ngày; 90 ngày — gộp 13 tuần (7 ngày tính lùi từ hôm nay, tuần xa nhất 6 ngày), tên biểu đồ "… mỗi tuần", nhãn ngày cuối tuần của tuần 1, 4, 7, 10, 13, tooltip / bảng ghi khoảng tuần ("13/10 – 19/10/2026"). Mọi khoảng tính cả hôm nay; nhãn dd/MM, năm ghi ở khoảng ngày của tiêu đề khối. Hôm nay chưa hết không đổi hình (cột / điểm như mọi ngày); "(tới HH:mm)" chỉ ở tooltip và bảng.
- **Nhãn trực tiếp chọn lọc:** chỉ giá trị của ngày cuối; không ghi số lên từng cột / điểm. Chữ luôn dùng màu chữ, không dùng màu chuỗi.
- **Vùng trỏ chuột** rộng hết khoảng của một ngày và cao hết vùng vẽ (không phải chỉ cột); cột / điểm không bấm được.
- **"Xem dạng bảng"** (SRS REQ-ADMIN-02, duyệt W3): đổi tại chỗ, mỗi khối độc lập, không nhớ khi tải lại; khối Người dùng có một bảng chung (Ngày · Người hoạt động · Người dùng mới).
- **KPI:** phần trăm làm tròn số nguyên, trừ khi làm tròn khiến kết quả trông như đạt mà thực tế chưa (19,6% → "20%" với mục tiêu ≥ 20%): khi đó ghi một chữ số thập phân "19,6%"; so mục tiêu bằng giá trị chưa làm tròn (edge case W3); mẫu số luôn hiện; "Đạt" khi đạt mục tiêu (≥), chỉ số "Theo dõi" không xét; không tô màu giá trị.

### Accessibility
Vùng vẽ `role="img"` có `aria-label` tóm tắt ("Người hoạt động mỗi ngày từ 20/09 tới 19/10/2026: thấp nhất 79, cao nhất 138, hôm nay 129"); tooltip `aria-hidden` (chỉ cho chuột); nút "Xem dạng bảng" có `aria-pressed`, bảng là `table` thật có `caption`. "Đạt / Chưa đạt" đọc chữ; icon khác hình nên không phụ thuộc màu.

### Checklist duyệt
- [ ] Đường, cột, xếp chồng ở 1440 và 1024 (khoảng ngày ≥ 16); tooltip đường và cột; `table`; `loading`; KPI đủ 7 hàng có Đạt, Chưa đạt, Theo dõi, Chưa đủ dữ liệu; cả hai theme (khối rỗng viền 2 đọc được trên nền tối).

---

## Web quản trị — component P1 (đặc tả khi tới area)

| ID | Component | Quyết định |
|---|---|---|
| C-54 | `Toast` bản web | **Bỏ (W4, 02/11/2026):** W1–W4 không có thao tác nào cần toast — kết quả xử lý là biên nhận tại chỗ (`DESIGN.md` › Web quản trị › Hành động), thông báo nằm trong form, phiên kết thúc báo trên màn đăng nhập. Mở lại khi có thao tác mà kết quả không có chỗ hiện trên trang (sao chép, thao tác hàng loạt trên danh sách) |
| C-55 | `NarrowBlock` | **Bỏ (W4, 02/11/2026):** dưới 1024 trang cuộn ngang thay vì bị chặn (SRS 4.11, `DESIGN.md` › Layout). Master và board đã xóa khỏi canvas |

## Câu hỏi còn mở (web quản trị)

Q1–Q9 Product Owner chốt theo khuyến nghị ngày 01/11/2026; hành vi đã ghi vào SRS v1.10 (REQ-ADMIN-01, 03), Q9 vào `DESIGN.md`. Không còn câu nào mở.

| # | Câu hỏi | Khuyến nghị |
|---|---|---|
| Q1 | (đóng — thứ tự dựng đã duyệt 01/11/2026) | — |
| Q2 | Menu tài khoản: tên + email, "Giao diện" 3 lựa chọn (Theo hệ thống / Sáng / Tối, nhớ trong trình duyệt), "Đăng xuất" không màu `danger`? | Đồng ý |
| Q3 | Bảng có sắp xếp theo cột không? | Không ở MVP; thứ tự cố định theo trang (SRS) — **sửa W2 02/11/2026:** Người dùng và Server sắp xếp được (xem Luật) |
| Q4 | Số mục mỗi trang 25 / 50 / 100, mặc định 50, nhớ theo bảng? (SRS hiện ghi cố định 50) | Đồng ý — sửa SRS 4.11 |
| Q5 | Tìm khi đang gõ (300ms), tìm / lọc / trang nằm trong URL? | Đồng ý |
| Q6 | `CasePager` đi theo hàng đợi đang lọc lúc mở việc; mở từ nơi khác thì không có; J / K? (README #1) | Đồng ý |
| Q7 | Nhãn nút nói đủ hậu quả; xác nhận ngay trên panel trừ Khóa vĩnh viễn và Gỡ server mở dialog? (README #1) | Đồng ý |
| Q8 | Sau khi xử lý: biên nhận tại chỗ + nút "Sang việc #58", không tự chuyển, không toast? (README #1) | Đồng ý |
| Q9 | `SegmentFilter` đang chọn đảo màu (bổ sung `DESIGN.md`) | Đồng ý — đã ghi |
