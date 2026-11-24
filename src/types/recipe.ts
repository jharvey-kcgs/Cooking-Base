// One ingredient line, stored structured so servings/units can be
// computed later. rawText is always kept as the fallback for lines
// that couldn't be parsed (quantity stays null and scaling skips them).
export type IngredientInput = {
  quantity: number | null;
  unit: string | null;
  name: string;
  rawText: string;
};

export type RecipeInput = {
  categoryId: number;
  title: string;
  servings: number;
  ingredients: IngredientInput[];
  instructions: string[];
  notes: string;
  sourceUrl: string | null;
};

export type Recipe = RecipeInput & {
  id: number;
  isFavorite: boolean;
  isTemp: boolean;
  parentId: number | null;
  createdAt: number;
  updatedAt: number;
};

export type RecipeSummary = {
  id: number;
  title: string;
  servings: number;
  isFavorite: boolean;
};

// What the importers return: raw text lines for the user to review
// in the edit form before anything is saved.
export type ImportedRecipe = {
  title: string;
  servings: number | null;
  ingredients: string[];
  instructions: string[];
  notes: string;
  sourceUrl: string | null;
};
