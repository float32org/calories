<script lang="ts">
	import { getProfile } from '$lib/remote/profile.remote';
	import { getLatestWeight } from '$lib/remote/weight.remote';
	import { cn } from '$lib/utils/ui';
	import ActivityIcon from '@lucide/svelte/icons/activity';

	const [initialProfile, initialWeight] = await Promise.all([getProfile(), getLatestWeight()]);

	const profile = $derived(getProfile().current ?? initialProfile);
	const latestWeight = $derived(getLatestWeight().current ?? initialWeight);

	const height = $derived(profile?.height ?? null);
	const units = $derived(profile?.units ?? 'imperial');
	const weight = $derived(latestWeight?.weight ?? null);

	const bmi = $derived.by(() => {
		if (height === null || weight === null) return null;
		const heightM = height / 100;
		const weightKg = units === 'metric' ? weight : weight * 0.453592;
		return weightKg / (heightM * heightM);
	});

	type BmiCategory = 'underweight' | 'healthy' | 'overweight' | 'obese';
	const category = $derived.by((): BmiCategory | null => {
		if (bmi === null) return null;
		if (bmi < 18.5) return 'underweight';
		if (bmi < 25) return 'healthy';
		if (bmi < 30) return 'overweight';
		return 'obese';
	});

	const categoryConfig: Record<BmiCategory, { label: string; color: string; bg: string }> = {
		underweight: { label: 'Underweight', color: 'text-sky-500', bg: 'bg-sky-500' },
		healthy: { label: 'Healthy', color: 'text-emerald-500', bg: 'bg-emerald-500' },
		overweight: { label: 'Overweight', color: 'text-amber-500', bg: 'bg-amber-500' },
		obese: { label: 'Obese', color: 'text-rose-500', bg: 'bg-rose-500' }
	};

	const config = $derived(category ? categoryConfig[category] : null);

	const scalePosition = $derived.by(() => {
		if (bmi === null) return 0;

		const min = 15;
		const max = 40;
		const clamped = Math.max(min, Math.min(max, bmi));

		return ((clamped - min) / (max - min)) * 100;
	});

	const healthyRange = $derived.by(() => {
		if (height === null) return null;

		const hM = height / 100;
		const minKg = 18.5 * hM * hM;
		const maxKg = 25 * hM * hM;

		if (units === 'metric') {
			return `${minKg.toFixed(1)} - ${maxKg.toFixed(1)} kg`;
		} else {
			const minLbs = minKg * 2.20462;
			const maxLbs = maxKg * 2.20462;
			return `${minLbs.toFixed(1)} - ${maxLbs.toFixed(1)} lbs`;
		}
	});
</script>

<div class="flex flex-col gap-4 rounded-xl bg-muted/30 p-5 transition-colors">
	<div class="flex items-start justify-between">
		<div class="flex items-center gap-3">
			<div
				class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-chart-5/15 transition-colors"
			>
				<ActivityIcon class="size-5 text-chart-5" />
			</div>
			<div>
				<h3 class="text-sm font-medium leading-none text-muted-foreground">BMI</h3>
				{#if bmi !== null && config}
					<div class="mt-1 flex items-baseline gap-2">
						<span class="text-2xl font-bold tabular-nums tracking-tight">{bmi.toFixed(1)}</span>
						<span class={cn('text-xs font-semibold uppercase tracking-wider', config.color)}>
							{config.label}
						</span>
					</div>
				{:else}
					<p class="mt-1 text-sm font-medium">No data</p>
				{/if}
			</div>
		</div>
	</div>

	{#if bmi !== null}
		<div class="flex flex-col gap-2">
			<div class="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
				<div class="absolute inset-0 flex h-full w-full">
					<div class="h-full w-[14%] bg-sky-500/30"></div>
					<div class="h-full w-[26%] bg-emerald-500/30"></div>
					<div class="h-full w-[20%] bg-amber-500/30"></div>
					<div class="h-full flex-1 bg-rose-500/30"></div>
				</div>
				<div
					class="absolute top-0 h-full w-1 -translate-x-1/2 rounded-full bg-foreground shadow-[0_0_8px_rgba(0,0,0,0.25)] ring-1 ring-background"
					style="left: {scalePosition}%"
				></div>
			</div>
			<div class="flex justify-between px-0.5 text-[10px] font-medium text-muted-foreground/60">
				<span>15</span>
				<span class="pl-3">18.5</span>
				<span class="pl-2">25</span>
				<span class="pl-2">30</span>
				<span>40</span>
			</div>
		</div>

		{#if healthyRange}
			<div
				class="mt-1 flex items-center justify-between rounded-md bg-background/50 px-3 py-2 text-xs"
			>
				<span class="text-muted-foreground">Healthy Weight</span>
				<span class="font-medium tabular-nums">{healthyRange}</span>
			</div>
		{/if}
	{:else}
		<div class="flex flex-col gap-2 py-2">
			<p class="text-xs text-muted-foreground">
				{#if height === null}
					Please set your height in profile settings to calculate BMI.
				{:else}
					Log your weight to see your BMI calculation.
				{/if}
			</p>
		</div>
	{/if}
</div>
