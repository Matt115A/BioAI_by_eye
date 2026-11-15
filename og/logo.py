"""Generate the BioAI by eye logo: a minimalist eye in front of a right-handed DNA double helix cascading down.

Writes public/logo.svg (tall, for the page), public/icon.svg (square, for the top bar) and public/favicon.svg
(square on a dark tile, for the browser tab). Run: python3 og/logo.py

Handedness: the helix is (A cos t, depth A sin t, z) with depth into the screen, so a strand is in front where sin t < 0.
Screen y grows downward (z = -y). Over a front half-turn x increases as z rises, so the front strands run
lower-left → upper-right ("/"), the signature of a right-handed (B-DNA) helix.
"""
import math, pathlib

OFF = math.radians(150)   # second strand's phase: unequal major/minor grooves, as in B-DNA
YEL, BG = '#f2c230', '#0e0e0d'

def helix(cx, ey, A, P, y0, y1, step=1.0):
    th = lambda y: -2 * math.pi * (y - ey) / P
    def segs(phase, front):
        out, cur, y = [], [], y0
        while y <= y1 + 1e-9:
            t = th(y) + phase
            if (math.sin(t) < 0) == front: cur.append((cx + A * math.cos(t), y))
            elif cur: out.append(cur); cur = []
            y += step
        if cur: out.append(cur)
        return ['M' + ' L'.join(f'{x:.2f} {yy:.2f}' for x, yy in s) for s in out if len(s) > 1]
    return th, segs

def logo(cx, ey, A, P, half, w, h, iris, pupil, sw, rung_gap, uid, bg_eye=BG):
    y0, y1 = ey - half, ey + half
    th, segs = helix(cx, ey, A, P, y0, y1, step=max(0.25, half / 300))
    rungs = []
    if rung_gap:
        y = y0 + rung_gap / 2
        while y < y1:
            rungs.append(f'<line x1="{cx + A*math.cos(th(y)):.2f}" y1="{y:.2f}" x2="{cx + A*math.cos(th(y)+OFF):.2f}" y2="{y:.2f}"/>')
            y += rung_gap
    back = ''.join(f'<path d="{d}"/>' for ph in (0, OFF) for d in segs(ph, False))
    front = ''.join(f'<path d="{d}"/>' for ph in (0, OFF) for d in segs(ph, True))
    return f'''<defs><linearGradient id="{uid}f" x1="0" y1="{y0}" x2="0" y2="{y1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.2" stop-color="#fff"/><stop offset="0.8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="{uid}m"><rect x="{cx-2*A}" y="{y0}" width="{4*A}" height="{y1-y0}" fill="url(#{uid}f)"/></mask></defs>
<g mask="url(#{uid}m)" fill="none" stroke-linecap="round"><g stroke="#3d3d38" stroke-width="{sw*0.5:.2f}">{''.join(rungs)}</g><g stroke="#55554e" stroke-width="{sw*0.85:.2f}">{back}</g><g stroke="#c3c2b7" stroke-width="{sw:.2f}">{front}</g></g>
<path d="M{cx-w} {ey} Q{cx} {ey-h} {cx+w} {ey} Q{cx} {ey+h} {cx-w} {ey} Z" fill="{bg_eye}" stroke="{YEL}" stroke-width="{sw:.2f}" stroke-linejoin="round"/>
<circle cx="{cx}" cy="{ey}" r="{iris}" fill="none" stroke="{YEL}" stroke-width="{sw:.2f}"/><circle cx="{cx}" cy="{ey}" r="{pupil}" fill="{YEL}"/>'''

def svg(vb, body, label='BioAI by eye'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{label}">{body}</svg>\n'

out = pathlib.Path(__file__).resolve().parent.parent / 'public'
out.mkdir(exist_ok=True)
# tall mark, same proportions as the link-preview card (200 × 304)
(out / 'logo.svg').write_text(svg('-8 0 216 304', logo(100, 152, 44, 120, 152, 96, 92, 25, 10, 6, 12, 'L')))
# square marks: one helix turn above and below a wider eye, heavier strokes so it survives 16–32 px
sq = lambda bg: logo(50, 50, 19, 64, 46, 44, 44, 13, 5.5, 6.5, 0, 'I', bg_eye=bg)
(out / 'icon.svg').write_text(svg('0 0 100 100', sq(BG)))
(out / 'favicon.svg').write_text(svg('0 0 100 100', f'<rect width="100" height="100" rx="22" fill="{BG}"/>' + sq(BG)))
print('wrote', *(p.name for p in out.glob('*.svg')))
