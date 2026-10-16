# Runtime — Mascot NezFocus (Rive)

Mascot **Runtime** của app NezFocus (React Native, iOS/Android), vẽ hoàn toàn bằng vector trong Rive CLI (RML).
File này dành cho người làm app: hợp đồng hiện có, cách làm việc với project, và **lộ trình animation/state** đề xuất theo từng tính năng của SRS (`../../docs/SRS_NezFocus.md`).

- Spec nhân vật và bảng màu: [`MASCOT_BRIEF.md`](MASCOT_BRIEF.md)
- Hướng dẫn chỉnh hình và chuyển động: [`docs/TUNING.md`](docs/TUNING.md)
- Plan dựng ban đầu: [`docs/superpowers/plans/2026-09-29-runtime-mascot.md`](docs/superpowers/plans/2026-09-29-runtime-mascot.md)

---

## 1. Hợp đồng hiện tại (đã có trong `dist/runtime.riv`)

| Mục | Giá trị |
|---|---|
| File | `dist/runtime.riv` |
| Artboard | `Runtime` — 500×500, nền trong suốt, fit khuyến nghị `contain` |
| State machine | `Main` (phải bật; không bật thì data binding không chạy) |
| View model / instance | `Mascot` / `Default` |
| `mood` (enum) | `neutral` (mặc định) · `happy` · `wink` · `focus` · `surprised` · `sleepy` · `confused` |
| `isAsleep` (boolean) | `false` mặc định. `true` → ngủ say (đầu gục, zZ bay, bong bóng ngủ). **Chạm/click vào nhân vật** khi đang ngủ → mascot tự đặt lại `false`, giật mình tỉnh dậy rồi về `mood` hiện tại. App có thể lắng nghe thay đổi này (dữ liệu 2 chiều) |
| `wave` (trigger) | Kích một lần → vẫy tay chào (tay bên trái màn hình vẫy 3 nhịp, cười), ~1.8s rồi tự về. Không vẫy khi đang ngủ |

Chuyển động luôn chạy: thở (2.5s), chớp mắt (4s, tự tắt ở mood mắt nhắm: happy/wink/focus/sleepy), giật tai (5s).

Mỗi mood còn có **hành động cơ thể** lặp riêng; đổi mood thì trộn mượt trong 0.22 giây:

| mood | Hành động |
|---|---|
| neutral | tay đung đưa nhẹ, đầu nghiêng khẽ |
| happy | nhún nhảy, hai tay dang lên cổ vũ |
| wink | tay phải vẫy chào, đầu nghiêng |
| focus | hai tay khép vào như đang gõ/đọc, cúi nhẹ |
| surprised | giật mình bật lên, hai tay bung ra |
| sleepy | đầu gục lắc lư chậm, tay buông, người chùng xuống |
| confused | nghiêng đầu, nhún vai |

Thử nhanh trong trình duyệt: `playground/` (xem README ở đó).

> Không đổi các tên ở bảng trên nếu không sửa app cùng lúc: app đọc/ghi theo **tên**.

## 2. Làm việc với project

| Việc | Lệnh (chạy trong `packages/mascot/`) |
|---|---|
| Xem trực tiếp, tự rebuild khi lưu | `rive . --fit=contain` (giữ `contain`; mặc định `layout` co giãn artboard theo cửa sổ làm lệch nhân vật) |
| Xem trực tiếp một trạng thái cụ thể | thêm `--data=mood=happy --data=isAsleep=true` (tắt cửa sổ, chạy lại lệnh với giá trị khác) |
| Kiểm tra biên dịch | `rive . --verify` và `rive inspect . --summary` |
| Chạy toàn bộ kiểm tra (8 probe) | `python tools/check.py tests/*.json` |
| Can hình trên ảnh mẫu (chụp 1 khung) | `python tools/trace.py` → `build/trace.png` |
| Can hình trực tiếp (giấy can, tự đồng bộ khi lưu) | `python tools/trace.py --watch` |
| Kiểu "onion skin" (mẫu rõ, nét vẽ mờ) | `python tools/trace.py --ref-opacity=1 --art-opacity=0.45` |
| So mẫu và bản vẽ cạnh nhau | `python tools/overlay.py` → `build/side.png`, `build/overlay.png` |
| Thử một mood | thêm `--data=mood=wink` vào `trace.py` / `overlay.py` / `rive . --screenshot` |
| Xuất cho app | `rive . --once` rồi `cp build/nez-mascot.riv dist/runtime.riv` |

Ảnh mẫu chỉ nằm trong `build/trace/` (bản copy tạm) — **không bao giờ** lọt vào `dist/runtime.riv`.

## 2b. Khung thoại (câu nói của mascot)

Mascot "nói" bằng một **khung thoại do app vẽ**, đặt ở góc trên-trái đầu. Chữ không nằm trong file `.riv`, vì:
- dễ đổi câu, dịch, chèn số liệu;
- không phải nhúng font tiếng Việt vào `.riv`;
- chữ native đọc được bằng trình đọc màn hình.

- Danh sách câu: [`speech/lines.vi.json`](speech/lines.vi.json). 10 nhóm: `greeting` (hỏi thăm), `cheer` (cổ vũ), `chat` (tám chuyện), `focusStart`, `breakTime`, `sessionDone`, `streak`, `wake`, `night`, `trouble`.
- Mỗi câu: `text` (có thể chứa `{name}`, `{minutes}`, `{streak}`), `mood` (đặt cho mascot khi nói), `gesture` (tuỳ chọn, `"wave"` → bắn trigger `wave`).
- Điểm neo đuôi khung: `anchor` = (150, 78) trên artboard 500×500. Với `fit: contain` và khung vuông kích thước `S`: `x = 150·S/500`, `y = 78·S/500`. Khung mọc lên-trái từ điểm này.
- Quy tắc gợi ý: không nói khi `isAsleep = true`; khi vừa bị chạm đánh thức thì nói một câu nhóm `wake`; mỗi câu hiện `max(3.2s, số ký tự × 70ms)`; không lặp lại câu vừa nói; không có câu so sánh thứ hạng (SRS DEC-05).
- React Native: đặt một `View` tuyệt đối (absolute) cạnh `<Rive/>`, dùng `Text` native. Hiệu ứng pop dùng `Animated` hoặc Reanimated (scale 0.6 → 1 từ góc dưới-phải). Mẫu chạy được trên web: `playground/index.html`, hàm `say()` và `placeBubble()`.

---

## 3. Đề xuất animation theo tính năng SRS

SRS v1.1 **không** nhắc tới mascot/Rive, **không** có achievement/XP/level. Các đề xuất dưới đây gắn mascot vào những sự kiện **đã có** trong SRS (mã yêu cầu ghi kèm để tra).

### 3.1 Các input nên thêm vào view model `Mascot`

Tất cả điều khiển qua view model (không dùng StateMachine inputs — đã deprecated).

| Property | Kiểu | Giá trị | Vai trò |
|---|---|---|---|
| `mood` | enum | *(đã có)* + đề xuất thêm `sad`, `proud` | nét mặt |
| `activity` | enum | `idle` · `studying` · `onBreak` · `listening` · `chatting` · `waiting` · `sleeping` | tư thế/hoạt động kéo dài (layer riêng) |
| `focusPhase` | enum | `none` · `focus` · `shortBreak` · `longBreak` · `paused` | đồng bộ với Focus Timer; đổi màu phát sáng tai nghe/visor |
| `phaseProgress` | number 0–1 | tiến độ pha hiện tại | vòng tiến độ trên tai nghe (tuỳ chọn) |
| `streakDays` | number | 0… | cỡ/độ sáng ngọn lửa phụ kiện |
| `isOffline` | boolean | | biểu cảm mất mạng + icon dây rút |
| `reduceMotion` | boolean | | tắt vòng idle/FX không cần thiết (NFR-A11Y-05) |
| `wave` | trigger | | vẫy tay chào |
| `celebrate` | trigger | | nhảy cổ vũ + sparkle |
| `nod` | trigger | | gật đầu xác nhận nhỏ |
| `oops` | trigger | | lắc đầu nhẹ khi lỗi |
| `notify` | trigger | | nảy lên + dấu `!` (có mention/ping) |
| `phaseChange` | trigger | | nhún nhẹ khi chuyển pha |

Một trigger = một one-shot animation trên layer `Gesture` riêng, rồi tự về idle. Như vậy mood, hoạt động và cử chỉ chồng được lên nhau.

### 3.2 Bảng đề xuất theo khu vực tính năng

Ưu tiên: **P0** = nên có cùng MVP, **P1** = sau MVP, **P2** = backlog.

| Khu vực (SRS) | Sự kiện trong app | Mascot phản ứng | Điều khiển | Ưu tiên |
|---|---|---|---|---|
| **Focus Timer** (REQ-STUDY-01/10/11/15, §8.4.3) | Bắt đầu pha Focus | đeo kính, cúi vào laptop, tai nghe sáng xanh | `focusPhase=focus`, `activity=studying`, `mood=focus` | P0 |
| | Nghỉ ngắn | vươn vai, cười | `focusPhase=shortBreak`, `activity=onBreak`, `mood=happy` | P0 |
| | Nghỉ dài | ngồi thư giãn, nhắm mắt, zZ nhẹ | `focusPhase=longBreak`, `mood=sleepy` | P1 |
| | Pause | đứng yên, mặt neutral, icon ⏸ nhỏ | `focusPhase=paused`, `activity=idle` | P0 |
| | Chuyển pha (app tự phát hiện theo `server_started_at`, §7.3.6) | nhún nhẹ | `phaseChange` | P0 |
| | Kết thúc session (system message type 9) | nhảy cổ vũ, sparkle | `celebrate`, `mood=happy` | P0 |
| | Khôi phục timer sau khi app bị kill (STUDY-10 AC3) | vẫy "chào mừng quay lại" | `wave` | P1 |
| **Streak** (REQ-STUDY-03, `STREAK_UPDATE`) | Đạt ngưỡng 15 phút, streak +1 | tự hào, ngọn lửa bùng lên | `celebrate`, `mood=proud`, `streakDays` | P0 |
| | Kỷ lục mới (`longest_streak_days`) | cổ vũ lớn, pháo sáng | `celebrate` ×2 / FX riêng | P1 |
| | Mất streak (hôm nay = 0) | buồn nhẹ, rồi động viên ("Bắt đầu Focus 25 phút") | `mood=sad`, sau đó `mood=neutral` | P1 |
| | Leaderboard (DEC-05, mặc định tắt) | **không** cổ vũ so sánh — giữ neutral | — | — |
| **Empty states** (§3.5) | Chưa có guild / task / streak / inbox trống | idle, chỉ tay về nút gợi ý | `activity=idle`, `mood=neutral`/`happy` | P0 |
| **Offline / lỗi** (§3.5, NFR-MOB-12, Phụ lục 11) | Offline banner | bối rối, dây rút tuột | `isOffline=true`, `mood=confused` | P0 |
| | "Đang kết nối lại…" | chờ, mắt nhìn quanh (≤ vài giây, **không** thay skeleton) | `activity=waiting` | P1 |
| | Lỗi 50000/50301, gửi tin thất bại | lắc đầu nhẹ | `oops`, `mood=confused` | P0 |
| | Thiếu quyền OS (mic/thông báo) | chỉ về nút "Mở Cài đặt" | `mood=confused`, `activity=idle` | P1 |
| | Bắt buộc cập nhật (42601) | vẫy tay + mũi tên | `wave` | P2 |
| **Auth & Onboarding** (REQ-AUTH-01..13, UF-01) | Màn Welcome | vẫy chào | `wave`, `mood=happy` | P0 |
| | Đang chờ xác thực email | chờ, nháy mắt | `activity=waiting`, `mood=wink` | P1 |
| | "Xác thực thành công" | cổ vũ | `celebrate` | P0 |
| | Sai mật khẩu (40102) | lắc đầu nhẹ | `oops` | P1 |
| | Phiên hết hạn (40100) | ngạc nhiên | `mood=surprised` | P2 |
| **Study Server / Invite** (REQ-SRV-01..07) | Tạo/tham gia server thành công | cổ vũ + vẫy | `celebrate` rồi `wave` | P1 |
| | Invite hết hạn (40041) | bối rối | `mood=confused` | P2 |
| **Chat** (REQ-MSG-01..11) | Gửi tin thành công | gật đầu | `nod` | P2 |
| | Được mention | nảy lên + `!` | `notify`, `mood=surprised` | P1 |
| | Slow mode / gửi quá nhanh (40029/40030) | chờ, ngáp | `activity=waiting`, `mood=sleepy` | P2 |
| **Voice / Silent co-working** (REQ-VC-01..08, STUDY-02) | Vào phòng học | đeo tai nghe sáng, lắc lư theo nhạc | `activity=listening` | P1 |
| | Silent room | tập trung, không lắc lư | `activity=studying`, `mood=focus` | P1 |
| | Mạng kém (VC-05) | bối rối, tai nghe nhấp nháy | `mood=confused` | P2 |
| **Friends / Call** (REQ-FRIEND, DMVC, §8.4.1) | Có bạn mới | vui | `mood=happy`, `nod` | P2 |
| | Cuộc gọi đến (ringing, 45s) | tai nghe rung | `activity=chatting` + `notify` lặp | P2 |
| | Cuộc gọi nhỡ | buồn nhẹ | `mood=sad` | P2 |
| **Task** (REQ-STUDY-06/08, §8.4.4) | Hoàn thành task | gật + sparkle nhỏ | `nod`, `mood=happy` | P1 |
| | Task quá hạn | ngạc nhiên | `mood=surprised` | P1 |
| **Premium** (REQ-PREM, backlog) | Mua thành công | cổ vũ lớn | `celebrate` | P2 |

### 3.3 Ràng buộc từ SRS mà mascot phải tuân

- **Hiệu năng**: animation ≥ 55 FPS, không khung hình đứng > 700ms (NFR-MOB-03). Giữ vector đơn giản, tránh quá nhiều `Feather`.
- **Pin**: Solo Focus 60 phút khi khoá màn hình ≤ 2% pin (NFR-MOB-06). Dừng/pause Rive khi app vào nền.
- **Giảm chuyển động**: tôn trọng setting hệ thống (NFR-A11Y-05). Bật `reduceMotion` để tắt idle loop, chỉ đổi mood tĩnh.
- **Loading**: dùng skeleton, không dùng spinner toàn màn > 1s (§3.5). Mascot không được thay skeleton.
- **Thông báo push/local** (Notifee/FCM) không chạy được Rive. Xuất ảnh tĩnh theo mood bằng `rive . --screenshot=build/mood-<key>.png --data=mood=<key>`.
- **Mini-player**: chỉ đủ chỗ cho icon nhỏ theo pha. Dùng cùng artboard ở ~48–64px (đã kiểm tra đọc được ở 120px) hoặc ảnh tĩnh.
- **Màu pha**: token `accent.focus` / `accent.break` (§3.3). Màu phát sáng theo `focusPhase` nên lấy đúng hai token này, và luôn kèm icon/nhãn (NFR-A11Y-02).

## 4. Cách thêm một state mới (tóm tắt)

1. **Data** (`data.rml`): thêm property vào `Mascot` (enum/number/boolean/trigger). Enum mới thì **thêm vào cuối** danh sách giá trị.
2. **Hình** (`runtime.rml`): thêm phần hình cần thiết. Biến thể mặt thì là con của Solo `EyesSet`/`MouthSet`/`FxSet`; tư thế thì là Node có pivot ở khớp (vai, cổ, chân).
3. **Animation**: tạo `LinearAnimation` (loop cho trạng thái kéo dài, oneShot cho trigger).
4. **State machine** `Main`: mỗi nhóm hành vi một layer (`Mood`, `Blink`, `Idle`, `Ears` đã có; đề xuất thêm `Activity`, `Phase`, `Gesture`). Transition đọc view model bằng `TransitionViewModelCondition`.
   - **Không** dùng AnyState cho state có animation chạy liên tục, vì nó sẽ vào lại state mỗi frame. Làm như layer `Blink`: nối trực tiếp giữa các state.
5. **Probe** `tests/tN_<tên>.json`: chụp với `"data": ["<prop>=<value>"]` và kiểm vùng pixel. Chạy `python tools/check.py tests/*.json`.
6. Xuất lại `dist/runtime.riv`, rồi cập nhật bảng hợp đồng ở mục 1 và phía app.

Chi tiết cú pháp và ví dụ: [`docs/TUNING.md`](docs/TUNING.md) (mục "Thêm một mood mới").
