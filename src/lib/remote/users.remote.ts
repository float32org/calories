import { getRequestEvent, query } from '$app/server';
import { auth } from '$lib/server/auth';
import { error } from '@sveltejs/kit';

export const getSessions = query(async () => {
	const { locals, request } = getRequestEvent();

	if (!locals.session || !locals.user) {
		return error(401, 'Unauthorized');
	}

	const sessions = await auth.api.listSessions({ headers: request.headers });

	return sessions;
});
