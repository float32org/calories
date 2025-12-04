<script lang="ts">
	import { PANTRY_CATEGORY_LABELS, PANTRY_CATEGORY_ORDER } from '$lib/constants';
	import RefrigeratorIcon from '@lucide/svelte/icons/refrigerator';

	type PantryItem = {
		id: string;
		name: string;
		quantity?: number | null;
		unit?: string | null;
	};

	type QueryPantryOutput = {
		success: boolean;
		totalItems: number;
		byCategory: Record<string, PantryItem[]>;
		error?: string;
	};

	let { output }: { output: QueryPantryOutput } = $props();

	const allItems = $derived(
		PANTRY_CATEGORY_ORDER.flatMap((cat) =>
			(output.byCategory[cat] || []).map((item) => ({
				...item,
				category: cat
			}))
		)
	);
</script>

{#if output.error}
	<div class="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
		{output.error}
	</div>
{:else if allItems.length > 0}
	<div class="mt-2 overflow-hidden rounded-xl border bg-card shadow-sm">
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
			<span class="flex items-center gap-2 text-sm font-medium">
				<RefrigeratorIcon class="size-4 text-muted-foreground" />
				{output.totalItems} item{output.totalItems !== 1 ? 's' : ''}
			</span>
		</div>
		<div class="divide-y divide-border">
			{#each allItems.slice(0, 8) as item (item.id)}
				<div class="flex items-center gap-3 px-3 py-2">
					<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
						<RefrigeratorIcon class="size-4 text-muted-foreground/50" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{item.name}</p>
						<p class="text-[11px] text-muted-foreground">
							{PANTRY_CATEGORY_LABELS[item.category] || item.category}
						</p>
					</div>
					{#if item.quantity != null && item.unit}
						<span
							class="rounded-md bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
						>
							{item.quantity}
							{item.unit}
						</span>
					{/if}
				</div>
			{/each}
			{#if allItems.length > 8}
				<div class="bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
					+{allItems.length - 8} more
				</div>
			{/if}
		</div>
	</div>
{:else if output.success}
	<div
		class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
	>
		<RefrigeratorIcon class="size-4" />
		Pantry is empty
	</div>
{/if}
