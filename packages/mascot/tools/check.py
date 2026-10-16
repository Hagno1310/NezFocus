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
    # "steps" = ordered --advance/--pointer flags (e.g. sleep, click, settle); otherwise a single advance.
    steps = cap.get("steps") or [f"--advance={cap.get('advance', 5)}"]
    args = [".", f"--screenshot={out}", *steps, "--quiet"]
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
        lo = reg.get("min", 0.0 if "max" in reg else 0.5)
        hi = reg.get("max", 1.0)
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
