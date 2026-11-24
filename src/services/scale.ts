import type { IngredientInput } from '../types/recipe';
import { convertMeasure, isMetricUnit, niceMetric, type UnitSystem } from './units';

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 99;

export function scaleRatio(baseServings: number, targetServings: number): number {
  return baseServings > 0 ? targetServings / baseServings : 1;
}

const FRACTIONS: [number, string][] = [
  [0, ''],
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [7 / 8, '⅞'],
  [1, ''],
];

function trimDecimal(v: number): string {
  return String(Math.round(v * 100) / 100);
}

// 1.5 -> "1½", 0.333 -> "⅓", 2 -> "2"
export function formatFraction(value: number): string {
  if (value < 1 / 16) return trimDecimal(value);
  let whole = Math.floor(value);
  const frac = value - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  if (best[0] === 1) whole += 1;
  const glyph = best[0] === 1 ? '' : best[1];
  if (whole === 0) return glyph || trimDecimal(value);
  return `${whole}${glyph}`;
}

function unitLabel(unit: string, quantity: number): string {
  const plural = quantity > 1;
  switch (unit) {
    case 'cup':
      return plural ? 'cups' : 'cup';
    case 'pinch':
      return plural ? 'pinches' : 'pinch';
    case 'dash':
      return plural ? 'dashes' : 'dash';
    case 'l':
      return 'L';
    default:
      return unit;
  }
}

// One ingredient line for display. `ratio` scales it; `system` converts units
// (pass null to keep the recipe's own units). Lines that need no change are
// returned exactly as the user wrote them.
export function displayIngredient(
  ing: IngredientInput,
  ratio: number,
  system: UnitSystem | null,
): string {
  if (ing.quantity === null) return ing.rawText;

  const scaled = ing.quantity * ratio;
  const converted = system ? convertMeasure(scaled, ing.unit, system) : { quantity: scaled, unit: ing.unit };
  if (ratio === 1 && converted.unit === ing.unit) return ing.rawText;

  const { unit } = converted;
  let quantity = converted.quantity;
  let qtyText: string;
  if (isMetricUnit(unit)) {
    if (unit === 'g' || unit === 'ml') quantity = niceMetric(quantity);
    qtyText = trimDecimal(quantity);
  } else {
    qtyText = formatFraction(quantity);
  }
  const shown = Number.parseFloat(qtyText) || quantity;
  return [qtyText, unit ? unitLabel(unit, shown) : '', ing.name].filter(Boolean).join(' ');
}

// Ingredients scaled in their own units, ready to save as a new recipe.
export function scaleIngredients(ings: IngredientInput[], ratio: number): IngredientInput[] {
  return ings.map((ing) => {
    if (ing.quantity === null || ratio === 1) return { ...ing };
    const rawText = displayIngredient(ing, ratio, null);
    return { ...ing, quantity: ing.quantity * ratio, rawText };
  });
}
