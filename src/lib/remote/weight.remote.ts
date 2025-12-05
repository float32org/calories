import { command, getRequestEvent, query } from '$app/server';
import { db } from '$lib/server/db';
import { weightLogs } from '$lib/server/schema';
import { error } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

export const logWeight = command(
	z.object({
		weight: z.number().positive(),
		date: z.string()
	}),
	async (input) => {
		const { locals } = getRequestEvent();
		if (!locals.session || !locals.user) {
			return error(401, 'Unauthorized');
		}

		const [existing] = await db
			.select()
			.from(weightLogs)
			.where(and(eq(weightLogs.userId, locals.user.id), eq(weightLogs.date, input.date)));

		let log;
		if (existing) {
			[log] = await db
				.update(weightLogs)
				.set({ weight: input.weight, loggedAt: new Date(), updatedAt: new Date() })
				.where(eq(weightLogs.id, existing.id))
				.returning();
		} else {
			[log] = await db
				.insert(weightLogs)
				.values({
					userId: locals.user.id,
					weight: input.weight,
					date: input.date,
					loggedAt: new Date()
				})
				.returning();
		}

		return {
			id: log.id,
			weight: log.weight,
			date: log.date,
			timestamp: log.loggedAt.getTime(),
			updated: !!existing
		};
	}
);

export const getWeightLogs = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const logs = await db
		.select()
		.from(weightLogs)
		.where(eq(weightLogs.userId, locals.user.id))
		.orderBy(desc(weightLogs.date))
		.limit(30);

	return logs.map((l) => ({
		id: l.id,
		weight: l.weight,
		date: l.date,
		timestamp: l.loggedAt.getTime()
	}));
});

export const getLatestWeight = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const [latest] = await db
		.select()
		.from(weightLogs)
		.where(eq(weightLogs.userId, locals.user.id))
		.orderBy(desc(weightLogs.date))
		.limit(1);

	if (!latest) return null;

	return {
		weight: latest.weight,
		date: latest.date
	};
});

export const getWeightForDate = query(z.string(), async (date) => {
	const { locals } = getRequestEvent();
	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const [entry] = await db
		.select()
		.from(weightLogs)
		.where(and(eq(weightLogs.userId, locals.user.id), eq(weightLogs.date, date)));

	if (!entry) return null;

	return {
		weight: entry.weight,
		date: entry.date
	};
});
