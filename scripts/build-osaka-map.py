"""Build the bundled map. Requires Python shapely; not a runtime dependency.
Usage: python scripts/build-osaka-map.py path/to/N03-21_27_210101.json
See lib/data/README.md for source, license and retrieval details.
"""
import json, math, sys
from pathlib import Path
from collections import defaultdict
from shapely.geometry import shape, Polygon
from shapely.ops import unary_union, transform

features = json.loads(Path(sys.argv[1]).read_text())['features']
groups = defaultdict(list)
aliases = defaultdict(set)
codes = {}
for feature in features:
    p = feature['properties']
    parent, local = p['N03_003'] or '', p['N03_004']
    name = parent if parent in ['大阪市', '堺市'] else parent + local
    groups[name].append(shape(feature['geometry']))
    aliases[name].update([name, parent + local, local if name != parent else name])
    codes[name] = {'大阪市': '27100', '堺市': '27140'}.get(name, p['N03_007'])

projected = {name: transform(lambda x,y,z=None: (x*math.cos(math.radians(34.6)), -y), unary_union(parts)) for name,parts in groups.items()}
bounds = unary_union(list(projected.values())).bounds
scale = min(500/(bounds[2]-bounds[0]), 620/(bounds[3]-bounds[1]))
offset_x = (560-(bounds[2]-bounds[0])*scale)/2
offset_y = (680-(bounds[3]-bounds[1])*scale)/2
def coord(x,y,z=None): return ((x-bounds[0])*scale+offset_x, (y-bounds[1])*scale+offset_y)
def ring_path(ring):
    points = list(ring.coords)
    return 'M'+'L'.join(f'{x:.1f},{y:.1f}' for x,y in points[:-1])+'Z'
maps, cities = [], []
for name,g in sorted(projected.items(), key=lambda item: codes[item[0]]):
    g = transform(coord,g)
    parts = [g] if isinstance(g,Polygon) else list(g.geoms)
    path = ''.join(ring_path(p.exterior)+''.join(ring_path(r) for r in p.interiors) for p in parts)
    center = max(parts,key=lambda p:p.area).representative_point()
    maps.append({'code':codes[name], 'path':path, 'x':round(center.x,1), 'y':round(center.y,1)})
    names = sorted(aliases[name])
    cities.append({'code':codes[name], 'name':name, 'label':name.split('郡')[-1], 'aliases':names+['大阪府'+n for n in names]})
assert len(maps)==43
root = Path(__file__).resolve().parents[1]/'lib/data'
(root/'osaka-map.json').write_text(json.dumps(maps,ensure_ascii=False,separators=(',',':'))+'\n')
(root/'osaka-cities.json').write_text(json.dumps(cities,ensure_ascii=False,indent=2)+'\n')
print(f'{len(maps)} municipalities; map {sum(len(m["path"]) for m in maps)} SVG path characters')
