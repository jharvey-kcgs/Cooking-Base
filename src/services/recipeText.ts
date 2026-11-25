import type { Recipe } from '../types/recipe';
import { displayIngredient, scaleRatio } from './scale';
import { convertTemperatures, type UnitSystem } from './units';

// Everything the share / print screens need, already scaled and converted
// exactly as it is shown on the recipe screen.
export type ShareableRecipe = {
  title: string;
  categoryName: string;
  servings: number;
  ingredients: string[];
  instructions: string[];
  notes: string;
  sourceUrl: string | null;
  scaledFrom: number | null; // original servings if the user scaled it, else null
};

export function prepareShareable(
  recipe: Recipe,
  categoryName: string,
  servings: number,
  units: UnitSystem,
): ShareableRecipe {
  const ratio = scaleRatio(recipe.servings, servings);
  return {
    title: recipe.title.replace(/\s*\(TEMP\)\s*$/, ''),
    categoryName,
    servings,
    ingredients: recipe.ingredients.map((ing) => displayIngredient(ing, ratio, units)),
    instructions: recipe.instructions.map((step) => convertTemperatures(step, units)),
    notes: recipe.notes.trim(),
    sourceUrl: recipe.sourceUrl,
    scaledFrom: servings !== recipe.servings ? recipe.servings : null,
  };
}

// Plain text that reads well in Messages, email, and Messenger.
export function buildRecipeText(r: ShareableRecipe): string {
  const lines: string[] = [r.title];
  const meta = [r.categoryName, `Serves ${r.servings}`].filter(Boolean).join(' · ');
  lines.push(meta);
  if (r.scaledFrom !== null) lines.push(`(scaled from ${r.scaledFrom} servings)`);

  if (r.ingredients.length > 0) {
    lines.push('', 'INGREDIENTS');
    r.ingredients.forEach((i) => lines.push(`• ${i}`));
  }
  if (r.instructions.length > 0) {
    lines.push('', 'INSTRUCTIONS');
    r.instructions.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  if (r.notes) lines.push('', 'NOTES', r.notes);
  if (r.sourceUrl) lines.push('', `Source: ${r.sourceUrl}`);
  lines.push('', 'Shared from Cooking Base');
  return lines.join('\n');
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Simple, printer-friendly page used for both Print and Share as PDF.
export function buildRecipeHtml(r: ShareableRecipe): string {
  const meta = [r.categoryName, `Serves ${r.servings}`].filter(Boolean).map(esc).join(' &middot; ');
  const list = (tag: 'ul' | 'ol', items: string[]) =>
    `<${tag}>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</${tag}>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #2B211B; margin: 36px; line-height: 1.5; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  .meta { color: #7A6A5F; font-size: 14px; margin-bottom: 4px; }
  h2 { font-size: 13px; letter-spacing: 1px; color: #D9622B; margin: 26px 0 8px; border-bottom: 1px solid #EADBCB; padding-bottom: 4px; }
  ul, ol { margin: 0; padding-left: 22px; }
  li { margin-bottom: 6px; font-size: 16px; }
  p { font-size: 15px; margin: 0; white-space: pre-wrap; }
  .source { word-break: break-all; }
  .footer { margin-top: 36px; color: #7A6A5F; font-size: 12px; }
</style></head><body>
<h1>${esc(r.title)}</h1>
<div class="meta">${meta}</div>
${r.scaledFrom !== null ? `<div class="meta">Scaled from ${r.scaledFrom} servings</div>` : ''}
${r.ingredients.length ? `<h2>INGREDIENTS</h2>${list('ul', r.ingredients)}` : ''}
${r.instructions.length ? `<h2>INSTRUCTIONS</h2>${list('ol', r.instructions)}` : ''}
${r.notes ? `<h2>NOTES</h2><p>${esc(r.notes)}</p>` : ''}
${r.sourceUrl ? `<h2>SOURCE</h2><p class="source">${esc(r.sourceUrl)}</p>` : ''}
<div class="footer">Shared from Cooking Base</div>
</body></html>`;
}

// A safe file name for the PDF, e.g. "Grandmas Cookies.pdf".
export function pdfFileName(title: string): string {
  const cleaned = title.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return `${cleaned || 'Recipe'}.pdf`;
}
