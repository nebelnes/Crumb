# Change log

## (pending approval) — Richemont poolish breads
- Parisette with poolish, Jagged bread and Provence bread from the Richemont Craft School book, scaled to home size, with reference photos (tap to enlarge).
- Plus 15 sponge-dough breads from the same book (Lucerne, Ciabatta bigia, Mutschli, two baking-powder loaves, El Prestinee, four rye breads, Emmer, Spelt ciabatta, Kamut pyramid, two barley breads). All Richemont recipes are grouped under the category Richemont Breads.
- Plus 8 straight-dough breads with no fermented dough: Comb bread, Wholemeal bread, Crispy bread with yoghurt, Butter twist, Coconut-date bread, Sun bread, Original spelt-wholemeal bread and Amaranth ring. 26 Richemont recipes in total.
- Flours use converted names only: all-purpose, 00 flour, and a 75/25 all-purpose / whole-wheat mix for dusting.

## 2026-10-15 — Borodinsky Premium
- New rye bread on scalded КМКЗ (from your text): scald → scalded КМКЗ → sponge → dough, with two wheat-flour options (2nd grade, or whole + premium). Formula flour 980 g + 20 g in the КМКЗ = 1,000 g; water 668 g. Salt set to 12.5 g (text: 10–15 g).

## 2026-10-15 — Status label hidden
- The Draft / Verified label is hidden on the list and recipe pages (`SHOW_STATUS = false` in app.js). Statuses are kept in the recipe files.

## 2026-10-15 — One КМКЗ recipe with tabs
- "Starting КМКЗ", "КМКЗ refresh" and "Ripe dough on КМКЗ" are now one recipe, **КМКЗ**, with tabs Start · Refresh · Ripe dough. Each tab remembers its own version and amount; the Verified/Draft badge follows the tab.
- Version buttons: two per row on a phone when there are four or more (an odd last one spans the row).

## 2026-10-15 — Starting КМКЗ verified
- Formulas confirmed; status changed from Draft to Verified.

## 2026-10-15 — Starting КМКЗ
- New recipe "Starting КМКЗ" (Разведение КМКЗ) with five methods from your text: malt + grain, malt + flour, fermented malt (with and without white malt), and two-phase malt КМКЗ. All 190 % hydration; ml converted to g (1 ml = 1 g). Draft until checked.

## 2026-10-15 — Version buttons
- Recipe version buttons are now less rounded tiles that fill the width (2, 3 or 2×2 per row), like design option B.

## 2026-10-15 — Spacing
- Rounded cards on the recipe page are now separated (they were touching).

## 2026-10-15 — New look: "Rye field"
- Sage background, light wheat recipe header, rounded white cards, Bricolage Grotesque + Atkinson Hyperlegible fonts, matching dark mode.
- EN | RU toggle in the header; By pieces / By dough weight switch inside the amount card; versions as pills in the recipe header.
- Ingredients in aligned % and gram columns; stage numbers ①②③ and numbered method steps kept.
- Fonts are cached for offline use.

## 2026-10-15 — Dough weight up to 2,500 g
- "By dough weight" sliders now go up to 2,500 g (naan, focaccia, pizza, ripe dough).

## 2026-10-14 — Russian version, sources hidden
- EN / RU switch in the top corner; every recipe has Russian names, ingredients, stages, method and notes (remembered per device).
- Sources and page references are hidden for now (`SHOW_SOURCES = false` in app.js). They are still in the recipe files.

## 2026-10-14 — Pizza dough (Modernist Bread)
- Added Pizza dough with four styles: Neapolitan (vol. 5 p. 113), Modernist Neapolitan (p. 120–121), New York (p. 122–123) and Sicilian (p. 124–125). Draft until checked.
- Topping sections (sauce, cheese, ghee) now scale with the dough but are kept out of the dough weight and hydration.
- Amounts under 1 g show two decimals.

## 2026-10-14 — Focaccia (Modernist Bread)
- Added Focaccia with three versions: Master (vol. 5 p. 87, liquid levain), Direct (p. 92–93, yeast only) and Modernist (p. 94–95, vital wheat gluten + soy lecithin). Draft until checked.

## 2026-10-14 — Naan dough-weight range
- Naan "By dough weight" slider now runs 500–2,000 g. Weight-per-piece and dough-weight sliders can have separate ranges.

## 2026-10-14 — Naan (Modernist Bread)
- Added Naan with two versions: Master (vol. 5 p. 17, with yogurt) and Modernist (p. 22–23, probiotic capsule + pineapple-juice dough relaxer). Draft until checked.
- Totals box now names the "on top" items (e.g. "with ghee").

## 2026-10-14 — Yeast type
- Ripe dough: yeast set to instant dry yeast.

## 2026-10-14 — Wording
- Ripe dough 65 %: "sifted" rye flour is now called "white rye flour".

## 2026-10-14 — Shopping list removed
- Removed the "Copy shopping list" button.

## 2026-10-14 — English interface
- The whole app is now in English. Russian names stay in the data as originals; КМКЗ stays КМКЗ.

## 2026-10-14 — Interactive КМКЗ calculator
- Proportion buttons: КМКЗ refresh 1:9 / 1:5 / 1:2 / malt and спелое тесто 70 % / 65 % are now one recipe each with selectable variants.
- Amount (the green "Задайте желаемое количество" cell) is a draggable slider with an exact-number box.
- Salt and yeast in спелое тесто are added on top of the amount, matching the sheet.

## 2026-10-14 — Crumb 1.0, fresh start
- Replaced the old native Android naan app with a new installable web app (PWA). The old app is still in the Git history.
- Recipe library with search and category filter; recipes live in `recipes/*.json`.
- Dough calculator: by pieces × weight or by total dough weight, loss %, grams per ingredient and stage, fresh and total flour, effective hydration (counts water and flour inside cultures, dairy and eggs), warning if flour ≠ 100 %, copy shopping list.
- Works offline; picks up changes automatically when opened.
- First recipes (draft, from the «Калькулятор КМКЗ» sheet): КМКЗ refreshes 1:9, 1:5, 1:2 and with white malt; спелое тесто on КМКЗ at 70 % and 65 %.
