#!/usr/bin/env python3
"""Tracing-paper view: the reference front view sits under the Rive art, like tracing a comic panel.

Usage:
  python tools/trace.py                    # one frame -> build/trace.png
  python tools/trace.py --data=mood=wink   # any extra flags go to `rive` (screenshot mode)
  python tools/trace.py --watch            # live previewer; re-syncs whenever runtime.rml / data.rml is saved
Options:
  --ref-opacity=0.55   opacity of the reference layer (default 0.55)
  --art-opacity=0.8    opacity of the whole character on top (default 0.8, so the reference shows through)

The trace project lives in build/trace/ (gitignored). The shipped runtime.riv never contains the reference image.
"""
import pathlib
import shutil
import subprocess
import sys
import time

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "build" / "trace"
REF = ROOT / "reference" / "nez-mascot-demo.png"
# Front view ("Mặt trước") crop that maps 2x onto the 500x500 artboard (same as tools/overlay.py).
CROP = (890, 108, 1140, 358)
TRACE_ID = "0:99990"  # far above ids written by rive push


def opt(args, name, default):
    for a in list(args):
        if a.startswith(f"--{name}="):
            args.remove(a)
            return float(a.split("=", 1)[1])
    return default


def sync(ref_opacity, art_opacity):
    OUT.mkdir(parents=True, exist_ok=True)
    front = OUT / "front.png"
    Image.open(REF).convert("RGB").crop(CROP).resize((500, 500), Image.LANCZOS).save(front)
    (OUT / "rive.yaml").write_text("name: trace\nmain: Runtime\n", encoding="utf-8")
    shutil.copyfile(ROOT / "data.rml", OUT / "data.rml")
    s = (ROOT / "runtime.rml").read_text(encoding="utf-8")
    # Reference goes last in the artboard = drawn behind everything.
    layer = (f'        <Image x="250" y="250" opacity="{ref_opacity}" assetId="{TRACE_ID}" name="TraceReference"/>\n\n'
             '        <StateMachine name="Main"')
    s = s.replace('        <StateMachine name="Main"', layer, 1)
    s = s.replace('name="Character" id="0:10">', f'opacity="{art_opacity}" name="Character" id="0:10">', 1)
    s = s.replace("</Artboard>", f'</Artboard>\n    <ImageAsset file="front.png" name="front" id="{TRACE_ID}"/>', 1)
    (OUT / "runtime.rml").write_text(s, encoding="utf-8")


def main(args):
    rive = shutil.which("rive")
    ref_opacity = opt(args, "ref-opacity", 0.55)
    art_opacity = opt(args, "art-opacity", 0.8)
    if "--watch" in args:
        args.remove("--watch")
        sync(ref_opacity, art_opacity)
        viewer = subprocess.Popen([rive, str(OUT), "--fit=contain", *args])
        watched = [ROOT / "runtime.rml", ROOT / "data.rml"]
        stamp = [f.stat().st_mtime for f in watched]
        print("tracing: edit runtime.rml; the trace window updates on save. Ctrl+C to stop.")
        try:
            while viewer.poll() is None:
                time.sleep(0.5)
                now = [f.stat().st_mtime for f in watched]
                if now != stamp:
                    stamp = now
                    sync(ref_opacity, art_opacity)
        except KeyboardInterrupt:
            viewer.terminate()
        return
    sync(ref_opacity, art_opacity)
    subprocess.run([rive, str(OUT), "--screenshot=" + str(ROOT / "build" / "trace.png"), "--advance=5", "--quiet", *args], check=True)
    print("wrote build/trace.png")


if __name__ == "__main__":
    main(sys.argv[1:])
