import { tool } from 'ai';
import { and, desc, eq, gte, like, lte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db';
import {
	foodPreferences,
	mealLogs,
	pantryCategoryValues,
	pantryItems,
	preferenceCategoryValues,
	profiles,
	shoppingListItems,
	shoppingLists,
	waterLogs,
	weightLogs
} from './schema';

type ToolContext = {
	userId: string;
	timezone?: string;
};

function getTodayInTimezone(timezone?: string): string {
	const now = new Date();
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone || 'UTC',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	return formatter.format(now);
}

export function getToolContext(context: unknown): ToolContext {
	const ctx = context as ToolContext;
	if (!ctx?.userId) {
		throw new Error('Invalid tool execution context: missing userId');
	}
	return ctx;
}

export const suggestFood = tool({
	description: `Suggest a food item for the user to log to their food diary.

USE THIS TOOL WHEN:
- User asks what they should eat
- User describes a meal they had and you want to help them log it
- User shows a photo of food and you've identified what it is
- User asks for meal recommendations based on their calorie budget

The suggestion will be displayed as a card with a "Log this meal" button. Include accurate macro estimates.`,
	inputSchema: z.object({
		name: z.string().max(200).describe('Name of the food or meal (e.g., "Grilled Chicken Salad")'),
		calories: z.number().int().nonnegative().max(50000).describe('Estimated total calories'),
		protein: z.number().int().nonnegative().max(5000).describe('Protein in grams'),
		carbs: z.number().int().nonnegative().max(5000).describe('Carbohydrates in grams'),
		fat: z.number().int().nonnegative().max(5000).describe('Fat in grams')
	})
});

export const meals = tool({
	description: `Query, edit, or delete meals from the user's food diary.

OPERATIONS:
- "query": Search or retrieve meal history. Use for questions like "what did I eat yesterday?", "when did I last have pizza?", "show my recent meals"
- "edit": Modify an existing meal's name, calories, macros, or servings. Requires mealId.
- "delete": Remove a meal from the log. Requires mealId.

QUERY TYPES (for "query" operation):
- "recent": Get latest meals (default limit: 10)
- "by_date": Get all meals for a specific date
- "search": Find meals by name (e.g., search for "pizza")
- "date_range": Get meals between two dates

To edit or delete, first query to find the meal ID, then call again with the appropriate operation.`,
	inputSchema: z.object({
		operation: z.enum(['query', 'edit', 'delete']).describe('Operation to perform'),
		queryType: z
			.enum(['recent', 'by_date', 'search', 'date_range'])
			.optional()
			.describe('Type of query (required for "query" operation)'),
		date: z.string().optional().describe('Date in YYYY-MM-DD format (for by_date)'),
		startDate: z.string().optional().describe('Start date YYYY-MM-DD (for date_range)'),
		endDate: z.string().optional().describe('End date YYYY-MM-DD (for date_range)'),
		searchTerm: z.string().max(200).optional().describe('Food name to search for'),
		limit: z.number().int().min(1).max(100).optional().describe('Max results (default: 10)'),
		mealId: z.string().optional().describe('Meal ID (required for edit/delete)'),
		name: z.string().max(200).optional().describe('New meal name'),
		calories: z.number().int().positive().max(50000).optional().describe('New calories'),
		protein: z.number().int().nonnegative().max(5000).optional().describe('New protein (g)'),
		carbs: z.number().int().nonnegative().max(5000).optional().describe('New carbs (g)'),
		fat: z.number().int().nonnegative().max(5000).optional().describe('New fat (g)'),
		servings: z.number().positive().max(100).optional().describe('New servings count')
	}),
	execute: async (input, { experimental_context: context }) => {
		const ctx = getToolContext(context);
		const { operation } = input;

		if (operation === 'delete') {
			if (!input.mealId) {
				return { success: false, error: 'mealId is required for delete operation' };
			}

			const [meal] = await db
				.select()
				.from(mealLogs)
				.where(and(eq(mealLogs.id, input.mealId), eq(mealLogs.userId, ctx.userId)));

			if (!meal) {
				return { success: false, error: 'Meal not found' };
			}

			await db.delete(mealLogs).where(eq(mealLogs.id, input.mealId));

			return {
				success: true,
				operation: 'delete' as const,
				deleted: {
					id: meal.id,
					name: meal.name,
					calories: meal.calories,
					date: meal.date
				}
			};
		}

		if (operation === 'edit') {
			if (!input.mealId) {
				return { success: false, error: 'mealId is required for edit operation' };
			}

			const [meal] = await db
				.select()
				.from(mealLogs)
				.where(and(eq(mealLogs.id, input.mealId), eq(mealLogs.userId, ctx.userId)));

			if (!meal) {
				return { success: false, error: 'Meal not found' };
			}

			const updateData: {
				name?: string;
				calories?: number;
				protein?: number;
				carbs?: number;
				fat?: number;
				servings?: number;
				updatedAt: Date;
			} = { updatedAt: new Date() };

			if (input.name !== undefined) updateData.name = input.name;
			if (input.calories !== undefined) updateData.calories = input.calories;
			if (input.protein !== undefined) updateData.protein = input.protein;
			if (input.carbs !== undefined) updateData.carbs = input.carbs;
			if (input.fat !== undefined) updateData.fat = input.fat;
			if (input.servings !== undefined) updateData.servings = input.servings;

			await db.update(mealLogs).set(updateData).where(eq(mealLogs.id, input.mealId));

			const [updatedMeal] = await db.select().from(mealLogs).where(eq(mealLogs.id, input.mealId));

			return {
				success: true,
				operation: 'edit' as const,
				previous: {
					name: meal.name,
					calories: meal.calories,
					protein: meal.protein,
					carbs: meal.carbs,
					fat: meal.fat,
					servings: meal.servings
				},
				updated: {
					id: updatedMeal.id,
					name: updatedMeal.name,
					calories: updatedMeal.calories,
					protein: updatedMeal.protein,
					carbs: updatedMeal.carbs,
					fat: updatedMeal.fat,
					servings: updatedMeal.servings,
					date: updatedMeal.date
				}
			};
		}

		if (!input.queryType) {
			return { success: false, error: 'queryType is required for query operation' };
		}

		const mealSelect = {
			id: mealLogs.id,
			name: mealLogs.name,
			calories: mealLogs.calories,
			protein: mealLogs.protein,
			carbs: mealLogs.carbs,
			fat: mealLogs.fat,
			servings: mealLogs.servings,
			date: mealLogs.date,
			loggedAt: mealLogs.loggedAt
		};

		let meals;
		const limit = input.limit || 10;

		switch (input.queryType) {
			case 'recent':
				meals = await db
					.select(mealSelect)
					.from(mealLogs)
					.where(eq(mealLogs.userId, ctx.userId))
					.orderBy(desc(mealLogs.loggedAt))
					.limit(limit);
				break;

			case 'by_date':
				if (!input.date) {
					return { success: false, error: 'date is required for by_date query' };
				}
				meals = await db
					.select(mealSelect)
					.from(mealLogs)
					.where(and(eq(mealLogs.userId, ctx.userId), eq(mealLogs.date, input.date)))
					.orderBy(desc(mealLogs.loggedAt));
				break;

			case 'search':
				if (!input.searchTerm) {
					return { success: false, error: 'searchTerm is required for search query' };
				}
				meals = await db
					.select(mealSelect)
					.from(mealLogs)
					.where(and(eq(mealLogs.userId, ctx.userId), like(mealLogs.name, `%${input.searchTerm}%`)))
					.orderBy(desc(mealLogs.loggedAt))
					.limit(limit);
				break;

			case 'date_range':
				if (!input.startDate || !input.endDate) {
					return {
						success: false,
						error: 'startDate and endDate are required for date_range query'
					};
				}
				meals = await db
					.select(mealSelect)
					.from(mealLogs)
					.where(
						and(
							eq(mealLogs.userId, ctx.userId),
							gte(mealLogs.date, input.startDate),
							lte(mealLogs.date, input.endDate)
						)
					)
					.orderBy(desc(mealLogs.loggedAt))
					.limit(limit);
				break;

			default:
				return { success: false, error: 'Invalid queryType' };
		}

		const totals = meals.reduce(
			(acc, meal) => ({
				calories: acc.calories + (meal.calories || 0),
				protein: acc.protein + (meal.protein || 0),
				carbs: acc.carbs + (meal.carbs || 0),
				fat: acc.fat + (meal.fat || 0)
			}),
			{ calories: 0, protein: 0, carbs: 0, fat: 0 }
		);

		return {
			success: true,
			operation: 'query' as const,
			count: meals.length,
			meals: meals.map((m) => ({
				...m,
				loggedAt: m.loggedAt.toISOString()
			})),
			totals
		};
	}
});

export const tracking = tool({
	description: `Log or query weight and water intake data.

OPERATIONS:
- "log_weight": Record a weight entry. Use when user mentions their weight ("I weigh 175 lbs", "weighed in at 80kg")
- "query_weight": Get weight history or progress summary. Use for "how much have I lost?", "show my weight trend"
- "log_water": Record water intake. Use when user mentions drinking water ("had a glass of water", "drank 16oz")

WEIGHT QUERY TYPES:
- "recent": Latest weight entries
- "progress": Summary with current weight, total change, weekly/monthly trends, goal progress
- "date_range": Entries between two dates

Common water amounts: glass = 8oz/240ml, bottle = 16-20oz/500ml, large bottle = 32oz/1000ml`,
	inputSchema: z.object({
		operation: z.enum(['log_weight', 'query_weight', 'log_water']).describe('Operation to perform'),
		weight: z.number().positive().max(1500).optional().describe('Weight value to log'),
		weightQueryType: z
			.enum(['recent', 'progress', 'date_range'])
			.optional()
			.describe('Type of weight query'),
		waterAmount: z
			.number()
			.int()
			.positive()
			.max(5000)
			.optional()
			.describe('Water amount (oz or ml based on user units)'),
		date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
		startDate: z.string().optional().describe('Start date for date_range query'),
		endDate: z.string().optional().describe('End date for date_range query'),
		limit: z.number().int().min(1).max(100).optional().describe('Max entries for recent query')
	}),
	execute: async (input, { experimental_context: context }) => {
		const ctx = getToolContext(context);
		const { operation } = input;

		const [userProfile] = await db.select().from(profiles).where(eq(profiles.userId, ctx.userId));
		const isMetric = userProfile?.units === 'metric';

		if (operation === 'log_water') {
			if (!input.waterAmount) {
				return { success: false, error: 'waterAmount is required for log_water operation' };
			}

			const waterUnit = isMetric ? 'ml' : 'oz';
			const waterGoal = userProfile?.waterGoal ?? (isMetric ? 2000 : 64);
			const dateStr = input.date || getTodayInTimezone(ctx.timezone);

			const [existing] = await db
				.select()
				.from(waterLogs)
				.where(and(eq(waterLogs.userId, ctx.userId), eq(waterLogs.date, dateStr)));

			let newTotal: number;

			if (existing) {
				newTotal = existing.amount + input.waterAmount;
				await db
					.update(waterLogs)
					.set({ amount: newTotal, loggedAt: new Date(), updatedAt: new Date() })
					.where(eq(waterLogs.id, existing.id));
			} else {
				newTotal = input.waterAmount;
				await db.insert(waterLogs).values({
					userId: ctx.userId,
					amount: newTotal,
					date: dateStr,
					loggedAt: new Date()
				});
			}

			const remaining = Math.max(0, waterGoal - newTotal);
			const percentComplete = Math.round((newTotal / waterGoal) * 100);

			return {
				success: true,
				operation: 'log_water' as const,
				logged: input.waterAmount,
				total: newTotal,
				waterUnit,
				waterGoal,
				remaining,
				percentComplete,
				goalReached: newTotal >= waterGoal,
				date: dateStr
			};
		}

		if (operation === 'log_weight') {
			if (!input.weight) {
				return { success: false, error: 'weight is required for log_weight operation' };
			}

			const weightUnit = isMetric ? 'kg' : 'lbs';
			const dateStr = input.date || getTodayInTimezone(ctx.timezone);

			const existingEntry = await db
				.select()
				.from(weightLogs)
				.where(and(eq(weightLogs.userId, ctx.userId), eq(weightLogs.date, dateStr)));

			if (existingEntry.length > 0) {
				await db
					.update(weightLogs)
					.set({ weight: input.weight, loggedAt: new Date(), updatedAt: new Date() })
					.where(eq(weightLogs.id, existingEntry[0].id));

				return {
					success: true,
					operation: 'log_weight' as const,
					updated: true,
					weight: input.weight,
					weightUnit,
					date: dateStr
				};
			}

			await db.insert(weightLogs).values({
				userId: ctx.userId,
				weight: input.weight,
				date: dateStr,
				loggedAt: new Date()
			});

			const [previousEntry] = await db
				.select()
				.from(weightLogs)
				.where(eq(weightLogs.userId, ctx.userId))
				.orderBy(desc(weightLogs.date))
				.limit(2);

			const previousWeight = previousEntry?.weight;
			const change = previousWeight ? parseFloat((input.weight - previousWeight).toFixed(1)) : null;

			return {
				success: true,
				operation: 'log_weight' as const,
				created: true,
				weight: input.weight,
				weightUnit,
				date: dateStr,
				previousWeight,
				change,
				weightGoal: userProfile?.weightGoal
			};
		}

		if (!input.weightQueryType) {
			return { success: false, error: 'weightQueryType is required for query_weight operation' };
		}

		const weightUnit = isMetric ? 'kg' : 'lbs';
		const weightGoal = userProfile?.weightGoal;

		const weightSelect = {
			id: weightLogs.id,
			weight: weightLogs.weight,
			date: weightLogs.date
		};

		if (input.weightQueryType === 'progress') {
			const weights = await db
				.select(weightSelect)
				.from(weightLogs)
				.where(eq(weightLogs.userId, ctx.userId))
				.orderBy(desc(weightLogs.date));

			if (weights.length === 0) {
				return {
					success: true,
					operation: 'query_weight' as const,
					message: 'No weight entries recorded yet',
					weightUnit,
					weightGoal
				};
			}

			const currentWeight = weights[0].weight;
			const startingWeight = weights[weights.length - 1].weight;
			const totalChange = currentWeight - startingWeight;

			const now = new Date();
			const sevenDaysAgo = new Date(now);
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
			const thirtyDaysAgo = new Date(now);
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			const weekAgoStr = sevenDaysAgo.toISOString().split('T')[0];
			const monthAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

			const weekAgoEntry = weights.find((w) => w.date <= weekAgoStr);
			const monthAgoEntry = weights.find((w) => w.date <= monthAgoStr);

			return {
				success: true,
				operation: 'query_weight' as const,
				queryType: 'progress' as const,
				currentWeight,
				startingWeight,
				totalChange: parseFloat(totalChange.toFixed(1)),
				weightGoal,
				remainingToGoal: weightGoal ? parseFloat((currentWeight - weightGoal).toFixed(1)) : null,
				weeklyChange: weekAgoEntry
					? parseFloat((currentWeight - weekAgoEntry.weight).toFixed(1))
					: null,
				monthlyChange: monthAgoEntry
					? parseFloat((currentWeight - monthAgoEntry.weight).toFixed(1))
					: null,
				totalEntries: weights.length,
				firstEntry: weights[weights.length - 1].date,
				lastEntry: weights[0].date,
				weightUnit
			};
		}

		let weights;

		if (input.weightQueryType === 'recent') {
			weights = await db
				.select(weightSelect)
				.from(weightLogs)
				.where(eq(weightLogs.userId, ctx.userId))
				.orderBy(desc(weightLogs.date))
				.limit(input.limit || 10);
		} else if (input.weightQueryType === 'date_range') {
			if (!input.startDate || !input.endDate) {
				return { success: false, error: 'startDate and endDate required for date_range query' };
			}
			weights = await db
				.select(weightSelect)
				.from(weightLogs)
				.where(
					and(
						eq(weightLogs.userId, ctx.userId),
						gte(weightLogs.date, input.startDate),
						lte(weightLogs.date, input.endDate)
					)
				)
				.orderBy(desc(weightLogs.date));
		} else {
			return { success: false, error: 'Invalid weightQueryType' };
		}

		return {
			success: true,
			operation: 'query_weight' as const,
			queryType: input.weightQueryType,
			count: weights.length,
			entries: weights,
			weightUnit,
			weightGoal
		};
	}
});

export const preferences = tool({
	description: `Manage user food preferences, dietary restrictions, and nutrition goals.

OPERATIONS:
- "set_preference": Add or update a food preference. Use when learning something about the user's diet.
- "remove_preference": Remove a preference that no longer applies ("I actually like mushrooms now")
- "update_goals": Change daily calorie target or goal weight

PREFERENCE CATEGORIES:
- like: Foods they enjoy ("I love sushi")
- dislike: Foods they avoid ("I don't like mushrooms")
- allergy: Allergies ("I'm allergic to peanuts")
- dietary: Restrictions ("I'm vegetarian", "I'm doing keto")
- cuisine: Preferred cuisines ("I love Italian food")
- timing: Meal timing preferences ("I skip breakfast")
- portion: Portion preferences ("I prefer smaller meals")
- other: Anything else

Preferences are case-insensitive and deduplicated. Setting a preference that exists will update its notes.`,
	inputSchema: z.object({
		operation: z
			.enum(['set_preference', 'remove_preference', 'update_goals'])
			.describe('Operation to perform'),
		category: z
			.enum(preferenceCategoryValues)
			.optional()
			.describe('Preference category (required for set/remove_preference)'),
		value: z
			.string()
			.optional()
			.describe(
				'Preference value, e.g., "mushrooms", "vegetarian" (required for set/remove_preference)'
			),
		notes: z
			.string()
			.optional()
			.describe('Optional context, e.g., "texture issue", "religious reasons"'),
		calorieGoal: z
			.number()
			.int()
			.min(1000)
			.max(5000)
			.optional()
			.describe('New daily calorie goal (1000-5000)'),
		weightGoal: z
			.number()
			.positive()
			.max(1500)
			.optional()
			.describe("New target weight (in user's preferred unit)")
	}),
	execute: async (input, { experimental_context: context }) => {
		const ctx = getToolContext(context);
		const { operation } = input;

		if (operation === 'update_goals') {
			if (!input.calorieGoal && !input.weightGoal) {
				return {
					success: false,
					error: 'At least one goal (calorieGoal or weightGoal) must be provided'
				};
			}

			const [currentSettings] = await db
				.select()
				.from(profiles)
				.where(eq(profiles.userId, ctx.userId));

			const updateData: { calorieGoal?: number; weightGoal?: number; updatedAt: Date } = {
				updatedAt: new Date()
			};

			if (input.calorieGoal) updateData.calorieGoal = input.calorieGoal;
			if (input.weightGoal) updateData.weightGoal = input.weightGoal;

			if (currentSettings) {
				await db.update(profiles).set(updateData).where(eq(profiles.userId, ctx.userId));
			} else {
				await db.insert(profiles).values({
					userId: ctx.userId,
					calorieGoal: input.calorieGoal || 2200,
					weightGoal: input.weightGoal
				});
			}

			return {
				success: true,
				operation: 'update_goals' as const,
				updated: {
					calorieGoal: input.calorieGoal || currentSettings?.calorieGoal,
					weightGoal: input.weightGoal || currentSettings?.weightGoal
				}
			};
		}

		if (!input.category || !input.value) {
			return { success: false, error: 'category and value are required for preference operations' };
		}

		const [existing] = await db
			.select()
			.from(foodPreferences)
			.where(
				and(
					eq(foodPreferences.userId, ctx.userId),
					eq(foodPreferences.category, input.category),
					eq(foodPreferences.value, input.value.toLowerCase())
				)
			);

		if (operation === 'remove_preference') {
			if (!existing) {
				return { success: false, error: 'Preference not found' };
			}
			await db.delete(foodPreferences).where(eq(foodPreferences.id, existing.id));
			return {
				success: true,
				operation: 'remove_preference' as const,
				removed: { category: input.category, value: input.value }
			};
		}

		if (existing) {
			if (input.notes) {
				await db
					.update(foodPreferences)
					.set({ notes: input.notes, updatedAt: new Date() })
					.where(eq(foodPreferences.id, existing.id));
			}
			return {
				success: true,
				operation: 'set_preference' as const,
				already_existed: true,
				category: input.category,
				value: input.value,
				notes: input.notes
			};
		}

		await db.insert(foodPreferences).values({
			userId: ctx.userId,
			category: input.category,
			value: input.value.toLowerCase(),
			notes: input.notes
		});

		return {
			success: true,
			operation: 'set_preference' as const,
			created: true,
			category: input.category,
			value: input.value,
			notes: input.notes
		};
	}
});

export const pantry = tool({
	description: `Query and manage the user's pantry/refrigerator inventory.

OPERATIONS:
- "query": See what ingredients the user has. Filter by category or search by name.
- "add": Add a new item when user buys groceries ("I just bought chicken")
- "update": Modify an existing item's quantity or details (requires itemId)
- "delete": Remove an item when used up ("I'm out of eggs")

CATEGORIES: protein, vegetable, fruit, dairy, grain, pantry, beverage, other

For delete by name (without itemId), the tool will find and remove the first matching item.`,
	inputSchema: z.object({
		operation: z.enum(['query', 'add', 'update', 'delete']).describe('Operation to perform'),
		category: z.enum(pantryCategoryValues).optional().describe('Filter by category'),
		search: z.string().optional().describe('Search for item by name'),
		name: z
			.string()
			.max(200)
			.optional()
			.describe('Item name (required for add, optional for update)'),
		quantity: z.number().nonnegative().max(10000).optional().describe('Quantity'),
		unit: z.string().max(50).optional().describe('Unit (lbs, oz, count, etc.)'),
		itemId: z.string().optional().describe('Item ID (required for update, optional for delete)')
	}),
	execute: async (input, { experimental_context: context }) => {
		const ctx = getToolContext(context);
		const { operation } = input;

		if (operation === 'query') {
			const items = await db
				.select({
					id: pantryItems.id,
					name: pantryItems.name,
					category: pantryItems.category,
					quantity: pantryItems.quantity,
					unit: pantryItems.unit
				})
				.from(pantryItems)
				.where(eq(pantryItems.userId, ctx.userId))
				.orderBy(desc(pantryItems.createdAt));

			let filtered = items;

			if (input.category) {
				filtered = filtered.filter((item) => item.category === input.category);
			}

			if (input.search) {
				const searchLower = input.search.toLowerCase();
				filtered = filtered.filter((item) => item.name.toLowerCase().includes(searchLower));
			}

			const grouped: Record<string, typeof items> = {};
			for (const item of filtered) {
				const cat = item.category || 'other';
				if (!grouped[cat]) grouped[cat] = [];
				grouped[cat].push(item);
			}

			return {
				success: true,
				operation: 'query' as const,
				totalItems: filtered.length,
				byCategory: Object.fromEntries(
					Object.entries(grouped).map(([cat, catItems]) => [
						cat,
						catItems.map((i) => ({
							id: i.id,
							name: i.name,
							quantity: i.quantity,
							unit: i.unit
						}))
					])
				)
			};
		}

		if (operation === 'delete') {
			if (input.itemId) {
				const [deleted] = await db
					.delete(pantryItems)
					.where(and(eq(pantryItems.id, input.itemId), eq(pantryItems.userId, ctx.userId)))
					.returning();

				if (!deleted) {
					return { success: false, error: 'Item not found' };
				}

				return {
					success: true,
					operation: 'delete' as const,
					deleted: { id: deleted.id, name: deleted.name }
				};
			} else if (input.name) {
				const [existing] = await db
					.select()
					.from(pantryItems)
					.where(and(eq(pantryItems.userId, ctx.userId), like(pantryItems.name, `%${input.name}%`)))
					.limit(1);

				if (!existing) {
					return { success: false, error: `Item "${input.name}" not found in pantry` };
				}

				await db.delete(pantryItems).where(eq(pantryItems.id, existing.id));

				return {
					success: true,
					operation: 'delete' as const,
					deleted: { id: existing.id, name: existing.name }
				};
			} else {
				return { success: false, error: 'Either itemId or name is required for delete' };
			}
		}

		if (operation === 'update') {
			if (!input.itemId) {
				return { success: false, error: 'itemId is required for update' };
			}

			const updateData: Record<string, unknown> = { updatedAt: new Date() };
			if (input.name) updateData.name = input.name;
			if (input.category) updateData.category = input.category;
			if (input.quantity !== undefined) updateData.quantity = input.quantity;
			if (input.unit !== undefined) updateData.unit = input.unit;

			const [updated] = await db
				.update(pantryItems)
				.set(updateData)
				.where(and(eq(pantryItems.id, input.itemId), eq(pantryItems.userId, ctx.userId)))
				.returning();

			if (!updated) {
				return { success: false, error: 'Item not found' };
			}

			return {
				success: true,
				operation: 'update' as const,
				updated: {
					id: updated.id,
					name: updated.name,
					category: updated.category,
					quantity: updated.quantity,
					unit: updated.unit
				}
			};
		}

		if (!input.name) {
			return { success: false, error: 'name is required for add' };
		}

		const [newItem] = await db
			.insert(pantryItems)
			.values({
				userId: ctx.userId,
				name: input.name,
				category: input.category,
				quantity: input.quantity,
				unit: input.unit
			})
			.returning();

		return {
			success: true,
			operation: 'add' as const,
			added: {
				id: newItem.id,
				name: newItem.name,
				category: newItem.category,
				quantity: newItem.quantity,
				unit: newItem.unit
			}
		};
	}
});

const DEFAULT_SHOPPING_LIST_NAME = 'Shopping List';

export const shoppingList = tool({
	description: `Manage shopping lists and items.

OPERATIONS:
- "query": View all shopping lists with their items
- "create_list": Create a new shopping list ("create a Costco list")
- "rename_list": Rename an existing list (requires listId)
- "delete_list": Delete a list and all its items (requires listId)
- "add_items": Add items to a list. If no listName specified, uses "Shopping List" (created if needed)
- "remove_items": Remove items by ID or name
- "mark_bought": Mark items as bought and optionally add them to pantry

For add_items, provide an array of items with name, optional category, quantity, and unit.`,
	inputSchema: z.object({
		operation: z
			.enum([
				'query',
				'create_list',
				'rename_list',
				'delete_list',
				'add_items',
				'remove_items',
				'mark_bought'
			])
			.describe('Operation to perform'),
		listId: z.string().optional().describe('List ID for list operations'),
		listName: z
			.string()
			.max(100)
			.optional()
			.describe('List name (for query filter, create, rename, or add_items)'),
		items: z
			.array(
				z.object({
					name: z.string().max(200).describe('Item name'),
					category: z.enum(pantryCategoryValues).optional().describe('Category'),
					quantity: z.number().positive().optional().describe('Quantity'),
					unit: z.string().max(50).optional().describe('Unit')
				})
			)
			.optional()
			.describe('Items to add (for add_items operation)'),
		itemIds: z.array(z.string()).optional().describe('Item IDs to remove or mark bought'),
		itemNames: z.array(z.string()).optional().describe('Item names to search and remove'),
		addToPantry: z
			.boolean()
			.optional()
			.default(true)
			.describe('Add bought items to pantry (default: true)')
	}),
	execute: async (input, { experimental_context: context }) => {
		const ctx = getToolContext(context);
		const { operation } = input;

		if (operation === 'query') {
			const lists = await db
				.select()
				.from(shoppingLists)
				.where(eq(shoppingLists.userId, ctx.userId))
				.orderBy(desc(shoppingLists.updatedAt));

			let filteredLists = lists;
			if (input.listName) {
				filteredLists = lists.filter((l) =>
					l.name.toLowerCase().includes(input.listName!.toLowerCase())
				);
			}

			const listsWithItems = await Promise.all(
				filteredLists.map(async (list) => {
					const items = await db
						.select({
							id: shoppingListItems.id,
							name: shoppingListItems.name,
							category: shoppingListItems.category,
							quantity: shoppingListItems.quantity,
							unit: shoppingListItems.unit,
							checked: shoppingListItems.checked
						})
						.from(shoppingListItems)
						.where(eq(shoppingListItems.listId, list.id))
						.orderBy(shoppingListItems.checked, desc(shoppingListItems.createdAt));

					return {
						id: list.id,
						name: list.name,
						itemCount: items.length,
						checkedCount: items.filter((i) => i.checked).length,
						items
					};
				})
			);

			return {
				success: true,
				operation: 'query' as const,
				totalLists: listsWithItems.length,
				lists: listsWithItems
			};
		}

		if (operation === 'create_list') {
			if (!input.listName) {
				return { success: false, error: 'listName is required for create_list' };
			}

			const [newList] = await db
				.insert(shoppingLists)
				.values({
					userId: ctx.userId,
					name: input.listName
				})
				.returning();

			return {
				success: true,
				operation: 'create_list' as const,
				created: { id: newList.id, name: newList.name }
			};
		}

		if (operation === 'rename_list') {
			if (!input.listId || !input.listName) {
				return { success: false, error: 'listId and listName are required for rename_list' };
			}

			const [updated] = await db
				.update(shoppingLists)
				.set({ name: input.listName, updatedAt: new Date() })
				.where(and(eq(shoppingLists.id, input.listId), eq(shoppingLists.userId, ctx.userId)))
				.returning();

			if (!updated) {
				return { success: false, error: 'List not found' };
			}

			return {
				success: true,
				operation: 'rename_list' as const,
				updated: { id: updated.id, name: updated.name }
			};
		}

		if (operation === 'delete_list') {
			if (!input.listId) {
				return { success: false, error: 'listId is required for delete_list' };
			}

			const [deleted] = await db
				.delete(shoppingLists)
				.where(and(eq(shoppingLists.id, input.listId), eq(shoppingLists.userId, ctx.userId)))
				.returning();

			if (!deleted) {
				return { success: false, error: 'List not found' };
			}

			return {
				success: true,
				operation: 'delete_list' as const,
				deleted: { id: deleted.id, name: deleted.name }
			};
		}

		if (operation === 'add_items') {
			if (!input.items || input.items.length === 0) {
				return { success: false, error: 'items array is required for add_items' };
			}

			const targetListName = input.listName || DEFAULT_SHOPPING_LIST_NAME;
			let [list] = await db
				.select()
				.from(shoppingLists)
				.where(and(eq(shoppingLists.userId, ctx.userId), eq(shoppingLists.name, targetListName)));

			if (!list) {
				[list] = await db
					.insert(shoppingLists)
					.values({
						userId: ctx.userId,
						name: targetListName
					})
					.returning();
			}

			const insertedItems = await db
				.insert(shoppingListItems)
				.values(
					input.items.map((item) => ({
						listId: list.id,
						name: item.name,
						category: item.category,
						quantity: item.quantity,
						unit: item.unit
					}))
				)
				.returning();

			await db
				.update(shoppingLists)
				.set({ updatedAt: new Date() })
				.where(eq(shoppingLists.id, list.id));

			return {
				success: true,
				operation: 'add_items' as const,
				listName: list.name,
				addedCount: insertedItems.length,
				items: insertedItems.map((i) => ({
					id: i.id,
					name: i.name,
					category: i.category,
					quantity: i.quantity,
					unit: i.unit
				}))
			};
		}

		if (operation === 'remove_items') {
			if (!input.itemIds?.length && !input.itemNames?.length) {
				return { success: false, error: 'Must provide itemIds or itemNames' };
			}

			const removed: { id: string; name: string }[] = [];

			if (input.itemIds?.length) {
				for (const itemId of input.itemIds) {
					const [item] = await db
						.select({ item: shoppingListItems, list: shoppingLists })
						.from(shoppingListItems)
						.innerJoin(shoppingLists, eq(shoppingListItems.listId, shoppingLists.id))
						.where(and(eq(shoppingListItems.id, itemId), eq(shoppingLists.userId, ctx.userId)));

					if (item) {
						await db.delete(shoppingListItems).where(eq(shoppingListItems.id, itemId));
						removed.push({ id: item.item.id, name: item.item.name });
					}
				}
			}

			if (input.itemNames?.length) {
				for (const itemName of input.itemNames) {
					const items = await db
						.select({ item: shoppingListItems, list: shoppingLists })
						.from(shoppingListItems)
						.innerJoin(shoppingLists, eq(shoppingListItems.listId, shoppingLists.id))
						.where(
							and(
								eq(shoppingLists.userId, ctx.userId),
								like(shoppingListItems.name, `%${itemName}%`),
								input.listName ? eq(shoppingLists.name, input.listName) : undefined
							)
						);

					for (const item of items) {
						await db.delete(shoppingListItems).where(eq(shoppingListItems.id, item.item.id));
						removed.push({ id: item.item.id, name: item.item.name });
					}
				}
			}

			return {
				success: true,
				operation: 'remove_items' as const,
				removedCount: removed.length,
				removed
			};
		}

		if (operation === 'mark_bought') {
			if (!input.itemIds?.length) {
				return { success: false, error: 'itemIds is required for mark_bought' };
			}

			const items = await db
				.select({ item: shoppingListItems, list: shoppingLists })
				.from(shoppingListItems)
				.innerJoin(shoppingLists, eq(shoppingListItems.listId, shoppingLists.id))
				.where(eq(shoppingLists.userId, ctx.userId));

			const validItems = items.filter((i) => input.itemIds!.includes(i.item.id));

			if (validItems.length === 0) {
				return { success: false, error: 'No valid items found' };
			}

			await Promise.all(
				validItems.map((i) =>
					db
						.update(shoppingListItems)
						.set({ checked: true, updatedAt: new Date() })
						.where(eq(shoppingListItems.id, i.item.id))
				)
			);

			let addedToPantry = 0;
			if (input.addToPantry !== false) {
				await db.insert(pantryItems).values(
					validItems.map((i) => ({
						userId: ctx.userId,
						name: i.item.name,
						category: i.item.category,
						quantity: i.item.quantity,
						unit: i.item.unit
					}))
				);
				addedToPantry = validItems.length;
			}

			return {
				success: true,
				operation: 'mark_bought' as const,
				markedBought: validItems.length,
				addedToPantry,
				items: validItems.map((i) => ({ id: i.item.id, name: i.item.name }))
			};
		}

		return { success: false, error: 'Invalid operation' };
	}
});

export const assistantTools = {
	suggestFood,
	meals,
	tracking,
	preferences,
	pantry,
	shoppingList
};
