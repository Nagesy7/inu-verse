#!/usr/bin/env python3
"""Luxury mall stock (Gilded Collar Jewelers + Royal Paws Designer): derive the new Inu Verse outfit layers from our own
verse-outfits art by re-colouring the garment pixels (outline/shadow pixels kept), for all 6 coats x 3 views x 4 frames, and add
them to inu-art/verse-outfits/manifest.json. Then run scripts/build_outfit_atlas.py. Idempotent."""
import json, os, colorsys, shutil
from PIL import Image
SRC = '/workspace/inu-art/verse-outfits'
# id: (source item, name, hue (0-1) or None = keep, sat multiplier, value multiplier)
NEW = {
  'rose_tiara':      ('crown', 'Rose Gold Tiara', 0.97, 0.55, 1.08),
  'sapphire_crown':  ('crown', 'Sapphire Crown', 0.62, 1.0, 0.95),
  'ruby_chain':      ('diamond_chain', 'Ruby Paw Chain', 0.98, 3.5, 0.9),
  'emerald_chain':   ('chain_gold', 'Emerald Link Chain', 0.38, 1.0, 0.85),
  'rose_shades':     ('plat_shades', 'Rose Gold Shades', 0.98, 4.0, 1.0),
  'pearl_brooch':    ('pres_pin', 'Pearl Paw Brooch', 0.12, 0.12, 1.25),
  'plat_suit':       ('gold_suit', 'Platinum Designer Suit', 0.6, 0.12, 1.15),
  'rose_gown':       ('velvet_gown', 'Rose Velvet Gown', 0.95, 1.0, 1.35),
  'emerald_gown':    ('velvet_gown', 'Emerald Velvet Gown', 0.42, 1.0, 1.1),
  'royal_tux':       ('tux_black', 'Royal Plum Tuxedo', 0.8, 6.0, 2.6),
  'champagne_gown':  ('gown_white', 'Champagne Silk Gown', 0.11, 2.2, 0.98),
  'gilded_hoodie':   ('hoodie_maroon', 'Gilded Paw Hoodie', 0.12, 1.0, 1.35),
  'ivory_suit':      ('suit_navy', 'Ivory Silk Suit', 0.12, 0.25, 3.2),
}
OUTLINE = {'royal_tux': 0.045}  # the black tux is mostly near-black: only keep the true outline
def recolor(im, hue, sm, vm, outline=0.13):
    im = im.convert('RGBA'); px = im.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a: continue
            H, S, V = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if V < outline: continue  # keep the dark outline
            if S < 0.12 and V > 0.9: continue  # keep white highlights / shirt fronts
            H = hue if hue is not None else H; S = min(1, max(0.04, S * sm)) if S > 0.03 or sm > 1 else S
            if S < 0.2 and sm >= 6: S = 0.55
            V = min(1, V * vm)
            if S < 0.05 and sm > 1: S = min(1, 0.06 * sm)
            r2, g2, b2 = colorsys.hsv_to_rgb(H, S, V); px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im
mp = os.path.join(SRC, 'manifest.json'); M = json.load(open(mp))
if not os.path.exists(mp + '.orig'): shutil.copy(mp, mp + '.orig')
for nid, (src, name, hue, sm, vm) in NEW.items():
    base = M['items'][src]; it = json.loads(json.dumps(base)); it['name'] = name; it['derived_from'] = src
    for coat, views in it['files'].items():
        for v, spec in views.items():
            fn = spec['file']; out = fn.replace('/' + src + '_', '/' + nid + '_'); assert out != fn
            recolor(Image.open(os.path.join(SRC, fn)), hue, sm, vm, OUTLINE.get(nid, 0.13)).save(os.path.join(SRC, out)); spec['file'] = out
    M['items'][nid] = it
json.dump(M, open(mp, 'w'), indent=1); print(len(NEW), 'items')
