import type { ImportedRecipe } from '../../types/recipe';
import { fetchGoogleDocText, extractGoogleDocId } from './fromGoogleDoc';
import { INGREDIENT_HEADING, INSTRUCTION_HEADING, parseRecipeText } from './fromText';

export type CookbookRecipe = ImportedRecipe & {
  // The section heading this recipe sat under (e.g. "Soups"), if any.
  section: string | null;
  // Things worth double-checking in the review list.
  warnings: string[];
};

export type CookbookParse = {
  recipes: CookbookRecipe[];
  // Lines that weren't part of any recipe, like to-do notes in the doc.
  skipped: string[];
};

// Google Docs exports page breaks / horizontal lines as a row of underscores.
const SEPARATOR = /^[_\-=]{5,}$/;

function firstNonEmptyBefore(lines: string[], index: number): number {
  for (let i = index - 1; i >= 0; i--) if (lines[i]) return i;
  return -1;
}

// Splits a whole cookbook (many recipes in one doc) into individual recipes.
//
// Layout it understands: sections ("Soups", "Breakfast"...) are short pages
// with no ingredients; every recipe has its title right above an
// "Ingredients" heading. Recipes are usually separated by page breaks, but a
// missing break doesn't matter because each title is found from its heading.
export function parseCookbookText(raw: string, sourceUrl: string | null = null): CookbookParse {
  const lines = raw
    .replace(/^﻿/, '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim());

  const chunks: string[][] = [[]];
  for (const line of lines) {
    if (SEPARATOR.test(line)) chunks.push([]);
    else chunks[chunks.length - 1].push(line);
  }

  const recipes: CookbookRecipe[] = [];
  const skipped: string[] = [];
  let section: string | null = null;

  for (const chunk of chunks) {
    if (chunk.every((l) => !l)) continue;

    const ingredientAt = chunk.flatMap((l, i) => (INGREDIENT_HEADING.test(l) ? [i] : []));
    const instructionAt = chunk.flatMap((l, i) => (INSTRUCTION_HEADING.test(l) ? [i] : []));
    const warnings: string[] = [];

    // A page with no recipe headings is a section title (plus any stray notes).
    if (ingredientAt.length === 0 && instructionAt.length === 0) {
      const text = chunk.filter(Boolean);
      section = text[0];
      skipped.push(...text.slice(1));
      continue;
    }

    // Some recipes label their ingredient list "Instructions" by mistake.
    // Two Instructions headings and no Ingredients heading means the first is the ingredients.
    if (ingredientAt.length === 0 && instructionAt.length >= 2) {
      chunk[instructionAt[0]] = 'Ingredients:';
      ingredientAt.push(instructionAt[0]);
      warnings.push('The first list was labelled "Instructions" in the doc; treated it as the ingredients.');
    }

    // Each recipe starts at the title line above its Ingredients heading. A page can
    // hold several recipes if a page break is missing between them.
    const starts =
      ingredientAt.length > 0
        ? ingredientAt.map((at) => {
            const title = firstNonEmptyBefore(chunk, at);
            return title === -1 ? at : title;
          })
        : [chunk.findIndex(Boolean)];

    const leading = chunk.slice(0, starts[0]).filter(Boolean);
    skipped.push(...leading);

    starts.forEach((start, k) => {
      const block = chunk.slice(start, starts[k + 1] ?? chunk.length);
      try {
        const parsed = parseRecipeText(block.join('\n'), sourceUrl);
        const recipeWarnings = k === 0 ? [...warnings] : [];
        if (parsed.ingredients.length === 0) recipeWarnings.push('No ingredients found.');
        if (parsed.instructions.length === 0) recipeWarnings.push('No instructions found.');
        recipes.push({ ...parsed, section, warnings: recipeWarnings });
      } catch {
        skipped.push(`Couldn't read "${block.find(Boolean) ?? 'unknown'}"`);
      }
    });
  }

  if (recipes.length === 0) {
    throw new Error("Couldn't find any recipes in that cookbook.");
  }

  return { recipes, skipped };
}

// Accepts either a Google Doc link (must be shared as "Anyone with the link")
// or the cookbook's text pasted in directly.
export async function importCookbook(input: string): Promise<CookbookParse> {
  if (extractGoogleDocId(input)) {
    const { text, sourceUrl } = await fetchGoogleDocText(input);
    return parseCookbookText(text, sourceUrl);
  }
  return parseCookbookText(input, null);
}
