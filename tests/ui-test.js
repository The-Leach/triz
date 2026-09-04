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
      aliases: PRINCIPLES.every(x => x.alias && x.alias.toLowerCase() !== x.name.toLowerCase()),
      aliasesUnique: new Set(PRINCIPLES.map(x => x.alias.toLowerCase())).size === 40,
      physicalOnesRenamed: [8, 12, 14, 18].every(n => PRINCIPLES[n - 1].alias.length > 4),
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
  ok('every principle has a distinct plain-language service name', data.aliases && data.aliasesUnique);
  ok('the physically-named principles are renamed for service use', data.physicalOnesRenamed);
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

  /* ---------- the service name is shown beside the classical one ---------- */
  ok('principle cards show both names', await p.locator('#view-solve .pcard .alias').count() > 0);
  const bothNames = await p.evaluate(() => {
    const c = document.querySelector('#view-solve .pcard');
    return {name: c.querySelector('h3').textContent, alias: c.querySelector('.alias').textContent};
  });
  ok('the classical name is kept', bothNames.name.includes(bothNames.alias) && bothNames.alias.length > 3);
  await p.click('#tabs button[data-view="guidance"]'); await p.waitForTimeout(250);
  await p.click('#guideTabs button[data-guide="principles"]'); await p.waitForTimeout(400);
  ok('all 40 show both names', await p.locator('#guide-principles .pcard .alias').count() === 40);
  for (const [n, word] of [[8, 'Anti-weight'], [12, 'Equipotentiality'], [14, 'curvature'], [18, 'Mechanical vibration']]) {
    const pair = await p.evaluate(i => ({name: PRINCIPLES[i - 1].name, alias: PRINCIPLES[i - 1].alias}), n);
    ok('principle ' + n + ' (' + word + ') reads as "' + pair.alias + '"',
      pair.name.toLowerCase().includes(word.toLowerCase()) && pair.alias.length > 4);
  }
  await p.fill('#prinSearch', 'little and often'); await p.waitForTimeout(300);
  ok('search finds a principle by its service name',
    await p.locator('#guide-principles .pcard').count() >= 1 &&
    /Mechanical vibration/.test(await p.textContent('#guide-principles')));
  await p.fill('#prinSearch', ''); await p.waitForTimeout(250);
  await p.click('#tabs button[data-view="solve"]'); await p.waitForTimeout(300);

  /* ---------- writing an idea shortlists the principle ---------- */
  await p.evaluate(() => { const f = F(); f.stars = []; f.ideas = {}; S.step = 3; renderSolve(); });
  await p.waitForTimeout(350);
  ok('nothing is shortlisted to begin with', await p.evaluate(() => F().stars.length) === 0);
  await p.fill('#view-solve .pcard >> nth=0 >> textarea', 'Auto-approve under a threshold');
  await p.waitForTimeout(350);
  ok('writing an idea shortlists that principle', await p.evaluate(() => F().stars.length) === 1);
  ok('its star shows as set without a redraw',
    await p.evaluate(() => document.querySelector('#view-solve .pcard .star').getAttribute('aria-pressed')) === 'true');
  ok('the shortlist counter keeps up', (await p.textContent('#starCount')) === '1');
  const caret = await p.evaluate(() => document.activeElement.tagName);
  ok('the user keeps their cursor while typing', caret === 'TEXTAREA');
  await p.fill('#view-solve .pcard >> nth=0 >> textarea', '');
  await p.waitForTimeout(300);
  ok('clearing the text does not silently un-shortlist it',
    await p.evaluate(() => F().stars.length) === 1);
  await p.click('#view-solve .pcard >> nth=0 >> .star'); await p.waitForTimeout(250);
  ok('the star still removes it manually', await p.evaluate(() => F().stars.length) === 0);

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

  /* ---------- top-level tabs ---------- */
  ok('there are four top-level tabs', await p.locator('#tabs button').count() === 4);
  ok('the reference catalogues are no longer top-level tabs',
    await p.locator('#tabs button[data-view="principles"]').count() === 0 &&
    await p.locator('#tabs button[data-view="params"]').count() === 0);
  ok('saved work is gone', await p.locator('#tabs button[data-view="saved"]').count() === 0);
  for (const v of ['windows', 'matrix', 'guidance']) {
    await p.click('#tabs button[data-view="' + v + '"]'); await p.waitForTimeout(350);
    ok('tab renders: ' + v, await p.isVisible('#view-' + v));
  }

  /* ---------- guidance holds the reference material ---------- */
  await p.click('#tabs button[data-view="guidance"]'); await p.waitForTimeout(350);
  ok('guidance has four sections', await p.locator('#guideTabs button').count() === 4);
  for (const g of ['how', 'principles', 'factors', 'examples']) {
    await p.click('#guideTabs button[data-guide="' + g + '"]'); await p.waitForTimeout(350);
    ok('guidance section renders: ' + g, await p.isVisible('#guide-' + g));
    ok('only one guidance section is shown at a time: ' + g,
      await p.evaluate(() => ['how','principles','factors','examples'].filter(x => !document.getElementById('guide-'+x).hidden).length) === 1);
  }
  await p.click('#guideTabs button[data-guide="principles"]'); await p.waitForTimeout(400);
  ok('all 40 principles are listed under guidance', await p.locator('#guide-principles .pcard').count() === 40);
  await p.click('#guideTabs button[data-guide="factors"]'); await p.waitForTimeout(400);
  ok('all 39 factors are listed under guidance', await p.locator('#guide-factors .card').count() === 40);
  await p.click('#guideTabs button[data-guide="examples"]'); await p.waitForTimeout(400);
  ok('worked examples have their own section', await p.locator('#guide-examples .excard').count() === 3);

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
  await p.click('#tabs button[data-view="guidance"]'); await p.waitForTimeout(250);
  await p.click('#guideTabs button[data-guide="principles"]'); await p.waitForTimeout(350);
  for (const q of ['handover', 'waiting', 'rework', 'burnout', 'bottleneck', 'approval', 'queue']) {
    await p.fill('#prinSearch', q); await p.waitForTimeout(200);
    ok('principle search finds "' + q + '"', await p.locator('#guide-principles .pcard').count() > 0);
  }
  await p.fill('#prinSearch', 'zzzqqq'); await p.waitForTimeout(200);
  ok('nonsense search returns the empty state', await p.locator('#guide-principles .pcard').count() === 0);
  await p.fill('#prinSearch', ''); await p.waitForTimeout(200);
  await p.click('#sparkBtn'); await p.waitForTimeout(300);
  ok('random spark shows exactly one principle', await p.locator('#guide-principles .pcard').count() === 1);

  /* ---------- domain switching ---------- */
  await p.fill('#prinSearch', ''); await p.waitForTimeout(250);
  await p.click('#domainSeg button[data-domain="manufacturing"]'); await p.waitForTimeout(400);
  ok('manufacturing mode hides service examples', await p.locator('#guide-principles .badge.svc').count() === 0);
  await p.click('#domainSeg button[data-domain="both"]'); await p.waitForTimeout(400);
  ok('both mode shows service and manufacturing examples',
    await p.locator('#guide-principles .badge.svc').count() > 0 &&
    await p.locator('#guide-principles .badge.mfg').count() > 0);
  await p.click('#domainSeg button[data-domain="service"]'); await p.waitForTimeout(300);

  /* ---------- theme ---------- */
  ok('theme control is labelled', (await p.textContent('#themeBtn')) === 'Auto');
  await p.click('#themeBtn'); await p.waitForTimeout(150);
  ok('theme switches to light', (await p.getAttribute('html', 'data-theme')) === 'light');
  await p.click('#themeBtn'); await p.waitForTimeout(150);
  ok('theme switches to dark', (await p.getAttribute('html', 'data-theme')) === 'dark');
  await p.click('#themeBtn'); await p.waitForTimeout(150);
  ok('theme returns to auto', (await p.getAttribute('html', 'data-theme')) === null);

  /* ---------- the summary is the only export surface ---------- */
  await p.click('#tabs button[data-view="solve"]'); await p.waitForTimeout(300);
  await p.evaluate(() => {
    S = blankSession();
    S.problem.title = 'Export surface test';
    const f = F(); f.ctype = 'technical'; f.imp = 25; f.wor = 27; f.stars = [10];
    f.concepts[10] = {text: 'Pre-check at intake', impact: 'High', effort: 'Low'};
    S.step = 5; renderSolve();
  });
  await p.waitForTimeout(400);
  for (const act of ['copyMd', 'downloadMd', 'printIt', 'newSession']) {
    ok('summary offers: ' + act, await p.locator('#stepBody [data-action="' + act + '"]').count() === 1);
  }
  ok('printing survives being used twice (beforeprint fires only once per document)',
    await p.evaluate(async () => { doPrint(); await new Promise(r => setTimeout(r, 900));
      doPrint(); await new Promise(r => setTimeout(r, 900));
      return document.querySelectorAll('[data-action="printIt"]').length === 1
          && document.querySelectorAll('.modal').length === 0; }));
  ok('no regex lookbehind anywhere (a parse error would blank the whole app)',
    await p.evaluate(() => !/\(\?<[=!]/.test(Array.from(document.scripts).map(s => s.textContent).join(''))));
  ok('summary no longer offers saving a session', await p.locator('[data-action="saveNow"]').count() === 0);
  ok('summary says the work lives only in this browser',
    /kept in this browser/i.test(await p.textContent('#stepBody')));
  const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('[data-action="downloadMd"]')]);
  const mdFile = require('fs').readFileSync(await dl2.path(), 'utf8');
  ok('markdown download is well formed and carries the work',
    mdFile.startsWith('# TRIZ working sheet') && mdFile.includes('Pre-check at intake'));

  /* ---------- one framing is nudged towards a second ---------- */
  ok('a single framing is nudged to try another',
    await p.locator('[data-action="addFramingAs"]').count() >= 1);
  await p.click('[data-action="addFramingAs"][data-t="physical"]'); await p.waitForTimeout(450);
  ok('the nudge starts a second framing of the chosen kind',
    await p.evaluate(() => S.framings.length) === 2 && await p.evaluate(() => F().ctype) === 'physical');
  await p.evaluate(() => { const f = F(); f.phys = {element: 'the check', a: 'thorough', b: 'instant', sep: 'time'};
    f.stars = [15]; f.concepts[15] = {text: 'Split the decision in two'}; S.step = 5; renderSolve(); });
  await p.waitForTimeout(400);
  ok('with two framings the nudge goes away', await p.locator('[data-action="addFramingAs"]').count() === 0);
  const both = await p.textContent('#mdOut');
  ok('both framings export in one working sheet',
    /Framing 1 of 2/.test(both) && /Framing 2 of 2/.test(both) &&
    both.includes('Pre-check at intake') && both.includes('Split the decision in two'));
  await p.click('#stepBody [data-action="newSession"]'); await p.waitForTimeout(400);
  await p.click('.modal [data-md="ok"]'); await p.waitForTimeout(500);
  ok('"start a new problem" clears the sheet', await p.evaluate(() => !S.problem.title && S.framings.length === 1));

  /* ---------- reset is reachable, and asks without a native dialog ----------
     window.confirm is suppressed in a sandboxed frame and returns false, which
     silently turned every confirmed action into a no-op on the published page. */
  await p.click('#tabs button[data-view="solve"]'); await p.waitForTimeout(250);
  await p.evaluate(() => { S = blankSession(); renderSolve(); }); await p.waitForTimeout(300);
  ok('a blank session shows no reset (nothing to reset)',
    await p.locator('#exampleBar [data-action="newSession"]').count() === 0);
  await p.evaluate(() => { S.problem.title = 'A problem in progress'; S.step = 1; renderSolve(); });
  await p.waitForTimeout(300);
  ok('reset appears as soon as there is work', await p.locator('#exampleBar [data-action="newSession"]').count() === 1);
  ok('the bar says what is being worked on', /A problem in progress/.test(await p.textContent('#exampleBar')));
  for (const step of [2, 3, 4, 5]) {
    await p.evaluate(n => { const f = F(); f.ctype = 'explore'; S.step = n; renderSolve(); }, step);
    await p.waitForTimeout(220);
    ok('reset is reachable on step ' + step, await p.locator('[data-action="newSession"]').count() >= 1);
  }
  ok('no code path relies on a native confirm',
    await p.evaluate(() => !/[^a-zA-Z]confirm\s*\(/.test(
      Array.from(document.scripts).map(s => s.textContent).join('\n').replace(/askConfirm/g, 'X'))));
  await p.evaluate(() => { S.step = 1; renderSolve(); }); await p.waitForTimeout(250);
  await p.click('#exampleBar [data-action="newSession"]'); await p.waitForTimeout(350);
  ok('the in-page dialog opens', await p.locator('.modal[role="alertdialog"]').count() === 1);
  ok('the dialog takes focus', await p.evaluate(() => document.activeElement.dataset.md === 'ok'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok('Escape cancels and keeps the work',
    await p.locator('.modal').count() === 0 && await p.evaluate(() => !!S.problem.title));
  await p.click('#exampleBar [data-action="newSession"]'); await p.waitForTimeout(350);
  await p.click('.modal [data-md="cancel"]'); await p.waitForTimeout(300);
  ok('cancelling keeps the work', await p.evaluate(() => !!S.problem.title));
  await p.click('#exampleBar [data-action="newSession"]'); await p.waitForTimeout(350);
  await p.click('.modal [data-md="ok"]'); await p.waitForTimeout(400);
  ok('confirming clears the sheet', await p.evaluate(() => !S.problem.title && S.framings.length === 1));

  await ctx.close();

  /* ---------- storage failure must never look like success ---------- */
  const ctx2 = await browser.newContext({viewport: {width: 1280, height: 900}});
  const q = await ctx2.newPage();
  const qerrs = [];
  q.on('pageerror', e => qerrs.push(e.message));
  await q.goto(APP); await q.waitForTimeout(500);
  ok('no storage warning while saving works', !(await q.isVisible('#saveWarn')));
  const saveResult = await q.evaluate(() => {
    localStorage.setItem = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
    return persist();
  });
  await q.waitForTimeout(200);
  ok('persist() reports failure rather than claiming success', saveResult === false);
  ok('a failed save warns the user', await q.isVisible('#saveWarn'));
  ok('the warning says the work is not being saved',
    /not being saved/i.test(await q.textContent('#saveWarn')));
  ok('the warning offers a way to keep the work',
    await q.locator('#saveWarn [data-action="copyMd"]').count() === 1);
  await q.click('#saveWarn [data-action="dismissSaveWarn"]'); await q.waitForTimeout(200);
  ok('the warning can be dismissed', !(await q.isVisible('#saveWarn')));
  const recovered = await q.evaluate(() => {
    const store = {};
    localStorage.setItem = (k, v) => { store[k] = v; };
    return persist();
  });
  await q.waitForTimeout(200);
  ok('saving recovers cleanly once storage works again', recovered === true && !(await q.isVisible('#saveWarn')));
  ok('storage failure raises no JavaScript error', qerrs.length === 0);
  await ctx2.close();

  /* ---------- worked examples ---------- */
  const ctx3 = await browser.newContext({viewport: {width: 1280, height: 900}});
  const w = await ctx3.newPage();
  const werrs = [];
  w.on('pageerror', e => werrs.push(e.message));
  await w.goto(APP); await w.waitForTimeout(500);
  ok('the solve page does not carry the example cards', await w.locator('#stepBody .excard').count() === 0);
  ok('it offers one small link to them instead',
    await w.locator('#stepBody [data-action="goGuide"][data-g="examples"]').count() === 1);
  await w.click('#stepBody [data-action="goGuide"][data-g="examples"]'); await w.waitForTimeout(450);
  ok('that link reaches the worked examples', await w.locator('#guide-examples .excard').count() === 3);
  await w.click('#guide-examples .excard'); await w.waitForTimeout(500);
  const exState = await w.evaluate(() => ({
    example: S.example, framings: S.framings.length, step: S.step,
    title: S.problem.title, ifr: !!S.problem.ifr,
    windows: Object.keys(S.windows).length,
    starred: S.framings.reduce((n, f) => n + f.stars.length, 0),
    concepts: S.framings.reduce((n, f) => n + Object.keys(f.concepts).length, 0)
  }));
  ok('opening an example loads a complete session',
    !!exState.example && exState.framings >= 2 && exState.title.length > 20 && exState.ifr);
  ok('the example carries Nine Windows content', exState.windows >= 4);
  ok('the example carries shortlisted principles and written concepts',
    exState.starred >= 4 && exState.concepts >= 4);
  ok('the example opens at the finished working sheet', exState.step === 5);
  ok('the example is labelled as one', await w.locator('#exampleBar .exbar').count() === 1);
  ok('its working sheet is complete', /Framing 1 of/.test(await w.textContent('#mdOut')));
  ok('every example is reachable and valid', await w.evaluate(() => EXAMPLES.every(x => {
    const m = migrate(JSON.parse(JSON.stringify(x.session)));
    return m && m.framings.length >= 1 && !!m.problem.title;
  })));
  await w.click('#exampleBar [data-action="newSession"]'); await w.waitForTimeout(400);
  ok('"start my own" asks in the page, not with a native dialog',
    await w.locator('.modal[role="alertdialog"]').count() === 1);
  await w.click('.modal [data-md="ok"]'); await w.waitForTimeout(500);
  ok('"start my own" clears the example', await w.evaluate(() => !S.example && !S.problem.title));
  ok('worked examples raise no JavaScript error', werrs.length === 0);

  /* ---------- Nine Windows feeds the contradiction step ---------- */
  await w.click('#tabs button[data-view="windows"]'); await w.waitForTimeout(400);
  ok('the bridge stays hidden until something is written',
    await w.locator('[data-action="winToSolve"]').count() === 0);
  await w.fill('#nw-sysNow', 'Applications wait nine days for approval and errors rise when we rush them');
  await w.fill('#nw-supPast', 'The regulator changed the evidence rules last March');
  await w.waitForTimeout(400);
  await w.click('#tabs button[data-view="solve"]'); await w.waitForTimeout(200);
  await w.click('#tabs button[data-view="windows"]'); await w.waitForTimeout(400);
  ok('the bridge appears once windows are filled',
    await w.locator('[data-action="winToSolve"]').count() === 2);
  const chips = await w.locator('[data-action="winFactor"]').count();
  ok('the bridge suggests factors from what was written (' + chips + ')', chips > 0);
  ok('a note in the super-system row is called out',
    /Around it/.test(await w.textContent('#windowsBody')));
  await w.click('[data-action="winFactor"]'); await w.waitForTimeout(500);
  const bridged = await w.evaluate(() => ({
    view: document.querySelector('#view-solve').hidden === false,
    ctype: F().ctype, imp: F().imp, step: S.step, title: S.problem.title
  }));
  ok('choosing a factor moves to the contradiction step', bridged.view && bridged.step === 2);
  ok('it starts a trade-off on that factor', bridged.ctype === 'technical' && bridged.imp >= 1);
  ok('it seeds the problem line from the centre window',
    bridged.title.startsWith('Applications wait nine days'));
  ok('the bridge raises no JavaScript error', werrs.length === 0);
  await ctx3.close();

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
