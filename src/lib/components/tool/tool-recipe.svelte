<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { addMeal, getMeals } from '$lib/remote/meals.remote';
	import { getRecipes, saveRecipe } from '$lib/remote/recipes.remote';
	import { formatDuration } from '$lib/utils/format';
	import { downloadRecipeAsMarkdown } from '$lib/utils/recipe';
	import BookmarkIcon from '@lucide/svelte/icons/bookmark';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import UsersIcon from '@lucide/svelte/icons/users';
	import UtensilsIcon from '@lucide/svelte/icons/utensils';
	import { toast } from 'svelte-sonner';

	type Ingredient = {
		item: string;
		amount: string;
		notes?: string;
	};

	let {
		name,
		description,
		servings,
		prepTime,
		cookTime,
		ingredients,
		instructions,
		calories,
		protein,
		carbs,
		fat,
		tips,
		date
	}: {
		name: string;
		description?: string;
		servings: number;
		prepTime?: number;
		cookTime?: number;
		ingredients: Ingredient[];
		instructions: string[];
		calories: number;
		protein: number;
		carbs: number;
		fat: number;
		tips?: string;
		date: string;
	} = $props();

	let saved = $state(false);
	let logged = $state(false);
	let expanded = $state(true);

	const totalTime = $derived((prepTime ?? 0) + (cookTime ?? 0));

	async function handleSave() {
		try {
			await saveRecipe({
				name,
				description,
				servings,
				prepTime,
				cookTime,
				ingredients,
				instructions,
				calories,
				protein,
				carbs,
				fat,
				tips
			}).updates(getRecipes());
			saved = true;
		} catch {
			toast.error('Failed to save recipe');
		}
	}

	async function handleLog() {
		const [year, month, day] = date.split('-').map(Number);
		const now = new Date();
		const loggedAt = new Date(year, month - 1, day, now.getHours(), now.getMinutes()).toISOString();

		try {
			await addMeal({
				name,
				calories,
				protein,
				carbs,
				fat,
				servings: 1,
				date,
				loggedAt
			}).updates(getMeals());
			logged = true;
		} catch {
			toast.error('Failed to log meal');
		}
	}

	function handleDownload() {
		downloadRecipeAsMarkdown({
			name,
			description,
			servings,
			prepTime,
			cookTime,
			ingredients,
			instructions,
			calories,
			protein,
			carbs,
			fat,
			tips
		});
	}
</script>

<div class="mt-2 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
	<div class="border-b bg-muted/30 p-3">
		<div class="flex items-start justify-between gap-2">
			<div class="flex-1 min-w-0">
				<h4 class="font-semibold leading-tight">{name}</h4>
				{#if description}
					<p class="text-sm text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
				{/if}
			</div>
			<div
				class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0"
			>
				<FlameIcon class="size-3" />
				{calories}
			</div>
		</div>
		<div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
			<div class="flex items-center gap-1">
				<UsersIcon class="size-3" />
				{servings}
				{servings === 1 ? 'serving' : 'servings'}
			</div>
			{#if totalTime > 0}
				<div class="flex items-center gap-1">
					<ClockIcon class="size-3" />
					{formatDuration(totalTime)}
					{#if prepTime && cookTime}
						<span class="text-muted-foreground/60">
							({formatDuration(prepTime)} prep, {formatDuration(cookTime)} cook)
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<div class="grid grid-cols-3 divide-x divide-border border-b text-center text-xs">
		<div class="bg-card p-2">
			<span class="block font-medium text-foreground">{protein}g</span>
			<span class="text-muted-foreground">Protein</span>
		</div>
		<div class="bg-card p-2">
			<span class="block font-medium text-foreground">{carbs}g</span>
			<span class="text-muted-foreground">Carbs</span>
		</div>
		<div class="bg-card p-2">
			<span class="block font-medium text-foreground">{fat}g</span>
			<span class="text-muted-foreground">Fat</span>
		</div>
	</div>
	<button
		type="button"
		class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/30 transition-colors border-b"
		onclick={() => (expanded = !expanded)}
	>
		<span>Ingredients & Instructions</span>
		{#if expanded}
			<ChevronUpIcon class="size-4 text-muted-foreground" />
		{:else}
			<ChevronDownIcon class="size-4 text-muted-foreground" />
		{/if}
	</button>
	{#if expanded}
		<div class="p-3 space-y-4 text-sm max-h-[300px] overflow-y-auto">
			<div>
				<h5 class="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-2">
					Ingredients
				</h5>
				<ul class="space-y-1">
					{#each ingredients as ingredient, i (i)}
						<li class="flex gap-2">
							<span class="text-primary font-medium shrink-0">{ingredient.amount}</span>
							<span>
								{ingredient.item}
								{#if ingredient.notes}
									<span class="text-muted-foreground">({ingredient.notes})</span>
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			</div>
			<div>
				<h5 class="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-2">
					Instructions
				</h5>
				<ol class="space-y-2">
					{#each instructions as step, i (i)}
						<li class="flex gap-2">
							<span
								class="shrink-0 size-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center"
							>
								{i + 1}
							</span>
							<span class="text-muted-foreground">{step}</span>
						</li>
					{/each}
				</ol>
			</div>
			{#if tips}
				<div class="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
					<span class="font-medium">Tip:</span>
					{tips}
				</div>
			{/if}
		</div>
	{/if}
	<div class="bg-muted/30 p-2 flex gap-2">
		<Button
			variant={saved ? 'outline' : 'default'}
			size="sm"
			class="flex-1 gap-1.5"
			onclick={handleSave}
			disabled={saved}
		>
			{#if saved}
				<CheckIcon class="size-4" />
				Saved
			{:else}
				<BookmarkIcon class="size-4" />
				Save
			{/if}
		</Button>
		<Button
			variant={logged ? 'outline' : 'secondary'}
			size="sm"
			class="flex-1 gap-1.5"
			onclick={handleLog}
			disabled={logged}
		>
			{#if logged}
				<CheckIcon class="size-4" />
				Logged
			{:else}
				<UtensilsIcon class="size-4" />
				Log Meal
			{/if}
		</Button>
		<Button variant="outline" size="sm" class="gap-1.5 px-2.5" onclick={handleDownload}>
			<DownloadIcon class="size-4" />
		</Button>
	</div>
</div>
