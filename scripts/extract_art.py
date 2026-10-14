# Crops the user's reference art into transparent PNG sprites under assets/.
# Background removed by flood fill from the crop border (colour-keyed), edges cleaned.
import sys, collections
from PIL import Image, ImageDraw, ImageFont, ImageFilter
A = '/home/box/agent-data/agents/151b126f-3b2a-4218-a9b7-8f0bd3ce51e8/attachments/'
CH = A + 'b8598ca3d9395adff63877fed939dde905fbbd298bcd616bfd7e227b1eab31fe.jpg'
BU = A + 'f5065ee63a918c65f889ed783a1707a7a65821250bbe26fe739d2d079521358f.jpg'
FA = A + '0baa316d7c01bb488148224678328ef00e911d33f9305f39e60aded0f646dd32.jpg'
K = 1168 / 1024  # coords below measured on the 1024-wide preview
OUT = 'assets/'
FONT = 'fonts/Silkscreen.ttf'

def box(x0, y0, x1, y1): return tuple(round(v * K) for v in (x0, y0, x1, y1))

def cutout(im, tol=38, bg=None):
    im = im.convert('RGBA'); w, h = im.size; px = im.load()
    def far(c, b): return abs(c[0]-b[0]) + abs(c[1]-b[1]) + abs(c[2]-b[2]) > tol
    seen = bytearray(w * h); q = collections.deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y*w+x]: continue
        c = px[x, y]; b = bg or c
        if bg and far(c, bg): continue
        seen[y*w+x] = 1
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx] and not far(px[nx, ny], bg or c): q.append((nx, ny))
    for y in range(h):
        for x in range(w):
            if seen[y*w+x]: px[x, y] = (0, 0, 0, 0)
    # erode 1px fringe of bg-ish pixels touching transparency
    a = im.split()[3].filter(ImageFilter.MinFilter(3)); im.putalpha(a)
    return im.crop(im.getbbox())

def text(d, xy, s, size, fill, w=None):
    f = ImageFont.truetype(FONT, size)
    while w and d.textlength(s, font=f) > w and size > 6: size -= 1; f = ImageFont.truetype(FONT, size)
    tw = d.textlength(s, font=f); d.text((xy[0] - tw / 2, xy[1]), s, font=f, fill=fill)

def paw(d, cx, cy, s, col):
    for dx, dy in ((-1.6, -1.2), (-0.55, -2), (0.55, -2), (1.6, -1.2)): d.ellipse((cx+dx*s-s*.45, cy+dy*s-s*.55, cx+dx*s+s*.45, cy+dy*s+s*.55), fill=col)
    d.ellipse((cx - s*1.2, cy - s*.6, cx + s*1.2, cy + s*1.1), fill=col)

def main():
    # --- 6 starter Shibas (row1 y140-345, row2 y395-600)
    ch = Image.open(CH).convert('RGB')
    coats = ['tan', 'cream', 'red', 'dark', 'golden', 'gray']
    for i, k in enumerate(coats):
        cx = [210, 510, 790][i % 3]; y0 = 138 if i < 3 else 392
        im = cutout(ch.crop(box(cx - 68, y0, cx + 68, y0 + 212)), tol=20, bg=(28, 21, 37))
        im.save(OUT + f'shiba-{k}.png'); print('shiba', k, im.size)
    # --- fashion previews (row1 y60-305, row2 y345-590), cream/white bg
    fa = Image.open(FA).convert('RGB')
    names = ['suit', 'tux', 'hoodie', 'jacket', 'gown', 'hawaiian']
    for i, n in enumerate(names):
        cx = [195, 497, 805][i % 3]; y0 = 58 if i < 3 else 345
        src = fa.crop(box(cx - 85, y0, cx + 85, y0 + 250))
        im = cutout(src, tol=45, bg=(255, 255, 255))
        if n == 'suit':  # blank the cap text: repaint cap front with plain red
            d = ImageDraw.Draw(im); W, H = im.size
            r = im.convert('RGB'); best = None
            # find the white text pixels in the top 22% and overpaint them with cap red
            reds = []
            for y in range(int(H * .22)):
                for x in range(W):
                    p = r.getpixel((x, y))
                    if p[0] > 150 and p[1] < 60 and p[2] < 60: reds.append(p)
            red = tuple(sorted(reds)[len(reds)//2]) if reds else (200, 30, 40)
            for y in range(int(H * .22)):
                for x in range(W):
                    p = r.getpixel((x, y)); a = im.getpixel((x, y))[3]
                    if a and p[0] > 190 and p[1] > 170 and p[2] > 170: im.putpixel((x, y), red + (255,))
                    if a and p[0] > 160 and 90 < p[1] < 175 and p[2] < 150 and p[0]-p[2] > 40 and y < H * .12: pass
        if n == 'suit':
            W, H = im.size; r = im.convert('RGB')
            for y in range(int(H * .03), int(H * .14)):
                for x in range(int(W * .12), int(W * .62)):
                    p = r.getpixel((x, y)); a = im.getpixel((x, y))[3]
                    if a and not (p[0] > 120 and p[1] < 70 and p[2] < 70) and sum(p) > 120: im.putpixel((x, y), (196, 28, 36, 255))
        im.save(OUT + f'fashion-{n}.png'); print('fashion', n, im.size)
    # --- buildings: blue (x5-340), red (345-675), black (680-1012); y 60-570
    bu = Image.open(BU).convert('RGB')
    spans = {'blue': (8, 340), 'red': (345, 672), 'black': (680, 1010)}
    base = {}
    for k, (x0, x1) in spans.items():
        im = bu.crop(box(x0, 58, x1, 572)); base[k] = im
    # sign + side panel boxes, relative to each crop in preview coords (sign ~ y195-270, panels)
    def relabel(im, k, name, word_l, word_r):
        d = ImageDraw.Draw(im); ox = spans[k][0]
        S = lambda x, y: ((x - ox) * K, (y - 58) * K)
        sx = {'blue': 170, 'red': 507, 'black': 840}[k]
        # signboard interior
        a, b = S(sx - 58, 205), S(sx + 58, 263); d.rectangle((*a, *b), fill=(20, 22, 44) if k != 'red' else (70, 14, 24))
        lines = name.upper().split(' ', 1) if len(name) > 10 else [name.upper()]
        f = 28 if len(lines) == 2 else 30
        for j, ln in enumerate(lines):
            text(d, ((sx - ox) * K, S(0, 212 if len(lines) == 2 else 222)[1] + j * 30), ln, f, (242, 204, 104), w=112 * K)
        # side panels: [cx, top, bottom, half-width] in preview coords
        panels = {'blue': [(68, 285, 385, 22), (274, 305, 365, 26)], 'red': [(403, 285, 365, 22), (614, 285, 365, 22)], 'black': [(738, 285, 375, 22), (942, 285, 365, 22)]}[k]
        for (pcx, t, bt, hw), word in zip(panels, (word_l, word_r)):
            a, b = S(pcx - hw + 3, t + 6), S(pcx + hw - 3, bt - 8)
            d.rectangle((*a, *b), fill=(20, 22, 44) if k != 'red' else (90, 18, 28))
            mx = (a[0] + b[0]) / 2
            text(d, (mx, a[1] + 8), word, 14, (242, 204, 104), w=(b[0] - a[0]) - 6)
            paw(d, mx, (a[1] + b[1]) / 2 + 22, 7, (242, 204, 104))
        return im
    def hue(im, fn):
        im = im.convert('RGB'); px = im.load(); w, h = im.size
        for y in range(h):
            for x in range(w): px[x, y] = fn(*px[x, y])
        return im
    plan = [('launch', 'blue', 'Launch Hall', 'DEMO', 'TOKENS', None),
            ('cafe', 'red', 'Shiba Sips Café', 'COFFEE', 'TREATS', None),
            ('cars', 'black', 'Zoomies Motors', 'CARS', 'SOON', None),
            ('fashion', 'red', 'Fetch Fashion', 'STYLE', 'BLING', lambda r, g, b: (int(r*.8+b*.2), int(g*.7), int(min(255, b + r*.55)))),
            ('shop', 'blue', 'Paws & Pillows', 'SOFAS', 'LAMPS', lambda r, g, b: (int(r*.6), int(min(255, g + b*.35)), int(b*.75)))]
    for bid, k, name, wl, wr, fn in plan:
        im = base[k].copy()
        if fn: im = hue(im, fn)
        im = relabel(im, k, name, wl, wr)
        bg = im.getpixel((3, 3))
        im = cutout(im, tol=12 if k != 'red' else 30, bg=bg)
        im.save(OUT + f'building-{bid}.png'); print('building', bid, im.size)

main()
