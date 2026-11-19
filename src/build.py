#!/usr/bin/env python3
"""Quadra Bio Tech — build script. Validates the peptide packs, assembles the parts into one page and writes:
   miracle-peptides.html (the claude.ai artifact), index.html (local preview, no sign-in) and the hosted site
   (app.html + index.html + manifest + service worker + icons) into --site DIR (default: ./site next to this file).
   Run from anywhere: python3 src/build.py --site .   (the GitHub Action does exactly this on every change under src/)"""
import json, glob, os, sys, re

BASE = os.path.dirname(os.path.abspath(__file__))
APP_VER='86'  # bump before each artifact publish; shown in the app footer

PACKS = os.path.join(BASE, 'packs')
ORDER = ['retatrutide', 'semaglutide', 'tirzepatide', 'liraglutide', 'dulaglutide', 'cagrisema', 'survodutide', 'mazdutide', 'amycretin',
         'tesamorelin', 'pt-141', 'teriparatide', 'afamelanotide', 'elamipretide', 'thymosin-alpha-1', 'ara-290',
         'somatropin', 'igf-1-lr3', 'hcg', 'gonadorelin', 'oxytocin', 'epo',
         'bpc-157', 'tb-500', 'ghk-cu', 'ipamorelin', 'cjc-1295', 'sermorelin', 'ghrp-2', 'ghrp-6', 'hexarelin',
         'aod-9604', 'mots-c', 'epitalon', 'melanotan-ii',
         'selank', 'semax', 'adamax', 'p21', 'dsip', 'kisspeptin-10',
         'kpv', 'll-37', 'vip', 'humanin', 'foxo4-dri', 'follistatin-344', 'adipotide', 'snap-8', 'ahk-cu',
         'bronchogen', 'cardiogen', 'cortagen', 'chonluten', 'crystagen', 'livagen', 'cartalax', 'pancragen', 'pinealon', 'prostamax', 'testagen', 'thymalin']
TARGETS = {  # trial/label target doses offered as buttons in the simulator
    'retatrutide': [4, 9, 12], 'semaglutide': [1.7, 2.4, 7.2], 'tirzepatide': [5, 10, 15], 'liraglutide': [1.8, 3.0],
    'dulaglutide': [1.5, 3.0, 4.5],
}
UNITS = {'dulaglutide': ' pts', 'pt-141': ' pts'}
REQ = {
    '': ['id', 'name', 'brands', 'maker', 'group', 'pill', 'overview', 'results', 'effects', 'levels', 'trials', 'status'],
    'overview': ['headline', 'lede', 'stats', 'mechanism', 'more'],
    'results': ['headline', 'lede', 'chart', 'stats', 'beyond', 'more'],
    'effects': ['headline', 'lede', 'chart', 'disc', 'unique', 'more', 'urgent'],
    'levels': ['pk', 'nopk', 'stats', 'explain', 'showTable', 'more'],
    'trials': ['headline', 'lede', 'ladder', 'more', 'running', 'find'],
    'status': ['headline', 'items', 'cards', 'more', 'sources'],
}
BANNED = re.compile(r'\b(reconstitut|bacteriostatic|insulin syringe|units on|IU\b|stack(?:ing)? (?:with|peptides|it with)|cycle (?:of|for)|protocol:)', re.I)

def check(p, path):
    probs = []
    for sec, keys in REQ.items():
        obj = p if sec == '' else p.get(sec)
        if obj is None:
            probs.append('missing section ' + sec); continue
        for k in keys:
            if k not in obj: probs.append('missing %s.%s' % (sec or 'root', k))
    if p.get('group') not in ('approved', 'trials', 'research'): probs.append('bad group')
    pk = (p.get('levels') or {}).get('pk')
    if pk:
        for k in ['half', 'tmax', 'ladder', 'stepDays', 'tau', 'maxDose', 'refLabel']:
            if k not in pk: probs.append('pk missing ' + k)
        if pk.get('half') and pk.get('tmax') and pk['tmax'] >= pk['half'] / 0.693 * 0.9: probs.append('pk tmax too long for half-life (will be clamped)')
        if p['id'] in TARGETS and 'targets' not in pk: pk['targets'] = TARGETS[p['id']]
    for ch, kind in [((p.get('results') or {}).get('chart'), 'results'), ((p.get('effects') or {}).get('chart'), 'effects')]:
        if ch:
            if not ch.get('rows'): probs.append(kind + ' chart has no rows')
            if not ch.get('legend') or len(ch['legend']) != 2: probs.append(kind + ' chart legend must have 2 entries')
            for r in ch.get('rows', []):
                if not isinstance(r.get('drug'), (int, float)) or not isinstance(r.get('placebo'), (int, float)): probs.append(kind + ' chart row not numeric: ' + str(r.get('name')))
    txt = json.dumps(p)
    m = BANNED.search(txt)
    if m: probs.append('possible self-administration content near: ' + txt[max(0, m.start() - 60):m.end() + 60])
    if len((p.get('status') or {}).get('sources') or []) < 4: probs.append('fewer than 4 sources')
    return probs


def data_url(p, mt):
    import base64 as _b
    return 'data:' + mt + ';base64,' + _b.b64encode(open(os.path.join(BASE, p), 'rb').read()).decode()

def assemble():
    style = open(os.path.join(BASE, 'part_style.html')).read()
    track = open(os.path.join(BASE, 'part_track.html')).read()
    learn = open(os.path.join(BASE, 'part_learn.html')).read()
    vials = open(os.path.join(BASE, 'part_vials.html')).read() + '\n' + open(os.path.join(BASE, 'part_levels.html')).read() + '\n' + open(os.path.join(BASE, 'part_shop.html')).read()
    vials_css = open(os.path.join(BASE, 'part_vials.css')).read()
    nav = open(os.path.join(BASE, 'part_nav.html')).read()
    extra = open(os.path.join(BASE, 'part_extra.css')).read()
    style = style.replace('</style>', extra + '\n' + vials_css + '\n</style>').replace('@@HEXBG@@', data_url('bg/hex.svg', 'image/svg+xml'))
    return ('<title>Quadra Bio Tech</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + open(os.path.join(BASE, 'part_icons.html')).read() + '\n'
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&family=Poppins:ital,wght@0,600;0,700;0,800;1,700;1,800&display=swap">\n'
            + style + '\n\n<header class="top">\n  <div class="top-in">\n    <div class="pep-wrap"><small class="brandline"><svg class="brandmark" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><rect width="100" height="100" rx="24" fill="#0B1F1E"/><g transform="translate(13 13) scale(0.74)"><defs><linearGradient id="hb-g" gradientUnits="userSpaceOnUse" x1="73.33" y1="73.33" x2="98.79" y2="98.79"><stop offset="0" stop-color="#4FC8BB"/><stop offset="1" stop-color="#9BE8DF" stop-opacity="0"/></linearGradient></defs><path d="M65.131 79.327A33.000 33.000 0 0 1 34.869 79.327" fill="none" stroke="#F2F7F6" stroke-width="6.4" stroke-linecap="round"/><path d="M20.673 65.131A33.000 33.000 0 0 1 20.673 34.869" fill="none" stroke="#F2F7F6" stroke-width="6.4" stroke-linecap="round"/><path d="M34.869 20.673A33.000 33.000 0 0 1 65.131 20.673" fill="none" stroke="#F2F7F6" stroke-width="6.4" stroke-linecap="round"/><path d="M79.327 34.869A33.000 33.000 0 0 1 79.327 65.131" fill="none" stroke="#F2F7F6" stroke-width="6.4" stroke-linecap="round"/><path d="M68.14 78.53L78.53 68.14L104.45 104.45Z" fill="url(#hb-g)"/><circle cx="73.33" cy="73.33" r="7.2" fill="#4FC8BB"/><circle cx="26.67" cy="73.33" r="7.2" fill="#4FC8BB"/><circle cx="26.67" cy="26.67" r="7.2" fill="#4FC8BB"/><circle cx="73.33" cy="26.67" r="7.2" fill="#4FC8BB"/><path d="M33 50H42L45.5 50L48.5 40L51.5 60L54.5 46L56.5 50H67" fill="none" stroke="#4FC8BB" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="31" cy="50" r="3.2" fill="none" stroke="#F2F7F6" stroke-width="2.4"/><circle cx="69" cy="50" r="3.2" fill="none" stroke="#F2F7F6" stroke-width="2.4"/></g></svg>Quadra Bio Tech</small><span class="pepline"><span class="pepsel"><select id="pep" aria-label="Choose a peptide"></select></span><button type="button" class="fav" id="fav" aria-pressed="false" aria-label="Save as a favourite" title="Save as a favourite"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z"/></svg></button></span></div>\n    <p class="brand" id="mode-title" hidden></p>\n    <span class="pill soon" id="pill">Investigational</span>\n  </div>\n</header>\n<nav class="sub" aria-label="Subsections"><div class="in" id="sub-in" role="tablist"></div></nav>\n\n<main>\n'
            '<section data-panel="overview" aria-labelledby="ov-h"></section>\n<section data-panel="results" aria-labelledby="re-h" hidden></section>\n<section data-panel="effects" aria-labelledby="se-h" hidden></section>\n<section data-panel="levels" aria-labelledby="lv-h" hidden></section>\n<section data-panel="trials" aria-labelledby="tr-h" hidden></section>\n<section data-panel="status" aria-labelledby="st-h" hidden></section>\n<section data-panel="dosing" aria-labelledby="do-h" hidden></section>\n\n'
            + learn + '\n' + track + '\n' + vials + '</main>\n\n' + nav + '\n\n<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>\n<script>\n' + open(os.path.join(BASE, 'sim2.js')).read() + '\n' + open(os.path.join(BASE, 'part_protocol.js')).read() + '\n' + open(os.path.join(BASE, 'part_syringe.js')).read() + '\n' + open(os.path.join(BASE, 'app.js')).read() + '\n' + open(os.path.join(BASE, 'part_tracker.js')).read() + '\n' + open(os.path.join(BASE, 'part_vials.js')).read() + '\n' + open(os.path.join(BASE, 'part_levels.js')).read() + '\n' + open(os.path.join(BASE, 'part_walk.js')).read().replace('@@COA_IMG@@', data_url('coa/coa2-clean.jpg', 'image/jpeg')) + '\n' + open(os.path.join(BASE, 'part_coa.js')).read() + '\n' + open(os.path.join(BASE, 'part_shop.js')).read() + '\n' + open(os.path.join(BASE, 'part_fx.js')).read() + '\n</script>\n')

def main():
    packs, report = [], []
    for pid in ORDER:
        path = os.path.join(PACKS, pid + '.json')
        if not os.path.exists(path):
            report.append('%-14s MISSING' % pid); continue
        try:
            p = json.load(open(path))
        except Exception as e:
            report.append('%-14s INVALID JSON: %s' % (pid, e)); continue
        probs = check(p, path)
        report.append('%-14s %s %s' % (pid, 'ok ' if not probs else 'WARN', '; '.join(probs)))
        if p.get('id') != pid: report.append('   id mismatch: %s' % p.get('id'))
        p['id'] = pid
        if pid in UNITS and (p.get('results') or {}).get('chart'): p['results']['chart']['unit'] = UNITS[pid]
        packs.append(p)
    tpl = assemble()
    open(os.path.join(BASE, 'template.html'), 'w').write(tpl)
    data = json.dumps(packs, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    out = tpl.replace('/*__PACKS__*/[]', data, 1)
    import time as _t
    out = out.replace('@@VER@@', '%s, built %s' % (APP_VER, _t.strftime('%-d %b %Y')), 1)
    open(os.path.join(BASE, 'miracle-peptides.html'), 'w').write(out)
    open(os.path.join(BASE, 'index.html'), 'w').write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + out + '</body></html>')
    # ---------- hosted builds ----------
    import base64 as _b64, shutil as _sh, importlib.util as _iu, io as _io, contextlib as _ctx, json as _json
    icons = open(os.path.join(BASE, 'part_icons.html')).read()
    hosted_body = out.replace(icons + '\n', '').replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '').replace('<title>Quadra Bio Tech</title>\n', '', 1)
    _mark = open(os.path.join(BASE, 'brand', 'mark.svg')).read().split('>', 1)[1].rsplit('</svg>', 1)[0]
    MARK_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="24" fill="#0B1F1E"/><g transform="translate(13 13) scale(0.74)">' + _mark + '</g></svg>'
    SB_URL = 'https://uyznyapwnjfodemsgoso.supabase.co'; SB_KEY = 'sb_publishable_TRk5MDDg9jKL88DIap6LHw_5g37N94G'
    def hosted_head(base, api, with_auth):
        h = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>Quadra Bio Tech</title>\n'
            '<link rel="manifest" href="' + base + '/manifest.webmanifest">\n'
            '<link rel="apple-touch-icon" sizes="180x180" href="' + base + '/icon-180.png">\n'
            '<link rel="icon" type="image/png" sizes="192x192" href="' + base + '/icon-192.png">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">\n'
            '<meta name="apple-mobile-web-app-title" content="Quadra Bio Tech"><meta name="application-name" content="Quadra Bio Tech">\n'
            '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
            '<meta name="theme-color" content="#070e24">\n'
            '<meta name="description" content="Quadra Bio Tech — peptide research evidence, the weighing method and a vial tracker.">\n'
            '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,600;0,700;0,800;1,700;1,800&display=swap">\n'
            '<script>window.QB_API=' + _json.dumps(api) + ';window.QB_BASE=' + _json.dumps(base) + ';window.QB_MARK=' + _json.dumps(MARK_SVG) + ';'
            + ('window.QB_SB=' + _json.dumps({'url': SB_URL, 'key': SB_KEY}) + ';' if with_auth else '')
            + 'if("serviceWorker" in navigator){addEventListener("load",function(){navigator.serviceWorker.register(' + _json.dumps(base + '/sw.js') + ').catch(function(){})})}</script>\n')
        if with_auth: h += '<script>\n' + open(os.path.join(BASE, 'part_auth.js')).read() + '\n</script>\n'
        return h + '</head><body>'
    # static site: app.html (gated by sign-in), index.html (landing), manifest, service worker, icons
    SITE = os.path.abspath(sys.argv[sys.argv.index('--site') + 1]) if '--site' in sys.argv else os.path.join(BASE, 'site'); os.makedirs(SITE, exist_ok=True)
    open(os.path.join(SITE, 'app.html'), 'w').write(hosted_head('.', SB_URL + '/functions/v1', True) + hosted_body + '</body></html>')
    def durl(p, mt): return 'data:' + mt + ';base64,' + _b64.b64encode(open(os.path.join(BASE, p), 'rb').read()).decode()
    land = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Quadra Bio Tech</title><meta name="viewport" content="width=device-width,initial-scale=1">'
            '<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=app.html"><style>html,body{margin:0;height:100%;background:#070e24}</style>'
            '<script>location.replace("app.html" + location.hash)</script></head><body></body></html>')   # the landing is the sign-in card in app.html
    open(os.path.join(SITE, 'index.html'), 'w').write(land)
    ver = __import__('time').strftime('%Y%m%d-%H%M')
    open(os.path.join(SITE, 'manifest.webmanifest'), 'w').write(_json.dumps({'name': 'Quadra Bio Tech', 'short_name': 'Quadra Bio', 'id': './app.html', 'start_url': './app.html', 'scope': './', 'display': 'standalone', 'orientation': 'portrait', 'background_color': '#070e24', 'theme_color': '#070e24', 'description': 'Peptide research evidence, the weighing method and a vial tracker.', 'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'}, {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'}]}, indent=1))
    open(os.path.join(SITE, 'sw.js'), 'w').write("const C='qbt-" + ver + "';const SCOPE=new URL('./',self.location).pathname;\n"
        "self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(['./app.html','./icon-192.png','./manifest.webmanifest'])).catch(()=>{}))});\n"
        "self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});\n"
        "self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin||!u.pathname.startsWith(SCOPE))return;\n"
        "const fresh=r.mode==='navigate'||/\\.(html|webmanifest|js)$/.test(u.pathname);e.respondWith((fresh?fetch(r.url,{cache:'no-cache',credentials:'same-origin'}):fetch(r)).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('./app.html'):undefined)).then(m=>m||new Response('Offline',{status:503}))))});\n")
    for n in ('icon-180.png', 'icon-192.png', 'icon-512.png'): _sh.copy(os.path.join(BASE, 'brand', n), os.path.join(SITE, n))
    _sh.copy(os.path.join(BASE, 'brand', 'icon.svg'), os.path.join(SITE, 'icon.svg'))
    open(os.path.join(SITE, 'VERSION'), 'w').write(ver)
    print('\n'.join(report)); print('packs:', len(packs), 'bytes:', len(out), 'site:', ver)

if __name__ == '__main__':
    main()
