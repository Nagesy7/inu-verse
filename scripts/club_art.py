#!/usr/bin/env python3
"""Club art (Kennels / Pet Pups / Stamp Book / Parties / Pin Hunt / Inu Times): original chunky pixel art drawn at native
resolution, auto-outlined in the Verse ink colour, then scaled 2x nearest-neighbour. Outputs:
  assets/club/icons.png + icons.json   24px cells (12px native): stamp icons + hunt pins
  assets/club/party.png + party.json   world sprites for the monthly parties (lantern posts, party booths)
Run: python3 scripts/club_art.py   (PIL only, deterministic)."""
import json, os
from PIL import Image, ImageDraw
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'club')
INK = (20, 26, 46, 255)
def H(c, a=255):
    c = c.lstrip('#'); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (a,)
class Pix:
    def __init__(s, w, h): s.im = Image.new('RGBA', (w, h)); s.d = ImageDraw.Draw(s.im)
    def r(s, x, y, w, h, c): s.d.rectangle([x, y, x + w - 1, y + h - 1], fill=H(c))
    def p(s, x, y, c): s.im.putpixel((x, y), H(c))
    def e(s, x, y, w, h, c): s.d.ellipse([x, y, x + w - 1, y + h - 1], fill=H(c))
    def poly(s, pts, c): s.d.polygon(pts, fill=H(c))
    def done(s, scale=2):
        im = s.im; w, h = im.size; px = im.load(); o = im.copy(); op = o.load()
        for y in range(h):
            for x in range(w):
                if px[x, y][3] == 0 and any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] > 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): op[x, y] = INK
        return o.resize((w * scale, h * scale), Image.NEAREST)
# ---------------------------------------------------------------- 12x12 icons (1px left free for the outline) --------
I = {}
def icon(name):
    def deco(fn): I[name] = fn; return fn
    return deco
@icon('cafe')
def _(g): g.r(2, 4, 6, 6, '#fff6ea'); g.r(2, 8, 6, 2, '#e8d8c0'); g.r(8, 5, 2, 3, '#fff6ea'); g.r(3, 4, 4, 1, '#8a5a34'); g.p(4, 2, '#d8d8e0'); g.p(5, 1, '#d8d8e0'); g.p(6, 2, '#d8d8e0'); g.r(1, 10, 9, 1, '#c9a07a')
@icon('park')
def _(g): g.r(5, 6, 2, 5, '#8a5a34'); g.e(1, 1, 10, 7, '#f6b8cc'); g.p(3, 3, '#ffffff'); g.p(7, 2, '#ffffff'); g.p(8, 5, '#e88aa8'); g.r(2, 10, 8, 1, '#5fb36a')
@icon('beach')
def _(g): g.e(6, 1, 5, 5, '#f2cc68'); g.r(1, 7, 10, 2, '#4aa8e0'); g.p(2, 6, '#9fd8f5'); g.p(6, 6, '#9fd8f5'); g.r(1, 9, 10, 2, '#f0d8a0')
@icon('shrine')
def _(g): g.r(1, 2, 10, 2, '#d8443a'); g.r(2, 5, 8, 1, '#d8443a'); g.r(3, 4, 1, 7, '#b8322a'); g.r(8, 4, 1, 7, '#b8322a'); g.r(5, 4, 2, 1, '#f2cc68')
@icon('academy')
def _(g): g.poly([(0, 4), (6, 1), (11, 4), (6, 7)], '#3a4a7a'); g.r(3, 6, 6, 3, '#2a3660'); g.r(10, 4, 1, 4, '#f2cc68'); g.p(10, 8, '#f2cc68')
@icon('mall')
def _(g): g.r(2, 4, 8, 7, '#e07aa8'); g.r(2, 4, 8, 1, '#c25a8a'); g.r(4, 1, 1, 3, '#7a4a3a'); g.r(7, 1, 1, 3, '#7a4a3a'); g.r(4, 1, 4, 1, '#7a4a3a'); g.p(5, 7, '#fff1dc'); g.p(6, 7, '#fff1dc')
@icon('districts')
def _(g): g.r(2, 1, 8, 10, '#5a4ad0'); g.r(3, 2, 6, 4, '#9fe8ff'); g.r(4, 7, 1, 2, '#141a2e'); g.p(7, 8, '#e8343c'); g.p(8, 7, '#f2cc68'); g.r(2, 10, 8, 1, '#3a2a90')
@icon('explorer')
def _(g): g.e(1, 1, 10, 10, '#f2cc68'); g.e(2, 2, 8, 8, '#fff6ea'); g.poly([(6, 2), (7, 6), (6, 9), (5, 6)], '#e8343c'); g.r(6, 6, 1, 3, '#4a5f8a')
@icon('shift')
def _(g): g.e(2, 3, 8, 6, '#d8d8e0'); g.r(1, 7, 10, 2, '#a8a8b8'); g.r(5, 2, 2, 1, '#a8a8b8'); g.p(4, 4, '#ffffff')
@icon('job')
def _(g): g.r(5, 4, 2, 7, '#8a5a34'); g.r(2, 1, 8, 3, '#9aa0b4'); g.r(2, 1, 2, 3, '#c9cdda')
@icon('arcade')
def _(g): g.r(1, 3, 10, 6, '#5ad0a0'); g.r(2, 5, 3, 1, '#141a2e'); g.r(3, 4, 1, 3, '#141a2e'); g.p(8, 4, '#e8343c'); g.p(9, 6, '#f2cc68'); g.r(1, 8, 3, 1, '#3a9a7a'); g.r(8, 8, 3, 1, '#3a9a7a')
@icon('emote')
def _(g): g.r(1, 1, 10, 7, '#ffffff'); g.r(2, 8, 2, 2, '#ffffff'); g.r(3, 3, 2, 2, '#ff6a8a'); g.r(6, 3, 2, 2, '#ff6a8a'); g.r(4, 4, 3, 2, '#ff6a8a'); g.p(5, 6, '#ff6a8a')
@icon('guestbook')
def _(g): g.r(1, 2, 9, 9, '#c0623b'); g.r(2, 2, 7, 8, '#fff6ea'); g.r(3, 4, 5, 1, '#c9b8a0'); g.r(3, 6, 4, 1, '#c9b8a0'); g.poly([(10, 0), (11, 1), (6, 8), (5, 8)], '#5a8ad0')
@icon('visitors')
def _(g):
    for ox, oy in ((0, 5), (6, 1)): g.r(ox + 1, oy + 3, 3, 3, '#c0623b'); g.p(ox, oy + 1, '#c0623b'); g.p(ox + 2, oy, '#c0623b'); g.p(ox + 4, oy + 1, '#c0623b')
@icon('kennel')
def _(g): g.poly([(0, 5), (6, 0), (11, 5)], '#d8443a'); g.r(1, 5, 10, 6, '#e3a35a'); g.e(4, 6, 4, 6, '#3a2418'); g.r(4, 9, 4, 2, '#3a2418'); g.r(5, 3, 2, 1, '#f2cc68')
@icon('decor')
def _(g): g.e(2, 0, 8, 6, '#ffe7a3'); g.r(2, 3, 8, 2, '#f2cc68'); g.r(5, 6, 2, 4, '#8a5a34'); g.r(3, 10, 6, 1, '#8a5a34')
@icon('door')
def _(g): g.r(2, 0, 8, 11, '#8a5a34'); g.r(3, 1, 6, 10, '#3a2418'); g.r(3, 1, 3, 10, '#c0874a'); g.p(5, 6, '#f2cc68')
@icon('pup')
def _(g): g.r(2, 3, 8, 7, '#e3a35a'); g.r(1, 0, 3, 4, '#e3a35a'); g.r(8, 0, 3, 4, '#e3a35a'); g.p(2, 1, '#a8662c'); g.p(9, 1, '#a8662c'); g.r(3, 7, 6, 3, '#fff1dc'); g.p(4, 5, '#141a2e'); g.p(7, 5, '#141a2e'); g.r(5, 7, 2, 1, '#141a2e')
@icon('feed')
def _(g): g.r(1, 6, 10, 4, '#5a8ad0'); g.r(2, 10, 8, 1, '#3a5aa8'); g.e(2, 4, 8, 4, '#c0874a'); g.p(4, 5, '#8a5a34'); g.p(7, 5, '#8a5a34')
@icon('play')
def _(g): g.e(1, 1, 10, 10, '#e8343c'); g.r(1, 5, 10, 2, '#ffffff'); g.p(3, 3, '#ff8a8a')
@icon('pack3')
def _(g):
    for ox, oy in ((0, 6), (4, 1), (8, 6)): g.r(ox, oy + 2, 3, 3, '#e3a35a'); g.p(ox, oy, '#e3a35a'); g.p(ox + 2, oy, '#e3a35a')
@icon('party')
def _(g): g.r(5, 0, 2, 2, '#3a2418'); g.e(1, 2, 10, 8, '#9a6ae0'); g.r(1, 5, 10, 1, '#c3a6f0'); g.r(4, 10, 4, 1, '#f2cc68'); g.p(5, 4, '#ffe7a3')
@icon('gift')
def _(g): g.r(1, 4, 10, 7, '#5ad0a0'); g.r(1, 4, 10, 2, '#3a9a7a'); g.r(5, 4, 2, 7, '#e8343c'); g.r(3, 1, 2, 3, '#e8343c'); g.r(7, 1, 2, 3, '#e8343c')
@icon('pin')
def _(g): g.e(1, 1, 10, 10, '#f2cc68'); g.e(3, 3, 6, 6, '#d8443a'); g.p(4, 4, '#ff8a8a')
@icon('trophy')
def _(g): g.r(2, 1, 8, 5, '#f2cc68'); g.r(3, 6, 6, 1, '#f2cc68'); g.r(5, 7, 2, 2, '#c89a2a'); g.r(3, 9, 6, 2, '#8a5a34'); g.r(0, 2, 2, 3, '#c89a2a'); g.r(10, 2, 2, 3, '#c89a2a'); g.p(4, 2, '#fff6d0')
@icon('times')
def _(g): g.r(1, 1, 10, 10, '#f4f1ea'); g.r(2, 2, 8, 2, '#141a2e'); g.r(2, 5, 4, 3, '#9aa0b4'); g.r(7, 5, 3, 1, '#c9c3b8'); g.r(7, 7, 3, 1, '#c9c3b8'); g.r(2, 9, 8, 1, '#c9c3b8')
@icon('star')
def _(g): g.poly([(6, 0), (7, 4), (11, 4), (8, 7), (9, 11), (6, 9), (3, 11), (4, 7), (1, 4), (5, 4)], '#f2cc68'); g.p(6, 3, '#fff6d0')
# hunt pins (enamel-pin style motifs)
@icon('p_bone')
def _(g): g.r(3, 5, 6, 2, '#f2cc68'); g.e(1, 3, 3, 3, '#f2cc68'); g.e(1, 6, 3, 3, '#f2cc68'); g.e(8, 3, 3, 3, '#f2cc68'); g.e(8, 6, 3, 3, '#f2cc68'); g.p(4, 5, '#fff6d0')
@icon('p_blossom')
def _(g):
    for x, y in ((4, 0), (8, 3), (7, 7), (1, 7), (0, 3)): g.e(x, y, 4, 4, '#b38ae8')
    g.e(4, 4, 4, 4, '#f2cc68')
@icon('p_acorn')
def _(g): g.e(2, 3, 8, 8, '#c0874a'); g.r(2, 2, 8, 3, '#6a4a3a'); g.r(5, 0, 2, 2, '#6a4a3a'); g.p(4, 6, '#e8b070')
@icon('p_shell')
def _(g): g.poly([(6, 0), (11, 7), (8, 10), (4, 10), (1, 7)], '#ffb0c8'); g.r(5, 2, 1, 8, '#e07aa8'); g.r(3, 5, 1, 4, '#e07aa8'); g.r(8, 5, 1, 4, '#e07aa8')
@icon('p_kite')
def _(g): g.poly([(6, 0), (11, 5), (6, 9), (1, 5)], '#e8343c'); g.poly([(6, 0), (6, 9), (1, 5)], '#f2cc68'); g.p(7, 10, '#5a8ad0'); g.p(6, 11, '#5a8ad0')
@icon('p_teacup')
def _(g): g.r(1, 4, 7, 5, '#7ad0b0'); g.r(8, 5, 2, 2, '#7ad0b0'); g.r(1, 9, 9, 1, '#3a9a7a'); g.r(2, 3, 5, 1, '#5a3a22'); g.p(4, 6, '#e8fff6')
@icon('p_bell')
def _(g): g.poly([(6, 1), (9, 4), (10, 9), (2, 9), (3, 4)], '#f2cc68'); g.r(1, 9, 10, 1, '#c89a2a'); g.r(5, 10, 2, 2, '#c89a2a'); g.r(4, 3, 1, 4, '#fff6d0')
@icon('p_star')
def _(g): g.poly([(6, 0), (7, 4), (11, 4), (8, 7), (9, 11), (6, 9), (3, 11), (4, 7), (1, 4), (5, 4)], '#e3a35a'); g.p(6, 5, '#a8662c'); g.p(5, 7, '#a8662c'); g.p(7, 7, '#a8662c')
@icon('p_doghouse')
def _(g): g.poly([(0, 5), (6, 0), (11, 5)], '#5a8ad0'); g.r(1, 5, 10, 6, '#f4f1ea'); g.e(4, 6, 4, 6, '#3a2418'); g.r(4, 9, 4, 2, '#3a2418')
@icon('p_ramen')
def _(g): g.e(1, 4, 10, 7, '#e8343c'); g.r(1, 4, 10, 3, '#f2cc68'); g.p(3, 5, '#fff6ea'); g.p(7, 5, '#ffb0c8'); g.r(8, 0, 1, 6, '#c0874a'); g.r(10, 0, 1, 6, '#c0874a')
@icon('p_compass')
def _(g): g.e(1, 1, 10, 10, '#9aa0b4'); g.e(2, 2, 8, 8, '#e6f0ff'); g.r(5, 4, 2, 4, '#e3a35a'); g.p(4, 3, '#e3a35a'); g.p(7, 3, '#e3a35a')
@icon('p_leaf')
def _(g): g.poly([(10, 0), (11, 4), (6, 10), (1, 11), (2, 6)], '#5fa86a'); g.poly([(1, 11), (10, 1), (10, 2), (2, 11)], '#2f6a40')
# ---------------------------------------------------------------- party world sprites -------------------------------
PARTY = {
    'jacaranda': dict(main='#7d5bd0', light='#c3a6f0', dark='#3e2a78', accent='#f2cc68', wood='#6a4a3a', sign='#fff6ea'),
    'summerlights': dict(main='#e0563f', light='#ffd27a', dark='#2a6a5a', accent='#5fd0c0', wood='#5a3a22', sign='#fff6ea'),
}
def post(c):  # 10x26 native lantern post
    g = Pix(12, 28); g.r(5, 6, 2, 20, c['wood']); g.r(3, 25, 6, 2, c['wood']); g.r(2, 4, 8, 1, c['wood'])
    g.e(2, 6, 8, 9, c['main']); g.r(2, 9, 8, 2, c['light']); g.r(4, 15, 4, 1, c['accent']); g.r(4, 5, 4, 1, c['accent']); g.p(4, 8, c['sign']); g.r(5, 16, 1, 2, c['accent'])
    return g.done()
def booth(c):  # 40x34 native party booth: striped awning, counter, sign with a paw
    g = Pix(42, 36); g.r(3, 10, 2, 24, c['wood']); g.r(37, 10, 2, 24, c['wood'])
    for i in range(9): g.r(1 + i * 4 + (0 if i < 8 else 0), 4, 4, 7, c['main'] if i % 2 == 0 else c['sign'])
    for i in range(9): g.e(1 + i * 4, 9, 4, 4, c['main'] if i % 2 == 0 else c['sign'])
    g.r(1, 2, 40, 2, c['dark']); g.r(5, 20, 32, 12, c['wood']); g.r(5, 20, 32, 3, c['light']); g.r(7, 25, 28, 6, c['dark'])
    g.r(13, 14, 16, 5, c['sign']); g.r(19, 15, 4, 3, c['main']); g.p(18, 14, c['main']); g.p(23, 14, c['main'])
    for x in (9, 31): g.e(x - 1, 17, 4, 4, c['accent'])
    return g.done()
def build():
    os.makedirs(ROOT, exist_ok=True)
    keys = list(I); cols = 8; rows = (len(keys) + cols - 1) // cols; sheet = Image.new('RGBA', (cols * 24, rows * 24)); man = {'cell': 24, 'icons': {}}
    for i, k in enumerate(keys):
        g = Pix(12, 12); I[k](g); sheet.paste(g.done(), ((i % cols) * 24, (i // cols) * 24)); man['icons'][k] = [i % cols, i // cols]
    sheet.save(os.path.join(ROOT, 'icons.png'), optimize=True); json.dump(man, open(os.path.join(ROOT, 'icons.json'), 'w'), indent=0)
    js = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'club', 'iconmap.js')
    open(js, 'w').write('// GENERATED by scripts/club_art.py (do not edit): cell positions in assets/club/icons.png\n'
        f"export const ICON_CELL = 24, ICON_COLS = {cols}, ICON_ROWS = {rows};\nexport const ICONS = {json.dumps(man['icons'], separators=(',', ':'))};\n")
    sprites = {}; parts = []
    for key, c in PARTY.items(): parts += [(f'post_{key}', post(c)), (f'booth_{key}', booth(c))]
    W = sum(im.width for _, im in parts); Hh = max(im.height for _, im in parts); ps = Image.new('RGBA', (W, Hh)); x = 0
    for name, im in parts: ps.paste(im, (x, 0)); sprites[name] = [x, 0, im.width, im.height]; x += im.width
    ps.save(os.path.join(ROOT, 'party.png'), optimize=True); json.dump({'sprites': sprites}, open(os.path.join(ROOT, 'party.json'), 'w'), indent=0)
    open(js, 'a').write(f"export const PARTY_SPRITES = {json.dumps(sprites, separators=(',', ':'))};\n")
    print(len(keys), 'icons;', len(sprites), 'party sprites')
if __name__ == '__main__': build()
