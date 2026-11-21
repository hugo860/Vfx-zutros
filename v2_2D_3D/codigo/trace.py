import cv2, numpy as np, json
im = cv2.imread('logo_red.png', cv2.IMREAD_UNCHANGED)
a = im[...,3]; b,g,r = im[...,0], im[...,1], im[...,2]
ys,xs = np.where(a>8); x0,x1,y0,y1 = xs.min(),xs.max(),ys.min(),ys.max()
out = {}
for name, mask in (('rojo', (a>128)&(r>60)), ('texto', (a>128)&(r<=60))):
    m = (mask.astype(np.uint8)*255)
    m = cv2.resize(m, None, fx=2, fy=2, interpolation=cv2.INTER_LINEAR)
    m = (m>127).astype(np.uint8)
    cnts, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    shapes = []
    hier = hier[0]
    W = (x1-x0)
    cx, cy = (x0+x1)/2, (y0+y1)/2
    def norm(c):
        c = cv2.approxPolyDP(c, 0.8, True).reshape(-1,2)/2.0
        return [[round(float((p[0]-cx)/W),5), round(float(-(p[1]-cy)/W),5)] for p in c]
    for i,c in enumerate(cnts):
        if hier[i][3] != -1 or cv2.contourArea(c) < 20: continue
        holes = []
        j = hier[i][2]
        while j != -1:
            if cv2.contourArea(cnts[j]) > 10: holes.append(norm(cnts[j]))
            j = hier[j][0]
        shapes.append({'o': norm(c), 'h': holes})
    out[name] = shapes
    print(name, len(shapes), sum(len(s['o']) for s in shapes))
out['aspect'] = float((y1-y0)/(x1-x0))
json.dump(out, open('logo_shapes.json','w'))
