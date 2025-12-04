import { isHostedMode } from '$lib/server/access';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	if (user?.onboardingCompleted) {
		if (isHostedMode()) {
			throw redirect(302, '/checkout');
		}
		throw redirect(302, '/');
	}
};
