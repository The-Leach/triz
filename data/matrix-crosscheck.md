# Contradiction matrix cross-check

The matrix shipped in `index.html` was extracted from `TRIZ_Contradiction_Matrix.xlsx`
and then compared, cell by cell, against an independently published copy of the same
classical matrix (a typeset PDF reconstruction, parsed from its text layer).

## Result

| | |
| --- | --- |
| Cells compared (excluding the diagonal) | 1,482 |
| Identical, including the order within the cell | 1,444 (97.44%) |
| Same principles, different order | 3 |
| Populated here, not parsed from the other copy | 9 |
| Genuine single-value disagreements | 26 |

Two landmark cells that every published matrix agrees on both check out:
row 1 x column 3 = 15, 8, 29, 34, and row 2 x column 4 = 10, 1, 29, 35.

## The one correction applied

Cell **[19, 9]** — improving *Use of energy by moving object* against worsening *Speed* —
read `8, 35, 35` in the workbook. A cell cannot recommend the same principle twice, so this
is a transcription error rather than a debatable reading. The independent copy gives
`8, 15, 35`, which is internally consistent, and that is what the app now uses. It is the
only cell whose value was changed.

## Disagreements left unresolved

In each of these, both copies agree on every principle in the cell except one. That is the
signature of transcription drift through decades of copying, and it is well documented that
published versions of the matrix differ in a small number of cells. Without a third
authoritative source there is no basis for preferring one reading, so **the workbook's
values are kept** and the disagreements are recorded here instead of being quietly picked
between. If a cell below matters to a decision, check it against a source you trust.

| Improving | Worsening | This app (workbook) | Other published copy |
| --- | --- | --- | --- |
| 1. Weight of moving object | 17. Temperature | 6, 29, 4, 38 | 6, 20, 4, 38 |
| 4. Length of stationary object | 16. Duration of action of stationary object | 1, 10, 35 | 1, 40, 35 |
| 9. Speed | 26. Quantity of substance | 10, 19, 29, 38 | 18, 19, 29, 38 |
| 10. Force (Intensity) | 3. Length of moving object | 17, 19, 9, 36 | 17, 19, 6, 36 |
| 10. Force (Intensity) | 17. Temperature | 35, 10, 21 | 35, 10, 24 |
| 11. Stress or pressure | 5. Area of moving object | 10, 15, 36, 28 | 10, 15, 36, 25 |
| 11. Stress or pressure | 6. Area of stationary object | 10, 15, 36, 37 | 10, 15, 35, 37 |
| 13. Stability of the object's composition | 18. Illumination intensity | 32, 3, 27, 16 | 32, 3, 27, 15 |
| 14. Strength | 33. Ease of operation | 32, 40, 25, 2 | 32, 40, 28, 2 |
| 14. Strength | 36. Device complexity | 2, 13, 25, 28 | 2, 13, 28 |
| 16. Duration of action of stationary object | 4. Length of stationary object | 1, 40, 35 | 1, 10, 35 |
| 18. Illumination intensity | 22. Loss of Energy | 13, 16, 1, 6 | 19, 16, 1, 6 |
| 18. Illumination intensity | 35. Adaptability or versatility | 15, 1, 19 | 15, 1, 1, 19 |
| 19. Use of energy by moving object | 9. Speed | 8, 35, 35 | 8, 15, 35 |
| 20. Use of energy by stationary object | 13. Stability of the object's composition | 27, 4, 29, 18 | 27, 4, 29, 19 |
| 22. Loss of Energy | 33. Ease of operation | 35, 32, 1 | 35, 22, 1 |
| 29. Manufacturing precision | 7. Volume of moving object | 32, 23, 2 | 32, 28, 2 |
| 36. Device complexity | 2. Weight of stationary object | 2, 26, 35, 39 | 2, 36, 35, 39 |
| 36. Device complexity | 7. Volume of moving object | 34, 26, 6 | 34, 25, 6 |
| 37. Difficulty of detecting and measuring | 5. Area of moving object | 2, 13, 18, 17 | 2, 13, 15, 17 |
| 37. Difficulty of detecting and measuring | 10. Force (Intensity) | 30, 28, 40, 19 | 36, 28, 40, 19 |
| 37. Difficulty of detecting and measuring | 16. Duration of action of stationary object | 25, 34, 6, 35 | 25, 24, 6, 35 |
| 37. Difficulty of detecting and measuring | 21. Power | 18, 1, 16, 10 | 19, 1, 16, 10 |
| 37. Difficulty of detecting and measuring | 23. Loss of Substance | 1, 18, 10, 24 | 1, 13, 10, 24 |
| 39. Productivity | 31. Object-generated harmful factors | 35, 22, 18, 39 | 32, 22, 18, 39 |
| 39. Productivity | 33. Ease of operation | 1, 28, 7, 10 | 1, 28, 7, 19 |

### Ordering-only differences

Same principles, listed in a different order. Order is conventionally read as
most-frequently-used first, so this affects presentation rather than substance.

| Improving | Worsening | This app | Other copy |
| --- | --- | --- | --- |
| 1. Weight of moving object | 27. Reliability | 1, 3, 11, 27 | 3, 11, 1, 27 |
| 16. Duration of action of stationary object | 39. Productivity | 20, 10, 16, 38 | 10, 20, 16, 38 |
| 24. Loss of  Information | 22. Loss of Energy | 19, 10 | 10, 19 |

### Not parsed from the other copy

These 9 cells are populated here but were not recovered from the other copy. All but two
fall in row 18, where that copy wraps its cell text in a way the parser could not split
reliably, so these are almost certainly a limitation of the comparison rather than a
disagreement between the sources.

| Improving | Worsening | This app |
| --- | --- | --- |
| 14. Strength | 27. Reliability | 11, 3 |
| 18. Illumination intensity | 3. Length of moving object | 19, 32, 16 |
| 18. Illumination intensity | 7. Volume of moving object | 2, 13, 10 |
| 18. Illumination intensity | 9. Speed | 10, 13, 19 |
| 18. Illumination intensity | 10. Force (Intensity) | 26, 19, 6 |
| 18. Illumination intensity | 12. Shape | 32, 30 |
| 18. Illumination intensity | 13. Stability of the object's composition | 32, 3, 27 |
| 18. Illumination intensity | 14. Strength | 35, 19 |
| 27. Reliability | 14. Strength | 11, 28 |

