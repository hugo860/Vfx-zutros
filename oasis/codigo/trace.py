# Prepara el logo Oasis: PNG blanco transparente, PNG con franjas atardecer y logo_shapes.json (vectores para 3D)
import cv2, numpy as np, json, sys
src = sys.argv[1]
im = cv2.imread(src, cv2.IMREAD_UNCHANGED)
if im.ndim == 3 and im.shape[2] == 4:
    gray = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2GRAY); a = np.minimum(255 - gray, im[..., 3])
else:
    gray = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2GRAY); a = 255 - gray
ys, xs = np.where(a > 40); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
pad = 20
a = a[y0 - pad:y1 + pad + 1, x0 - pad:x1 + pad + 1]
h, w = a.shape
m = (a > 127).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(m)
# la O = componente con mayor area cuyo bbox empieza a la izquierda; franjas = componentes dentro del hueco de la O
order = sorted(range(1, n), key=lambda i: st[i, 0])
O = max(range(1, n), key=lambda i: st[i, 4] if st[i, 0] < w * 0.1 else 0)
ox, oy, ow, oh = st[O, :4]
franja = np.zeros_like(m); resto = np.zeros_like(m)
for i in range(1, n):
    x, y, ww, hh = st[i, :4]
    inside = i != O and x > ox and x + ww < ox + ow and y > oy and y + hh < oy + oh
    (franja if inside else resto)[lab == i] = 1
print('componentes', n - 1, 'franjas px', franja.sum())
# PNG blanco
white = np.dstack([np.full((h, w), 255, np.uint8)] * 3 + [a]); cv2.imwrite('logos/oasis_logo_blanco.png', white)
black = np.dstack([np.zeros((h, w), np.uint8)] * 3 + [a]); cv2.imwrite('logos/oasis_logo_negro.png', black)
# PNG atardecer: letras blancas, franjas de la O en degradado oro->coral->magenta
ys_f, xs_f = np.where(franja > 0); fy0, fy1 = ys_f.min(), ys_f.max()
t = np.clip((np.arange(h)[:, None] - fy0) / max(1, fy1 - fy0), 0, 1) * np.ones((1, w))
c0, c1, c2 = np.array([90, 200, 255]), np.array([80, 110, 255]), np.array([150, 40, 220])  # BGR
col = np.where(t[..., None] < .5, c0 + (c1 - c0) * (t[..., None] * 2), c1 + (c2 - c1) * (t[..., None] * 2 - 1))
fd = cv2.dilate(franja, np.ones((5, 5), np.uint8)).astype(bool)
sun = np.full((h, w, 3), 255, np.float32); sun[fd] = col[fd]
cv2.imwrite('logos/oasis_logo_atardecer.png', np.dstack([sun.astype(np.uint8), a]))
# vectores
cx, cy = w / 2, h / 2
def norm(c):
    c = cv2.approxPolyDP(c, 0.8, True).reshape(-1, 2) / 2.0
    return [[round(float((p[0] - cx) / w), 5), round(float(-(p[1] - cy) / w), 5)] for p in c]
out = {}
for name, mk in (('letras', resto), ('franjas', franja)):
    mm = cv2.resize(mk * 255, None, fx=2, fy=2, interpolation=cv2.INTER_LINEAR); mm = (mm > 127).astype(np.uint8)
    cnts, hier = cv2.findContours(mm, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE); hier = hier[0]; shapes = []
    for i, c in enumerate(cnts):
        if hier[i][3] != -1 or cv2.contourArea(c) < 20: continue
        holes = []; j = hier[i][2]
        while j != -1:
            if cv2.contourArea(cnts[j]) > 10: holes.append(norm(cnts[j]))
            j = hier[j][0]
        shapes.append({'o': norm(c), 'h': holes})
    out[name] = shapes; print(name, len(shapes), sum(len(s['o']) for s in shapes))
out['aspect'] = h / w
json.dump(out, open('logo_shapes.json', 'w'))
