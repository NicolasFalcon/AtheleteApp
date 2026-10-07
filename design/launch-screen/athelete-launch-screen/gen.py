"""Genera los assets de la pantalla de arranque de ATHELETE (iOS + Android).
Uso: python3 -I gen.py <isologo.png> <logo_horizontal.png> <out_dir>
"""
import json, os, sys
import cv2, numpy as np
from PIL import Image, ImageDraw

ISO_SRC, LOGO_SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

# Tokens (prototipo HomeDark.dc.html / theme v2)
BONE = "#F2F0EC"   # isologo sobre oscuro (ivory)
INK = "#121212"    # isologo sobre claro (ink)
BG_L = "#F7F6F3"    # fondo claro (theme v2 bg)
BG_D = "#121110"    # fondo oscuro (theme v2 bg)
MUTED_L = "#8C8A85"  # wordmark sobre claro
MUTED_D = "#A3A09A"  # wordmark sobre oscuro

def hex2rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def ink_mask(path):
    im = np.array(Image.open(path).convert('RGBA')).astype(float)
    a = im[..., 3] / 255; lum = im[..., :3].mean(-1)
    return ((1 - lum / 255) * a > 0.5).astype(np.uint8)

# ---------- Isologo: geometría (viewBox 480) ----------
m = ink_mask(ISO_SRC)
cnts, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
ring_out = ring_in = None; bars = []
for i, c in enumerate(cnts):
    A = cv2.contourArea(c)
    if A < 50: continue
    if A > 100000:
        r = np.sqrt(A / np.pi)
        if hier[0][i][3] == -1: ring_out = r
        else: ring_in = r
    else:
        bars.append(cv2.approxPolyDP(c, 1.5, True).reshape(-1, 2).astype(float))
C = 240.0
# base de las barras alineada (ambas apoyan en la misma horizontal)
base_y = max(max(y for _, y in b) for b in bars)
bars = [[(x, base_y if y > base_y - 3 else y) for x, y in b] for b in bars]
ISO = {"c": C, "ro": min(round(ring_out + 0.5, 2), 239.75), "ri": round(ring_in + 0.5, 2),
       "bars": [[(round(x + .5, 1), round(y + .5, 1)) for x, y in b] for b in bars]}

# ---------- Wordmark: polígonos de letras ----------
lm = ink_mask(LOGO_SRC)
cnts, hier = cv2.findContours(lm, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
letters = []
for i, c in enumerate(cnts):
    x, y, w, h = cv2.boundingRect(c)
    if cv2.contourArea(c) < 30 or x > 760: continue  # solo letras (izquierda del círculo)
    letters.append(cv2.approxPolyDP(c, 1.0, True).reshape(-1, 2).astype(float) + .5)
allp = np.vstack(letters); x0, y0 = allp.min(0); x1, y1 = allp.max(0)
WM_W, WM_H = x1 - x0, y1 - y0
WM = [[(round(px - x0, 2), round(py - y0, 2)) for px, py in L] for L in letters]

# ---------- Render ----------
SS = 4
def render_iso(size_px, color, canvas=None, bg=None):
    """isologo de diámetro size_px centrado en un lienzo canvas (px)."""
    canvas = canvas or size_px
    S = canvas * SS; k = size_px * SS / 480.0; off = (S - size_px * SS) / 2
    img = Image.new('L', (S, S), 0); d = ImageDraw.Draw(img)
    cx = off + C * k
    d.ellipse([cx - ISO['ro'] * k, cx - ISO['ro'] * k, cx + ISO['ro'] * k, cx + ISO['ro'] * k], fill=255)
    d.ellipse([cx - ISO['ri'] * k, cx - ISO['ri'] * k, cx + ISO['ri'] * k, cx + ISO['ri'] * k], fill=0)
    for b in ISO['bars']:
        d.polygon([(off + x * k, off + y * k) for x, y in b], fill=255)
    return colorize(img.resize((canvas, canvas), Image.LANCZOS), color, bg)

def render_wm(width_px, color, canvas=None, bg=None):
    k = width_px * SS / WM_W; h = int(round(WM_H * width_px / WM_W))
    cw, ch = canvas or (width_px, h)
    img = Image.new('L', (cw * SS, ch * SS), 0); d = ImageDraw.Draw(img)
    ox = (cw * SS - WM_W * k) / 2; oy = (ch * SS - WM_H * k) / 2
    for L in WM: d.polygon([(ox + x * k, oy + y * k) for x, y in L], fill=255)
    return colorize(img.resize((cw, ch), Image.LANCZOS), color, bg)

def colorize(mask, color, bg=None):
    r, g, b = hex2rgb(color)
    if bg is None:
        out = Image.new('RGBA', mask.size, (r, g, b, 0)); out.putalpha(mask); return out
    base = Image.new('RGBA', mask.size, hex2rgb(bg) + (255,))
    fg = Image.new('RGBA', mask.size, (r, g, b, 255)); base.paste(fg, (0, 0), mask); return base

def save(img, *p):
    path = os.path.join(OUT, *p); os.makedirs(os.path.dirname(path), exist_ok=True); img.save(path, optimize=True)
def wjson(obj, *p):
    path = os.path.join(OUT, *p); os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w').write(json.dumps(obj, indent=2) + "\n")

# ---------- SVG ----------
def iso_svg(color):
    s = ISO
    bars = "".join(f'<polygon points="{" ".join(f"{x},{y}" for x, y in b)}"/>' for b in s['bars'])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" fill="{color}">'
            f'<path fill-rule="evenodd" d="M{240-s["ro"]},240a{s["ro"]},{s["ro"]} 0 1,0 {2*s["ro"]},0a{s["ro"]},{s["ro"]} 0 1,0 {-2*s["ro"]},0Z'
            f'M{240-s["ri"]},240a{s["ri"]},{s["ri"]} 0 1,0 {2*s["ri"]},0a{s["ri"]},{s["ri"]} 0 1,0 {-2*s["ri"]},0Z"/>{bars}</svg>\n')
def wm_svg(color):
    polys = "".join(f'<polygon points="{" ".join(f"{x},{y}" for x, y in L)}"/>' for L in WM)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WM_W:.2f} {WM_H:.2f}" fill="{color}">{polys}</svg>\n'
os.makedirs(os.path.join(OUT, 'svg'), exist_ok=True)
for name, col in (('ink', INK), ('bone', BONE)):
    open(os.path.join(OUT, 'svg', f'athelete-isologo-{name}.svg'), 'w').write(iso_svg(col))
    open(os.path.join(OUT, 'svg', f'athelete-wordmark-{name}.svg'), 'w').write(wm_svg(col))

# ---------- Especificación ----------
LOGO_PT = 96          # diámetro del isologo
WM_PT = 112           # ancho del wordmark
WM_BOTTOM_PT = 44     # distancia del wordmark al borde inferior del área segura
wm_h_pt = WM_PT * WM_H / WM_W

# ---------- iOS (Images.xcassets) ----------
ios = ('ios', 'Images.xcassets')
dark = [{"appearance": "luminosity", "value": "dark"}]
for asset, fn, size in (('LaunchLogo', render_iso, LOGO_PT), ('LaunchWordmark', render_wm, WM_PT)):
    imgs = []
    for sc in (1, 2, 3):
        for mode, col in (('', INK if asset == 'LaunchLogo' else MUTED_L), ('-dark', BONE if asset == 'LaunchLogo' else MUTED_D)):
            f = f'{asset.lower()}{mode}@{sc}x.png'
            save(fn(size * sc, col), *ios, f'{asset}.imageset', f)
            e = {"idiom": "universal", "filename": f, "scale": f"{sc}x"}
            if mode: e["appearances"] = dark
            imgs.append(e)
    wjson({"images": imgs, "info": {"author": "xcode", "version": 1}}, *ios, f'{asset}.imageset', 'Contents.json')
def cs(h):
    r, g, b = hex2rgb(h); return {"color-space": "srgb", "components": {"red": f"0x{r:02X}", "green": f"0x{g:02X}", "blue": f"0x{b:02X}", "alpha": "1.000"}}
wjson({"colors": [{"idiom": "universal", "color": cs(BG_L)},
                  {"idiom": "universal", "appearances": dark, "color": cs(BG_D)}],
       "info": {"author": "xcode", "version": 1}}, *ios, 'LaunchBackground.colorset', 'Contents.json')

# ---------- Android (SplashScreen API, Android 12+ y androidx core-splashscreen) ----------
# Icono: lienzo 288dp, contenido visible dentro del círculo de 192dp. Isologo a 160dp.
dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for d, s in dens.items():
    save(render_iso(int(160 * s), INK, canvas=int(288 * s)), 'android', 'res', f'drawable-{d}', 'splash_icon.png')
    save(render_iso(int(160 * s), BONE, canvas=int(288 * s)), 'android', 'res', f'drawable-night-{d}', 'splash_icon.png')
    # Branding (wordmark) 200x80dp
    save(render_wm(int(WM_PT * s), MUTED_L, canvas=(int(200 * s), int(80 * s))), 'android', 'res', f'drawable-{d}', 'splash_branding.png')
    save(render_wm(int(WM_PT * s), MUTED_D, canvas=(int(200 * s), int(80 * s))), 'android', 'res', f'drawable-night-{d}', 'splash_branding.png')
for folder, col in (('values', BG_L), ('values-night', BG_D)):
    p = os.path.join(OUT, 'android', 'res', folder); os.makedirs(p, exist_ok=True)
    open(os.path.join(p, 'splash_colors.xml'), 'w').write(
        f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="splash_background">{col}</color>\n</resources>\n')

# ---------- Mockups (para revisar) ----------
def mock(w, h, scale, bg, logo_col, wm_col, bottom_safe_pt):
    img = Image.new('RGBA', (w, h), hex2rgb(bg) + (255,))
    L = render_iso(int(LOGO_PT * scale), logo_col)
    img.alpha_composite(L, ((w - L.width) // 2, (h - L.height) // 2))
    W = render_wm(int(WM_PT * scale), wm_col)
    y = int(h - (bottom_safe_pt + WM_BOTTOM_PT) * scale - W.height)
    img.alpha_composite(W, ((w - W.width) // 2, y))
    return img
mk = {}
mk['ios-light'] = mock(1179, 2556, 3, BG_L, INK, MUTED_L, 34)
mk['ios-dark'] = mock(1179, 2556, 3, BG_D, BONE, MUTED_D, 34)
mk['android-light'] = mock(1080, 2400, 2.75, BG_L, INK, MUTED_L, 24)
mk['android-dark'] = mock(1080, 2400, 2.75, BG_D, BONE, MUTED_D, 24)
for k, v in mk.items(): save(v.convert('RGB'), 'preview', f'launch-{k}.png')
# Hoja comparativa
tw = 360; th = int(2556 * tw / 1179)
sheet = Image.new('RGB', (tw * 4 + 100, th + 40), (210, 208, 204))
for i, k in enumerate(['ios-light', 'ios-dark', 'android-light', 'android-dark']):
    t = mk[k].convert('RGB').resize((tw, int(mk[k].height * tw / mk[k].width)), Image.LANCZOS)
    sheet.paste(t, (20 + i * (tw + 20), 20))
save(sheet, 'preview', 'launch-sheet.png')
# Comparación con el original
orig = Image.open(ISO_SRC).convert('RGBA'); bgw = Image.new('RGBA', orig.size, (255, 255, 255, 255)); bgw.alpha_composite(orig)
redraw = render_iso(480, '#FF5B1F'); cmp_ = bgw.copy(); cmp_.alpha_composite(Image.blend(Image.new('RGBA', (480, 480), (0, 0, 0, 0)), redraw, .55))
save(cmp_.convert('RGB'), 'preview', 'isologo-overlay-check.png')
o = (ink_mask(ISO_SRC) > 0); n = (np.array(render_iso(480, INK))[..., 3] > 127)
print('IoU isologo redibujado vs original:', round((o & n).sum() / (o | n).sum(), 4))
print('wordmark ratio', round(WM_W / WM_H, 2), 'alto pt', round(wm_h_pt, 1))
print(json.dumps(ISO))
