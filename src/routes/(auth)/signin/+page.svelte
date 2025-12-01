<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { signIn } from '$lib/auth';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Field, FieldGroup } from '$lib/components/ui/field/index.js';
	import HamburgerIcon from '@lucide/svelte/icons/hamburger';
	import { toast } from 'svelte-sonner';

	let isLoading = $state(false);

	const redirectTo = $derived(page.url.searchParams.get('redirect'));

	async function handleGoogleSignIn() {
		isLoading = true;
		try {
			await signIn.social({ provider: 'google', callbackURL: redirectTo || '/' });
		} catch {
			toast.error('Unable to sign in, please try again.');
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign in to Calories</title>
	<meta name="description" content="Sign in to your Calories account to continue" />
</svelte:head>

<div class="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
	<div class="flex w-full max-w-sm flex-col gap-6">
		<a href={resolve('/')} class="flex items-center gap-2 self-center font-medium">
			<div
				class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
			>
				<HamburgerIcon class="size-4" />
			</div>
			Calories
		</a>

		<div class="flex flex-col gap-6">
			<Card>
				<CardHeader class="text-center">
					<CardTitle class="text-xl">Welcome back</CardTitle>
					<CardDescription>Login with your Google account</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<Field>
							<Button
								variant="outline"
								type="button"
								disabled={isLoading}
								onclick={handleGoogleSignIn}
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
									<path
										d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
										fill="currentColor"
									/>
								</svg>
								Login with Google
							</Button>
						</Field>
					</FieldGroup>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
