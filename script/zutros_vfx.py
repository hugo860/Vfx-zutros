"""Zutros VFX loops: procedural relief walls lit by moving warm light.
Every time-dependent value goes through phase p = 2*pi*f/N so the last frame flows into the first.
usage: python zutros_vfx.py <deco|floral|seda> <width> <height> <frames|still> [out_prefix]
"""
import sys, math, subprocess
import numpy as np
import cv2

TAU = 2 * math.pi


# ---------------------------------------------------------------- helpers
def blur(a, s):
    k = int(s * 3) * 2 + 1
    return cv2.GaussianBlur(a, (k, k), s)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def stucco(W, Hh, s, seed):
    rng = np.random.default_rng(seed)
    n = blur(rng.standard_normal((Hh, W)).astype(np.float32), 1.5 * s) * 0.6
    n += blur(rng.standard_normal((Hh, W)).astype(np.float32), 6 * s) * 2.0
    n -= n.mean()
    return n / (np.abs(n).max() + 1e-6)


def rounded_rect_sdf(X, Y, cx, cy, hw, hh, r):
    qx = np.abs(X - cx) - hw + r
    qy = np.abs(Y - cy) - hh + r
    out = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2)
    return out + np.minimum(np.maximum(qx, qy), 0) - r


# ---------------------------------------------------------------- shading
class Shader:
    def __init__(self, H, hs, s, albedo=(0.95, 0.82, 0.66), ao=1.0):
        self.Hh, self.W = H.shape
        self.s = s
        self.X, self.Y = np.meshgrid(np.arange(self.W, dtype=np.float32),
                                     np.arange(self.Hh, dtype=np.float32))
        self.set_height(H, hs, ao)
        self.albedo = np.array(albedo, np.float32)

    def set_height(self, H, hs, ao=1.0):
        self.H = H.astype(np.float32)
        self.hs = hs
        Z = self.H * hs
        self.Z = Z
        gx = cv2.Sobel(Z, cv2.CV_32F, 1, 0, ksize=3) / 8.0
        gy = cv2.Sobel(Z, cv2.CV_32F, 0, 1, ksize=3) / 8.0
        n = np.sqrt(gx * gx + gy * gy + 1)
        self.nx, self.ny, self.nz = -gx / n, -gy / n, 1 / n
        cav = blur(Z, 10 * self.s) - Z
        self.ao = np.clip(1 - ao * np.maximum(cav, 0) / (hs * 0.35), 0.35, 1)[..., None]

    def light(self, lx, ly, lz, color, power, spot=None, shadow=True, spec=0.35, shin=40):
        dx = lx - self.X
        dy = ly - self.Y
        dz = lz - self.Z
        d = np.sqrt(dx * dx + dy * dy + dz * dz)
        Lx, Ly, Lz = dx / d, dy / d, dz / d
        ndl = np.maximum(self.nx * Lx + self.ny * Ly + self.nz * Lz, 0)
        att = power / (1 + (d / (lz * 1.6)) ** 2)
        if spot is not None:  # soft pool of light on the wall
            sx, sy, sr = spot
            att = att * (0.25 + 0.75 * np.exp(-(((self.X - sx) ** 2 + (self.Y - sy) ** 2) / (sr * sr))))
        sh = 1.0
        if shadow:
            dxy = np.sqrt(dx * dx + dy * dy) + 1e-3
            ux, uy = dx / dxy, dy / dxy
            slope = dz / dxy
            occ = np.zeros_like(self.Z)
            for st in (3, 7, 12, 19, 28, 40):
                st = st * self.s
                zs = cv2.remap(self.Z, self.X + ux * st, self.Y + uy * st, cv2.INTER_LINEAR,
                               borderMode=cv2.BORDER_REPLICATE)
                occ = np.maximum(occ, zs - self.Z - slope * st)
            sh = np.exp(-np.maximum(occ, 0) / (self.hs * 0.08))
        hx, hy, hz = Lx, Ly, Lz + 1
        hn = np.sqrt(hx * hx + hy * hy + hz * hz)
        ndh = np.maximum((self.nx * hx + self.ny * hy + self.nz * hz) / hn, 0)
        c = np.array(color, np.float32)
        diff = (ndl * att * sh)[..., None] * c
        spc = ((ndh ** shin) * att * sh * spec)[..., None] * c
        return diff, spc

    def compose(self, lights, ambient=(0.36, 0.27, 0.19), extra=None):
        acc = np.zeros((self.Hh, self.W, 3), np.float32) + np.array(ambient, np.float32)
        sp = np.zeros_like(acc)
        for d, s_ in lights:
            acc += d
            sp += s_
        col = self.albedo * acc * self.ao + sp * self.ao
        if extra is not None:
            col += extra
        return col


def finish(col, vignette, exposure=1.0):
    col = col * exposure * vignette[..., None] * np.array([1.04, 0.98, 0.92], np.float32)
    col = 1 - np.exp(-col * 1.6)          # soft filmic shoulder
    col = np.clip(col, 0, 1) ** (1 / 1.05)
    return (col * 255 + 0.5).astype(np.uint8)


def make_vignette(W, Hh, X, Y, amt=0.55):
    r = np.sqrt(((X - W / 2) / (W / 2)) ** 2 + ((Y - Hh / 2) / (Hh / 2)) ** 2)
    return (1 - amt * smooth(0.55, 1.45, r)).astype(np.float32)


# ---------------------------------------------------------------- motifs
def rosette(H, cx, cy, R, rng, base=0.0):
    x0, x1 = int(max(cx - R - 2, 0)), int(min(cx + R + 2, H.shape[1]))
    y0, y1 = int(max(cy - R - 2, 0)), int(min(cy + R + 2, H.shape[0]))
    if x1 <= x0 or y1 <= y0:
        return
    X, Y = np.meshgrid(np.arange(x0, x1, dtype=np.float32), np.arange(y0, y1, dtype=np.float32))
    dx, dy = X - cx, Y - cy
    r = np.sqrt(dx * dx + dy * dy)
    th = np.arctan2(dy, dx) + rng.uniform(0, TAU)
    h = np.zeros_like(r)
    n = int(rng.integers(7, 10))
    for k in range(4):
        Rk = R * (1 - 0.22 * k)
        off = k * math.pi / n + rng.uniform(-.1, .1)
        edge = Rk * (0.60 + 0.40 * np.abs(np.cos(n * (th + off) / 2)) ** 0.7)
        t = np.clip(r / edge, 0, 1)
        inside = r < edge
        # cupped petal: rises toward its rim, with soft lobe ridges
        prof = 0.18 + 0.26 * k + 0.22 * np.sqrt(np.maximum(1 - t ** 2, 0)) + 0.10 * t ** 3
        prof = prof - 0.04 * np.cos(n * 2 * (th + off)) * t
        h = np.where(inside, np.maximum(h, prof), h)
    cr = R * 0.17
    core = r < cr
    bumps = 0.05 * np.cos(dx * 0.9 / max(R / 40, 1)) * np.cos(dy * 0.9 / max(R / 40, 1))
    h = np.where(core, 0.85 + 0.15 * np.sqrt(np.maximum(1 - (r / cr) ** 2, 0)) + bumps, h)
    H[y0:y1, x0:x1] = np.maximum(H[y0:y1, x0:x1], h + base * (h > 0))


def leaf(H, cx, cy, ang, a, b, height=0.55):
    R = a + 2
    x0, x1 = int(max(cx - R, 0)), int(min(cx + R, H.shape[1]))
    y0, y1 = int(max(cy - R, 0)), int(min(cy + R, H.shape[0]))
    if x1 <= x0 or y1 <= y0:
        return
    X, Y = np.meshgrid(np.arange(x0, x1, dtype=np.float32), np.arange(y0, y1, dtype=np.float32))
    ca, sa = math.cos(ang), math.sin(ang)
    u = (X - cx) * ca + (Y - cy) * sa
    v = -(X - cx) * sa + (Y - cy) * ca
    tu = (u + a) / (2 * a)
    curve = 0.12 * b * np.sin(math.pi * tu)            # slight bend
    v = v - curve
    w = b * np.abs(np.sin(math.pi * np.clip(tu, 0, 1))) ** 0.9 * (1 + 0.06 * np.sin(tu * 28))  # serrated edge
    inside = (np.abs(u) < a) & (np.abs(v) < w)
    q = np.clip(np.abs(v) / np.maximum(w, 1e-3), 0, 1)
    prof = height * (np.sqrt(1 - q ** 2) * 0.8 + 0.2)
    prof -= 0.10 * np.exp(-(v / (0.07 * b + 0.5)) ** 2)           # midrib groove
    prof += 0.04 * np.cos((u * 0.5 - np.abs(v)) * (6.0 / b))        # side veins
    h = np.where(inside, prof, 0)
    H[y0:y1, x0:x1] = np.maximum(H[y0:y1, x0:x1], h)


def tube_lines(shape, polylines, width, height=0.38):
    m = np.zeros(shape, np.uint8)
    for pl in polylines:
        cv2.polylines(m, [np.round(pl).astype(np.int32)], False, 255, int(width * 2), cv2.LINE_AA)
    d = cv2.distanceTransform((m > 127).astype(np.uint8), cv2.DIST_L2, 5)
    return height * np.sqrt(np.clip(d / width, 0, 1) * (2 - np.clip(d / width, 0, 1)))



LOGO = None  # path to the colour logo PNG (RGBA), set from argv


def load_logo(W, Hh, cx, cy, width):
    """Return (alpha, rgb) float maps of the logo placed with its centre at cx,cy."""
    im = cv2.imread(LOGO, cv2.IMREAD_UNCHANGED)
    a = im[..., 3]
    ys, xs = np.where(a > 8)
    im = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = im.shape[:2]
    sc = width / w
    nw, nh = int(round(w * sc)), int(round(h * sc))
    im = cv2.resize(im, (nw, nh), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    alpha = np.zeros((Hh, W), np.float32)
    rgb = np.zeros((Hh, W, 3), np.float32)
    x0, y0 = int(cx - nw / 2), int(cy - nh / 2)
    alpha[y0:y0 + nh, x0:x0 + nw] = im[..., 3]
    rgb[y0:y0 + nh, x0:x0 + nw] = im[..., 2::-1][..., :3]
    return alpha, rgb


def carve_logo(H, albedo, cx, cy, width, s, lift=0.32):
    """Raise the logo out of the wall as a bevelled relief; red lacquer for the wordmark."""
    Hh, W = H.shape
    alpha, rgb = load_logo(W, Hh, cx, cy, width)
    m = (alpha > 0.5).astype(np.uint8)
    d = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    bev = np.sqrt(np.clip(d / (3.5 * s), 0, 1))
    prof = lift * (0.55 + 0.45 * bev)
    prof = prof * np.clip(alpha, 0, 1)
    H = np.maximum(H, H * (1 - alpha) + (H + prof) * alpha)
    alb = np.broadcast_to(np.array(albedo, np.float32), (Hh, W, 3)).copy()
    red = rgb[..., 0] > 0.3
    tint = np.where(red[..., None], np.array([0.62, 0.05, 0.06], np.float32),
                    np.array([0.30, 0.20, 0.12], np.float32))
    alb = alb * (1 - alpha[..., None]) + tint * alpha[..., None]
    return H, alb


# ---------------------------------------------------------------- scenes
def scene_deco(W, Hh, s):
    """Art-deco fan (scallop) relief with a central plaque, two spotlights panning."""
    X, Y = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(Hh, dtype=np.float32))
    H = np.zeros((Hh, W), np.float32)
    R = 78 * s
    dy_row = R * 0.92
    rows = int(Hh / dy_row) + 3
    for j in range(rows):
        cy = (j + 0.2) * dy_row
        offx = (j % 2) * R
        lx = X - offx
        cx = np.round(lx / (2 * R)) * 2 * R + offx
        dx, dyy = X - cx, Y - cy
        r = np.sqrt(dx * dx + dyy * dyy)
        th = np.arctan2(-dyy, dx)  # 0..pi on upper half
        m = (r < R) & (dyy <= R * 0.02)
        rr = r / R
        rings = 0.5 + 0.5 * np.cos(TAU * rr * 4.0)
        rays = 0.5 + 0.5 * np.cos(th * 18)
        fan = 0.25 + 0.30 * rr + 0.18 * rings * smooth(0.0, 0.25, rr)
        fan += 0.12 * rays * smooth(0.55, 0.75, rr) * (1 - smooth(0.88, 0.92, rr))
        fan += 0.35 * np.exp(-((rr - 0.97) / 0.035) ** 2)            # raised rim
        fan += 0.25 * np.exp(-(rr / 0.09) ** 2)                       # little hub
        H = np.where(m, fan, H)
    H += 0.015 * stucco(W, Hh, s, 3)
    # central plaque (logo space): bevelled frame, smooth slightly recessed field
    pw, ph = W * 0.20, Hh * 0.26
    sd = rounded_rect_sdf(X, Y, W / 2, Hh / 2, pw, ph, 46 * s)
    frame = 0.95 * np.exp(-((sd + 14 * s) / (9 * s)) ** 2) + 0.55 * np.exp(-((sd + 36 * s) / (5 * s)) ** 2)
    field = sd < 0
    H = np.where(field, 0.30 + 0.01 * stucco(W, Hh, s, 9), H)
    H = np.maximum(H, frame)
    H = np.where((sd > -2 * s) & (sd < 6 * s), np.maximum(H, 0.6 * np.exp(-((sd - 2 * s) / (4 * s)) ** 2)), H)
    H = blur(H, 0.8 * s)
    alb = (0.99, 0.84, 0.68)
    if LOGO:
        H, alb = carve_logo(H, alb, W / 2, Hh / 2, pw * 2 * 0.82, s)
    sh = Shader(H, 26 * s, s, albedo=alb)
    vig = make_vignette(W, Hh, X, Y, 0.5)
    # LED cove glow along the top edge, like the reference niche
    cove = (np.exp(-(Y / (60 * s))) * 0.12)[..., None] * np.array([1.0, 0.75, 0.45], np.float32)

    def frame_at(p):
        lights = []
        for k, sign in enumerate((-1, 1)):
            lx = W / 2 + sign * W * 0.27 + W * 0.13 * math.sin(p + k * math.pi)
            ly = Hh * 0.18 + Hh * 0.05 * math.sin(2 * p + k)
            lights.append(sh.light(lx, ly - Hh * 0.35, 240 * s, (1.0, 0.78, 0.52), 2.1,
                                   spot=(lx, ly + Hh * 0.25, Hh * 0.55)))
        # slow grazing sheen that crosses the wall once per loop
        gx = -W * 0.3 + (W * 1.6) * ((p / TAU) % 1.0)
        lights.append(sh.light(gx, Hh * 0.5, 70 * s, (1.0, 0.85, 0.6), 0.55 * math.sin(math.pi * ((p / TAU) % 1.0)) ** 2, shadow=False, spec=0.5))
        col = sh.compose(lights, extra=cove)
        return finish(col, vig, 1.05)
    return frame_at


def scene_floral(W, Hh, s, seed=7):
    """Carved floral wall (peonies, leaves, vines) around a round medallion; light orbits slowly."""
    rng = np.random.default_rng(seed)
    X, Y = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(Hh, dtype=np.float32))
    cx, cy = W / 2, Hh / 2
    R0 = Hh * (0.30 if LOGO else 0.25)
    H = 0.06 * stucco(W, Hh, s, seed)
    # vines
    vines = []
    tips = []
    for i in range(22):
        a0 = TAU * i / 22 + rng.uniform(-.15, .15)
        rad = R0 * 1.18
        x, y = cx + rad * math.cos(a0), cy + rad * math.sin(a0)
        ang = a0 + rng.uniform(-0.5, 0.5)
        pts = [(x, y)]
        L = rng.uniform(0.25, 0.55) * W
        curl = rng.uniform(-1.0, 1.0) * 2.2 / L
        nseg = 60
        for k in range(nseg):
            ang += curl * (L / nseg) + 0.25 * math.sin(k * 0.35 + i) / nseg * 6
            x += math.cos(ang) * L / nseg
            y += math.sin(ang) * L / nseg
            pts.append((x, y))
        pts = np.array(pts, np.float32)
        vines.append(pts)
        tips.append(pts)
    Hv = tube_lines((Hh, W), vines, 5.5 * s, 0.34)
    H = np.maximum(H, Hv)
    # leaves along vines, alternating sides
    for pts in vines:
        for k in range(3, len(pts) - 2, 2):
            p0, p1 = pts[k - 1], pts[k + 1]
            tang = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
            side = 1 if (k // 2) % 2 else -1
            a = rng.uniform(30, 52) * s
            ang = tang + side * rng.uniform(0.6, 1.1)
            lx = pts[k][0] + math.cos(ang) * a * 0.9
            ly = pts[k][1] + math.sin(ang) * a * 0.9
            if math.hypot(lx - cx, ly - cy) < R0 * 1.12:
                continue
            leaf(H, lx, ly, ang, a, a * rng.uniform(0.32, 0.42), rng.uniform(0.45, 0.6))
    # flowers: big ones at vine tips / midpoints, small buds scattered
    spots = []
    for pts in vines:
        for idx, Rr in ((len(pts) - 1, rng.uniform(80, 125)), (len(pts) // 2, rng.uniform(50, 75))):
            px, py = pts[idx]
            spots.append((px, py, Rr * s))
    for _ in range(260):
        spots.append((rng.uniform(-40, W + 40), rng.uniform(-40, Hh + 40), rng.uniform(25, 115) * s))
    placed = []
    for px, py, Rr in sorted(spots, key=lambda t: -t[2]):
        if math.hypot(px - cx, py - cy) < R0 * 1.15 + Rr:
            continue
        if any(math.hypot(px - qx, py - qy) < (Rr + qr) * 0.78 for qx, qy, qr in placed):
            continue
        placed.append((px, py, Rr))
        rosette(H, px, py, Rr, rng, base=0.15)
    # medallion
    r = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
    th = np.arctan2(Y - cy, X - cx)
    inner = r < R0 * 1.12
    H = np.where(inner, 0.05 + 0.01 * stucco(W, Hh, s, 11), H)
    ring = 0.85 * np.sqrt(np.clip(1 - ((r - R0) / (16 * s)) ** 2, 0, 1))
    ring2 = 0.55 * np.sqrt(np.clip(1 - ((r - R0 * 0.9) / (6 * s)) ** 2, 0, 1))
    beads_r = R0 + 34 * s
    nb = 72
    bth = (np.round(th / (TAU / nb)) * (TAU / nb))
    bx, by = cx + beads_r * np.cos(bth), cy + beads_r * np.sin(bth)
    bd = np.sqrt((X - bx) ** 2 + (Y - by) ** 2)
    beads = 0.55 * np.sqrt(np.clip(1 - (bd / (8.5 * s)) ** 2, 0, 1))
    H = np.maximum.reduce([H, ring, ring2, beads])
    H = blur(H, 0.8 * s)
    alb = (0.99, 0.84, 0.68)
    if LOGO:
        H, alb = carve_logo(H, alb, cx, cy + 6 * s, (R0 - 16 * s) * 2 * 0.86, s, lift=0.28)
    sh = Shader(H, 34 * s, s, albedo=alb)
    vig = make_vignette(W, Hh, X, Y, 0.45)
    cove = (np.exp(-(Y / (70 * s))) * 0.10 + np.exp(-((Hh - Y) / (50 * s))) * 0.06)[..., None] \
        * np.array([1.0, 0.74, 0.44], np.float32)

    def frame_at(p):
        lights = []
        a = p + 0.6
        lx = cx + W * 0.42 * math.cos(a)
        ly = cy + Hh * 0.45 * math.sin(a) - Hh * 0.2
        lights.append(sh.light(lx, ly, 260 * s, (1.0, 0.78, 0.52), 2.0, spot=(lx, ly + Hh * 0.1, Hh * 0.75)))
        # two fixed downlights like the reference ("wall washers")
        for fx in (0.3, 0.7):
            pulse = 0.85 + 0.15 * math.sin(p * 2 + fx * 9)
            lights.append(sh.light(W * fx, -Hh * 0.1, 200 * s, (1.0, 0.80, 0.56), 0.8 * pulse,
                                   spot=(W * fx, Hh * 0.2, Hh * 0.45), shadow=True))
        col = sh.compose(lights, extra=cove)
        return finish(col, vig, 1.1)
    return frame_at


def scene_seda(W, Hh, s, seed=5):
    """Champagne silk drapes rippling, golden dust drifting, soft glow behind the centre."""
    rng = np.random.default_rng(seed)
    X, Y = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(Hh, dtype=np.float32))
    xn, yn = X / Hh, Y / Hh
    waves = []
    for i in range(6):
        ang = rng.uniform(-0.5, 0.5) + 0.9
        k = rng.uniform(2.0, 5.5) * (1 if i < 3 else 1.8)
        waves.append((math.cos(ang) * k, math.sin(ang) * k, rng.uniform(0, TAU),
                      int(rng.choice([1, 1, 2, -1])), 1.0 / (1 + i * 0.6)))
    warps = [(rng.uniform(1, 2.5), rng.uniform(1, 2.5), rng.uniform(0, TAU), int(rng.choice([1, -1])))
             for _ in range(2)]
    sh = Shader(np.zeros((Hh, W), np.float32), 70 * s, s, albedo=(0.93, 0.78, 0.58), ao=0.6)
    vig = make_vignette(W, Hh, X, Y, 0.6)
    r = np.sqrt(((X - W / 2) / (W * 0.5)) ** 2 + ((Y - Hh / 2) / (Hh * 0.62)) ** 2)
    halo = (np.exp(-(r / 0.55) ** 2) * 0.22)[..., None] * np.array([1.0, 0.78, 0.48], np.float32)
    # dust: each particle travels an integer number of screen widths per loop
    nP = 220
    P = dict(x=rng.uniform(0, W, nP), y=rng.uniform(0, Hh, nP), laps=rng.integers(1, 3, nP),
             amp=rng.uniform(10, 50, nP) * s, ph=rng.uniform(0, TAU, nP), sz=rng.uniform(1.0, 3.2, nP) * s,
             tw=rng.integers(1, 4, nP), br=rng.uniform(0.3, 1.0, nP))

    def frame_at(p):
        wx = sum(0.06 * math.sin(0) + 0.06 * np.sin(a * yn + b * xn + c + d * p) for a, b, c, d in warps)
        wy = sum(0.06 * np.cos(b * yn - a * xn + c + d * p) for a, b, c, d in warps)
        Hm = np.zeros_like(X)
        for kx, ky, ph, sp, amp in waves:
            Hm += amp * np.sin(kx * (xn + wx) * TAU / 2 + ky * (yn + wy) * TAU / 2 + ph + sp * p)
        Hm = Hm / 2.2
        Hm = np.sign(Hm) * np.abs(Hm) ** 0.8   # sharper folds
        sh.set_height(Hm, 70 * s, 0.6)
        lights = [sh.light(W * 0.5 + W * 0.25 * math.cos(p), -Hh * 0.3, 500 * s, (1.0, 0.80, 0.55), 1.4,
                           shadow=False, spec=0.9, shin=25),
                  sh.light(W * 0.5 - W * 0.3 * math.sin(p), Hh * 1.3, 400 * s, (0.9, 0.65, 0.40), 0.5,
                           shadow=False, spec=0.4, shin=20)]
        col = sh.compose(lights, ambient=(0.30, 0.22, 0.15), extra=halo)
        img = np.zeros((Hh, W), np.float32)
        t = p / TAU
        px = (P['x'] + P['laps'] * W * t) % W
        py = P['y'] + P['amp'] * np.sin(p + P['ph'])
        tw = 0.55 + 0.45 * np.sin(P['tw'] * p + P['ph'] * 3)
        for x, y, z, b in zip(px, py, P['sz'], P['br'] * tw):
            cv2.circle(img, (int(x * 4), int(y * 4)), max(int(z * 4), 1), float(b), -1, cv2.LINE_AA, 2)
        glow = blur(img, 1.2 * s) * 1.4 + blur(img, 6 * s) * 2.5
        col += glow[..., None] * np.array([1.0, 0.82, 0.5], np.float32)
        if LOGO:
            col = logo_over(col, p)
        return finish(col, vig, 1.0)
    if LOGO:
        la, lrgb = load_logo(W, Hh, W / 2, Hh / 2, W * 0.42)
        shadow = blur(np.roll(la, (int(10 * s), int(6 * s)), (0, 1)), 9 * s)
        glow = blur(la, 22 * s)
        lred = lrgb[..., 0] > 0.3
        tint = np.where(lred[..., None], np.array([0.62, 0.04, 0.05], np.float32),
                        np.array([0.16, 0.10, 0.06], np.float32))
        diag = (X - W / 2) / W + (Y - Hh / 2) / Hh * 0.4

        def logo_over(col, p):
            col = col * (1 - 0.55 * shadow[..., None])
            col = col + glow[..., None] * np.array([0.35, 0.25, 0.12], np.float32)
            # gloss sweep across the letters once per loop (zero at the seam)
            t = (p / TAU) % 1.0
            band = np.exp(-((diag - (-0.8 + 1.6 * t)) / 0.06) ** 2) * math.sin(math.pi * t) ** 2
            lc = tint * 1.15 + band[..., None] * np.array([1.2, 0.9, 0.6], np.float32) * lred[..., None]
            return col * (1 - la[..., None]) + lc * la[..., None]
    return frame_at


SCENES = dict(deco=scene_deco, floral=scene_floral, seda=scene_seda)

if __name__ == "__main__":
    name, W, Hh, mode = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    out = sys.argv[5] if len(sys.argv) > 5 else name
    if len(sys.argv) > 6:
        LOGO = sys.argv[6]
    s = Hh / 1080
    fr = SCENES[name](W, Hh, s)
    if mode == "still":
        for i, ph in enumerate((0.0, 0.33, 0.66)):
            cv2.imwrite(f"{out}_{i}.png", cv2.cvtColor(fr(ph * TAU), cv2.COLOR_RGB2BGR))
    else:
        N = int(mode)
        cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{Hh}",
               "-r", "30", "-i", "-",
               "-c:v", "hap", "-format", "hap", "-chunks", "4", f"{out}_HAP.mov",
               "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-g", "30",
               "-movflags", "+faststart", f"{out}_H264.mp4"]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for f in range(N):
            proc.stdin.write(fr(TAU * f / N).tobytes())
            if f % 50 == 0:
                print(name, f, flush=True)
        proc.stdin.close()
        proc.wait()
        print("done", name, proc.returncode)
