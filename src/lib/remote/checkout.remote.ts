import { command, getRequestEvent, query } from '$app/server';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { isHostedMode } from '$lib/server/access';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

export const getPaymentStatus = query(async () => {
	const { locals } = getRequestEvent();

	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	if (!isHostedMode()) {
		return { paid: true, required: false };
	}

	const userSettings = await db.query.settings.findFirst({
		where: eq(settings.userId, locals.user.id)
	});

	return {
		paid: userSettings?.paid ?? false,
		required: true
	};
});

export const createCheckoutSession = command(async () => {
	const { locals } = getRequestEvent();

	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	if (!isHostedMode()) {
		return error(400, 'Payments not enabled in self-hosted mode');
	}

	if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
		return error(500, 'Stripe not configured');
	}

	const stripe = new Stripe(env.STRIPE_SECRET_KEY);

	const userSettings = await db.query.settings.findFirst({
		where: eq(settings.userId, locals.user.id)
	});

	if (userSettings?.paid) {
		return error(400, 'Already paid');
	}

	let customerId = userSettings?.stripeCustomerId;
	if (!customerId) {
		const customer = await stripe.customers.create({
			email: locals.user.email,
			name: locals.user.name,
			metadata: {
				userId: locals.user.id
			}
		});
		customerId = customer.id;

		if (userSettings) {
			await db
				.update(settings)
				.set({ stripeCustomerId: customerId, updatedAt: new Date() })
				.where(eq(settings.userId, locals.user.id));
		} else {
			await db.insert(settings).values({
				userId: locals.user.id,
				stripeCustomerId: customerId
			});
		}
	}

	const session = await stripe.checkout.sessions.create({
		customer: customerId,
		mode: 'payment',
		line_items: [
			{
				price: env.STRIPE_PRICE_ID,
				quantity: 1
			}
		],
		success_url: `${publicEnv.PUBLIC_BASE_URL}/checkout/success`,
		cancel_url: `${publicEnv.PUBLIC_BASE_URL}/checkout`,
		metadata: {
			userId: locals.user.id
		}
	});

	return { url: session.url };
});
