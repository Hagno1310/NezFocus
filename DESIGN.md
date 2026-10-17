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
  presence-dot:
    online: "{colors.success}"
    idle: "{colors.warning}"
    dnd: "{colors.danger}"
    offline: "{colors.text-tertiary}"
    size: 10px
---

# NezFocus

## Overview

**Creative North Star:** "Đèn bàn trong phòng tối." App là một căn phòng navy yên tĩnh, lấy màu từ visor của Runtime. Thứ duy nhất "sáng" là **nhịp chung**: con số đồng hồ, nhãn pha và những người đang ngồi cùng bạn. Sự vui tươi dành cho Runtime và các khoảnh khắc chúc mừng, không rải lên giao diện.

**Bối cảnh sản phẩm:** App mobile học nhóm (iOS ≥ 15, Android ≥ 8; React Native) cho sinh viên Việt Nam: server/kênh kiểu Discord cộng lớp Study/Focus — Pomodoro đồng bộ trong phòng voice, phòng học im lặng, Solo Session, streak, Việc cần làm. Dùng chủ yếu buổi tối, trong phòng tối hoặc ký túc xá, điện thoại đặt cạnh sách: liếc đồng hồ rồi khóa màn hình.

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
1. Màu pha chỉ xuất hiện trong thành phần của phiên học (vòng nhịp, nhãn pha, mini-player, hàng phòng đang hoạt động, notification).
2. Màu ngữ nghĩa (`success`/`warning`/`danger`) không bao giờ xuất hiện trong Study Room; lỗi trong phòng dùng banner trung tính kèm icon.
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
- **JetBrains Mono** cho code trong chat và mã mời. Monospace thật.

**Xác minh** (16/10/2026, tải file TTF và kiểm bằng fontTools): cả ba font đủ 146 ký tự tiếng Việt dựng sẵn trong mọi độ đậm đã kiểm, subset `vietnamese` trên Google Fonts, giấy phép SIL OFL 1.1.

| Font | Nguồn | Độ đậm dùng | File cho app |
|---|---|---|---|
| Be Vietnam Pro | `github.com/google/fonts/tree/main/ofl/bevietnampro` | 400, 500, 600, 700, 800 | TTF tĩnh có sẵn |
| Unbounded | `github.com/google/fonts/tree/main/ofl/unbounded`, `github.com/googlefonts/unbounded` | 500, 600 | variable `wght 200–900`; xuất bản tĩnh 500/600 (fontTools `instancer`) nếu runtime không hỗ trợ variable font |
| JetBrains Mono | `github.com/google/fonts/tree/main/ofl/jetbrainsmono` | 400, 700 | TTF tĩnh có sẵn |

Đã loại: Lexend, Readex Pro (không `tnum`); Sora, Figtree (không có tiếng Việt). Manrope và Archivo Expanded đạt yêu cầu, là phương án dự phòng cho số.

**Dấu tiếng Việt:** dấu chồng của Be Vietnam Pro vượt ascent ("Ẩ" cao 1.158em, ascent 1.0em) → luôn đặt `lineHeight` tường minh ≥ 1.4× (đã có trong thang); không để mặc định, iOS sẽ cắt dấu.

**Cỡ chữ 200%:** chữ thường co giãn tự do và được phép xuống dòng; tiêu đề giới hạn `maxFontSizeMultiplier` 1.6. Đồng hồ (`timer`, `stat`) không co giãn — đã ≥ 32pt — và có `accessibilityLabel` đọc thành lời ("còn 18 phút 42 giây"). Mức tối thiểu là 13 (`label`); ngoại lệ duy nhất là `tab` 11 cho nhãn tab bar và badge, theo quy ước iOS/Android. Nhãn ngắn dưới icon trong khung hẹp (`TabBar`, `RoomControl`) giới hạn phóng ×1.3 và có Large Content Viewer khi nhấn giữ. Vòng nhịp được giữ ở mọi cỡ chữ: chữ bên trong vòng chuyển ra dưới vòng.

## Layout

- **Frame:** 390 × 844 (chuẩn), kiểm thêm 360 × 800. Không có layout tablet riêng.
- **Lề màn hình:** 16 (`space-3`). Safe area trên/dưới luôn chừa.
- **Lưới:** bội số 8. `space-1` (4) chỉ dùng cho cặp sát nhau: icon–chữ, tiêu đề–dòng phụ.
- **Thanh cố định:** header kênh 56; tab bar 56 + safe area; mini-player 64, nằm ngay trên tab bar; server rail 72.
- **Mật độ theo chế độ:** Operate — danh sách tràn viền, căn trái, chia dòng bằng kẻ mảnh `border`, không bọc thẻ. Experience — một cột; đồng hồ ở 1/3 trên, điều khiển ở vùng ngón cái; **chỉ ở đây được căn giữa**. Read — số lớn căn trái, biểu đồ bằng dữ liệu thật. Persuade — tiêu đề lớn căn trái, mascot lệch góc.
- **Đồng hồ luôn cách 1 chạm** từ tab Học hoặc mini-player.

## Elevation & Depth

Chiều sâu tạo bằng **bậc sáng của bề mặt** và kẻ mảnh, không bằng bóng đổ: `bg` < `surface-1` < `surface-2` < `surface-3` (tối: sáng dần; sáng: `surface-1` trắng nổi trên `bg`). Ngoại lệ duy nhất là bottom sheet và dialog: bóng lệch `0 -4` mờ `24` màu `shadow` (`brand-navy` 14% sáng / 40% tối), cộng scrim `bg` 60%. Không glow, không quầng sáng không độ lệch, không panel kính mờ.

## Shapes

Bo góc theo vai trò, không một bán kính cho mọi thứ: `badge` 4 · `input` 8 (ô nhập, khung code) · `button` 12 (nút, khối Học một mình) · `server` 16 (squircle icon server) · `sheet` 24 (mép trên sheet/drawer) · `full` (avatar, chip, nút điều khiển trong phòng). Ô video `button` (12). Danh sách và nền phòng không bo. Phần tử lồng: bán kính trong = bán kính ngoài − khoảng cách.

## Components

Chỉ các component đã thực sự dựng trong bản xem trước (`Des/nezfocus.pen`). Đặc tả đủ trạng thái nằm ở `Docs/design/screens/00-components.md`.

- **button-primary** — một hành động chính mỗi màn hình. Nhấn: nền tối đi 8%; vô hiệu: `surface-3` + `text-tertiary`; đang xử lý: giữ nguyên kích thước, thay nhãn bằng spinner nhỏ.
- **button-secondary** — viền `border-input`, chữ `primary` (ví dụ "Vào" trên hàng phòng).
- **chip-status** — trạng thái phòng ("Im lặng", vai trò Host): icon 14 + nhãn, viền mảnh.
- **room-control / room-control-main** — nút tròn trong Study Room kèm nhãn chữ bên dưới; nút chính (Tạm dừng / Tiếp tục) đảo màu `text-primary`. Không dùng màu pha hay `primary` cho điều khiển trong phòng, để không trùng `phase-long`/`phase-focus`.
- **rhythm-ring** — vòng nhịp: track `border`, tiến độ theo màu pha, độ dày 7% đường kính; số `timer` + nhãn pha + dòng chu kỳ ở giữa; tối đa 12 avatar 40 ngồi trên chu vi (quá 12: "+N" mở danh sách); avatar tạm vắng mờ 45%. Khi chữ ≥ 200%: giữ vòng và ghế, nhãn pha và dòng chu kỳ chuyển xuống dưới vòng (chốt 16/10/2026).
- **speaking-ring** — người đang nói (REQ-VC-02): trên avatar là **vòng 2 `text-primary` cách avatar một khe 2** (khe cùng màu nền phía sau), để không dính vào vòng nhịp; trên ô video là viền 2 quanh ô. Hiện khi bắt đầu nói (≤ 300ms) và mờ dần khi ngừng (`short`); **không nhấp nháy**. Không glow, không màu ngữ nghĩa, không `primary` (trùng `phase-focus`); viền trung tính tương phản cao đọc được ở cả hai theme.
- **video-tile** — ô camera tỉ lệ 3:4, bo `button`; tên và icon mic trên dải scrim `bg` 60% ở đáy; tắt camera: nền `surface-2` + avatar 56 ở giữa; ô của chính mình lật gương.
- **presence-dot** — xem Colors › Presence.
- **mini-player** — icon pha + tên phòng + nhãn pha + thời gian (`numeric-inline`), nút Mic và Rời phòng 48.
- **tab-bar** — 5 tab phẳng, nền `surface-1`, kẻ trên `border`; tab đang chọn: icon + nhãn `primary`. Không dùng kiểu capsule kính mờ.
- **badge-count** — số chưa đọc trên tab, nền `danger`.

## Platform & Touch

- Vùng chạm ≥ 48 ở mọi nơi (đạt cả 44pt iOS lẫn 48dp Android).
- Giữ quy ước nền tảng: tab bar dưới, nút Back hệ thống Android đóng drawer/sheet trước, cử chỉ Back mép màn hình iOS không bị drawer chiếm (SRS 3.1).
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

## Do's and Don'ts

- Nên: đặt mọi số thay đổi theo thời gian bằng Unbounded + `tabular-nums`.
- Nên: kèm icon và nhãn mỗi khi dùng màu pha hoặc màu ngữ nghĩa.
- Nên: giữ một hành động chính mỗi màn hình; hành động chính là màu đặc `primary`.
- Nên: dùng dữ liệu thật trong biểu đồ và danh sách người; avatar chữ cái chỉ là trạng thái khi chưa có ảnh.
- Nên: đặt `lineHeight` tường minh cho mọi chữ tiếng Việt.
- Không nên: dùng màu pha ngoài phiên học, hay màu ngữ nghĩa trong Study Room.
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
