# Hướng dẫn chỉnh mascot Runtime

## Vòng làm việc

1. Mở previewer (một lần, để chạy nền): `rive .` — tự rebuild mỗi lần lưu file.
2. Sửa `runtime.rml` (hình, animation) hoặc `data.rml` (API cho app).
3. So với ảnh gốc: `python tools/overlay.py [--data=mood=<key>]` → xem `build/overlay.png` (chồng 50/50) và `build/side.png` (cạnh nhau).
4. Chạy kiểm tra: `rive . --verify && python tools/check.py tests/*.json`.
5. Xuất cho app: `rive . --once && cp build/nez-mascot.riv dist/runtime.riv`.

Tìm phần cần chỉnh bằng `name="…"` (ví dụ tìm `name="HeadShell"` trong `runtime.rml`).

## Bản đồ bộ phận

Mọi hình chính đều là `PointsPath` gồm các đỉnh cong `CubicMirroredVertex`. Chỉnh hình = dời `x`/`y` của đỉnh, đổi `distance` (độ phồng) hoặc `rotation` (hướng tay nắm). Mở trong Rive Editor thì mỗi đỉnh là một điểm kéo được, có hai tay nắm.

| Muốn chỉnh | Tìm `name=` | Thuộc tính |
|---|---|---|
| Vị trí cả nhân vật | `Character` | `x`, `y` (đang ở giữa chân: 250, 470) |
| Kích thước cả nhân vật | `Character` | thêm `scaleX`/`scaleY` (lưu ý: `idle_breathe` đang key `scaleY` quanh 1 → sửa keyframe tương ứng) |
| Độ tròn "mochi" của đầu | `HeadShell` | 4 đỉnh: trên (`distance` 100 = đỉnh phẳng hơn), hai bên (y=12 → phình thấp, giống mochi xệ), dưới (`distance` 108) |
| Hình dáng tai | `EarOuter`, `EarInner` (trong `EarL`; `EarR` là bản lật) | 4 đỉnh: gốc ngoài, chóp, gốc trong, đáy cong |
| Vị trí tai (tai nằm **trên** lớp đầu) | `EarL`, `EarR` | `x`, `y` (đối xứng: đổi cả hai) |
| Tai nghe | `HeadphoneL`, `HeadphoneR` | `x`, `y`; dáng ở `PhoneCup`/`PhoneFace` (4 đỉnh cong mỗi hình) |
| Visor | `VisorGlass` (+ `VisorInset` là bóng lõm, cùng path) | 4 đỉnh; màu ở `RadialGradient` |
| Vị trí mắt | `EyeL`/`EyeR` trong mỗi `Eyes*` | `x` (±52) |
| Kích thước mắt | `Ellipse` trong `EyeL`/`EyeR` | `width`, `height` |
| Quầng sáng mắt | `Halo` | `Feather strength`, alpha trong `colorValue` |
| Má | `BlushL`, `BlushR` | `x`, `y`, alpha màu |
| Thân hoodie (dáng chuông) | `Torso` (+ `TorsoShadow`, `BodyCastShadow` dùng cùng path) | 8 đỉnh: cổ, 2 vai, 2 hông phình, 2 góc gấu, gấu áo |
| Tay (nằm **sau** thân, vai hoodie che đầu tay) | `ArmL`, `ArmR` | `rotation` (radian, ±0.36); dáng tay ở `Sleeve` (4 đỉnh); đầu mút xanh là gradient trong `Sleeve` |
| Quần | `Shorts` (+ `ShortsShadow`) | đỉnh, gồm khe đũng ở giữa |
| Chân | `Leg` trong `LegL`/`LegR` | 4 đỉnh; đế xanh = gradient |
| Logo ngực | `ChestLogo` | 2 `PointsPath` `Left`/`Right` (hình diều, đối xứng xoay 180°) |

Khi sửa path của `Torso`, `Shorts` hay `VisorGlass`, hãy sửa cả path trùng của shape bóng đi kèm (tên ở trên), để bóng khớp hình.

## Đổ khối và bóng (cảm giác 3D)

Ánh sáng giả định từ **trên-trái**.

| Hiệu ứng | Cách làm trong file | Chỉnh |
|---|---|---|
| Khối lồi (đầu, thân, tai, quần, mặt tai nghe) | `Fill` dùng `RadialGradient name="Shade"`, tâm sáng lệch trên-trái | `startX/startY` = điểm sáng nhất; `endX - startX` = bán kính; dời tâm để đổi hướng sáng |
| Mặt tai nghe lồi | `PhoneFace` radial + vệt bóng `PhoneGloss` (ellipse trắng 80%) | dời hoặc xoay `PhoneGloss`; tăng độ lồi bằng cách đẩy điểm dừng tối (`FF5A86E6`) vào gần hơn |
| Mặt bên tay/chân tối hơn | Fill thứ hai `SideShade` (gradient ngang trong suốt → navy 24%) | alpha `3D` trong điểm dừng cuối |
| Bóng đổ mềm | Shape chỉ có `Stroke` màu navy trong suốt + `Feather`, đặt **ngay sau** vật đổ bóng (vẽ dưới nó) | `thickness` = độ loang, `Feather strength` = độ mềm, alpha đầu `colorValue` = độ đậm |
| Bóng đầu lên thân | `HeadCastShadow` (ellipse radial, `scaleX` 0.66 để gọn trong vai) | `y`, `scaleX`, `scaleY` |
| Bóng dưới chân | `GroundShadow` | `scaleY` (độ dẹt), alpha |

Muốn tắt hết bóng để so sánh: thêm `hidden="true"` vào các shape tên `*Shadow`, `VisorInset`, `GroundShadow`.

## Đổi màu toàn bộ

Màu viết dạng ARGB (`FF` + hex RGB). Đổi một token ở mọi chỗ, ví dụ viền:

```bash
sed -i 's/FF2B3257/FF1F2440/g' runtime.rml
```

Bảng màu **duy nhất** nằm ở `MASCOT_BRIEF.md` mục 3 (bảng token trong plan là bản cũ, không dùng nữa). Nhớ cập nhật bảng khi đổi.

## Chuyển động

| Muốn | Sửa |
|---|---|
| Thở mạnh/nhẹ hơn | `idle_breathe`: giá trị `1.01` (scaleY) và `-180` (y đầu ở frame 75) |
| Thở nhanh/chậm | `idle_breathe`: `duration="150"` và frame giữa `75` (luôn = duration/2), frame cuối = duration |
| Chớp mắt thưa/dày | `blink`: `duration="240"`; khoảng nhắm frame 200→212 |
| Tai giật mạnh hơn | `ear_twitch`: `-0.22` / `0.08` (radian) |
| Tắt hẳn một chuyển động | xoá `StateMachineLayer` tương ứng trong `Main` (`Idle`, `Blink`, `Ears`) |
| Hành động cơ thể của một mood | animation `mood_<key>`: các track `Character.y` (14), `Head.rotation` (15), `ArmL/ArmR.rotation` (15). **Mọi** mood phải key đủ 4 track này (nếu thiếu, mood trước để lại tư thế). Tay: dương = tay trái vung ra ngoài/lên, âm = tay phải |
| Vẫy chào | layer `Gesture` (giữa `Mood` và `Sleep`): `gesture_none` → `hello_wave` khi trigger `wave` bắn → về. Biên độ vẫy: track `ArmL.rotation` trong `hello_wave` (1.6 ↔ 1.95; quá 2.1 thì bàn tay khuất sau tai nghe) |
| Ngủ / giật mình | layer `Sleep` (đặt cuối, đè mọi layer): `sleep_none` (thức) → `sleep_loop` khi `isAsleep`=true (trộn 400ms) → `wake_startle` khi `isAsleep`=false (chạy 1 lần 72 frame) → về thức. Chữ Z: node `Z1/Z2/Z3` trong `FxSnore`; bong bóng: `SleepBubble`. Vùng bấm: `HitArea` (ellipse trong suốt) + listener `WakeOnTap` |
| Tốc độ trộn khi đổi mood | layer `Mood`: `duration="220"` (ms) trên các transition từ AnyState |
| Mood nào được chớp mắt | layer `Blink`: state `blink` (0:512) chuyển sang `blink_off` (0:514) khi mood là happy/wink/focus/sleepy, và quay lại khi neutral/surprised/confused |

Frame = 1/60 giây. Keyframe không ghi `interpolationType` sẽ **nhảy cóc** (hold).

## Đường cong (mắt ^ ^, miệng, dấu ?)

`CubicMirroredVertex`: `rotation` là hướng tay nắm (radian: 0 = sang phải, 1.5708 = xuống, 3.1416 = sang trái); `distance` = độ phồng. Tăng `distance` → cong hơn.

## Thêm một mood mới (ví dụ `sad`)

1. `data.rml`: thêm `<DataEnumValue key="sad" value="Sad" id="0:608"/>` vào **cuối** enum (không chèn giữa — thứ tự là số nguyên app đọc).
2. `runtime.rml`: thêm Node con vào `EyesSet` (id `0:38`), và nếu cần vào `MouthSet`/`FxSet` (id kế tiếp trong dải).
3. Thêm `LinearAnimation` `mood_sad` (id `0:417`) key 3 Solo (propertyKey `296`, `KeyFrameId`).
4. Thêm `AnimationState` (id `0:527`) và một `StateTransition` trong `AnyState` của layer `Mood` với `TransitionValueEnumComparator value="0:608"`.
5. Thêm probe `tests/t9_sad.json` (chụp với `"data": ["mood=sad"]`), chạy `python tools/check.py tests/*.json`.

## Hợp đồng với app React Native

| Mục | Giá trị |
|---|---|
| File | `dist/runtime.riv` |
| Artboard | `Runtime` (500×500, nền trong suốt) |
| State machine | `Main` (phải bật, nếu không data binding không chạy) |
| View model / instance | `Mascot` / `Default` |
| Property | `mood` (enum): `neutral`, `happy`, `wink`, `focus`, `surprised`, `sleepy`, `confused` |
| Fit khuyến nghị | `contain` |

Tra API data binding (view model, enum property) trong tài liệu hiện hành của thư viện Rive React Native trước khi viết code app. Không đổi các tên ở bảng trên nếu không sửa app cùng lúc.

## Chỉnh bằng Rive Editor (tuỳ chọn)

`rive . --once --rev=build/runtime.rev` ghi thêm file `.rev` để mở trong Rive Editor (cần `rive login`). Muốn sửa trong editor rồi kéo ngược về RML thì project phải được gắn với một file Rive trước (qua `rive push`, việc này upload lên tài khoản của bạn), sau đó dùng `rive pull`. Lệnh pull **ghi đè** các file `.rml`, nên commit trước khi chạy.

## Chỗ còn khác ảnh gốc (đã biết)

- Viền: ảnh gốc đậm nhạt không đều (gần đen ở thân, nhạt ở đỉnh đầu); bản này dùng một màu `FF2B3257`, dày 3px.
- Quai balo chỉ lộ ở hai mép thân; balo đầy đủ và quai tai nghe qua đầu để phase 2.
- Đầu được làm tròn kiểu mochi và tai đặt lớp trên đầu theo yêu cầu, nên khác nhẹ bóng dáng ảnh gốc.
