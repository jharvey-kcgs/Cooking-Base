import { useEffect, useState } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { getCategory, type Category } from '@/db/categories';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const [category, setCategory] = useState<Category | null>(null);

  useEffect(() => {
    let active = true;
    getCategory(db, Number(id)).then((found) => {
      if (!active) return;
      setCategory(found);
      navigation.setOptions({ title: found?.name ?? 'Category' });
    });
    return () => {
      active = false;
    };
  }, [db, id, navigation]);

  return (
    <PlaceholderScreen
      title={category?.name ?? ''}
      subtitle="Recipes in this category will show up here."
    />
  );
}
