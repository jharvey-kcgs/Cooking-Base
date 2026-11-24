import type { ImportedRecipe } from '../../types/recipe';
import { parseRecipeText } from './fromText';

export function extractGoogleDocId(input: string): string | null {
  const match = input.match(/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

// Reads a Google Doc through its plain-text export. This only works for docs
// shared as "Anyone with the link"; private docs return a sign-in page instead.
export async function importFromGoogleDoc(input: string): Promise<ImportedRecipe> {
  const id = extractGoogleDocId(input);
  if (!id) {
    throw new Error("That doesn't look like a Google Doc link (docs.google.com/document/...).");
  }

  const sourceUrl = `https://docs.google.com/document/d/${id}`;

  let response: Response;
  try {
    response = await fetch(`https://docs.google.com/document/d/${id}/export?format=txt`);
  } catch {
    throw new Error("Couldn't reach Google. Check your connection.");
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !contentType.includes('text/plain')) {
    throw new Error(
      'Couldn\'t read that doc. In Google Docs, tap Share and set General access to "Anyone with the link", or copy the text and use Paste text.',
    );
  }

  return parseRecipeText(await response.text(), sourceUrl);
}
