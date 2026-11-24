import type { ImportedRecipe } from '../../types/recipe';
import { parseRecipeText } from './fromText';

export function extractGoogleDocId(input: string): string | null {
  const match = input.match(/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

// Downloads a Google Doc as plain text through its export link. This only works
// for docs shared as "Anyone with the link"; private docs return a sign-in page.
export async function fetchGoogleDocText(
  input: string,
): Promise<{ text: string; sourceUrl: string }> {
  const id = extractGoogleDocId(input);
  if (!id) {
    throw new Error("That doesn't look like a Google Doc link (docs.google.com/document/...).");
  }

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

  return {
    text: await response.text(),
    sourceUrl: `https://docs.google.com/document/d/${id}`,
  };
}

export async function importFromGoogleDoc(input: string): Promise<ImportedRecipe> {
  const { text, sourceUrl } = await fetchGoogleDocText(input);
  return parseRecipeText(text, sourceUrl);
}
