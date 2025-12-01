<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="bg-background min-h-svh">
	{@render children()}
</div>
