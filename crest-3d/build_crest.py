"""Build a layered 3D medallion of the Detroit Catholic Central crest.

Usage: python build_crest.py <crest.png> <out_dir>

Layers (all in mm, diameter ~100 mm):
  base   white disc            z 0.0 -> 3.0
  blue   ring, shield fields   z 3.0 -> 3.8
  white  text, cross, shamrock z 3.0 -> 4.2  (stands 0.4 proud of blue)
  red    rose, gear details    z 3.0 -> 4.6
  gold   gear                  z 3.0 -> 4.6
"""
import sys, os, json
import numpy as np, cv2, trimesh
from PIL import Image
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
UP = 4                # upscale factor before tracing (smoother outlines)
DIAM_MM = 100.0
BASE = 3.0
LAYERS = {            # name: (rgb used for classification, display rgb, top z)
    "blue":  ((0, 72, 160),   (0, 75, 160),   BASE + 0.8),
    "white": ((235, 235, 235),(245, 245, 242), BASE + 1.2),
    "red":   ((225, 35, 40),  (220, 36, 44),  BASE + 1.6),
    "gold":  ((235, 195, 20), (240, 190, 30), BASE + 1.6),
}

img = Image.open(SRC).convert("RGBA")
W, H = img.size
img = img.resize((W * UP, H * UP), Image.LANCZOS)
a = np.asarray(img).astype(np.float32)
rgb, alpha = a[..., :3], a[..., 3]

# nearest-palette classification
names = list(LAYERS)
pal = np.array([LAYERS[n][0] for n in names], np.float32)
d = ((rgb[..., None, :] - pal[None, None]) ** 2).sum(-1)
cls = d.argmin(-1)
inside = alpha > 128

def smooth(mask, sigma=UP * 0.6):
    m = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), sigma)
    return m > 0.5

def remove_specks(mask, min_px):
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    keep = np.zeros(n, bool); keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_px
    return keep[lab]

masks = {}
base_mask = smooth(inside, UP * 1.0)
# fill the see-through gaps between shield and ring so the disc is solid
outside = np.zeros((base_mask.shape[0] + 2, base_mask.shape[1] + 2), np.uint8)
ff = (~base_mask).astype(np.uint8).copy()
cv2.floodFill(ff, outside, (0, 0), 2)
base_mask = ff != 2
masks["base"] = base_mask
for i, n in enumerate(names):
    m = (cls == i) & inside
    masks[n] = remove_specks(smooth(m), (UP * 2) ** 2)

# White layer: only white enclosed by blue (text/cross/shamrock/fields), not the
# outer white rim around the seal, which stays at base height.
wm = masks["white"].astype(np.uint8)
n, lab = cv2.connectedComponents(wm, connectivity=8)
eroded_edge = base_mask & ~cv2.erode(base_mask.astype(np.uint8), np.ones((UP * 3, UP * 3), np.uint8)).astype(bool)
rim_ids = set(np.unique(lab[eroded_edge & (lab > 0)]))
masks["white"] = (lab > 0) & ~np.isin(lab, list(rim_ids))

# geometry: pixel -> mm, centred, y up
ys, xs = np.nonzero(base_mask)
cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
scale = DIAM_MM / max(xs.max() - xs.min(), ys.max() - ys.min())

def mask_to_polys(mask):
    cnts, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hier is None:
        return []
    hier = hier[0]
    def to_mm(c):
        c = cv2.approxPolyDP(c, 0.35 * UP / 2, True)[:, 0, :].astype(float)
        return np.c_[(c[:, 0] - cx) * scale, (cy - c[:, 1]) * scale]
    polys = []
    for i, h in enumerate(hier):
        if h[3] != -1 or len(cnts[i]) < 4:
            continue
        shell = to_mm(cnts[i])
        holes, j = [], h[2]
        while j != -1:
            if len(cnts[j]) >= 4:
                hh = to_mm(cnts[j])
                if len(hh) >= 3:
                    holes.append(hh)
            j = hier[j][0]
        if len(shell) < 3:
            continue
        p = Polygon(shell, holes).buffer(0)
        if p.area > 0.02:
            polys.append(p)
    g = unary_union(polys)
    return list(g.geoms) if isinstance(g, MultiPolygon) else [g]

def extrude(polys, z0, z1):
    parts = [trimesh.creation.extrude_polygon(p, z1 - z0) for p in polys if p.area > 0]
    m = trimesh.util.concatenate(parts)
    m.apply_translation([0, 0, z0])
    return m

meshes = {"base": extrude(mask_to_polys(masks["base"]), 0, BASE)}
for n in names:
    meshes[n] = extrude(mask_to_polys(masks[n]), BASE - 0.01, LAYERS[n][2])

colors = {"base": (245, 245, 242)}
colors.update({n: LAYERS[n][1] for n in names})

def srgb_to_linear(c):   # glTF baseColorFactor is linear
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

scene = trimesh.Scene()
for n, m in meshes.items():
    m.visual = trimesh.visual.ColorVisuals(m, face_colors=list(colors[n]) + [255])
    mat = trimesh.visual.material.PBRMaterial(
        name=n, baseColorFactor=[srgb_to_linear(c / 255) for c in colors[n]] + [1],
        metallicFactor=0.0, roughnessFactor=0.55)
    m.visual = trimesh.visual.TextureVisuals(material=mat)
    scene.add_geometry(m, node_name=n, geom_name=n)
    m.export(os.path.join(OUT, f"crest_{n}.stl"))

scene.export(os.path.join(OUT, "crest.glb"))
scene.export(os.path.join(OUT, "crest.obj"))
trimesh.util.concatenate(list(meshes.values())).export(os.path.join(OUT, "crest_single_color.stl"))

# debug preview of classification
dbg = np.zeros(base_mask.shape + (3,), np.uint8); dbg[base_mask] = (200, 200, 200)
for n in names:
    dbg[masks[n]] = LAYERS[n][1]
Image.fromarray(dbg).resize((W * 2, H * 2)).save(os.path.join(OUT, "_layers_debug.png"))
print(json.dumps({n: dict(faces=len(m.faces), watertight=bool(m.is_watertight),
                          bounds=np.round(m.bounds, 2).tolist()) for n, m in meshes.items()}, indent=1))
