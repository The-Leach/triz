/*
 * The published page runs inside a sandboxed iframe, where window.confirm and
 * window.prompt are suppressed: confirm() returns false without asking. Any
 * action guarded by a native confirm therefore becomes a silent no-op there
 * while working perfectly when the file is opened directly -- which is exactly
 * how "Start my own" shipped broken.
 *
 * This runs the real page inside that sandbox and drives the destructive
 * actions through it.
 *
 *   node tests/sandbox-test.js
 *   CHROME=/path/to/chrome node tests/sandbox-test.js
 */
const {chromium} = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8944;
let pass = 0, fail = 0;
const ok = (l, c) => { (c ? pass++ : fail++); console.log((c ? 'PASS  ' : 'FAIL  ') + l); };

const WRAP = '<!doctype html><meta charset="utf-8"><title>sandbox</title>' +
  '<iframe id="f" src="/index.html" sandbox="allow-scripts" ' +
  'style="width:100%;height:900px;border:0"></iframe>';

const server = http.createServer((req, res) => {
  if (req.url === '/wrap.html') { res.writeHead(200, {'Content-Type': 'text/html'}); return res.end(WRAP); }
  if (req.url === '/index.html') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    return res.end(fs.readFileSync(path.join(ROOT, 'index.html')));
  }
  res.writeHead(404); res.end('not found');
});

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch({executablePath: process.env.CHROME || undefined, args: ['--no-sandbox']});
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  await page.goto('http://localhost:' + PORT + '/wrap.html');
  await page.waitForTimeout(1600);
  const f = page.frames().find(x => x.url().includes('index.html'));
  ok('the app runs inside a sandboxed frame', !!f && await f.locator('.excard').count() === 3);

  // the condition that caused the bug
  ok('native confirm is suppressed here (returns false without asking)',
    await f.evaluate(() => window.confirm('probe?')) === false);

  // opening a worked example over existing work
  await f.evaluate(() => { S.problem.title = 'Work already in progress'; renderSolve(); });
  await f.waitForTimeout(300);
  // with a problem stated the cards move to Guidance, so open one from there
  await f.click('#tabs button[data-view="guidance"]');
  await f.waitForTimeout(400);
  await f.click('#guideTabs button[data-guide="examples"]');
  await f.waitForTimeout(400);
  await f.click('#guide-examples .excard');
  await f.waitForTimeout(400);
  ok('opening an example over existing work asks in the page',
    await f.locator('.modal[role="alertdialog"]').count() === 1);
  await f.click('.modal [data-md="ok"]');
  await f.waitForTimeout(500);
  ok('opening an example actually loads it', await f.evaluate(() => !!S.example));

  // the reported bug: "Start my own"
  const before = await f.evaluate(() => S.problem.title);
  await f.click('#exampleBar [data-action="newSession"]');
  await f.waitForTimeout(400);
  ok('"Start my own" opens the in-page dialog', await f.locator('.modal').count() === 1);
  await f.click('.modal [data-md="ok"]');
  await f.waitForTimeout(500);
  const after = await f.evaluate(() => ({title: S.problem.title, example: S.example, framings: S.framings.length}));
  ok('"Start my own" resets the session in the sandbox',
    before !== after.title && after.title === '' && !after.example && after.framings === 1);

  // cancelling must be safe
  await f.evaluate(() => { S.problem.title = 'Do not lose this'; renderSolve(); });
  await f.waitForTimeout(300);
  await f.click('#exampleBar [data-action="newSession"]');
  await f.waitForTimeout(350);
  await f.click('.modal [data-md="cancel"]');
  await f.waitForTimeout(350);
  ok('cancelling keeps the work', await f.evaluate(() => S.problem.title) === 'Do not lose this');

  // clearing Nine Windows
  await f.evaluate(() => { S.windows.sysNow = 'something written'; persist(); });
  await f.click('#tabs button[data-view="windows"]');
  await f.waitForTimeout(500);
  await f.click('[data-action="clearWindows"]');
  await f.waitForTimeout(400);
  ok('clearing Nine Windows asks in the page', await f.locator('.modal').count() === 1);
  await f.click('.modal [data-md="ok"]');
  await f.waitForTimeout(400);
  ok('clearing Nine Windows works in the sandbox',
    await f.evaluate(() => Object.keys(S.windows).length === 0));

  // removing a framing
  await f.click('#tabs button[data-view="solve"]');
  await f.waitForTimeout(300);
  await f.evaluate(() => {
    S = blankSession(); S.problem.title = 'Two framings';
    const a = F(); a.ctype = 'technical'; a.imp = 9; a.wor = 27; a.stars = [11];
    addFraming(); const b = F(); b.ctype = 'explore';
    S.step = 3; renderSolve();
  });
  await f.waitForTimeout(400);
  await f.click('[data-action="useFraming"]');
  await f.waitForTimeout(400);
  await f.click('[data-action="dropFraming"]');
  await f.waitForTimeout(400);
  ok('removing a framing with work in it asks in the page', await f.locator('.modal').count() === 1);
  await f.click('.modal [data-md="ok"]');
  await f.waitForTimeout(400);
  ok('removing a framing works in the sandbox', await f.evaluate(() => S.framings.length) === 1);

  ok('no JavaScript errors in the sandbox', errs.length === 0);
  if (errs.length) console.log(errs.join('\n'));

  await browser.close();
  server.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
