import { env } from '$env/dynamic/private';
import { createGateway } from 'ai';

export const gateway = createGateway({
	apiKey: env.AI_GATEWAY_API_KEY
});
