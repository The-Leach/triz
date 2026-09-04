/*
 * Saving files behaves differently when the page is published rather than opened
 * locally: a hosted page is never granted direct downloads, so saving goes through
 * the host's downloads capability. This drives both outcomes against a stubbed
 * host — capability granted, and capability withheld.
 *
 *   node tests/hosted-test.js
 *   CHROME=/path/to/chrome node tests/hosted-test.js
 */
const {chromium} = require('playwright');
const path = require('path');

const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (l, c) => { (c ? pass++ : fail++); console.log((c ? 'PASS  ' : 'FAIL  ') + l); };

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME || undefined, args: ['--no-sandbox']});

  for (const mode of ['granted', 'denied']) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    await p.addInitScript(m => {
      window.__saves = [];
      window.claude = {
        use: name => Promise.resolve(
          (name === 'downloads' && m === 'granted')
            ? {save: req => { window.__saves.push(req); return Promise.resolve({status: 'saved'}); }}
            : null)
      };
    }, mode);

    await p.goto(APP);
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      S.problem.title = 'Hosted save test';
      const f = F();
      f.ctype = 'technical'; f.imp = 25; f.wor = 27; f.stars = [10];
      f.concepts[10] = {text: 'Pre-check documents at intake'};
      S.step = 5; renderSolve();
    });
    await p.waitForTimeout(400);

    const dl = await p.locator('[data-action="downloadMd"]').count();
    ok('[' + mode + '] download button ' + (mode === 'granted' ? 'offered' : 'hidden'),
      mode === 'granted' ? dl === 1 : dl === 0);

    if (mode === 'granted') {
      await p.click('[data-action="downloadMd"]');
      await p.waitForTimeout(400);
      const saves = await p.evaluate(() => window.__saves);
      ok('[granted] save called with an allowlisted .md filename',
        saves.length === 1 && saves[0].filename.endsWith('.md'));
      ok('[granted] save carries the working sheet',
        saves[0].data.includes('Hosted save test') && saves[0].data.includes('Pre-check documents at intake'));
    }

    const note = await p.textContent('#stepBody');
    ok('[' + mode + '] the summary names exactly what is unavailable',
      mode === 'granted' ? /^(?!.*Saving files)/s.test(note) && /Printing is not available/i.test(note)
                         : /Saving files and printing are not available/i.test(note));

    ok('[' + mode + '] copy is always available', await p.locator('[data-action="copyMd"]').count() === 1);
    ok('[' + mode + '] print is not offered on a hosted page, where it is blocked',
      await p.locator('[data-action="printIt"]').count() === 0);
    ok('[' + mode + '] no JavaScript errors', errs.length === 0);
    if (errs.length) console.log(errs.join('\n'));
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
