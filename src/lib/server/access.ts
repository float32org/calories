import { env } from '$env/dynamic/private';

export function isHostedMode(): boolean {
	return env.HOSTED_MODE === 'true';
}
