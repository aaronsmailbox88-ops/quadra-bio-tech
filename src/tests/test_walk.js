const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  // artifact build (no gate): walkthrough on first open
  await pg.goto('http://127.0.0.1:8766/index.html#learn', { waitUntil: 'load' }); await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(900);
  console.log('push shown:', !!(await pg.$('.qb-push')), '| walk yet (expect false):', !!(await pg.$('.wk-card')));
  await pg.screenshot({ path: '../../../tmp/claude-0/-home-claude/9cf0794e-6192-527f-85df-4536204fccc7/scratchpad/shots/push.png' }); await pg.click('.qb-push-x'); await pg.waitForTimeout(500);
  console.log('walk shown:', !!(await pg.$('.wk-card')), '| title:', await pg.textContent('#wk-h'));
  await pg.screenshot({ path: '../../../tmp/claude-0/-home-claude/9cf0794e-6192-527f-85df-4536204fccc7/scratchpad/shots/walk-1.png' });
  await pg.click('[data-wk="next"]'); await pg.waitForTimeout(150); console.log('page 2:', await pg.textContent('#wk-h'), '| warn:', (await pg.textContent('.wk-warn')).slice(0, 60));
  await pg.screenshot({ path: '../../../tmp/claude-0/-home-claude/9cf0794e-6192-527f-85df-4536204fccc7/scratchpad/shots/walk-2.png' });
  for (let k = 0; k < 5; k++) { await pg.click('[data-wk="next"]'); await pg.waitForTimeout(80); }
  console.log('last button:', await pg.textContent('.wk-next'));
  await pg.click('[data-wk="done"]'); await pg.waitForTimeout(200);
  console.log('closed:', !(await pg.$('.wk-card')), '| stored:', await pg.evaluate(() => localStorage.getItem('qb-walk')));
  await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(900); console.log('walk again after reload (expect false):', !!(await pg.$('.wk-card')), '| push again (expect true):', !!(await pg.$('.qb-push'))); await pg.click('.qb-push-x').catch(()=>{}); await pg.waitForTimeout(400);
  // Learn card reopens it
  await pg.click('#learn-start button'); await pg.waitForTimeout(150); console.log('reopened from Learn:', !!(await pg.$('.wk-card'))); await pg.click('[data-wk="skip"]'); await pg.waitForTimeout(100);
  // supplies: ticks + cart links
  const links = await pg.$$eval('.sup-cart', as => as.map(a => a.getAttribute('href')));
  console.log('cart links:', links.map(l => (l.match(/ASIN\.\d+=/g) || []).length));
  await pg.evaluate(() => { document.querySelector('#learn-protocol #proto-supplies').scrollIntoView(); });
  await pg.check('#learn-protocol input[data-sup="B0FXGS88PR"]'); await pg.waitForTimeout(100);
  console.log('tick label:', await pg.$eval('#learn-protocol input[data-sup="B0FXGS88PR"]', e => e.closest('label').textContent), '| stored:', await pg.evaluate(() => JSON.parse(localStorage.getItem('qb-supplies')).ordered['B0FXGS88PR'] ? 'yes' : 'no'));
  await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(600); await pg.evaluate(() => location.hash = '#learn'); await pg.waitForTimeout(300);
  console.log('tick after reload:', await pg.$eval('#learn-protocol input[data-sup="B0FXGS88PR"]', e => e.checked));
  await pg.evaluate(() => document.querySelector('#learn-protocol #proto-supplies').scrollIntoView()); await pg.screenshot({ path: '../../../tmp/claude-0/-home-claude/9cf0794e-6192-527f-85df-4536204fccc7/scratchpad/shots/supplies.png' });
  // mix wizard COA line
  await pg.goto('http://127.0.0.1:8766/index.html#track.mix', { waitUntil: 'load' }); await pg.waitForTimeout(700);
  console.log('coa line in wizard:', !!(await pg.$('.coa-note')));
  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})();
