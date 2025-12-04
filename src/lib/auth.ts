import { env } from '$env/dynamic/public';

import { stripeClient } from '@better-auth/stripe/client';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/svelte';
import type { auth } from './server/auth';

export const client = createAuthClient({
	baseURL: env.PUBLIC_BASE_URL,
	plugins: [inferAdditionalFields<typeof auth>(), stripeClient({ subscription: true })]
});

export const { signIn, signOut, deleteUser, subscription } = client;

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export type User = NonNullable<AuthSession>['user'];
export type Session = NonNullable<AuthSession>['session'];
