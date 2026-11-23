# 3D crest

Source files for the 3D Detroit Catholic Central crest in the sidebar. The website itself only uses `public/dcc-crest-3d.glb` (a copy of `model/crest.glb`); nothing in this folder is part of the build.

- `source/crest_source.png`: the 612 px crest image from catholiccentral.net's brand guidelines page, traced to make the model
- `build_crest.py`: traces the image into colored layers and extrudes them into a 100 mm medallion (base disc 3 mm, blue +0.8, white details +1.2, red/gold +1.6)
- `model/`: the output: `crest.glb` / `crest.obj` (with colors), `crest_single_color.stl`, and one STL per color for multi-color 3D printing. `_layers_debug.png` shows how each pixel was classified.
- `crest_viewer.html`: standalone page for orbiting the model in a browser (the GLB is embedded); `viewer_template.html` is what it is built from

## Rebuilding

Needs Python 3 with `pillow numpy opencv-python-headless shapely trimesh mapbox-earcut`.

```bash
cd crest-3d
python build_crest.py source/crest_source.png model
cp model/crest.glb ../public/dcc-crest-3d.glb
```

Sizes and layer heights are set at the top of `build_crest.py`. A vector version of the crest (.svg/.ai/.eps/.pdf) traced the same way would give sharper edges than the 612 px PNG.
