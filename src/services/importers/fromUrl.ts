import type { ImportedRecipe } from '../../types/recipe';

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  deg: '°',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  eacute: 'é',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const num = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(num) && num > 0 && num < 0x110000 ? String.fromCodePoint(num) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return decodeEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function flattenInstructions(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string') {
    return decodeEntities(value.replace(/<\/?(?:p|li|br)[^>]*>/gi, '\n').replace(/<[^>]*>/g, ' '))
      .split('\n')
      .map((s) => s.replace(/\s+/g, ' ').trim().replace(/^\d+\s*[.)]\s+/, ''))
      .filter(Boolean);
  }
  if (Array.isArray(value)) return value.flatMap(flattenInstructions);
  if (typeof value === 'object') {
    const node = value as Record<string, unknown>;
    if (node.itemListElement) return flattenInstructions(node.itemListElement);
    const text = cleanText(node.text) || cleanText(node.name);
    return text ? [text] : [];
  }
  return [];
}

function parseYield(value: unknown): number | null {
  const first = Array.isArray(value) ? value[0] : value;
  const match = String(first ?? '').match(/\d+/);
  const n = match ? Number(match[0]) : 0;
  return n > 0 && n < 100 ? n : null;
}

function collectNodes(json: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(json)) {
    json.forEach((item) => collectNodes(item, out));
  } else if (json && typeof json === 'object') {
    const node = json as Record<string, unknown>;
    out.push(node);
    if (node['@graph']) collectNodes(node['@graph'], out);
  }
  return out;
}

function isRecipe(node: Record<string, unknown>): boolean {
  const type = node['@type'];
  return Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe';
}

// Most recipe sites embed schema.org "Recipe" JSON-LD for search engines; read that.
export function extractRecipeFromHtml(html: string, sourceUrl: string | null): ImportedRecipe {
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const [, body] of scripts) {
    let json: unknown;
    try {
      json = JSON.parse(body.trim());
    } catch {
      continue;
    }
    const recipe = collectNodes(json).find(isRecipe);
    if (!recipe) continue;

    const rawIngredients = recipe.recipeIngredient ?? recipe.ingredients;
    const ingredients = (Array.isArray(rawIngredients) ? rawIngredients : [rawIngredients])
      .map(cleanText)
      .filter(Boolean);
    const instructions = flattenInstructions(recipe.recipeInstructions);

    if (ingredients.length === 0 && instructions.length === 0) continue;

    return {
      title: cleanText(recipe.name) || 'Untitled recipe',
      servings: parseYield(recipe.recipeYield),
      ingredients,
      instructions,
      notes: '',
      sourceUrl,
    };
  }

  throw new Error(
    "Couldn't find a recipe on that page. Try copying the recipe and using Paste text instead.",
  );
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes('.')) throw new Error('bad host');
    return url.toString();
  } catch {
    throw new Error("That doesn't look like a valid link.");
  }
}

export async function importFromUrl(input: string): Promise<ImportedRecipe> {
  const url = normalizeUrl(input);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    });
  } catch {
    throw new Error("Couldn't reach that site. Check your connection and the link.");
  }

  if (!response.ok) {
    throw new Error(`That site wouldn't let us read the page (error ${response.status}).`);
  }

  return extractRecipeFromHtml(await response.text(), url);
}
