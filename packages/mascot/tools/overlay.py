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
