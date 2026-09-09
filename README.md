# PMI - TRIZ+

Classical TRIZ, expanded so it works in service and back-office environments as
well as manufacturing. The **+** marks the expansion.

**[index.html](index.html) is the app.** Open it in any browser. There is nothing
to install: no server, no build, no account, no network. It works from a USB
stick, an email attachment or a shared drive, and nothing you type leaves your
browser.

---

## Why it exists

TRIZ's logic is domain-neutral; only its vocabulary is industrial. Altshuller
derived the 39 factors from engineering patents, so they are named things like
*weight of moving object* and *thermal expansion*. That wording is why the method
rarely survives contact with a claims department or a ward — not because the
underlying patterns do not apply.

This keeps the classical names, because that is what keeps the contradiction
matrix valid, and adds a service reading of everything:

- Each of the **39 factors** gains a plain reading for when the "product" is a
  case, a patient or a claim — plus its **polarity**, whether improving it means
  more or less. For the loss and harm factors "improving" means *reducing*, which
  is the easiest way to use the matrix backwards without noticing.
- Each of the **40 principles** gains a second, plainer **name**. *Anti-weight* is
  "Offset the burden"; *Equipotentiality* is "Take out the level changes";
  *Mechanical vibration* is "Little and often". The original is always kept and
  shown first.
- Each principle also explains **why it resolves a contradiction** — the
  mechanism, not a restatement. That is the part that transfers to your problem.
- The service examples are weighted towards **structural** change — flow, queues,
  batch size, routing, thresholds, hand-offs — rather than asking people to try
  harder. The test the guidance offers: *what happens if the people are ordinary
  and busy?*

## What it does

**Solve a problem** — a five-step flow, and the centre of the app. One problem can
carry several **framings** (the same trouble as a trade-off, as a both-ways
demand, as open exploration), each with its own shortlist. Running two or three is
the intended way to use it: they route to different principles and all land in one
working sheet.

1. **Frame** it. As you type, the app checks the statement — a solution in
   disguise ("we need a new system"), language too general to work on, no measure,
   nobody named — and suggests which factors your wording touches. The advice
   names the offending words and never blocks you.
2. **Find the contradiction** — a trade-off, a both-ways demand, or open
   exploration.
3. **Get principles** from the matrix or from the four separation strategies.
   Blank cells are handled openly: it falls back to the reverse pair and says so,
   and when both directions are blank it offers the nearby pairs the matrix *does*
   cover rather than filler.
4. **Develop** the shortlist into concepts scored on impact, effort and risk.
   Writing an idea shortlists that principle automatically.
5. **Summarise** — every framing in one working sheet, to copy, download or print.

**Nine Windows** — the thing, its parts and its surroundings, across before / now
/ next. Problems are stated in the centre box and usually caused elsewhere. What
you write can be turned straight into a starting contradiction.

**Contradiction matrix** — the full 39 × 39 grid, keyboard-operable, every cell
clickable.

**Guidance & reference** — how TRIZ works, the 40 principles, the 39 factors, and
three worked examples (a claims backlog, a discharge delay, an onboarding
drop-off) you can open and edit into your own.

## Where your work lives

In your browser, on that machine, and nowhere else. There is no saved-work
feature by design. The Summary step is where you take it out — copy it, download
it as Markdown, or print it. A bar above the steps offers **Start a new problem**
from any step. If the browser refuses to store anything (a private window, full
storage), the app says so at the top of every view rather than pretending.

---

## Editing the content

The content is the part worth changing, and it is plain JSON — no JavaScript
needed:

| File | Holds |
| --- | --- |
| `content/principles.json` | The 40 principles: both names, the mechanism, examples, prompts |
| `content/factors.json` | The 39 factors: service reading, polarity, search keywords |
| `content/matrix.json` | The 39 × 39 contradiction matrix |
| `content/examples.json` | The three worked examples |
| `content/statement-checks.json` | The advisory checks on the problem statement |
| `content/nine-windows.json`, `separations.json`, `presets.json`, `synonyms.json` | The remaining prompts and lookups |

```bash
python3 build.py --check   # validate only
python3 build.py           # validate, then rebuild index.html
```

Nothing is written unless every check passes, so a malformed edit cannot reach the
app. The validator enforces, among other things: 39 factors and 40 principles
correctly numbered; a distinct service name and a real explanation on every
principle; at least two service examples, two manufacturing examples and two
prompts each; no example reused across two principles; at least one *structural*
service example per principle; every matrix reference resolving to a principle
1–40 with no cell repeating one; and every worked example referencing real factors.

`src/app.html` is the template — markup, styles and logic, with one placeholder
where the content is injected. **`index.html` is generated; do not edit it.**

## Running the checks

```bash
npm install playwright
./tests/run.sh
```

233 checks across four suites: end-to-end behaviour, the published-page save
paths, a sandboxed-iframe suite, and a suite that proves the content validator
actually rejects bad content.

The sandbox suite matters more than its size suggests. A published page runs
inside a sandboxed iframe where `window.confirm` returns `false` without asking,
`window.print()` is ignored outright, and the Clipboard API is blocked. Each of
those failed *silently* while working perfectly from a local file. The app now
asks for confirmation in the page, does not offer printing where it cannot work,
and falls back for copying — and this suite drives all of it under the real
condition.

## Fonts and offline use

The page links IBM Plex from Google Fonts **off the critical path**: requested
with `media="print"` and promoted after the first frame, so a blocked or slow font
host can never hold up rendering. Measured with the host unreachable, a
render-blocking link cost **12.8 seconds of blank screen**; non-blocking, the page
paints in **132 ms** and falls back to the system stack. Corporate networks that
proxy-block Google Fonts are common in exactly the sectors this is for.

It is the only external reference in the file. Everything else is inlined.

## Accessibility

The matrix is fully keyboard-operable — arrow keys between cells, Home and End
along a row, Enter to open — with a roving tabindex, scoped headers and a spoken
label per cell naming both factors and the principles it holds. Step changes move
focus to the new heading. Motion respects `prefers-reduced-motion`.

## Provenance and accuracy

The 39 factors, the 40 principles and the contradiction matrix are Genrich
Altshuller's classical TRIZ and are in the public domain. The service readings,
the second names, the mechanisms, all worked examples and the guidance text were
written for this tool.

The matrix was extracted from `data/TRIZ_Contradiction_Matrix.xlsx`, verified
programmatically, then **cross-checked cell by cell against an independently
published copy**. The two agree on **97.44%** of the 1,482 off-diagonal cells,
including the landmark entries every published matrix shares.

One cell was corrected: `[19, 9]` read `8, 35, 35` in the workbook, which is
impossible. The 26 remaining single-value disagreements are recorded in
[`data/matrix-crosscheck.md`](data/matrix-crosscheck.md) rather than silently
resolved — published copies have drifted apart over decades of transcription, and
without a third authoritative source there is no basis for preferring one reading.

Two things the app is careful not to overstate, and says so in its own primer: the
order of principles within a cell is a convention (most-frequently-used first),
never a strict ranking; and the principles attached to each separation strategy
are a later convention whose membership differs between TRIZ authors, not
Altshuller's own mapping.

## Repository layout

```
index.html                 the app — generated, do not edit
src/app.html               template: markup, styles, logic
content/*.json             the content
build.py                   validates the content, builds index.html
tests/run.sh               runs every check
data/                      matrix source workbook and the cross-check record
```
