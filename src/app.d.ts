import type { Session, User } from '$lib/auth';

declare global {
	namespace App {
		interface Locals {
			user: User | undefined;
			session: Session | undefined;
		}
	}
}

export {};
