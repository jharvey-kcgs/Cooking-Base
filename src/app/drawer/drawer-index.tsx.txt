import { View } from 'react-native';

import { AddFab } from '@/components/AddFab';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <PlaceholderScreen
        title="Cooking Base"
        subtitle="Open the menu to browse categories, or tap + to add a recipe."
      />
      <AddFab />
    </View>
  );
}
