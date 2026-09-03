/*
 * TRIZ Navigator — end-to-end checks.
 *
 *   npm install playwright
 *   node tests/ui-test.js
 *
 * Set CHROME to override the browser binary, e.g.
 *   CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tests/ui-test.js
 */
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
const EXEC = process.env.CHROME || undefined;

let pass = 0, fail = 0;
const ok = (label, cond) => { (cond ? pass++ : fail++); console.log((cond ? 'PASS  ' : 'FAIL  ') + label); };

(async () => {
  const browser = await chromium.launch({executablePath: EXEC, args: ['--no-sandbox']});
  const errs = [];

  /* ---------- data integrity, evaluated inside the page ---------- */
  let ctx = await browser.newContext({viewport: {width: 1280, height: 900}, acceptDownloads: true});
  let p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  /* The webfont is a progressive enhancement: offline it falls back to the system
     stack, so a failed font request is not an application error. */
  const isFontNoise = t => /ERR_(CONNECTION|NAME|INTERNET|NETWORK|PROXY)/.test(t) || /fonts\.(googleapis|gstatic)\.com/.test(t);
  p.on('console', m => { if (m.type() === 'error' && !isFontNoise(m.text())) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(APP);
  await p.waitForTimeout(400);

  const data = await p.evaluate(() => {
    let filled = 0, badRef = 0, diag = 0;
    for (let i = 0; i < 39; i++) for (let j = 0; j < 39; j++) {
      const c = MATRIX[i][j];
      if (c.length) filled++;
      if (i === j && c.length) diag++;
      c.forEach(n => { if (!(n >= 1 && n <= 40)) badRef++; });
    }
    return {
      params: PARAMS.length, principles: PRINCIPLES.length,
      paramsOrdered: PARAMS.every((x, i) => x.n === i + 1),
      principlesOrdered: PRINCIPLES.every((x, i) => x.n === i + 1),
      contentComplete: PRINCIPLES.every(x => x.name && x.ess && x.subs.length && x.mfg.length && x.svc.length && x.ask.length)
        && PARAMS.every(x => x.name && x.eng && x.svc && x.kw),
      filled, badRef, diag,
      sepRefsValid: SEPARATIONS.every(s => s.ps.every(n => n >= 1 && n <= 40)),
      presetsPopulated: PRESETS.every(x => MATRIX[x.imp - 1][x.wor - 1].length > 0)
    };
  });
  ok('39 factors, numbered 1-39', data.params === 39 && data.paramsOrdered);
  ok('40 principles, numbered 1-40', data.principles === 40 && data.principlesOrdered);
  ok('every principle and factor has full content', data.contentComplete);
  ok('matrix has 1248 populated cells', data.filled === 1248);
  ok('every matrix reference is a principle 1-40', data.badRef === 0);
  ok('matrix diagonal is empty', data.diag === 0);
  ok('separation strategies reference valid principles', data.sepRefsValid);
  ok('every quick-start preset lands on a populated cell', data.presetsPopulated);

  /* ---------- step 1: framing ---------- */
  ok('opens on step 1', (await p.textContent('#stepBody h2')).includes('Frame the problem'));
  ok('cannot continue without a problem statement', await p.isDisabled('#stepBody [data-action="step"][data-n="2"]'));
  await p.fill('[data-action="pf"][data-k="title"]', 'New customer applications wait nine days for approval and errors rise when we rush them');
  await p.waitForTimeout(300);
  ok('can continue once stated', !(await p.isDisabled('#stepBody [data-action="step"][data-n="2"]')));
  ok('suggests relevant factors while typing', await p.locator('#sugBox [data-action="sugImp"]').count() > 0);

  /* ---------- technical contradiction ---------- */
  await p.click('#stepBody [data-action="step"][data-n="2"]'); await p.waitForTimeout(250);
  await p.click('[data-action="ctype"][data-t="technical"]'); await p.waitForTimeout(250);
  ok('both factor pickers shown', await p.locator('.picker').count() === 2);
  await p.click('[data-action="preset"] >> nth=2'); await p.waitForTimeout(250);
  ok('preset fills both factors', (await p.locator('.selected-param .t').count()) === 2);
  await p.click('#stepBody [data-action="step"][data-n="3"]'); await p.waitForTimeout(350);
  ok('matrix returns principle cards', await p.locator('#view-solve .pcard').count() > 0);

  /* ---------- shortlist, develop, summarise ---------- */
  await p.click('#view-solve .pcard >> nth=0 >> .star');
  await p.click('#view-solve .pcard >> nth=1 >> .star'); await p.waitForTimeout(200);
  ok('shortlist counter updates', (await p.textContent('#starCount')) === '2');
  await p.fill('#view-solve .pcard >> nth=0 >> textarea', 'Auto-approve under a threshold and sample afterwards');
  await p.click('#stepBody [data-action="step"][data-n="4"]'); await p.waitForTimeout(300);
  ok('shortlisted principles carry into develop', await p.locator('[data-action="concept"][data-k="text"]').count() === 2);
  await p.fill('[data-action="concept"][data-k="text"] >> nth=0', 'Approve automatically below GBP 500, sample 10% weekly');
  await p.selectOption('[data-action="concept"][data-k="impact"] >> nth=0', 'High');
  await p.selectOption('[data-action="concept"][data-k="effort"] >> nth=0', 'Low');
  await p.click('#stepBody [data-action="step"][data-n="5"]'); await p.waitForTimeout(300);
  const md = await p.textContent('#mdOut');
  ok('working sheet carries problem, concept and matrix result',
    md.includes('New customer applications') && md.includes('Approve automatically below') && /Matrix principles: \d/.test(md));

  /* ---------- persistence ---------- */
  await p.reload(); await p.waitForTimeout(450);
  ok('session survives a reload', (await p.textContent('#mdOut')).includes('Approve automatically below'));

  /* ---------- physical contradiction ---------- */
  await p.evaluate(() => { S.ctype = 'physical'; S.phys = {element: 'the identity check', a: 'thorough', b: 'instant', sep: ''}; S.step = 2; renderSolve(); });
  await p.waitForTimeout(300);
  await p.click('[data-action="sep"][data-id="time"]'); await p.waitForTimeout(250);
  await p.click('#stepBody [data-action="step"][data-n="3"]'); await p.waitForTimeout(350);
  ok('separation in time returns its 15 principles', await p.locator('#view-solve .pcard').count() === 15);
  ok('chosen separation strategy is shown', (await p.textContent('#stepBody .kv')).includes('Separate in time'));

  /* ---------- open exploration ---------- */
  await p.evaluate(() => { S.ctype = 'explore'; S.step = 3; renderSolve(); }); await p.waitForTimeout(450);
  ok('exploration returns all 40 principles', await p.locator('#view-solve .pcard').count() === 40);

  /* ---------- empty and reverse matrix cells ---------- */
  await p.evaluate(() => { S.ctype = 'technical'; S.imp = 29; S.wor = 35; S.step = 3; renderSolve(); });
  await p.waitForTimeout(300);
  ok('empty cell explains itself and still offers principles',
    /no pattern|reverse/i.test(await p.textContent('#stepBody')) && await p.locator('#view-solve .pcard').count() > 0);
  await p.evaluate(() => { S.ctype = 'technical'; S.imp = 8; S.wor = 33; S.step = 3; renderSolve(); });
  await p.waitForTimeout(300);
  ok('forward-empty pair falls back to the reverse cell', (await p.textContent('#stepBody')).includes('reverse'));

  /* ---------- every tab renders ---------- */
  for (const v of ['principles', 'matrix', 'params', 'saved', 'learn']) {
    await p.click('#tabs button[data-view="' + v + '"]'); await p.waitForTimeout(350);
    ok('tab renders: ' + v, await p.isVisible('#view-' + v));
  }

  /* ---------- matrix explorer ---------- */
  await p.click('#tabs button[data-view="matrix"]'); await p.waitForTimeout(450);
  ok('matrix grid is 39 x 39',
    await p.locator('table.mx tbody tr').count() === 39 &&
    await p.locator('table.mx tbody tr').first().locator('td').count() === 39);
  await p.click('table.mx td.has >> nth=0'); await p.waitForTimeout(300);
  ok('clicking a cell opens its detail', await p.locator('#mxDetail .card').count() === 1);
  await p.click('[data-action="useCell"]'); await p.waitForTimeout(400);
  ok('"use this pair" hands off to the wizard', await p.isVisible('#view-solve'));

  /* ---------- search ---------- */
  await p.click('#tabs button[data-view="principles"]'); await p.waitForTimeout(300);
  for (const q of ['handover', 'waiting', 'rework', 'burnout', 'bottleneck', 'approval', 'queue']) {
    await p.fill('#prinSearch', q); await p.waitForTimeout(200);
    ok('principle search finds "' + q + '"', await p.locator('#view-principles .pcard').count() > 0);
  }
  await p.fill('#prinSearch', 'zzzqqq'); await p.waitForTimeout(200);
  ok('nonsense search returns the empty state', await p.locator('#view-principles .pcard').count() === 0);
  await p.fill('#prinSearch', ''); await p.waitForTimeout(200);
  await p.click('#sparkBtn'); await p.waitForTimeout(300);
  ok('random spark shows exactly one principle', await p.locator('#view-principles .pcard').count() === 1);

  /* ---------- domain switching ---------- */
  await p.fill('#prinSearch', ''); await p.waitForTimeout(250);
  await p.click('#domainSeg button[data-domain="manufacturing"]'); await p.waitForTimeout(400);
  ok('manufacturing mode hides service examples', await p.locator('#view-principles .badge.svc').count() === 0);
  await p.click('#domainSeg button[data-domain="both"]'); await p.waitForTimeout(400);
  ok('both mode shows service and manufacturing examples',
    await p.locator('#view-principles .badge.svc').count() > 0 &&
    await p.locator('#view-principles .badge.mfg').count() > 0);
  await p.click('#domainSeg button[data-domain="service"]'); await p.waitForTimeout(300);

  /* ---------- theme ---------- */
  ok('theme control is labelled', (await p.textContent('#themeBtn')) === 'Auto');
  await p.click('#themeBtn'); await p.waitForTimeout(150);
  ok('theme switches to light', (await p.getAttribute('html', 'data-theme')) === 'light');
  await p.click('#themeBtn'); await p.waitForTimeout(150);
  ok('theme switches to dark', (await p.getAttribute('html', 'data-theme')) === 'dark');
  await p.click('#themeBtn'); await p.waitForTimeout(150);
  ok('theme returns to auto', (await p.getAttribute('html', 'data-theme')) === null);

  /* ---------- saving and export ---------- */
  await p.click('#tabs button[data-view="solve"]'); await p.waitForTimeout(300);
  await p.evaluate(() => { S.step = 5; renderSolve(); }); await p.waitForTimeout(300);
  p.once('dialog', d => d.accept('Regression session'));
  await p.click('[data-action="saveNow"]'); await p.waitForTimeout(400);
  await p.click('#tabs button[data-view="saved"]'); await p.waitForTimeout(300);
  ok('named session appears in saved work', (await p.textContent('#savedList')).includes('Regression session'));

  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#exportAllBtn')]);
  const exported = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  ok('export file carries current and saved sessions', Array.isArray(exported.saved) && exported.saved.length >= 1 && !!exported.current.problem);

  await p.click('#tabs button[data-view="solve"]'); await p.waitForTimeout(300);
  const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('[data-action="downloadMd"]')]);
  const mdFile = fs.readFileSync(await dl2.path(), 'utf8');
  ok('markdown download is well formed', mdFile.startsWith('# TRIZ working sheet'));

  p.once('dialog', d => d.accept());
  await p.click('#tabs button[data-view="saved"]'); await p.waitForTimeout(250);
  await p.click('#newSessionBtn'); await p.waitForTimeout(400);
  ok('new session clears the working sheet', (await p.inputValue('[data-action="pf"][data-k="title"]')) === '');
  await p.click('#tabs button[data-view="saved"]'); await p.waitForTimeout(300);
  ok('saved sessions survive starting a new one', (await p.textContent('#savedList')).includes('Regression session'));
  await p.click('[data-action="loadSaved"]'); await p.waitForTimeout(400);
  await p.click('#steps [data-action="step"][data-n="1"]'); await p.waitForTimeout(300);
  ok('a reopened session restores its content', (await p.inputValue('[data-action="pf"][data-k="title"]')).length > 0);
  await ctx.close();

  /* ---------- mobile layout ---------- */
  const m = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  const mp = await m.newPage();
  mp.on('pageerror', e => errs.push('PAGEERROR(mobile): ' + e.message));
  await mp.goto(APP); await mp.waitForTimeout(400);
  await mp.evaluate(() => window.scrollTo(0, 600)); await mp.waitForTimeout(300);
  const layout = await mp.evaluate(() => {
    const h = document.querySelector('header.top').getBoundingClientRect();
    const n = document.querySelector('nav.tabs').getBoundingClientRect();
    return {overlap: n.top < h.bottom - 1, visible: n.top >= 0 && n.bottom <= innerHeight,
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1};
  });
  ok('mobile: tabs are not hidden behind the header', !layout.overlap);
  ok('mobile: tabs stay on screen when scrolled', layout.visible);
  ok('mobile: no horizontal overflow', !layout.overflow);
  await browser.close();

  ok('no JavaScript errors anywhere (webfont network noise excluded)', errs.length === 0);
  if (errs.length) console.log(errs.join('\n'));
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
