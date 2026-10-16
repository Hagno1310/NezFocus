# Runtime Mascot (Rive) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng lại mascot **Runtime** (mặt trước, "Tạo hình tiêu chuẩn") y như `reference/nez-mascot-demo.png` bằng Rive CLI. Mascot phải có chuyển động idle và 7 biểu cảm đổi được từ app React Native qua view model `Mascot.mood`. Kèm một hướng dẫn chỉnh (`docs/TUNING.md`).

**Architecture:** Một artboard `Runtime` 500×500, nền trong suốt, vẽ hoàn toàn bằng vector RML (không ảnh bitmap, không script). Nhân vật là cây `Node` có pivot đặt ở các khớp (chân, cổ, vai, gốc tai), nên chuyển động chỉ cần key transform của group. Biểu cảm dùng 3 `Solo` (`EyesSet`, `MouthSet`, `FxSet`). Mỗi mood là một `LinearAnimation` 1 frame, key `activeComponentId` của 3 Solo đó. Layer `Mood` của state machine `Main` chuyển giữa các mood qua `TransitionViewModelCondition` đọc enum `mood`. Các layer `Idle`, `Blink`, `Ears` chạy song song.

**Tech Stack:** Rive CLI 1.2.0 (RML), Python 3 + Pillow (script kiểm tra render), git.

**Spec:** `MASCOT_BRIEF.md` (cùng thư mục project). Ảnh gốc: `reference/nez-mascot-demo.png`.

## Global Constraints

- Đích dùng: app **React Native mobile (iOS/Android)**. Không làm web preview, không dùng web runtime (xem `AGENTS.md`).
- Không dùng `rive push` (upload lên tài khoản). Chỉ dùng `rive . --verify`, `rive inspect`, `--screenshot`, `--once`.
- Tên public là API cho app, **không được đổi**: file `runtime.riv`, artboard `Runtime`, state machine `Main`, view model `Mascot`, property `mood`, và các enum key `neutral | happy | wink | focus | surprised | sleepy | confused`.
- Không dùng `StateMachineBool/Number/Trigger` (đã deprecated). Chỉ điều khiển bằng view model.
- Không dùng Luau script. Nhờ vậy `.riv` unsigned từ `--once` dùng được ngay trên runtime mobile.
- Artboard **không có `Fill` nền**, để trong suốt khi đặt lên UI app.
- Thứ tự vẽ: **phần tử khai báo trước nằm trên**. Trong cùng một Shape thì paint khai báo sau nằm trên.
- Rotation tính bằng radian. `duration` của animation tính bằng frame (60 fps). `duration` của transition tính bằng ms.
- Màu dùng các token ở bảng dưới. Không tự thêm màu ngoài bảng; nếu cần thì thêm vào bảng trong `MASCOT_BRIEF.md` trước.

| Token | ARGB | Dùng cho |
|---|---|---|
| WHITE_TOP | `FFFFFFFF` | gradient trắng, đầu trên |
| WHITE_SHADE | `FFDCE4F7` | gradient trắng, đầu dưới (bóng mềm) |
| OUTLINE | `FF2B3257` | viền mọi khối trắng / xanh, 3px |
| PRIMARY | `FF547FE4` | logo N, đầu tai, đế giày, FX |
| ACCENT | `FF89B8FD` | tai (đáy), mặt tai nghe, dây rút, cổ tay áo, kính, sparkle |
| EAR_INNER | `FFA9CBFF` | lòng tai |
| PHONE_FACE_TOP | `FFC7DCFF` | gradient mặt tai nghe |
| NAVY | `FF3B4470` | vỏ tai nghe, cổ áo V, quai balo |
| SHORTS | `FF3B3D52` | quần |
| VISOR_IN | `FF3A4468` | visor, tâm |
| VISOR_OUT | `FF1F2744` | visor, viền |
| VISOR_RIM | `FF1A2038` | viền visor |
| GLOW | `FF6EA6FB` | mắt, miệng |
| GLOW_HALO | `806EA6FB` | quầng sáng mắt (feather) |
| BLUSH | `994A5FAB` | má |
| HIGHLIGHT | `40FFFFFF` | vệt sáng visor |

## Hệ toạ độ (đo từ ảnh gốc)

Vùng crop `(890,108)–(1140,358)` của ảnh gốc, phóng 2×, trùng khít với artboard 500×500. `tools/overlay.py` dùng đúng crop này. Các mốc tuyệt đối trên artboard:

| Mốc | Toạ độ artboard |
|---|---|
| `Character` (pivot, giữa hai bàn chân) | (250, 470) |
| `Head` (pivot, cổ) | (250, 292), tức Character + (0, −178) |
| Tâm vỏ đầu | (250, 172), kích thước 284×245 |
| Tâm visor | (251, 193), kích thước 207×150 |
| Tâm mắt trái / phải | (199, 197) / (303, 197) |
| Tâm miệng | (251, 220) |
| Tâm tai nghe trái / phải | (101, 199) / (399, 199) |
| Vai trái / phải | (170, 305) / (330, 305) |
| Tâm thân (torso) | (250, 350), kích thước 170×110 |

## Bảng ID (dùng chung toàn project, không được trùng)

| Dải | Dùng cho |
|---|---|
| `0:2`, `0:3` | Artboard, style |
| `0:10`–`0:29` | Node rig: Character 0:10, Head 0:11, EarL 0:12, EarR 0:13, Visor 0:14, Face 0:15, EyeBlink 0:16, EyesSet 0:17, MouthSet 0:18, FxSet 0:19, ArmL 0:20, ArmR 0:21, HeadphoneL 0:22, Body 0:23, HeadphoneR 0:24 |
| `0:31`–`0:37` | Con của EyesSet: Neutral, Happy, Wink, Focus, Surprised, Sleepy, Confused |
| `0:41`–`0:45` | Con của MouthSet: Smile, Open, O, Small, Slant |
| `0:51`–`0:57` | Con của FxSet: None, Shine, SparkleLow, Glasses, Exclaim, Zzz, Question |
| `0:400`–`0:402` | Animation idle_breathe, blink, ear_twitch |
| `0:410`–`0:416` | Animation mood_neutral … mood_confused (cùng thứ tự enum) |
| `0:500`–`0:526` | StateMachine Main 0:500; layer Idle 0:501, Blink 0:502, Ears 0:503, Mood 0:504; state 0:511–0:513 (idle), 0:520–0:526 (mood) |
| `0:600`–`0:612` | Enum Mood 0:600, giá trị 0:601–0:607; ViewModel Mascot 0:610, property mood 0:611, instance Default 0:612 |

## Review Focus

1. **App hiển thị mascot nhỏ** (ví dụ 120×120 trong header). Mắt vẫn phải đọc được, không bị outline nuốt. Test ở Task 3 (`t3-small`).
2. **Khung chứa không vuông** (ví dụ 500×300) với `fit=contain`. Mascot phải letterbox đủ, không bị cắt đầu. Test ở Task 8 (`t8-letterbox`).
3. **Vòng lặp idle không giật ở điểm nối**: frame 150 phải trùng frame 0. Test ở Task 5 (`t5-seam`).
4. **Mood giữ ổn định theo thời gian**: transition từ AnyState không được bật về neutral hay nhấp nháy sau vài giây. Test ở Task 6 (`t6-persist`).
5. **Chớp mắt không làm biến dạng mood mắt nhắm**: sleepy vẫn là sleepy trong lúc blink. Test ở Task 7 (`t7-sleepy-blink`).

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `rive.yaml` | cấu hình project: `main: Runtime`, loại trừ thư mục không phải RML |
| `data.rml` | enum `Mood` + view model `Mascot` (API cho app) |
| `runtime.rml` | artboard `Runtime`: hình vẽ, animation, state machine |
| `scene.rml` | **xoá** (scaffold mặc định) |
| `tools/check.py` | chạy file probe: kiểm tra cấu trúc (`rive inspect`) và pixel (`--screenshot`) |
| `tools/overlay.py` | ghép ảnh gốc với render để so độ giống (`build/overlay.png`, `build/side.png`) |
| `tests/t*.json` | các probe, mỗi task một file |
| `docs/TUNING.md` | hướng dẫn chỉnh mascot |
| `dist/runtime.riv` | file giao cho app React Native |
| `MASCOT_BRIEF.md` | spec. Cập nhật ở Task 1 (thêm mood `neutral`, file layout) |

Quy ước khi chạy probe: nếu probe fail chỉ vì lệch 1–2px do khử răng cưa, hãy **dời hộp đo** chứ không sửa hình, và ghi chú lý do trong commit message. Nếu lệch lớn thì sửa hình.

---

### Task 1: Scaffold project, data API, bộ kiểm tra

**Files:**
- Create: `tools/check.py`, `tools/overlay.py`, `tests/t1_scaffold.json`, `data.rml`, `runtime.rml`
- Modify: `rive.yaml`, `MASCOT_BRIEF.md`
- Delete: `scene.rml`

**Interfaces:**
- Produces: `python tools/check.py tests/<file>.json [...]`, exit 0 nếu mọi probe pass. Định dạng probe:
  `{"names":[str], "min_types":{type:int}, "transparent_artboard":bool, "captures":[{"id":str, "advance":int|str, "data":[str], "viewport":"WxH", "fit":str, "regions":[{"what":str, "box":[x,y,w,h], "color":"RRGGBB", "tol":num, "min":num, "max":num}]}]}`.
  Mỗi region tính tỉ lệ pixel trong `box` có màu cách `color` ≤ `tol` (Euclid RGB), rồi yêu cầu tỉ lệ đó nằm trong [`min`, `max`]. Mặc định: `tol` 45, `min` 0.5, `max` 1.0, `advance` 5.
- Produces: artboard `Runtime` (0:2), `Character` Node 0:10 tại (250,470), state machine `Main` 0:500 với layer `Mood` 0:504, animation rỗng `mood_neutral` 0:410, enum/view model đúng bảng ID.
- Produces: `python tools/overlay.py [--data=mood=<key>]` ghi ra `build/overlay.png` và `build/side.png`.

- [ ] **Step 1: Khởi tạo git trong `nez-mascot`**

```bash
cd /e/Work/App/nez-mascot && git init && git add -A && git commit -m "chore: rive scaffold + mascot brief

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Viết `tools/check.py`**

```python
#!/usr/bin/env python3
"""Probe runner for the Runtime mascot.

Usage: python tools/check.py tests/t1_scaffold.json [tests/t2_head.json ...]
Each probe checks structure via `rive inspect . --json` and pixels via
`rive . --screenshot`. Exit code 1 if any probe fails.
"""
import json
import pathlib
import shutil
import subprocess
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
RIVE = shutil.which("rive")


def rive(args):
    return subprocess.run([RIVE, *args], cwd=ROOT, capture_output=True, text=True)


def walk(o):
    if isinstance(o, dict):
        yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def close(px, rgb, tol):
    return sum((a - b) ** 2 for a, b in zip(px[:3], rgb)) ** 0.5 <= tol


def check_structure(probe, fails):
    r = rive(["inspect", ".", "--json"])
    if r.returncode != 0:
        fails.append(f"inspect failed: {r.stderr.strip()[:400]}")
        return
    tree = json.loads(r.stdout)
    if tree.get("problems"):
        fails.append(f"problems: {tree['problems']}")
    objs = [o for o in walk(tree) if "type" in o]
    names = {o.get("name") for o in objs}
    for n in probe.get("names", []):
        if n not in names:
            fails.append(f"missing element named {n!r}")
    counts = {}
    for o in objs:
        counts[o["type"]] = counts.get(o["type"], 0) + 1
    for t, n in probe.get("min_types", {}).items():
        if counts.get(t, 0) < n:
            fails.append(f"type {t}: {counts.get(t, 0)} < {n}")
    if probe.get("transparent_artboard"):
        for ab in tree.get("artboards", []):
            if any(c.get("type") == "Fill" for c in ab.get("children", [])):
                fails.append(f"artboard {ab.get('name')!r} has a background Fill")


def check_capture(cap, fails):
    out = f"build/probe-{cap['id']}.png"
    args = [".", f"--screenshot={out}", f"--advance={cap.get('advance', 5)}", "--quiet"]
    if "viewport" in cap:
        args.append(f"--viewport={cap['viewport']}")
    if "fit" in cap:
        args.append(f"--fit={cap['fit']}")
    args += [f"--data={d}" for d in cap.get("data", [])]
    r = rive(args)
    if r.returncode != 0:
        fails.append(f"[{cap['id']}] screenshot failed: {r.stderr.strip()[:400]}")
        return
    im = Image.open(ROOT / out).convert("RGBA")
    for reg in cap.get("regions", []):
        x, y, w, h = reg["box"]
        rgb, tol = hex_rgb(reg["color"]), reg.get("tol", 45)
        px = [im.getpixel((i, j)) for i in range(x, x + w) for j in range(y, y + h)]
        frac = sum(close(p, rgb, tol) for p in px) / len(px)
        lo, hi = reg.get("min", 0.5), reg.get("max", 1.0)
        if not lo <= frac <= hi:
            fails.append(f"[{cap['id']}] {reg['what']}: {frac:.2f} of {reg['box']} ~#{reg['color']} (want {lo}..{hi}) -> {out}")


def main(paths):
    bad = 0
    for p in paths:
        probe = json.loads(pathlib.Path(p).read_text(encoding="utf-8"))
        fails = []
        check_structure(probe, fails)
        for cap in probe.get("captures", []):
            check_capture(cap, fails)
        print(("PASS " if not fails else "FAIL ") + p)
        for f in fails:
            print("   - " + f)
        bad += bool(fails)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
```

- [ ] **Step 3: Viết `tools/overlay.py`**

```python
#!/usr/bin/env python3
"""Compare the render with the reference front view.

Usage: python tools/overlay.py [extra rive flags, e.g. --data=mood=wink]
Writes build/overlay.png (50/50 blend) and build/side.png (reference | render).
"""
import pathlib
import shutil
import subprocess
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
REF = ROOT / "reference" / "nez-mascot-demo.png"
# Front view ("Mặt trước") crop that maps 2x onto the 500x500 artboard.
CROP = (890, 108, 1140, 358)


def main(extra):
    subprocess.run([shutil.which("rive"), ".", "--screenshot=build/overlay-src.png",
                    "--advance=5", "--quiet", *extra], cwd=ROOT, check=True)
    ref = Image.open(REF).convert("RGB").crop(CROP).resize((500, 500), Image.LANCZOS)
    cur = Image.open(ROOT / "build" / "overlay-src.png").convert("RGB")
    Image.blend(ref, cur, 0.5).save(ROOT / "build" / "overlay.png")
    side = Image.new("RGB", (1000, 500))
    side.paste(ref, (0, 0))
    side.paste(cur, (500, 0))
    side.save(ROOT / "build" / "side.png")
    print("wrote build/overlay.png and build/side.png")


if __name__ == "__main__":
    main(sys.argv[1:])
```

- [ ] **Step 4: Viết probe fail trước — `tests/t1_scaffold.json`**

```json
{
  "names": ["Runtime", "Character", "Main", "Mood", "Mascot", "mood", "mood_neutral"],
  "min_types": {"DataEnumValue": 7, "ViewModelInstanceEnum": 1, "StateMachineLayer": 1},
  "transparent_artboard": true,
  "captures": [
    {"id": "t1-empty", "regions": [
      {"what": "empty artboard shows previewer bg", "box": [5, 5, 490, 490], "color": "1D1D1D", "tol": 10, "min": 0.99}
    ]},
    {"id": "t1-data", "data": ["mood=confused"], "regions": []}
  ]
}
```

- [ ] **Step 5: Chạy để xác nhận FAIL**

Run: `cd /e/Work/App/nez-mascot && python tools/check.py tests/t1_scaffold.json`
Expected: `FAIL`, gồm `missing element named 'Runtime'` (artboard hiện tên `Artboard`) và `artboard 'Artboard' has a background Fill`.

- [ ] **Step 6: Sửa `rive.yaml`**

```yaml
name: nez-mascot
main: Runtime
exclude:
  - docs
  - tools
  - tests
  - reference
  - dist
logs:
  file: build/rive.log
  problems: build/problems.log
```

- [ ] **Step 7: Xoá `scene.rml`, tạo `data.rml`**

```bash
git rm -q scene.rml
```

```xml
<Rive version="1" kind="fragment">
    <DataEnumCustom name="Mood" id="0:600">
        <DataEnumValue key="neutral" value="Neutral" id="0:601"/>
        <DataEnumValue key="happy" value="Happy" id="0:602"/>
        <DataEnumValue key="wink" value="Wink" id="0:603"/>
        <DataEnumValue key="focus" value="Focus" id="0:604"/>
        <DataEnumValue key="surprised" value="Surprised" id="0:605"/>
        <DataEnumValue key="sleepy" value="Sleepy" id="0:606"/>
        <DataEnumValue key="confused" value="Confused" id="0:607"/>
    </DataEnumCustom>

    <ViewModel defaultInstanceId="0:612" name="Mascot" id="0:610">
        <ViewModelPropertyEnumCustom enumId="0:600" name="mood" id="0:611"/>
        <ViewModelInstance exports="true" name="Default" id="0:612">
            <ViewModelInstanceEnum propertyValue="0:601" viewModelPropertyId="0:611"/>
        </ViewModelInstance>
    </ViewModel>
</Rive>
```

- [ ] **Step 8: Tạo `runtime.rml`**

```xml
<Rive version="1" kind="fragment">
    <Artboard defaultStateMachineId="0:500" viewModelId="0:610" viewModelInstanceId="0:612"
              styleId="0:3" width="500" height="500" name="Runtime" id="0:2">
        <LayoutComponentStyle name="Runtime Style" id="0:3"/>

        <!-- RIG: Character pivot = between the feet -->
        <Node x="250" y="470" name="Character" id="0:10">
        </Node>

        <StateMachine name="Main" id="0:500">
            <StateMachineLayer name="Mood" id="0:504">
                <AnyState x="0" y="-150"/>
                <ExitState x="400" y="-150"/>
                <EntryState x="-250" y="0">
                    <StateTransition stateToId="0:520"/>
                </EntryState>
                <AnimationState x="0" y="0" animationId="0:410" id="0:520"/>
            </StateMachineLayer>
        </StateMachine>

        <LinearAnimation duration="1" name="mood_neutral" id="0:410"/>
    </Artboard>
</Rive>
```

- [ ] **Step 9: Verify + chạy probe, xác nhận PASS**

Run: `rive . --verify && rive inspect . --summary && python tools/check.py tests/t1_scaffold.json`
Expected: `0 errors`, `"problems": []`, `PASS tests/t1_scaffold.json`.
Nếu `viewModelInstanceId` báo lỗi: chạy `rive schema Artboard --all | grep -i instance` để tìm đúng tên thuộc tính. Nếu schema không có thì bỏ thuộc tính này, vì nó chỉ phục vụ editor.

- [ ] **Step 10: Cập nhật `MASCOT_BRIEF.md`**

Trong mục 4, thêm dòng đầu bảng:
`| neutral (Mặc định) | 2 oval dọc | cười nhỏ "u" | — |`
Trong mục 6, thay dòng enum bằng:
`- View model \`Mascot\`: enum \`mood\` = neutral (mặc định) | happy | wink | focus | surprised | sleepy | confused.`
Cuối file, thêm:

```markdown
## 8. File & quy ước

- `data.rml`: enum + view model. `runtime.rml`: artboard. Plan: `docs/superpowers/plans/2026-09-29-runtime-mascot.md`.
- Bảng token màu, toạ độ và ID: xem plan. Hướng dẫn chỉnh: `docs/TUNING.md`.
- Kiểm tra: `python tools/check.py tests/*.json`. So với ảnh gốc: `python tools/overlay.py`.
- Balo và tai nghe nhìn từ mặt sau/bên: phase 2 (chưa làm).
```

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat: Runtime artboard scaffold, Mascot view model, probe tooling

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Đầu — vỏ đầu, tai mèo, tai nghe

**Files:**
- Modify: `runtime.rml` (bên trong `Character`)
- Test: `tests/t2_head.json`

**Interfaces:**
- Consumes: `Character` 0:10 (Task 1).
- Produces: `Head` 0:11 tại Character + (0,−178). Con của Head theo thứ tự vẽ: `HeadphoneL` 0:22, `HeadphoneR` 0:24, *(Task 3 chèn `Visor` vào đây)*, `HeadShell`, `EarL` 0:12, `EarR` 0:13. Pivot tai đặt ở gốc tai để Task 5 xoay.

- [ ] **Step 1: Viết probe fail trước — `tests/t2_head.json`**

```json
{
  "names": ["Head", "HeadShell", "EarL", "EarR", "HeadphoneL", "HeadphoneR"],
  "transparent_artboard": true,
  "captures": [
    {"id": "t2-head", "regions": [
      {"what": "head shell white (above visor)", "box": [240, 80, 20, 20], "color": "F3F6FC", "tol": 40, "min": 0.8},
      {"what": "left ear blue", "box": [137, 66, 8, 8], "color": "8FB5F8", "tol": 60, "min": 0.8},
      {"what": "right ear blue", "box": [355, 66, 8, 8], "color": "8FB5F8", "tol": 60, "min": 0.8},
      {"what": "left headphone navy shell", "box": [108, 185, 8, 20], "color": "3B4470", "tol": 45, "min": 0.7},
      {"what": "left headphone light face", "box": [88, 185, 8, 20], "color": "A5C8FE", "tol": 60, "min": 0.7},
      {"what": "right headphone navy shell", "box": [384, 185, 8, 20], "color": "3B4470", "tol": 45, "min": 0.7},
      {"what": "background corner", "box": [5, 5, 20, 20], "color": "1D1D1D", "tol": 10, "min": 0.95}
    ]}
  ]
}
```

- [ ] **Step 2: Chạy để xác nhận FAIL**

Run: `python tools/check.py tests/t2_head.json`
Expected: `FAIL`, `missing element named 'Head'` và các region trắng/xanh = 0.00.

- [ ] **Step 3: Thêm Head vào trong `<Node ... name="Character" id="0:10">`**

```xml
            <!-- HEAD: pivot = neck -->
            <Node y="-178" name="Head" id="0:11">
                <Node x="-149" y="-93" name="HeadphoneL" id="0:22">
                    <Shape x="-8" name="PhoneFace">
                        <Rectangle width="20" height="86" cornerRadiusTL="10" name="P"/>
                        <Fill name="F">
                            <LinearGradient startX="0" startY="-43" endX="0" endY="43" name="G">
                                <GradientStop colorValue="FFC7DCFF" position="0"/>
                                <GradientStop colorValue="FF89B8FD" position="1"/>
                            </LinearGradient>
                        </Fill>
                    </Shape>
                    <Shape name="PhoneCup">
                        <Rectangle width="40" height="102" cornerRadiusTL="20" name="P"/>
                        <Fill name="F"><SolidColor colorValue="FF3B4470" name="C"/></Fill>
                        <Stroke thickness="3" join="round" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                    </Shape>
                </Node>

                <Node x="149" y="-93" scaleX="-1" name="HeadphoneR" id="0:24">
                    <Shape x="-8" name="PhoneFace">
                        <Rectangle width="20" height="86" cornerRadiusTL="10" name="P"/>
                        <Fill name="F">
                            <LinearGradient startX="0" startY="-43" endX="0" endY="43" name="G">
                                <GradientStop colorValue="FFC7DCFF" position="0"/>
                                <GradientStop colorValue="FF89B8FD" position="1"/>
                            </LinearGradient>
                        </Fill>
                    </Shape>
                    <Shape name="PhoneCup">
                        <Rectangle width="40" height="102" cornerRadiusTL="20" name="P"/>
                        <Fill name="F"><SolidColor colorValue="FF3B4470" name="C"/></Fill>
                        <Stroke thickness="3" join="round" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                    </Shape>
                </Node>

                <!-- VISOR goes here (Task 3) -->

                <Shape y="-120" name="HeadShell">
                    <Rectangle width="284" height="245" cornerRadiusTL="112" name="P"/>
                    <Fill name="F">
                        <LinearGradient startX="0" startY="-122" endX="0" endY="122" name="G">
                            <GradientStop colorValue="FFFFFFFF" position="0"/>
                            <GradientStop colorValue="FFDCE4F7" position="1"/>
                        </LinearGradient>
                    </Fill>
                    <Stroke thickness="3" join="round" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                </Shape>

                <!-- EARS: pivot = ear base, drawn behind the shell -->
                <Node x="-95" y="-190" name="EarL" id="0:12">
                    <Shape name="EarInner">
                        <PointsPath isClosed="true" name="P">
                            <StraightVertex x="-28" y="8" radius="4"/>
                            <StraightVertex x="-17" y="-48" radius="10"/>
                            <StraightVertex x="32" y="-18" radius="4"/>
                        </PointsPath>
                        <Fill name="F"><SolidColor colorValue="FFA9CBFF" name="C"/></Fill>
                    </Shape>
                    <Shape name="EarOuter">
                        <PointsPath isClosed="true" name="P">
                            <StraightVertex x="-47" y="18" radius="6"/>
                            <StraightVertex x="-22" y="-67" radius="16"/>
                            <StraightVertex x="60" y="-22" radius="6"/>
                        </PointsPath>
                        <Fill name="F">
                            <LinearGradient startX="-22" startY="-67" endX="0" endY="18" name="G">
                                <GradientStop colorValue="FF547FE4" position="0"/>
                                <GradientStop colorValue="FF89B8FD" position="1"/>
                            </LinearGradient>
                        </Fill>
                        <Stroke thickness="3" join="round" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                    </Shape>
                </Node>

                <Node x="95" y="-190" scaleX="-1" name="EarR" id="0:13">
                    <Shape name="EarInner">
                        <PointsPath isClosed="true" name="P">
                            <StraightVertex x="-28" y="8" radius="4"/>
                            <StraightVertex x="-17" y="-48" radius="10"/>
                            <StraightVertex x="32" y="-18" radius="4"/>
                        </PointsPath>
                        <Fill name="F"><SolidColor colorValue="FFA9CBFF" name="C"/></Fill>
                    </Shape>
                    <Shape name="EarOuter">
                        <PointsPath isClosed="true" name="P">
                            <StraightVertex x="-47" y="18" radius="6"/>
                            <StraightVertex x="-22" y="-67" radius="16"/>
                            <StraightVertex x="60" y="-22" radius="6"/>
                        </PointsPath>
                        <Fill name="F">
                            <LinearGradient startX="-22" startY="-67" endX="0" endY="18" name="G">
                                <GradientStop colorValue="FF547FE4" position="0"/>
                                <GradientStop colorValue="FF89B8FD" position="1"/>
                            </LinearGradient>
                        </Fill>
                        <Stroke thickness="3" join="round" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                    </Shape>
                </Node>
            </Node>
```

- [ ] **Step 4: Verify, xem ảnh, chạy probe**

Run: `rive . --verify && rive . --screenshot --advance=1 && python tools/check.py tests/t1_scaffold.json tests/t2_head.json`
Mở `build/nez-mascot.png` để xem. Expected: đầu trắng bo tròn, hai tai xanh nghiêng ra ngoài, tai nghe hai bên; `PASS` cả hai probe.
Lưu ý: `t1-empty` giờ sẽ FAIL vì artboard không còn rỗng. Sửa `tests/t1_scaffold.json`: đổi box của region `t1-empty` thành `[5, 5, 60, 60]`, đổi `what` thành `"top-left corner stays transparent"`.
Nếu `isClosed` hoặc `radius` báo lỗi: chạy `rive schema PointsPath` / `rive schema StraightVertex` để lấy đúng tên.

- [ ] **Step 5: So với ảnh gốc**

Run: `python tools/overlay.py` rồi xem `build/overlay.png`. Tai, vỏ đầu và tai nghe phải trùng bóng ảnh gốc, lệch ≤ ~6px. Nếu lệch nhiều hơn: chỉnh `x/y` của Node hoặc toạ độ vertex, rồi chạy lại Step 4.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(mascot): head shell, cat ears, headphones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Visor + mặt neutral (cấu trúc Solo cho mood)

**Files:**
- Modify: `runtime.rml`
- Test: `tests/t3_face.json`

**Interfaces:**
- Consumes: `Head` 0:11 (Task 2); animation `mood_neutral` 0:410 (Task 1).
- Produces: `Visor` 0:14 tại Head + (1,−99). `Face` 0:15, con của Visor, theo thứ tự vẽ: `FxSet` Solo 0:19 → `EyeBlink` Node 0:16 (y=4, pivot đường mắt) chứa `EyesSet` Solo 0:17 → `MouthSet` Solo 0:18 (y=27) → `Blush`. Mắt đặt ở x=±52 trong các node con của EyesSet. `mood_neutral` key cả 3 Solo về `0:31 / 0:41 / 0:51`.

- [ ] **Step 1: Viết probe fail trước — `tests/t3_face.json`**

```json
{
  "names": ["Visor", "Face", "EyeBlink", "EyesSet", "MouthSet", "FxSet", "EyesNeutral", "MouthSmile", "FxNone"],
  "min_types": {"Solo": 3, "KeyFrameId": 3},
  "captures": [
    {"id": "t3-face", "regions": [
      {"what": "visor navy above eyes", "box": [241, 150, 20, 10], "color": "2E3858", "tol": 40, "min": 0.9},
      {"what": "left eye glow", "box": [194, 190, 10, 14], "color": "6EA6FB", "tol": 40, "min": 0.8},
      {"what": "right eye glow", "box": [298, 190, 10, 14], "color": "6EA6FB", "tol": 40, "min": 0.8},
      {"what": "left blush", "box": [175, 228, 6, 4], "color": "3F4F8A", "tol": 35, "min": 0.5}
    ]},
    {"id": "t3-small", "viewport": "120x120", "fit": "contain", "regions": [
      {"what": "eye still readable at 120px", "box": [46, 45, 3, 4], "color": "6EA6FB", "tol": 50, "min": 0.5}
    ]}
  ]
}
```

- [ ] **Step 2: Chạy để xác nhận FAIL**

Run: `python tools/check.py tests/t3_face.json`
Expected: `FAIL`, `missing element named 'Visor'`, `type Solo: 0 < 3`.

- [ ] **Step 3: Thay dòng `<!-- VISOR goes here (Task 3) -->` bằng**

```xml
                <!-- VISOR + FACE -->
                <Node x="1" y="-99" name="Visor" id="0:14">
                    <Node name="Face" id="0:15">
                        <Solo activeComponentId="0:51" name="FxSet" id="0:19">
                            <Node name="FxNone" id="0:51"/>
                        </Solo>

                        <Node y="4" name="EyeBlink" id="0:16">
                            <Solo activeComponentId="0:31" name="EyesSet" id="0:17">
                                <Node name="EyesNeutral" id="0:31">
                                    <Shape x="-52" name="EyeL">
                                        <Ellipse width="30" height="43" name="P"/>
                                        <Stroke thickness="6" name="Halo">
                                            <SolidColor colorValue="806EA6FB" name="C"/>
                                            <Feather strength="6" name="Fe"/>
                                        </Stroke>
                                        <Fill name="F"><SolidColor colorValue="FF6EA6FB" name="C"/></Fill>
                                    </Shape>
                                    <Shape x="52" name="EyeR">
                                        <Ellipse width="30" height="43" name="P"/>
                                        <Stroke thickness="6" name="Halo">
                                            <SolidColor colorValue="806EA6FB" name="C"/>
                                            <Feather strength="6" name="Fe"/>
                                        </Stroke>
                                        <Fill name="F"><SolidColor colorValue="FF6EA6FB" name="C"/></Fill>
                                    </Shape>
                                </Node>
                            </Solo>
                        </Node>

                        <Solo y="27" activeComponentId="0:41" name="MouthSet" id="0:18">
                            <Shape name="MouthSmile" id="0:41">
                                <PointsPath name="P">
                                    <StraightVertex x="-10" y="0"/>
                                    <CubicMirroredVertex x="0" y="7" rotation="0" distance="6"/>
                                    <StraightVertex x="10" y="0"/>
                                </PointsPath>
                                <Stroke thickness="3.5" cap="round" join="round" name="S"><SolidColor colorValue="FF6EA6FB" name="C"/></Stroke>
                            </Shape>
                        </Solo>

                        <Node name="Blush">
                            <Shape x="-73" y="37" name="BlushL">
                                <Ellipse width="20" height="11" name="P"/>
                                <Fill name="F"><SolidColor colorValue="994A5FAB" name="C"/></Fill>
                            </Shape>
                            <Shape x="73" y="37" name="BlushR">
                                <Ellipse width="20" height="11" name="P"/>
                                <Fill name="F"><SolidColor colorValue="994A5FAB" name="C"/></Fill>
                            </Shape>
                        </Node>
                    </Node>

                    <Shape x="-55" y="-50" rotation="-0.45" name="VisorHighlight">
                        <Ellipse width="60" height="14" name="P"/>
                        <Fill name="F"><SolidColor colorValue="40FFFFFF" name="C"/></Fill>
                    </Shape>

                    <Shape name="VisorGlass">
                        <Rectangle width="207" height="150" cornerRadiusTL="62" name="P"/>
                        <Fill name="F">
                            <RadialGradient startX="0" startY="-15" endX="115" endY="-15" name="G">
                                <GradientStop colorValue="FF3A4468" position="0"/>
                                <GradientStop colorValue="FF1F2744" position="1"/>
                            </RadialGradient>
                        </Fill>
                        <Stroke thickness="2" name="Rim"><SolidColor colorValue="FF1A2038" name="C"/></Stroke>
                    </Shape>
                </Node>
```

- [ ] **Step 4: Thay `<LinearAnimation duration="1" name="mood_neutral" id="0:410"/>` bằng**

```xml
        <LinearAnimation duration="1" name="mood_neutral" id="0:410">
            <KeyedObject objectId="0:17"><KeyedProperty propertyKey="296"><KeyFrameId value="0:31" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:18"><KeyedProperty propertyKey="296"><KeyFrameId value="0:41" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:19"><KeyedProperty propertyKey="296"><KeyFrameId value="0:51" frame="0"/></KeyedProperty></KeyedObject>
        </LinearAnimation>
```

- [ ] **Step 5: Verify, xem ảnh, chạy probe**

Run: `rive . --verify && rive . --screenshot --advance=1 && python tools/check.py tests/t1_scaffold.json tests/t2_head.json tests/t3_face.json`
Expected: visor navy với 2 mắt oval sáng, miệng cười nhỏ, má mờ; tất cả `PASS`.
Nếu mắt không có quầng sáng: kiểm tra `Feather` nằm **trong** `Stroke`, không nằm trong `Fill` (Feather trong Fill không vẽ gì).

- [ ] **Step 6: So với ảnh gốc**

Run: `python tools/overlay.py`. Visor, mắt, miệng và má phải trùng ảnh gốc, lệch ≤ ~4px.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(mascot): visor and neutral face with mood Solo slots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Thân — hoodie, logo, tay, quần, chân

**Files:**
- Modify: `runtime.rml`
- Test: `tests/t4_body.json`

**Interfaces:**
- Consumes: `Character` 0:10.
- Produces: trong Character, sau `Head`: `ArmL` 0:20 (vai (−80,−165), rotation 0.4), `ArmR` 0:21 (vai (80,−165), rotation −0.4), `Body` 0:23. Tay có pivot ở vai để làm động tác vẫy (phase 2).

- [ ] **Step 1: Viết probe fail trước — `tests/t4_body.json`**

```json
{
  "names": ["ArmL", "ArmR", "Body", "Torso", "ChestLogo", "Shorts", "LegL", "LegR"],
  "captures": [
    {"id": "t4-body", "regions": [
      {"what": "torso white", "box": [200, 335, 12, 12], "color": "F3F6FC", "tol": 40, "min": 0.8},
      {"what": "chest logo N", "box": [248, 350, 4, 4], "color": "547FE4", "tol": 45, "min": 0.8},
      {"what": "shorts", "box": [240, 405, 20, 8], "color": "3B3D52", "tol": 35, "min": 0.8},
      {"what": "left leg white", "box": [210, 436, 8, 8], "color": "F3F6FC", "tol": 45, "min": 0.8},
      {"what": "left shoe blue", "box": [208, 463, 14, 4], "color": "547FE4", "tol": 45, "min": 0.6},
      {"what": "left hand white", "box": [137, 366, 10, 10], "color": "F3F6FC", "tol": 45, "min": 0.8},
      {"what": "right hand white", "box": [353, 366, 10, 10], "color": "F3F6FC", "tol": 45, "min": 0.8}
    ]}
  ]
}
```

- [ ] **Step 2: Chạy để xác nhận FAIL**

Run: `python tools/check.py tests/t4_body.json`
Expected: `FAIL`, `missing element named 'ArmL'`.

- [ ] **Step 3: Thêm vào Character, ngay sau thẻ đóng `</Node>` của Head (trước `</Node>` của Character)**

```xml
            <!-- ARMS: pivot = shoulder, drawn in front of the body -->
            <Node x="-80" y="-165" rotation="0.4" name="ArmL" id="0:20">
                <Shape y="72" name="Hand">
                    <Ellipse width="40" height="38" name="P"/>
                    <Fill name="F">
                        <LinearGradient startX="0" startY="-19" endX="0" endY="19" name="G">
                            <GradientStop colorValue="FFFFFFFF" position="0"/>
                            <GradientStop colorValue="FFDCE4F7" position="1"/>
                        </LinearGradient>
                    </Fill>
                    <Stroke thickness="3" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                </Shape>
                <Shape y="58" name="Cuff">
                    <Rectangle width="36" height="7" name="P"/>
                    <Fill name="F"><SolidColor colorValue="FF89B8FD" name="C"/></Fill>
                </Shape>
                <Shape name="Sleeve">
                    <Rectangle width="36" height="64" originY="0" cornerRadiusTL="18" name="P"/>
                    <Fill name="F">
                        <LinearGradient startX="0" startY="0" endX="0" endY="64" name="G">
                            <GradientStop colorValue="FFFFFFFF" position="0"/>
                            <GradientStop colorValue="FFDCE4F7" position="1"/>
                        </LinearGradient>
                    </Fill>
                    <Stroke thickness="3" join="round" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                </Shape>
            </Node>

            <Node x="80" y="-165" rotation="-0.4" name="ArmR" id="0:21">
                <Shape y="72" name="Hand">
                    <Ellipse width="40" height="38" name="P"/>
                    <Fill name="F">
                        <LinearGradient startX="0" startY="-19" endX="0" endY="19" name="G">
                            <GradientStop colorValue="FFFFFFFF" position="0"/>
                            <GradientStop colorValue="FFDCE4F7" position="1"/>
                        </LinearGradient>
                    </Fill>
                    <Stroke thickness="3" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                </Shape>
                <Shape y="58" name="Cuff">
                    <Rectangle width="36" height="7" name="P"/>
                    <Fill name="F"><SolidColor colorValue="FF89B8FD" name="C"/></Fill>
                </Shape>
                <Shape name="Sleeve">
                    <Rectangle width="36" height="64" originY="0" cornerRadiusTL="18" name="P"/>
                    <Fill name="F">
                        <LinearGradient startX="0" startY="0" endX="0" endY="64" name="G">
                            <GradientStop colorValue="FFFFFFFF" position="0"/>
                            <GradientStop colorValue="FFDCE4F7" position="1"/>
                        </LinearGradient>
                    </Fill>
                    <Stroke thickness="3" join="round" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                </Shape>
            </Node>

            <!-- BODY -->
            <Node name="Body" id="0:23">
                <Shape y="-118" name="ChestLogo">
                    <PointsPath isClosed="true" name="P">
                        <StraightVertex x="-18" y="15"/>
                        <StraightVertex x="-18" y="-15"/>
                        <StraightVertex x="-8" y="-15"/>
                        <StraightVertex x="8" y="5"/>
                        <StraightVertex x="8" y="-15"/>
                        <StraightVertex x="18" y="-15"/>
                        <StraightVertex x="18" y="15"/>
                        <StraightVertex x="8" y="15"/>
                        <StraightVertex x="-8" y="-5"/>
                        <StraightVertex x="-8" y="15"/>
                    </PointsPath>
                    <Fill name="F"><SolidColor colorValue="FF547FE4" name="C"/></Fill>
                </Shape>

                <Shape name="Drawstrings">
                    <PointsPath name="L">
                        <StraightVertex x="-25" y="-162"/>
                        <StraightVertex x="-27" y="-138"/>
                    </PointsPath>
                    <PointsPath name="R">
                        <StraightVertex x="25" y="-162"/>
                        <StraightVertex x="27" y="-138"/>
                    </PointsPath>
                    <Stroke thickness="3" cap="round" name="S"><SolidColor colorValue="FF89B8FD" name="C"/></Stroke>
                </Shape>

                <Shape y="-172" name="NeckV">
                    <PointsPath isClosed="true" name="P">
                        <StraightVertex x="-20" y="-8" radius="3"/>
                        <StraightVertex x="20" y="-8" radius="3"/>
                        <StraightVertex x="0" y="12" radius="4"/>
                    </PointsPath>
                    <Fill name="F"><SolidColor colorValue="FF3B4470" name="C"/></Fill>
                </Shape>

                <Shape name="Straps">
                    <Rectangle x="-80" y="-137" width="12" height="75" cornerRadiusTL="6" name="L"/>
                    <Rectangle x="80" y="-137" width="12" height="75" cornerRadiusTL="6" name="R"/>
                    <Fill name="F"><SolidColor colorValue="FF3B4470" name="C"/></Fill>
                </Shape>

                <Shape y="-120" name="Torso">
                    <Rectangle width="170" height="110" linkCornerRadius="false"
                               cornerRadiusTL="50" cornerRadiusTR="50" cornerRadiusBL="30" cornerRadiusBR="30" name="P"/>
                    <Fill name="F">
                        <LinearGradient startX="0" startY="-55" endX="0" endY="55" name="G">
                            <GradientStop colorValue="FFFFFFFF" position="0"/>
                            <GradientStop colorValue="FFDCE4F7" position="1"/>
                        </LinearGradient>
                    </Fill>
                    <Stroke thickness="3" join="round" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                </Shape>

                <Shape y="-60" name="Shorts">
                    <Rectangle width="150" height="32" cornerRadiusTL="12" name="P"/>
                    <Fill name="F"><SolidColor colorValue="FF3B3D52" name="C"/></Fill>
                    <Stroke thickness="3" join="round" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                </Shape>

                <Node x="-35" name="LegL">
                    <Shape y="-5" name="Shoe">
                        <Rectangle width="32" height="10" cornerRadiusTL="5" name="P"/>
                        <Fill name="F"><SolidColor colorValue="FF547FE4" name="C"/></Fill>
                    </Shape>
                    <Shape y="-24" name="Leg">
                        <Rectangle width="30" height="40" cornerRadiusTL="8" name="P"/>
                        <Fill name="F">
                            <LinearGradient startX="0" startY="-20" endX="0" endY="20" name="G">
                                <GradientStop colorValue="FFFFFFFF" position="0"/>
                                <GradientStop colorValue="FFDCE4F7" position="1"/>
                            </LinearGradient>
                        </Fill>
                        <Stroke thickness="3" join="round" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                    </Shape>
                </Node>

                <Node x="35" name="LegR">
                    <Shape y="-5" name="Shoe">
                        <Rectangle width="32" height="10" cornerRadiusTL="5" name="P"/>
                        <Fill name="F"><SolidColor colorValue="FF547FE4" name="C"/></Fill>
                    </Shape>
                    <Shape y="-24" name="Leg">
                        <Rectangle width="30" height="40" cornerRadiusTL="8" name="P"/>
                        <Fill name="F">
                            <LinearGradient startX="0" startY="-20" endX="0" endY="20" name="G">
                                <GradientStop colorValue="FFFFFFFF" position="0"/>
                                <GradientStop colorValue="FFDCE4F7" position="1"/>
                            </LinearGradient>
                        </Fill>
                        <Stroke thickness="3" join="round" name="Outline"><SolidColor colorValue="FF2B3257" name="C"/></Stroke>
                    </Shape>
                </Node>
            </Node>
```

- [ ] **Step 4: Verify, xem ảnh, chạy tất cả probe**

Run: `rive . --verify && rive . --screenshot --advance=1 && python tools/check.py tests/t*.json`
Expected: nhân vật đứng đủ thân; tất cả `PASS`.
Nếu `Rectangle` không nhận `x`/`y` (Straps): chạy `rive schema Rectangle`. Nếu thiếu, tách mỗi quai thành một `Shape` riêng có `x`/`y`.

- [ ] **Step 5: So với ảnh gốc**

Run: `python tools/overlay.py`. Vai, tay, thân, quần, chân khớp bóng ảnh gốc. Ghi lại các chỗ lệch để xử lý ở Task 8.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(mascot): hoodie body, arms, shorts, legs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Idle — thở, chớp mắt, giật tai

**Files:**
- Modify: `runtime.rml`
- Test: `tests/t5_idle.json`

**Interfaces:**
- Consumes: `Character` 0:10, `Head` 0:11, `EyeBlink` 0:16, `EarL` 0:12, `EarR` 0:13.
- Produces: animation `idle_breathe` 0:400 (150f loop), `blink` 0:401 (240f loop, mắt nhắm ở frame 206), `ear_twitch` 0:402 (300f loop); layer `Idle` 0:501, `Blink` 0:502, `Ears` 0:503, khai báo **trước** layer `Mood`.

- [ ] **Step 1: Viết probe fail trước — `tests/t5_idle.json`**

```json
{
  "names": ["idle_breathe", "blink", "ear_twitch", "Idle", "Blink", "Ears"],
  "min_types": {"StateMachineLayer": 4, "CubicEaseInterpolator": 2},
  "captures": [
    {"id": "t5-rest", "advance": 1, "regions": [
      {"what": "above head top at rest = background", "box": [245, 46, 10, 2], "color": "1D1D1D", "tol": 20, "min": 0.8}
    ]},
    {"id": "t5-inhale", "advance": 75, "regions": [
      {"what": "head rose on inhale", "box": [245, 46, 10, 2], "color": "F3F6FC", "tol": 40, "min": 0.6}
    ]},
    {"id": "t5-seam", "advance": 151, "regions": [
      {"what": "loop returns to rest at 150f", "box": [245, 46, 10, 2], "color": "1D1D1D", "tol": 20, "min": 0.8}
    ]},
    {"id": "t5-eyes-open", "advance": 60, "regions": [
      {"what": "upper eye lit", "box": [194, 180, 10, 6], "color": "6EA6FB", "tol": 40, "min": 0.8}
    ]},
    {"id": "t5-eyes-shut", "advance": 206, "regions": [
      {"what": "upper eye dark mid-blink", "box": [194, 180, 10, 6], "color": "6EA6FB", "tol": 40, "max": 0.1}
    ]}
  ]
}
```

- [ ] **Step 2: Chạy để xác nhận FAIL**

Run: `python tools/check.py tests/t5_idle.json`
Expected: `FAIL`, gồm `missing element named 'idle_breathe'`, và `t5-inhale`, `t5-eyes-shut` fail.

- [ ] **Step 3: Thêm 3 animation ngay trước `<LinearAnimation duration="1" name="mood_neutral"`**

```xml
        <LinearAnimation loopValue="loop" duration="150" name="idle_breathe" id="0:400">
            <KeyedObject objectId="0:10">
                <KeyedProperty propertyKey="17">
                    <KeyFrameDouble value="1" frame="0" interpolationType="cubic">
                        <CubicEaseInterpolator x1="0.42" y1="0" x2="0.58" y2="1"/>
                    </KeyFrameDouble>
                    <KeyFrameDouble value="1.01" frame="75" interpolationType="cubic">
                        <CubicEaseInterpolator x1="0.42" y1="0" x2="0.58" y2="1"/>
                    </KeyFrameDouble>
                    <KeyFrameDouble value="1" frame="150"/>
                </KeyedProperty>
            </KeyedObject>
            <KeyedObject objectId="0:11">
                <KeyedProperty propertyKey="14">
                    <KeyFrameDouble value="-178" frame="0" interpolationType="cubic">
                        <CubicEaseInterpolator x1="0.42" y1="0" x2="0.58" y2="1"/>
                    </KeyFrameDouble>
                    <KeyFrameDouble value="-180" frame="75" interpolationType="cubic">
                        <CubicEaseInterpolator x1="0.42" y1="0" x2="0.58" y2="1"/>
                    </KeyFrameDouble>
                    <KeyFrameDouble value="-178" frame="150"/>
                </KeyedProperty>
            </KeyedObject>
        </LinearAnimation>

        <LinearAnimation loopValue="loop" duration="240" name="blink" id="0:401">
            <KeyedObject objectId="0:16">
                <KeyedProperty propertyKey="17">
                    <KeyFrameDouble value="1" frame="0"/>
                    <KeyFrameDouble value="1" frame="200" interpolationType="linear"/>
                    <KeyFrameDouble value="0.1" frame="206" interpolationType="linear"/>
                    <KeyFrameDouble value="1" frame="212"/>
                    <KeyFrameDouble value="1" frame="240"/>
                </KeyedProperty>
            </KeyedObject>
        </LinearAnimation>

        <LinearAnimation loopValue="loop" duration="300" name="ear_twitch" id="0:402">
            <KeyedObject objectId="0:12">
                <KeyedProperty propertyKey="15">
                    <KeyFrameDouble value="0" frame="0"/>
                    <KeyFrameDouble value="0" frame="240" interpolationType="linear"/>
                    <KeyFrameDouble value="-0.22" frame="246" interpolationType="linear"/>
                    <KeyFrameDouble value="0.08" frame="252" interpolationType="linear"/>
                    <KeyFrameDouble value="0" frame="258"/>
                    <KeyFrameDouble value="0" frame="300"/>
                </KeyedProperty>
            </KeyedObject>
            <KeyedObject objectId="0:13">
                <KeyedProperty propertyKey="15">
                    <KeyFrameDouble value="0" frame="0"/>
                    <KeyFrameDouble value="0" frame="262" interpolationType="linear"/>
                    <KeyFrameDouble value="-0.22" frame="268" interpolationType="linear"/>
                    <KeyFrameDouble value="0.08" frame="274" interpolationType="linear"/>
                    <KeyFrameDouble value="0" frame="280"/>
                    <KeyFrameDouble value="0" frame="300"/>
                </KeyedProperty>
            </KeyedObject>
        </LinearAnimation>
```

- [ ] **Step 4: Thêm 3 layer vào `Main`, ngay sau `<StateMachine name="Main" id="0:500">` (trước layer `Mood`)**

```xml
            <StateMachineLayer name="Idle" id="0:501">
                <AnyState x="0" y="-150"/>
                <ExitState x="400" y="-150"/>
                <EntryState x="-250" y="0">
                    <StateTransition stateToId="0:511"/>
                </EntryState>
                <AnimationState x="0" y="0" animationId="0:400" id="0:511"/>
            </StateMachineLayer>

            <StateMachineLayer name="Blink" id="0:502">
                <AnyState x="0" y="-150"/>
                <ExitState x="400" y="-150"/>
                <EntryState x="-250" y="0">
                    <StateTransition stateToId="0:512"/>
                </EntryState>
                <AnimationState x="0" y="0" animationId="0:401" id="0:512"/>
            </StateMachineLayer>

            <StateMachineLayer name="Ears" id="0:503">
                <AnyState x="0" y="-150"/>
                <ExitState x="400" y="-150"/>
                <EntryState x="-250" y="0">
                    <StateTransition stateToId="0:513"/>
                </EntryState>
                <AnimationState x="0" y="0" animationId="0:402" id="0:513"/>
            </StateMachineLayer>
```

- [ ] **Step 5: Verify + chạy tất cả probe**

Run: `rive . --verify && python tools/check.py tests/t*.json`
Expected: tất cả `PASS`.
Nếu `t5-eyes-shut` fail do lệch 1–2 frame: chụp thêm `--advance=204`, `205`, `207` để tìm frame mắt nhắm nhất, rồi dời `advance` của probe (không đổi animation).
Nếu `t2`/`t3`/`t4` fail vì breathing đẩy hình: các probe đó chụp ở advance 5, lúc head gần như chưa lệch; tăng `tol` thay vì dời art.

- [ ] **Step 6: Xem chuyển động thật**

Run (nền, chạy một lần rồi để đó): `rive .`
Quan sát: thở nhẹ ~2.5s/chu kỳ, chớp mắt mỗi 4s, tai trái rồi tai phải giật mỗi 5s. Nếu thấy quá mạnh/yếu, ghi lại cho Task 8.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(mascot): idle breathing, blink and ear twitch layers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Mood (A) — cơ chế chuyển + happy, wink, focus

**Files:**
- Modify: `runtime.rml`
- Test: `tests/t6_moods_a.json`

**Interfaces:**
- Consumes: Solo `EyesSet` 0:17 / `MouthSet` 0:18 / `FxSet` 0:19 (Task 3); layer `Mood` 0:504, state 0:520 (Task 1); enum values 0:601–0:604 (Task 1); VM path `0:610-0:611`.
- Produces: con Solo `EyesHappy` 0:32, `EyesWink` 0:33, `EyesFocus` 0:34, `MouthOpen` 0:42, `FxShine` 0:52, `FxSparkleLow` 0:53, `FxGlasses` 0:54; animation `mood_happy` 0:411, `mood_wink` 0:412, `mood_focus` 0:413; state 0:521–0:523; transition từ AnyState cho neutral/happy/wink/focus.

- [ ] **Step 1: Viết probe fail trước — `tests/t6_moods_a.json`**

```json
{
  "names": ["EyesHappy", "EyesWink", "EyesFocus", "MouthOpen", "FxShine", "FxSparkleLow", "FxGlasses", "mood_happy", "mood_wink", "mood_focus"],
  "min_types": {"TransitionViewModelCondition": 4, "TransitionValueEnumComparator": 4},
  "captures": [
    {"id": "t6-neutral", "regions": [
      {"what": "neutral: lower left eye lit", "box": [194, 203, 10, 8], "color": "6EA6FB", "tol": 40, "min": 0.8},
      {"what": "neutral: right eye centre-right lit", "box": [310, 194, 5, 6], "color": "6EA6FB", "tol": 40, "min": 0.8},
      {"what": "neutral: no open mouth", "box": [249, 222, 4, 3], "color": "6EA6FB", "tol": 40, "max": 0.2},
      {"what": "neutral: no glasses", "box": [172, 195, 3, 4], "color": "89B8FD", "tol": 30, "max": 0.1}
    ]},
    {"id": "t6-happy", "data": ["mood=happy"], "regions": [
      {"what": "happy: lower left eye dark (arc eyes)", "box": [194, 203, 10, 8], "color": "6EA6FB", "tol": 40, "max": 0.1},
      {"what": "happy: arc top lit", "box": [195, 187, 8, 4], "color": "6EA6FB", "tol": 45, "min": 0.5},
      {"what": "happy: open mouth", "box": [249, 222, 4, 3], "color": "6EA6FB", "tol": 40, "min": 0.7}
    ]},
    {"id": "t6-wink", "data": ["mood=wink"], "regions": [
      {"what": "wink: left eye stays open", "box": [194, 203, 10, 8], "color": "6EA6FB", "tol": 40, "min": 0.8},
      {"what": "wink: right eye is a chevron", "box": [310, 194, 5, 6], "color": "6EA6FB", "tol": 40, "max": 0.1},
      {"what": "wink: sparkle low-left", "box": [99, 301, 4, 4], "color": "89B8FD", "tol": 40, "min": 0.7}
    ]},
    {"id": "t6-focus", "data": ["mood=focus"], "regions": [
      {"what": "focus: glasses rim", "box": [172, 195, 3, 4], "color": "89B8FD", "tol": 30, "min": 0.4},
      {"what": "focus: lower eye dark (arc eyes)", "box": [194, 203, 10, 8], "color": "6EA6FB", "tol": 40, "max": 0.1}
    ]},
    {"id": "t6-persist", "data": ["mood=wink"], "advance": 300, "regions": [
      {"what": "wink still active after 5s", "box": [99, 301, 4, 4], "color": "89B8FD", "tol": 40, "min": 0.5}
    ]}
  ]
}
```

- [ ] **Step 2: Chạy để xác nhận FAIL**

Run: `python tools/check.py tests/t6_moods_a.json`
Expected: `FAIL`: thiếu tên các node mới; `t6-happy`, `t6-wink`, `t6-focus` fail vì mặt vẫn neutral.

- [ ] **Step 3: Thêm con cho `FxSet` — sau `<Node name="FxNone" id="0:51"/>`**

```xml
                            <Node name="FxShine" id="0:52">
                                <Shape x="150" y="-120" name="ShineLines">
                                    <PointsPath name="A"><StraightVertex x="0" y="-4"/><StraightVertex x="8" y="-18"/></PointsPath>
                                    <PointsPath name="B"><StraightVertex x="10" y="4"/><StraightVertex x="26" y="-2"/></PointsPath>
                                    <PointsPath name="C"><StraightVertex x="-8" y="-8"/><StraightVertex x="-10" y="-24"/></PointsPath>
                                    <Stroke thickness="4" cap="round" name="S"><SolidColor colorValue="FF89B8FD" name="C"/></Stroke>
                                </Shape>
                            </Node>
                            <Node name="FxSparkleLow" id="0:53">
                                <Shape x="-150" y="110" name="Sparkle">
                                    <Star width="30" height="30" points="4" innerRadius="0.35" name="P"/>
                                    <Fill name="F"><SolidColor colorValue="FF89B8FD" name="C"/></Fill>
                                </Shape>
                            </Node>
                            <Node name="FxGlasses" id="0:54">
                                <Shape name="Glasses">
                                    <Ellipse x="-52" y="4" width="50" height="50" name="L"/>
                                    <Ellipse x="52" y="4" width="50" height="50" name="R"/>
                                    <PointsPath name="Bridge"><StraightVertex x="-27" y="4"/><StraightVertex x="27" y="4"/></PointsPath>
                                    <Stroke thickness="3" cap="round" name="S"><SolidColor colorValue="FF89B8FD" name="C"/></Stroke>
                                </Shape>
                                <Shape x="170" y="-60" name="Sparkle">
                                    <Star width="26" height="26" points="4" innerRadius="0.35" name="P"/>
                                    <Fill name="F"><SolidColor colorValue="FF89B8FD" name="C"/></Fill>
                                </Shape>
                            </Node>
```

- [ ] **Step 4: Thêm con cho `EyesSet` — sau thẻ đóng `</Node>` của `EyesNeutral`**

```xml
                                <Node name="EyesHappy" id="0:32">
                                    <Shape x="-52" name="EyeL">
                                        <PointsPath name="P">
                                            <StraightVertex x="-14" y="6"/>
                                            <CubicMirroredVertex x="0" y="-8" rotation="0" distance="8"/>
                                            <StraightVertex x="14" y="6"/>
                                        </PointsPath>
                                        <Stroke thickness="5" cap="round" join="round" name="S"><SolidColor colorValue="FF6EA6FB" name="C"/></Stroke>
                                    </Shape>
                                    <Shape x="52" name="EyeR">
                                        <PointsPath name="P">
                                            <StraightVertex x="-14" y="6"/>
                                            <CubicMirroredVertex x="0" y="-8" rotation="0" distance="8"/>
                                            <StraightVertex x="14" y="6"/>
                                        </PointsPath>
                                        <Stroke thickness="5" cap="round" join="round" name="S"><SolidColor colorValue="FF6EA6FB" name="C"/></Stroke>
                                    </Shape>
                                </Node>
                                <Node name="EyesWink" id="0:33">
                                    <Shape x="-52" name="EyeL">
                                        <Ellipse width="30" height="43" name="P"/>
                                        <Stroke thickness="6" name="Halo">
                                            <SolidColor colorValue="806EA6FB" name="C"/>
                                            <Feather strength="6" name="Fe"/>
                                        </Stroke>
                                        <Fill name="F"><SolidColor colorValue="FF6EA6FB" name="C"/></Fill>
                                    </Shape>
                                    <Shape x="52" name="EyeR">
                                        <PointsPath name="P">
                                            <StraightVertex x="10" y="-12"/>
                                            <StraightVertex x="-8" y="0"/>
                                            <StraightVertex x="10" y="12"/>
                                        </PointsPath>
                                        <Stroke thickness="5" cap="round" join="round" name="S"><SolidColor colorValue="FF6EA6FB" name="C"/></Stroke>
                                    </Shape>
                                </Node>
                                <Node name="EyesFocus" id="0:34">
                                    <Shape x="-52" name="EyeL">
                                        <PointsPath name="P">
                                            <StraightVertex x="-11" y="5"/>
                                            <CubicMirroredVertex x="0" y="-6" rotation="0" distance="6"/>
                                            <StraightVertex x="11" y="5"/>
                                        </PointsPath>
                                        <Stroke thickness="4.5" cap="round" join="round" name="S"><SolidColor colorValue="FF6EA6FB" name="C"/></Stroke>
                                    </Shape>
                                    <Shape x="52" name="EyeR">
                                        <PointsPath name="P">
                                            <StraightVertex x="-11" y="5"/>
                                            <CubicMirroredVertex x="0" y="-6" rotation="0" distance="6"/>
                                            <StraightVertex x="11" y="5"/>
                                        </PointsPath>
                                        <Stroke thickness="4.5" cap="round" join="round" name="S"><SolidColor colorValue="FF6EA6FB" name="C"/></Stroke>
                                    </Shape>
                                </Node>
```

- [ ] **Step 5: Thêm con cho `MouthSet` — sau thẻ đóng `</Shape>` của `MouthSmile`**

```xml
                            <Shape name="MouthOpen" id="0:42">
                                <PointsPath isClosed="true" name="P">
                                    <StraightVertex x="-11" y="-2" radius="2"/>
                                    <StraightVertex x="11" y="-2" radius="2"/>
                                    <CubicMirroredVertex x="0" y="10" rotation="3.1415927" distance="8"/>
                                </PointsPath>
                                <Fill name="F"><SolidColor colorValue="FF6EA6FB" name="C"/></Fill>
                            </Shape>
```

- [ ] **Step 6: Thêm 3 animation mood sau `mood_neutral`**

```xml
        <LinearAnimation duration="1" name="mood_happy" id="0:411">
            <KeyedObject objectId="0:17"><KeyedProperty propertyKey="296"><KeyFrameId value="0:32" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:18"><KeyedProperty propertyKey="296"><KeyFrameId value="0:42" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:19"><KeyedProperty propertyKey="296"><KeyFrameId value="0:52" frame="0"/></KeyedProperty></KeyedObject>
        </LinearAnimation>
        <LinearAnimation duration="1" name="mood_wink" id="0:412">
            <KeyedObject objectId="0:17"><KeyedProperty propertyKey="296"><KeyFrameId value="0:33" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:18"><KeyedProperty propertyKey="296"><KeyFrameId value="0:41" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:19"><KeyedProperty propertyKey="296"><KeyFrameId value="0:53" frame="0"/></KeyedProperty></KeyedObject>
        </LinearAnimation>
        <LinearAnimation duration="1" name="mood_focus" id="0:413">
            <KeyedObject objectId="0:17"><KeyedProperty propertyKey="296"><KeyFrameId value="0:34" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:18"><KeyedProperty propertyKey="296"><KeyFrameId value="0:41" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:19"><KeyedProperty propertyKey="296"><KeyFrameId value="0:54" frame="0"/></KeyedProperty></KeyedObject>
        </LinearAnimation>
```

- [ ] **Step 7: Thay toàn bộ layer `Mood` (0:504) bằng**

```xml
            <StateMachineLayer name="Mood" id="0:504">
                <AnyState x="0" y="-250">
                    <StateTransition stateToId="0:520" duration="0">
                        <TransitionViewModelCondition opValue="equal">
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyEnum><DataBindContext sourcePathIds="0:610-0:611" propertyKey="637"/></BindablePropertyEnum>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueEnumComparator value="0:601"/>
                        </TransitionViewModelCondition>
                    </StateTransition>
                    <StateTransition stateToId="0:521" duration="0">
                        <TransitionViewModelCondition opValue="equal">
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyEnum><DataBindContext sourcePathIds="0:610-0:611" propertyKey="637"/></BindablePropertyEnum>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueEnumComparator value="0:602"/>
                        </TransitionViewModelCondition>
                    </StateTransition>
                    <StateTransition stateToId="0:522" duration="0">
                        <TransitionViewModelCondition opValue="equal">
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyEnum><DataBindContext sourcePathIds="0:610-0:611" propertyKey="637"/></BindablePropertyEnum>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueEnumComparator value="0:603"/>
                        </TransitionViewModelCondition>
                    </StateTransition>
                    <StateTransition stateToId="0:523" duration="0">
                        <TransitionViewModelCondition opValue="equal">
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyEnum><DataBindContext sourcePathIds="0:610-0:611" propertyKey="637"/></BindablePropertyEnum>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueEnumComparator value="0:604"/>
                        </TransitionViewModelCondition>
                    </StateTransition>
                </AnyState>
                <ExitState x="600" y="-250"/>
                <EntryState x="-250" y="0">
                    <StateTransition stateToId="0:520"/>
                </EntryState>
                <AnimationState x="0" y="0" animationId="0:410" id="0:520"/>
                <AnimationState x="200" y="0" animationId="0:411" id="0:521"/>
                <AnimationState x="400" y="0" animationId="0:412" id="0:522"/>
                <AnimationState x="600" y="0" animationId="0:413" id="0:523"/>
            </StateMachineLayer>
```

- [ ] **Step 8: Verify + chạy tất cả probe**

Run: `rive . --verify && python tools/check.py tests/t*.json`
Expected: tất cả `PASS`.
Nếu `t6-*` fail trong khi output có `data: mood = happy`: chạy `rive inspect . --json` và kiểm tra `TransitionValueEnumComparator.value` trỏ đúng id `DataEnumValue`.
Nếu `Ellipse` không nhận `x`/`y` (Glasses): tách mỗi vòng kính thành Shape riêng có `x`/`y`.

- [ ] **Step 9: Xem bằng mắt**

Run: `python tools/overlay.py --data=mood=happy`, rồi lần lượt `--data=mood=wink` và `--data=mood=focus`. So `build/side.png` với dải "Biểu cảm" trong ảnh gốc.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat(mascot): mood switching via Mascot.mood + happy/wink/focus

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Mood (B) — surprised, sleepy, confused

**Files:**
- Modify: `runtime.rml`
- Test: `tests/t7_moods_b.json`

**Interfaces:**
- Consumes: như Task 6; enum values 0:605–0:607.
- Produces: `EyesSurprised` 0:35, `EyesSleepy` 0:36, `EyesConfused` 0:37, `MouthO` 0:43, `MouthSmall` 0:44, `MouthSlant` 0:45, `FxExclaim` 0:55, `FxZzz` 0:56, `FxQuestion` 0:57; animation 0:414–0:416; state 0:524–0:526.

- [ ] **Step 1: Viết probe fail trước — `tests/t7_moods_b.json`**

```json
{
  "names": ["EyesSurprised", "EyesSleepy", "EyesConfused", "MouthO", "MouthSmall", "MouthSlant", "FxExclaim", "FxZzz", "FxQuestion", "mood_surprised", "mood_sleepy", "mood_confused"],
  "min_types": {"TransitionViewModelCondition": 7},
  "captures": [
    {"id": "t7-neutral", "regions": [
      {"what": "neutral: no o-mouth", "box": [249, 218, 4, 4], "color": "6EA6FB", "tol": 40, "max": 0.2},
      {"what": "neutral: upper eye lit", "box": [194, 183, 10, 8], "color": "6EA6FB", "tol": 40, "min": 0.8},
      {"what": "neutral: bottom of right eye lit", "box": [298, 213, 10, 4], "color": "6EA6FB", "tol": 40, "min": 0.7}
    ]},
    {"id": "t7-surprised", "data": ["mood=surprised"], "regions": [
      {"what": "surprised: o mouth", "box": [249, 218, 4, 4], "color": "6EA6FB", "tol": 40, "min": 0.8},
      {"what": "surprised: exclamation", "box": [399, 36, 4, 12], "color": "547FE4", "tol": 45, "min": 0.8}
    ]},
    {"id": "t7-sleepy", "data": ["mood=sleepy"], "regions": [
      {"what": "sleepy: upper eye dark (closed)", "box": [194, 183, 10, 8], "color": "6EA6FB", "tol": 40, "max": 0.05},
      {"what": "sleepy: big Z top bar", "box": [391, 16, 14, 3], "color": "547FE4", "tol": 45, "min": 0.4}
    ]},
    {"id": "t7-sleepy-blink", "data": ["mood=sleepy"], "advance": 206, "regions": [
      {"what": "sleepy mid-blink keeps Zz", "box": [391, 12, 14, 8], "color": "547FE4", "tol": 45, "min": 0.15},
      {"what": "sleepy mid-blink: eyes never pop open", "box": [194, 178, 10, 8], "color": "6EA6FB", "tol": 40, "max": 0.05}
    ]},
    {"id": "t7-confused", "data": ["mood=confused"], "regions": [
      {"what": "confused: smaller right eye", "box": [298, 213, 10, 4], "color": "6EA6FB", "tol": 40, "max": 0.1},
      {"what": "confused: question dot", "box": [399, 66, 4, 4], "color": "547FE4", "tol": 45, "min": 0.7}
    ]}
  ]
}
```

- [ ] **Step 2: Chạy để xác nhận FAIL**

Run: `python tools/check.py tests/t7_moods_b.json`
Expected: `FAIL`: thiếu node; `TransitionViewModelCondition: 4 < 7`.

- [ ] **Step 3: Thêm con cho `FxSet` — sau thẻ đóng `</Node>` của `FxGlasses`**

```xml
                            <Node name="FxExclaim" id="0:55">
                                <Shape x="150" y="-150" name="Bar">
                                    <Rectangle width="8" height="30" cornerRadiusTL="4" name="P"/>
                                    <Fill name="F"><SolidColor colorValue="FF547FE4" name="C"/></Fill>
                                </Shape>
                                <Shape x="150" y="-126" name="Dot">
                                    <Ellipse width="9" height="9" name="P"/>
                                    <Fill name="F"><SolidColor colorValue="FF547FE4" name="C"/></Fill>
                                </Shape>
                            </Node>
                            <Node name="FxZzz" id="0:56">
                                <Shape name="Zs">
                                    <PointsPath name="Small">
                                        <StraightVertex x="115" y="-147"/>
                                        <StraightVertex x="129" y="-147"/>
                                        <StraightVertex x="115" y="-133"/>
                                        <StraightVertex x="129" y="-133"/>
                                    </PointsPath>
                                    <PointsPath name="Big">
                                        <StraightVertex x="137" y="-176"/>
                                        <StraightVertex x="159" y="-176"/>
                                        <StraightVertex x="137" y="-154"/>
                                        <StraightVertex x="159" y="-154"/>
                                    </PointsPath>
                                    <Stroke thickness="4" cap="round" join="round" name="S"><SolidColor colorValue="FF547FE4" name="C"/></Stroke>
                                </Shape>
                            </Node>
                            <Node x="150" y="-140" name="FxQuestion" id="0:57">
                                <Shape name="Hook">
                                    <PointsPath name="P">
                                        <StraightVertex x="-9" y="-9"/>
                                        <CubicMirroredVertex x="0" y="-18" rotation="0" distance="7"/>
                                        <CubicMirroredVertex x="9" y="-9" rotation="1.5707964" distance="5"/>
                                        <StraightVertex x="0" y="0"/>
                                        <StraightVertex x="0" y="6"/>
                                    </PointsPath>
                                    <Stroke thickness="5" cap="round" join="round" name="S"><SolidColor colorValue="FF547FE4" name="C"/></Stroke>
                                </Shape>
                                <Shape y="15" name="Dot">
                                    <Ellipse width="7" height="7" name="P"/>
                                    <Fill name="F"><SolidColor colorValue="FF547FE4" name="C"/></Fill>
                                </Shape>
                            </Node>
```

- [ ] **Step 4: Thêm con cho `EyesSet` — sau thẻ đóng `</Node>` của `EyesFocus`**

```xml
                                <Node name="EyesSurprised" id="0:35">
                                    <Shape x="-52" name="EyeL">
                                        <Ellipse width="34" height="48" name="P"/>
                                        <Stroke thickness="6" name="Halo">
                                            <SolidColor colorValue="806EA6FB" name="C"/>
                                            <Feather strength="6" name="Fe"/>
                                        </Stroke>
                                        <Fill name="F"><SolidColor colorValue="FF6EA6FB" name="C"/></Fill>
                                    </Shape>
                                    <Shape x="52" name="EyeR">
                                        <Ellipse width="34" height="48" name="P"/>
                                        <Stroke thickness="6" name="Halo">
                                            <SolidColor colorValue="806EA6FB" name="C"/>
                                            <Feather strength="6" name="Fe"/>
                                        </Stroke>
                                        <Fill name="F"><SolidColor colorValue="FF6EA6FB" name="C"/></Fill>
                                    </Shape>
                                </Node>
                                <Node name="EyesSleepy" id="0:36">
                                    <Shape x="-52" name="EyeL">
                                        <PointsPath name="P">
                                            <StraightVertex x="-14" y="-2"/>
                                            <CubicMirroredVertex x="0" y="6" rotation="0" distance="8"/>
                                            <StraightVertex x="14" y="-2"/>
                                        </PointsPath>
                                        <Stroke thickness="4.5" cap="round" join="round" name="S"><SolidColor colorValue="FF6EA6FB" name="C"/></Stroke>
                                    </Shape>
                                    <Shape x="52" name="EyeR">
                                        <PointsPath name="P">
                                            <StraightVertex x="-14" y="-2"/>
                                            <CubicMirroredVertex x="0" y="6" rotation="0" distance="8"/>
                                            <StraightVertex x="14" y="-2"/>
                                        </PointsPath>
                                        <Stroke thickness="4.5" cap="round" join="round" name="S"><SolidColor colorValue="FF6EA6FB" name="C"/></Stroke>
                                    </Shape>
                                </Node>
                                <Node name="EyesConfused" id="0:37">
                                    <Shape x="-52" name="EyeL">
                                        <Ellipse width="30" height="43" name="P"/>
                                        <Stroke thickness="6" name="Halo">
                                            <SolidColor colorValue="806EA6FB" name="C"/>
                                            <Feather strength="6" name="Fe"/>
                                        </Stroke>
                                        <Fill name="F"><SolidColor colorValue="FF6EA6FB" name="C"/></Fill>
                                    </Shape>
                                    <Shape x="52" y="-2" name="EyeR">
                                        <Ellipse width="24" height="34" name="P"/>
                                        <Stroke thickness="6" name="Halo">
                                            <SolidColor colorValue="806EA6FB" name="C"/>
                                            <Feather strength="6" name="Fe"/>
                                        </Stroke>
                                        <Fill name="F"><SolidColor colorValue="FF6EA6FB" name="C"/></Fill>
                                    </Shape>
                                </Node>
```

- [ ] **Step 5: Thêm con cho `MouthSet` — sau thẻ đóng `</Shape>` của `MouthOpen`**

```xml
                            <Shape name="MouthO" id="0:43">
                                <Ellipse width="12" height="14" name="P"/>
                                <Fill name="F"><SolidColor colorValue="FF6EA6FB" name="C"/></Fill>
                            </Shape>
                            <Shape name="MouthSmall" id="0:44">
                                <PointsPath name="P">
                                    <StraightVertex x="-6" y="0"/>
                                    <CubicMirroredVertex x="0" y="4" rotation="0" distance="4"/>
                                    <StraightVertex x="6" y="0"/>
                                </PointsPath>
                                <Stroke thickness="3" cap="round" name="S"><SolidColor colorValue="FF6EA6FB" name="C"/></Stroke>
                            </Shape>
                            <Shape name="MouthSlant" id="0:45">
                                <PointsPath name="P">
                                    <StraightVertex x="-8" y="2"/>
                                    <StraightVertex x="8" y="-3"/>
                                </PointsPath>
                                <Stroke thickness="3.5" cap="round" name="S"><SolidColor colorValue="FF6EA6FB" name="C"/></Stroke>
                            </Shape>
```

- [ ] **Step 6: Thêm 3 animation sau `mood_focus`**

```xml
        <LinearAnimation duration="1" name="mood_surprised" id="0:414">
            <KeyedObject objectId="0:17"><KeyedProperty propertyKey="296"><KeyFrameId value="0:35" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:18"><KeyedProperty propertyKey="296"><KeyFrameId value="0:43" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:19"><KeyedProperty propertyKey="296"><KeyFrameId value="0:55" frame="0"/></KeyedProperty></KeyedObject>
        </LinearAnimation>
        <LinearAnimation duration="1" name="mood_sleepy" id="0:415">
            <KeyedObject objectId="0:17"><KeyedProperty propertyKey="296"><KeyFrameId value="0:36" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:18"><KeyedProperty propertyKey="296"><KeyFrameId value="0:44" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:19"><KeyedProperty propertyKey="296"><KeyFrameId value="0:56" frame="0"/></KeyedProperty></KeyedObject>
        </LinearAnimation>
        <LinearAnimation duration="1" name="mood_confused" id="0:416">
            <KeyedObject objectId="0:17"><KeyedProperty propertyKey="296"><KeyFrameId value="0:37" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:18"><KeyedProperty propertyKey="296"><KeyFrameId value="0:45" frame="0"/></KeyedProperty></KeyedObject>
            <KeyedObject objectId="0:19"><KeyedProperty propertyKey="296"><KeyFrameId value="0:57" frame="0"/></KeyedProperty></KeyedObject>
        </LinearAnimation>
```

- [ ] **Step 7: Thêm 3 transition vào `<AnyState>` của layer `Mood` (sau transition tới 0:523) và 3 state**

Transition (chèn trước `</AnyState>`):

```xml
                    <StateTransition stateToId="0:524" duration="0">
                        <TransitionViewModelCondition opValue="equal">
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyEnum><DataBindContext sourcePathIds="0:610-0:611" propertyKey="637"/></BindablePropertyEnum>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueEnumComparator value="0:605"/>
                        </TransitionViewModelCondition>
                    </StateTransition>
                    <StateTransition stateToId="0:525" duration="0">
                        <TransitionViewModelCondition opValue="equal">
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyEnum><DataBindContext sourcePathIds="0:610-0:611" propertyKey="637"/></BindablePropertyEnum>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueEnumComparator value="0:606"/>
                        </TransitionViewModelCondition>
                    </StateTransition>
                    <StateTransition stateToId="0:526" duration="0">
                        <TransitionViewModelCondition opValue="equal">
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyEnum><DataBindContext sourcePathIds="0:610-0:611" propertyKey="637"/></BindablePropertyEnum>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueEnumComparator value="0:607"/>
                        </TransitionViewModelCondition>
                    </StateTransition>
```

State (chèn sau `<AnimationState ... id="0:523"/>`):

```xml
                <AnimationState x="0" y="200" animationId="0:414" id="0:524"/>
                <AnimationState x="200" y="200" animationId="0:415" id="0:525"/>
                <AnimationState x="400" y="200" animationId="0:416" id="0:526"/>
```

- [ ] **Step 8: Verify + chạy tất cả probe**

Run: `rive . --verify && python tools/check.py tests/t*.json`
Expected: tất cả `PASS`.
Nếu `t7-sleepy-blink` fail: blink đang scale mắt nhắm (đường cong mảnh) nên vẫn không có vùng sáng ở box trên, đây là hành vi chấp nhận được. Nếu region "keeps Zz" fail, nguyên nhân là breathing làm FX lệch; dời box theo ảnh `build/probe-t7-sleepy-blink.png`.
Nếu dấu `?` méo: chỉnh `rotation`/`distance` của 2 `CubicMirroredVertex` trong `FxQuestion` (xem TUNING.md mục "Đường cong").

- [ ] **Step 9: Xem bằng mắt**

Chạy `python tools/overlay.py --data=mood=<key>` cho surprised, sleepy, confused, rồi so `build/side.png` với dải "Biểu cảm" của ảnh gốc.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat(mascot): surprised, sleepy, confused moods

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Tinh chỉnh độ giống, xuất `.riv`, viết hướng dẫn chỉnh

**Files:**
- Create: `docs/TUNING.md`, `tests/t8_delivery.json`, `dist/runtime.riv`
- Modify: `runtime.rml` (chỉ các giá trị tinh chỉnh)

**Interfaces:**
- Consumes: toàn bộ artboard.
- Produces: `dist/runtime.riv` (artboard `Runtime`, SM `Main`, VM `Mascot.mood`); `docs/TUNING.md`.

- [ ] **Step 1: Viết probe fail trước — `tests/t8_delivery.json`**

```json
{
  "names": ["Runtime", "Main", "Mascot", "mood"],
  "min_types": {"DataEnumValue": 7, "LinearAnimation": 10, "StateMachineLayer": 4},
  "transparent_artboard": true,
  "captures": [
    {"id": "t8-letterbox", "viewport": "500x300", "fit": "contain", "regions": [
      {"what": "eye visible when letterboxed", "box": [217, 116, 4, 4], "color": "6EA6FB", "tol": 45, "min": 0.5},
      {"what": "head top not cropped (ear tip area has blue)", "box": [180, 20, 8, 8], "color": "6E9BF0", "tol": 70, "min": 0.3}
    ]}
  ]
}
```

Probe này có thể PASS ngay từ đầu. Mục đích là khoá hành vi letterbox cho các lần chỉnh sau. `dist/runtime.riv` chưa tồn tại, và sẽ được kiểm ở Step 5.

- [ ] **Step 2: Chạy probe**

Run: `python tools/check.py tests/t8_delivery.json`
Expected: `PASS`. Nếu FAIL ở `head top not cropped`, xem `build/probe-t8-letterbox.png`. Ear tip ở artboard (133,35) → viewport (100+133·0.6, 35·0.6) = (180,21). Nếu hộp lệch khỏi tai thì dời hộp; nếu đầu thật sự bị cắt thì dời `Character.y` lên.

- [ ] **Step 3: Vòng tinh chỉnh độ giống (lặp tối đa 3 vòng)**

Mỗi vòng:
1. `python tools/overlay.py`, xem `build/overlay.png` và `build/side.png`.
2. Rà checklist dưới đây, sửa **một nhóm** mỗi lần:
   - Viền: độ dày (`thickness="3"`) và màu OUTLINE có đậm như ảnh gốc không?
   - Tai: độ nghiêng và độ nhọn (vertex giữa, `radius`).
   - Vỏ đầu: `cornerRadiusTL` (vuông hơn hay tròn hơn).
   - Visor: kích thước, bo góc, độ sáng tâm (VISOR_IN).
   - Mắt: kích thước, khoảng cách (±52), quầng sáng (`Feather strength`).
   - Thân: hoodie có loe dưới không? Nếu ảnh gốc loe hơn thì chuyển `Torso` sang `PointsPath` 4 góc bo (đáy rộng hơn đỉnh ~12px).
   - Tay: góc (`rotation` ±0.4), độ dài `Sleeve`.
   - Quai balo (`Straps`) có thò ra giữa tay và thân như ảnh gốc không?
3. `rive . --verify && python tools/check.py tests/t*.json`. Mọi probe phải `PASS`. Nếu một probe fail do toạ độ đổi có chủ đích, cập nhật box của probe và ghi vào commit message.
4. Commit: `git commit -am "tune(mascot): <nhóm đã chỉnh>"` (kèm dòng Co-Authored-By).

- [ ] **Step 4: Xác nhận `rive inspect` sạch và không có cảnh báo**

Run: `rive inspect . --summary`
Expected: `"problems": []`, và không có `no-default-state-machine`.

- [ ] **Step 5: Xuất `.riv`**

```bash
mkdir -p dist && rive . --once && cp build/nez-mascot.riv dist/runtime.riv && ls -la dist/runtime.riv
```

Expected: file tồn tại, kích thước > 5KB. Không cần `--publish`: file không có script nên `.riv` unsigned vẫn chạy trên runtime mobile.

- [ ] **Step 6: Viết `docs/TUNING.md`**

````markdown
# Hướng dẫn chỉnh mascot Runtime

## Vòng làm việc

1. Mở previewer (một lần, để chạy nền): `rive .` — tự rebuild mỗi lần lưu file.
2. Sửa `runtime.rml` (hình, animation) hoặc `data.rml` (API cho app).
3. So với ảnh gốc: `python tools/overlay.py [--data=mood=<key>]` → xem `build/overlay.png` (chồng 50/50) và `build/side.png` (cạnh nhau).
4. Chạy kiểm tra: `rive . --verify && python tools/check.py tests/*.json`.
5. Xuất cho app: `rive . --once && cp build/nez-mascot.riv dist/runtime.riv`.

Tìm phần cần chỉnh bằng `name="…"` (ví dụ tìm `name="HeadShell"` trong `runtime.rml`).

## Bản đồ bộ phận

| Muốn chỉnh | Tìm `name=` | Thuộc tính |
|---|---|---|
| Vị trí cả nhân vật | `Character` | `x`, `y` (đang ở giữa chân: 250, 470) |
| Kích thước cả nhân vật | `Character` | thêm `scaleX`/`scaleY` (lưu ý: `idle_breathe` đang key `scaleY` quanh 1 → sửa keyframe tương ứng) |
| Độ to / bo góc đầu | `HeadShell` | `Rectangle width/height/cornerRadiusTL` |
| Hình dáng tai | `EarOuter`, `EarInner` (trong `EarL`; `EarR` là bản lật) | toạ độ `StraightVertex`, `radius` = độ bo |
| Vị trí tai | `EarL`, `EarR` | `x`, `y` (đối xứng: đổi cả hai) |
| Tai nghe | `HeadphoneL`, `HeadphoneR` | `x`, `y`; kích thước ở `PhoneCup`/`PhoneFace` |
| Visor | `VisorGlass` | `width/height/cornerRadiusTL`; màu ở `RadialGradient` |
| Vị trí mắt | `EyeL`/`EyeR` trong mỗi `Eyes*` | `x` (±52) |
| Kích thước mắt | `Ellipse` trong `EyeL`/`EyeR` | `width`, `height` |
| Quầng sáng mắt | `Halo` | `Feather strength`, alpha trong `colorValue` |
| Má | `BlushL`, `BlushR` | `x`, `y`, alpha màu |
| Thân | `Torso` | kích thước, 4 góc bo |
| Tay | `ArmL`, `ArmR` | `rotation` (radian, ±0.4), `Sleeve` height |
| Logo ngực | `ChestLogo` | vertex của chữ N |

## Đổi màu toàn bộ

Màu viết dạng ARGB (`FF` + hex RGB). Đổi một token ở mọi chỗ, ví dụ viền:

```bash
sed -i 's/FF2B3257/FF1F2440/g' runtime.rml
```

Bảng token nằm trong plan và `MASCOT_BRIEF.md`. Nhớ cập nhật bảng khi đổi.

## Chuyển động

| Muốn | Sửa |
|---|---|
| Thở mạnh/nhẹ hơn | `idle_breathe`: giá trị `1.01` (scaleY) và `-180` (y đầu ở frame 75) |
| Thở nhanh/chậm | `idle_breathe`: `duration="150"` và frame giữa `75` (luôn = duration/2), frame cuối = duration |
| Chớp mắt thưa/dày | `blink`: `duration="240"`; khoảng nhắm frame 200→212 |
| Tai giật mạnh hơn | `ear_twitch`: `-0.22` / `0.08` (radian) |
| Tắt hẳn một chuyển động | xoá `StateMachineLayer` tương ứng trong `Main` (`Idle`, `Blink`, `Ears`) |

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

`rive . --once --rev` ghi thêm `.rev` để mở trong Rive Editor (cần `rive login`). Nếu chỉnh trong editor rồi muốn kéo về, dùng `rive pull`. Lệnh này **ghi đè** các file `.rml`, nên commit trước khi chạy.
````

- [ ] **Step 7: Chạy toàn bộ kiểm tra lần cuối**

Run: `rive . --verify && rive inspect . --summary && python tools/check.py tests/*.json`
Expected: `0 errors`, `problems: []`, 8/8 `PASS`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(mascot): export runtime.riv and tuning guide

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Ngoài phạm vi (phase 2, cần plan riêng)

- Mặt bên / mặt sau, balo đầy đủ, quai tai nghe qua đầu.
- Các pose: vẫy tay "Hi!" (key `ArmR.rotation`), học với laptop, chat, cổ vũ, nghe nhạc, di chuyển, nằm ngủ.
- Sticker "Let's Study!" / "Good Job!" / "Focus Time!" / "See you!" (cần `FontAsset` + text).
- Code tích hợp React Native.
