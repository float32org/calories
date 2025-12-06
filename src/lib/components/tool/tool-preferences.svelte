<script lang="ts">
	import { PREFERENCE_CATEGORY_LABELS_LOWER } from '$lib/constants';
	import CheckIcon from '@lucide/svelte/icons/check';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import TargetIcon from '@lucide/svelte/icons/target';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	type PreferencesOutput = {
		success: boolean;
		operation?: 'set_preference' | 'remove_preference' | 'update_goals';
		category?: string;
		value?: string;
		notes?: string;
		created?: boolean;
		already_existed?: boolean;
		removed?: { category: string; value: string };
		updated?: {
			calorieGoal?: number;
			weightGoal?: number | null;
		};
		error?: string;
	};

	type PreferencesInput = {
		operation: 'set_preference' | 'remove_preference' | 'update_goals';
		category?: string;
		value?: string;
		notes?: string;
		calorieGoal?: number;
		weightGoal?: number;
	};

	let {
		input,
		output
	}: {
		input: PreferencesInput;
		output?: PreferencesOutput;
	} = $props();

	const categoryLabel = $derived(
		input.category ? PREFERENCE_CATEGORY_LABELS_LOWER[input.category] || input.category : ''
	);
</script>

{#if output?.error}
	<div class="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
		{output.error}
	</div>
{:else if output?.operation === 'update_goals' && output.success}
	<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
		<CheckIcon class="size-4 text-emerald-500" />
		<span class="text-muted-foreground">Updated</span>
		{#if input.calorieGoal}
			<span
				class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
			>
				<FlameIcon class="size-3" />
				{input.calorieGoal} kcal
			</span>
		{/if}
		{#if input.weightGoal}
			<span
				class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
			>
				<TargetIcon class="size-3" />
				{input.weightGoal}
			</span>
		{/if}
	</div>
{:else if output?.operation === 'remove_preference' && output.success}
	<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
		<TrashIcon class="size-4 text-amber-500" />
		<span class="text-muted-foreground">
			Removed
			<span class="font-medium text-foreground">{categoryLabel}:</span>
			{input.value}
		</span>
	</div>
{:else if output?.operation === 'set_preference' && output.success}
	<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
		<CheckIcon class="size-4 text-emerald-500" />
		<span class="text-muted-foreground">
			Saved
			<span class="font-medium text-foreground">{categoryLabel}:</span>
			{input.value}
		</span>
		{#if input.notes}
			<span class="text-xs text-muted-foreground">({input.notes})</span>
		{/if}
	</div>
{:else if input.operation === 'set_preference' || input.operation === 'remove_preference'}
	<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
		<span class="text-muted-foreground">
			{input.operation === 'remove_preference' ? 'Removing' : 'Saving'}
			<span class="font-medium text-foreground">{categoryLabel}:</span>
			{input.value}
		</span>
	</div>
{/if}
