import { env } from '$env/dynamic/private';
import { createGateway } from 'ai';

if (!env.AI_GATEWAY_API_KEY) throw new Error('AI_GATEWAY_API_KEY is not set');

export const gateway = createGateway({
	apiKey: env.AI_GATEWAY_API_KEY
});
