import { command, getRequestEvent, query } from '$app/server';
import { MIME_TO_EXT } from '$lib/constants/mime';
import { analyzeRecipeImage } from '$lib/server/ai';
import { db } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { aiLimiter } from '$lib/server/ratelimit';
import { recipes } from '$lib/server/schema';
import {
	deleteImage,
	getImageBuffer,
	getPresignedUploadUrl,
	imageExists
} from '$lib/server/storage';
import { error } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

const recipeIngredientSchema = z.object({
	item: z.string(),
	amount: z.string(),
	notes: z.string().optional()
});

export const getRecipeImageUploadUrl = command(
	z.object({ mimeType: z.string() }),
	async (input) => {
		const { locals } = getRequestEvent();
		if (!locals.session || !locals.user) {
			return error(401, 'Unauthorized');
		}

		const ext = MIME_TO_EXT[input.mimeType] || 'jpg';
		const timestamp = Date.now();
		const imageKey = `temp/${locals.user.id}/recipe-${timestamp}.${ext}`;
		const uploadUrl = getPresignedUploadUrl(imageKey);

		return { imageKey, uploadUrl };
	}
);

export const scanRecipeImage = command(
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

			const analysis = await analyzeRecipeImage(base64Data, input.mimeType);

			await deleteImage(input.imageKey);

			if (!analysis.isValid) {
				return error(
					400,
					analysis.rejectionReason || 'Could not extract a recipe from this image.'
				);
			}

			return {
				name: analysis.name,
				description: analysis.description,
				servings: analysis.servings,
				prepTime: analysis.prepTime,
				cookTime: analysis.cookTime,
				ingredients: analysis.ingredients,
				instructions: analysis.instructions,
				calories: analysis.calories,
				protein: analysis.protein,
				carbs: analysis.carbs,
				fat: analysis.fat,
				tips: analysis.tips
			};
		} catch (err) {
			logger.error('recipe_image_analysis_failed', {
				userId: event.locals.user.id,
				imageKey: input.imageKey,
				error: err instanceof Error ? err.message : String(err)
			});
			return error(500, 'Failed to analyze image. Please try again.');
		}
	}
);

export const saveRecipe = command(
	z.object({
		name: z.string().min(1).max(200),
		description: z.string().max(500).optional(),
		servings: z.number().int().min(1).max(20),
		prepTime: z.number().int().min(0).max(480).optional(),
		cookTime: z.number().int().min(0).max(480).optional(),
		ingredients: z.array(recipeIngredientSchema).min(1),
		instructions: z.array(z.string()).min(1),
		calories: z.number().int().min(0).max(5000),
		protein: z.number().int().min(0).max(500),
		carbs: z.number().int().min(0).max(500),
		fat: z.number().int().min(0).max(500),
		tips: z.string().max(500).optional()
	}),
	async (input) => {
		const { locals } = getRequestEvent();
		if (!locals.session || !locals.user) {
			return error(401, 'Unauthorized');
		}

		const [recipe] = await db
			.insert(recipes)
			.values({
				userId: locals.user.id,
				name: input.name,
				description: input.description,
				servings: input.servings,
				prepTime: input.prepTime,
				cookTime: input.cookTime,
				ingredients: input.ingredients,
				instructions: input.instructions,
				calories: input.calories,
				protein: input.protein,
				carbs: input.carbs,
				fat: input.fat,
				tips: input.tips
			})
			.returning();

		return {
			id: recipe.id,
			name: recipe.name,
			description: recipe.description,
			servings: recipe.servings,
			prepTime: recipe.prepTime,
			cookTime: recipe.cookTime,
			ingredients: recipe.ingredients,
			instructions: recipe.instructions,
			calories: recipe.calories,
			protein: recipe.protein,
			carbs: recipe.carbs,
			fat: recipe.fat,
			tips: recipe.tips,
			createdAt: recipe.createdAt.toISOString()
		};
	}
);

export const deleteRecipe = command(z.string().uuid(), async (id) => {
	const { locals } = getRequestEvent();
	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const [deleted] = await db
		.delete(recipes)
		.where(and(eq(recipes.id, id), eq(recipes.userId, locals.user.id)))
		.returning();

	if (!deleted) {
		return error(404, 'Recipe not found');
	}

	return { success: true };
});

export const getRecipes = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const items = await db
		.select()
		.from(recipes)
		.where(eq(recipes.userId, locals.user.id))
		.orderBy(desc(recipes.createdAt));

	return items.map((recipe) => ({
		id: recipe.id,
		name: recipe.name,
		description: recipe.description,
		servings: recipe.servings,
		prepTime: recipe.prepTime,
		cookTime: recipe.cookTime,
		ingredients: recipe.ingredients,
		instructions: recipe.instructions,
		calories: recipe.calories,
		protein: recipe.protein,
		carbs: recipe.carbs,
		fat: recipe.fat,
		tips: recipe.tips,
		createdAt: recipe.createdAt.toISOString()
	}));
});
