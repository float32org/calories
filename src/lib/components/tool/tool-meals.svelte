<script lang="ts">
	import { formatTime, getDisplayDate, parseLocalDate } from '$lib/utils/format';
	import CheckIcon from '@lucide/svelte/icons/check';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UtensilsIcon from '@lucide/svelte/icons/utensils';

	type Meal = {
		id: string;
		name: string;
		calories: number;
		protein: number | null;
		carbs: number | null;
		fat: number | null;
		servings: number;
		date: string;
		loggedAt: string;
	};

	type MealData = {
		name: string;
		calories: number;
		protein: number | null;
		carbs: number | null;
		fat: number | null;
		servings: number;
	};

	type MealsOutput = {
		success: boolean;
		operation?: 'query' | 'edit' | 'delete';
		count?: number;
		meals?: Meal[];
		totals?: {
			calories: number;
			protein: number;
			carbs: number;
			fat: number;
		};
		deleted?: {
			id: string;
			name: string;
			calories: number;
			date: string;
		};
		previous?: MealData;
		updated?: MealData & { id: string; date: string };
		error?: string;
	};

	let { output }: { output: MealsOutput } = $props();

	const changes = $derived(() => {
		if (output.operation !== 'edit' || !output.previous || !output.updated) return [];
		const diffs: { field: string; from: string | number; to: string | number }[] = [];

		if (output.previous.name !== output.updated.name) {
			diffs.push({ field: 'name', from: output.previous.name, to: output.updated.name });
		}
		if (output.previous.calories !== output.updated.calories) {
			diffs.push({
				field: 'calories',
				from: output.previous.calories,
				to: output.updated.calories
			});
		}
		if (output.previous.protein !== output.updated.protein) {
			diffs.push({
				field: 'protein',
				from: `${output.previous.protein ?? 0}g`,
				to: `${output.updated.protein ?? 0}g`
			});
		}
		if (output.previous.carbs !== output.updated.carbs) {
			diffs.push({
				field: 'carbs',
				from: `${output.previous.carbs ?? 0}g`,
				to: `${output.updated.carbs ?? 0}g`
			});
		}
		if (output.previous.fat !== output.updated.fat) {
			diffs.push({
				field: 'fat',
				from: `${output.previous.fat ?? 0}g`,
				to: `${output.updated.fat ?? 0}g`
			});
		}
		if (output.previous.servings !== output.updated.servings) {
			diffs.push({
				field: 'servings',
				from: output.previous.servings,
				to: output.updated.servings
			});
		}

		return diffs;
	});
</script>

{#if output.error}
	<div class="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
		{output.error}
	</div>
{:else if output.operation === 'delete' && output.deleted}
	<div class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
		<Trash2Icon class="size-4 text-muted-foreground" />
		<span class="text-muted-foreground">Removed</span>
		<span class="font-medium">{output.deleted.name}</span>
		<span
			class="flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-muted-foreground"
		>
			<FlameIcon class="size-3" />
			{output.deleted.calories}
		</span>
	</div>
{:else if output.operation === 'edit' && output.updated}
	<div class="mt-2 overflow-hidden rounded-xl border bg-card shadow-sm">
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
			<span class="flex items-center gap-2 text-sm font-medium">
				<CheckIcon class="size-4 text-emerald-500" />
				Meal updated
			</span>
		</div>
		<div class="p-3">
			<p class="font-medium">{output.updated.name}</p>
			{#if changes().length > 0}
				<div class="mt-2 space-y-1">
					{#each changes() as change (change.field)}
						<div class="flex items-center gap-2 text-xs">
							<PencilIcon class="size-3 text-muted-foreground" />
							<span class="capitalize text-muted-foreground">{change.field}:</span>
							<span class="text-muted-foreground line-through">{change.from}</span>
							<span class="text-foreground">→</span>
							<span class="font-medium">{change.to}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{:else if output.operation === 'query' && output.meals && output.meals.length > 0}
	<div class="mt-2 overflow-hidden rounded-xl border bg-card shadow-sm">
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
			<span class="flex items-center gap-2 text-sm font-medium">
				<UtensilsIcon class="size-4 text-muted-foreground" />
				{output.count} meal{output.count !== 1 ? 's' : ''}
			</span>
			{#if output.totals}
				<div
					class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
				>
					<FlameIcon class="size-3" />
					{output.totals.calories}
				</div>
			{/if}
		</div>
		<div class="divide-y divide-border">
			{#each output.meals.slice(0, 5) as meal (meal.id)}
				<div class="flex items-center gap-3 px-3 py-2">
					<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
						<UtensilsIcon class="size-4 text-muted-foreground/50" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{meal.name}</p>
						<p class="text-[11px] text-muted-foreground">
							{getDisplayDate(parseLocalDate(meal.date))} at {formatTime(
								new Date(meal.loggedAt).getTime()
							)}
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-1">
						<span
							class="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500 dark:text-blue-400"
						>
							{meal.protein ?? 0}g P
						</span>
						<div class="flex items-baseline gap-0.5 rounded-lg bg-foreground/5 px-2 py-1">
							<span class="text-sm font-bold tabular-nums">{meal.calories}</span>
						</div>
					</div>
				</div>
			{/each}
			{#if output.meals.length > 5}
				<div class="bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
					+{output.meals.length - 5} more
				</div>
			{/if}
		</div>
	</div>
{:else if output.operation === 'query' && output.success}
	<div
		class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
	>
		<UtensilsIcon class="size-4" />
		No meals found
	</div>
{/if}
