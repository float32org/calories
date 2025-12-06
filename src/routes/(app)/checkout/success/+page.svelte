<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { subscription } from '$lib/auth';
	import { Button } from '$lib/components/ui/button';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import HamburgerIcon from '@lucide/svelte/icons/hamburger';
	import { onMount } from 'svelte';

	let status = $state<'loading' | 'success' | 'pending'>('loading');

	async function checkSubscriptionStatus() {
		for (let i = 0; i < 10; i++) {
			const result = await subscription.list();
			const activeSub = result.data?.find((s) => s.status === 'active' || s.status === 'trialing');

			if (activeSub) {
				status = 'success';
				return;
			}
			await new Promise((r) => setTimeout(r, 1000));
		}
		status = 'pending';
	}

	function handleContinue() {
		goto(resolve('/'));
	}

	onMount(() => {
		checkSubscriptionStatus();
	});
</script>

<svelte:head>
	<title>Subscription Active - Calories</title>
	<meta name="description" content="Your subscription is now active" />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex h-full flex-col bg-background">
	<div class="mx-auto flex h-full w-full max-w-md flex-col items-center px-6 pt-20 sm:pt-32">
		<div class="flex w-full flex-col items-center gap-8">
			<a href={resolve('/')} class="flex flex-col items-center gap-4">
				<div
					class="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-3xl shadow-sm"
				>
					<HamburgerIcon class="size-8" />
				</div>
			</a>
			<div
				class="flex w-full flex-col gap-6 rounded-3xl border border-border/50 bg-card/50 p-6 shadow-sm sm:p-8"
			>
				{#if status === 'loading'}
					<div class="flex flex-col items-center gap-4 py-4">
						<div
							class="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
						></div>
						<p class="text-sm text-muted-foreground">Activating your subscription...</p>
					</div>
				{:else if status === 'success'}
					<div class="flex flex-col items-center gap-4">
						<div class="flex size-16 items-center justify-center rounded-full bg-green-500/10">
							<CheckCircleIcon class="size-8 text-green-500" />
						</div>
						<div class="space-y-1 text-center">
							<h2 class="text-lg font-bold">Welcome to Calories Pro!</h2>
							<p class="text-sm text-muted-foreground">Your 7-day free trial has started. Enjoy!</p>
						</div>
					</div>
					<Button
						class="h-12 w-full rounded-xl font-bold transition-all"
						type="button"
						onclick={handleContinue}
					>
						Get Started
					</Button>
				{:else}
					<div class="flex flex-col items-center gap-4">
						<div class="space-y-1 text-center">
							<h2 class="text-lg font-bold">Processing Subscription</h2>
							<p class="text-sm text-muted-foreground">
								Your subscription is being set up. This may take a moment.
							</p>
						</div>
					</div>
					<Button
						class="h-12 w-full rounded-xl font-bold transition-all"
						type="button"
						onclick={checkSubscriptionStatus}
					>
						Check Again
					</Button>
				{/if}
			</div>
		</div>
	</div>
</div>
