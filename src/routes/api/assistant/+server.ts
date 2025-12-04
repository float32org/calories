import type { Message } from '$lib/messages';
import {
	assistantTools,
	buildSystemPrompt,
	type AssistantContext,
	type FoodPreference,
	type PantryCategory,
	type PantryItem
} from '$lib/server/assistant';
import { db } from '$lib/server/db';
import { gateway } from '$lib/server/gateway';
import { foodPreferences, pantryItems } from '$lib/server/schema';
import { json } from '@sveltejs/kit';
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	smoothStream,
	streamText
} from 'ai';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || !locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const userId = locals.user.id;

	try {
		const body = await request.json();
		const { messages, context } = body as {
			context: Omit<AssistantContext, 'preferences'>;
			messages: Message[];
		};

		if (!context) {
			return json({ error: 'Context is required' }, { status: 400 });
		}

		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			return json({ error: 'Messages are required' }, { status: 400 });
		}

		const [userPreferences, userPantry] = await Promise.all([
			db.select().from(foodPreferences).where(eq(foodPreferences.userId, userId)),
			db.select().from(pantryItems).where(eq(pantryItems.userId, userId))
		]);

		const preferences: FoodPreference[] = userPreferences.map((p) => ({
			id: p.id,
			category: p.category as FoodPreference['category'],
			value: p.value,
			notes: p.notes
		}));

		const pantry: PantryItem[] = userPantry.map((p) => ({
			id: p.id,
			name: p.name,
			category: p.category as PantryCategory | null,
			quantity: p.quantity,
			unit: p.unit
		}));

		const fullContext: AssistantContext = {
			...context,
			preferences,
			pantry
		};

		const systemPrompt = buildSystemPrompt(fullContext);

		return createUIMessageStreamResponse({
			stream: createUIMessageStream<Message>({
				execute: async ({ writer }) => {
					const result = streamText({
						model: gateway('anthropic/claude-haiku-4.5'),
						providerOptions: {
							anthropic: {
								thinking: { type: 'enabled', budgetTokens: 12000 }
							}
						},
						system: systemPrompt,
						messages: convertToModelMessages(messages),
						tools: assistantTools,
						experimental_context: { userId },
						experimental_transform: smoothStream({ chunking: 'word' })
					});

					result.consumeStream();

					writer.merge(result.toUIMessageStream());
				},
				onError: (error) => {
					console.error('Assistant stream error:', error);
					return 'An unexpected error occurred. Please try again.';
				}
			})
		});
	} catch (error) {
		console.error('Assistant API error:', error);
		return json({ error: 'Failed to process request' }, { status: 500 });
	}
};
