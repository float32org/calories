<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import ListIcon from '@lucide/svelte/icons/list';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	type ShoppingItem = {
		id: string;
		name: string;
		category?: string | null;
		quantity?: number | null;
		unit?: string | null;
		checked?: boolean;
	};

	type ShoppingListData = {
		id: string;
		name: string;
		itemCount: number;
		checkedCount: number;
		items: ShoppingItem[];
	};

	type ShoppingListOutput = {
		success: boolean;
		operation?:
			| 'query'
			| 'create_list'
			| 'rename_list'
			| 'delete_list'
			| 'add_items'
			| 'remove_items'
			| 'mark_bought';
		totalLists?: number;
		lists?: ShoppingListData[];
		created?: { id: string; name: string };
		updated?: { id: string; name: string };
		deleted?: { id: string; name: string };
		listName?: string;
		addedCount?: number;
		items?: Array<{
			id: string;
			name: string;
			category?: string | null;
			quantity?: number | null;
			unit?: string | null;
		}>;
		removedCount?: number;
		removed?: Array<{ id: string; name: string }>;
		markedBought?: number;
		addedToPantry?: number;
		error?: string;
	};

	let { output }: { output: ShoppingListOutput } = $props();
</script>

{#if output.error}
	<div class="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
		{output.error}
	</div>
{:else if output.operation === 'create_list' && output.created}
	<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
		<PlusIcon class="size-4 text-emerald-500" />
		<span class="text-muted-foreground">Created list</span>
		<span class="font-medium">{output.created.name}</span>
	</div>
{:else if output.operation === 'rename_list' && output.updated}
	<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
		<PencilIcon class="size-4 text-muted-foreground" />
		<span class="text-muted-foreground">Renamed to</span>
		<span class="font-medium">{output.updated.name}</span>
	</div>
{:else if output.operation === 'delete_list' && output.deleted}
	<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
		<Trash2Icon class="size-4 text-muted-foreground" />
		<span class="text-muted-foreground">Deleted list</span>
		<span class="font-medium">{output.deleted.name}</span>
	</div>
{:else if output.operation === 'add_items' && output.items}
	<div class="mt-2 overflow-hidden rounded-xl border bg-card shadow-sm">
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
			<span class="flex items-center gap-2 text-sm font-medium">
				<PlusIcon class="size-4 text-emerald-500" />
				Added to {output.listName}
			</span>
			<span class="text-xs text-muted-foreground">{output.addedCount} items</span>
		</div>
		<div class="divide-y divide-border">
			{#each output.items.slice(0, 5) as item (item.id)}
				<div class="flex items-center gap-3 px-3 py-2">
					<div class="flex size-6 shrink-0 items-center justify-center rounded bg-muted/50">
						<ShoppingCartIcon class="size-3 text-muted-foreground/50" />
					</div>
					<span class="text-sm">{item.name}</span>
					{#if item.quantity && item.unit}
						<span class="text-xs text-muted-foreground">
							{item.quantity}
							{item.unit}
						</span>
					{/if}
				</div>
			{/each}
			{#if output.items.length > 5}
				<div class="bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
					+{output.items.length - 5} more
				</div>
			{/if}
		</div>
	</div>
{:else if output.operation === 'remove_items' && output.removed}
	<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
		<Trash2Icon class="size-4 text-muted-foreground" />
		<span class="text-muted-foreground"
			>Removed {output.removedCount} item{output.removedCount !== 1 ? 's' : ''}</span
		>
	</div>
{:else if output.operation === 'mark_bought' && output.markedBought}
	<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
		<CheckIcon class="size-4 text-emerald-500" />
		<span class="text-muted-foreground">
			Marked {output.markedBought} item{output.markedBought !== 1 ? 's' : ''} as bought
		</span>
		{#if output.addedToPantry}
			<span class="text-xs text-muted-foreground">(added to pantry)</span>
		{/if}
	</div>
{:else if output.operation === 'query' && output.lists && output.lists.length > 0}
	<div class="mt-2 overflow-hidden rounded-xl border bg-card shadow-sm">
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
			<span class="flex items-center gap-2 text-sm font-medium">
				<ListIcon class="size-4 text-muted-foreground" />
				{output.totalLists} list{output.totalLists !== 1 ? 's' : ''}
			</span>
		</div>
		<div class="divide-y divide-border">
			{#each output.lists as list (list.id)}
				<div class="px-3 py-2">
					<div class="flex items-center justify-between">
						<span class="font-medium">{list.name}</span>
						<span class="text-xs text-muted-foreground">
							{list.checkedCount}/{list.itemCount} done
						</span>
					</div>
					{#if list.items.length > 0}
						<div class="mt-1.5 flex flex-wrap gap-1">
							{#each list.items.filter((i) => !i.checked).slice(0, 4) as item (item.id)}
								<span class="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
									{item.name}
								</span>
							{/each}
							{#if list.items.filter((i) => !i.checked).length > 4}
								<span class="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
									+{list.items.filter((i) => !i.checked).length - 4}
								</span>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{:else if output.operation === 'query' && output.success}
	<div
		class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
	>
		<ListIcon class="size-4" />
		No shopping lists found
	</div>
{/if}
