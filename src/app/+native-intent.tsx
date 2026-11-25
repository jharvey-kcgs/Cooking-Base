// When the Share extension hands something to the app, iOS opens a special link
// (cookingbase://dataUrl=...). expo-share-intent reads it directly, so the router
// just needs to land on Home instead of treating it as an unknown screen.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  if (path.includes('dataUrl=')) return '/';
  return path;
}
