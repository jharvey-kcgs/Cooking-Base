// Decides what to do with something another app shared into Cooking Base
// (a link from Safari/Chrome, a Google Docs link, or plain recipe text).
// Pure on purpose, so it can be tested without a phone.

export type SharedImportMode = 'web' | 'google' | 'text';

export type SharedImportAction = { mode: SharedImportMode; value: string };

type SharedContent = {
  text?: string | null;
  webUrl?: string | null;
};

const URL_PATTERN = /https?:\/\/[^\s<>"]+/i;
const GOOGLE_DOC_PATTERN = /^https?:\/\/docs\.google\.com\/document\//i;

export function resolveSharedImport(shared: SharedContent): SharedImportAction | null {
  const text = shared.text?.trim() ?? '';
  const link = shared.webUrl?.trim() || (text.match(URL_PATTERN)?.[0] ?? '');

  // A link on its own, or a short message that is mostly a link ("Look: https://..."),
  // is treated as a web page to import.
  if (link) {
    const onlyALink = text === '' || text === link || text.replace(link, '').trim().length < 80;
    if (onlyALink) {
      return { mode: GOOGLE_DOC_PATTERN.test(link) ? 'google' : 'web', value: link };
    }
  }

  // Otherwise, anything with real text is treated as pasted recipe text.
  if (text.length > 0) return { mode: 'text', value: text };
  return null;
}
