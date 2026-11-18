#!/usr/bin/env python3
"""Procedural 'molecular network + hex lattice' backdrop for the app (one SVG, inlined by build.py)."""
import math, random, os
random.seed(7)
W, H = 820, 1640
out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMid slice">' % (W, H),
       '<defs><radialGradient id="g"><stop offset="0" stop-color="#8ab8ff" stop-opacity=".55"/><stop offset=".45" stop-color="#4f8cff" stop-opacity=".16"/><stop offset="1" stop-color="#4f8cff" stop-opacity="0"/></radialGradient>'
       '<radialGradient id="t"><stop offset="0" stop-color="#6fe3d6" stop-opacity=".5"/><stop offset=".5" stop-color="#49d6c8" stop-opacity=".12"/><stop offset="1" stop-color="#49d6c8" stop-opacity="0"/></radialGradient></defs>']
# hex lattice, right-hand side and bottom-left, faint
def hexagon(cx, cy, r, op):
    pts = ' '.join('%.1f,%.1f' % (cx + r * math.cos(math.radians(60 * i - 30)), cy + r * math.sin(math.radians(60 * i - 30))) for i in range(6))
    return '<polygon points="%s" fill="none" stroke="#9cc0ff" stroke-opacity="%.2f" stroke-width="1.2"/>' % (pts, op)
R = 64
for (ox, oy, cols, rows, base) in [(560, 40, 4, 6, .22), (-30, 1120, 4, 6, .16)]:
    for i in range(cols):
        for j in range(rows):
            cx = ox + i * (R * math.sqrt(3)) + (R * math.sqrt(3) / 2 if j % 2 else 0)
            cy = oy + j * (R * 1.5)
            if random.random() < .55:
                out.append(hexagon(cx, cy, R - 3, base * random.uniform(.5, 1.4)))
# network nodes
nodes = []
for gx in range(0, W, 150):
    for gy in range(0, H, 165):
        if random.random() < .72:
            nodes.append((gx + random.uniform(10, 140), gy + random.uniform(10, 155)))
edges = []
for a in range(len(nodes)):
    for b in range(a + 1, len(nodes)):
        d = math.dist(nodes[a], nodes[b])
        if d < 230 and random.random() < .72:
            edges.append((a, b, d))
for a, b, d in edges:
    out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#9cc0ff" stroke-opacity="%.2f" stroke-width="1.4"/>' % (nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1], .40 * (1 - d / 280)))
for i, (x, y) in enumerate(nodes):
    big = random.random() < .18
    teal = random.random() < .2
    r = random.uniform(3.5, 6.5) if not big else random.uniform(8, 12)
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#%s)"/>' % (x, y, r * (5 if big else 3.5), 't' if teal else 'g'))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" fill-opacity="%.2f"/>' % (x, y, r * .55, '#6fe3d6' if teal else '#b9d4ff', .95 if big else .75))
out.append('</svg>')
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hex.svg')
open(p, 'w').write(''.join(out))
print(p, len(''.join(out)), 'bytes', len(nodes), 'nodes', len(edges), 'edges')
