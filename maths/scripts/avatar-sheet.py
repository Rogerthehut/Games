"""
Cuts the older and teenage portraits out of the contact sheet in src/assets/avatars/source/ and writes them to
src/assets/avatars/variants-older (Years 7 to 10) and variants-teen (Years 11 to 13), named like the younger set (explorer-1.webp).
Each portrait is a tight head-and-shoulders crop, so held props don't show. Tiles whose props sit beside or behind the head are skipped.

    python3 scripts/avatar-sheet.py

If higher-resolution originals turn up, replace the files in those folders (same names, any square size).
"""
import os
import sys
from PIL import Image, ImageFilter

# Sharper enlargement with a super-resolution model, if one is available:
#   pip install opencv-contrib-python-headless
#   curl -L -o EDSR_x4.pb https://raw.githubusercontent.com/Saafke/EDSR_Tensorflow/master/models/EDSR_x4.pb
#   AVATAR_SR_MODEL=EDSR_x4.pb python3 scripts/avatar-sheet.py
# Without it the portraits are enlarged with a plain sharpen, which is softer.
SR = None
if os.environ.get("AVATAR_SR_MODEL"):
    sys.path.insert(0, os.environ.get("AVATAR_SR_LIB", ""))
    import cv2
    import numpy as np
    SR = cv2.dnn_superres.DnnSuperResImpl_create()
    SR.readModel(os.environ["AVATAR_SR_MODEL"])
    SR.setModel("edsr", 4)

ROOT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "avatars")
sheet = Image.open(os.path.join(ROOT, "source", "preteen-teen-sheet.webp")).convert("RGB")
COLS = [11, 71, 138, 198, 265, 325, 392, 452, 517, 578, 644, 704, 771, 831, 898, 959]
TOPS = {"explorer": 14, "builder": 94, "artist": 174, "skater": 255}
# tiles 0-7 are the preteens, 8-15 the teenagers, except where the last purple-hoodie skaters belong with the younger ones
SKIP = {"explorer": {1, 2, 3, 4, 5, 6, 10}, "builder": set(), "artist": {1, 2, 3, 6, 9, 11, 12}, "skater": {7, 10, 11}}
OLDER = {"explorer": [0, 7, 8, 9], "builder": range(0, 8), "artist": range(0, 8), "skater": list(range(0, 7)) + [8, 9]}
SIZE = 192

for band, folder in (("older", "variants-older"), ("teen", "variants-teen")):
    out = os.path.join(ROOT, folder)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        if f.endswith(".webp") or f.endswith(".txt"):
            os.remove(os.path.join(out, f))
    for role, top in TOPS.items():
        older = set(OLDER[role])
        tiles = [i for i in range(16) if i not in SKIP[role] and ((i in older) == (band == "older"))]
        for n, i in enumerate(tiles, 1):
            x = COLS[i]
            tile = sheet.crop((x + 9, top + 3, x + 46, top + 40))  # 37 x 37: head and shoulders
            if SR:
                tile = Image.fromarray(cv2.cvtColor(SR.upsample(cv2.cvtColor(np.array(tile), cv2.COLOR_RGB2BGR)), cv2.COLOR_BGR2RGB))
            else:
                tile = tile.resize((SIZE * 2, SIZE * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=3, percent=70, threshold=2))
            tile = tile.resize((SIZE, SIZE), Image.LANCZOS)
            tile.save(os.path.join(out, f"{role}-{n}.webp"), quality=92)
        print(band, role, len(tiles))
