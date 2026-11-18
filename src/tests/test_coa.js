const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://127.0.0.1:8766/index.html#learn', { waitUntil: 'load' }); await pg.evaluate(() => { localStorage.clear(); }); await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(700);
  // push notice: Check COA opens the checker and does not start the walkthrough
  console.log('push buttons:', await pg.$$eval('.qb-push button', bs => bs.map(x => x.textContent)));
  await pg.click('.qb-push-go'); await pg.waitForTimeout(500);
  console.log('checker open from push:', !!(await pg.$('.ck')), '| walkthrough started:', !!(await pg.$('.wk')));
  await pg.click('[data-ck="close"]'); await pg.waitForTimeout(200);
  // Learn card opens the checker; the tour opens from a "Show me"
  await pg.click('#learn-coa button'); await pg.waitForTimeout(400); console.log('checker from Learn:', !!(await pg.$('.ck')));
  await pg.click('.ck-list li:nth-child(4) .ck-show'); await pg.waitForTimeout(500);
  console.log('tour step from show-me:', await pg.textContent('.ct-card h3'), '|', await pg.textContent('.ct-n'));
  await pg.click('[data-ct="close"]'); await pg.waitForTimeout(200); console.log('tour closed, checker still open:', !!(await pg.$('.ck')) && !(await pg.$('.ct')));
  // verdict logic
  const fill = async (id, v) => pg.fill('#' + id, v);
  await fill('ck-v_pep', 'Retatrutide'); await fill('ck-v_mg', '15'); await fill('ck-v_lot', 'QB 2401'); await fill('ck-v_sup', 'Quad Bio');
  await fill('ck-c_client', 'Quad Bio Technology'); await fill('ck-c_pep', 'Retatrutide (LY3437943)'); await fill('ck-c_lot', 'qb-2401');
  const d = new Date(); d.setDate(d.getDate() - 30); await fill('ck-c_date', d.toISOString().slice(0, 10)); await fill('ck-c_pur', '99.1');
  await pg.check('#ck-c_id'); await pg.check('#ck-c_ver'); await pg.waitForTimeout(200);
  console.log('pass verdict:', await pg.textContent('.ck-verdict h2'), '| ok rows:', (await pg.$$('.ck-list li.ok')).length);
  await fill('ck-c_date', '2024-01-05'); await pg.waitForTimeout(150); console.log('old date verdict:', await pg.textContent('.ck-verdict h2'), '|', await pg.textContent('.ck-list li.bad span'));
  const d2 = new Date(); d2.setDate(d2.getDate() - 3); await fill('ck-c_date', d2.toISOString().slice(0, 10)); await fill('ck-c_lot', 'QB-9999'); await pg.waitForTimeout(150); console.log('lot mismatch:', await pg.textContent('.ck-list li.bad b'));
  await fill('ck-c_lot', 'qb-2401'); await pg.waitForTimeout(150);
  await pg.click('[data-ck="save"]'); await pg.waitForTimeout(300); console.log('saved rows:', (await pg.$$('.ck-saved li')).length, '| stored:', await pg.evaluate(() => JSON.parse(localStorage.getItem('qb-coa')).length));
  // mix from a passing check prefills the wizard
  await pg.click('[data-ck="mix"]'); await pg.waitForTimeout(900);
  console.log('after mix: hash', await pg.evaluate(() => location.hash), '| wizard visible:', await pg.isVisible('#vl-wiz'), '| peptide:', await pg.evaluate(() => window.vtWizDraft()));
  console.log('coa line on wizard:', (await pg.textContent('.coa-note')).slice(0, 80), '... last:', await pg.textContent('.coa-last').catch(() => 'none'));
  // walkthrough page 2 has both buttons; #coa route opens the checker
  await pg.evaluate(() => window.qbWalk.open()); await pg.waitForTimeout(200); await pg.click('[data-wk="next"]'); await pg.waitForTimeout(200);
  console.log('page 2 buttons:', await pg.$$eval('.wk-coa button', bs => bs.map(x => x.textContent)));
  await pg.click('[data-wk="back"]'); await pg.click('[data-wk="skip"]'); await pg.waitForTimeout(200);
  await pg.goto('http://127.0.0.1:8766/index.html#coa'); await pg.waitForTimeout(800); console.log('#coa route:', !!(await pg.$('.ck')), '| hash:', await pg.evaluate(() => location.hash));
  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})();
