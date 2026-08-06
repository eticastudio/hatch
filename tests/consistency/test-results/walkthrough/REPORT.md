# Hatch user-walkthrough report

**36/42 PASS · 6 WARN · 0 FAIL**

Loop: 3 themes × 2 modes × 7 routes = 42 page-visits.

Screenshots: `tests/consistency/test-results/walkthrough/` — one per row.

## Verdict per row

| Theme | Mode | Route | HTTP | Header | Footer | Toggle | Images | Console errs | 404s | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| blog | light | `/` | 200 | ✓ | ✓ | ✓ | 7/7 | 0 | 0 | **PASS** | — |
| blog | light | `/about` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |
| blog | light | `/contact` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| blog | light | `/privacy-policy` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| blog | light | `/blog/` | 200 | ✓ | ✓ | ✓ | 11/11 | 0 | 0 | **PASS** | — |
| blog | light | `/blog/core-gutenberg-block-sanity-check/` | 200 | ✓ | ✓ | ✓ | 6/8 | 2 | 0 | **WARN** | 2 console errors; 6/8 images loaded |
| blog | light | `/blog/category/uncategorized/` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |
| blog | dark | `/` | 200 | ✓ | ✓ | ✓ | 7/7 | 0 | 0 | **PASS** | — |
| blog | dark | `/about` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |
| blog | dark | `/contact` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| blog | dark | `/privacy-policy` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| blog | dark | `/blog/` | 200 | ✓ | ✓ | ✓ | 11/11 | 0 | 0 | **PASS** | — |
| blog | dark | `/blog/core-gutenberg-block-sanity-check/` | 200 | ✓ | ✓ | ✓ | 6/8 | 2 | 0 | **WARN** | 2 console errors; 6/8 images loaded |
| blog | dark | `/blog/category/uncategorized/` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |
| tech | light | `/` | 200 | ✓ | ✓ | ✓ | 11/11 | 0 | 0 | **PASS** | — |
| tech | light | `/about` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |
| tech | light | `/contact` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| tech | light | `/privacy-policy` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| tech | light | `/blog/` | 200 | ✓ | ✓ | ✓ | 11/11 | 0 | 0 | **PASS** | — |
| tech | light | `/blog/core-gutenberg-block-sanity-check/` | 200 | ✓ | ✓ | ✓ | 6/8 | 2 | 0 | **WARN** | 2 console errors; 6/8 images loaded |
| tech | light | `/blog/category/uncategorized/` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |
| tech | dark | `/` | 200 | ✓ | ✓ | ✓ | 11/11 | 0 | 0 | **PASS** | — |
| tech | dark | `/about` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |
| tech | dark | `/contact` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| tech | dark | `/privacy-policy` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| tech | dark | `/blog/` | 200 | ✓ | ✓ | ✓ | 11/11 | 0 | 0 | **PASS** | — |
| tech | dark | `/blog/core-gutenberg-block-sanity-check/` | 200 | ✓ | ✓ | ✓ | 6/8 | 2 | 0 | **WARN** | 2 console errors; 6/8 images loaded |
| tech | dark | `/blog/category/uncategorized/` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |
| docs | light | `/` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| docs | light | `/about` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |
| docs | light | `/contact` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| docs | light | `/privacy-policy` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| docs | light | `/blog/` | 200 | ✓ | ✓ | ✓ | 11/11 | 0 | 0 | **PASS** | — |
| docs | light | `/blog/core-gutenberg-block-sanity-check/` | 200 | ✓ | ✓ | ✓ | 6/8 | 2 | 0 | **WARN** | 2 console errors; 6/8 images loaded |
| docs | light | `/blog/category/uncategorized/` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |
| docs | dark | `/` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| docs | dark | `/about` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |
| docs | dark | `/contact` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| docs | dark | `/privacy-policy` | 200 | ✓ | ✓ | ✓ | 0/0 | 0 | 0 | **PASS** | — |
| docs | dark | `/blog/` | 200 | ✓ | ✓ | ✓ | 11/11 | 0 | 0 | **PASS** | — |
| docs | dark | `/blog/core-gutenberg-block-sanity-check/` | 200 | ✓ | ✓ | ✓ | 6/8 | 2 | 0 | **WARN** | 2 console errors; 6/8 images loaded |
| docs | dark | `/blog/category/uncategorized/` | 200 | ✓ | ✓ | ✓ | 3/3 | 0 | 0 | **PASS** | — |

## Per-theme signature check

| Theme | h1 font | Primary color |
|---|---|---|
| blog | `Fraunces, ui-sans-serif, system-ui, -app` | `#c2410c` |
| tech | `"JetBrains Mono", ui-sans-serif, system-` | `#22d3ee` |
| docs | `Geist, ui-sans-serif, system-ui, -apple-` | `#4f46e5` |

## Bottom line

- 0 FAIL rows need code fixes before ship.
- 6 WARN rows are polish items (missing image, orphan console warning, etc.).
- See the notes column for the specific signal per row.