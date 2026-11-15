#!/usr/bin/env python3
"""Still Here: procedural pixel-art generator (README Section 13.2).

Draws every PNG in assets/ with hard-edged pixels (ImageDraw fill only, no
anti-aliasing, alpha is only ever 0 or 255). Fixed seeds, so reruns are
byte-identical. Needs Python 3 + Pillow. No network, no image services.

Usage:
    python3 tools/generate_art.py            # write every asset marked `ai` (or new)
    python3 tools/generate_art.py --force    # also overwrite files marked `human`
    python3 tools/generate_art.py --only flag,sun
    python3 tools/generate_art.py --check    # validate only, write nothing

Files whose ASSETS.md status is `human` are NEVER overwritten unless --force.
"""
import argparse
import math
import os
import random
import re
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSET_DIR = os.path.join(ROOT, 'assets')
ASSETS_MD = os.path.join(ROOT, 'ASSETS.md')
SHEET = os.path.join(ROOT, 'tools', 'contact_sheet.png')

# ---------------------------------------------------------------- palette
# One shared palette (README 13.2 hints plus a few extras for the sprites).
_HEX = {
    'OUT': '#14141f',   # sprite outline
    'SPACE': '#0b0b1a', 'SPACE2': '#12122a',
    'MG0': '#2b2b33', 'MG1': '#4a4a55', 'MG2': '#7b7b88', 'MG3': '#b9b9c4',
    'MR0': '#5a2a1c', 'MR1': '#8e4a2e', 'MR2': '#c26b3f', 'MR3': '#e8a46a',
    'SK1': '#f0b48a', 'SK2': '#d98a64',
    'MET1': '#c9ccd3', 'MET2': '#8a8f9b',
    'GOLD1': '#e8c34a', 'GOLD2': '#b58a1f',
    'SPARK': '#fff3a0',
    'RED': '#c2403a', 'BLUE': '#3a5fb0', 'WHITE': '#f4f1ea',
    'PANEL': '#4a78c8', 'PANEL_D': '#2f4f8a',
    'TAN': '#d9b98a', 'TAN_D': '#a8875c',
    'BROWN': '#3a2418', 'BROWN2': '#5c3a26',
    'ORANGE': '#e8803a', 'ORANGE_D': '#b85a38',
}


def _c(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


P = {k: _c(v) for k, v in _HEX.items()}
CLEAR = (0, 0, 0, 0)


# ---------------------------------------------------------------- helpers
def new(w, h, fill=CLEAR):
    return Image.new('RGBA', (w, h), fill)


def dr(img):
    d = ImageDraw.Draw(img)
    d.fontmode = '1'  # belt and braces: never anti-alias
    return d


def R(d, x0, y0, x1, y1, c):
    """Inclusive filled rectangle."""
    d.rectangle([x0, y0, x1, y1], fill=c)


def outline(img, color=None, r=1.0):
    """Add a hard dark outline around opaque pixels, inside the canvas."""
    color = color or P['OUT']
    w, h = img.size
    src = img.load()
    out = img.copy()
    po = out.load()
    n = int(math.ceil(r))
    offs = [(dx, dy) for dy in range(-n, n + 1) for dx in range(-n, n + 1)
            if (dx or dy) and dx * dx + dy * dy <= r * r + 1e-6]
    for y in range(h):
        for x in range(w):
            if src[x, y][3] == 0:
                for dx, dy in offs:
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h and src[xx, yy][3] == 255:
                        po[x, y] = color
                        break
    return out


def paste(dst, src, x, y):
    """Paste only opaque pixels (no blending, so alpha stays 0/255)."""
    dst.paste(src, (x, y), src)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(4))


def sparkle(d, x, y, c, big=False):
    d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=c)
    if big:
        d.point([(x - 2, y), (x + 2, y), (x, y - 2), (x, y + 2)], fill=c)


def ell_rot(img, cx, cy, a, b, theta, color):
    """Hard-edged rotated ellipse (a along angle theta, b perpendicular)."""
    px = img.load()
    w, h = img.size
    ct, st = math.cos(theta), math.sin(theta)
    for y in range(h):
        for x in range(w):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            u = dx * ct + dy * st
            v = -dx * st + dy * ct
            if (u / a) ** 2 + (v / b) ** 2 <= 1.0:
                px[x, y] = color


# ---------------------------------------------------------------- rovers
# Strip frame sizes follow the README contract: frame width = imageWidth / 4.
def moon_buggy_frame(f):
    """16x16 outlined side view of the Apollo rover. f = 0..3 spokes at 0/45/90/135 deg."""
    im = new(16, 16)
    d = dr(im)
    # wheels: 5x5 dark tire discs with one rotating light spoke
    ang = f * math.pi / 4
    for cx in (3, 12):
        d.ellipse([cx - 2, 10, cx + 2, 14], fill=P['MG1'])
        sx, sy = round(2 * math.cos(ang)), round(2 * math.sin(ang))
        d.line([(cx - sx, 12 - sy), (cx + sx, 12 + sy)], fill=P['MET1'])
        d.point([(cx, 12)], fill=P['MG0'])
    # chassis
    R(d, 3, 8, 12, 8, P['MET1'])
    R(d, 3, 9, 12, 9, P['MET2'])
    # two seats (back + cushion)
    R(d, 3, 4, 3, 7, P['MET1'])
    R(d, 3, 7, 5, 7, P['MET2'])
    R(d, 7, 4, 7, 7, P['MET1'])
    R(d, 7, 7, 9, 7, P['MET2'])
    # gold-foil battery box
    R(d, 10, 6, 12, 7, P['GOLD1'])
    R(d, 10, 7, 12, 7, P['GOLD2'])
    # dish antenna on a mast
    R(d, 12, 3, 12, 5, P['MET2'])
    R(d, 11, 2, 13, 2, P['MET1'])
    d.point([(12, 1)], fill=P['MET1'])
    # front fender
    d.point([(13, 7)], fill=P['MET2'])
    return outline(im)


def mars_rover_frame(f):
    """14x15 outlined side view of Opportunity. f = 0..3 wheel spoke position."""
    im = new(14, 15)
    d = dr(im)
    # mast with camera head
    R(d, 10, 3, 10, 4, P['MET1'])
    R(d, 9, 1, 11, 2, P['MET2'])
    d.point([(11, 2)], fill=P['OUT'])
    # solar panel
    R(d, 1, 5, 12, 5, P['PANEL'])
    R(d, 1, 6, 12, 6, P['PANEL_D'])
    # tan body
    R(d, 2, 7, 11, 9, P['TAN'])
    R(d, 2, 9, 11, 9, P['TAN_D'])
    d.point([(4, 8), (5, 8)], fill=P['MG1'])
    # rocker bar
    R(d, 2, 10, 10, 10, P['MET2'])
    # three visible wheels (six in total), one lit spoke rolls round
    for wx in (1, 5, 9):
        R(d, wx, 11, wx + 2, 13, P['MG1'])
        lit = [(wx + 1, 11), (wx + 2, 12), (wx + 1, 13), (wx, 12)][f % 4]
        d.point([(wx + 1, 12)], fill=P['MG0'])
        d.point([lit], fill=P['MET1'])
    return outline(im)


def dust_tint(img, seed, amount=0.55):
    """Blend opaque pixels toward dusty orange-brown with seeded speckle."""
    rng = random.Random(seed)
    px = img.load()
    dust = _c('#a8683f')
    pale = _c('#d9a066')
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            if px[x, y][3] == 255:
                c = lerp(px[x, y], dust, amount)
                if rng.random() < 0.22:
                    c = pale
                px[x, y] = c
    return img


def mars_rover_asleep():
    """56x40 single frame, same rover but big, dusty and with its mast drooped."""
    im = new(56, 40)
    d = dr(im)
    # wheels
    for cx in (7, 27, 47):
        d.ellipse([cx - 4, 30, cx + 3, 37], fill=P['MG1'])
        d.ellipse([cx - 2, 32, cx + 1, 35], fill=P['MET2'])
        d.point([(cx, 33)], fill=P['MG0'])
    # rocker + struts
    R(d, 6, 26, 48, 28, P['MET2'])
    for cx in (7, 27, 47):
        d.line([(cx, 28), (cx, 32)], fill=P['MET2'], width=2)
    # body
    R(d, 8, 15, 47, 26, P['TAN'])
    R(d, 8, 24, 47, 26, P['TAN_D'])
    R(d, 12, 18, 21, 22, P['MG1'])
    R(d, 26, 18, 28, 19, P['MG1'])
    # solar panel with cell lines
    d.polygon([(2, 9), (53, 9), (49, 15), (6, 15)], fill=P['PANEL'])
    for x in range(10, 50, 9):
        d.line([(x, 10), (x - 1, 14)], fill=P['PANEL_D'])
    R(d, 6, 14, 49, 15, P['PANEL_D'])
    # drooping mast + head tilted down
    d.line([(44, 8), (49, 5)], fill=P['MET1'], width=2)
    R(d, 48, 2, 54, 6, P['MET2'])
    R(d, 53, 4, 54, 5, P['OUT'])
    dust_tint(im, 77)
    # a few dust drifts on the panel
    rng = random.Random(78)
    for _ in range(28):
        x, y = rng.randint(4, 50), rng.randint(9, 14)
        if im.getpixel((x, y))[3] == 255:
            im.putpixel((x, y), _c('#d9a066'))
    return outline(im, P['BROWN'])


# ---------------------------------------------------------------- hardware
def landing_stage():
    im = new(96, 80)
    d = dr(im)
    rng = random.Random(11)
    for (x0, y0, x1, y1) in [(20, 50, 6, 74), (34, 52, 28, 74), (62, 52, 68, 74), (76, 50, 90, 74)]:
        d.line([(x0, y0), (x1, y1)], fill=P['MET2'], width=3)
        R(d, x1 - 3, y1, x1 + 3, y1 + 3, P['MET1'])
    # engine nozzle underneath
    d.polygon([(40, 52), (56, 52), (62, 68), (34, 68)], fill=P['MG1'])
    R(d, 33, 68, 63, 71, P['MG0'])
    R(d, 38, 56, 40, 66, P['MG2'])
    # octagonal gold-foil base
    d.polygon([(22, 10), (74, 10), (90, 24), (90, 46), (74, 56), (22, 56), (6, 46), (6, 24)], fill=P['GOLD1'])
    d.polygon([(6, 40), (90, 40), (90, 46), (74, 56), (22, 56), (6, 46)], fill=P['GOLD2'])
    R(d, 22, 10, 74, 13, P['MET1'])  # cut edge where the top half left
    for x in (14, 30, 48, 66, 82):
        d.line([(x, 14), (x, 38)], fill=P['GOLD2'])
    # crinkled foil glints
    px = im.load()
    for _ in range(70):
        x, y = rng.randint(8, 88), rng.randint(15, 54)
        if px[x, y] == P['GOLD1']:
            px[x, y] = P['SPARK'] if rng.random() < 0.4 else P['GOLD2']
    return outline(im)


def flag():
    im = new(24, 48)
    d = dr(im)
    d.ellipse([0, 43, 23, 47], fill=P['MG2'])
    d.line([(2, 44), (21, 44)], fill=P['MG3'])
    R(d, 3, 2, 4, 44, P['MET1'])
    R(d, 3, 1, 4, 1, P['GOLD1'])
    px = im.load()
    for x in range(5, 22):
        yo = round(1.6 * math.sin((x - 5) / 2.6))
        for y in range(3, 17):
            if x <= 11 and y <= 9:
                c = P['BLUE']
            else:
                c = P['RED'] if ((y - 3) // 2) % 2 == 0 else P['WHITE']
            px[x, y + yo] = c
        # little shaded fold every few columns
    for (x, y) in [(7, 4), (9, 6), (7, 8), (10, 8)]:
        yo = round(1.6 * math.sin((x - 5) / 2.6))
        px[x, y + yo] = P['WHITE']
    return outline(im)


def science_station():
    im = new(64, 48)
    d = dr(im)
    # main box
    R(d, 4, 22, 30, 40, P['MG2'])
    R(d, 4, 22, 30, 24, P['MG3'])
    R(d, 4, 38, 30, 40, P['MG1'])
    R(d, 8, 27, 16, 34, P['GOLD1'])
    R(d, 8, 33, 16, 34, P['GOLD2'])
    for y in (27, 30, 33):
        R(d, 20, y, 27, y, P['MG1'])
    # dish on a pole
    R(d, 17, 10, 18, 21, P['MET2'])
    d.ellipse([10, 5, 25, 11], fill=P['MET1'])
    d.ellipse([12, 6, 23, 9], fill=P['MG1'])
    R(d, 17, 2, 18, 6, P['MET2'])
    # short mast with a sensor head
    R(d, 46, 14, 47, 40, P['MET2'])
    R(d, 43, 9, 50, 14, P['MG2'])
    R(d, 44, 11, 45, 12, P['MET1'])
    R(d, 42, 38, 51, 40, P['MG1'])
    d.line([(30, 38), (42, 39)], fill=P['MG0'])
    # instruments on the ground
    d.ellipse([54, 32, 62, 40], fill=P['MET1'])
    R(d, 53, 38, 63, 41, P['MG1'])
    R(d, 34, 36, 40, 41, P['GOLD1'])
    R(d, 34, 40, 40, 41, P['GOLD2'])
    return outline(im)


def laser_mirror():
    im = new(32, 32)
    d = dr(im)
    # tray lying back on two short prop legs (so it does not read as a screen)
    tl, tr, br, bl = (3, 12), (29, 8), (29, 20), (3, 24)
    R(d, 6, 24, 8, 29, P['MG1'])
    R(d, 24, 21, 26, 29, P['MG1'])
    R(d, 4, 29, 28, 30, P['MG2'])
    d.polygon([(tl[0], tl[1] + 3), (tr[0], tr[1] + 3), (br[0], br[1] + 3), (bl[0], bl[1] + 3)], fill=P['MG1'])
    d.polygon([tl, tr, br, bl], fill=P['GOLD2'])  # gold-ish rim so it pops

    def pt(u, v):
        top = (tl[0] + (tr[0] - tl[0]) * u, tl[1] + (tr[1] - tl[1]) * u)
        bot = (bl[0] + (br[0] - bl[0]) * u, bl[1] + (br[1] - bl[1]) * u)
        return top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v

    sky = _c('#cfe3ff')
    for i in range(6):
        for j in range(3):
            u = 0.08 + 0.84 * (i + 0.5) / 6
            v = 0.14 + 0.72 * (j + 0.5) / 3
            x, y = pt(u, v)
            x, y = int(round(x)), int(round(y))
            R(d, x - 1, y - 1, x + 1, y, P['WHITE'] if (i + j) % 2 == 0 else sky)
            d.point([(x + 1, y)], fill=P['MET2'])
    return outline(im)


def rover_sign():
    im = new(32, 24)
    d = dr(im)
    R(d, 3, 21, 28, 22, P['MG1'])  # little shadow ledge
    R(d, 2, 3, 29, 20, P['MET1'])
    R(d, 4, 5, 27, 18, P['MG1'])
    for y, ln in ((7, 20), (10, 16), (13, 19), (16, 11)):
        R(d, 6, y, 6 + ln - 1, y, P['MG3'])  # abstract "text", not readable
    d.point([(3, 4), (28, 4), (3, 19), (28, 19)], fill=P['MET2'])
    return outline(im)


def landing_platform():
    im = new(96, 48)
    d = dr(im)
    rng = random.Random(21)
    # folded petals either side
    d.polygon([(3, 38), (14, 26), (30, 26), (30, 38)], fill=P['MET2'])
    d.polygon([(66, 38), (66, 26), (82, 26), (93, 38)], fill=P['MET2'])
    d.line([(14, 26), (30, 38)], fill=P['MET1'])
    d.line([(82, 26), (66, 38)], fill=P['MET1'])
    # central tetrahedron with the rover bay
    d.polygon([(26, 14), (70, 14), (76, 38), (20, 38)], fill=P['MET1'])
    d.polygon([(48, 14), (70, 14), (76, 38), (48, 38)], fill=P['MET2'])
    R(d, 34, 17, 62, 24, P['MG1'])
    R(d, 36, 19, 60, 22, P['MG0'])
    R(d, 44, 27, 52, 32, P['GOLD1'])
    R(d, 44, 31, 52, 32, P['GOLD2'])
    # base lip
    R(d, 8, 38, 88, 41, P['MG2'])
    # crumpled airbag fabric at the base
    for cx, cy, rx, ry in [(10, 43, 9, 4), (30, 44, 11, 3), (60, 44, 12, 3), (84, 43, 10, 4)]:
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=P['WHITE'])
        d.ellipse([cx - rx + 2, cy - ry + 2, cx + rx - 2, cy + ry], fill=P['MG3'])
    px = im.load()
    for _ in range(14):
        x, y = rng.randint(2, 92), rng.randint(40, 46)
        if px[x, y][3]:
            px[x, y] = P['MG2']
    return outline(im)


def cone():
    im = new(64, 64)
    d = dr(im)
    ax, ay = 56, 10
    cx, cy = 20, 50
    vx, vy = ax - cx, ay - cy
    n = math.hypot(vx, vy)
    vx, vy = vx / n, vy / n
    px_, py_ = -vy, vx  # perpendicular
    R_ = 17
    p1 = (cx + R_ * px_, cy + R_ * py_)
    p2 = (cx - R_ * px_, cy - R_ * py_)
    d.polygon([(ax, ay), p1, p2], fill=P['MET1'])
    d.polygon([(ax, ay), p1, (cx, cy)], fill=P['MET2'])
    for t in (0.35, 0.6):  # ribs
        bx, by = ax + (cx - ax) * t, ay + (cy - ay) * t
        d.line([(bx + px_ * R_ * t * 0.9, by + py_ * R_ * t * 0.9),
                (bx - px_ * R_ * t * 0.9, by - py_ * R_ * t * 0.9)], fill=P['MG2'])
    theta = math.atan2(py_, px_)
    ell_rot(im, cx, cy, R_, 5, theta, P['MG1'])      # darker rim
    ell_rot(im, cx, cy, R_ - 2, 3.2, theta, P['MG0'])  # hollow inside
    for (x, y) in [(40, 22), (36, 30), (30, 36), (44, 18)]:
        im.putpixel((x, y), P['MG2'])
    return outline(im)


def parachute():
    im = new(96, 64)
    d = dr(im)
    rng = random.Random(31)
    lobes = [(28, 40, 22, 14), (50, 34, 24, 18), (70, 42, 20, 12), (40, 24, 16, 9),
             (62, 26, 14, 8), (12, 46, 12, 8), (80, 36, 10, 7)]
    px = im.load()
    for y in range(64):
        for x in range(96):
            if any(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 for cx, cy, rx, ry in lobes):
                a = math.atan2(y - 36, x - 48)
                stripe = int((a + math.pi) / (2 * math.pi) * 12) % 2
                shade = y > 46
                if stripe:
                    px[x, y] = P['ORANGE_D'] if shade else P['ORANGE']
                else:
                    px[x, y] = P['MG3'] if shade else P['WHITE']
    # crumple folds
    for _ in range(18):
        x, y = rng.randint(14, 84), rng.randint(22, 52)
        for k in range(rng.randint(3, 6)):
            if 0 <= x + k < 96 and px[x + k, y][3]:
                px[x + k, y + (k // 3)] = P['MG1']
    # suspension lines gathered to a knot
    for sx, sy in [(66, 44), (72, 48), (78, 46), (84, 40), (60, 50)]:
        d.line([(sx, sy), (90, 56)], fill=P['MG1'])
    R(d, 88, 54, 92, 58, P['MET2'])
    return outline(im)


def heat_shield_pieces():
    rng = random.Random(41)

    def piece(poly, seed):
        im = new(64, 40)
        d = dr(im)
        d.polygon(poly, fill=P['BROWN2'])
        r2 = random.Random(seed)
        px = im.load()
        for y in range(40):
            for x in range(64):
                if px[x, y] == P['BROWN2']:
                    t = r2.random()
                    if t < 0.12:
                        px[x, y] = P['BROWN']
                    elif t < 0.17:
                        px[x, y] = P['MG1']
        # scorched edge along the top curve of the dish
        for x in range(64):
            for y in range(40):
                if px[x, y][3] and (y == 0 or px[x, y - 1][3] == 0):
                    px[x, y] = P['MG1']
                    if y + 1 < 40 and px[x, y + 1][3]:
                        px[x, y + 1] = P['BROWN']
                    break
        return outline(im)

    a = piece([(2, 32), (4, 18), (12, 9), (26, 5), (42, 7), (56, 14), (61, 24), (52, 22), (47, 30),
               (40, 24), (33, 33), (26, 27), (18, 35), (10, 30)], 42)
    b = piece([(6, 22), (14, 14), (28, 10), (44, 14), (54, 22), (48, 28), (38, 24), (30, 31),
               (22, 26), (12, 30)], 43)
    return a, b


def space_rock():
    im = new(24, 20)
    rng = random.Random(51)
    d = dr(im)
    pts = []
    for i in range(14):
        a = i / 14 * 2 * math.pi
        r = 1 + rng.uniform(-0.12, 0.12)
        pts.append((12 + 9.5 * r * math.cos(a), 10.5 + 7.5 * r * math.sin(a)))
    d.polygon(pts, fill=P['MG1'])
    px = im.load()
    for y in range(20):
        for x in range(24):
            if px[x, y] == P['MG1']:
                if (x - 12) + (y - 10) > 7:
                    px[x, y] = P['MG0']
                elif (x - 12) + (y - 10) < -6 and rng.random() < 0.8:
                    px[x, y] = P['MG3'] if rng.random() < 0.5 else P['MG2']
    for (x, y) in [(10, 9), (14, 12), (8, 12), (15, 8)]:  # pits
        if px[x, y][3]:
            px[x, y] = P['MG0']
    return outline(im)


def sun():
    im = new(48, 48)
    d = dr(im)
    cx = cy = 24
    # dithered glow
    for y in range(48):
        for x in range(48):
            r = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if 14 < r < 21 and (x + y) % 2 == 0:
                im.putpixel((x, y), _c('#f6e08a'))
            elif 14 < r < 18 and (x % 2 == 0 and y % 2 == 0):
                im.putpixel((x, y), _c('#f6e08a'))
    # stepped rays
    for ang in range(0, 360, 45):
        a = math.radians(ang)
        for rr in range(15, 22):
            x = int(round(cx + rr * math.cos(a)))
            y = int(round(cy + rr * math.sin(a)))
            R(d, x - 1, y - 1, x, y, P['GOLD1'] if rr < 20 else P['GOLD2'])
    d.ellipse([cx - 12, cy - 12, cx + 11, cy + 11], fill=P['GOLD2'])
    d.ellipse([cx - 11, cy - 11, cx + 10, cy + 10], fill=P['GOLD1'])
    d.ellipse([cx - 8, cy - 9, cx + 4, cy + 1], fill=P['SPARK'])
    return im


# ---------------------------------------------------------------- backgrounds
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def banded_sky(w, h, colors, dither=True):
    im = new(w, h)
    px = im.load()
    n = len(colors)
    for y in range(h):
        v = y * n / h
        i = min(int(v), n - 1)
        f = v - i
        t = max(0.0, (f - 0.55) / 0.45)  # dither only in the last 45% of a band
        for x in range(w):
            j = min(i + 1, n - 1)
            use_next = dither and t * 16 > BAYER[y % 4][x % 4]
            px[x, y] = colors[j] if use_next else colors[i]
    return im


def moon_sky():
    return banded_sky(480, 270, [P['SPACE'], P['SPACE'], P['SPACE2'], _c('#181838'), _c('#1c1c40')])


def mars_sky():
    cols = [_c(h) for h in ('#b85a38', '#cc6e46', '#d98a64', '#e49c74', '#f0b48a', '#f6c7a2', '#f9d6b6')]
    return banded_sky(480, 270, cols)


def hill_layers(w, h, layers, seed):
    im = new(w, h)
    px = im.load()
    rng = random.Random(seed)
    for base, terms, col, hl, tex in layers:
        ys = []
        for x in range(w):
            y = base + sum(a * math.sin(2 * math.pi * k * x / w + ph) for k, a, ph in terms)
            ys.append(int(round(y)))
        for x in range(w):
            for y in range(max(ys[x], 0), h):
                px[x, y] = col
            px[x, max(ys[x], 0)] = hl
        # surface texture: scattered darker/lighter speckles under the ridge
        for _ in range(w * 2):
            x = rng.randrange(w)
            y = ys[x] + rng.randint(2, 40)
            if y < h and px[x, y] == col:
                px[x, y] = tex
    return im


def moon_hills():
    return hill_layers(960, 270, [
        (130, [(2, 18, 0.3), (3, 10, 1.7), (5, 6, 2.5), (7, 3, 0.9)], P['MG0'], P['MG1'], P['SPACE2']),
        (172, [(3, 10, 2.2), (4, 8, 0.4), (6, 5, 1.1), (9, 3, 3.0)], P['MG1'], P['MG2'], P['MG0']),
    ], 61)


def mars_hills():
    return hill_layers(960, 270, [
        (138, [(2, 16, 1.1), (3, 9, 0.2), (5, 6, 2.0), (8, 3, 1.3)], P['SK2'], P['SK1'], P['MR3']),
        (176, [(3, 12, 0.5), (4, 8, 2.6), (6, 5, 0.3), (10, 3, 1.9)], P['MR2'], P['MR3'], P['MR1']),
    ], 62)


def wrapped(w, cx, fn):
    """Call fn(x) for cx and its wrapped copies so shapes tile across the seam."""
    for off in (-w, 0, w):
        fn(cx + off)


def moon_ground():
    w, h = 480, 64
    im = new(w, h, P['MG2'])
    px = im.load()
    d = dr(im)
    rng = random.Random(71)
    # soft banding + speckle (per-pixel random, so the seam is invisible)
    for y in range(h):
        for x in range(w):
            r = rng.random()
            if r < 0.07:
                px[x, y] = P['MG1']
            elif r < 0.10:
                px[x, y] = P['MG3']
    # wavy dark bands that wrap exactly
    for k, ph, y0 in [(5, 0.4, 24), (8, 2.0, 42)]:
        for x in range(w):
            y = int(round(y0 + 2 * math.sin(2 * math.pi * k * x / w + ph)))
            px[x, y] = P['MG1']
            if x % 3:
                px[x, y + 1] = P['MG1']
    # craters
    for cx, cy, rx, ry in [(60, 30, 18, 6), (170, 48, 12, 4), (260, 22, 9, 3), (340, 40, 22, 7), (430, 28, 14, 5), (110, 56, 8, 3)]:
        def draw(x, cy=cy, rx=rx, ry=ry):
            d.ellipse([x - rx, cy - ry, x + rx, cy + ry], fill=P['MG3'])
            d.ellipse([x - rx + 1, cy - ry + 1, x + rx - 1, cy + ry], fill=P['MG1'])
            d.ellipse([x - rx + 3, cy - ry + 2, x + rx - 1, cy + ry - 1], fill=P['MG0'])
        wrapped(w, cx, draw)
    # pebbles
    for _ in range(40):
        x, y = rng.randrange(w), rng.randint(6, 62)
        R(d, x, y, x + 1, y, P['MG3'])
        d.point([(x, y + 1), (x + 1, y + 1)], fill=P['MG0'])
    R(d, 0, 0, w - 1, 0, P['MG3'])  # bright horizon edge
    R(d, 0, 1, w - 1, 1, P['MG2'])
    return im


def mars_ground():
    w, h = 480, 64
    im = new(w, h, P['MR1'])
    px = im.load()
    d = dr(im)
    rng = random.Random(72)
    for y in range(h):
        for x in range(w):
            r = rng.random()
            if r < 0.06:
                px[x, y] = P['MR2']
            elif r < 0.085:
                px[x, y] = P['MR0']
    # sand ripples (period divides the width so they wrap)
    for k, ph, y0 in [(6, 0.0, 14), (9, 1.0, 26), (7, 2.2, 38), (11, 0.6, 50), (8, 1.7, 59)]:
        for x in range(w):
            y = int(round(y0 + 2 * math.sin(2 * math.pi * k * x / w + ph)))
            px[x, y] = P['MR3']
            px[x, y + 1] = P['MR0']
    # little rocks with a shadow
    for cx, cy, rx, ry in [(50, 22, 7, 4), (150, 46, 5, 3), (235, 30, 9, 5), (320, 54, 6, 3), (400, 18, 6, 3), (445, 40, 8, 4)]:
        def draw(x, cy=cy, rx=rx, ry=ry):
            d.ellipse([x - rx, cy - ry + 2, x + rx + 1, cy + ry + 2], fill=P['MR0'])
            d.ellipse([x - rx, cy - ry, x + rx, cy + ry], fill=P['MR2'])
            d.ellipse([x - rx + 1, cy - ry, x + rx - 2, cy], fill=P['MR3'])
        wrapped(w, cx, draw)
    R(d, 0, 0, w - 1, 0, P['MR3'])
    R(d, 0, 1, w - 1, 1, P['MR2'])
    return im


# ---------------------------------------------------------------- patches
def _patch(ring, stitch, inner_fn, edge=None, glow=False):
    im = new(64, 64, P['SPACE'])
    d = dr(im)
    inner_fn(im, d)
    px = im.load()
    for y in range(64):
        for x in range(64):
            dx, dy = x + 0.5 - 32, y + 0.5 - 32
            r = math.hypot(dx, dy)
            if r > 32:
                px[x, y] = CLEAR
            elif r > 30.2:
                if glow:
                    px[x, y] = P['SPARK'] if (x + y) % 2 == 0 else P['GOLD2']
                else:
                    px[x, y] = edge or P['OUT']
            elif r > 24.8:
                a = math.atan2(dy, dx)
                if 27.0 < r < 28.8 and int((a + math.pi) / (2 * math.pi) * 36) % 2 == 0:
                    px[x, y] = stitch
                else:
                    px[x, y] = ring
            elif r > 24:
                px[x, y] = P['OUT']
    return im


def patch_moon():
    def inner(im, d):
        rng = random.Random(81)
        for _ in range(14):
            d.point([(rng.randint(10, 54), rng.randint(10, 40))], fill=P['SPARK'])
        d.ellipse([22, 10, 42, 30], fill=P['MG3'])
        px = im.load()
        for y in range(10, 31):
            for x in range(22, 43):
                if px[x, y] == P['MG3'] and (x - 32) + (y - 20) > 9:
                    px[x, y] = P['MG2']
        for (cx, cy, r) in [(28, 16, 2), (36, 22, 3), (31, 25, 1)]:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=P['MG2'])
        R(d, 0, 46, 63, 63, P['MG1'])
        R(d, 0, 46, 63, 46, P['MG2'])
        paste(im, moon_buggy_frame(0), 24, 32)
    return _patch(P['MG3'], P['MG1'], inner)


def patch_mars():
    def inner(im, d):
        rng = random.Random(82)
        for _ in range(12):
            d.point([(rng.randint(10, 54), rng.randint(10, 40))], fill=P['SPARK'])
        d.ellipse([21, 9, 43, 31], fill=P['MR2'])
        px = im.load()
        for y in range(9, 32):
            for x in range(21, 44):
                if px[x, y] == P['MR2']:
                    if (x - 32) + (y - 20) > 10:
                        px[x, y] = P['MR1']
                    elif y in (16, 17, 23):
                        px[x, y] = P['MR3']
        R(d, 28, 10, 35, 11, P['WHITE'])
        R(d, 0, 46, 63, 63, P['MR1'])
        R(d, 0, 46, 63, 46, P['MR3'])
        paste(im, mars_rover_frame(0), 25, 33)
    return _patch(P['MR3'], P['MR0'], inner)


def patch_gold():
    def inner(im, d):
        rng = random.Random(83)
        for _ in range(16):
            d.point([(rng.randint(8, 56), rng.randint(8, 56))], fill=P['SPARK'])
        d.ellipse([12, 12, 32, 32], fill=P['MG3'])
        for (cx, cy, r) in [(18, 18, 2), (26, 25, 3), (20, 28, 1)]:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=P['MG2'])
        d.ellipse([28, 26, 54, 52], fill=P['OUT'])
        d.ellipse([29, 27, 53, 51], fill=P['MR2'])
        px = im.load()
        for y in range(27, 52):
            for x in range(29, 54):
                if px[x, y] == P['MR2']:
                    if (x - 41) + (y - 39) > 12:
                        px[x, y] = P['MR1']
                    elif y in (33, 34, 41):
                        px[x, y] = P['MR3']
        R(d, 36, 28, 46, 29, P['WHITE'])
        sparkle(d, 50, 16, P['SPARK'], True)
        sparkle(d, 12, 44, P['SPARK'])
    return _patch(P['GOLD1'], P['GOLD2'], inner, glow=True)


# ---------------------------------------------------------------- UI
def arrow_button(pressed):
    im = new(96, 96)
    d = dr(im)
    face = P['MR2'] if pressed else P['ORANGE']
    lip = P['MR0'] if pressed else P['MR1']
    top = 5 if pressed else 3
    # dark base lip (bottom edge stays at y=93 in both states)
    d.rounded_rectangle([3, 9, 92, 93], radius=18, fill=lip)
    d.rounded_rectangle([3, top, 92, top + 84], radius=18, fill=face)
    # soft highlight
    if not pressed:
        R(d, 14, top + 3, 70, top + 5, P['SK1'])
        R(d, 8, top + 10, 10, top + 40, P['SK1'])
    # right-pointing arrow
    cy = top + 42
    ac = P['WHITE']
    d.polygon([(52, cy - 22), (78, cy), (52, cy + 22)], fill=ac)
    R(d, 22, cy - 8, 54, cy + 8, ac)
    # chunky arrow edge
    d.line([(22, cy + 8), (54, cy + 8), (54, cy + 22)], fill=P['MG3'])
    return outline(im)


# 5x7 pixel font for the logo (original lettering)
GLYPHS = {
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    't': ['.#..', '####', '.#..', '.#..', '.#..', '.#..', '..##'],
    'i': ['#', '.', '#', '#', '#', '#', '#'],
    'l': ['#', '#', '#', '#', '#', '#', '#'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'e': ['....', '....', '.##.', '#..#', '####', '#...', '.###'],
    'r': ['....', '....', '#.##', '##..', '#...', '#...', '#...'],
    ' ': ['..', '..', '..', '..', '..', '..', '..'],
}


# Chunky uppercase pixel font (9 rows, 2-pixel strokes, clipped corners), in the style of
# classic arcade title screens. Used for the logo and the START button.
BIG = {
    'S': ['.######.', '########', '##......', '#######.', '.#######', '......##', '......##', '########', '.######.'],
    'T': ['########', '########', '...##...', '...##...', '...##...', '...##...', '...##...', '...##...', '...##...'],
    'I': ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..', '######', '######'],
    'L': ['##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '#######', '.######'],
    'H': ['##....##', '##....##', '##....##', '########', '########', '##....##', '##....##', '##....##', '##....##'],
    'E': ['.######', '#######', '##.....', '##.....', '######.', '######.', '##.....', '#######', '.######'],
    'R': ['#######.', '########', '##....##', '##....##', '########', '#######.', '##..##..', '##...##.', '##....##'],
    'A': ['.######.', '########', '##....##', '##....##', '########', '########', '##....##', '##....##', '##....##'],
}


def big_text(img, word, x0, y0, scale, color):
    """Draw `word` in the BIG font at scale. `color` is one colour, or a function
    (yy, scale) -> colour that shades each font pixel by its row inside the block."""
    px = img.load()
    cx = 0
    for ch in word:
        g = BIG[ch]
        for ry, row in enumerate(g):
            for rx, c in enumerate(row):
                if c == '#':
                    for yy in range(scale):
                        for xx in range(scale):
                            px[x0 + (cx + rx) * scale + xx, y0 + ry * scale + yy] = color(yy, scale) if callable(color) else color
        cx += len(g[0]) + 1


def big_width(word, scale):
    return (sum(len(BIG[ch][0]) + 1 for ch in word) - 1) * scale


def logo():
    """240x80: STILL over HERE in chunky letters with the original gold fill
    (light top edge, gold body, darker bottom edge on every font pixel), a thin dark
    outline and four sparkles around the title."""
    S = 4
    layer = new(240, 80)
    def gold(yy, scale):
        return P['SPARK'] if yy == 0 else (P['GOLD2'] if yy == scale - 1 else P['GOLD1'])
    h = 9 * S
    gap = 4
    top = (80 - (2 * h + gap)) // 2
    for k, word in enumerate(('STILL', 'HERE')):
        big_text(layer, word, (240 - big_width(word, S)) // 2, top + k * (h + gap), S, gold)
    im = outline(layer, _c('#1a2458'), 1.5)   # 1 px border in the cover's sky blue, so it blends in
    d = dr(im)
    sparkle(d, 22, 14, P['SPARK'], True)
    sparkle(d, 218, 10, P['SPARK'])
    sparkle(d, 214, 68, P['SPARK'], True)
    sparkle(d, 26, 66, P['SPARK'])
    return im


def start_button():
    """104x30 pill: sunset gradient (yellow, orange, pink), dark purple rim, START in purple."""
    W, H = 104, 30
    im = new(W, H)
    d = dr(im)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=12, fill=_c('#2a0d3a'))
    mask = new(W, H)
    dr(mask).rounded_rectangle([2, 2, W - 3, H - 3], radius=10, fill=_c('#ffffff'))
    bands = ['#fff6a6', '#fff6a6', '#ffe14a', '#ffe14a', '#ffe14a', '#ffd23f', '#ffd23f', '#ffc23a', '#ffc23a',
             '#ffb03a', '#ffb03a', '#ff9a3c', '#ff9a3c', '#ff8846', '#ff8846', '#ff7552', '#ff7552', '#ff6560',
             '#ff6560', '#ff586e', '#ff586e', '#ff4f7c', '#ff4f7c', '#ff4888', '#ff4888', '#ff4888', '#ff4888',
             '#e8407e', '#d93a7a', '#d93a7a']
    px, mk = im.load(), mask.load()
    for y in range(2, H - 2):
        col = _c(bands[min(y - 2, len(bands) - 1)])
        for x in range(W):
            if mk[x, y][3]:
                px[x, y] = col
    d.rectangle([10, 4, 17, 5], fill=_c('#ffffff'))   # small glint, top left
    S = 2
    tw = big_width('START', S)
    big_text(im, 'START', (W - tw) // 2, (H - 9 * S) // 2, S, _c('#5b1260'))
    return im


# ---------------------------------------------------------------- registry
def strip(frame_fn, fw, fh, n=4, y_off=0):
    im = new(fw * n, fh)
    for f in range(n):
        paste(im, frame_fn(f), f * fw, fh - frame_fn(f).size[1] - y_off)
    return im


def build():
    hs_a, hs_b = heat_shield_pieces()
    # name -> (size, image)
    return {
        'moon_buggy': ((64, 40), strip(moon_buggy_frame, 16, 40)),
        'mars_rover': ((56, 40), strip(mars_rover_frame, 14, 40)),
        'mars_rover_asleep': ((56, 40), mars_rover_asleep()),
        'landing_stage': ((96, 80), landing_stage()),
        'flag': ((24, 48), flag()),
        'science_station': ((64, 48), science_station()),
        'laser_mirror': ((32, 32), laser_mirror()),
        'rover_sign': ((32, 24), rover_sign()),
        'landing_platform': ((96, 48), landing_platform()),
        'cone': ((64, 64), cone()),
        'parachute': ((96, 64), parachute()),
        'heat_shield_a': ((64, 40), hs_a),
        'heat_shield_b': ((64, 40), hs_b),
        'space_rock': ((24, 20), space_rock()),
        'sun': ((48, 48), sun()),
        'moon_sky': ((480, 270), moon_sky()),
        'moon_hills': ((960, 270), moon_hills()),
        'moon_ground': ((480, 64), moon_ground()),
        'mars_sky': ((480, 270), mars_sky()),
        'mars_hills': ((960, 270), mars_hills()),
        'mars_ground': ((480, 64), mars_ground()),
        'patch_moon': ((64, 64), patch_moon()),
        'patch_mars': ((64, 64), patch_mars()),
        'patch_gold': ((64, 64), patch_gold()),
        'arrow_up': ((96, 96), arrow_button(False)),
        'arrow_down': ((96, 96), arrow_button(True)),
        'logo': ((240, 80), logo()),
        'start_button': ((104, 30), start_button()),
    }


# ---------------------------------------------------------------- ASSETS.md
def read_status():
    status = {}
    if os.path.exists(ASSETS_MD):
        for line in open(ASSETS_MD, encoding='utf-8'):
            m = re.match(r'\|\s*`?([a-z0-9_]+\.png)`?\s*\|\s*([^|]*)\|\s*(ai|human)\s*\|', line)
            if m:
                status[m.group(1)] = m.group(3)
    return status


def write_assets_md(names, sizes, status):
    lines = [
        '# ASSETS.md',
        '',
        'Per-file art status. `ai` = AI-generated stand-in made by `tools/generate_art.py` (safe to regenerate).',
        '`human` = hand-made art; the generator never overwrites it (unless run with `--force`).',
        '',
        '**To replace a file:** drop your PNG into `assets/` with the same name and size, then change that row',
        'to `human`. No code changes needed. Strips are 4 equal frames laid out horizontally',
        '(frame width = image width / 4).',
        '',
        '| File | Size | Status | Notes |',
        '| --- | --- | --- | --- |',
    ]
    notes = {
        'moon_buggy': '4-frame strip, 16x40 frames',
        'mars_rover': '4-frame strip, 14x40 frames',
        'mars_rover_asleep': '1 frame, dusty',
        'moon_hills': 'tileable sideways (no longer used: the Moon now uses the owner\'s picture)',
        'moon_ground': 'tileable',
        'mars_hills': 'tileable sideways (no longer used: Mars now uses the owner\'s picture)',
        'mars_ground': 'tileable',
    }
    human_notes = {
        'moon_buggy': "owner's pixel-art rover at its own pixel size, built by tools/build_moon_art.py (4-frame strip, frame = width / 4, shown at scale 0.5)",
        'moon_sky': "owner's Moon picture, sky only (tools/build_moon_art.py)",
        'moon_ground': "owner's Moon picture, ground (tools/build_moon_art.py), tileable",
        'mars_rover': "owner's pixel-art Opportunity, built by tools/build_moon_art.py (4-frame strip, shown at scale 0.5)",
        'mars_rover_asleep': "owner's Opportunity, dusty, for the storm ending (tools/build_moon_art.py)",
        'mars_sky': "owner's Mars picture (tools/build_moon_art.py)",
        'mars_ground': "owner's Mars picture, ground (tools/build_moon_art.py), tileable",
    }
    for n in names:
        w, h = sizes[n]
        st = status.get(n + '.png', 'ai')
        note = notes.get(n, '')
        if st == 'human':
            path = os.path.join(ASSET_DIR, n + '.png')
            if os.path.exists(path):
                w, h = Image.open(path).size      # human art keeps its own size
            note = human_notes.get(n, 'hand-made')
        lines.append(f'| `{n}.png` | {w}x{h} | {st} | {note} |')
    lines += ['', f'AI-generated by the script: {sum(1 for n in names if status.get(n + ".png", "ai") == "ai")} of {len(names)} files.', '']
    lines += ['## Other images (not made by this script, never touched by it)', '',
              '| File | Size | Source |', '| --- | --- | --- |',
              '| `cover.png` | 480x270 | Start-screen background supplied by the owner (an AI-generated image, see SUBMISSION.md) |',
              '| `moon_mtn_a/b.png`, `moon_decor_1..5.png`, `mars_mtn_a/b.png`, `mars_decor_1..5.png` | various | The owner\'s mountain ranges (and mirror images) plus craters/rocks, by `tools/build_moon_art.py` (canvas resolution, shown at scale 0.5) |',
              '',
              'The owner\'s source pictures are kept in `art_src/`. The Moon and Mars sky, ground and rover files above are',
              'built from them by `tools/build_moon_art.py` (marked `human` so this script never overwrites them).', '']
    open(ASSETS_MD, 'w', encoding='utf-8').write('\n'.join(lines))


# ---------------------------------------------------------------- validation
def validate(sizes_expected):
    ok = True

    def fail(msg):
        nonlocal ok
        ok = False
        print('  FAIL', msg)

    for name, (w, h) in sizes_expected.items():
        path = os.path.join(ASSET_DIR, name + '.png')
        if not os.path.exists(path):
            fail(f'{name}: missing')
            continue
        im = Image.open(path).convert('RGBA')
        if im.size != (w, h):
            fail(f'{name}: size {im.size} != {(w, h)}')
        alphas = set(im.getchannel("A").tobytes())
        if not alphas <= {0, 255}:
            fail(f'{name}: semi-transparent alpha {sorted(alphas)[:5]}')
        if name in ('moon_buggy', 'mars_rover') and im.size[0] % 4:
            fail(f'{name}: strip width not divisible by 4')
        px = im.load()
        if name.endswith('_hills'):
            tops = []
            for x in (0, w - 1):
                tops.append(next(y for y in range(h) if px[x, y][3]))
            if abs(tops[0] - tops[1]) > 2:
                fail(f'{name}: seam mismatch, ridge y {tops}')
        if name.endswith('_ground'):
            seam = sum(px[w - 1, y] != px[0, y] for y in range(h))
            typ = sum(sum(px[x, y] != px[x + 1, y] for y in range(h)) for x in range(w - 1)) / (w - 1)
            if seam > typ * 2 + 4:
                fail(f'{name}: seam diff {seam} vs typical {typ:.1f}')
    print('validation:', 'OK' if ok else 'FAILED')
    return ok


# ---------------------------------------------------------------- contact sheet
def contact_sheet(names):
    font = ImageFont.load_default()
    W = 1500
    sheet = new(W, 3000, _c('#1d1d26'))
    d = dr(sheet)
    x, y, rowh = 10, 10, 0

    def place(im, label, scale=2):
        nonlocal x, y, rowh
        if scale != 1:
            im = im.resize((int(im.size[0] * scale), int(im.size[1] * scale)), Image.NEAREST)
        w, h = im.size
        if x + w + 10 > W:
            x, y, rowh = 10, y + rowh + 24, 0
        d.rectangle([x - 1, y + 11, x + w, y + 11 + h], outline=(70, 70, 90))
        sheet.paste(im, (x, y + 12), im)
        d.text((x, y), label, fill=(230, 230, 230), font=font)
        x += w + 14
        rowh = max(rowh, h + 12)

    def newline(label=None):
        nonlocal x, y, rowh
        x, y, rowh = 10, y + rowh + 24, 0
        if label:
            d.text((10, y), label, fill=(255, 220, 120), font=font)
            y += 14

    load = lambda n: Image.open(os.path.join(ASSET_DIR, n + '.png')).convert('RGBA')
    sprites = [n for n in names if not n.endswith(('_sky', '_hills', '_ground'))]
    d.text((10, y), 'SPRITES / UI at 2x (strips are 4 frames)', fill=(255, 220, 120), font=font)
    y += 14
    for n in sprites:
        place(load(n), n, 2)
    newline('BACKGROUNDS at 0.5x')
    for n in names:
        if n.endswith(('_sky', '_hills')):
            im = load(n)
            place(im.resize((im.size[0] // 2, im.size[1] // 2), Image.NEAREST), n, 1)
    newline('TILING: hills x2 (0.5x), ground x3 (1x). Red tick = seam')
    for n in ('moon_hills', 'mars_hills'):
        im = load(n)
        two = new(im.size[0] * 2, im.size[1], _c('#3a4a6a'))
        two.paste(im, (0, 0), im)
        two.paste(im, (im.size[0], 0), im)
        two = two.resize((two.size[0] // 2, two.size[1] // 2), Image.NEAREST)
        place(two, n + ' x2', 1)
        for yy in range(0, two.size[1], 6):
            d.point([(x - 14 - two.size[0] // 2, y + 12 + yy)], fill=(255, 0, 0))
        newline()
    for n in ('moon_ground', 'mars_ground'):
        im = load(n)
        three = new(im.size[0] * 3, im.size[1])
        for i in range(3):
            three.paste(im, (i * im.size[0], 0))
        place(three, n + ' x3', 1)
        for i in (1, 2):
            for yy in range(0, 64, 4):
                d.point([(x - 14 - three.size[0] + i * im.size[0], y + 12 + yy)], fill=(255, 0, 0))
        newline()

    # in-game-scale previews (480x270 at 1x)
    newline('IN-GAME SCALE PREVIEW (480x270, 1x; rover stands at x=140)')
    for tag, items, strip_n, rover_w in (
        ('moon', ('flag', 'landing_stage'), 'moon_buggy', 16),
        ('mars', ('cone', 'landing_platform'), 'mars_rover', 14),
    ):
        scene = new(480, 270)
        scene.paste(load(f'{tag}_sky'), (0, 0))
        hills = load(f'{tag}_hills')
        scene.paste(hills, (-300, 0), hills)
        scene.paste(hills, (960 - 300, 0), hills)
        g = load(f'{tag}_ground')
        scene.paste(g, (0, 206))
        if tag == 'mars':
            s = load('sun')
            scene.paste(s, (410, 14), s)
        else:
            e = new(20, 20)
            ImageDraw.Draw(e).ellipse([0, 0, 19, 19], fill=_c('#3a6ab0'))
            ImageDraw.ImageDraw(e).fontmode = '1'
            scene.paste(e, (380, 40), e)
        for it, ix in zip(items, (230, 330)):
            im = load(it)
            scene.paste(im, (ix, 236 - im.size[1]), im)
        sp = load(strip_n)
        fw = sp.size[0] // 4
        fr = sp.crop((0, 0, fw, sp.size[1]))
        scene.paste(fr, (140 - fw // 2, 236 - fr.size[1]), fr)
        pb = load('mars_rover_asleep') if tag == 'mars' else None
        place(scene, tag + ' scene', 1)
    newline()
    sheet = sheet.crop((0, 0, W, y + rowh + 30))
    sheet.save(SHEET)
    print('contact sheet:', SHEET)


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--force', action='store_true', help='also overwrite files marked human')
    ap.add_argument('--only', default='', help='comma-separated asset names')
    ap.add_argument('--check', action='store_true', help='validate only')
    ap.add_argument('--no-sheet', action='store_true')
    args = ap.parse_args()

    os.makedirs(ASSET_DIR, exist_ok=True)
    built = build()
    names = list(built.keys())
    sizes = {n: built[n][0] for n in names}
    status = read_status()
    only = {s.strip() for s in args.only.split(',') if s.strip()}

    if not args.check:
        for n in names:
            if only and n not in only:
                continue
            (w, h), im = built[n]
            assert im.size == (w, h), f'{n}: drew {im.size}, expected {(w, h)}'
            if status.get(n + '.png') == 'human' and not args.force:
                print(f'skip   {n}.png (human)')
                continue
            im.save(os.path.join(ASSET_DIR, n + '.png'), optimize=False)
            status[n + '.png'] = 'ai' if status.get(n + '.png') != 'human' or args.force else 'human'
            print(f'wrote  {n}.png {w}x{h}')
        write_assets_md(names, sizes, status)
    # files marked human (owner art, e.g. built by tools/build_moon_art.py) may have their own sizes
    ok = validate({n: v for n, v in sizes.items() if status.get(n + '.png') != 'human'})
    if not args.no_sheet:
        contact_sheet(names)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
