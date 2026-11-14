"""
Turns a picture into colour-by-number regions for src/engine/little-art-traced.ts.

  python3 tools/art/trace.py lines  dino.png  --out dino.json      # black line art: every closed area becomes a region
  python3 tools/art/trace.py colour owl.png   --k 7 --out owl.json # a coloured picture: similar colours become regions

Each region is a smooth closed curve (cubic Béziers through the traced outline) in a 100 x 100 box, with its area and middle, so a person (or the
build script) can decide which become numbered areas, which are drawn as outline only, and which colour each gets. Needs opencv-python-headless and numpy.
"""
import argparse, json, sys
import cv2
import numpy as np

BOX = 100.0

def smooth_path(contour, scale, ox, oy, eps):
    pts = cv2.approxPolyDP(contour, eps, True).reshape(-1, 2).astype(float)
    if len(pts) < 3:
        return None
    pts = [(ox + x * scale, oy + y * scale) for x, y in pts]
    n = len(pts); d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(n):                                   # Catmull-Rom through the points, as cubic Béziers
        p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d + "z"

def region_path(mask, scale, ox, oy, eps=1.6):
    cs, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    parts = [smooth_path(c, scale, ox, oy, eps) for c in cs if cv2.contourArea(c) > 6]
    return "".join(p for p in parts if p)

def fit(shape, margin=3.0, box=BOX):
    h, w = shape[:2]; s = (box - 2 * margin) / max(h, w)
    return s, (box - w * s) / 2, (box - h * s) / 2

def lines_mode(img, args):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if args.crop_corner:                                   # a watermark, say 0.68,0.93 = from 68% across and 93% down
        fx, fy = args.crop_corner; gray[int(gray.shape[0] * fy):, int(gray.shape[1] * fx):] = 255
    _, line = cv2.threshold(gray, args.threshold, 255, cv2.THRESH_BINARY_INV)
    line = cv2.morphologyEx(line, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))   # seal pinholes in the outline
    free = (line == 0).astype(np.uint8)
    n, lab, stats, cent = cv2.connectedComponentsWithStats(free, connectivity=4)
    return line, n, lab, stats, cent

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("mode", choices=["lines", "colour"]); ap.add_argument("image")
    ap.add_argument("--out", required=True); ap.add_argument("--threshold", type=int, default=150); ap.add_argument("--min-area", type=float, default=0.00012, help="smallest region, as a share of the picture")
    ap.add_argument("--grow", type=int, default=2, help="pixels each region grows so neighbours meet under the outline")
    ap.add_argument("--crop-corner", type=float, nargs=2, default=None); ap.add_argument("--k", type=int, default=7); ap.add_argument("--dark", type=int, default=45, help="colour mode: brightness below this is outline")
    a = ap.parse_args()
    img = cv2.imread(a.image)
    if img is None: sys.exit("can't read the image")
    H, W = img.shape[:2]; scale = 1000.0 / max(H, W)
    if scale < 1: img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA); H, W = img.shape[:2]
    s, ox, oy = fit(img.shape)
    out = []
    if a.mode == "lines":
        line, n, lab, stats, cent = lines_mode(img, a)
        for i in range(1, n):
            area = int(stats[i, cv2.CC_STAT_AREA])
            if area < a.min_area * H * W: continue
            m = (lab == i).astype(np.uint8) * 255
            if a.grow: m = cv2.dilate(m, np.ones((2 * a.grow + 1, 2 * a.grow + 1), np.uint8))
            x, y, w, h = (int(stats[i, k]) for k in (cv2.CC_STAT_LEFT, cv2.CC_STAT_TOP, cv2.CC_STAT_WIDTH, cv2.CC_STAT_HEIGHT))
            touches = x <= 1 or y <= 1 or x + w >= W - 1 or y + h >= H - 1
            out.append({"id": i, "area": round(100 * area / (H * W), 3), "background": touches, "at": [round(ox + cent[i][0] * s, 1), round(oy + cent[i][1] * s, 1)], "d": region_path(m, s, ox, oy)})
    else:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        line = (gray < a.dark).astype(np.uint8) * 255
        line = cv2.morphologyEx(line, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        blur = cv2.bilateralFilter(img, 9, 40, 9)
        lab_img = cv2.cvtColor(blur, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
        crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
        _, labels, centres = cv2.kmeans(lab_img, a.k, None, crit, 4, cv2.KMEANS_PP_CENTERS)
        labels = labels.reshape(H, W); labels[line > 0] = -1
        rgb = cv2.cvtColor(centres.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_LAB2BGR).reshape(-1, 3)[:, ::-1]
        idx = 1
        for c in range(a.k):
            m = ((labels == c).astype(np.uint8)) * 255
            m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            n, lab, stats, cent = cv2.connectedComponentsWithStats(m, connectivity=4)
            for i in range(1, n):
                area = int(stats[i, cv2.CC_STAT_AREA])
                if area < a.min_area * H * W: continue
                mm = (lab == i).astype(np.uint8) * 255
                if a.grow: mm = cv2.dilate(mm, np.ones((2 * a.grow + 1, 2 * a.grow + 1), np.uint8))
                x, y, w, h = (int(stats[i, k]) for k in (cv2.CC_STAT_LEFT, cv2.CC_STAT_TOP, cv2.CC_STAT_WIDTH, cv2.CC_STAT_HEIGHT))
                out.append({"id": idx, "cluster": c, "colour": "#%02x%02x%02x" % tuple(int(v) for v in rgb[c]), "area": round(100 * area / (H * W), 3), "background": x <= 1 or y <= 1 or x + w >= W - 1 or y + h >= H - 1,
                            "at": [round(ox + cent[i][0] * s, 1), round(oy + cent[i][1] * s, 1)], "d": region_path(mm, s, ox, oy)}); idx += 1
    # the outline itself, as a filled shape, so every line in the original (eyes, a smile, folds in a leg) is kept exactly
    lm = cv2.morphologyEx(line, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) if a.mode == "colour" else line
    json.dump({"regions": out, "lines": region_path(lm, s, ox, oy, 1.1), "aspect": [W, H]}, open(a.out, "w"))
    print(f"{len(out)} regions -> {a.out}")

if __name__ == "__main__": main()
