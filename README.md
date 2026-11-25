# Cooking Base — Developer Guide & Documentation

*A solo-built project — this doc serves as both working documentation for
myself (commands, gotchas, decisions, what's still open) and an
overview for anyone else looking at the repo.*

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install](#2-install)
3. [Running the dev server](#3-running-the-dev-server)
4. [What's here — project structure](#4-whats-here--project-structure)
5. [Data model & migrations](#5-data-model--migrations)
6. [The import system](#6-the-import-system)
7. [Servings & units](#7-servings--units)
8. [Search, favorites, tags & recents](#8-search-favorites-tags--recents)
9. [Backup & restore](#9-backup--restore)
10. [Theme](#10-theme)
11. [Known setup gotchas](#11-known-setup-gotchas)
12. [TestFlight / Release readiness](#12-testflight--release-readiness)
13. [Roadmap (genuinely open, not yet built)](#13-roadmap-genuinely-open-not-yet-built)

Cooking Base is a personal cookbook app for iOS (Android builds are
configured but untested), part of the "Base" family alongside League Base,
Media Base, and Home Base. Recipes live in categories behind a drawer menu;
you can write them yourself or import them from a web link, a Google Doc,
pasted text, or a whole cookbook document at once. Everything is stored on
the device — no account, no backend, no ads, no tracking.

Built with React Native + Expo (SDK 58) and Expo Router, developed on
Windows.

**What's actually in here, for anyone skimming this for the first time:**
- Categories in a drawer (Breakfast, Dessert, Entrée, Vegetables,
  Marinade/Sauce are seeded; cookbook import creates any others it finds)
- Add / edit / delete recipes: title, category, servings, ingredients,
  instructions, notes, source link, tags
- Four ways to bring recipes in: a recipe web link, a Google Doc link,
  pasted text, or a **whole cookbook** (hundreds of recipes in one doc) —
  see [The import system](#6-the-import-system)
- A servings stepper on every recipe that rescales ingredients live, plus
  "Save scaled copy" to keep one as a TEMP recipe — see
  [Servings & units](#7-servings--units)
- Metric / Standard units as a display-only setting, including
  grams for dry ingredients and °F ↔ °C inside the instructions
- A Home screen with search (title, ingredients, notes, category, tags),
  Favorites and tag filter chips, Recently viewed, Recently added, and
  category tiles — see [Search, favorites, tags & recents](#8-search-favorites-tags--recents)
- JSON backup and restore through the native share sheet — see
  [Backup & restore](#9-backup--restore)
- Light and dark themes, plus Data, FAQ, and About screens

**Where this stands right now:** the core cookbook is built and has been
tested on a real device (including importing a ~94-recipe cookbook doc).
Category management (add, rename, delete, drag-to-reorder) is built but
its drag-and-drop has not yet been tried on a device. Cook mode is built
(also untested on a device). Still open: share as text, print/PDF, share-to-app from the browser, and the TestFlight
logistics — see
[Section 13](#13-roadmap-genuinely-open-not-yet-built). Current
version is whatever `version.json` says.

---

## 1. Prerequisites

- **Node.js 20 LTS or newer.** Check with `node -v`; Expo lists the exact
  minimum for each SDK in its docs, and it's worth re-checking when the SDK
  changes.
- [VS Code](https://code.visualstudio.com) (or any editor)
- **Expo Go** on your phone, or a development build, for live preview. Every
  native module used so far (SQLite, file system, sharing, document picker)
  works in Expo Go. Share-to-app from the browser, when it's built, will
  need a development build — see [Gotcha #8](#gotcha-8-share-to-app-needs-a-development-build).
- An **Apple Developer account** ($99/year) once you're past local testing
  and moving toward TestFlight — see [Section 12](#12-testflight--release-readiness).

---

## 2. Install

```powershell
cd Cooking-Base
npm install
```

New native packages always go in the Expo-aware way (matters — see
[Gotcha #2](#gotcha-2-use-npx-expo-install-not-npm-install-for-new-packages)):

```powershell
npx expo install <package-name>
```

### What's actually installed, and why

| Package | What it's for |
|---|---|
| `expo`, `react`, `react-native` | Core framework (SDK 58, RN 0.88, React 19) |
| `expo-router` | File-based navigation; routes live in `src/app/`. The Drawer comes from `expo-router/drawer` |
| `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets` | Drawer peer dependencies (swipe-to-open, animation) |
| `react-native-screens`, `react-native-safe-area-context` | Required by the navigation stack |
| `expo-sqlite` | The whole recipe database — recipes, ingredients, tags, settings |
| `expo-file-system` | Writes the backup file (new `File` / `Paths` API) and reads a picked backup |
| `expo-sharing` | Opens the native share sheet for the backup file |
| `expo-document-picker` | Lets you choose a backup file to restore |
| `expo-keep-awake` | Keeps the screen on in cook mode |
| `expo-constants` | Reads the app version / variant for the About screen |
| `expo-linking`, `expo-status-bar`, `expo-system-ui` | Router and shell plumbing |
| `react-dom` (pinned `19.3.0`) | Only here to satisfy a peer dependency — see [Gotcha #3](#gotcha-3-eresolve-with-react-dom) |

The importers use RN's built-in `fetch` directly — no HTTP client dependency.

---

## 3. Running the dev server

```powershell
npx expo start
```

Scan the QR code with Expo Go (same Wi-Fi as your computer). If routes or
files look stale after moving things around, restart with a cleared cache:

```powershell
npx expo start -c
```

Useful scripts:

| Script | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run doctor` | `expo-doctor` — dependency and config diagnostics |
| `npm run bump` | Bump the patch version (see [Versioning](#versioning-and-build-commands)) |
| `npm run build:uat:ios` / `:android` | Bump + EAS build for the UAT (TestFlight) app |
| `npm run build:store:ios` / `:android` | Bump + EAS build for the real store app |

---

## 4. What's here — project structure

```
src/
  app/                              Routes (Expo Router) — every file is a screen
    _layout.tsx                     Providers (SQLite, theme) + the root Stack,
                                     which sits on top of the drawer so recipe
                                     screens get a back button
    (drawer)/                       Route group — the folder name, parentheses
                                     included, is required (see Gotcha #1)
      _layout.tsx                   The Drawer + its screens
      index.tsx                     Home: search, chips, recents, category tiles
      category/[id].tsx             Recipes in one category
      categories.tsx                Manage categories: add, rename, delete, drag to reorder
      settings.tsx                  Theme + Units (+ link to Manage categories)
      data.tsx                      Stats, export/restore backup, delete TEMP/all
      faq.tsx                       Expandable questions
      about.tsx                     What the app is, version/build, data note
    recipe/
      add.tsx                       Chooser: write it / link / Google Doc /
                                     paste / whole cookbook
      import.tsx                    Single-recipe import (web | google | text)
      cookbook.tsx                  Whole-cookbook import: paste, then review
                                     and select what to import
      edit.tsx                      Add / edit form (incl. tags)
      cook/[id].tsx                 Cook mode: big text, step-by-step, ingredient checklist
      [id].tsx                      Recipe view: favorite, tags, servings
                                     stepper, unit conversion, scaled copies

  components/
    AppDrawerContent.tsx            Drawer: Home, live category list, utility rows
    AppButton.tsx                   primary / secondary / danger, loading state
    ThemedInput.tsx                 Themed TextInput
    AddFab.tsx                      Floating "+" (optionally pre-selects a category)
    RecipeRow.tsx                   Recipe card used by Home lists and search
    PlaceholderScreen.tsx           Simple centered title (kept for new stubs)

  db/
    schema.ts                       Table definitions + PRAGMA user_version
                                     migrations (migrateDb)
    categories.ts                   List / counts / add / rename / reorder /
                                     delete (move or delete recipes)
    recipes.ts                      CRUD, search, recent lists, favorites
    tags.ts                         Tag parsing, per-recipe tags, in-use list
    recent.ts                       "Recently viewed" history (stored in settings)
    settings.ts                     Key/value settings + units getter/setter

  services/
    parseIngredient.ts              "1 1/2 cups flour" -> {quantity, unit, name}
    scale.ts                        Ratio, fractions, per-line display, saved copies
    units.ts                        Metric <-> Standard, grams-per-cup table,
                                     temperature conversion
    cookbookImport.ts               Plan (category matching, duplicates) + run
    backup.ts                       Build / validate / restore backups, data stats
    backupFiles.ts                  The thin file + share-sheet + picker layer
    importers/
      fromUrl.ts                    Web page -> schema.org Recipe JSON-LD
      fromGoogleDoc.ts              Link -> plain-text export
      fromText.ts                   Headings / quantity-based text parsing
      fromCookbook.ts               Splits a whole cookbook into recipes

  state/importDraft.ts              Hands an import to the edit form (in memory)
  theme/                            colors.ts palettes, ThemeProvider (persisted)
  types/recipe.ts                   Shared types

scripts/bump-version.js             Version bumper
app.config.js                       Dynamic Expo config (variants + version)
eas.json                            Build profiles: development / uat / store
version.json                        The user-facing app version
PRIVACY.md                          Privacy policy (also linked from the store listing)
```

### Where to make common changes

- **Change what Home or Settings shows** → the matching file in `src/app/(drawer)/`
- **Add a screen** → a new file in `src/app/`; register it in the relevant
  `_layout.tsx` (drawer screens in `(drawer)/_layout.tsx`, recipe-level
  screens in the root `_layout.tsx`)
- **Change how a recipe imports** → `src/services/importers/` — start with
  `fromText.ts`, since the Google Doc, paste, and cookbook importers all
  build on it
- **Add a unit or ingredient to the grams conversion** → `GRAMS_PER_CUP` in
  `src/services/units.ts`
- **Change a table or column** → `src/db/schema.ts` (see [Section 5](#5-data-model--migrations))
- **Change colors** → `src/theme/colors.ts`

---

## 5. Data model & migrations

Stored locally in SQLite (`cooking-base.db`):

```
categories(id, name UNIQUE, sortOrder, isDefault)
recipes(id, categoryId, title, servings, instructions, notes, sourceUrl,
        isFavorite, isTemp, parentId, createdAt, updatedAt)
ingredients(id, recipeId, position, quantity, unit, name, rawText)
tags(id, name UNIQUE)
recipe_tags(recipeId, tagId)
settings(key, value)        // theme, units, recentlyViewed
```

A few decisions worth knowing:

- **`instructions` is a JSON array of steps** in a single column; ingredients
  are real rows.
- **Ingredients are structured** (`quantity`, `unit`, `name`) *and* keep the
  user's original line in `rawText`. Scaling and unit conversion read the
  structure; anything the parser can't confidently read keeps
  `quantity = null` and is shown exactly as written.
- **Deleting a recipe cascades** to its ingredients and tag links
  (`ON DELETE CASCADE`); a TEMP copy's `parentId` is set to null if its
  original is deleted.
- **`PRAGMA foreign_keys = ON` runs on every launch** — foreign keys are a
  per-connection setting in SQLite, not stored in the file.

**Adding a migration:** bump `DATABASE_VERSION` in `schema.ts` and add an
`if (version === N)` block in `migrateDb` that runs the change and sets
`version = N + 1`. `PRAGMA user_version` is written at the end. The first
launch (`user_version = 0`) creates the schema and seeds the five default
categories inside one transaction.

---

## 6. The import system

Every importer returns an `ImportedRecipe` — raw ingredient and step *lines* —
rather than saving anything. The result is handed to the edit form through an
in-memory draft (`state/importDraft.ts`, deliberately not route params,
because recipes can be long) so you always review and fix a recipe before it
exists. Saving parses each ingredient line with `parseIngredient`.

**Web link** (`fromUrl.ts`): fetches the page and reads the
`schema.org/Recipe` JSON-LD block that most recipe sites publish, handling
the `@graph` and list shapes, HTML entities, and instruction lists
(including grouped `HowToSection` steps). If a site doesn't expose that data the error points to
**Paste text**, which is the fallback for everything.

**Google Doc link** (`fromGoogleDoc.ts`): extracts the doc ID and downloads
`/export?format=txt`. This **only works for docs shared as "Anyone with the
link"** — a private doc returns a sign-in page instead of text, which the
code detects by checking the response's content type and explains in the
error message.

**Pasted text** (`fromText.ts`): if the text has "Ingredients" /
"Instructions" (or Directions / Method / Steps) headings, lines are sorted by
heading; otherwise the first line is the title and quantity-led lines are
treated as ingredients. List numbering and bullets are stripped. One real
gotcha handled here: nested lists flatten when a Google Doc is exported to
text, so a group title like "For the sauce" arrives as a numbered item whose
*next* item restarts at 1 — that pattern is detected and rendered as a
heading line (`For the sauce:`). The numbering regex requires whitespace after
the punctuation so `1.5 cups` isn't mistaken for a list number.

### Whole-cookbook import

`fromCookbook.ts` + `cookbookImport.ts` turn one big document into many
recipes. Built and verified against a real 94-recipe cookbook, not a guess:

1. **Chunking.** Google Docs exports page breaks as a row of underscores, so
   the text is split on lines of 5+ `_`, `-`, or `=`.
2. **Sections.** A chunk with no Ingredients/Instructions heading is a
   section title ("Soups", "Entrees") — its first line becomes the current
   section, and any other lines (stray to-do notes) are reported as skipped.
3. **Recipes.** Each recipe's title is found as the nearest non-empty line
   above its "Ingredients" heading, so a **missing page break between two
   recipes doesn't merge them** — one chunk can yield several recipes.
4. **Known doc quirk.** If a recipe has two "Instructions" headings and no
   "Ingredients" heading, the first is treated as the ingredient list and the
   recipe gets a ⚠ warning in the review list.
5. **Category matching.** Section names are compared by a normalized key
   (accents stripped, lowercased, letters only, trailing "s" removed, plus an
   alias for the common misspelling "desert"), and each existing category is
   also matched by its parts split on `/`, `&`, `,`, and "and". So "Entrees"
   → Entrée, "Marinades" → Marinade/Sauce, "Deserts" → Dessert. Unmatched
   sections (Soups, Snacks and Sides) create **new categories** on import.
6. **Review before saving.** The review screen lists every recipe by section
   with checkboxes, Select all/none, warnings, and "Import N recipes".
7. **Duplicates** (same category + case-insensitive title) are detected up
   front and disabled, so importing the same document twice adds nothing.

---

## 7. Servings & units

**The scaler is temporary by design.** The stepper on the recipe screen
recalculates from the *saved* servings every time (`scaleRatio(base, target)`),
so repeated taps never drift. Nothing is written unless you tap **Save scaled
copy**, which creates a new recipe titled `Title (TEMP)` with `isTemp = 1`,
the scaled amounts written into each line, and `parentId` pointing at the
original. TEMP copies are left out of Recently added and category counts,
don't inherit tags or favorites, and can all be removed at once from the Data
screen.

**Display rules** (`scale.ts`): amounts are rounded to practical kitchen
fractions (⅛, ¼, ⅓, ½, ⅔, ¾...), so 3 eggs at 1.5× shows as 4½. A line that
needs no change is shown exactly as the user wrote it; unparseable lines and
ranges like "1-2 cups" are never scaled.

**Unit conversion is display-only** — the database is never changed
(`units.ts`):

- Volume converts to volume (tsp/tbsp/fl oz/cup/pt/qt/gal ↔ ml/L) and weight
  to weight (oz/lb ↔ g/kg). Count units (eggs, cloves) and pinch/dash are
  left alone.
- **The exception, in Metric mode only:** tsp/tbsp/cup of a *recognized* dry
  or solid ingredient converts to **grams** using the `GRAMS_PER_CUP` table
  (flour, sugars, butter, nut butters, cocoa, chocolate chips, oats, baking
  soda/powder, salt, cheese, nuts, honey, rice, and more). A cup of flour and
  a cup of sugar weigh different amounts, so this is matched on the
  ingredient *name*. Liquids and anything unrecognized stay in ml. The table
  is approximate — extend it as gaps show up.
- Metric amounts are rounded to what you'd actually measure (nearest 5 above
  100, whole numbers above 10, halves below).
- Temperatures inside instruction text are converted too: `350°F` → `175°C`
  (nearest 5) and `180°C` → `350°F` (nearest 25), including "400 degrees F".

---

## 8. Search, favorites, tags & recents

- **Search** (`searchRecipes` in `db/recipes.ts`): every word you type must
  match somewhere in the title, ingredients, notes, category name, or tags.
  Title matches sort first. `%` and `_` are escaped so they're searched
  literally.
- **Filter chips**: ♥ Favorites plus every tag in use. Chips combine with
  search; selecting more than one tag narrows the results (AND), and tag
  matching ignores case.
- **Tags** are free text typed into the edit form (comma-separated), with
  existing tags offered as tap-to-add chips. Tags no recipe uses any more are
  cleaned up automatically, and a new tag reuses an existing tag's spelling
  regardless of case.
- **Recently added** and **Recently viewed** show 3 each on Home. Viewed
  history lives in the `settings` table (last 10 ids) and skips TEMP copies
  and deleted recipes.

### Cook mode

**Start cooking** on the recipe view opens `recipe/cook/[id].tsx`, passing the
current (possibly scaled) servings, so cook mode shows the same amounts and
follows the Metric / Standard setting. `useKeepAwake()` keeps the screen on
only while that screen is open. Two tabs: **Steps** (one step at a time, large
text, Back / Next, "Start over" on the last step) and **Ingredients** (tap to
check off; checks are not saved). **A− / A+** in the header picks one of five
text sizes, remembered in settings key `cookTextSize`. Nothing in the database
changes, and no migration was needed.

---

## 9. Backup & restore

Everything lives only on the phone, so the Data screen can export it all.

- **Export:** `buildBackup` reads categories, recipes with nested ingredients
  and tags, writes JSON to the cache directory with the new `expo-file-system`
  `File` API, and opens the native share sheet (Save to Files, AirDrop,
  email...).
- **Restore:** pick a file, `parseBackup` validates it (right app, supported
  `formatVersion`, no duplicate ids, every recipe points at a real category),
  the user confirms, then `restoreBackup` **replaces everything in a single
  transaction**. Ids are remapped on the way in (and `parentId` links fixed in
  a second pass), so a bad file changes nothing.
- Because ids change on restore, **Recently viewed history is cleared** by
  restore and by "Delete all recipes".

Format (`formatVersion: 1`):

```
{ app: "cooking-base", formatVersion, exportedAt,
  categories: [{ id, name, sortOrder, isDefault }],
  recipes: [{ id, categoryId, title, servings, ingredients: [...],
              instructions: [...], notes, sourceUrl, isFavorite, isTemp,
              parentId, tags: [...], createdAt, updatedAt }] }
```

A backup made by a *newer* app version is refused with a clear message
rather than half-loaded.

---

## 10. Theme

Light and dark palettes live in `src/theme/colors.ts` (warm cream/orange for
light, dark brown for dark, each with a `danger` color). `ThemeProvider`
loads the saved choice from the settings table on launch, defaults to Light,
and every screen reads colors from `useTheme()`. Unlike League Base there is
no per-item theming, so there's no contrast-derivation system here — the two
palettes are fixed and were checked by eye in both modes.

---

## 11. Known setup gotchas

### Gotcha #1: The `(drawer)` folder name matters, and stale template files bite

Expo Router treats a folder wrapped in parentheses as a **route group**
(invisible in the URL). The drawer's screens must live in `src/app/(drawer)/`
*with the parentheses* — a plain `drawer/` folder produces:

```
WARN  [Layout children]: No route named "(drawer)" exists in nested children
```

Same for `category/[id].tsx` and `recipe/[id].tsx`: the square brackets are
the dynamic-route syntax, not decoration. If a freshly scaffolded project
still has the template's `App.tsx`, `index.ts`, `app.json`, or an old
`src/app/index.tsx`, delete them — `package.json`'s `main` must be
`expo-router/entry`. After moving route files, restart with `npx expo start -c`.

### Gotcha #2: Use `npx expo install`, not `npm install`, for new packages

`npx expo install <package>` resolves the version compatible with the
installed SDK; plain `npm install` grabs whatever is newest and can silently
mismatch native modules. This project also keeps an `AGENTS.md` reminding
tools that **Expo APIs change between SDKs** — check the versioned docs for
the installed SDK before writing code against them.

### Gotcha #3: ERESOLVE with `react-dom`

`npm install expo-sqlite` once failed with an ERESOLVE because the newest
`react-dom` wanted a newer React than the one pinned. The fix is already in
`package.json`: `react-dom` is pinned to exactly `19.3.0` to match `react`. If
it reappears after an SDK upgrade, re-pin the two together.

### Gotcha #4: `expo-file-system` has a new API in SDK 58

Use `import { File, Paths } from 'expo-file-system'` (`new File(Paths.cache,
'name.json')`, `.create()`, `.write()`, `.text()`). The old
`readAsStringAsync` / `writeAsStringAsync` functions live at
`expo-file-system/legacy`, and importing them from the root throws at
runtime.

### Gotcha #5: SQLite details that are easy to forget

- Foreign keys are per-connection — `migrateDb` sets `PRAGMA foreign_keys = ON`
  on every launch.
- `INTEGER PRIMARY KEY` ids can be **reused** after the highest row is
  deleted. That's why deleting a recipe also removes it from Recently viewed,
  rather than trusting stale ids.
- Multi-step writes (create recipe + ingredients, restore, tag changes) use
  `withExclusiveTransactionAsync` so a failure leaves nothing half-written.

### Gotcha #6: Google Docs must be link-shared

The importer can't sign in to Google. A doc must be shared as **"Anyone with
the link"** (Viewer) for the link to import. A private doc is detected and
the error says exactly what to change; copying the text and using Paste text
always works.

### Gotcha #7: Parsing is heuristic — `rawText` is the safety net

Recipe text in the wild is messy (nested lists, missing page breaks, mislabeled
headings). The parsers handle the patterns found in real data and the review
screens exist because they'll miss some. Anything unparseable falls back to
the original line, which scaling and conversion deliberately leave alone.

### Gotcha #8: Share-to-app needs a development build

Receiving a link or text from Safari/Chrome's share sheet (planned, via
`expo-share-intent`) needs custom native code, so it can't be tested in Expo
Go. Plan for an EAS development build (`eas build --profile development`)
when that feature starts.

### Gotcha #9: Copying route files — keep the exact names

When files are moved in by hand, names containing `(`, `)`, `[`, `]` are
easy to mangle (some download/transfer paths drop or rename them). If a
screen mysteriously doesn't exist, check the folder and file names
character-by-character before debugging code.

### Gotcha #10: Category reordering needs `react-native-reorderable-list`

Install it with `npx expo install react-native-reorderable-list` (it relies on
`react-native-reanimated` and `react-native-gesture-handler`, already present).
Dragging works on the **Manage categories** screen, not inside the drawer
itself: the drawer already owns horizontal swipes, so a drag list inside it
would fight the open/close gesture. Press and hold a row, then drag. Changes
show up in the drawer immediately (via `src/state/categoryEvents.ts`).

**Category rules (`src/db/categories.ts`):** names are 1–40 characters and
unique ignoring case; you can't delete your last category; deleting a
category with recipes either moves them (TEMP copies included) to another
category or deletes them with a second confirmation; remaining categories are
renumbered; deleted recipes are dropped from Recently viewed.

---

## 12. TestFlight / Release readiness

Current status, as of this writing:

- **Two App Store Connect apps, one codebase** — `app.config.js` branches on
  the `APP_VARIANT` env var, set per profile in `eas.json`:
  - Default / UAT (`--profile uat`): name "Cooking Base (UAT)", bundle id
    `com.JHarvey.CookingBase`. All regular TestFlight builds go here.
  - `--profile store`: name "My Cooking Base", bundle id
    `com.JHarvey.CookingBaseStore`. Only for a real App Store submission.
  - Bundle identifiers are permanent once Apple registers them.
- **Config is ready; the first build hasn't been run.** Remaining one-time
  steps: `eas init` (links the project and adds its id), then
  `npm run build:uat:ios`.
- **App icon:** the open-cookbook illustration (made in Canva). Everything in
  `assets/` is generated from one 1264 px source: `icon.png` is a 1024 px
  opaque square (iOS rounds the corners itself); the Android adaptive icon
  has a solid `#EEE3CD` background layer, the artwork scaled to ~70% and
  centered as the foreground (so launcher masks don't clip it), and a
  one-color monochrome layer for themed icons. `favicon.png` is 48 px.
  `splash-icon.png` is updated too, but no splash screen is configured yet.
- **iPad:** `ios.supportsTablet` is `false`, so no separate iPad screenshot
  set is needed (unlike League Base).
- **App Store Connect metadata** (description, keywords, review notes,
  privacy answers) lives in [`Cooking-Base-Store-Info.md`](Cooking-Base-Store-Info.md).
- **Privacy:** [PRIVACY.md](PRIVACY.md) is the policy URL for the store
  listing — it has to be pushed to the repo so the link resolves publicly.
  The app collects no user data at all; the only network requests are the
  imports you start yourself.

### Versioning and build commands

`eas.json` uses `appVersionSource: "remote"` with `autoIncrement` on the
`uat` and `store` profiles, so **EAS increments the build number itself**.
EAS can't auto-increment the user-facing `version` under remote versioning,
so that lives in `version.json` and is bumped by `scripts/bump-version.js`;
`app.config.js` reads it. The version only ever goes up across UAT and Store
builds (each App Store version must be higher than the last).

```
npm run build:uat:ios            # bump patch + UAT build (or :android)
npm run build:store:ios          # bump patch + Store build (or :android)
npm run bump                     # patch bump only (1.0.0 -> 1.0.1)
npm run bump -- minor            # 1.0.1 -> 1.1.0   (or: -- major)
npm run bump -- 2.0.0            # set an exact version
```

Building iOS and Android separately bumps twice; bump first and use plain
`eas build` if you want one shared version. Commit `version.json` after a
bump. The About screen shows the live version and whether it's a UAT or
Release build.

---

## 13. Roadmap (genuinely open, not yet built)

**Planned for v1**
- **Verify cook mode on a device** — built (see the Cook mode note at the end of Section 8); confirm the
  screen really stays awake and the text sizes feel right in a kitchen.
- **Share as text** — a clean recipe + source footer through the native share
  sheet (email, Messages, Messenger...).
- **Print / PDF** — `expo-print`.
- **Share-to-app** — send a recipe link from Safari/Chrome straight into the
  import flow (`expo-share-intent`, development build required).
- **Verify category drag-to-reorder on a device.** The Manage categories
  screen uses `react-native-reorderable-list`; the logic is tested, but the
  drag gesture could not be tried in the build sandbox. If it misbehaves,
  the fallback is ▲/▼ buttons on each row (no gesture library needed).
- **Splash screen** (the app icon is done), then the first UAT TestFlight build.
- **Automated tests.** The pure logic (parsers, scaling, units, search,
  backup/restore) was verified with throwaway scripts against a real SQLite
  engine and a real cookbook document, but no test suite is checked in yet.

**Cut or parked**
- Photo import (cut), in-app web search / browser (cut).
- Grocery list (parked — might come back).
- Cloud sync / accounts (maybe iCloud, later) and share-by-link (needs a
  backend).

**Worth revisiting**
- Extend the grams-per-cup table whenever an ingredient converts to ml but
  should be grams.
- Tag management (rename / merge), and an in-app way to browse by tag outside
  the Home chips.
