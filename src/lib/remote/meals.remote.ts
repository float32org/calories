import { command, getRequestEvent, query } from '$app/server';
import { MIME_TO_EXT } from '$lib/constants/mime';
import { analyzeMealFromImage, analyzeMealFromText } from '$lib/server/ai';
import { db } from '$lib/server/db';
import { aiLimiter } from '$lib/server/ratelimit';
import { mealLogs } from '$lib/server/schema';
import {
	deleteImage,
	getImageBuffer,
	getPresignedUploadUrl,
	getPresignedUrl,
	imageExists
} from '$lib/server/storage';
import { error } from '@sveltejs/kit';
import { and, desc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';

const nutritionFieldsSchema = z.object({
	calories: z.number().int().positive().max(50000),
	protein: z.number().int().nonnegative().max(5000).optional(),
	carbs: z.number().int().nonnegative().max(5000).optional(),
	fat: z.number().int().nonnegative().max(5000).optional()
});

const mealFieldsSchema = nutritionFieldsSchema.extend({
	name: z.string().min(1).max(200),
	servings: z.number().positive().max(100).default(1)
});

type MealLog = typeof mealLogs.$inferSelect;

export interface MealResponse {
	id: string;
	name: string;
	servings: number;
	calories: number;
	protein: number | null;
	carbs: number | null;
	fat: number | null;
	date: string;
	timestamp: number;
}

function mealToResponse(meal: MealLog): MealResponse {
	return {
		id: meal.id,
		name: meal.name,
		servings: meal.servings,
		calories: meal.calories,
		protein: meal.protein,
		carbs: meal.carbs,
		fat: meal.fat,
		date: meal.date,
		timestamp: meal.loggedAt.getTime()
	};
}

export const getImageUploadUrl = command(z.object({ mimeType: z.string() }), async (input) => {
	const { locals } = getRequestEvent();
	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const ext = MIME_TO_EXT[input.mimeType] || 'jpg';
	const timestamp = Date.now();
	const imageKey = `temp/${locals.user.id}/${timestamp}.${ext}`;
	const uploadUrl = getPresignedUploadUrl(imageKey);
	const downloadUrl = getPresignedUrl(imageKey, 86400);

	return { imageKey, uploadUrl, downloadUrl };
});

export const analyzeMealImage = command(
	z.object({
		imageKey: z.string(),
		mimeType: z.string().default('image/jpeg')
	}),
	async (input) => {
		const event = getRequestEvent();
		if (!event.locals.session || !event.locals.user) {
			return error(401, 'Unauthorized');
		}

		if (await aiLimiter.isLimited(event)) {
			return error(429, 'Too many requests. Please try again later.');
		}

		if (!input.imageKey.startsWith(`temp/${event.locals.user.id}/`)) {
			return error(403, 'Invalid image key');
		}

		try {
			const exists = await imageExists(input.imageKey);
			if (!exists) {
				return error(404, 'Image not found. Please try uploading again.');
			}

			const imageBuffer = await getImageBuffer(input.imageKey);
			const base64Data = imageBuffer.toString('base64');

			const analysis = await analyzeMealFromImage(base64Data, input.mimeType);
			await deleteImage(input.imageKey);

			if (!analysis.isFood) {
				return error(
					400,
					analysis.rejectionReason ||
						'This does not appear to be food. Please upload a photo of your meal.'
				);
			}

			return {
				name: analysis.name,
				calories: analysis.calories,
				protein: analysis.protein,
				carbs: analysis.carbs,
				fat: analysis.fat,
				isNutritionLabel: analysis.isNutritionLabel,
				servingSize: analysis.servingSize,
				servingQuantity: analysis.servingQuantity,
				servingUnit: analysis.servingUnit
			};
		} catch (err) {
			console.error('Meal analysis failed:', err);
			return error(500, 'Failed to analyze meal. Please try again.');
		}
	}
);

export const deleteUploadedImage = command(
	z.object({
		imageKey: z.string()
	}),
	async (input) => {
		const { locals } = getRequestEvent();
		if (!locals.session || !locals.user) {
			return error(401, 'Unauthorized');
		}

		if (!input.imageKey.startsWith(`temp/${locals.user.id}/`)) {
			return error(403, 'Invalid image key');
		}

		try {
			await deleteImage(input.imageKey);
			return { success: true };
		} catch (err) {
			console.error('Failed to delete uploaded image:', err);
			return error(500, 'Failed to delete image');
		}
	}
);

export const analyzeMealText = command(
	z.object({
		description: z.string().min(3)
	}),
	async (input) => {
		const event = getRequestEvent();
		if (!event.locals.session || !event.locals.user) {
			return error(401, 'Unauthorized');
		}

		if (await aiLimiter.isLimited(event)) {
			return error(429, 'Too many requests. Please try again later.');
		}

		try {
			const analysis = await analyzeMealFromText(input.description);
			if (!analysis.isFood) {
				return error(
					400,
					analysis.rejectionReason || 'This does not appear to be a valid food description.'
				);
			}

			return {
				name: analysis.name,
				calories: analysis.calories,
				protein: analysis.protein,
				carbs: analysis.carbs,
				fat: analysis.fat,
				isNutritionLabel: false
			};
		} catch (err) {
			console.error('Meal text analysis failed:', err);
			return error(500, 'Failed to analyze meal description. Please try again.');
		}
	}
);

export const addMeal = command(
	mealFieldsSchema.extend({
		date: z.string(),
		loggedAt: z.string().optional()
	}),
	async (input) => {
		const { locals } = getRequestEvent();
		if (!locals.session || !locals.user) {
			return error(401, 'Unauthorized');
		}

		const loggedAt = input.loggedAt ? new Date(input.loggedAt) : new Date();

		const [meal] = await db
			.insert(mealLogs)
			.values({
				userId: locals.user.id,
				name: input.name,
				servings: input.servings,
				calories: input.calories,
				protein: input.protein,
				carbs: input.carbs,
				fat: input.fat,
				date: input.date,
				loggedAt
			})
			.returning();

		return mealToResponse(meal);
	}
);

export const deleteMeal = command(z.string().uuid(), async (id) => {
	const { locals } = getRequestEvent();
	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const [deleted] = await db
		.delete(mealLogs)
		.where(and(eq(mealLogs.id, id), eq(mealLogs.userId, locals.user.id)))
		.returning();

	if (!deleted) {
		return error(404, 'Meal not found');
	}

	return { success: true };
});

export const updateMeal = command(mealFieldsSchema.extend({ id: z.uuid() }), async (input) => {
	const { locals } = getRequestEvent();
	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const [updatedMeal] = await db
		.update(mealLogs)
		.set({
			name: input.name,
			servings: input.servings,
			calories: input.calories,
			protein: input.protein,
			carbs: input.carbs,
			fat: input.fat
		})
		.where(and(eq(mealLogs.id, input.id), eq(mealLogs.userId, locals.user.id)))
		.returning();

	if (!updatedMeal) {
		return error(404, 'Meal not found');
	}

	return mealToResponse(updatedMeal);
});

export const getMeals = query(async () => {
	const { locals } = getRequestEvent();

	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const meals = await db
		.select()
		.from(mealLogs)
		.where(eq(mealLogs.userId, locals.user.id))
		.orderBy(desc(mealLogs.loggedAt));

	return meals.map(mealToResponse);
});

export const getFrequentMeals = query(async () => {
	const { locals } = getRequestEvent();

	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

	const meals = await db
		.select()
		.from(mealLogs)
		.where(and(eq(mealLogs.userId, locals.user.id), gte(mealLogs.loggedAt, thirtyDaysAgo)))
		.orderBy(desc(mealLogs.loggedAt));

	const frequency: Record<string, { meal: MealLog; count: number }> = {};
	for (const meal of meals) {
		const key = meal.name.toLowerCase().trim();
		if (!frequency[key]) {
			frequency[key] = { meal, count: 1 };
		} else {
			frequency[key].count++;
		}
	}

	return Object.values(frequency)
		.sort((a, b) => b.count - a.count || b.meal.loggedAt.getTime() - a.meal.loggedAt.getTime())
		.slice(0, 5)
		.map((f) => mealToResponse(f.meal));
});
