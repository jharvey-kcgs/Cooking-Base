import Constants from 'expo-constants';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? 'unknown';

  return <PlaceholderScreen title="About" subtitle={`Cooking Base v${version}`} />;
}
