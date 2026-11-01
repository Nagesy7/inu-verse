#!/usr/bin/env python3
"""Quest-reward neck cosmetics (onboarding): derive outfit layers for ob_apron_pin, ob_scout_bandana and ob_verse_pin from our
own verse-outfits art (pres_pin / pres_scarf) by palette-mapping the garment pixels per frame (outline ring + knot shading so each
reads distinct at game scale), for all 6 coats x 3 views x 4 frames, and add them to inu-art/verse-outfits/manifest.json.
Colours follow the `look` in src/outfits.js. Then run scripts/build_outfit_atlas.py. Idempotent."""
import json, os, sys
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/inu-art/verse-outfits'
hexc = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
# pins: fill / outline ring / centre knot / highlight
PINS = {
  'ob_apron_pin': ('Café Apron Pin', dict(fill='#f4efe6', edge='#c8282e', knot='#c8282e', hi='#ffffff')),
  'ob_verse_pin': ('Verse Graduate Pin', dict(fill='#e3b341', edge='#9c7424', knot='#2a9a5a', hi='#fff1b0')),
}
# scarf: source palette -> new palette (red cloth -> scout green, gold stripes kept as the gold accent)
SCARF = {'ob_scout_bandana': ('Verse Scout Bandana', {(181, 30, 40): '#2a9a5a', (168, 26, 36): '#1a6a3a', (227, 179, 65): '#e3b341'})}

def pin_layer(im, fw, pal):
  im = im.convert('RGBA'); px = im.load(); W, H = im.size; out = Image.new('RGBA', im.size, (0, 0, 0, 0)); po = out.load()
  P = {k: hexc(v) for k, v in pal.items()}
  for f in range(W // fw):
    pts = [(x, y) for x in range(f * fw, (f + 1) * fw) for y in range(H) if px[x, y][3]]
    if not pts: continue
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; cx = (min(xs) + max(xs)) / 2; cy = (min(ys) + max(ys)) / 2
    on = set(pts)
    for x, y in pts:
      edge = any((x + dx, y + dy) not in on for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
      c = P['edge'] if edge else P['fill']
      if abs(x - cx) <= 2 and abs(y - cy) <= 2: c = P['knot']  # centre knot
      elif not edge and y == min(ys) + 1 and abs(x - cx) > 4: c = P['hi']  # top highlight on the wings
      po[x, y] = c
  return out

def scarf_layer(im, cmap):
  im = im.convert('RGBA'); px = im.load()
  M2 = {k: hexc(v) for k, v in cmap.items()}
  for y in range(im.size[1]):
    for x in range(im.size[0]):
      r, g, b, a = px[x, y]
      if a and (r, g, b) in M2: px[x, y] = M2[(r, g, b)][:3] + (a,)
  return im

mp = os.path.join(SRC, 'manifest.json'); M = json.load(open(mp))
def derive(nid, src, name, fn_make):
  it = json.loads(json.dumps(M['items'][src])); it['name'] = name; it['derived_from'] = src
  for coat, views in it['files'].items():
    for v, spec in views.items():
      fn = spec['file']; out = fn.replace('/' + src + '_', '/' + nid + '_'); assert out != fn
      fw = spec['frames'][0][2]
      fn_make(Image.open(os.path.join(SRC, fn)), fw).save(os.path.join(SRC, out)); spec['file'] = out
  M['items'][nid] = it
for nid, (name, pal) in PINS.items(): derive(nid, 'pres_pin', name, lambda im, fw, pal=pal: pin_layer(im, fw, pal))
for nid, (name, cmap) in SCARF.items(): derive(nid, 'pres_scarf', name, lambda im, fw, cmap=cmap: scarf_layer(im, cmap))
json.dump(M, open(mp, 'w'), indent=1); print(len(PINS) + len(SCARF), 'quest items')
