#!/usr/bin/env python3
"""Build the Moon chapter art from the owner's images in art_src/ (deterministic).

  art_src/moon_background.webp -> assets/moon_sky.png        480x270 (sky only, mountains removed)
                               -> assets/moon_mtn_1..N.png   mountain pieces (transparent), reused at
                                                             random sizes so the range never repeats
                               -> assets/moon_ground.png     480xH tileable regolith (craters removed)
                               -> assets/moon_decor_1..M.png craters and rocks cut from the picture
  art_src/moon_rover.webp      -> assets/moon_buggy.png      4-frame strip (frame = width / 4),
                                                             wheels marked so they visibly turn

Run: python3 tools/build_moon_art.py      (needs Pillow)
These files are marked `human` in ASSETS.md, so tools/generate_art.py never overwrites them.
"""
import math
import os
import random
import statistics

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art_src')
OUT = os.path.join(ROOT, 'assets')
W, H = 480, 270
N_MTN, N_DECOR = 4, 5
ROVER_FW, ROVER_FH = 72, 44          # one frame of the rover strip


def lum(p):
    return (p[0] * 3 + p[1] * 6 + p[2]) / 10


def hard_alpha(im):
    """Alpha only ever 0 or 255 (pixel-art rule)."""
    a = im.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
    im.putalpha(a)
    return im


# ------------------------------------------------------------------ background
def build_background():
    src = Image.open(os.path.join(SRC, 'moon_background.webp')).convert('RGB')
    g = src.resize((W, H), Image.BOX)
    px = g.load()

    # horizon: first row (from 200 down) whose median brightness jumps up to ground level
    meds = [statistics.median(lum(px[x, y]) for x in range(W)) for y in range(H)]
    horizon = next(y for y in range(190, H) if meds[y] > 120)

    # mountain top per column: first run of 3 light rows below the open sky, then a median
    # filter over neighbouring columns so single stars or dark cracks cannot make spikes/notches
    raw = []
    for x in range(W):
        t = horizon
        for y in range(140, horizon):
            if all(lum(px[x, y + k]) > 58 for k in range(3) if y + k < horizon):
                t = y
                break
        raw.append(t)
    top = [int(statistics.median(raw[max(0, x - 4):x + 5])) for x in range(W)]

    # 1) sky: the mountains are moved out, so the lower sky fades smoothly (rows 118-142) into
    #    one even night colour with a few stars: no trace of the old mountain outline, no stripes
    sky = g.copy()
    sp = sky.load()
    srng = random.Random(3)
    band = sorted((px[x, y] for x in range(W) for y in range(128, 142)), key=lum)
    night = band[len(band) // 2]
    f0, f1 = 118, 142
    for y in range(f0, H):
        t = min(1.0, (y - f0) / (f1 - f0))
        for x in range(W):
            o = px[x, y] if y < min(top) else night
            c = tuple(round(o[k] + (night[k] - o[k]) * t) for k in range(3))
            if y >= f1 and srng.random() < 0.0025:
                c = (200, 205, 235)
            sp[x, y] = c
    sky.save(os.path.join(OUT, 'moon_sky.png'))

    # 2) mountains: everything between the top line and the horizon, cut into pieces at valleys
    mtn = Image.new('RGBA', (W, horizon + 2), (0, 0, 0, 0))
    mp = mtn.load()
    for x in range(W):
        for y in range(top[x], horizon + 2):
            r, gg, b = px[x, min(y, horizon - 1)]
            mp[x, y] = (r, gg, b, 255)
    # valleys = local maxima of `top` (lowest points of the silhouette), spaced apart
    cand = sorted(range(30, W - 30), key=lambda x: -top[x])
    cuts = []
    for x in cand:
        if all(abs(x - c) > 70 for c in cuts):
            cuts.append(x)
        if len(cuts) == N_MTN - 1:
            break
    edges = [0] + sorted(cuts) + [W]
    for i in range(N_MTN):
        piece = mtn.crop((edges[i], 0, edges[i + 1], horizon + 2))
        piece = piece.crop(piece.getbbox())
        # taper both sides into a slope down to the ground, so overlapping pieces read as one
        # mountain in front of another (no straight vertical seams)
        pw, ph = piece.size
        pp = piece.load()
        trng = random.Random(11 + i)
        T = max(12, min(44, pw // 3))
        for x in range(pw):
            d = min(x, pw - 1 - x)
            if d >= T:
                continue
            keep_from = ph - (d * ph) / T + trng.randint(-1, 1)   # rows above this are cut away
            for y in range(ph):
                if y < keep_from:
                    pp[x, y] = (0, 0, 0, 0)
        piece.save(os.path.join(OUT, f'moon_mtn_{i + 1}.png'))

    # 3) ground: rows below the horizon. Pixels that stand out from their row (craters, rocks)
    #    become decor; the base is rebuilt from each row's ordinary pixels so it tiles and has no
    #    fixed craters.
    gh = H - horizon
    rows = []
    for y in range(horizon, H):
        row = [px[x, y] for x in range(W)]
        m = statistics.median(lum(p) for p in row)
        normal = [p for p in row if abs(lum(p) - m) < 22]
        rows.append((row, m, normal or row))
    rng = random.Random(7)
    ground = Image.new('RGB', (W, gh))
    gp = ground.load()
    for yy, (row, m, normal) in enumerate(rows):
        x = 0
        while x < W:
            c = rng.choice(normal)
            for k in range(rng.randint(1, 3)):     # little runs keep the chunky pixel look
                if x < W:
                    gp[x, yy] = c
                    x += 1
    for x in range(W):                               # keep the bright horizon rim
        gp[x, 0] = px[x, horizon]
    ground.save(os.path.join(OUT, 'moon_ground.png'))

    # 4) decor: connected blobs of standout pixels in the ground, biggest first
    odd = [[abs(lum(rows[yy][0][x]) - rows[yy][1]) >= 22 for x in range(W)] for yy in range(gh)]
    seen = [[False] * W for _ in range(gh)]
    blobs = []
    for yy in range(2, gh):
        for x in range(W):
            if odd[yy][x] and not seen[yy][x]:
                stack, pts = [(x, yy)], []
                seen[yy][x] = True
                while stack:
                    cx, cy = stack.pop()
                    pts.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 2 <= ny < gh and 0 <= nx < W and odd[ny][nx] and not seen[ny][nx]:
                                seen[ny][nx] = True
                                stack.append((nx, ny))
                if len(pts) >= 12:
                    blobs.append(pts)
    blobs.sort(key=len, reverse=True)
    made = 0
    for pts in blobs:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        x0, x1, y0, y1 = min(xs) - 1, max(xs) + 2, min(ys) - 1, max(ys) + 2
        bw_, bh_ = x1 - x0, y1 - y0
        dark = sum(1 for (cx, cy) in pts if lum(rows[cy][0][cx]) < rows[cy][1] - 35)
        # real craters and rocks: not too flat, not cut by the picture edge, with dark shadow
        if bw_ < 8 or bh_ < 7 or bw_ / bh_ > 7 or x0 < 0 or x1 > W or dark < max(10, 0.15 * len(pts)):
            continue
        sprite = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
        sp2 = sprite.load()
        mask = set(pts)
        for (cx, cy) in pts:                         # grow the mask by one pixel (crater rims)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    mask.add((cx + dx, cy + dy))
        for (cx, cy) in mask:
            if x0 <= cx < x1 and y0 <= cy < y1 and 0 <= cy < gh:
                r, gg, b = rows[cy][0][cx]
                sp2[cx - x0, cy - y0] = (r, gg, b, 255)
        made += 1
        sprite.save(os.path.join(OUT, f'moon_decor_{made}.png'))
        if made == N_DECOR:
            break
    print('horizon', horizon, 'ground height', gh, 'cuts', sorted(cuts), 'decor', made)
    return horizon


# ------------------------------------------------------------------ rover
def build_rover():
    im = Image.open(os.path.join(SRC, 'moon_rover.webp')).convert('RGBA')
    w, h = im.size
    px = im.load()
    # remove the white page: flood fill from the borders through near-white pixels
    near_white = lambda p: p[0] > 228 and p[1] > 228 and p[2] > 228
    stack = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    seen = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        if not near_white(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    # enclosed white gaps (inside the roll cage) are background too
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] and p[0] > 245 and p[1] > 245 and p[2] > 245:
                px[x, y] = (0, 0, 0, 0)
    bbox = im.getbbox()
    im = im.crop(bbox)
    bw, bh = im.size
    scale = min((ROVER_FW - 2) / bw, (ROVER_FH - 1) / bh)
    tw, th = round(bw * scale), round(bh * scale)
    small = hard_alpha(im.resize((tw, th), Image.BOX))

    # wheel centres: the two big dark discs near the bottom (found in the source, then scaled)
    sp = im.load()
    def wheel_centre(xr):
        best = None
        for x in range(int(bw * xr[0]), int(bw * xr[1])):
            col = [y for y in range(int(bh * 0.55), bh) if sp[x, y][3] and lum(sp[x, y]) < 90]
            if col and (best is None or len(col) > best[1]):
                best = (x, len(col), (min(col) + max(col)) / 2)
        return best[0] * scale, best[2] * scale, best[1] * scale / 2
    wheels = [wheel_centre((0.0, 0.35)), wheel_centre((0.6, 0.95))]

    strip = Image.new('RGBA', (ROVER_FW * 4, ROVER_FH), (0, 0, 0, 0))
    ox, oy = (ROVER_FW - tw) // 2, ROVER_FH - th
    for f in range(4):
        fr = small.copy()
        d = ImageDraw.Draw(fr)
        for (cx, cy, r) in wheels:
            rr = r * 0.62                             # the light ring on the tyre
            for k in range(3):                        # three tread marks, 120 deg apart
                a = math.radians(f * 30 + k * 120)
                x, y = round(cx + rr * math.cos(a)), round(cy + rr * math.sin(a))
                d.rectangle([x - 1, y - 1, x, y], fill=(200, 205, 215, 255))
        strip.paste(fr, (f * ROVER_FW + ox, oy), fr)
    hard_alpha(strip)
    strip.save(os.path.join(OUT, 'moon_buggy.png'))
    print('rover', strip.size, 'body', (tw, th), 'wheels', [(round(a), round(b), round(c)) for a, b, c in wheels])


if __name__ == '__main__':
    build_background()
    build_rover()
