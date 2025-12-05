import { command, getRequestEvent, query } from '$app/server';
import { db } from '$lib/server/db';
import { waterLogs } from '$lib/server/schema';
import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

export const updateWater = command(
	z.object({
		amount: z.number().int(),
		date: z.string()
	}),
	async (input) => {
		const { locals } = getRequestEvent();
		if (!locals.session || !locals.user) {
			return error(401, 'Unauthorized');
		}

		const [existing] = await db
			.select()
			.from(waterLogs)
			.where(and(eq(waterLogs.userId, locals.user.id), eq(waterLogs.date, input.date)));

		let log;
		if (existing) {
			const newAmount = Math.max(0, existing.amount + input.amount);
			[log] = await db
				.update(waterLogs)
				.set({ amount: newAmount, loggedAt: new Date(), updatedAt: new Date() })
				.where(eq(waterLogs.id, existing.id))
				.returning();
		} else {
			const newAmount = Math.max(0, input.amount);
			[log] = await db
				.insert(waterLogs)
				.values({
					userId: locals.user.id,
					amount: newAmount,
					date: input.date,
					loggedAt: new Date()
				})
				.returning();
		}

		return {
			id: log.id,
			amount: log.amount,
			date: log.date
		};
	}
);

export const getWaterForDate = query(z.string(), async (date) => {
	const { locals } = getRequestEvent();
	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const [entry] = await db
		.select()
		.from(waterLogs)
		.where(and(eq(waterLogs.userId, locals.user.id), eq(waterLogs.date, date)));

	if (!entry) return null;

	return {
		amount: entry.amount,
		date: entry.date
	};
});
