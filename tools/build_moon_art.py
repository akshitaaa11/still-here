#!/usr/bin/env python3
"""Build the Moon chapter art from the owner's pictures in art_src/ (deterministic).

The game is laid out in 480x270 units but drawn on a 960x540 canvas (K.ZOOM = 2), so these
files are made at canvas resolution (2 px per game unit) and shown at scale 0.5.

  art_src/moon_background.webp -> moon_sky.png       960x540  sky + Earth; the lower sky fades to
                                                               plain night (mountains are separate)
                               -> moon_mtn_a.png     the whole mountain range, true shape, bigger
                               -> moon_mtn_b.png     the same range mirrored; a,b,a,b... join seamlessly
                               -> moon_ground.png    960xGH regolith that tiles (craters taken out)
                               -> moon_decor_1..5    craters and rocks, scattered at random sizes
  art_src/moon_rover.webp      -> moon_buggy.png     the owner's pixel-art rover at its own pixel size
                                                     (one colour per art pixel, nothing blurred),
                                                     4 frames with turning tread marks

Run: python3 tools/build_moon_art.py      (needs Pillow)
"""
import math
import os
import random
import statistics
from collections import Counter

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art_src')
OUT = os.path.join(ROOT, 'assets')
CW, CH = 960, 540          # canvas size
MTN_H = 216                # mountain band height in canvas px (108 game units; was 64)
GROUND_H = 140             # ground height in canvas px (70 game units)
N_DECOR = 5


def lum(p):
    return (p[0] * 3 + p[1] * 6 + p[2]) / 10


def hard_alpha(im):
    im.putalpha(im.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
    return im


def build_background():
    src = Image.open(os.path.join(SRC, 'moon_background.webp')).convert('RGB')
    SW, SH = src.size
    sp = src.load()
    # horizon in the source: where the bright ground starts
    meds = [statistics.median(lum(sp[x, y]) for x in range(0, SW, 3)) for y in range(SH)]
    hz = next(y for y in range(int(SH * 0.7), SH) if meds[y] > 120)
    # mountain top per source column (first run of 6 light rows), median-filtered
    raw = []
    for x in range(SW):
        t = hz
        for y in range(int(SH * 0.5), hz):
            if all(lum(sp[x, y + k]) > 58 for k in range(6) if y + k < hz):
                t = y
                break
        raw.append(t)
    top = [int(statistics.median(raw[max(0, x - 12):x + 13])) for x in range(SW)]
    band_top = min(top)

    # ---- sky (canvas size): lower part fades into plain night so no old mountains show
    sky = src.resize((CW, CH), Image.BOX)
    kp = sky.load()
    fy0, fy1 = int(CH * 0.42), int(CH * 0.53)
    band = sorted((kp[x, y] for x in range(CW) for y in range(fy0, fy0 + 20)), key=lum)
    night = band[len(band) // 2]
    rng = random.Random(3)
    for y in range(fy0, CH):
        t = min(1.0, (y - fy0) / (fy1 - fy0))
        for x in range(CW):
            o = kp[x, y]
            c = tuple(round(o[k] + (night[k] - o[k]) * t) for k in range(3))
            if y >= fy1 and rng.random() < 0.0012:
                c = (200, 205, 235)
            kp[x, y] = c
    sky.save(os.path.join(OUT, 'moon_sky.png'))

    # ---- mountains: the whole range as drawn, scaled up as one piece (no cutting, no stretching)
    s = MTN_H / (hz - band_top)
    bw = round(SW * s)
    band_img = src.crop((0, band_top, SW, hz)).resize((bw, MTN_H), Image.BOX)
    bp = band_img.load()
    m = Image.new('RGBA', (bw, MTN_H), (0, 0, 0, 0))
    mp = m.load()
    for x in range(bw):
        t = (top[min(SW - 1, int(x / s))] - band_top) * s
        for y in range(MTN_H):
            if y >= t:
                r, g, b = bp[x, y]
                mp[x, y] = (r, g, b, 255)
    m.save(os.path.join(OUT, 'moon_mtn_a.png'))
    m.transpose(Image.FLIP_LEFT_RIGHT).save(os.path.join(OUT, 'moon_mtn_b.png'))

    # ---- ground: source rows under the horizon, at canvas resolution
    gs = GROUND_H / (SH - hz)
    gw = round(SW * gs)
    gimg = src.crop((0, hz, SW, SH)).resize((gw, GROUND_H), Image.BOX)
    gp = gimg.load()
    rows = []
    for y in range(GROUND_H):
        row = [gp[x, y] for x in range(gw)]
        md = statistics.median(lum(p) for p in row)
        normal = [p for p in row if abs(lum(p) - md) < 20]
        rows.append((row, md, normal or row))
    grng = random.Random(7)
    base = Image.new('RGB', (CW, GROUND_H))
    bp2 = base.load()
    for y, (row, md, normal) in enumerate(rows):
        x = 0
        while x < CW:
            c = grng.choice(normal)
            for _ in range(grng.randint(2, 4)):          # runs of 2-4 keep the chunky look
                if x < CW:
                    bp2[x, y] = c
                    x += 1
    for x in range(CW):                                  # the bright horizon rim, 2 px
        bp2[x, 0] = gp[x % gw, 0]
        bp2[x, 1] = gp[x % gw, 1]
    base.save(os.path.join(OUT, 'moon_ground.png'))

    # ---- decor: standout blobs (craters, rocks) cut from the real ground
    odd = [[abs(lum(rows[y][0][x]) - rows[y][1]) >= 20 for x in range(gw)] for y in range(GROUND_H)]
    seen = [[False] * gw for _ in range(GROUND_H)]
    blobs = []
    for y in range(3, GROUND_H):
        for x in range(gw):
            if odd[y][x] and not seen[y][x]:
                stack, pts = [(x, y)], []
                seen[y][x] = True
                while stack:
                    cx, cy = stack.pop()
                    pts.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 3 <= ny < GROUND_H and 0 <= nx < gw and odd[ny][nx] and not seen[ny][nx]:
                                seen[ny][nx] = True
                                stack.append((nx, ny))
                if len(pts) >= 40:
                    blobs.append(pts)
    blobs.sort(key=len, reverse=True)
    for f in os.listdir(OUT):
        if f.startswith('moon_decor_') or f.startswith('moon_mtn_') and f[9] in '0123456789':
            os.remove(os.path.join(OUT, f))
    made = 0
    for pts in blobs:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        x0, x1, y0, y1 = min(xs) - 2, max(xs) + 3, min(ys) - 2, max(ys) + 3
        bw_, bh_ = x1 - x0, y1 - y0
        dark = sum(1 for (cx, cy) in pts if lum(rows[cy][0][cx]) < rows[cy][1] - 35)
        if bw_ < 16 or bh_ < 14 or bw_ / bh_ > 7 or x0 < 0 or x1 > gw or dark < max(30, 0.15 * len(pts)):
            continue
        mask = set(pts)
        for (cx, cy) in pts:
            for dx in (-2, -1, 0, 1, 2):
                for dy in (-1, 0, 1):
                    mask.add((cx + dx, cy + dy))
        spr = Image.new('RGBA', (bw_, bh_), (0, 0, 0, 0))
        q = spr.load()
        for (cx, cy) in mask:
            if x0 <= cx < x1 and y0 <= cy < y1 and 0 <= cy < GROUND_H:
                r, g, b = rows[cy][0][cx]
                q[cx - x0, cy - y0] = (r, g, b, 255)
        made += 1
        spr.save(os.path.join(OUT, f'moon_decor_{made}.png'))
        if made == N_DECOR:
            break
    print(f'source horizon {hz}, mountain band {hz - band_top} rows -> {bw}x{MTN_H}; ground {gw}x{GROUND_H}; decor {made}')


def build_rover():
    im = Image.open(os.path.join(SRC, 'moon_rover.webp')).convert('RGBA')
    w, h = im.size
    px = im.load()
    # remove the white page (flood fill from the border), then any enclosed white
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
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] and p[0] > 245 and p[1] > 245 and p[2] > 245:
                px[x, y] = (0, 0, 0, 0)
    im = im.crop(im.getbbox())
    w, h = im.size
    px = im.load()

    # find the art's own pixel grid: block size and offset where blocks are most uniform
    def score(B, ox, oy):
        good = tot = 0
        for by in range(oy, h - B, B * 3):
            for bx in range(ox, w - B, B * 3):
                c = Counter(px[bx + i, by + j][:3] if px[bx + i, by + j][3] else None for i in range(B) for j in range(B))
                good += c.most_common(1)[0][1]
                tot += B * B
        return good / tot
    best = max(((score(B, ox, oy), B, ox, oy) for B in (6, 7, 8) for ox in range(B) for oy in range(B)))
    _, B, ox, oy = best
    # one colour per art pixel: the most common colour in its block (no averaging, no blur)
    nw, nh = (w - ox) // B, (h - oy) // B
    art = Image.new('RGBA', (nw, nh), (0, 0, 0, 0))
    ap = art.load()
    for j in range(nh):
        for i in range(nw):
            c = Counter(px[ox + i * B + a, oy + j * B + b] for a in range(B) for b in range(B))
            col, n = c.most_common(1)[0]
            transparent = sum(v for k, v in c.items() if k[3] < 128)
            ap[i, j] = (0, 0, 0, 0) if transparent > B * B / 2 else (col[0], col[1], col[2], 255)

    # wheels: the two biggest dark discs low on the rover
    def wheel(x_from, x_to):
        best_c = None
        for x in range(int(nw * x_from), int(nw * x_to)):
            col = [y for y in range(int(nh * 0.5), nh) if ap[x, y][3] and lum(ap[x, y]) < 90]
            if col and (best_c is None or len(col) > best_c[1]):
                best_c = (x, len(col), (min(col) + max(col)) / 2)
        return best_c[0], best_c[2], best_c[1] / 2
    wheels = [wheel(0.0, 0.35), wheel(0.6, 0.95)]

    FW, FH = nw + 2, nh + 1
    strip = Image.new('RGBA', (FW * 4, FH), (0, 0, 0, 0))
    for f in range(4):
        fr = art.copy()
        d = ImageDraw.Draw(fr)
        for (cx, cy, r) in wheels:
            rr = r * 0.6
            for k in range(3):
                a = math.radians(f * 30 + k * 120)
                x, y = round(cx + rr * math.cos(a)), round(cy + rr * math.sin(a))
                d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=(150, 156, 170, 255))
        strip.paste(fr, (f * FW + 1, FH - nh), fr)
    hard_alpha(strip).save(os.path.join(OUT, 'moon_buggy.png'))
    print(f'rover grid {B}px (offset {ox},{oy}) -> art {nw}x{nh}, strip {strip.size}')


if __name__ == '__main__':
    build_background()
    build_rover()
