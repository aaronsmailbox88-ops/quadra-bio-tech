const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://127.0.0.1:8766/index.html#track.levels', { waitUntil: 'load' }); await pg.waitForTimeout(600);
  console.log('empty state:', (await pg.textContent('#levels')).replace(/\s+/g, ' ').slice(0, 120));
  // seed a vial with a titration history: 2 mg x4, 4 mg x3, last dose 5 days ago
  await pg.evaluate(() => {
    const day = 86400000, now = Date.now(), doses = [];
    for (let i = 0; i < 7; i++) { const t = new Date(now - (5 + (6 - i) * 7) * day); doses.push({ t: t.toISOString(), ml: 0.3, mg: i < 4 ? 2 : 4, method: 'manual' }); }
    const st = { v: 1, scale: { res: 0.001, acc: 0.005 }, vials: [{ id: 'vtest1', name: 'Retatrutide', label_mg: 15, dry_g: 5, full_g: 6.5, planned_mg: 4, per_week: 1, status: 'active', created: new Date(now - 60 * day).toISOString(), mixed_on: new Date(now - 60 * day).toISOString().slice(0, 10), expiry_days: 28, doses, weights: [], draws: [] }] };
    localStorage.setItem('vt-state', JSON.stringify(st)); localStorage.setItem('mp-mode', 'track'); localStorage.setItem('mp-ttab', 'levels');
  });
  await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(800);
  const t = (await pg.textContent('#levels')).replace(/\s+/g, ' ');
  console.log('big:', await pg.textContent('.lv-big'), '|', (await pg.textContent('.lv-sub')).replace(/\s+/g, ' '));
  console.log('line:', await pg.textContent('p.lv-line'));
  console.log('ticks:', await pg.$$eval('.lv-tick', e => e.length), '| future ticks:', await pg.$$eval('.lv-tick.fut', e => e.length));
  await pg.screenshot({ path: '../../../tmp/claude-0/-home-claude/9cf0794e-6192-527f-85df-4536204fccc7/scratchpad/shots/levels-phone.png', fullPage: true });
  // hover reading
  const svg = await pg.$('.lv-svg'); const bb = await svg.boundingBox(); await pg.mouse.move(bb.x + bb.width * 0.6, bb.y + bb.height * 0.5); await pg.mouse.down(); await pg.mouse.up(); await pg.waitForTimeout(100);
  console.log('tip:', await pg.textContent('.lv-tip'));
  // tabs present and hash
  console.log('tabs:', await pg.$$eval('[data-ttab]', bs => bs.map(x => x.textContent)), '| hash:', await pg.evaluate(() => location.hash));
  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})();
