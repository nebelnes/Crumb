# Change log

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
