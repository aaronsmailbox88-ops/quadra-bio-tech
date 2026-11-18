// v54: blocking COA dialog + Shop page (viewer and admin flows, with a fake claude.use shim)
const { chromium, devices } = require('playwright');
const FAKE = `(() => { const store = {}; const mk = p => ({ get: async () => ({ exists: !!store[p], data: () => store[p], metadata: { hasPendingWrites: false } }), set: async d => { store[p] = JSON.parse(JSON.stringify(d)); }, update: async d => { store[p] = Object.assign({}, store[p] || {}, d); }, delete: async () => { delete store[p]; }, onSnapshot: () => () => {} });
  window.__store = store; window.claude = { use: n => Promise.resolve(n === 'db' ? { doc: mk, collection: c => ({ doc: id => mk(c + '/' + id) }) } : n === 'user' ? { id: async () => 'u1', me: async () => ({ id: 'u1', name: 'Aaron' }), canEdit: () => ADMIN, isOwner: () => ADMIN, can: () => true, profiles: async () => ({}) } : null) }; })();`;
(async () => {
  const b = await chromium.launch();
  const run = async (admin) => {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', e => errs.push(String(e)));
    await pg.addInitScript('const ADMIN=' + admin + ';' + FAKE);
    await pg.goto('http://127.0.0.1:8766/index.html#retatrutide.overview', { waitUntil: 'load' }); await pg.waitForTimeout(800);
    if (!admin) {
      console.log('dialog:', !!(await pg.$('.qb-pushwrap')), '| locked:', await pg.evaluate(() => document.body.classList.contains('wk-locked')), '| heading:', await pg.textContent('#qb-push-h'));
      await pg.screenshot({ path: '../../../tmp/claude-0/-home-claude/9cf0794e-6192-527f-85df-4536204fccc7/scratchpad/shots53/50-coa-dialog.png' });
      // the app behind must not react: tap where the Learn tab is
      const box = await pg.$eval('#tab-learn', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
      await pg.mouse.click(box[0], box[1]); await pg.waitForTimeout(300);
      console.log('learn tab after tap behind dialog:', await pg.getAttribute('#tab-learn', 'aria-selected'), '| dialog still there:', !!(await pg.$('.qb-pushwrap')));
      await pg.click('.qb-push-x'); await pg.waitForTimeout(400);
      console.log('after OK: dialog gone:', !(await pg.$('.qb-pushwrap')), '| walkthrough (first run):', !!(await pg.$('.wk')));
      await pg.click('[data-wk="skip"]'); await pg.waitForTimeout(200);
    } else { await pg.click('.qb-push-x'); await pg.waitForTimeout(300); await pg.click('[data-wk="skip"]').catch(() => {}); await pg.waitForTimeout(200); }
    await pg.click('#tab-shop'); await pg.waitForTimeout(500);
    console.log((admin ? 'ADMIN' : 'VIEWER') + ' shop: hash', await pg.evaluate(() => location.hash), '| title:', (await pg.textContent('#mode-title')).slice(0, 4), '| cards:', (await pg.$$('.prod')).length, '| chips:', await pg.$$eval('.chips button', bs => bs.map(x => x.textContent)), '| admin bar:', !!(await pg.$('.shop-admin')), '| sub nav hidden:', await pg.$eval('nav.sub', n => n.hidden));
    console.log('  kit cart:', (await pg.getAttribute('.sup-actions .sup-cart', 'href')).slice(0, 90), '| first order link:', await pg.getAttribute('.prod .prod-buy', 'href'));
    await pg.click('.chips [data-cat="Syringes"]'); await pg.waitForTimeout(200); console.log('  filtered cards:', (await pg.$$('.prod')).length);
    await pg.click('.chips [data-cat="All"]'); await pg.waitForTimeout(200);
    // ordered tick shared with Learn
    await pg.check('.prod input[data-sup]'); await pg.waitForTimeout(200); console.log('  tick label:', await pg.textContent('.prod .sup-ck span'), '| stored:', await pg.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('qb-supplies')).ordered).length));
    if (!admin) { await pg.screenshot({ path: '../../../tmp/claude-0/-home-claude/9cf0794e-6192-527f-85df-4536204fccc7/scratchpad/shots53/51-shop-viewer.png', fullPage: true }); }
    if (admin) {
      await pg.check('#shop-edit'); await pg.waitForTimeout(200); console.log('  editing: add button:', !!(await pg.$('[data-act="add"]')), '| per-card tools:', (await pg.$$('.prod-admin')).length);
      await pg.click('[data-act="add"]'); await pg.waitForTimeout(200);
      await pg.fill('#pf-title', 'Nitrile gloves'); await pg.fill('#pf-url', 'https://www.amazon.ca/Some-Gloves/dp/B0TESTASIN/ref=sr_1_3?keywords=gloves'); await pg.fill('#pf-price', '$12.99'); await pg.fill('#pf-cat', 'Prep'); await pg.fill('#pf-sub', 'Powder-free, box of 100'); await pg.fill('#pf-blurb', 'Clean hands for every mix.');
      await pg.screenshot({ path: '../../../tmp/claude-0/-home-claude/9cf0794e-6192-527f-85df-4536204fccc7/scratchpad/shots53/52-shop-addform.png' });
      await pg.click('[data-act="save-item"]'); await pg.waitForTimeout(400);
      const last = await pg.$$eval('.prod', ps => { const p = ps[ps.length - 1]; return { t: p.querySelector('h3').textContent, href: p.querySelector('.prod-buy').getAttribute('href'), price: p.querySelector('.prod-price').textContent }; });
      console.log('  added:', JSON.stringify(last), '| saved to shared doc:', await pg.evaluate(() => !!(window.__store['shop/catalog'] && window.__store['shop/catalog'].items.length === 8)));
      // store settings: tag + storefront
      await pg.click('[data-act="store"]'); await pg.waitForTimeout(200); await pg.fill('#sf-name', 'Quadra Lab Supply'); await pg.fill('#sf-url', 'https://www.amazon.ca/shop/quadralab'); await pg.fill('#sf-tag', 'quadralab-20'); await pg.click('[data-act="save-store"]'); await pg.waitForTimeout(400);
      console.log('  store strip:', await pg.textContent('.shop-store h2'), '| tagged link:', await pg.getAttribute('.prod .prod-buy', 'href'), '| cart:', (await pg.getAttribute('.sup-actions .sup-cart', 'href')).slice(0, 80), '| disclosure shown:', (await pg.textContent('#shop .note')).slice(0, 40));
      await pg.screenshot({ path: '../../../tmp/claude-0/-home-claude/9cf0794e-6192-527f-85df-4536204fccc7/scratchpad/shots53/53-shop-admin.png', fullPage: true });
      // move + delete (two taps)
      const first = await pg.textContent('.prod h3'); await pg.click('.prod [data-act="down"]'); await pg.waitForTimeout(300); console.log('  moved down:', (await pg.textContent('.prod:nth-child(2) h3')) === first);
      const n0 = (await pg.$$('.prod')).length; await pg.click('.prod:last-child [data-act="del"]'); await pg.waitForTimeout(150); console.log('  armed text:', await pg.textContent('.prod:last-child [data-act="del"]')); await pg.click('.prod:last-child [data-act="del"]'); await pg.waitForTimeout(300); console.log('  deleted:', (await pg.$$('.prod')).length === n0 - 1);
      // viewer sees the admin's catalogue (same fake store, new page)
      const pg2 = await ctx.newPage(); await pg2.addInitScript('const ADMIN=false;' + FAKE + ';');
      // copy the store across pages is not possible with a fresh init; instead reload this page as viewer by flipping ADMIN
      await pg2.close();
      await pg.uncheck('#shop-edit'); await pg.waitForTimeout(200); console.log('  edit off: tools gone:', (await pg.$$('.prod-admin')).length === 0);
    }
    console.log('  ERRORS:', errs.length ? errs : 'none');
    await ctx.close();
  };
  await run(false); await run(true);
  await b.close();
})();
