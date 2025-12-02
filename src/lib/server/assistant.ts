import { tool } from 'ai';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db';
import { foodPreferences } from './schema';

export const preferenceCategories = [
	'like',
	'dislike',
	'allergy',
	'dietary',
	'cuisine',
	'timing',
	'portion',
	'other'
] as const;

export type PreferenceCategory = (typeof preferenceCategories)[number];

export interface FoodPreference {
	id: string;
	category: PreferenceCategory;
	value: string;
	notes: string | null;
}

export interface AssistantContext {
	calorieGoal: number;
	caloriesConsumed: number;
	proteinConsumed: number;
	carbsConsumed: number;
	fatConsumed: number;
	preferences: FoodPreference[];
}

type ToolContext = {
	userId: string;
};

function getToolContext(context: unknown): ToolContext {
	const ctx = context as ToolContext;
	if (!ctx?.userId) {
		throw new Error('Invalid tool execution context: missing userId');
	}
	return ctx;
}

function formatPreferences(preferences: FoodPreference[]): string {
	if (preferences.length === 0) {
		return 'No preferences recorded yet.';
	}

	const grouped: Record<string, string[]> = {};
	for (const pref of preferences) {
		if (!grouped[pref.category]) {
			grouped[pref.category] = [];
		}
		const entry = pref.notes ? `${pref.value} (${pref.notes})` : pref.value;
		grouped[pref.category].push(entry);
	}

	const lines: string[] = [];
	const categoryLabels: Record<string, string> = {
		like: 'Likes',
		dislike: 'Dislikes',
		allergy: 'Allergies',
		dietary: 'Dietary restrictions',
		cuisine: 'Cuisine preferences',
		timing: 'Meal timing',
		portion: 'Portion preferences',
		other: 'Other preferences'
	};

	for (const [category, items] of Object.entries(grouped)) {
		lines.push(`- ${categoryLabels[category] || category}: ${items.join(', ')}`);
	}

	return lines.join('\n');
}

export function buildSystemPrompt(context: AssistantContext): string {
	const remaining = context.calorieGoal - context.caloriesConsumed;
	const remainingDisplay = remaining > 0 ? remaining : 0;

	return `You are a friendly, helpful food assistant for a calorie tracking app. Help users decide what to eat based on their calorie budget.

CURRENT USER STATUS:
- Daily goal: ${context.calorieGoal} kcal
- Consumed today: ${context.caloriesConsumed} kcal
- Remaining: ${remainingDisplay} kcal
- Macros eaten: ${context.proteinConsumed}g protein, ${context.carbsConsumed}g carbs, ${context.fatConsumed}g fat

USER PREFERENCES:
${formatPreferences(context.preferences)}

GUIDELINES:
1. Be friendly and conversational, but concise (mobile-friendly)
2. Ask 1-2 clarifying questions if needed (dietary restrictions, preferences, hunger level)
3. Suggest meals that fit within their remaining calorie budget and respect their preferences
4. If they're over budget, acknowledge it kindly and suggest lighter options
5. When you suggest a specific meal, use the 'suggestFood' tool to present it as a loggable item. This is the BEST way to help them.
6. If suggesting multiple options, you can use the tool for the best match, or list them and then use the tool when they make a choice.

LEARNING PREFERENCES:
- Listen for food preferences during conversation (likes, dislikes, allergies, dietary needs)
- Use 'managePreference' to create, update, or delete preferences as you learn about them
- Categories: like, dislike, allergy, dietary, cuisine, timing, portion, other
- Examples: "I hate mushrooms" → managePreference(create, dislike, "mushrooms"), "I'm vegetarian" → managePreference(create, dietary, "vegetarian")
- If they change their mind: "I actually like mushrooms now" → delete the dislike, then create a like
- Don't ask permission - just save when you learn something useful

SCOPE: You ONLY help with food, nutrition, health, fitness, and wellness topics. If asked about anything unrelated (politics, coding, math, entertainment, etc.), politely redirect: "I'm your food assistant! I can help with meal ideas, nutrition questions, or what to eat. What sounds good?"

TONE: Friendly, supportive, like a helpful friend who knows nutrition.`;
}

const suggestFood = tool({
	description: 'Suggest a food item that the user can log to their diary',
	inputSchema: z.object({
		name: z.string().describe('The name of the food or meal'),
		calories: z.number().describe('Estimated calories'),
		protein: z.number().describe('Protein in grams'),
		carbs: z.number().describe('Carbohydrates in grams'),
		fat: z.number().describe('Fat in grams')
	})
});

const managePreference = tool({
	description: `Manage user food preferences. Use this to remember or update what the user likes, dislikes, allergies, dietary restrictions, etc.

CREATE: Add a new preference when you learn something about the user.
UPDATE: Modify an existing preference (e.g., update notes or change category).
DELETE: Remove a preference when it no longer applies (e.g., "I actually like mushrooms now").`,
	inputSchema: z.object({
		operation: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
		category: z
			.enum(preferenceCategories)
			.describe(
				'Type of preference: like, dislike, allergy, dietary, cuisine, timing, portion, other'
			),
		value: z.string().describe('The preference value, e.g., "mushrooms", "vegetarian", "italian"'),
		notes: z
			.string()
			.optional()
			.describe('Optional context, e.g., "texture issue", "religious reasons"')
	}),
	execute: async (input, { experimental_context: context }) => {
		const ctx = getToolContext(context);
		const { operation, category, value, notes } = input;

		const [existing] = await db
			.select()
			.from(foodPreferences)
			.where(
				and(
					eq(foodPreferences.userId, ctx.userId),
					eq(foodPreferences.category, category),
					eq(foodPreferences.value, value.toLowerCase())
				)
			);

		if (operation === 'delete') {
			if (!existing) {
				return { success: false, error: 'Preference not found' };
			}
			await db.delete(foodPreferences).where(eq(foodPreferences.id, existing.id));
			return { success: true, deleted: true };
		}

		if (operation === 'update') {
			if (!existing) {
				return { success: false, error: 'Preference not found' };
			}
			await db
				.update(foodPreferences)
				.set({ notes, updatedAt: new Date() })
				.where(eq(foodPreferences.id, existing.id));
			return { success: true, updated: true };
		}

		// create
		if (existing) {
			// Already exists, update notes instead
			if (notes) {
				await db
					.update(foodPreferences)
					.set({ notes, updatedAt: new Date() })
					.where(eq(foodPreferences.id, existing.id));
			}
			return { success: true, already_existed: true };
		}

		await db.insert(foodPreferences).values({
			userId: ctx.userId,
			category,
			value: value.toLowerCase(),
			notes
		});

		return { success: true, created: true };
	}
});

export const assistantTools = {
	suggestFood,
	managePreference
};
