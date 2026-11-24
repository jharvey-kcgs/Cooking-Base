// Tiny pub/sub so the drawer's category list refreshes the moment the
// Manage Categories screen changes something (add, rename, delete, reorder).
const listeners = new Set<() => void>();

export function notifyCategoriesChanged(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeCategoriesChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
