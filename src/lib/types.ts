export type MealInput = {
	name: string;
	calories: number;
	servings?: number;
	protein?: number;
	carbs?: number;
	fat?: number;
};

export type MealWithId = MealInput & {
	id: string;
};
