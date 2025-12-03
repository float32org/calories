<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	import OnboardingDialog from '$lib/components/dialog/dialog-onboarding.svelte';
	import { Header } from '$lib/components/header';
	import { getSettings } from '$lib/remote/settings.remote';
	import { getLatestWeight } from '$lib/remote/weight.remote';
	import { assistantOpen, settingsOpen } from '$lib/stores/ui.store';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const initialSettings = await getSettings();

	let isOnboardingOpen = $state(!initialSettings.onboardingCompleted);
</script>

<div class="flex h-dvh flex-col">
	<Header
		user={data.user}
		onSettingsClick={() => settingsOpen.set(true)}
		onAssistantClick={() => assistantOpen.set(true)}
	/>
	<main class="min-h-0 flex-1">
		{@render children()}
	</main>
</div>

<OnboardingDialog
	bind:open={isOnboardingOpen}
	onComplete={() => {
		getSettings().refresh();
		getLatestWeight().refresh();
	}}
/>
