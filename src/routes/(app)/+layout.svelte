<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	import { Header } from '$lib/components/header';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<Header user={data.user} />
<main class="relative h-dvh shrink grow">
	{@render children()}
</main>
