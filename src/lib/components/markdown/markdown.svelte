<script lang="ts">
	import { cn } from '$lib/utils/ui';
	import SvelteMarkdown from '@humanspeak/svelte-markdown';

	let { source, class: className }: { source: string; class?: string } = $props();
</script>

<div class={cn('prose max-w-none', className)}>
	<SvelteMarkdown {source} />
</div>
