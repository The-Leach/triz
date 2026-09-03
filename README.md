# TRIZ Navigator

A single-file web app for working TRIZ problems in **service and back-office
environments as well as manufacturing**.

Open `index.html` in any browser. There is nothing to install, no build step, no
server and no network access — the file works from a USB stick, an email
attachment or a shared drive. Everything you type stays in your own browser.

## Why

TRIZ is domain-neutral in its logic and thoroughly industrial in its vocabulary.
Altshuller derived the 39 factors from engineering patents, so they are named
things like *weight of moving object*, *thermal expansion* and *strong oxidants*.
That wording is why the method rarely survives contact with a claims department,
a ward or a contact centre — not because the underlying patterns do not apply.

This tool keeps the classical names, because that is what keeps the contradiction
matrix valid, and adds a plain reading of each one for work where the "product"
is a case, a customer or a decision. Every one of the 40 principles carries
worked examples from both worlds, and a domain switch in the header controls
which set you see.

## What it does

**Solve a problem** — a five-step guided flow, and the centre of the app. One
problem can carry **several framings** — the same trouble written as a trade-off,
as a both-ways demand, and as open exploration — each with its own shortlist and
concepts. Running two or three is the intended way to use it: they route to
different principles, and they all land in one working sheet at the end. The
summary nudges you towards a second pass while you have only made one.

The five steps:

1. **Frame** the problem, with prompts for the Ideal Final Result and for
   resources you already hold. As you type, it suggests which of the 39 factors
   your wording seems to touch.
2. **Find the contradiction** — a trade-off (improving A worsens B), a both-ways
   demand (one thing must be X and not-X), or open exploration if you cannot see
   one yet. Sixteen common service trade-offs are offered as one-click starting
   points.
3. **Get principles** — from the contradiction matrix, or from the four
   separation strategies for physical contradictions. Blank cells are handled
   explicitly: the tool falls back to the reverse pair and says so, and when both
   directions are blank it stops guessing and offers the *nearby pairs the matrix
   does cover*, plus a route into a physical contradiction instead. A dead end
   becomes a reframing prompt rather than ten filler principles.
4. **Develop** the shortlisted principles into concepts, scored on impact,
   effort and risk, with a prompt to name the new problem each one creates.
5. **Summarise** — ordered by impact then ease, exportable as Markdown, a file
   or print/PDF.

**Nine Windows** — the system operator: the thing, its parts and its surroundings,
across before / now / next. Problems are stated in the centre box and usually
caused somewhere else; this is the quickest way to find out where. What you write
feeds the exported working sheet, and can be turned straight into a starting
contradiction — it suggests the factors your notes point at, flags when the cause
appears to sit outside the process or in the past, and seeds the problem line from
the centre window.

Three **worked examples** — an insurance claims backlog, a hospital discharge
delay, an onboarding drop-off — are offered on the empty first step and under
Guidance, because reading a solved problem beats being taught the vocabulary.

The **40 principles** are searchable in everyday language ("handover", "rework",
"burnout", "bottleneck"), each with its classical wording, service examples,
manufacturing examples and three questions to ask yourself, plus a random-spark
button for when you have no contradiction to work from. The **39 factors** each
carry their engineering meaning, their service reading, and their polarity —
whether improving means more or less, stated in plain words. Both live under
Guidance & reference.

**Contradiction matrix** — the full 39 × 39 grid, clickable, with each cell
opening the recommended principles in full. Any pair can be handed straight to
the wizard.

**Guidance & reference** — everything that is there to be read rather than worked
through, in four sections: **How TRIZ works** (a short, honest primer including
the method's limits), **The 40 principles**, **The 39 factors**, and **Worked
examples**. The two catalogues are reference material — you do not work through
them, because Solve a problem brings you the handful that fit your contradiction.

There is no saved-work feature. The working sheet is kept in this browser as you
go, and the summary is the single place you take it away from: copy it, download
it as Markdown, or print it. A bar above the steps shows what you are working on
and offers **Start a new problem** from any step, so a reset is never more than
one click away.

## Repository contents

| Path | Purpose |
| --- | --- |
| `index.html` | The built application — open it directly. **Generated; do not edit.** |
| `content/*.json` | The content: factor readings, principle examples, matrix, prompts, worked examples. **Edit here.** |
| `src/app.html` | The template: markup, styles and logic, with one content placeholder. |
| `build.py` | Validates the content, then builds `index.html` and `dist/artifact.html`. |
| `data/TRIZ_Contradiction_Matrix.xlsx` | Source workbook the matrix was built from. |
| `data/matrix-crosscheck.md` | Cell-by-cell comparison against an independent published copy. |
| `tests/ui-test.js` | End-to-end checks (Playwright). |
| `tests/hosted-test.js` | Checks the published-page save paths against a stubbed host. |
| `tests/content-test.py` | Proves the content validator rejects malformed content. |
| `tests/sandbox-test.js` | Runs the page inside a sandboxed iframe, as the published version does. |

## Editing the content

The content is the part worth changing — the service reading of each factor, the
worked examples, the Nine Windows prompts, the search synonyms. It lives in
`content/*.json` as plain data, so it can be edited without touching JavaScript.

```bash
python3 build.py --check    # validate the content, write nothing
python3 build.py            # validate, then rebuild index.html and dist/artifact.html
```

Nothing is written unless every check passes, so a malformed edit cannot reach a
published page. The validator enforces, among other things: 39 factors and 40
principles correctly numbered; every principle carrying at least two service
examples, two manufacturing examples and two prompt questions; no example reused
across two principles; every matrix reference resolving to a principle 1-40 with
no cell repeating one; an empty diagonal; the landmark and corrected matrix cells
unchanged; every quick-start preset landing on a populated cell; and every worked
example referencing real factors and recording something for each principle it
shortlists.

## Fonts and offline use

The page links IBM Plex from Google Fonts as a progressive enhancement. With no
network it falls back to the system stack and everything else works unchanged —
the app has no other external dependency.

## Saving files

Opened as a local file, the export buttons download directly. Published as a
hosted page, a page is not allowed to download on its own, so saving goes
through the host's downloads capability; where that is unavailable the buttons
are hidden rather than left dead, and the working sheet can still be copied or
printed.

## Running the tests

```bash
npm install playwright
node tests/ui-test.js       # 159 end-to-end checks
node tests/hosted-test.js   # 10 published-page save checks
node tests/sandbox-test.js  # 12 checks inside a sandboxed iframe
python3 tests/content-test.py   # 15 checks that bad content is rejected
```

`sandbox-test.js` matters more than its size suggests. The published page runs
inside a sandboxed iframe where `window.confirm` is suppressed and returns
`false` without asking, so anything guarded by a native confirm becomes a silent
no-op there while working perfectly from a local file. The app asks for
confirmation in the page instead, and this suite drives every destructive action
under the real condition.

The suite covers data integrity (39 factors with polarity, 40 principles, 1248
populated matrix cells, all references in range), each of the three solve paths,
multiple framings and their isolation, migration of older stored sessions,
dead-end reframing, Nine Windows, keyboard navigation and labelling of the
matrix, focus management, search, saving, export, theme switching and mobile
layout.

## If the browser will not save

Storage can refuse the app — a private window, blocked site data, a full quota.
Rather than silently dropping the work, the page says so at the top of every
view and offers to download or copy it before anything is lost.

## Accessibility

The matrix is fully keyboard-operable — arrow keys move between cells, Home and
End jump along a row, Enter opens one — with a roving tabindex, scoped row and
column headers, and a spoken label per cell naming both factors and the
principles it holds. Step changes move focus to the new heading. Motion respects
`prefers-reduced-motion`.

## Provenance and accuracy

The 39 factors, the 40 inventive principles and the contradiction matrix are
Genrich Altshuller's classical TRIZ and are in the public domain. The service and
back-office readings of the 39 factors, all worked examples, the prompt questions
and the guidance text were written for this tool.

The matrix was extracted from the workbook in `data/` and verified
programmatically — 1248 populated cells, an empty diagonal, every reference
resolving to a principle between 1 and 40, and no cell recommending the same
principle twice — then **cross-checked cell by cell against an independently
published copy**. The two agree on 97.44% of the 1,482 off-diagonal cells,
including the landmark entries every published matrix shares.

One cell was corrected: `[19, 9]` read `8, 35, 35` in the workbook, which is
impossible, and now carries the independent copy's `8, 15, 35`. The 26 remaining
single-value disagreements are recorded in `data/matrix-crosscheck.md` rather than
silently resolved — published copies of the matrix have drifted apart over decades
of transcription, and without a third authoritative source there is no basis for
preferring one reading. The landmark cells, the absence of duplicates, and the
corrected value are all asserted in the test suite.

Two things the app is careful not to overstate, and says so in its own primer:
the ordering of principles within a cell is a convention (most-frequently-used
first), never a strict ranking; and the principles attached to each separation
strategy are a later convention whose exact membership differs between TRIZ
authors, not Altshuller's own mapping.
