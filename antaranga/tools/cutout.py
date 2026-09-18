#!/usr/bin/env python3
"""ANTARANGA · cutout — the owner's pictures (a jasmine branch, the veena,
the Matha's wall) photographed on white, keyed to transparency for the
stations (js/world/stations.js loads assets/props/<name>.png).

  python3 tools/cutout.py ~/Downloads/jasmine.jpg jasmine
  python3 tools/cutout.py ~/Downloads/veena.png veena
  python3 tools/cutout.py ~/Downloads/gate.png gate [--max 1600]

A picture that already has an alpha channel is only resized. One on white
is keyed from its border: the connected white background goes clear
(tolerance --tol, default 14), the edge is un-matted so no white fringe
is left, and a soft 1px feather keeps the silhouette from cutting.
"""
import sys, argparse
import numpy as np
from PIL import Image, ImageFilter
from collections import deque

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('name')
ap.add_argument('--max', type=int, default=1600, help='longest side, px')
ap.add_argument('--tol', type=int, default=14, help='how far from pure white still counts as background')
a = ap.parse_args()

im = Image.open(a.src).convert('RGBA')
im.thumbnail((a.max, a.max), Image.LANCZOS)
arr = np.asarray(im).astype(np.float32)
H, W = arr.shape[:2]
if arr[..., 3].min() < 250:
    out = im                                      # already cut out
else:
    rgb = arr[..., :3]
    near_white = (255 - rgb.min(axis=2)) <= a.tol
    # flood from the border: only background connected to the edge goes
    bg = np.zeros((H, W), bool); q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if near_white[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if near_white[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < H and 0 <= nx < W and near_white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    alpha = np.where(bg, 0.0, 255.0)
    # a soft edge: blur the mask a touch, then un-matte the rim against white
    am = Image.fromarray(alpha.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    alpha = np.asarray(am).astype(np.float32) / 255.0
    a3 = alpha[..., None]
    safe = np.maximum(a3, 1e-3)
    unm = (rgb - (1 - a3) * 255.0) / safe
    unm = np.clip(np.where(a3 > .02, unm, rgb), 0, 255)
    out = Image.fromarray(np.dstack([unm, alpha * 255.0]).astype(np.uint8), 'RGBA')
dst = f'assets/props/{a.name}.png'
out.save(dst, optimize=True)
print(dst, out.size)
