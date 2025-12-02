<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	type PreferenceInput = {
		operation: 'create' | 'update' | 'delete';
		category: string;
		value: string;
		notes?: string;
	};

	type PreferenceOutput = {
		success: boolean;
		created?: boolean;
		updated?: boolean;
		deleted?: boolean;
		already_existed?: boolean;
		error?: string;
	};

	let {
		input,
		output
	}: {
		input: PreferenceInput;
		output?: PreferenceOutput;
	} = $props();

	const categoryLabels: Record<string, string> = {
		like: 'likes',
		dislike: 'dislikes',
		allergy: 'allergy',
		dietary: 'dietary',
		cuisine: 'cuisine',
		timing: 'timing',
		portion: 'portion',
		other: 'preference'
	};

	const config = $derived.by(() => {
		if (input.operation === 'delete') {
			return { icon: TrashIcon, label: 'Removed', color: 'text-amber-500' };
		}
		if (input.operation === 'update') {
			return { icon: PencilIcon, label: 'Updated', color: 'text-blue-500' };
		}
		return { icon: CheckIcon, label: 'Saved', color: 'text-emerald-500' };
	});

	const categoryLabel = $derived(categoryLabels[input.category] || input.category);
</script>

<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
	<config.icon class="size-4 {config.color}" />
	<span class="text-muted-foreground">
		{config.label}
		<span class="text-foreground font-medium">{categoryLabel}:</span>
		{input.value}
	</span>
	{#if input.notes}
		<span class="text-muted-foreground text-xs">({input.notes})</span>
	{/if}
	{#if output?.error}
		<span class="text-destructive text-xs">- {output.error}</span>
	{/if}
</div>
