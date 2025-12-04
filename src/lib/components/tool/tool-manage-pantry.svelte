<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	type ManagePantryInput = {
		operation: 'add' | 'update' | 'delete';
		name: string;
		quantity?: number;
		unit?: string;
	};

	type ManagePantryOutput = {
		success: boolean;
		added?: {
			id: string;
			name: string;
			category?: string | null;
			quantity?: number | null;
			unit?: string | null;
		};
		updated?: {
			id: string;
			name: string;
			category?: string | null;
			quantity?: number | null;
			unit?: string | null;
		};
		deleted?: { id: string; name: string };
		error?: string;
	};

	let {
		input,
		output
	}: {
		input: ManagePantryInput;
		output?: ManagePantryOutput;
	} = $props();
</script>

{#if output?.error}
	<div class="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
		{output.error}
	</div>
{:else if output?.success}
	<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
		{#if input.operation === 'delete'}
			<Trash2Icon class="size-4 text-muted-foreground" />
			<span class="text-muted-foreground">Removed</span>
		{:else if input.operation === 'update'}
			<PencilIcon class="size-4 text-muted-foreground" />
			<span class="text-muted-foreground">Updated</span>
		{:else}
			<CheckIcon class="size-4 text-emerald-500" />
			<span class="text-muted-foreground">Added</span>
		{/if}
		<span class="font-medium">{input.name}</span>
		{#if input.quantity && input.unit}
			<span
				class="flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-muted-foreground"
			>
				{input.quantity}
				{input.unit}
			</span>
		{/if}
	</div>
{/if}
