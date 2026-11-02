---
# gstack: design-md-format=spec
name: NezFocus
description: Đèn bàn trong phòng tối — căn phòng navy yên tĩnh, thứ duy nhất sáng là nhịp chung của những người đang học cùng nhau.
colors:
  bg: "#F6F8FE"
  surface-1: "#FFFFFF"
  surface-2: "#EEF2FB"
  surface-3: "#DCE4F6"
  text-primary: "#1B2140"
  text-secondary: "#4B5578"
  text-tertiary: "#5F6889"
  primary: "#3A64CC"
  on-primary: "#FFFFFF"
  primary-inverse: "#6EA6FB"
  border: "#C2CDE8"
  border-input: "#7C88AE"
  phase-focus: "#3A64CC"
  phase-focus-room: "#E6EDFD"
  phase-short: "#8F5A00"
  phase-short-room: "#FBF0DA"
  phase-long: "#A4432A"
  phase-long-room: "#FBE6DE"
  success: "#1E7A4F"
  warning: "#8A5A00"
  danger: "#C2283A"
  brand-primary: "#547FE4"
  brand-navy: "#2B3257"
  overlay-pressed: "#00000014"
  scrim: "#F6F8FE99"
  shadow: "#2B325724"
  dark:
    bg: "#11162A"
    surface-1: "#171D35"
    surface-2: "#1E2542"
    surface-3: "#262F52"
    text-primary: "#E6EAF6"
    text-secondary: "#A4AECB"
    text-tertiary: "#8590B2"
    primary: "#6EA6FB"
    on-primary: "#0E1430"
    primary-inverse: "#3A64CC"
    border: "#2F3961"
    border-input: "#646F98"
    phase-focus: "#6EA6FB"
    phase-focus-room: "#0F1A36"
    phase-short: "#F2B45C"
    phase-short-room: "#211B10"
    phase-long: "#F08A6C"
    phase-long-room: "#26150F"
    success: "#4CC38A"
    warning: "#F59A3C"
    danger: "#FF7A7A"
    brand-primary: "#547FE4"
    brand-navy: "#2B3257"
    overlay-pressed: "#00000029"
    scrim: "#11162A99"
    shadow: "#2B325766"
typography:
  display:
    fontFamily: Be Vietnam Pro
    fontWeight: 800
    fontSize: 34px
    lineHeight: 44px
  title-1:
    fontFamily: Be Vietnam Pro
    fontWeight: 700
    fontSize: 26px
    lineHeight: 36px
  title-2:
    fontFamily: Be Vietnam Pro
    fontWeight: 600
    fontSize: 20px
    lineHeight: 28px
  headline:
    fontFamily: Be Vietnam Pro
    fontWeight: 600
    fontSize: 17px
    lineHeight: 24px
  body:
    fontFamily: Be Vietnam Pro
    fontWeight: 400
    fontSize: 16px
    lineHeight: 24px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontWeight: 400
    fontSize: 14px
    lineHeight: 20px
  label:
    fontFamily: Be Vietnam Pro
    fontWeight: 500
    fontSize: 13px
    lineHeight: 20px
  tab:
    fontFamily: Be Vietnam Pro
    fontWeight: 500
    fontSize: 11px
    lineHeight: 14px
  timer:
    fontFamily: Unbounded
    fontWeight: 500
    fontSize: 60px
    lineHeight: 69px
    fontFeature: tnum
  timer-long:
    fontFamily: Unbounded
    fontWeight: 500
    fontSize: 48px
    lineHeight: 56px
    fontFeature: tnum
  stat:
    fontFamily: Unbounded
    fontWeight: 600
    fontSize: 32px
    lineHeight: 40px
    fontFeature: tnum
  numeric-inline:
    fontFamily: Unbounded
    fontWeight: 500
    fontSize: 13px
    lineHeight: 20px
    fontFeature: tnum
  mono:
    fontFamily: JetBrains Mono
    fontWeight: 400
    fontSize: 14px
    lineHeight: 22px
rounded:
  badge: 4px
  input: 8px
  button: 12px
  server: 16px
  sheet: 24px
  full: 9999px
spacing:
  space-1: 4px
  space-2: 8px
  space-3: 16px
  space-4: 24px
  space-5: 32px
  space-6: 48px
  space-7: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    fontSize: "{typography.body.fontSize}"
    fontWeight: "{typography.body.fontWeight}"
    rounded: "{rounded.button}"
    height: 44px
    padding: 0 16px
  button-secondary:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.primary}"
    borderColor: "{colors.border-input}"
    fontSize: "{typography.body-sm.fontSize}"
    fontWeight: "{typography.body-sm.fontWeight}"
    rounded: "{rounded.button}"
    height: 40px
    padding: 0 16px
  chip-status:
    textColor: "{colors.text-secondary}"
    borderColor: "{colors.border}"
    fontSize: "{typography.label.fontSize}"
    fontWeight: "{typography.label.fontWeight}"
    rounded: "{rounded.full}"
    padding: 4px 16px
  room-control:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-primary}"
    borderColor: "{colors.border}"
    rounded: "{rounded.full}"
    size: 56px
  room-control-main:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.bg}"
    rounded: "{rounded.full}"
    size: 64px
  rhythm-ring:
    trackColor: "{colors.border}"
    size: 280px
  mini-player:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-primary}"
    borderColor: "{colors.border}"
    height: 64px
  tab-bar:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-tertiary}"
    activeColor: "{colors.primary}"
    fontSize: "{typography.tab.fontSize}"
    fontWeight: "{typography.tab.fontWeight}"
    borderColor: "{colors.border}"
    height: 56px
  badge-count:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.bg}"
    fontSize: "{typography.tab.fontSize}"
    fontWeight: "{typography.tab.fontWeight}"
    rounded: "{rounded.full}"
  speaking-ring:
    borderColor: "{colors.text-primary}"
    borderWidth: 2px
    gap: 2px
  video-tile:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-primary}"
    scrimColor: "{colors.scrim}"
    rounded: "{rounded.button}"
  toast:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.bg}"
    actionColor: "{colors.primary-inverse}"
    rounded: "{rounded.button}"
  presence-dot:
    online: "{colors.success}"
    idle: "{colors.warning}"
    dnd: "{colors.danger}"
    offline: "{colors.text-tertiary}"
    size: 10px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.bg}"
    rounded: "{rounded.button}"
    height: 44px
  badge-count-neutral:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.full}"
  focus-ring:
    borderColor: "{colors.primary}"
    borderWidth: 2px
    gap: 2px
  admin-sidebar:
    backgroundColor: "{colors.bg}"
    borderColor: "{colors.border}"
    width: 232px
  data-table:
    backgroundColor: "{colors.surface-1}"
    borderColor: "{colors.border}"
    hoverColor: "{colors.surface-2}"
    selectedColor: "{colors.surface-3}"
    fontSize: "{typography.body-sm.fontSize}"
    rowHeight: 48px
---

# NezFocus

## Overview

**Creative North Star:** "Đèn bàn trong phòng tối." App là một căn phòng navy yên tĩnh, lấy màu từ visor của Runtime. Thứ duy nhất "sáng" là **nhịp chung**: con số đồng hồ, nhãn pha và những người đang ngồi cùng bạn. Sự vui tươi dành cho Runtime và các khoảnh khắc chúc mừng, không rải lên giao diện.

**Bối cảnh sản phẩm:** App mobile học nhóm (Android ≥ 8 ở MVP — DEC-30, iOS ở Backlog; React Native) cho sinh viên Việt Nam: server/kênh kiểu Discord cộng lớp Study/Focus — Pomodoro đồng bộ trong phòng voice, Solo Session, streak, Việc cần làm. Dùng chủ yếu buổi tối, trong phòng tối hoặc ký túc xá, điện thoại đặt cạnh sách: liếc đồng hồ rồi khóa màn hình. Đội vận hành có thêm một **web quản trị** trên máy tính (SRS v1.10, CR-27) — phần riêng của nó ở mục [Web quản trị](#web-quản-trị).

**Chế độ theo màn hình:**
- Experience — Study Room, Solo Session (đồng hồ chạy, nhìn lướt, cần tĩnh).
- Operate — chat, danh sách kênh, Việc cần làm, cài đặt.
- Read — streak, thống kê.
- Persuade — Welcome, onboarding.

**Điều cần nhớ:** *Mở NezFocus là thấy mình không học một mình — cả phòng cùng chung một nhịp Tập trung / Nghỉ.*

**App tham khảo:** Forest, Flora, YPT (Yeolpumta), StudyStream, Study Bunny, Focumon, Quectos/Pogether (body doubling), Discord mobile. Mọi app focus lấy đồng hồ làm nhân vật chính và cho người dùng một con vật ảo làm bạn, vì giả định người học ở một mình. Người dùng NezFocus ngồi cùng bạn thật, nên nhân vật chính là **đồng hồ cùng những người đang chia sẻ nó**.

**Đặc điểm chính:**
1. Vòng nhịp có avatar người cùng phòng ngồi quanh — họa tiết chữ ký duy nhất.
2. Nền tối navy, không đen OLED; chữ không trắng tinh.
3. Tập trung là xanh thương hiệu, Nghỉ là tông ấm — cả phòng đổi màu cùng lúc.
4. Số có giọng riêng (Unbounded), chữ có giọng riêng (Be Vietnam Pro).

## Colors

**Chiến lược:** Committed — màu xanh thương hiệu làm chủ app; trung tính sinh từ sắc navy của visor. **Màn hình Focus Session (Study Room và Học một mình) là bề mặt duy nhất được phủ màu** (nền tràn viền đổi theo pha); mọi nơi khác giữ trung tính.

**Neo thương hiệu** (nguồn: `Des/nez-mascot/MASCOT_BRIEF.md` §3):
- `brand-primary` = PRIMARY `#547FE4`, giữ nguyên cho logo và mảng lớn không có chữ. Chỉ đạt 3.8:1 với chữ trắng nên không làm nền nút.
- `primary` sáng = PRIMARY đậm hơn để đạt AA; `primary` tối = GLOW `#6EA6FB` nguyên bản.
- `bg` sáng = thân Runtime `#F6F8FE`; `surface-3` sáng = dải đổ khối `#DCE4F6`; `border` sáng = `#C2CDE8`.
- `bg` và các `surface` tối sinh từ VISOR `#1F2744`; `brand-navy` = OUTLINE `#2B3257`; `text-primary` sáng sinh từ OUTLINE.

**Theme:** Theme tối dẫn dắt (bối cảnh dùng buổi tối, phòng tối); theme sáng làm đầy đủ. Mặc định theo hệ thống (SRS 3.3). Theme tối giữ phân cấp bằng độ sáng tăng dần theo độ cao: `bg` → `surface-1` → `surface-2` → `surface-3`. Không dùng `#000000`, chữ chính tối đa ~15:1 (không 21:1) để tránh mỏi mắt khi dùng lâu ban đêm.

**Trạng thái nghiệp vụ (pha):** mỗi pha luôn có đủ 4 tín hiệu — màu, icon, nhãn, kiểu nét vòng.

| Pha | Màu | Nền phòng | Icon (lucide) | Nhãn | Vòng nhịp |
|---|---|---|---|---|---|
| Tập trung | `phase-focus` | `phase-focus-room` | `lamp-desk` | "Tập trung" | nét đặc, vơi dần |
| Nghỉ ngắn | `phase-short` | `phase-short-room` | `coffee` | "Nghỉ ngắn" | nét gạch, đầy dần |
| Nghỉ dài | `phase-long` | `phase-long-room` | `moon` | "Nghỉ dài" | vòng đôi, đầy dần |

Vòng nhịp luôn neo ở 12 giờ và mép cung chạy theo chiều kim đồng hồ ở mọi pha (vơi hay đầy đều cùng một chiều). Số trong vòng là **thời gian còn lại của pha**.

Ba quy tắc cứng (rút ra từ chỗ các màu trùng nhau khi mô phỏng mù màu):
1. Màu pha chỉ xuất hiện trong thành phần của phiên học (vòng nhịp, nhãn pha, mini-player, hàng phòng đang hoạt động, notification) và ở **icon dòng hoạt động học** (14 px, icon của pha kèm chữ "Tập trung · còn 18 phút"…) trong DMRow, MemberRow, FriendRow, header DM và khối hoạt động của hồ sơ (31/10/2026, SRS v1.9 CR-25 #16, component `ActivityLine`). Chỉ icon mang màu pha; chữ của dòng giữ `text-secondary`, không tô nền.
2. Màu ngữ nghĩa (`success`/`warning`/`danger`) không xuất hiện trong Study Room; lỗi kết nối, quyền và trạng thái trong phòng dùng banner trung tính kèm icon. **Ngoại lệ (22/10/2026):** thao tác phá hủy (Dừng phiên học, Tắt Phòng học, Từ chối cuộc gọi đến) và lỗi nhập trong ô (sheet chu kỳ) được dùng `danger`, luôn kèm nhãn chữ.
3. `warning` trùng họ màu với `phase-short`, nên chỉ xuất hiện dạng icon kèm chữ. `success`/`danger` trùng nhau với người mù màu đỏ–lục, nên luôn có icon (`circle-check` / `octagon-x`) và chữ.

Hai nền phòng Nghỉ ngắn / Nghỉ dài gần như trùng nhau với người mù màu — có chủ đích: "Nghỉ" là một họ; hai pha nghỉ phân biệt bằng nhãn, icon và kiểu nét.

**Presence** (REQ-AUTH-05): **hình dạng là tín hiệu chính**, màu là phụ — Online = chấm đặc `success`; Idle = trăng khuyết `warning`; DND = tròn có gạch ngang `danger`; Offline/Invisible = vòng rỗng `text-tertiary`. Chấm 10 (avatar 32–40) hoặc 14 (avatar 56–96), góc dưới phải, viền cắt 2 màu nền. Không hiện presence quanh vòng nhịp hay trong Study Room (quy tắc 2) — chỉ ở danh sách thành viên, DM, bạn bè.

**Tương phản** (WCAG 2.2, tính bằng công thức, không ước lượng; sáng · tối):

| Cặp | Sáng | Tối |
|---|---|---|
| `text-primary` / `bg` | 14.78 | 14.90 |
| `text-secondary` / `bg` | 6.89 | 8.10 |
| `text-tertiary` / `bg` | 5.17 | 5.66 |
| `primary` / `bg` | 5.10 | 7.26 |
| `on-primary` / `primary` | 5.42 | 7.33 |
| `bg` / `text-primary` (chữ, icon của toast đảo màu) | 14.78 | 14.90 |
| `primary-inverse` / `text-primary` (nút hành động của toast, chữ 600) | 6.36 | 4.51 |
| `border-input` / `bg` (≥ 3:1, không phải chữ) | 3.30 | 3.64 |
| `text-primary` / nền phòng (3 pha) | 13.06–13.88 | 14.21–14.60 |
| màu pha / nền phòng của nó | 4.62–5.12 | 6.97–9.32 |
| `success` · `warning` · `danger` / `bg` | 5.00 · 5.58 · 5.41 | 8.09 · 8.17 · 7.10 |

Mô phỏng mù màu (Machado 2009, mức nặng nhất, ΔE Lab): Tập trung ↔ Nghỉ ngắn 65–112, Tập trung ↔ Nghỉ dài 73–102 ở cả protan, deutan, tritan.

## Typography

**Chữ một giọng, số một giọng.**

- **Be Vietnam Pro** (Lâm Bảo, Tony Le, ViệtAnh Nguyễn) cho mọi chữ: display, tiêu đề, body, label. Font do người Việt thiết kế, xử lý dấu chồng tốt nhất trong nhóm đã xét. Không có `tnum` (chữ số proportional) nên **không dùng cho số thay đổi theo thời gian**.
- **Unbounded** cho số: đồng hồ, streak, thống kê, thời gian trong danh sách và mini-player. Hình học, rộng, chắc — gần wordmark, đọc được từ xa một bàn học. Chữ số mặc định **không** đều độ rộng ("1" = 471, "0" = 893 đơn vị) → **bắt buộc `fontVariant: ['tabular-nums']`**; dự phòng: đóng băng `tnum` vào file bằng `pyftfeatfreeze` (OFL không có Reserved Font Name nên được phép). Đơn vị đi kèm số ("giờ", "phút", "ngày") viết bằng Be Vietnam Pro, không bằng Unbounded.
- **Đồng hồ đếm theo phút:giây**, kể cả pha dài ("87:12", "112:05"; không dùng giờ:phút:giây). **Cỡ số chọn theo độ dài pha lúc pha bắt đầu** và giữ tới hết pha: pha ≥ 100 phút dùng `timer-long` (48), còn lại `timer` (60) — không đổi cỡ giữa lúc đếm. Tổng thời gian trong thống kê vẫn viết "1 giờ 52 phút".
- **Số trong danh sách chỉ ghi phút còn lại**: phòng của người khác (danh sách kênh, "Đang học lúc này") ghi "Tập trung · còn 18 phút", cập nhật mỗi phút; đếm từng giây chỉ dành cho phiên của chính mình (vòng nhịp, mini-player). Chốt 17/10/2026.
- **"Số thay đổi theo thời gian" ở trên là đồng hồ đếm giây** (31/10/2026): Be Vietnam Pro không có `tnum` nên chữ số nhảy độ rộng khi đổi mỗi giây — đó là lý do phải dùng Unbounded. Cụm chữ chỉ đổi theo phút và nằm trong một câu — "còn 18 phút" giữa vòng `other-session` (`title-1`) và dòng hoạt động học (`ActivityLine`, `label`) — viết bằng Be Vietnam Pro cùng kiểu chữ với câu, không đổi font giữa câu. `PhaseBadge` (thời gian trong danh sách kênh, "Đang học lúc này", mini-player) và số thống kê giữ Unbounded như cũ.
- **JetBrains Mono** cho code trong chat và mã mời. Monospace thật. Trên web quản trị, mono còn là **giọng của dấu vết**: mã việc ("#57") và dấu thời gian trong cột bảng, nhật ký, biên nhận (xem [Web quản trị](#web-quản-trị)).

**Xác minh** (16/10/2026, tải file TTF và kiểm bằng fontTools): cả ba font đủ 146 ký tự tiếng Việt dựng sẵn trong mọi độ đậm đã kiểm, subset `vietnamese` trên Google Fonts, giấy phép SIL OFL 1.1.

| Font | Nguồn | Độ đậm dùng | File cho app |
|---|---|---|---|
| Be Vietnam Pro | `github.com/google/fonts/tree/main/ofl/bevietnampro` | 400, 500, 600, 700, 800 | TTF tĩnh có sẵn |
| Unbounded | `github.com/google/fonts/tree/main/ofl/unbounded`, `github.com/googlefonts/unbounded` | 500, 600 | variable `wght 200–900`; xuất bản tĩnh 500/600 (fontTools `instancer`) nếu runtime không hỗ trợ variable font |
| JetBrains Mono | `github.com/google/fonts/tree/main/ofl/jetbrainsmono` | 400, 700 | TTF tĩnh có sẵn |

Đã loại: Lexend, Readex Pro (không `tnum`); Sora, Figtree (không có tiếng Việt). Manrope và Archivo Expanded đạt yêu cầu, là phương án dự phòng cho số.

**Dấu tiếng Việt:** dấu chồng của Be Vietnam Pro vượt ascent ("Ẩ" cao 1.158em, ascent 1.0em) → luôn đặt `lineHeight` tường minh ≥ 1.4× (đã có trong thang); không để mặc định, nền tảng sẽ cắt dấu.

**Cỡ chữ 200%:** chữ thường co giãn tự do và được phép xuống dòng; tiêu đề giới hạn `maxFontSizeMultiplier` 1.6. Đồng hồ (`timer`, `stat`) không co giãn — đã ≥ 32pt — và có `accessibilityLabel` đọc thành lời ("còn 18 phút 42 giây"). Mức tối thiểu là 13 (`label`); ngoại lệ duy nhất là `tab` 11 cho nhãn tab bar và badge, theo quy ước iOS/Android. Nhãn ngắn dưới icon trong khung hẹp (`TabBar`, `RoomControl`) giới hạn phóng ×1.3 và nhấn giữ hiện tooltip có nhãn đầy đủ. Vòng nhịp được giữ ở mọi cỡ chữ: chữ bên trong vòng chuyển ra dưới vòng.

## Layout

- **Frame:** 390 × 844 (chuẩn), kiểm thêm 360 × 800. Không có layout tablet riêng.
- **Lề màn hình:** 16 (`space-3`). Safe area trên/dưới luôn chừa.
- **Lưới:** bội số 8. `space-1` (4) chỉ dùng cho cặp sát nhau: icon–chữ, tiêu đề–dòng phụ.
- **Thanh cố định:** header kênh 56; tab bar 56 + safe area; mini-player 64, nằm ngay trên tab bar; server rail 72.
- **Mật độ theo chế độ:** Operate — danh sách tràn viền, căn trái, chia dòng bằng kẻ mảnh `border`, không bọc thẻ. Experience — một cột; đồng hồ ở 1/3 trên, điều khiển ở vùng ngón cái; **chỉ ở đây được căn giữa**. Read — số lớn căn trái, biểu đồ bằng dữ liệu thật. Persuade — tiêu đề lớn căn trái, mascot lệch góc.
- **Đồng hồ luôn cách 1 chạm** từ tab Học hoặc mini-player.

## Elevation & Depth

Chiều sâu tạo bằng **bậc sáng của bề mặt** và kẻ mảnh, không bằng bóng đổ: `bg` < `surface-1` < `surface-2` < `surface-3` (tối: sáng dần; sáng: `surface-1` trắng nổi trên `bg`). Ngoại lệ duy nhất là bottom sheet và dialog: bóng lệch `0 -4` mờ `24` màu `shadow` (`brand-navy` 14% sáng / 40% tối), cộng scrim `bg` 60%. Toast tách khỏi nền bằng đảo màu, không bằng bóng. Không glow, không quầng sáng không độ lệch, không panel kính mờ.

## Shapes

Bo góc theo vai trò, không một bán kính cho mọi thứ: `badge` 4 · `input` 8 (ô nhập, khung code) · `button` 12 (nút, khối Học một mình) · `server` 16 (squircle icon server) · `sheet` 24 (mép trên sheet/drawer) · `full` (avatar, chip, nút điều khiển trong phòng). Ô video `button` (12). Danh sách và nền phòng không bo. Phần tử lồng: bán kính trong = bán kính ngoài − khoảng cách.

## Components

Chỉ các component đã thực sự dựng trong bản xem trước (`Des/nezfocus.pen`). Đặc tả đủ trạng thái nằm ở `Docs/design/screens/00-components.md`.

- **button-primary** — một hành động chính mỗi màn hình. Nhấn: nền tối đi 8%; vô hiệu: `surface-3` + `text-tertiary`; đang xử lý: giữ nguyên kích thước, thay nhãn bằng spinner nhỏ.
- **button-secondary** — viền `border-input`, chữ `primary` (ví dụ "Vào" trên hàng phòng).
- **chip-status** — trạng thái không bấm được (vai trò Host trong phiên học, quan hệ trong hồ sơ "Bạn bè" / "Đã chặn"): icon 14 + nhãn, viền mảnh.
- **room-control / room-control-main** — nút tròn trong Study Room kèm nhãn chữ bên dưới; nút chính (Tạm dừng / Tiếp tục) đảo màu `text-primary`. Không dùng màu pha hay `primary` cho điều khiển trong phòng, để không trùng `phase-long`/`phase-focus`.
- **toast** — bề mặt **đảo màu** thứ hai sau `room-control-main` (30/10/2026): nền `text-primary`, chữ và icon `bg`, hành động (`Button · text`) màu `primary-inverse` đậm 600, bo `button`, **không bóng**. Mọi icon trong toast (kể cả lỗi `octagon-x`, thành công `circle-check`) cùng màu chữ — không dùng `success`/`danger` trên nền đảo màu (dưới 3:1); câu chữ nói lỗi gì. `primary-inverse` = `primary` của theme ngược lại. Vị trí, hàng đợi, thời gian giữ: `Docs/design/screens/10-modals-overlays.md` S-MOD-04.
- **rhythm-ring** — vòng nhịp: track `border`, tiến độ theo màu pha, độ dày 7% đường kính; số `timer` + nhãn pha + dòng chu kỳ ở giữa; tối đa 12 avatar 40 ngồi trên chu vi (quá 12: "+N" mở danh sách); avatar tạm vắng mờ 45%. Khi chữ ≥ 200%: giữ vòng và ghế, nhãn pha và dòng chu kỳ chuyển xuống dưới vòng (chốt 16/10/2026).
- **speaking-ring** — người đang nói (REQ-VC-02): trên avatar là **vòng 2 `text-primary` cách avatar một khe 2** (khe cùng màu nền phía sau), để không dính vào vòng nhịp; trên ô video là viền 2 quanh ô. Hiện khi bắt đầu nói (≤ 300ms) và mờ dần khi ngừng (`short`); **không nhấp nháy**. Không glow, không màu ngữ nghĩa, không `primary` (trùng `phase-focus`); viền trung tính tương phản cao đọc được ở cả hai theme.
- **video-tile** — ô camera tỉ lệ 3:4, bo `button`; tên và icon mic (chỉ khi người đó bật mic hoặc bị tắt tiếng) trên dải scrim `bg` 60% ở đáy; tắt camera: nền `surface-2` + avatar 56 nằm giữa phần **phía trên dải tên** (không phải giữa cả ô — 30/10/2026; áp cho lưới, cuộc gọi, dải ô chia sẻ, ô nổi); ô của chính mình lật gương.
- **presence-dot** — xem Colors › Presence.
- **mini-player** — icon pha + tên phòng + nhãn pha + thời gian (`numeric-inline`), nút Mic và Rời phòng 48. **Nút Camera 48** (trạng thái bật, như `room-control` bật) chỉ hiện khi camera của mình **đang bật** (ở phòng hoặc cuộc gọi), đứng trước Mic; chạm là tắt camera ngay và nút biến mất; camera tắt thì không có nút — bật camera chỉ ở màn phòng / màn cuộc gọi (30/10/2026, thay icon nhắc `video`). Khung 360: tên cắt `…` trước các nút.
- **tab-bar** — 5 tab phẳng, nền `surface-1`, kẻ trên `border`; tab đang chọn: icon + nhãn `primary`. Không dùng kiểu capsule kính mờ.
- **badge-count** — số chưa đọc trên tab, nền `danger`.

## Platform & Touch

- Vùng chạm ≥ 48 ở mọi nơi (48dp Android; cũng đạt 44pt nếu iOS vào phạm vi).
- Giữ quy ước nền tảng: tab bar dưới, nút Back hệ thống Android đóng drawer/sheet trước, cử chỉ Back ở mép màn hình (Android gesture navigation) không bị drawer chiếm (SRS 3.1).
- **Thứ tự của Back hệ thống** (30/10/2026, SRS v1.9 › 3.1): đóng sheet / dialog → đóng drawer → quay lại màn trước trong stack của tab → ở gốc của tab khác Home: về tab Home (giữ trạng thái tab cũ) → ở gốc của Home (kênh đang mở, drawer đóng): đưa app ra nền, không mở drawer. Bật predictive back (Android 14+): xem trước màn sắp về khi đang vuốt. Không có nút ← → riêng trong app (rail, header); màn đẩy chồng giữ ‹ ở `ScreenHeader`.
- Rung phản hồi: một nhịp nhẹ khi chuyển pha (app foreground), khi gửi reaction; tôn trọng cài đặt tắt rung.
- Đồng hồ ngoài app: local notification chuyển pha (MVP) lặp lại đúng icon + nhãn + số.

## Accessibility

- Tương phản: chữ ≥ 4.5:1, thành phần không phải chữ ≥ 3:1, ở cả hai theme (bảng ở mục Colors).
- Pha và trạng thái không bao giờ chỉ bằng màu (4 tín hiệu cho pha; icon + chữ cho trạng thái).
- Cỡ chữ 200%: xem mục Typography; mọi spec màn hình ghi rõ chỗ xuống dòng, chỗ cắt `…`.
- Giảm chuyển động: xem mục Motion.
- Trình đọc màn hình: đồng hồ đọc thành lời; vòng nhịp đọc "Tập trung, vòng 2, còn 18 phút"; avatar quanh vòng gom thành một phần tử "9 người đang Tập trung"; chuyển pha được thông báo ("Chuyển sang Nghỉ ngắn, 5 phút").

## Illustration & Mascot

**Tài sản:** Runtime — `Des/nez-mascot/dist/runtime.riv` (Rive, view model `Mascot`, enum `mood`: neutral · happy · wink · focus · surprised · sleepy · confused; `isAsleep`; trigger `wave`). Ảnh tĩnh từng mood: `Des/nez-mascot/build/moods/*.png`. Không vẽ thêm, không sinh mascot bằng AI.

| Ở đâu | Mood | Cỡ |
|---|---|---|
| Welcome, onboarding | happy, wink (`wave` khi chào) | 160–200 |
| Empty state | neutral | 96–120 |
| Chúc mừng streak, mốc tuần | happy | 120 |
| Lỗi nhẹ: offline, tìm không ra | confused | 96 |
| **Pha Nghỉ** của Study Room / Solo Session, giữa vòng nhịp | sleepy (Nghỉ ngắn), happy (Nghỉ dài) | 64–72 |

**Không bao giờ:** trong pha Tập trung; chat, Việc cần làm, cài đặt; mini-player, notification; dialog nghiêm trọng (ban, xóa tài khoản, mất dữ liệu); **khi streak bị gãy** (mascot buồn tạo cảm giác tội lỗi). Mascot biến mất ngay khi pha Tập trung bắt đầu.

**Logo** (thêm 01/11/2026, CR-26): chữ **N** trên ngực áo, tai nghe và balo của Runtime — `MASCOT_BRIEF.md` đã gọi đó là logo NezFocus, nên app và bản web dùng chung một dấu hiệu. Hình học lấy đúng từ `nez-mascot` (`runtime.rml` › `ChestLogo`: hai mảnh đối xứng xoay 180° chạm nhau ở tâm); không vẽ lại, không kéo méo, không xoay, không đặt trên nền màu pha, không thêm bóng hay gradient.
- **Icon app** (`icon.png` 1024): ô vuông tràn viền nền `brand-primary`, chữ N trắng chiếm 62% (launcher tự bo).
- **Adaptive icon Android:** lớp nền `brand-primary` (`backgroundColor` `#547FE4`); lớp trước là chữ N trắng chiếm 42% cạnh, nằm trong vùng an toàn 66% nên mặt nạ tròn, squircle hay bo góc đều không cắt vào chữ; lớp đơn sắc (`monochrome`) là chữ N trắng cho themed icon của Android 13 (hệ thống tự tô màu).
- **Splash:** nền `bg` theo theme hệ thống (sáng `#F6F8FE`, tối `#11162A`), chữ N `brand-primary` rộng khoảng 100dp ở giữa; không mascot, không chữ (Android 12+ cắt icon splash thành hình tròn 2/3 nên chữ N chiếm 42% ảnh).
- Trong giao diện app hiện chưa có chỗ nào hiện logo (màn đăng nhập dùng chữ "Chào mừng tới NezFocus"); khi cần thì dùng chữ N màu `primary`.
- Tệp: `Des/brand/` (SVG nguồn từ bản web + PNG của app); board `C-41 · Logo, icon app & splash` trong `Des/nezfocus.pen`; tệp cài vào code ở `apps/mobile/assets/` của repo code.

## Do's and Don'ts

- Nên: đặt mọi đồng hồ đếm giây, streak và số thống kê bằng Unbounded + `tabular-nums` (cụm "còn N phút" trong câu chữ: xem Typography).
- Nên: kèm icon và nhãn mỗi khi dùng màu pha hoặc màu ngữ nghĩa.
- Nên: giữ một hành động chính mỗi màn hình; hành động chính là màu đặc `primary`.
- Nên: dùng dữ liệu thật trong biểu đồ và danh sách người; avatar chữ cái chỉ là trạng thái khi chưa có ảnh.
- Nên: đặt `lineHeight` tường minh cho mọi chữ tiếng Việt.
- Không nên: dùng màu pha ngoài phiên học (trừ icon dòng hoạt động học, quy tắc 1), hay màu ngữ nghĩa trong Study Room (trừ ngoại lệ ở quy tắc 2).
- Không nên: bọc mọi thứ trong thẻ bo góc có bóng; dùng gradient cho nút, chữ hay nhận diện.
- Không nên: dùng `#547FE4` làm nền chữ trắng; dùng `#000000` làm nền tối.
- Không nên: cho chữ số đồng hồ lăn/trượt — chỉ đổi giá trị để liếc là đọc được.
- Không nên: đặt mascot ở nơi người dùng đang tập trung.

## Motion

- **Cách tiếp cận:** có chủ đích — chậm, đồng bộ, biên độ nhỏ.
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out).
- **Thời lượng:** micro 120ms · short 200ms · medium 320ms · long 1200ms (chỉ cho chuyển pha).
- **Giảm chuyển động:** mọi chuyển động thành crossfade 200ms; vẫn rung và vẫn thông báo bằng lời.
- **Khoảnh khắc được dàn dựng — "Cả phòng thở ra":** lúc 00:00, theo cùng timestamp của backend cho mọi máy: vòng khép lại → nền phòng crossfade sang màu pha mới trong 1200ms → nhãn pha trượt lên 8 và nhường chỗ nhãn mới → avatar quanh vòng "thở" lần lượt cách nhau 40ms theo thứ tự vào phòng → một nhịp rung. Chữ số đồng hồ không có hiệu ứng.

## Web quản trị

Thêm 01/11/2026 (SRS v1.10, CR-27, Mục 4.11; chế độ cập nhật của `ui-design-system-vi`, có hai góc nhìn độc lập). Web cho đội vận hành (`apps/admin`), cùng thương hiệu và token với app; mục này chỉ ghi phần riêng của desktop. Bản xem trước đã duyệt: các frame `Preview · Web quản trị · …`, `Preview · Báo cáo #57 · …`, `Preview · Người dùng · …` trong `Des/nezfocus.pen` (vùng x ≥ 66000).

**Bối cảnh:** công cụ nội bộ cho 1–5 admin, chế độ Operate (Báo cáo, Người dùng, Server, Nhật ký) và Read (Tổng quan). Điều cần nhớ: *Mọi quyết định xử lý đều đặt cạnh bằng chứng và để lại dấu vết.* Theme sáng dẫn dắt (văn phòng ban ngày, máy chiếu khi bảo vệ đồ án); theme tối làm đầy đủ, theo `prefers-color-scheme` kèm nút đổi. Màu theo kiểu Restrained: `primary` chỉ cho hành động chính, mục đang chọn, link và focus. Không màu pha ở bất kỳ đâu (web không có thành phần phiên học).

**Layout:**
- Khung thiết kế 1440 × 900, kiểm thêm 1024 × 768 (độ phân giải máy chiếu XGA, cũng là 1280 phóng 125%). Cửa sổ dưới 1024: trang trong khung giữ bố cục 1024 và **cuộn ngang** (bề rộng tối thiểu 1024 cho cả trang; sidebar, nội dung và panel Quyết định trượt cùng nhau, không phần nào đứng yên theo chiều ngang; panel và nút xác nhận vẫn ghim theo chiều dọc). Trang đăng nhập và trang lỗi khởi động co theo cửa sổ (SRS 4.11, duyệt W4 02/11/2026 — thay màn chặn).
- `admin-sidebar` 232, nền `bg`, kẻ phải `border`, mục cao 40; chân sidebar là menu tài khoản. Không có thanh trên toàn cục.
- Vùng nội dung nền `surface-1`, lề 32 (24 ở 1024), tối đa 1440, căn trái cạnh sidebar, không căn giữa.
- Tổng quan dùng lưới 12 cột, khoảng cách 24. Bảng tràn hết bề rộng; dưới 1280 ẩn bớt cột ít quan trọng (spec từng trang ghi cột nào), không cuộn ngang.

**Bậc bề mặt và chữ:** `bg` sidebar → `surface-1` nội dung → `surface-2` hover, khung bằng chứng, khối người bị báo cáo → `surface-3` đang chọn, tin bị báo cáo. Trên `surface-3` không đặt chữ `text-tertiary` (4.30 sáng · 4.12 tối), không đặt chữ `primary` ở theme sáng (4.25), không đặt ô nhập (`border-input` chỉ 2.75 · 2.65); chữ phụ ở đó lên `text-secondary` (5.74 · 5.89). Trên `surface-2` mọi màu chữ đều đạt (`text-tertiary` 4.89 · 4.74).

**Tương tác (chuột và bàn phím):**
- Mọi thứ bấm được có hover (`surface-2`, `micro` 120ms) và `focus-ring` khi dùng bàn phím (`:focus-visible`; trong hàng bảng thì lùi vào trong để không bị cắt). Vòng focus đạt ≥ 4.25:1 trên mọi bề mặt ở cả hai theme.
- Thao tác được hết bằng bàn phím: Tab theo thứ tự đọc, Enter mở, Esc đóng dialog và trả focus về chỗ cũ.
- Vùng bấm ≥ 32 (WCAG 2.2 yêu cầu 24); cả hàng bảng là vùng bấm.
- Không có nút chỉ hiện khi hover (máy chiếu và bàn phím không có hover).
- Chữ dùng `rem`; zoom tới khoảng 140% vẫn dùng được. Zoom cao hơn (200% trên màn 1440 chỉ còn 720) không bị chặn: trang cuộn ngang — giới hạn đã biết của công cụ nội bộ, chấp nhận thay vì khóa người cần chữ to ở ngoài.

**Chỉ báo và trạng thái:**
- Badge số việc chờ trên sidebar dùng `badge-count-neutral`, số `numeric-inline`, quá 99 ghi "99+" — trung tính như badge báo cáo của app (CR-18).
- Mục đang chọn: nền `surface-3`, icon `primary`, chữ `text-primary` 600, `aria-current`; **không vạch màu bên trái**. Tab: gạch chân 2 `primary` dưới nhãn 600.
- Chip trạng thái (`chip-status`) chỉ tô màu icon, chữ giữ `text-secondary` (luật `ActivityLine` của app). Tạm khóa = `lock` `warning`; khóa vĩnh viễn = `ban` `danger` (khác cả hình, không chỉ màu); chờ xóa = `clock` `text-tertiary`; đang chờ = `circle-dashed`; đã xử lý = `circle-check` `success`.
- Trạng thái bình thường thì im lặng: "Hoạt động" là chữ trơn không icon; ô số bằng 0 hiện "–" (Be Vietnam Pro, `text-tertiary`) — chữ số 0 của Unbounded đọc như chữ O.
- Nhãn **"Mới"** cho báo cáo tới sau khi admin mở trang: viên `surface-3`, chữ `label` 600 `text-primary`, cả mục nền `surface-2`; không dùng màu nhấn.

**Chữ:**
- Vai trò: `title-1` tiêu đề trang và tiêu đề việc · `title-2` khối · `headline` tên người / server ở chi tiết · `body` tin trong bằng chứng (đúng cỡ app) · `body-sm` ô bảng, nav · `label` đầu cột, nhãn trường, trục biểu đồ (không viết hoa, không giãn chữ) · `stat` thẻ số. Không dùng `display` hay `tab`; nhỏ nhất là 13.
- Số đếm trong bảng và giá trị KPI: Unbounded `numeric-inline`, `tabular-nums`, căn phải; đơn vị viết bằng Be Vietnam Pro.
- **Mono là giọng của dấu vết:** mã việc ("#57"), dấu thời gian trong cột bảng, nhật ký, biên nhận, danh sách báo cáo và lịch sử xử lý. Dấu thời gian luôn có ngày ("18/10/2026 20:07"), không rút gọn còn giờ. Ngày giờ trong ô nhãn–giá trị và trong câu viết bằng Be Vietnam Pro.
- Nạp font: tự host woff2, `font-display: swap`, chia subset theo `unicode-range`. Be Vietnam Pro 400 / 500 / 600 / 700 (subset latin + vietnamese, preload 400). Unbounded 500 / 600 chỉ subset latin, build từ TTF đã đóng băng `tnum` (`pyftfeatfreeze`). JetBrains Mono 400 chỉ subset latin. **Chờ xác minh lúc build:** đo `tnum` / độ rộng chữ số trong chính file woff2 phục vụ (fontkit).

**Thông tin và câu chữ** (luật rút ra khi duyệt bản xem trước, 01/11/2026):
- Không nối các thông tin khác loại bằng dấu "·" ("#hoi-dap · Ôn thi Giải tích 2 · 2 báo cáo · từ 18/10/2026 · 20:07" là sai). Mỗi thông tin có nhãn riêng (dải nhãn–giá trị: nhãn `label` ở trên, giá trị ở dưới) hoặc nằm ở dòng / cột riêng.
- Không tách một ý thành nhãn và giá trị lặp ý: viết "Vẫn ở Ôn thi Giải tích 2", không viết "Server — Khánh vẫn là thành viên".
- Câu trạng thái viết thể khẳng định ("Tài khoản đang hoạt động", không "Chưa bị khóa").
- Ghi chú áp dụng cho cả một mục (vd "Tên người báo cáo chỉ admin thấy") nói một lần dưới tiêu đề mục, không lặp ở từng dòng.
- Mono không chen giữa câu chữ thường.
- Gọi người dùng bằng **username** ("khanh.le"), không bằng tên hiển thị — username không đổi được và là thứ admin tìm kiếm; tên hiển thị chỉ xuất hiện trong ảnh chụp bằng chứng và như một trường của hồ sơ. Admin gọi bằng tên (không trùng nhau).

**Trang xử lý một việc:**
- Đầu trang: "‹ Hàng đợi" và "‹ Việc 3 / 12 ›"; tiêu đề "#57" (mono `text-tertiary`) + tên việc + chip trạng thái; dải nhãn–giá trị kẻ trên dưới `border`.
- Cột trái: Bằng chứng → Báo cáo. Bong bóng tin là instance của master app (`MessageBubble`). Khung "Ảnh chụp lúc báo cáo" nền `surface-2`, bo `input`, chứa đủ đoạn trong ảnh chụp, tự cuộn để tin bị báo cáo nằm giữa (tin trên và dưới bị cắt ngang để báo cuộn được). Tin bị báo cáo nền `surface-3` kèm cờ `flag` "Tin bị báo cáo". Báo cáo là danh sách, không có đầu cột: dòng 1 lý do (600) + thời điểm đầy đủ "18/10/2026 20:07" (mono, sát phải — luôn có ngày, kể cả báo cáo cùng ngày, để thứ tự cũ → mới không bị đọc ngược), dòng 2 mô tả (trống: "Không có mô tả" `text-tertiary`), dòng 3 người báo cáo (avatar 24 + username, chữ phụ); kẻ mảnh giữa các báo cáo.
- Cột phải: Quyết định 360 (320 ở 1024), ghim, kẻ trái `border`. Mở đầu là khối người bị báo cáo (`surface-2`, bo `input`: avatar, username, kẻ mảnh, rồi các câu tình trạng có icon 16; "Xem ›" sát lề phải). Tiếp theo là các nhóm có nhãn `label` 600: Hành động, Thời hạn, Lý do, Lời nhắn, Ghi chú nội bộ. Phần lựa chọn cuộn bên trong; nút xác nhận luôn ở đáy khung nhìn.

**Hành động:** một nút chính mỗi việc. Phá hủy dùng `button-danger` (như Button/danger của app), nhãn nói đủ hậu quả và đổi theo lựa chọn ("Khóa Khánh 7 ngày và xóa tin"). Kết quả xử lý hiện thành biên nhận tại chỗ, không qua toast — toast biến mất còn dấu vết thì phải ở lại.

**Biểu đồ:** không dùng màu pha. Hai chuỗi cùng sắc `primary`, phân biệt bằng kiểu tô: Học nhóm khối đặc, Học một mình khối rỗng viền 2 (khe 2 giữa hai đoạn). Người hoạt động và người dùng mới là **hai biểu đồ nhỏ xếp chồng chung trục ngày** (khác thang nhiều lần — không bao giờ hai trục trên một biểu đồ): người hoạt động đường liền 2 `primary`; người dùng mới cột đặc `primary` (số đếm rời rạc, nhiều ngày bằng 0). Cột rộng ≥ 6, khe ≥ 2, đầu cột bo 2, chân cột đặt trên trục. Lưới trục `border`, nhãn trục `label` `text-secondary`. Nhãn đặt trực tiếp ở cuối đường / cột; biểu đồ một chuỗi không có chú giải (tiêu đề đã gọi tên), hai chuỗi luôn có chú giải. Rê chuột: tooltip nền `surface-1`, viền `border`, bo `input`, bóng `shadow` (đường có thêm đường dóng dọc `border`; cột đang trỏ giữ nguyên, cột khác mờ 40%). Mỗi biểu đồ có "Xem dạng bảng".

**Bộ lọc liền nút** (`SegmentFilter`, C-45): ô đang chọn nền `text-primary`, chữ `bg` 600 (đảo màu); ô khác chữ `text-primary` trên nền trang, ngăn bằng kẻ `border-input`. Khác `SegmentedControl` của app (ô chọn `surface-1` trên rãnh `surface-2`) vì nền trang web quản trị đã là `surface-1`, kiểu app chỉ tách khoảng 1.06:1.

**Phân trang:** "Hiện [50 ▾] trong số N {đối tượng}" bên trái; bên phải "‹ 1 2 3 4 5 … N ›", nút 32 bo `input`, trang hiện tại nền `surface-3` chữ `text-primary` 600, trang khác `text-secondary`, nút không bấm được `text-tertiary`.

**Motion:** tối thiểu-chức năng — hover `micro`, dialog và panel `short`, đổi trang tức thì; không dùng `long` (dành cho chuyển pha). Skeleton là thanh `surface-2` đứng yên, không nhấp nháy. Số chỉ đổi giá trị, không lăn. `prefers-reduced-motion`: mọi chuyển động thành crossfade 200ms. Khoảnh khắc được dàn dựng **"Dấu vết in xuống"**: xác nhận thành công → form Quyết định thu lại thành biên nhận (`medium` 320ms): thẻ người bị báo cáo giữ ở trên và cập nhật tình trạng mới, biên nhận ghi người làm, hành động, lý do, lời nhắn và ghi chú nội bộ khi có, dấu thời gian (mono); chip đầu trang đổi "Đang chờ" → "Đã xử lý"; badge sidebar giảm một.

**Mascot:** đúng một chỗ — hàng đợi "Đang chờ" trống, Runtime `neutral` 96, ảnh PNG tĩnh từ `build/moods/` (không nạp Rive trên web). Không bao giờ ở cạnh bằng chứng hay quyết định, trong dialog, Tổng quan, Người dùng, Server, Nhật ký, màn đăng nhập hay trang lỗi. Logo: chữ N `primary` ở sidebar và màn đăng nhập.

**Elevation:** như app — chiều sâu bằng bậc bề mặt và kẻ mảnh. Dialog và menu bật lên (menu tài khoản, ô chọn) dùng bóng `shadow` của dialog.

**Màn đăng nhập:** form căn trái trong một cột hẹp, chữ N phía trên; không panel thương hiệu, không mascot.

## Variables trong Pencil

`Des/nezfocus.pen` giữ variables sinh từ file này, trục theme `mode` = `light` / `dark`. Quy tắc đặt tên: màu dùng đúng tên vai trò (`$primary`, `$phase-focus-room`…); `spacing.<key>` → `$<key>` (`$space-3`); `rounded.<key>` → `$radius-<key>`; cỡ chữ `typography.<key>.fontSize` → `$type-<key>`; font → `$font-text`, `$font-numeric`, `$font-mono`. Đồng bộ lại bằng `gstack-design-md.ts tokens DESIGN.md` mỗi khi file này đổi.

## Decisions Log

| Ngày | Quyết định | Lý do |
|------|------------|-------|
| 16/10/2026 | Tạo design system ban đầu | Tạo bởi skill ui-design-system-vi từ SRS v1.2, bảng đầu vào của `Docs/design/screens/README.md`, brand sheet Runtime, khảo sát 8 app cùng ngành và hai đề xuất độc lập |
| 16/10/2026 | Tập trung = xanh thương hiệu, Nghỉ = tông ấm (đảo quy ước ngành) | Trạng thái cốt lõi chính là màu thương hiệu; cặp xanh–hổ phách bền nhất với mù màu |
| 16/10/2026 | Đồng hồ trong vòng nhịp 60pt (đề xuất ban đầu 88) | 88pt tràn đường kính trong của vòng 280 |
| 16/10/2026 | Runtime xuất hiện trong pha Nghỉ của Study Room | "Được phép nghỉ" có một nhân vật chung; sửa quy tắc README cũ "không dùng ở màn hình đang học" thành "không dùng trong pha Tập trung" |
| 16/10/2026 | Thêm token `overlay-pressed` (đen 8% sáng / 16% tối) và `scrim` (`bg` 60%) | Ghi thành token hai quy tắc đã duyệt (nút nhấn tối đi, scrim 60%) để Pencil và code dùng trực tiếp; không đổi diện mạo |
| 16/10/2026 | Thêm cỡ `timer-long` 48 cho đồng hồ khi số phút ≥ 100 | "120:00" ở cỡ 60 tràn đường kính trong của vòng 280 (phát hiện khi vẽ C-06) |
| 16/10/2026 | Đồng hồ phút:giây cho mọi pha; cỡ số theo độ dài pha lúc bắt đầu | Theo thói quen Pomodoro, ít chữ số; tránh số đổi cỡ giữa lúc đếm (chốt khi vẽ S-ROOM-02) |
| 16/10/2026 | Nền theo pha áp dụng cho cả màn hình Học một mình | Cũng là Focus Session; tín hiệu pha phải nhất quán (chốt khi viết `04-tab-hoc.md`) |
| 16/10/2026 | Viền đang nói trên avatar tách khe 2px | Viền sát mép bị lẫn vào vòng nhịp xanh (phát hiện khi duyệt S-ROOM-02) |
| 16/10/2026 | Thêm token `shadow` | Ghi thành token màu bóng sheet/dialog đã duyệt (navy 14% / 40%) để không còn mã hex trên canvas |
| 16/10/2026 | Thêm presence, viền đang nói, ô video | Lộ ra khi viết spec component (`00-components.md` D1–D3); camera là MVP nhưng bản xem trước chưa có; SRS ghi "viền sáng" mâu thuẫn quy tắc không glow |
| 17/10/2026 | Vòng nhịp chạy theo chiều kim đồng hồ từ 12 giờ ở mọi pha | Spec chỉ ghi vơi/đầy, chưa ghi chiều; cung Tập trung đang vẽ ngược (phát hiện khi user hỏi) |
| 17/10/2026 | Danh sách ghi "còn N phút", không đếm giây | Số trần "18:42" ở tab Học bị đọc nhầm thành thời gian đã trôi qua; danh sách nhiều số nhảy từng giây kéo mắt |
| 18/10/2026 | Chỉ Android ở MVP: bỏ quy ước riêng của iOS; giữ khung thiết kế 390 × 844 | DEC-30 (SRS v1.3). Khung 390 nằm giữa 360 và 412 dp phổ biến; đổi khung phải vẽ lại khoảng 200 frame (chốt khi làm area 02) |
| 22/10/2026 | Ngoại lệ `danger` trong Study Room cho thao tác phá hủy và lỗi nhập | Rà soát toàn bộ file: S-ROOM-04/05 (Dừng phiên, Tắt Phòng học), cuộc gọi đến và lỗi ô chu kỳ đã dùng `danger` theo spec C-09; người dùng cần tín hiệu mạnh trước thao tác không hoàn tác. Màu pha vẫn chỉ dành cho pha |
| 22/10/2026 | Màn cuộc gọi dùng speaking-ring chuẩn, không dùng vòng `success` | Rà soát: vòng xanh quanh avatar ở S-CALL vừa trái speaking-ring vừa mang hai nghĩa (đang nói / đang đổ chuông); "đang đổ chuông" dùng nhịp mờ–rõ trung tính |
| 30/10/2026 | Toast đảo màu: nền `text-primary`, chữ / icon `bg`, hành động `primary-inverse`; thêm token `primary-inverse` (sáng `#6EA6FB`, tối `#3A64CC`) và component `toast`; không bóng | SRS v1.9, CR-24 #3 (W36, cùng DESIGN.md bản web 27/10/2026; khác web có chủ ý: không bóng). Icon lỗi / thành công cùng màu chữ vì `danger` / `success` dưới 3:1 trên nền đảo màu. Sinh lại variables Pencil (`$primary-inverse`) |
| 30/10/2026 | video-tile tắt camera: avatar 56 ở giữa phần phía trên dải tên | SRS v1.9, CR-22 #8 (theo bản web): avatar cân trong vùng nhìn thấy phía trên dải tên, áp cho lưới, cuộc gọi, dải ô chia sẻ, ô nổi |
| 30/10/2026 | mini-player: nút Camera chỉ khi camera đang bật, chạm là tắt | SRS v1.9, CR-22 #12, CR-25 #6: icon nhắc cũ cho biết camera còn bật nhưng không tắt được tại chỗ; bật camera vẫn chỉ ở màn có hình xem trước |
| 30/10/2026 | Ghi thứ tự Back hệ thống ở Platform & Touch | SRS v1.9, CR-15: Back ở gốc của tab chưa có luật; không thêm nút ← → trong app |
| 30/10/2026 | Bỏ Silent Room khỏi phần mô tả ("Im lặng" ở chip-status, Overview); icon mic trên video-tile chỉ khi bật | SRS v1.9, CR-13 #1: vào phòng voice nào mic cũng tắt sẵn, chỉ báo mic chỉ đánh dấu người bật mic |
| 31/10/2026 | Icon dòng hoạt động học (14 px) mang màu pha ở DMRow / MemberRow / FriendRow / header DM / khối hồ sơ; luật Unbounded "số thay đổi theo thời gian" chỉ cho đồng hồ đếm giây, cụm "còn 18 phút" trong câu dùng font chữ (`title-1` / `label`) | SRS v1.9, CR-25 #16 (C-40 `ActivityLine`) đưa màu pha ra ngoài thành phần của phiên học — chỉ ở icon, chữ trung tính; C-06 `other-session` và C-40 ghi phút trong câu, đổi font giữa câu làm dòng lệch nhịp, còn lý do dùng Unbounded (thiếu `tnum`) chỉ đúng với số nhảy từng giây |
| 01/11/2026 | Logo = chữ N của Runtime (hình học `nez-mascot` › `ChestLogo`); icon app nền `brand-primary` chữ N trắng 62%; adaptive icon (nền `#547FE4`, lớp trước chữ N 42% trong vùng an toàn, lớp đơn sắc); splash nền `bg` theo theme với chữ N `brand-primary` | CR-26 (W114, theo DESIGN.md bản web 01/11/2026): `MASCOT_BRIEF.md` đã gọi chữ N là logo NezFocus; app đang dùng icon mặc định của Expo |
| 01/11/2026 | Thêm mục Web quản trị (bố cục desktop, bậc bề mặt, focus, bảng, biểu đồ, phân trang, trang xử lý một việc); thêm component `button-danger`, `badge-count-neutral`, `focus-ring`, `admin-sidebar`, `data-table`; không thêm token màu | SRS v1.10, CR-27: đề bài cần phần quản trị, làm trên web. Chế độ cập nhật của skill ui-design-system-vi, gộp đề xuất của mình với hai đề xuất độc lập; bản xem trước (vùng x ≥ 66000 trong `Des/nezfocus.pen`) được duyệt sau hai vòng sửa |
| 01/11/2026 | Luật thông tin & câu chữ của web quản trị: không nối thông tin khác loại bằng "·"; không tách một ý thành nhãn + giá trị lặp ý; câu trạng thái thể khẳng định | Product Owner thấy trang Báo cáo bản xem trước đầu tiên rối và khó đọc (dòng meta nối bằng dấu chấm, khối "Tình trạng hiện tại" hai cột) |
| 01/11/2026 | `mono` thêm vai trò "giọng của dấu vết" (mã việc, dấu thời gian trong bảng / nhật ký / biên nhận trên web quản trị) | Hai đề xuất độc lập cùng đưa ra: Be Vietnam Pro không có `tnum` nên cột ngày giờ lệch; mono nối thẳng vào điều cần nhớ "để lại dấu vết" |
| 01/11/2026 | Bộ lọc liền nút của web quản trị: ô đang chọn đảo màu (`text-primary` / `bg`) | Viết spec C-45 (`ui-components-vi`): nền trang web là `surface-1`, kiểu ô chọn của `SegmentedControl` app gần như không thấy; Product Owner duyệt (Q9) |
| 02/11/2026 | Khối "Báo cáo" ở trang xử lý một việc đổi từ bảng nhỏ 3 cột sang danh sách không đầu cột | Duyệt frame W1 (`ui-feature-spec-vi`): mô tả — thứ quan trọng nhất — nằm ngoài mọi cột của bảng, đầu cột không giúp gì với 1–3 báo cáo, và ở khung 1024 cột Người báo cáo chỉ còn ~100px. Danh sách xếp theo mức quan trọng: lý do + thời điểm, mô tả, người báo cáo. Thời điểm luôn ghi đủ ngày: chỉ ghi giờ cho báo cáo cùng ngày làm dòng trên (cũ hơn) trông như mới hơn dòng dưới có ngày |
| 02/11/2026 | Web quản trị gọi người dùng bằng username, không bằng tên hiển thị | Duyệt frame W1: admin tìm và nhận diện bằng username (không đổi được); tên hiển thị đổi giữa chừng làm tiêu đề việc và nhật ký lệch nhau; đỡ tốn chỗ. Ngoại lệ: ảnh chụp bằng chứng, trường hồ sơ |
| 02/11/2026 | Mono mở rộng sang danh sách báo cáo và lịch sử xử lý; dấu thời gian luôn có ngày | Duyệt frame W1: báo cáo cùng ngày chỉ ghi giờ làm dòng cũ hơn trông như mới hơn |
| 02/11/2026 | Nhãn "Mới" (viên `surface-3`, nền mục `surface-2`) cho báo cáo tới sau khi mở trang | Edge case W1 (`40909`): admin phải thấy báo cáo chưa đọc trước khi xác nhận; không dùng màu nhấn vì không phải cảnh báo |
| 02/11/2026 | "Dấu vết in xuống": biên nhận giữ thẻ người bị báo cáo, ghi thêm lời nhắn và ghi chú nội bộ | Duyệt frame W1: tình trạng mới (tin đã xóa, đang bị khóa tới …) là một phần của dấu vết; admin cần thấy lại đúng lời đã gửi |
| 02/11/2026 | Bỏ màn chặn dưới 1024: trang trong khung giữ bố cục 1024 và cuộn ngang; trang đăng nhập co theo cửa sổ | Duyệt W4 (`ui-feature-spec-vi`): màn chặn khóa ngoài người phóng to trình duyệt (1366 phóng 150% = 910px) và việc gấp trên điện thoại; với 1–5 admin, không khóa ai ngoài quan trọng hơn bố cục ở màn hẹp. Co giãn xuống 768 / điện thoại để v1.x |
| 02/11/2026 | Người dùng mới và người hoạt động tách thành hai biểu đồ nhỏ; người dùng mới thành cột đặc `primary` (bỏ đường đứt `text-secondary`) | W3 Q2 (`ui-feature-spec-vi`): 0–3 người mới / ngày so với ~130 người hoạt động — chung một thang thì đường người mới nằm sát đáy; hai trục là lỗi kinh điển |
