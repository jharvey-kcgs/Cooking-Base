# Cooking Base

A personal, local-only cookbook app for iOS (and Android), built with Expo and React Native.
Part of the "Base" family: League Base, Media Base, Home Base, Cooking Base.

Recipes are organized into categories in a drawer menu. Everything is stored on the device;
there are no accounts, no cloud, and no analytics.

## Features

- Categories in a drawer (Breakfast, Dessert, Entrée, Vegetables, Marinade/Sauce, plus any you create)
- Add, edit, and delete recipes: title, category, servings, ingredients, instructions, notes, source link
- Import a single recipe from a web link, a Google Doc link, or pasted text
- Import a whole cookbook from one Google Doc or pasted text (sections map to categories, duplicates are skipped)
- Light and dark themes
- Data screen: export a JSON backup, restore from a backup, clear TEMP recipes, delete all recipes
- FAQ and About screens

Planned: servings scaler, Metric/Standard units, favorites, tags and search, Home screen,
cook mode, share as text, print/PDF, share-to-app from the browser.

## Tech stack

- Expo SDK 58, React Native 0.88, React 19
- expo-router (file-based routing in `src/app/`, Drawer inside a root Stack)
- expo-sqlite (local database, `PRAGMA user_version` migrations)
- expo-file-system, expo-sharing, expo-document-picker (backup and restore)
- TypeScript, path alias `@/*` to `src/*`

## Getting started

```
npm install
npx expo start
```

Open it in Expo Go or a development build. If routes look stale after moving files,
run `npx expo start -c`.

Useful scripts:

| Script | What it does |
|---|---|
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm run doctor` | Run expo-doctor |
| `npm run bump` | Bump the patch version (`npm run bump -- minor`, `-- major`, or `-- 2.0.0`) |
| `npm run build:uat:ios` / `android` | Bump version and build the UAT (TestFlight/testing) app with EAS |
| `npm run build:store:ios` / `android` | Bump version and build the public store app with EAS |

## Versioning and build variants

The user-facing version lives in `version.json` and is read by `app.config.js`.
`APP_VARIANT` is set per EAS profile in `eas.json`:

- `uat` (default): app name "Cooking Base (UAT)", bundle id `com.JHarvey.CookingBase`
- `store`: app name "My Cooking Base", bundle id `com.JHarvey.CookingBaseStore`

## Project structure

```
src/
  app/                  Routes (expo-router)
    _layout.tsx         Providers (SQLite, theme) and root Stack
    (drawer)/           Drawer screens: index, category/[id], settings, data, faq, about
    recipe/             add, import, cookbook, edit, [id]
  components/           AppButton, ThemedInput, AddFab, AppDrawerContent, ...
  db/                   schema + migrations, categories, recipes, settings
  services/             parseIngredient, cookbookImport, backup, backupFiles, importers/
  state/                In-memory import draft
  theme/                Palettes and ThemeProvider
  types/                Shared types
scripts/bump-version.js
version.json
```

## Data and backups

Recipes live in a local SQLite database (`cooking-base.db`). Deleting the app deletes the data.
Use Data > Export backup to save a JSON file, and Data > Restore from backup to load one.
Restoring replaces everything in the app. The backup format is documented by the types in
`src/services/backup.ts` (`formatVersion: 1`).

## Privacy

See [PRIVACY.md](PRIVACY.md).

## License

See [LICENSE](LICENSE).
