#!/usr/bin/env python3
"""Port vial-tracker.html into app parts: part_vials.css, part_vials.html, part_vials.js (ids namespaced, hash routing -> in-memory views, tokens mapped to the app's)."""
import re, os
BASE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(BASE, 'vial-tracker.html')).read()

# ---------- CSS
css = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
# drop :root token blocks and global rules
css = re.sub(r':root\{.*?\}\n', '', css, flags=re.S)
css = re.sub(r'@media \(prefers-color-scheme:dark\)\{ :root:not\(\[data-theme="light"\]\)\{.*?\} \}\n', '', css, flags=re.S)
css = re.sub(r':root\[data-theme="dark"\]\{.*?\}\n', '', css, flags=re.S)
drop_prefixes = ('*{', 'body{', '[hidden]', 'a{', 'h1,h2,h3{', 'h1{', 'p{', '.wrap{', '.top{', '.top small{', ':focus-visible', '@media (prefers-reduced-motion', '/* Layout')
lines = []
for ln in css.split('\n'):
    s = ln.strip()
    if not s or any(s.startswith(p) for p in drop_prefixes): continue
    lines.append(s)
css = '\n'.join(lines)
tok = {'--card': '--surface', '--muted': '--ink-2', '--line-2': '--surface-2', '--ok-soft': '--good-soft', '--ok': '--good', '--bad-soft': '--crit-soft', '--bad': '--crit', '--info-soft': '--accent-soft', '--info': '--s2', '--r)': '--radius)'}
for a, b in tok.items(): css = css.replace('var(' + a + ')' if not a.endswith(')') else 'var(' + a, 'var(' + b + ')' if not a.endswith(')') else 'var(' + b)
css = css.replace('var(--ok)', 'var(--good)')

def prefix_block(block):
    # prefix each selector in "sel1,sel2{...}" with #vials
    out = []
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', block):
        sels = [s.strip() for s in m.group(1).split(',')]
        sels = ['#vials ' + s if not s.startswith('#vials') else s for s in sels]
        out.append(','.join(sels) + '{' + m.group(2) + '}')
    return ''.join(out)
result = []
i = 0
while i < len(css):
    if css.startswith('@media', i):
        j = css.index('{', i); depth = 1; k = j + 1
        while depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        result.append(css[i:j + 1] + prefix_block(css[j + 1:k - 1]) + '}')
        i = k
    else:
        j = css.find('}', i)
        if j < 0: break
        result.append(prefix_block(css[i:j + 1])); i = j + 1
css = '\n'.join(r for r in result if r.strip())
css += '\n#vials .linkish{background:none;border:0;padding:0;color:var(--accent);font:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:2px}\n#vials{display:flex;flex-direction:column;gap:14px}\n#vials h2{font-family:var(--serif)}\n#vials .card{display:flex;flex-direction:column;gap:0}\n#vials .card.tap{text-decoration:none;color:inherit;cursor:pointer}\n'
ids = {'#sync': '#vl-sync', '#alerts': '#vl-alerts', '#cards': '#vl-cards', '#empty': '#vl-empty', '#view-list': '#vl-list', '#view-new': '#vl-new', '#view-vial': '#vl-vial', '#toast': '#vl-toast', '#peps': '#vl-peps'}
open(os.path.join(BASE, 'part_vials.css'), 'w').write(css)

# ---------- markup
body = src[src.index('<div class="wrap">') + len('<div class="wrap">'):src.index('<script>')]
body = body[:body.rindex('</div>')]  # strip closing wrap
body = re.sub(r'<header class="top">.*?</header>', '', body, flags=re.S)
body = body.replace('<section id="view-list">', '<div id="vl-list">').replace('<section id="view-new" hidden>', '<div id="vl-new" hidden>').replace('<section id="view-vial" hidden></section>', '<div id="vl-vial" hidden></div>')
body = re.sub(r'</section>', '</div>', body)
body = body.replace('id="alerts"', 'id="vl-alerts"').replace('id="cards"', 'id="vl-cards"').replace('id="empty"', 'id="vl-empty"').replace('list="peps"', 'list="vl-peps"').replace('id="peps"', 'id="vl-peps"')
body = body.replace('<a class="btn sm" href="#new">+ New vial</a>', '<button type="button" class="btn sm" data-vgo="new">+ New vial</button>')
body = body.replace('<a class="btn" href="#new">Add your first vial</a>', '<button type="button" class="btn" data-vgo="new">Add your first vial</button>')
body = body.replace('<p class="small"><a href="#">← Supply</a></p>', '<p class="small"><button type="button" class="linkish" data-vgo="">← Supply</button></p>')
body = body.replace('<a class="btn ghost" href="#">Cancel</a>', '<button type="button" class="btn ghost" data-vgo="">Cancel</button>')
html = ('<!-- ============ VIALS ============ -->\n<section data-panel="vials" aria-labelledby="vl-h" hidden>\n<div id="vials">\n'
        '  <div><div class="eyebrow">Vial tracker</div><h1 id="vl-h">What is in each vial, by weight.</h1></div>\n'
        '  <p class="lede">Every number here comes from a scale, not a syringe mark: water in, concentration, each dose, what is left and when to reorder.</p>\n'
        '  <p class="sync" id="vl-sync">Saved in this browser only</p>\n' + body + '\n</div>\n</section>\n')
open(os.path.join(BASE, 'part_vials.html'), 'w').write(html)

# ---------- script
js = re.search(r'<script>\n(.*)</script>', src, re.S).group(1)
for a, b in ids.items(): js = js.replace("'" + a + "'", "'" + b + "'")
js = js.replace("t.id='toast'", "t.id='vl-toast'")
js = js.replace("location.hash='vial-'+v.id", "vgo('vial-'+v.id)").replace("location.hash=''", "vgo('')")
js = js.replace("var h=(location.hash||'').slice(1).replace(/[^A-Za-z0-9-]/g,'');", "var h=VIEW;")
js = js.replace("window.addEventListener('hashchange',function(){render(); window.scrollTo(0,0)});", "")
js = js.replace("$('#vl-list').hidden=!(h===''||h==='list');", "$('#vl-list').hidden=!(h===''||h==='list');")
js = js.replace("""'<a class="card tap" href="#vial-'+esc(v.id)+'" style="text-decoration:none;color:inherit">""", """'<div class="card tap" data-vgo="vial-'+esc(v.id)+'" role="link" tabindex="0">""")
js = js.replace("""+'<div class="bar '+barCls+'"><i style="width:'+Math.max(0,Math.min(100,pct))+'%"></i></div><div class="dates">'+esc(dates)+'</div></a>' }""", """+'<div class="bar '+barCls+'"><i style="width:'+Math.max(0,Math.min(100,pct))+'%"></i></div><div class="dates">'+esc(dates)+'</div></div>' }""")
js = js.replace("""<a href="#vial-'+esc(v.id)+'">Open</a>""", """<button type="button" class="linkish" data-vgo="vial-'+esc(v.id)+'">Open</button>""")
js = js.replace("""sec.innerHTML='<p class="small"><a href="#">← Supply</a></p><p style="margin-top:10px">That vial isn’t here.</p>';return}""", """sec.innerHTML='<p class="small"><button type="button" class="linkish" data-vgo="">← Supply</button></p><p style="margin-top:10px">That vial isn’t here.</p>';return}""")
js = js.replace("""sec.innerHTML='<p class="small"><a href="#">← Supply</a></p>'""", """sec.innerHTML='<p class="small"><button type="button" class="linkish" data-vgo="">← Supply</button></p>'""")
js = js.replace("  loadLocal(); render(); initDb();", """  var VIEW='';
  function vgo(v){ VIEW=v||''; render(); var s=document.getElementById('vials'); if(s&&!s.closest('section').hidden) window.scrollTo(0,0); }
  document.addEventListener('click',function(e){ var el=e.target.closest('[data-vgo]'); if(!el||!document.getElementById('vials').contains(el)) return; e.preventDefault(); vgo(el.getAttribute('data-vgo')); });
  document.addEventListener('keydown',function(e){ if(e.key!=='Enter') return; var el=e.target.closest('[data-vgo][role="link"]'); if(el){ e.preventDefault(); vgo(el.getAttribute('data-vgo')); } });
  loadLocal(); render(); initDb();""")
assert 'location.hash' not in js, 'hash use left in vials js'
assert "'#sync'" not in js
open(os.path.join(BASE, 'part_vials.js'), 'w').write('/* ===== Vial tracker (weigh-based) ===== */\n' + js)
print('css', len(css), 'html', len(html), 'js', len(js))
