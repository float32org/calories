<script lang="ts">
	import { getMeals } from '$lib/remote/meals.remote';
	import { formatDate } from '$lib/utils/format';
	import { cn } from '$lib/utils/ui';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import TrophyIcon from '@lucide/svelte/icons/trophy';
	import { SvelteDate } from 'svelte/reactivity';

	const initialMeals = await getMeals();
	const meals = $derived(getMeals().current ?? initialMeals);

	const loggedDates = $derived.by(() => {
		if (!meals || meals.length === 0) return new Set<string>();
		return new Set(meals.map((m) => m.date));
	});

	const currentStreak = $derived.by(() => {
		if (loggedDates.size === 0) return 0;

		let streak = 0;
		const now = new SvelteDate();
		const today = new SvelteDate(now.getFullYear(), now.getMonth(), now.getDate());
		const todayStr = formatDate(today);

		let checkTime = today.getTime();
		if (!loggedDates.has(todayStr)) {
			checkTime -= 24 * 60 * 60 * 1000;
		}

		while (true) {
			const checkDate = new SvelteDate(checkTime);
			const dateStr = formatDate(checkDate);
			if (loggedDates.has(dateStr)) {
				streak++;
				checkTime -= 24 * 60 * 60 * 1000;
			} else {
				break;
			}
		}

		return streak;
	});

	const longestStreak = $derived.by(() => {
		if (loggedDates.size === 0) return 0;

		const sortedDates = Array.from(loggedDates).sort();
		let longest = 1;
		let current = 1;

		for (let i = 1; i < sortedDates.length; i++) {
			const prevDate = new Date(sortedDates[i - 1]);
			const currDate = new Date(sortedDates[i]);
			const diffDays = Math.round(
				(currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
			);

			if (diffDays === 1) {
				current++;
				longest = Math.max(longest, current);
			} else {
				current = 1;
			}
		}

		return longest;
	});

	const isOnFire = $derived(currentStreak >= 3);

	const history = $derived.by(() => {
		const days = [];
		const now = new SvelteDate();
		const today = new SvelteDate(now.getFullYear(), now.getMonth(), now.getDate());

		for (let i = 6; i >= 0; i--) {
			const d = new SvelteDate(today.getTime() - i * 24 * 60 * 60 * 1000);
			const dateStr = formatDate(d);
			days.push({
				day: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
				isLogged: loggedDates.has(dateStr)
			});
		}
		return days;
	});
</script>

<div class="flex flex-col gap-4 rounded-xl bg-muted/30 p-5 transition-colors">
	<div class="flex items-start justify-between">
		<div class="flex items-center gap-3">
			<div
				class={cn(
					'flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors',
					isOnFire ? 'bg-orange-500/15' : 'bg-muted'
				)}
			>
				<FlameIcon class={cn('size-5', isOnFire ? 'text-orange-500' : 'text-muted-foreground')} />
			</div>
			<div>
				<h3 class="text-sm font-medium leading-none text-muted-foreground">Streak</h3>
				<div class="mt-1 flex items-baseline gap-2">
					<span class="text-2xl font-bold tabular-nums tracking-tight">{currentStreak}</span>
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Day{currentStreak !== 1 ? 's' : ''}
					</span>
				</div>
			</div>
		</div>

		{#if longestStreak > 0}
			<div
				class="flex items-center gap-1.5 rounded-md bg-background/50 px-2 py-1 text-[10px] font-medium text-muted-foreground"
			>
				<TrophyIcon class="size-3" />
				<span>Best: {longestStreak}</span>
			</div>
		{/if}
	</div>

	<div class="flex w-full justify-between px-1">
		{#each history as day, i (i)}
			<div class="flex flex-col items-center gap-2">
				<div
					class={cn(
						'h-8 w-2 rounded-full transition-colors',
						day.isLogged ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.25)]' : 'bg-muted/50'
					)}
				></div>
				<span class="text-[9px] font-medium uppercase text-muted-foreground/60">
					{day.day}
				</span>
			</div>
		{/each}
	</div>
</div>
