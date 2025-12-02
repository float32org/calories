<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	import { Header } from '$lib/components/header';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<div class="flex h-dvh flex-col">
	<Header user={data.user} />
	<main class="min-h-0 flex-1">
		{@render children()}
	</main>
</div>
