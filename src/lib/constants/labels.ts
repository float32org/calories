export const PANTRY_CATEGORY_LABELS: Record<string, string> = {
	protein: 'Protein',
	vegetable: 'Vegetables',
	fruit: 'Fruits',
	dairy: 'Dairy',
	grain: 'Grains',
	pantry: 'Pantry',
	beverage: 'Beverages',
	other: 'Other'
};

export const PANTRY_CATEGORY_ORDER = [
	'protein',
	'vegetable',
	'fruit',
	'dairy',
	'grain',
	'pantry',
	'beverage',
	'other'
] as const;

export const PREFERENCE_CATEGORY_LABELS: Record<string, string> = {
	like: 'Likes',
	dislike: 'Dislikes',
	allergy: 'Allergies',
	dietary: 'Dietary',
	cuisine: 'Cuisine',
	timing: 'Timing',
	portion: 'Portion',
	other: 'Other'
};

export const PREFERENCE_CATEGORY_LABELS_LOWER: Record<string, string> = {
	like: 'likes',
	dislike: 'dislikes',
	allergy: 'allergies',
	dietary: 'dietary restrictions',
	cuisine: 'cuisine preferences',
	timing: 'meal timing',
	portion: 'portion preferences',
	other: 'other'
};
