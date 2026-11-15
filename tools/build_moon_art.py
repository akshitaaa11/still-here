#!/usr/bin/env python3
"""Build the Moon and Mars chapter art from the owner's pictures in art_src/ (deterministic).

The game is laid out in 480x270 units but drawn on a 960x540 canvas (K.ZOOM = 2), so these
files are made at canvas resolution (2 px per game unit) and shown at scale 0.5.

For each chapter (moon, mars):
  art_src/<ch>_background.webp -> <ch>_sky.png         960x540 sky (Earth / Sun kept); the lower sky
                                                       is filled in where the mountains were
                               -> <ch>_mtn_a.png       the whole mountain range, true shape
                               -> <ch>_mtn_b.png       the same range mirrored (a,b,a,b... seamless)
                               -> <ch>_ground.png      960x140 ground that tiles (craters taken out)
                               -> <ch>_decor_1..5.png  craters and rocks, scattered at random sizes
  art_src/<ch>_rover.webp      -> <rover>.png          the owner's pixel-art rover at its own pixel
                                                       size (one colour per art pixel, no blur),
                                                       4 frames with turning wheel marks
  (mars only)                  -> mars_rover_asleep.png the same rover, dusty, for the ending

Run: python3 tools/build_moon_art.py [moon|mars]     (both when no argument; needs Pillow)
"""
import math
import os
import random
import statistics
import sys
from collections import Counter

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art_src')
OUT = os.path.join(ROOT, 'assets')
CW, CH = 960, 540          # canvas size
GROUND_H = 140             # ground height in canvas px (70 game units)
N_DECOR = 5

CHAPTERS = {
    # mode: how mountains differ from the sky ('light' = lighter than a dark sky, 'dark' = darker
    # than a bright sky). mtn_h: mountain band height in canvas px.
    # search_from: where (fraction of the height) to start looking for mountain tops (below stars
    # and clouds). grid/offset: source pixels per output pixel when sampling the rover (one colour
    # per cell, never averaged, so nothing blurs).
    'moon': {'mode': 'light', 'mtn_h': 216, 'search_from': 0.5, 'rover': 'moon_buggy', 'grid': 6, 'offset': (1, 1)},
    # mars: the sky is horizontal bands (one colour per row), so the mountains are taken as a whole
    # strip, sky included, at the sky picture's own scale and position: nothing is cut, and the
    # strip's sky matches the sky behind it exactly. band_top = a source row inside a plain band.
    'mars': {'mode': 'band', 'band_top': 364, 'search_from': 0.35, 'rover': 'mars_rover', 'asleep': 'mars_rover_asleep',
             'grid': 5.5, 'offset': (0, 0)},
}


def lum(p):
    return (p[0] * 3 + p[1] * 6 + p[2]) / 10


def hard_alpha(im):
    im.putalpha(im.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
    return im


def build_background(ch, cfg):
    src = Image.open(os.path.join(SRC, f'{ch}_background.webp')).convert('RGB')
    SW, SH = src.size
    sp = src.load()
    meds = [statistics.median(lum(sp[x, y]) for x in range(0, SW, 3)) for y in range(SH)]
    # horizon: where the row brightness jumps up into the ground
    hz = max(range(int(SH * 0.6), int(SH * 0.95)),           # the strongest step = the ground line
             key=lambda y: statistics.median(meds[y:y + 5]) - statistics.median(meds[y - 12:y - 6]))
    # brightest part of each row = the sky's colour there (used by 'dark' mode)
    # (left 70% only: the Sun on the right would make the sky look brighter than it is)
    skyl = []
    for y in range(SH):
        v = sorted(lum(sp[x, y]) for x in range(0, int(SW * 0.7), 3))
        skyl.append(v[int(len(v) * 0.8)])

    def is_mtn(x, y):
        v = lum(sp[x, y])
        return v > 58 if cfg['mode'] == 'light' else v < skyl[y] - cfg.get('delta', 25)

    if cfg['mode'] == 'band':
        sky = src.resize((CW, CH), Image.BOX)
        sky.save(os.path.join(OUT, f'{ch}_sky.png'))
        s = CW / SW
        b0 = cfg['band_top']
        band_img = src.crop((0, b0, SW, hz + 6)).resize((CW, round((hz + 6 - b0) * s)), Image.BOX).convert('RGBA')
        band_img.save(os.path.join(OUT, f'{ch}_mtn_a.png'))
        band_img.transpose(Image.FLIP_LEFT_RIGHT).save(os.path.join(OUT, f'{ch}_mtn_b.png'))
        print(f'{ch}: mountains strip {band_img.size}, top at game y {b0 * 270 / SH:.2f}')
        build_ground(ch, src, hz)
        return
    raw = []
    for x in range(SW):
        t = hz
        for y in range(int(SH * cfg['search_from']), hz):
            if all(is_mtn(x, y + k) for k in range(cfg.get('run', 6)) if y + k < hz):
                t = y
                break
        raw.append(t)
    sm = cfg.get('smooth', 12)
    top = [int(statistics.median(raw[max(0, x - sm):x + sm + 1])) for x in range(SW)]
    band_top = min(top)

    # ---- sky: from a little above the mountains down, fade into the sky colour just above them
    sky = src.resize((CW, CH), Image.BOX)
    kp = sky.load()
    fy0 = max(10, int(band_top * CH / SH) - 30)
    fy1 = fy0 + 30
    ref = sorted((kp[x, y] for x in range(CW) for y in range(fy0 - 12, fy0)), key=lum)
    fill = ref[len(ref) // 2]
    rng = random.Random(3)
    for y in range(fy0, CH):
        t = min(1.0, (y - fy0) / (fy1 - fy0))
        for x in range(CW):
            o = kp[x, y]
            c = tuple(round(o[k] + (fill[k] - o[k]) * t) for k in range(3))
            if ch == 'moon' and y >= fy1 and rng.random() < 0.0012:
                c = (200, 205, 235)                  # a few stars in the night sky
            kp[x, y] = c
    sky.save(os.path.join(OUT, f'{ch}_sky.png'))

    # ---- mountains: the whole range as drawn, one piece (no cutting, no stretching)
    mh = cfg['mtn_h']
    s = mh / (hz - band_top)
    bw = round(SW * s)
    band_img = src.crop((0, band_top, SW, hz)).resize((bw, mh), Image.BOX)
    bp = band_img.load()
    m = Image.new('RGBA', (bw, mh), (0, 0, 0, 0))
    mp = m.load()
    for x in range(bw):
        t = (top[min(SW - 1, int(x / s))] - band_top) * s
        for y in range(mh):
            if y >= t:
                r, g, b = bp[x, y]
                mp[x, y] = (r, g, b, 255)
    m.save(os.path.join(OUT, f'{ch}_mtn_a.png'))
    m.transpose(Image.FLIP_LEFT_RIGHT).save(os.path.join(OUT, f'{ch}_mtn_b.png'))

    build_ground(ch, src, hz)
    print(f'{ch}: horizon {hz}, band {hz - band_top} rows -> {bw}x{mh}')


def build_ground(ch, src, hz):
    SW, SH = src.size
    # ---- ground
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
            for _ in range(grng.randint(2, 4)):
                if x < CW:
                    bp2[x, y] = c
                    x += 1
    for x in range(CW):
        bp2[x, 0] = gp[x % gw, 0]
        bp2[x, 1] = gp[x % gw, 1]
    base.save(os.path.join(OUT, f'{ch}_ground.png'))

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
        if f.startswith(f'{ch}_decor_'):
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
        spr.save(os.path.join(OUT, f'{ch}_decor_{made}.png'))
        if made == N_DECOR:
            break
    print(f'{ch}: ground {gw}x{GROUND_H}; decor {made}')




def build_rover(ch, cfg):
    im = Image.open(os.path.join(SRC, f'{ch}_rover.webp')).convert('RGBA')
    w, h = im.size
    px = im.load()
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

    B = cfg['grid']
    ox, oy = cfg['offset']
    nw, nh = int((w - ox) // B), int((h - oy) // B)
    art = Image.new('RGBA', (nw, nh), (0, 0, 0, 0))
    ap = art.load()
    for j in range(nh):
        for i in range(nw):
            xa, xb = int(ox + i * B), max(int(ox + i * B) + 1, int(ox + (i + 1) * B))
            ya, yb = int(oy + j * B), max(int(oy + j * B) + 1, int(oy + (j + 1) * B))
            cells = [px[a, b] for a in range(xa, min(xb, w)) for b in range(ya, min(yb, h))]
            col, _ = Counter(cells).most_common(1)[0]        # most common colour: crisp, no blending
            transparent = sum(1 for k in cells if k[3] < 128)
            ap[i, j] = (0, 0, 0, 0) if transparent > len(cells) / 2 else (col[0], col[1], col[2], 255)

    # wheels: column runs that are solid in the bottom quarter of the rover
    y0 = int(nh * 0.78)
    solid = [sum(1 for y in range(y0, nh) if ap[x, y][3]) >= (nh - y0) * 0.6 for x in range(nw)]
    wheels, x = [], 0
    while x < nw:
        if solid[x]:
            x1 = x
            while x1 < nw and solid[x1]:
                x1 += 1
            if x1 - x >= 5:
                cx = (x + x1 - 1) / 2
                r = (x1 - x) / 2
                cy = nh - 1 - r
                wheels.append((cx, cy, r))
            x = x1
        else:
            x += 1

    FW, FH = nw + 2, nh + 1
    strip = Image.new('RGBA', (FW * 4, FH), (0, 0, 0, 0))
    for f in range(4):
        fr = art.copy()
        d = ImageDraw.Draw(fr)
        for (cx, cy, r) in wheels:
            hub = ap[int(cx), int(cy)]
            mark = (40, 40, 48, 255) if lum(hub) > 120 else (175, 180, 192, 255)   # contrast with the tyre
            rr = r * 0.6
            for k in range(3):
                a = math.radians(f * 30 + k * 120)
                mx, my = round(cx + rr * math.cos(a)), round(cy + rr * math.sin(a))
                d.rectangle([mx - 1, my - 1, mx + 1, my + 1], fill=mark)
        strip.paste(fr, (f * FW + 1, FH - nh), fr)
    hard_alpha(strip).save(os.path.join(OUT, cfg['rover'] + '.png'))
    print(f'{ch} rover: grid {B}px -> art {nw}x{nh}, {len(wheels)} wheels, strip {strip.size}')

    if cfg.get('asleep'):
        # same rover, covered in dust and dimmed, for the end of the storm
        sl = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        sl.paste(art, (1, FH - nh), art)
        sp2 = sl.load()
        drng = random.Random(77)
        dust, pale = (168, 104, 63), (217, 160, 102)
        for y in range(FH):
            for x in range(FW):
                p = sp2[x, y]
                if p[3]:
                    c = tuple(round(p[k] + (dust[k] - p[k]) * 0.45) for k in range(3))
                    if drng.random() < 0.06:
                        c = pale
                    sp2[x, y] = c + (255,)
        sl.save(os.path.join(OUT, cfg['asleep'] + '.png'))


if __name__ == '__main__':
    which = sys.argv[1:] or list(CHAPTERS)
    for ch in which:
        build_background(ch, CHAPTERS[ch])
        build_rover(ch, CHAPTERS[ch])
