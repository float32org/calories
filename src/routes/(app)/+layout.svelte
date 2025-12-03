<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	import { page } from '$app/state';
	import { FoodAssistantDialog, GoalsDialog } from '$lib/components/dialog';
	import OnboardingDialog from '$lib/components/dialog/dialog-onboarding.svelte';
	import { Header } from '$lib/components/header';
	import { getProfile } from '$lib/remote/profile.remote';
	import { getSubscription } from '$lib/remote/subscriptions.remote';
	import { getLatestWeight } from '$lib/remote/weight.remote';
	import { assistantOpen, goalsOpen } from '$lib/stores/ui.store';
	import { formatDate } from '$lib/utils/format';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const initialSubscription = await getSubscription();
	let isOnboardingOpen = $state(!initialSubscription.onboardingCompleted);

	const selectedDate = $derived.by(() => {
		const dateParam = page.url.searchParams.get('d');
		if (!dateParam) return formatDate(new Date());
		const parsed = new Date(dateParam + 'T00:00:00');
		return isNaN(parsed.getTime()) ? formatDate(new Date()) : dateParam;
	});
</script>

<div class="flex h-dvh flex-col">
	<Header
		user={data.user}
		onGoalsClick={() => goalsOpen.set(true)}
		onAssistantClick={() => assistantOpen.set(true)}
	/>
	<main class="min-h-0 flex-1">
		{@render children()}
	</main>
</div>

<OnboardingDialog
	bind:open={isOnboardingOpen}
	onComplete={() => {
		getProfile().refresh();
		getSubscription().refresh();
		getLatestWeight().refresh();
	}}
/>
<GoalsDialog bind:open={$goalsOpen} />
<FoodAssistantDialog bind:open={$assistantOpen} date={selectedDate} />
