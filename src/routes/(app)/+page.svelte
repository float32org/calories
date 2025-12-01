<script lang="ts">
	import CalorieRadialChart from '$lib/components/dashboard/calorie-radial-chart.svelte';
	import AddMealDialog from '$lib/components/dialog/dialog-add-meal.svelte';
	import DatePickerDialog from '$lib/components/dialog/dialog-date-picker.svelte';
	import LogWeightDialog from '$lib/components/dialog/dialog-log-weight.svelte';
	import SettingsDialog from '$lib/components/dialog/dialog-settings.svelte';
	import { Button } from '$lib/components/ui/button';
	import { addMeal, deleteMeal, getMeals } from '$lib/remote/meals.remote';
	import { getLatestWeight, getSettings, logWeight } from '$lib/remote/weight.remote';
	import { formatDate, getDisplayDate } from '$lib/utils/format';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UtensilsIcon from '@lucide/svelte/icons/utensils';
	import { toast } from 'svelte-sonner';
	import { SvelteDate, SvelteMap } from 'svelte/reactivity';

	const selectedDate = new SvelteDate();
	let isAddModalOpen = $state(false);
	let isDatePickerOpen = $state(false);
	let isWeightModalOpen = $state(false);
	let isSettingsOpen = $state(false);

	const meals = getMeals();
	const settings = getSettings();
	const latestWeight = getLatestWeight();

	let currentDayMeals = $derived.by(() => {
		if (!meals.current) return [];
		const dateStr = formatDate(selectedDate);
		return meals.current
			.filter((m) => m.date === dateStr)
			.sort((a, b) => b.timestamp - a.timestamp);
	});

	let calorieGoal = $derived(settings.current?.calorieGoal ?? 2200);
	let weightGoal = $derived(settings.current?.weightGoal ?? null);
	let weightUnit = $derived(settings.current?.weightUnit ?? 'lbs');
	let currentWeight = $derived(latestWeight.current?.weight ?? null);

	let history = $derived.by(() => {
		if (!meals.current) return [];
		const historyMap = new SvelteMap<string, number>();
		meals.current.forEach((m) => {
			const current = historyMap.get(m.date) || 0;
			historyMap.set(m.date, current + m.calories);
		});

		return Array.from(historyMap.entries()).map(([date, cals]) => ({
			date,
			status:
				cals > calorieGoal
					? 'over'
					: ((cals > calorieGoal * 0.8 ? 'met' : 'under') as 'over' | 'met' | 'under')
		}));
	});

	function handleDateChange(days: number) {
		selectedDate.setDate(selectedDate.getDate() + days);
	}

	type MealInput = {
		name: string;
		calories: number;
		protein?: number;
		carbs?: number;
		fat?: number;
		imageKey?: string;
		imageUrl?: string;
	};

	async function handleAddMeal(meal: MealInput) {
		try {
			await addMeal({
				name: meal.name,
				calories: meal.calories,
				protein: meal.protein,
				carbs: meal.carbs,
				fat: meal.fat,
				imageKey: meal.imageKey,
				mealTime: selectedDate.toISOString()
			}).updates(meals);

			toast.success('Meal logged!');
		} catch (err) {
			console.error('Failed to add meal:', err);
			toast.error('Failed to log meal');
		}
	}

	async function handleDeleteMeal(id: string) {
		try {
			await deleteMeal(id).updates(meals);
			toast.success('Meal deleted');
		} catch (err) {
			console.error('Failed to delete meal:', err);
			toast.error('Failed to delete meal');
		}
	}

	async function handleLogWeight(weight: number) {
		try {
			await logWeight({ weight }).updates(latestWeight);
			toast.success('Weight logged!');
		} catch (err) {
			console.error('Failed to log weight:', err);
			toast.error('Failed to log weight');
		}
	}
</script>

<svelte:head>
	<title>Calories</title>
</svelte:head>

<div class="flex h-full flex-col bg-background">
	<div class="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden">
		<!-- Minimal Header -->
		<header class="flex shrink-0 items-center justify-between px-4 py-2">
			<Button variant="ghost" size="icon" class="rounded-full" onclick={() => handleDateChange(-1)}>
				<ChevronLeftIcon class="size-5 text-muted-foreground" />
			</Button>

			<button class="flex flex-col items-center" onclick={() => (isDatePickerOpen = true)}>
				<span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
					{selectedDate.getFullYear()}
				</span>
				<span class="text-lg font-bold text-foreground">
					{getDisplayDate(selectedDate)}
				</span>
			</button>

			<Button
				variant="ghost"
				size="icon"
				class="rounded-full"
				onclick={() => handleDateChange(1)}
				disabled={formatDate(selectedDate) === formatDate(new Date())}
			>
				<ChevronRightIcon class="size-5 text-muted-foreground" />
			</Button>
		</header>

		<div class="flex-1 overflow-hidden px-6 pb-20">
			<div class="flex h-full flex-col gap-6">
				<!-- Top Section: Chart & Quick Actions -->
				<div class="flex shrink-0 flex-col gap-6">
					<!-- Chart Section -->
					<div class="flex flex-col items-center justify-center py-2">
						<CalorieRadialChart
							meals={currentDayMeals.map((m) => ({
								id: m.id,
								name: m.name,
								calories: m.calories
							}))}
							goal={calorieGoal}
							size={240}
							thickness={20}
						/>
					</div>

					<!-- Quick Actions -->
					<div class="grid grid-cols-2 gap-4">
						<button
							class="bg-muted/30 hover:bg-muted/50 group flex flex-col items-start gap-2 rounded-2xl p-3 text-left transition-colors"
							onclick={() => (isSettingsOpen = true)}
						>
							<div class="bg-background p-2 rounded-full shadow-sm">
								<SettingsIcon
									class="text-muted-foreground group-hover:text-foreground size-4 transition-colors"
								/>
							</div>
							<div>
								<span class="block text-sm font-medium">Settings</span>
								<span class="text-muted-foreground text-xs">{calorieGoal} kcal goal</span>
							</div>
						</button>

						<button
							class="bg-muted/30 hover:bg-muted/50 group flex flex-col items-start gap-2 rounded-2xl p-3 text-left transition-colors"
							onclick={() => (isWeightModalOpen = true)}
						>
							<div class="bg-background p-2 rounded-full shadow-sm">
								<UtensilsIcon
									class="text-muted-foreground group-hover:text-foreground size-4 transition-colors"
								/>
							</div>
							<div>
								<span class="block text-sm font-medium">Weight</span>
								<span class="text-muted-foreground text-xs">
									{currentWeight ? `${currentWeight} ${weightUnit}` : 'Log weight'}
								</span>
							</div>
						</button>
					</div>
				</div>

				<!-- Meal List - Scrollable Area -->
				<div class="flex min-h-0 flex-1 flex-col gap-2">
					<h2 class="flex shrink-0 items-center gap-2 text-lg font-bold">
						Meals
						<span class="bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs font-medium"
							>{currentDayMeals.length}</span
						>
					</h2>

					<div class="-mr-2 flex-1 overflow-y-auto pr-2">
						{#if meals.loading}
							<div class="flex justify-center py-8">
								<div
									class="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
								></div>
							</div>
						{:else if currentDayMeals.length === 0}
							<div
								class="text-muted-foreground bg-muted/10 border-muted rounded-3xl border border-dashed py-8 text-center"
							>
								<p>No meals logged yet.</p>
							</div>
						{:else}
							<div class="space-y-3 pb-4">
								{#each currentDayMeals as meal, i (meal.id)}
									<div
										class="bg-card hover:border-border group relative flex items-center gap-4 rounded-2xl border border-border/40 p-2 pr-4 shadow-sm transition-all hover:shadow-md"
									>
										<!-- Indicator Dot -->
										<div
											class="h-12 w-1 shrink-0 rounded-full"
											style="background-color: var(--chart-{(i % 5) + 1})"
										></div>

										<!-- Image -->
										<div class="bg-muted h-12 w-12 shrink-0 overflow-hidden rounded-xl">
											{#if meal.image}
												<img src={meal.image} alt={meal.name} class="h-full w-full object-cover" />
											{:else}
												<div class="flex h-full w-full items-center justify-center">
													<UtensilsIcon class="text-muted-foreground size-4" />
												</div>
											{/if}
										</div>

										<!-- Info -->
										<div class="flex-1 min-w-0 py-1">
											<div class="flex items-center justify-between">
												<h3 class="truncate pr-2 font-medium">{meal.name}</h3>
												<span class="whitespace-nowrap text-sm font-bold">{meal.calories}</span>
											</div>
											<div class="mt-0.5 flex items-center justify-between">
												<div class="text-muted-foreground flex gap-2 text-xs">
													{#if meal.protein}<span>{meal.protein}p</span>{/if}
													{#if meal.carbs}<span>{meal.carbs}c</span>{/if}
													{#if meal.fat}<span>{meal.fat}f</span>{/if}
													{#if !meal.protein && !meal.carbs && !meal.fat}
														<span>
															{new Date(meal.timestamp)
																.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
																.toLowerCase()}
														</span>
													{/if}
												</div>
											</div>
										</div>

										<!-- Delete Action -->
										<button
											class="hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full p-2 opacity-0 transition-opacity group-hover:opacity-100"
											onclick={() => handleDeleteMeal(meal.id)}
										>
											<Trash2Icon class="size-4" />
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Floating Action Button -->
		<div class="fixed bottom-8 left-1/2 z-30 -translate-x-1/2">
			<Button
				size="lg"
				class="bg-primary text-primary-foreground shadow-primary/20 h-14 rounded-full px-6 shadow-lg transition-transform hover:scale-105"
				onclick={() => (isAddModalOpen = true)}
			>
				<PlusIcon class="mr-2 size-5" />
				<span class="font-bold">Log Meal</span>
			</Button>
		</div>
	</div>

	<AddMealDialog bind:open={isAddModalOpen} onAdd={handleAddMeal} />
	<DatePickerDialog bind:open={isDatePickerOpen} date={selectedDate} {history} />
	<LogWeightDialog
		bind:open={isWeightModalOpen}
		onSave={handleLogWeight}
		currentWeight={currentWeight ?? 0}
		unit={weightUnit}
	/>
	<SettingsDialog
		bind:open={isSettingsOpen}
		currentCalorieGoal={calorieGoal}
		currentWeightGoal={weightGoal}
		{currentWeight}
		{weightUnit}
		onSave={() => settings.refresh()}
	/>
</div>
