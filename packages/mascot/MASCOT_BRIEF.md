# Runtime — NezFocus Mascot Brief (cho Rive CLI)

Nguồn tham chiếu: `reference/nez-mascot-demo.png` (character sheet). Đọc ảnh đó trước khi vẽ.
Đích dùng: nhúng vào app **React Native (iOS/Android)** qua `rive-react-native` — không web, không desktop.

## 1. Nhân vật

- Tên: **Runtime**, mascot của NezFocus ("Study Together · Focus Better").
- Tính cách: người bạn đồng hành học tập — nhỏ gọn, thân thiện, thông minh, nhanh nhẹn, đáng yêu.
- Dạng: robot/phi hành gia chibi mang tai mèo. Tỉ lệ đầu : thân ≈ 1.3 : 1 (đầu to hơn thân).

## 2. Giải phẫu (từ trên xuống, mặt trước)

| Bộ phận | Mô tả |
|---|---|
| Tai mèo ×2 | Tam giác bo tròn, mặt ngoài xanh Primary→Accent gradient, lòng tai trắng. Nghiêng ra ngoài ~20°. |
| Vỏ đầu (helmet) | Khối bo tròn gần vuông (squircle), trắng, viền outline xanh xám mảnh. |
| Visor (mặt kính) | Hình bo tròn lớn chiếm ~65% mặt trước đầu, màu navy đậm, có highlight trắng mờ góc trên. |
| Mắt | 2 oval dọc xanh sáng (glow) trên visor. Biểu cảm thay đổi bằng hình dạng mắt. |
| Miệng | Đường cong nhỏ xanh sáng giữa hai mắt (chữ "u" nhỏ). |
| Má hồng | 2 chấm oval xanh-tím mờ dưới mắt. |
| Tai nghe ×2 | Hai bên đầu: đĩa tròn navy + mặt ngoài xanh có logo "N" (logo NezFocus). Có quai nối qua đầu. |
| Thân / áo hoodie | Hoodie trắng, dây rút xanh, logo "N" xanh giữa ngực. |
| Tay ×2 | Ống tròn trắng, bàn tay tròn (mitten), không ngón. |
| Quần / chân | Quần ngắn navy, chân trắng ngắn, giày trắng đế navy. |
| Balo | Navy, đeo sau lưng, có logo "N" (thấy ở mặt sau). Mặt trước chỉ thấy quai. |

Phong cách: flat + soft shading (một lớp bóng xanh nhạt), outline màu (không đen) dày ~2–3px ở 500px.

## 3. Bảng màu (NGUỒN DUY NHẤT — khớp với `runtime.rml`)

Ánh sáng giả định từ **trên-trái**. Màu viết ARGB cho RML `colorValue`. Khi đổi màu trong `runtime.rml`, cập nhật bảng này.

**Màu nền tảng**

| Token | `colorValue` | Dùng cho |
|---|---|---|
| OUTLINE | `FF2B3257` | viền 3px mọi khối |
| PRIMARY | `FF547FE4` | logo ngực, đế giày, FX (!, zZ, ?) |
| ACCENT | `FF89B8FD` | dây rút, kính, sparkle |
| GLOW | `FF6EA6FB` | mắt, miệng |
| GLOW_HALO | `806EA6FB` | quầng sáng mắt (Feather) |
| NAVY | `FF3B4470` | cổ áo V, quai balo |
| SHORTS | `FF2A3358` | quần (tông giữa) |
| VISOR_IN / VISOR_OUT / VISOR_RIM | `FF3A4468` / `FF1F2744` / `FF1A2038` | visor |
| BLUSH | `994A5FAB` | má |
| HIGHLIGHT | `40FFFFFF` | vệt sáng visor |

**Dải đổ khối (RadialGradient, sáng → tối)**

| Bộ phận | Các điểm dừng |
|---|---|
| Vỏ đầu | `FFFFFFFF` → `FFF6F8FE` → `FFDCE4F6` → `FFC2CDE8` |
| Thân hoodie | `FFFFFFFF` → `FFF3F6FC` → `FFDCE4F6` → `FFC4CFEA` |
| Tai ngoài | `FFA3C6FF` → `FF6E9BF0` → `FF4468CF` |
| Lòng tai | `FFD6E6FF` → `FFA9CBFF` → `FF86B0F8` |
| Mặt tai nghe (chỏm lồi) | `FFFFFFFF` → `FFD9E8FF` → `FF89B8FD` → `FF5A86E6`, vệt bóng `CCFFFFFF`, logo `FF3F6AD8` |
| Vỏ tai nghe | `FF5A679E` → `FF3B4470` → `FF232A4A` |
| Quần | `FF3F4B7A` → `FF2A3358` → `FF1A2140` |
| Tay (linear, xuống đầu mút) | `FFFFFFFF` → `FFEEF2FA` → `FF9CC2FE` → `FF6E9BF0` |
| Chân (linear, đế xanh) | `FFFFFFFF` → `FFE6ECF8` → `FF547FE4` |

**Bóng đổ (navy trong suốt, luôn `2B3257` với alpha khác nhau)**

| Alpha | Dùng cho |
|---|---|
| `66` | bóng đầu lên thân, visor lõm, thân lên quần, quần lên chân |
| `55` | tai lên đầu, tai nghe lên đầu, thân lên tay, bóng dưới chân |
| `3D` | đổ mặt bên tay/chân (Fill thứ hai `SideShade`) |
| `40`, `30`, `00` | các điểm dừng giữa/cuối của bóng tròn |

Màu lấy mẫu từ ảnh gốc (chỉ để tham khảo, không dùng trực tiếp): primary `#547FE4`, accent `#89B8FD`, visor `#353F60`, outline ảnh gốc dao động `#6E779F`–`#02051D`.

## 4. Biểu cảm (bắt buộc — phase 1)

Chỉ thay đổi mắt/miệng/phụ kiện trên visor; đầu và thân giữ nguyên.

| mood | Mắt | Miệng | Phụ kiện |
|---|---|---|---|
| `neutral` (Mặc định) | 2 oval dọc | cười nhỏ "u" | — |
| `happy` (Vui vẻ) | 2 vòng cung ^ ^ | cười mở | tia sáng nhỏ cạnh đầu |
| `wink` (Nháy mắt) | trái oval, phải `<` | cười | ✦ lấp lánh |
| `focus` (Tập trung) | oval | thẳng/nhỏ | kính tròn xanh trên visor, ✦ |
| `surprised` (Bất ngờ) | oval to tròn | chữ "o" | dấu `!` |
| `sleepy` (Buồn ngủ) | 2 đường cong ⌣ nhắm | nhỏ | `z Z` bay lên |
| `confused` (Thắc mắc) | oval, một bên nhỏ hơn | lệch | dấu `?` |

## 5. Pose / hành động (phase 2 — làm sau)

Học tập/Làm việc (laptop), Chat/Kết nối (bong bóng chat), Cổ lên! (giơ tay cổ vũ), Nghe nhạc (nốt nhạc),
Di chuyển (chạy, tim), Nghỉ ngơi (nằm ngủ, zZ), Vẫy tay "Hi!" (hero pose).
Sticker thực tế: "Let's Study!", "Good Job!", "Focus Time!", "See you!".

## 6. Kế hoạch kỹ thuật Rive

**Artboard**: `Runtime`, 500×500, **nền trong suốt** (bỏ Fill nền xám của scaffold) để đặt lên UI app.
Nhân vật căn giữa, chân chạm ~y=470.

**Cây nhóm (để rig/animate):**
```
Runtime (root, origin ở chân)
├─ Backpack (sau thân)
├─ Body
│  ├─ LegL / LegR
│  ├─ Shorts
│  ├─ Hoodie (+ logo N, dây rút)
│  ├─ ArmL / ArmR  (origin ở vai → xoay để vẫy)
└─ Head (origin ở cổ → nghiêng/gật)
   ├─ EarL / EarR (origin ở gốc tai → giật tai)
   ├─ HeadShell
   ├─ HeadphoneL / HeadphoneR + Band
   └─ Visor
      ├─ VisorHighlight
      └─ Face
         ├─ Eyes (mỗi mood 1 nhóm, bật/tắt bằng opacity)
         ├─ Mouth
         ├─ Blush
         └─ FX (glasses, !, ?, zZ, sparkle)
```

**Data (view model, không dùng StateMachine inputs — đã deprecated):**
- View model `Mascot`: enum `mood` = neutral (mặc định) | happy | wink | focus | surprised | sleepy | confused.
- (Phase 2) enum `pose`, trigger/number cho `wave`.
- App RN set `mood` qua data binding của runtime.

**State machine `Main`:**
- Layer `Idle`: loop thở (Body scaleY ~1.02, Head nhấp nhô 2px, ~2.5s) — luôn chạy.
- Layer `Blink`: chớp mắt mỗi ~3–4s (scaleY Eyes → 0.1).
- Layer `Mood`: mỗi mood 1 AnimationState, transition bằng `TransitionViewModelCondition` trên `mood`.
- Layer `Ears`: thỉnh thoảng giật tai.

## 7. Quy trình (theo AGENTS.md)

1. Tra `rive docs <topic>` / `rive schema <Type>` trước khi viết — không đoán tên type/property.
   Topic liên quan: `drawing`, `transforms`, `state-machines`, `data`, `easing`, `rigging`, `gotchas`.
2. Build theo pass: (a) khối silhouette → (b) chi tiết đầu/visor/mặt → (c) thân/tay/chân → (d) màu & outline → (e) animation → (f) mood.
3. Sau mỗi pass: `rive . --verify`, `rive inspect . --summary`, `rive . --screenshot --advance=1` rồi **xem ảnh** so với reference.
4. Không preview bằng `rive push` hay trang HTML.

## 8. File & quy ước

- `data.rml`: enum + view model. `runtime.rml`: artboard. Plan: `docs/superpowers/plans/2026-09-29-runtime-mascot.md`.
- Bảng token màu, toạ độ và ID: xem plan. Hướng dẫn chỉnh: `docs/TUNING.md`.
- Kiểm tra: `python tools/check.py tests/*.json`. So với ảnh gốc: `python tools/overlay.py`.
- Balo và tai nghe nhìn từ mặt sau/bên: phase 2 (chưa làm).
