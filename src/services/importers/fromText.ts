import type { ImportedRecipe } from '../../types/recipe';

const INGREDIENT_HEADING = /^(?:#+\s*)?(?:ingredients?|what you(?:'|’)ll need)\s*:?\s*$/i;
const INSTRUCTION_HEADING =
  /^(?:#+\s*)?(?:instructions?|directions?|method|steps?|preparation)\s*:?\s*$/i;
const NOTES_HEADING = /^(?:#+\s*)?(?:notes?|tips?|chef(?:'|’)s notes?)\s*:?\s*$/i;
// Sections we recognise only so their lines don't leak into the recipe.
const IGNORED_HEADING = /^(?:#+\s*)?(?:nutrition(?:al)?(?: facts| information)?|equipment|reviews?)\s*:?\s*$/i;

const BULLET = /^(?:[-*•▪◦–—]|[▢☐□]|\[\s?\])\s*/;
const STEP_NUMBER = /^(?:step\s*)?\d+\s*[.):]\s*/i;
const STARTS_WITH_QUANTITY = /^(?:\d|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/;

type Section = 'none' | 'ingredients' | 'instructions' | 'notes' | 'ignored';

// Turns pasted text (or a Google Doc's exported text) into a recipe draft.
// Works best when the text has "Ingredients" / "Instructions" headings, and
// falls back to guessing by whether a line starts with a quantity.
export function parseRecipeText(raw: string, sourceUrl: string | null = null): ImportedRecipe {
  const lines = raw
    .replace(/^﻿/, '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim());

  const nonEmpty = lines.filter(Boolean);
  const hasHeadings = nonEmpty.some((l) => INGREDIENT_HEADING.test(l) || INSTRUCTION_HEADING.test(l));

  const ingredients: string[] = [];
  const instructions: string[] = [];
  const notes: string[] = [];
  const preamble: string[] = [];

  if (hasHeadings) {
    let section: Section = 'none';
    for (const line of lines) {
      if (!line) continue;
      if (INGREDIENT_HEADING.test(line)) section = 'ingredients';
      else if (INSTRUCTION_HEADING.test(line)) section = 'instructions';
      else if (NOTES_HEADING.test(line)) section = 'notes';
      else if (IGNORED_HEADING.test(line)) section = 'ignored';
      else if (section === 'ingredients') ingredients.push(line.replace(BULLET, ''));
      else if (section === 'instructions') instructions.push(line.replace(BULLET, '').replace(STEP_NUMBER, ''));
      else if (section === 'notes') notes.push(line);
      else if (section === 'none') preamble.push(line);
    }
  } else {
    // No headings: first line is the title, then quantity-led lines are ingredients.
    for (const line of nonEmpty.slice(1)) {
      const cleaned = line.replace(BULLET, '');
      if (STARTS_WITH_QUANTITY.test(cleaned) && cleaned.length < 120) ingredients.push(cleaned);
      else instructions.push(cleaned.replace(STEP_NUMBER, ''));
    }
    preamble.push(...nonEmpty.slice(0, 1));
  }

  const cleanIngredients = ingredients.filter(Boolean);
  const cleanSteps = instructions.filter(Boolean);

  if (cleanIngredients.length === 0 && cleanSteps.length === 0) {
    throw new Error("Couldn't find a recipe in that text.");
  }

  // The title is the first line before any heading, skipping lines that are clearly metadata.
  const title =
    preamble.find((l) => !/^(?:serves?|servings?|yield|makes|prep|cook|total)\b/i.test(l)) ??
    'Untitled recipe';

  const servingsMatch = raw.match(/(?:serves|servings?|yields?|makes)\s*:?\s*(\d+)/i);
  const servings = servingsMatch ? Number(servingsMatch[1]) : null;

  return {
    title: title.replace(/^#+\s*/, '').slice(0, 120),
    servings: servings && servings > 0 && servings < 100 ? servings : null,
    ingredients: cleanIngredients,
    instructions: cleanSteps,
    notes: notes.join('\n'),
    sourceUrl,
  };
}
