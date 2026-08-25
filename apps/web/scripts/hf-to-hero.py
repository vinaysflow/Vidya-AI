#!/usr/bin/env python3
"""
Free image -> 3D via a Hugging Face Space (no paid API).

Calls a public image-to-3D Space through gradio_client, finds the .glb it
produces, and copies it to public/proto/hero.glb (where the R3F scene loads it).

Run with the isolated env that has gradio_client installed:
  /tmp/g3d/bin/python scripts/hf-to-hero.py --probe          # list spaces + api
  /tmp/g3d/bin/python scripts/hf-to-hero.py                   # convert rm-hero.png

Optional: export HF_TOKEN=hf_xxx (free, no card) if a Space needs auth/GPU quota.
"""
import argparse
import os
import shutil
import sys
import traceback
from pathlib import Path

from gradio_client import Client, handle_file

WEB_ROOT = Path(__file__).resolve().parent.parent

# Ordered by preference. /shape_generation works anonymously and returns a clean
# (untextured) GLB; /generation_all (textured) is currently broken on the Space.
CANDIDATES = [
    ("tencent/Hunyuan3D-2", "/shape_generation"),
    ("tencent/Hunyuan3D-2", "/generation_all"),
]


def find_glb(obj):
    """Walk an arbitrary gradio result and return the first .glb path found."""
    stack = [obj]
    while stack:
        cur = stack.pop()
        if isinstance(cur, str):
            if cur.lower().endswith((".glb", ".gltf")):
                return cur
        elif isinstance(cur, dict):
            stack.extend(cur.values())
        elif isinstance(cur, (list, tuple)):
            stack.extend(cur)
    return None


def probe(token):
    for space, _ in CANDIDATES:
        print(f"\n=== {space} ===")
        try:
            c = Client(space, token=token, verbose=False)
            c.view_api(all_endpoints=False)
        except Exception as e:  # noqa: BLE001
            print(f"  unavailable: {e}")


def convert(space, api_name, image, out, token):
    print(f"Connecting to {space} ...")
    client = Client(space, token=token, verbose=False)
    img = handle_file(str(image))

    attempts = []
    if "Hunyuan3D-2" in space:
        kwargs = dict(
            caption="",
            image=img,
            steps=30,
            guidance_scale=5.0,
            seed=1234,
            octree_resolution=256,  # must be numeric, not "256"
            check_box_rembg=True,
            api_name=api_name,
        )
        attempts.append(kwargs)
    else:
        attempts.append(dict(image=img, api_name=api_name) if api_name else dict(image=img))

    last_err = None
    for kwargs in attempts:
        try:
            print(f"  predicting ({ {k: v for k, v in kwargs.items() if k != 'image' and k != 'input_image'} })...")
            result = client.predict(**kwargs) if isinstance(kwargs, dict) else client.predict(*kwargs)
            glb = find_glb(result)
            if glb and os.path.exists(glb):
                shutil.copyfile(glb, out)
                print(f"OK -> {out} ({os.path.getsize(out)/1e6:.2f} MB)")
                return True
            print(f"  no .glb in result: {result}")
        except Exception as e:  # noqa: BLE001
            last_err = e
            print(f"  attempt failed: {e}")
    if last_err:
        raise last_err
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--probe", action="store_true")
    ap.add_argument("--space", default=None)
    ap.add_argument("--api", default=None)
    ap.add_argument("--src", default=str(WEB_ROOT / "public/proto/rm-hero.png"))
    ap.add_argument("--out", default=str(WEB_ROOT / "public/proto/hero.glb"))
    args = ap.parse_args()
    token = os.environ.get("HF_TOKEN") or None

    if args.probe:
        probe(token)
        return

    targets = [(args.space, args.api)] if args.space else CANDIDATES
    for space, api in targets:
        try:
            if convert(space, api, args.src, args.out, token):
                print("\nDone. Refresh /proto/r3f to see the 3D avatar.")
                return
        except Exception:  # noqa: BLE001
            traceback.print_exc()
            print(f"-> {space} did not work, trying next...\n")
    print("\nAll spaces failed. A free HF_TOKEN (https://huggingface.co/settings/tokens) often fixes GPU-quota errors.")
    sys.exit(1)


if __name__ == "__main__":
    main()
