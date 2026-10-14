# Crumb

Personal bread-baking app: a recipe library plus a dough calculator. Installable web app (PWA), English interface (Russian names kept as originals, КМКЗ stays КМКЗ), works offline and picks up changes automatically when opened.

## Layout

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app |
| `sw.js` | Offline support: network first, cache when offline |
| `manifest.webmanifest`, `icons/` | Install on the home screen |
| `recipes/*.json` | One file per recipe |
| `recipes/index.json` | List of recipe files the app loads |
| `CHANGELOG.md` | What changed and when |

No build step: the repository root is the website.

## Adding a recipe

1. Create `recipes/<id>.json` (see the format below).
2. Add `"<id>.json"` to `recipes/index.json`.
3. Commit. The app shows it the next time it's opened.

## Recipe format

```json
{
  "id": "unique-id",
  "name": { "en": "English name", "orig": "Original name" },
  "category": "Starters",
  "tags": ["rye", "starter"],
  "source": { "type": "book", "title": "Modernist Bread", "volume": 4, "page": 123, "url": "" },
  "status": "verified | draft | placeholder",
  "yield": { "mode": "pieces | total", "pieces": 1, "pieceWeight": 500, "total": 500, "loss": 0 },
  "stages": [
    {
      "name": "Starter", "time": "12 h", "temp": "28 °C", "note": "",
      "ingredients": [
        { "en": "Rye flour", "orig": "Мука ржаная", "pct": 100, "flour": true, "water": 0 }
      ]
    }
  ],
  "method": ["Short steps in our own words"],
  "notes": ""
}
```

Ingredient fields:

- `pct`: baker's % of the **total fresh flour across all stages**. Rows with `"flour": true` must add up to 100.
- `water`: water share (water 1.0, milk 0.87, yogurt 0.85, egg 0.75, butter 0.16, oil/ghee 0).
- `flourIn`: flour share inside a culture brought in from outside the recipe (e.g. КМКЗ at 190 % hydration = 0.3448). Used for effective hydration.
- `converted: true`: amount converted from cups/spoons to grams.
- `note`: optional short remark shown under the ingredient.
- `extra: true`: added on top of the target amount (e.g. salt and yeast in спелое тесто, as in the КМКЗ sheet).

## Variants (selectable proportions)

A recipe can have `"variants": [...]` plus `"variantLabel"`. Each variant has `id`, `label`, optional `sub`, and its own `stages`, `method`, `notes` and `yield`, which override the shared fields. The app shows them as buttons.

`yield.label`, `yield.hint` and `yield.slider` (`min`, `max`, `step`) set up the dough-weight slider; `yield.pieceSlider` sets the weight-per-piece slider (default 50–250 g).

A stage with `"topping": true` (sauce, cheese, ghee…) scales with the dough but isn't counted in the dough weight, flour or hydration.

Russian text: any text field can have a `_ru` twin (`name.ru`, `category_ru`, `tags_ru`, `variantLabel_ru`, variant `label_ru`/`sub_ru`/`method_ru`/`notes_ru`, stage `name_ru`/`note_ru`, ingredient `ru`/`note_ru`, yield `label_ru`/`hint_ru`). Without one, the English text is shown.

Sources and page references are hidden while `SHOW_SOURCES = false` in `app.js`; the data keeps them.

Status `placeholder` shows a red banner: the formula is not from the source yet.
