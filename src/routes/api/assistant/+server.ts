import type { Message } from '$lib/messages';
import { assistantTools, buildSystemPrompt, type AssistantContext } from '$lib/server/assistant';
import { openrouter } from '$lib/server/openrouter';
import { json } from '@sveltejs/kit';
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	smoothStream,
	streamText
} from 'ai';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || !locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { messages, context } = body as {
			context: AssistantContext;
			messages: Message[];
		};

		if (!context) {
			return json({ error: 'Context is required' }, { status: 400 });
		}

		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			return json({ error: 'Messages are required' }, { status: 400 });
		}

		const systemPrompt = buildSystemPrompt(context);

		return createUIMessageStreamResponse({
			stream: createUIMessageStream<Message>({
				execute: async ({ writer }) => {
					const result = streamText({
						model: openrouter.chat('google/gemini-2.5-flash-preview-09-2025'),
						system: systemPrompt,
						messages: convertToModelMessages(messages),
						tools: assistantTools,
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
