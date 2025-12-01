<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	import { Header } from '$lib/components/header';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<div class="flex h-dvh flex-col overflow-hidden">
	<Header user={data.user} />
	<main class="relative flex-1 overflow-hidden">
		{@render children()}
	</main>
</div>
