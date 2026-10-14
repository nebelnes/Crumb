# Change log

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
