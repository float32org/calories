<script lang="ts">
	import { WeightLogDialog } from '$lib/components/dialog';
	import { getProfile } from '$lib/remote/profile.remote';
	import {
		getLatestWeight,
		getWeightForDate,
		getWeightLogs,
		logWeight
	} from '$lib/remote/weight.remote';
	import { parseLocalDate } from '$lib/utils/format';
	import ScaleIcon from '@lucide/svelte/icons/scale';
	import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';

	let { date }: { date: string } = $props();

	let isModalOpen = $state(false);

	const dateObj = $derived(parseLocalDate(date));
	const initialDate = untrack(() => date);
	const [initialProfile, initialLatestWeight, initialWeightForDate, initialWeightLogs] =
		await Promise.all([
			getProfile(),
			getLatestWeight(),
			getWeightForDate(initialDate),
			getWeightLogs()
		]);

	const profile = $derived(getProfile().current ?? initialProfile);
	const latestWeight = $derived(getLatestWeight().current ?? initialLatestWeight);
	const weightForDate = $derived(
		getWeightForDate(date).current ?? (date === initialDate ? initialWeightForDate : null)
	);
	const weightLogs = $derived(getWeightLogs().current ?? initialWeightLogs);

	const units = $derived(profile?.units ?? 'imperial');
	const weightUnit = $derived(units === 'metric' ? 'kg' : 'lbs');
	const weightGoal = $derived(profile?.weightGoal ?? null);
	const currentWeight = $derived(latestWeight?.weight ?? null);
	const weightAtGoal = $derived(
		weightGoal !== null && currentWeight !== null && currentWeight <= weightGoal
	);
	const weightToGo = $derived(
		weightGoal !== null && currentWeight !== null ? currentWeight - weightGoal : 0
	);

	const startWeight = $derived.by(() => {
		if (!weightLogs || weightLogs.length === 0) return null;
		return weightLogs[weightLogs.length - 1].weight;
	});

	const progressPercent = $derived.by(() => {
		if (startWeight === null || currentWeight === null || weightGoal === null) return 0;

		const totalToLose = startWeight - weightGoal;
		if (totalToLose <= 0) return 100;

		const lost = startWeight - currentWeight;
		const percent = (lost / totalToLose) * 100;
		return Math.max(0, Math.min(100, percent));
	});

	const weightChange = $derived.by(() => {
		if (!weightForDate?.weight) return null;

		if (!weightLogs || weightLogs.length < 2) return null;

		const currentIndex = weightLogs.findIndex((log) => log.date === date);
		if (currentIndex === -1) return null;

		const previousLog = weightLogs[currentIndex + 1];
		if (!previousLog) return null;

		return weightForDate.weight - previousLog.weight;
	});

	const circumference = 2 * Math.PI * 16;
	const strokeDashoffset = $derived(circumference - (progressPercent / 100) * circumference);

	async function handleLogWeight(weight: number) {
		try {
			await logWeight({ weight, date }).updates(
				getLatestWeight(),
				getWeightForDate(date),
				getWeightLogs()
			);
		} catch (err) {
			console.error('Failed to log weight:', err);
			toast.error('Failed to log weight');
		}
	}
</script>

<button
	class="flex shrink-0 items-center gap-3 rounded-xl bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
	onclick={() => (isModalOpen = true)}
>
	<div class="relative size-12 shrink-0">
		<svg class="size-full -rotate-90" viewBox="0 0 40 40">
			<circle cx="20" cy="20" r="16" fill="none" class="stroke-muted" stroke-width="3" />
			{#if weightGoal !== null && currentWeight !== null}
				<circle
					cx="20"
					cy="20"
					r="16"
					fill="none"
					class="{weightAtGoal
						? 'stroke-emerald-500'
						: 'stroke-primary'} transition-all duration-300"
					stroke-width="3"
					stroke-linecap="round"
					stroke-dasharray={circumference}
					stroke-dashoffset={strokeDashoffset}
				/>
			{/if}
		</svg>
		<ScaleIcon
			class="absolute inset-0 m-auto size-5 {weightAtGoal
				? 'text-emerald-500'
				: 'text-muted-foreground'}"
		/>
	</div>
	<div class="min-w-0 flex-1">
		{#key date}
			<div class="flex items-baseline gap-1">
				<span class="text-lg font-bold tabular-nums">
					{weightForDate?.weight ?? currentWeight ?? '—'}
				</span>
				<span class="text-xs text-muted-foreground">
					{#if weightGoal}/ {weightGoal} {weightUnit}{:else}{weightUnit}{/if}
				</span>
			</div>
			<span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
				{#if !currentWeight}
					Tap to log weight
				{:else if weightForDate?.weight}
					{#if weightAtGoal}
						Logged · Goal reached!
					{:else}
						Logged · {weightToGo.toFixed(1)} {weightUnit} to go
					{/if}
				{:else if weightAtGoal}
					Not logged · Goal reached!
				{:else}
					Not logged · {weightToGo.toFixed(1)} {weightUnit} to go
				{/if}
			</span>
		{/key}
	</div>
	{#if weightChange !== null && weightChange !== 0}
		<div
			class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold {weightChange < 0
				? 'bg-emerald-500/10 text-emerald-500'
				: 'bg-rose-500/10 text-rose-500'}"
		>
			{#if weightChange < 0}
				<TrendingDownIcon class="size-3" />
			{:else}
				<TrendingUpIcon class="size-3" />
			{/if}
			{weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
		</div>
	{/if}
</button>

<WeightLogDialog
	bind:open={isModalOpen}
	onSave={handleLogWeight}
	currentWeight={weightForDate?.weight ?? latestWeight?.weight ?? 0}
	unit={weightUnit}
	date={dateObj}
/>
