import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const authHandler: Handle = async ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building });
};

const authRedirect: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session) {
		if (event.url.pathname === '/signin') {
			return redirect(303, '/');
		}
		event.locals.session = session.session;
		event.locals.user = session.user;
	} else if (event.url.pathname !== '/signin') {
		return redirect(303, '/signin');
	}

	return await resolve(event);
};

export const handle = sequence(authHandler, authRedirect);
