import type { IngredientInput } from '../types/recipe';

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 1 / 2,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
};
const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join('');

// Canonical unit -> spellings people write. Only real measuring units are
// recognised; things like "cloves" or "cans" stay part of the name.
const UNIT_SPELLINGS: Record<string, string[]> = {
  tsp: ['tsp', 'tsps', 'teaspoon', 'teaspoons'],
  tbsp: ['tbsp', 'tbsps', 'tbs', 'tbl', 'tablespoon', 'tablespoons'],
  cup: ['cup', 'cups'],
  'fl oz': ['fl oz', 'fl. oz', 'fl oz.', 'fl. oz.', 'fluid ounce', 'fluid ounces'],
  pt: ['pt', 'pint', 'pints'],
  qt: ['qt', 'quart', 'quarts'],
  gal: ['gal', 'gallon', 'gallons'],
  oz: ['oz', 'ounce', 'ounces'],
  lb: ['lb', 'lbs', 'pound', 'pounds'],
  g: ['g', 'gram', 'grams'],
  kg: ['kg', 'kilogram', 'kilograms'],
  ml: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'],
  l: ['l', 'liter', 'liters', 'litre', 'litres'],
  pinch: ['pinch', 'pinches'],
  dash: ['dash', 'dashes'],
};

const UNIT_LOOKUP = new Map<string, string>();
for (const [canonical, spellings] of Object.entries(UNIT_SPELLINGS)) {
  for (const s of spellings) UNIT_LOOKUP.set(s, canonical);
}

// Longest spellings first so "fl oz" wins over "oz" and "tbsp" over "tb".
const UNIT_REGEX = new RegExp(
  `^(${[...UNIT_LOOKUP.keys()]
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/\./g, '\\.').replace(/ /g, '\\s+'))
    .join('|')})(?=\\s|$|[.,;:)])\\.?`,
  'i',
);

type Quantity = { value: number; rest: string };

function parseQuantity(text: string): Quantity | null {
  let m: RegExpMatchArray | null;

  // "1 ½" / "1½"
  m = text.match(new RegExp(`^(\\d+)\\s*([${FRACTION_CHARS}])`));
  if (m) return { value: Number(m[1]) + UNICODE_FRACTIONS[m[2]], rest: text.slice(m[0].length) };

  // "½"
  m = text.match(new RegExp(`^([${FRACTION_CHARS}])`));
  if (m) return { value: UNICODE_FRACTIONS[m[1]], rest: text.slice(m[0].length) };

  // "1 1/2"
  m = text.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (m && Number(m[3]) !== 0) {
    return { value: Number(m[1]) + Number(m[2]) / Number(m[3]), rest: text.slice(m[0].length) };
  }

  // "1/2"
  m = text.match(/^(\d+)\/(\d+)/);
  if (m && Number(m[2]) !== 0) {
    return { value: Number(m[1]) / Number(m[2]), rest: text.slice(m[0].length) };
  }

  // "2" or "1.5"
  m = text.match(/^(\d+(?:\.\d+)?)/);
  if (m) return { value: Number(m[1]), rest: text.slice(m[0].length) };

  return null;
}

// "1 1/2 cups flour, sifted" -> { quantity: 1.5, unit: 'cup', name: 'flour, sifted' }
// Anything we can't confidently parse keeps quantity null and the full line as the name.
export function parseIngredient(line: string): IngredientInput {
  const rawText = line.trim().replace(/\s+/g, ' ');
  const unparsed: IngredientInput = { quantity: null, unit: null, name: rawText, rawText };

  const qty = parseQuantity(rawText);
  if (!qty) return unparsed;

  // Ranges like "1-2 cups" or "2 to 3 cloves" can't be scaled safely.
  if (/^\s*(?:-|–|—|to\b)\s*\d/i.test(qty.rest)) return unparsed;

  // "1-pound bag" -> "pound bag"
  let rest = qty.rest.trim().replace(/^-(?=[a-z])/i, '');
  let unit: string | null = null;

  const unitMatch = rest.match(UNIT_REGEX);
  if (unitMatch) {
    unit = UNIT_LOOKUP.get(unitMatch[1].toLowerCase().replace(/\s+/g, ' ')) ?? null;
    rest = rest.slice(unitMatch[0].length).trim();
  }

  const name = rest.replace(/^of\s+/i, '').trim();
  if (!name) return unparsed;

  return { quantity: qty.value, unit, name, rawText };
}
