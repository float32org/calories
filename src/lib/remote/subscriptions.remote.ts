import { command, getRequestEvent, query } from '$app/server';
import { isHostedMode } from '$lib/server/access';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const getSubscription = query(async () => {
	const event = getRequestEvent();
	const { locals } = event;
	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	let subscriptionStatus = null;
	let trialEnd = null;
	let periodEnd = null;
	let cancelAtPeriodEnd = false;

	if (isHostedMode()) {
		const subscriptions = await auth.api.listActiveSubscriptions({
			headers: event.request.headers
		});

		const activeSubscription = subscriptions?.find(
			(sub) => sub.status === 'active' || sub.status === 'trialing'
		);

		if (activeSubscription) {
			subscriptionStatus = activeSubscription.status;
			trialEnd = activeSubscription.trialEnd;
			periodEnd = activeSubscription.periodEnd;
			cancelAtPeriodEnd = activeSubscription.cancelAtPeriodEnd ?? false;
		}
	}

	return {
		onboardingCompleted: locals.user.onboardingCompleted,
		hasActiveSubscription: subscriptionStatus === 'active' || subscriptionStatus === 'trialing',
		subscriptionStatus,
		trialEnd,
		periodEnd,
		cancelAtPeriodEnd,
		required: isHostedMode()
	};
});

export const markOnboardingComplete = command(z.void(), async () => {
	const { locals } = getRequestEvent();

	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	await db
		.update(users)
		.set({
			onboardingCompleted: true,
			updatedAt: new Date()
		})
		.where(eq(users.id, locals.user.id));

	return {
		onboardingCompleted: true
	};
});
