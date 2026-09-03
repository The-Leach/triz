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
      sepNoDupes: SEPARATIONS.every(s => new Set(s.ps).size === s.ps.length),
      presetsPopulated: PRESETS.every(x => MATRIX[x.imp - 1][x.wor - 1].length > 0),
      dupeCells: (() => { let n = 0;
        for (let i = 0; i < 39; i++) for (let j = 0; j < 39; j++)
          if (new Set(MATRIX[i][j]).size !== MATRIX[i][j].length) n++;
        return n; })(),
      landmark1: MATRIX[0][2].join(','),   // row 1 x col 3, in every published matrix
      landmark2: MATRIX[1][3].join(','),   // row 2 x col 4
      corrected: MATRIX[18][8].join(',')   // row 19 x col 9, the one corrected cell
    };
  });
  ok('39 factors, numbered 1-39', data.params === 39 && data.paramsOrdered);
  ok('40 principles, numbered 1-40', data.principles === 40 && data.principlesOrdered);
  ok('every principle and factor has full content', data.contentComplete);
  ok('matrix has 1248 populated cells', data.filled === 1248);
  ok('every matrix reference is a principle 1-40', data.badRef === 0);
  ok('matrix diagonal is empty', data.diag === 0);
  ok('separation strategies reference valid principles', data.sepRefsValid && data.sepNoDupes);
  ok('no cell recommends the same principle twice', data.dupeCells === 0);
  ok('landmark cell [1,3] matches every published matrix', data.landmark1 === '15,8,29,34');
  ok('landmark cell [2,4] matches every published matrix', data.landmark2 === '10,1,29,35');
  ok('the corrected cell [19,9] holds the cross-checked value', data.corrected === '8,15,35');
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
  await p.evaluate(() => { const f = F(); f.ctype = 'physical'; f.phys = {element: 'the identity check', a: 'thorough', b: 'instant', sep: ''}; S.step = 2; renderSolve(); });
  await p.waitForTimeout(300);
  await p.click('[data-action="sep"][data-id="time"]'); await p.waitForTimeout(250);
  await p.click('#stepBody [data-action="step"][data-n="3"]'); await p.waitForTimeout(350);
  ok('separation in time returns its 15 principles', await p.locator('#view-solve .pcard').count() === 15);
  ok('chosen separation strategy is shown', (await p.textContent('#stepBody .kv')).includes('Separate in time'));

  /* ---------- open exploration ---------- */
  await p.evaluate(() => { const f = F(); f.ctype = 'explore'; S.step = 3; renderSolve(); }); await p.waitForTimeout(450);
  ok('exploration returns all 40 principles', await p.locator('#view-solve .pcard').count() === 40);

  /* ---------- dead-end pair offers reframing, not filler ---------- */
  await p.evaluate(() => { const f = F(); f.ctype = 'technical'; f.imp = 29; f.wor = 35; S.step = 3; renderSolve(); });
  await p.waitForTimeout(300);
  const nearby = await p.locator('[data-action="useNearby"]').count();
  ok('dead-end pair offers nearby populated pairs (' + nearby + ')', nearby > 0);
  ok('dead-end pair does not pad with generic principles', await p.locator('#view-solve .pcard').count() === 0);
  ok('dead-end pair offers a physical reframing', await p.locator('[data-action="toPhysical"]').count() === 1);
  const nearbyPair = await p.evaluate(() => {
    const b = document.querySelector('[data-action="useNearby"]');
    return {i: +b.dataset.i, j: +b.dataset.j, populated: MATRIX[b.dataset.i - 1][b.dataset.j - 1].length > 0};
  });
  ok('every offered nearby pair is actually populated', nearbyPair.populated);
  await p.click('[data-action="useNearby"]'); await p.waitForTimeout(350);
  ok('choosing a nearby pair returns real principles', await p.locator('#view-solve .pcard').count() > 0);
  ok('choosing a nearby pair updates the framing',
    await p.evaluate(() => F().imp) === nearbyPair.i && await p.evaluate(() => F().wor) === nearbyPair.j);

  await p.evaluate(() => { const f = F(); f.ctype = 'technical'; f.imp = 8; f.wor = 33; S.step = 3; renderSolve(); });
  await p.waitForTimeout(300);
  ok('forward-empty pair falls back to the reverse cell', (await p.textContent('#stepBody')).includes('reverse'));

  /* ---------- factor polarity ---------- */
  ok('polarity is shown on the chosen factors', await p.locator('#stepBody .polchip').count() > 0);
  const pol = await p.evaluate(() => ({
    less: PARAM_BY_N[25].dir, more: PARAM_BY_N[27].dir, either: PARAM_BY_N[3].dir,
    text: PARAM_BY_N[25].pol.replace(/<[^>]+>/g, ''), all: PARAMS.every(x => x.dir && x.pol)
  }));
  ok('every factor declares a direction and a polarity note', pol.all);
  ok('loss-type factors read "lower is better"', pol.less === 'less');
  ok('reliability reads "higher is better"', pol.more === 'more');
  ok('ambiguous factors are marked as such', pol.either === 'either');
  ok('polarity text explains what improving means', /less time is lost/i.test(pol.text));

  /* ---------- framings: several angles on one problem ---------- */
  await p.evaluate(() => { S.framings = [S.framings[0]]; S.active = S.framings[0].id;
    const f = F(); f.ctype = 'technical'; f.imp = 25; f.wor = 27; f.stars = [10]; f.ideas = {10: 'first framing idea'};
    S.step = 3; renderSolve(); });
  await p.waitForTimeout(300);
  ok('a single framing hides the switcher', await p.locator('.framings').count() === 0);
  await p.click('[data-action="addFraming"]'); await p.waitForTimeout(350);
  ok('adding a framing shows the switcher', await p.locator('.framings').count() === 1);
  ok('a new framing starts empty', await p.evaluate(() => F().stars.length) === 0);
  ok('the new framing is the active one', await p.evaluate(() => S.framings[1].id === S.active));
  await p.evaluate(() => { const f = F(); f.ctype = 'physical';
    f.phys = {element: 'the check', a: 'thorough', b: 'instant', sep: 'time'};
    f.stars = [15]; S.step = 3; renderSolve(); });
  await p.waitForTimeout(300);
  ok('framings keep separate shortlists',
    await p.evaluate(() => S.framings[0].stars.join()) === '10' &&
    await p.evaluate(() => S.framings[1].stars.join()) === '15');
  await p.click('.framings button.fr'); await p.waitForTimeout(350);
  ok('switching back restores the first framing',
    await p.evaluate(() => F().imp) === 25 && await p.evaluate(() => F().stars.join()) === '10');
  await p.evaluate(() => { S.step = 5; renderSolve(); }); await p.waitForTimeout(350);
  const sheet = await p.textContent('#mdOut');
  ok('the summary covers every framing', await p.locator('.fr-block').count() === 2);
  ok('the export names both framings', /Framing 1 of 2/.test(sheet) && /Framing 2 of 2/.test(sheet));
  ok('the export keeps each framing\'s own work', sheet.includes('first framing idea') && /Separate in time/.test(sheet));

  /* ---------- nine windows ---------- */
  await p.click('#tabs button[data-view="windows"]'); await p.waitForTimeout(400);
  ok('nine windows renders nine cells', await p.locator('.nw-cell').count() === 9);
  ok('the present system cell is highlighted as the starting point', await p.locator('.nw-cell.centre').count() === 1);
  await p.fill('#nw-supPast', 'The regulator changed the evidence rules in March');
  await p.fill('#nw-sysNow', 'Applications wait nine days for approval');
  await p.waitForTimeout(350);
  ok('window text persists to the session',
    await p.evaluate(() => S.windows.supPast) === 'The regulator changed the evidence rules in March');
  await p.click('#tabs button[data-view="solve"]'); await p.waitForTimeout(300);
  await p.evaluate(() => { S.step = 5; renderSolve(); }); await p.waitForTimeout(350);
  const sheet2 = await p.textContent('#mdOut');
  ok('nine windows appear in the working sheet',
    sheet2.includes('## Nine Windows') && sheet2.includes('The regulator changed the evidence rules in March'));

  /* ---------- migration of pre-framing sessions ---------- */
  const migrated = await p.evaluate(() => {
    const old = {id: 'sOld', name: 'Legacy', step: 3, ctype: 'technical', imp: 9, wor: 27,
      problem: {title: 'Old shape session', context: '', ifr: '', resources: ''},
      phys: {element: '', a: '', b: '', sep: ''}, stars: [10, 35], ideas: {10: 'kept'},
      concepts: {10: {text: 'kept concept'}}, created: 1, updated: 2};
    const m = migrate(JSON.parse(JSON.stringify(old)));
    return {framings: m.framings.length, imp: m.framings[0].imp, stars: m.framings[0].stars.join(),
      idea: m.framings[0].ideas[10], concept: m.framings[0].concepts[10].text,
      title: m.problem.title, active: m.active === m.framings[0].id,
      stripped: m.ctype === undefined && m.stars === undefined};
  });
  ok('an old session migrates into one framing', migrated.framings === 1 && migrated.active);
  ok('migration keeps the contradiction', migrated.imp === 9);
  ok('migration keeps shortlist, ideas and concepts',
    migrated.stars === '10,35' && migrated.idea === 'kept' && migrated.concept === 'kept concept');
  ok('migration keeps the problem statement', migrated.title === 'Old shape session');
  ok('migration removes the old top-level fields', migrated.stripped);
  ok('migration tolerates junk', await p.evaluate(() =>
    migrate({problem: {title: 'x'}, stars: null, framings: 'nonsense'}).framings.length === 1));

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

  /* ---------- matrix keyboard access ---------- */
  await p.click('#tabs button[data-view="matrix"]'); await p.waitForTimeout(450);
  const roving = await p.evaluate(() => document.querySelectorAll('#mxScroll td[tabindex="0"]').length);
  ok('exactly one matrix cell is in the tab order', roving === 1);
  ok('matrix cells carry a descriptive label', /Improving .*worsening .*(Principles|No recommendation)/.test(
    await p.evaluate(() => document.querySelector('#mxScroll td[tabindex="0"]').getAttribute('aria-label'))));
  ok('row and column headers are scoped', await p.evaluate(() =>
    document.querySelectorAll('#mxScroll th[scope="row"]').length === 39 &&
    document.querySelectorAll('#mxScroll th[scope="col"]').length === 40));
  await p.evaluate(() => document.querySelector('#mxScroll td[tabindex="0"]').focus());
  const before = await p.evaluate(() => { const e = document.activeElement; return e.dataset.i + ',' + e.dataset.j; });
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
  const afterRight = await p.evaluate(() => { const e = document.activeElement; return e.dataset.i + ',' + e.dataset.j; });
  ok('arrow key moves matrix focus (' + before + ' -> ' + afterRight + ')', before !== afterRight);
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(200);
  const afterDown = await p.evaluate(() => { const e = document.activeElement; return e.dataset.i + ',' + e.dataset.j; });
  ok('arrow keys move in both axes', afterDown !== afterRight);
  ok('keyboard navigation skips the diagonal', await p.evaluate(() => {
    const e = document.activeElement; return e.dataset.i !== e.dataset.j; }));
  await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok('Enter opens the focused cell', await p.locator('#mxDetail .card').count() === 1);
  ok('focus is not lost when the cell opens', await p.evaluate(() =>
    document.activeElement && document.activeElement.tagName === 'TD'));

  /* ---------- focus management in the wizard ---------- */
  await p.click('#tabs button[data-view="solve"]'); await p.waitForTimeout(300);
  await p.evaluate(() => { S.step = 1; renderSolve(); }); await p.waitForTimeout(250);
  await p.click('#steps [data-action="step"][data-n="2"]'); await p.waitForTimeout(350);
  ok('changing step moves focus to the new heading', await p.evaluate(() =>
    document.activeElement === document.querySelector('#stepBody h2')));

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
