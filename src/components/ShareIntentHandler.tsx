import { useEffect, useRef } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';

import { resolveSharedImport } from '@/services/sharedImport';

// Sits inside the root layout. When a recipe link or text arrives from another
// app's Share sheet, opens the import screen with it filled in and starts the import.
export function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const handling = useRef(false);

  useEffect(() => {
    if (!hasShareIntent) {
      handling.current = false;
      return;
    }
    if (!navigationReady || handling.current) return;
    handling.current = true; // one share = one import, even if the hook re-renders
    const action = resolveSharedImport(shareIntent);
    resetShareIntent();
    if (!action) return; // e.g. a photo or file: nothing we can import
    router.push({
      pathname: '/recipe/import',
      params: { mode: action.mode, value: action.value, auto: '1' },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, navigationReady, shareIntent]);

  return null;
}
