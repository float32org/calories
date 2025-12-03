import { env } from '$env/dynamic/private';

export function isHostedMode(): boolean {
	return env.HOSTED_MODE === 'true';
}

export function hasAccess(paid: boolean): boolean {
	if (!isHostedMode()) return true;
	return paid === true;
}
