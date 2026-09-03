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

**Solve a problem** — a five-step guided flow:

1. **Frame** the problem, with prompts for the Ideal Final Result and for
   resources you already hold. As you type, it suggests which of the 39 factors
   your wording seems to touch.
2. **Find the contradiction** — a trade-off (improving A worsens B), a both-ways
   demand (one thing must be X and not-X), or open exploration if you cannot see
   one yet. Sixteen common service trade-offs are offered as one-click starting
   points.
3. **Get principles** — from the contradiction matrix, or from the four
   separation strategies for physical contradictions. Blank matrix cells are
   handled explicitly rather than silently: the tool falls back to the reverse
   pair, and says so.
4. **Develop** the shortlisted principles into concepts, scored on impact,
   effort and risk, with a prompt to name the new problem each one creates.
5. **Summarise** — ordered by impact then ease, exportable as Markdown, a file
   or print/PDF.

**40 Principles** — all forty, searchable in everyday language ("handover",
"rework", "burnout", "bottleneck"), each with its classical wording, service
examples, manufacturing examples and three questions to ask yourself. Plus a
random-spark button for when you have no contradiction to work from.

**Contradiction matrix** — the full 39 × 39 grid, clickable, with each cell
opening the recommended principles in full. Any pair can be handed straight to
the wizard.

**39 Factors** — each classical factor with its engineering meaning and its
service reading side by side.

**Saved work** — sessions are kept in browser storage and can be exported to and
imported from a JSON file.

**How TRIZ works** — a short, honest primer, including the method's limits.

## Repository contents

| Path | Purpose |
| --- | --- |
| `index.html` | The entire application, and the single source of truth. Open it directly. |
| `data/TRIZ_Contradiction_Matrix.xlsx` | Source workbook the matrix was built from. |
| `tests/ui-test.js` | End-to-end checks (Playwright). |
| `build-artifact.py` | Derives `dist/artifact.html` from `index.html` for publishing. Never edit the output. |

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
node tests/ui-test.js
```

The suite covers data integrity (39 factors, 40 principles, 1248 populated
matrix cells, all references in range), each of the three solve paths, empty and
reverse matrix cells, search, saving, export, theme switching and mobile layout.

## Provenance

The 39 factors, the 40 inventive principles and the contradiction matrix are
Genrich Altshuller's classical TRIZ and are in the public domain. The matrix data
was extracted from the workbook in `data/` and verified programmatically: 1248
populated cells, an empty diagonal, and every reference resolving to a principle
between 1 and 40.

The service and back-office readings of the 39 factors, all worked examples, the
prompt questions and the guidance text were written for this tool.
