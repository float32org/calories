<script lang="ts">
	import { getDisplayDate } from '$lib/utils/format';
	import CheckIcon from '@lucide/svelte/icons/check';
	import DropletIcon from '@lucide/svelte/icons/droplet';
	import ScaleIcon from '@lucide/svelte/icons/scale';
	import TargetIcon from '@lucide/svelte/icons/target';
	import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';

	type TrackingOutput = {
		success: boolean;
		operation?: 'log_weight' | 'query_weight' | 'log_water';
		updated?: boolean;
		weight?: number;
		weightUnit?: string;
		date?: string;
		change?: number | null;
		weightGoal?: number | null;
		queryType?: 'recent' | 'progress' | 'date_range';
		currentWeight?: number;
		totalChange?: number;
		remainingToGoal?: number | null;
		weeklyChange?: number | null;
		monthlyChange?: number | null;
		entries?: Array<{ id: string; weight: number; date: string }>;
		message?: string;
		logged?: number;
		total?: number;
		waterUnit?: string;
		waterGoal?: number;
		remaining?: number;
		percentComplete?: number;
		goalReached?: boolean;
		error?: string;
	};

	let { output }: { output: TrackingOutput } = $props();

	function formatChange(change: number | null | undefined, unit: string = ''): string {
		if (change === null || change === undefined) return '-';
		const prefix = change > 0 ? '+' : '';
		return `${prefix}${change}${unit ? ` ${unit}` : ''}`;
	}
</script>

{#if output.error}
	<div class="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
		{output.error}
	</div>
{:else if output.operation === 'log_water' && output.success}
	<div class="mt-2 overflow-hidden rounded-xl border bg-card shadow-sm">
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
			<span class="flex items-center gap-2 text-sm font-medium">
				<CheckIcon class="size-4 text-emerald-500" />
				Water logged
			</span>
			{#if output.date}
				<span class="text-xs text-muted-foreground">{getDisplayDate(new Date(output.date))}</span>
			{/if}
		</div>
		<div class="p-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="flex size-10 items-center justify-center rounded-full bg-sky-500/10">
						<DropletIcon class="size-5 text-sky-500" />
					</div>
					<div>
						<span class="text-xl font-bold tabular-nums">+{output.logged}</span>
						<span class="ml-1 text-sm text-muted-foreground">{output.waterUnit}</span>
					</div>
				</div>

				<div
					class="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium {output.goalReached
						? 'bg-emerald-500/10 text-emerald-500'
						: 'bg-sky-500/10 text-sky-500'}"
				>
					<span class="tabular-nums">{output.percentComplete}%</span>
				</div>
			</div>

			<div class="mt-3 flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
				<TargetIcon class="size-3 text-primary" />
				{#if output.goalReached}
					<span class="font-medium text-emerald-500">Daily goal reached!</span>
				{:else}
					<span class="text-muted-foreground">
						<span class="font-medium text-foreground"
							>{output.total} / {output.waterGoal} {output.waterUnit}</span
						>
						— {output.remaining}
						{output.waterUnit} to go
					</span>
				{/if}
			</div>
		</div>
	</div>
{:else if output.operation === 'log_weight' && output.success}
	{@const remainingToGoal = output.weightGoal
		? parseFloat((output.weight! - output.weightGoal).toFixed(1))
		: null}
	<div class="mt-2 overflow-hidden rounded-xl border bg-card shadow-sm">
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
			<span class="flex items-center gap-2 text-sm font-medium">
				<CheckIcon class="size-4 text-emerald-500" />
				{output.updated ? 'Weight updated' : 'Weight logged'}
			</span>
			{#if output.date}
				<span class="text-xs text-muted-foreground">{getDisplayDate(new Date(output.date))}</span>
			{/if}
		</div>
		<div class="p-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="flex size-10 items-center justify-center rounded-full bg-muted/50">
						<ScaleIcon class="size-5 text-muted-foreground" />
					</div>
					<div>
						<span class="text-xl font-bold tabular-nums">{output.weight}</span>
						<span class="ml-1 text-sm text-muted-foreground">{output.weightUnit}</span>
					</div>
				</div>

				{#if output.change !== null && output.change !== undefined}
					<div
						class="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium {output.change <
						0
							? 'bg-emerald-500/10 text-emerald-500'
							: output.change > 0
								? 'bg-amber-500/10 text-amber-500'
								: 'bg-muted text-muted-foreground'}"
					>
						{#if output.change < 0}
							<TrendingDownIcon class="size-4" />
						{:else if output.change > 0}
							<TrendingUpIcon class="size-4" />
						{/if}
						<span class="tabular-nums">{output.change > 0 ? '+' : ''}{output.change}</span>
					</div>
				{/if}
			</div>

			{#if output.weightGoal && remainingToGoal !== null}
				<div class="mt-3 flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
					<TargetIcon class="size-3 text-primary" />
					{#if remainingToGoal > 0}
						<span class="text-muted-foreground">
							<span class="font-medium text-foreground">{remainingToGoal} {output.weightUnit}</span> to
							goal
						</span>
					{:else if remainingToGoal < 0}
						<span class="font-medium text-emerald-500">Goal reached!</span>
					{:else}
						<span class="font-medium text-emerald-500">At goal weight</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{:else if output.operation === 'query_weight' && output.message}
	<div
		class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
	>
		<ScaleIcon class="size-4" />
		{output.message}
	</div>
{:else if output.operation === 'query_weight' && output.queryType === 'progress' && output.currentWeight}
	<div class="mt-2 overflow-hidden rounded-xl border bg-card shadow-sm">
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
			<span class="flex items-center gap-2 text-sm font-medium">
				<ScaleIcon class="size-4 text-muted-foreground" />
				Progress
			</span>
			{#if output.weightGoal}
				<div
					class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
				>
					<TargetIcon class="size-3" />
					{output.weightGoal}
					{output.weightUnit}
				</div>
			{/if}
		</div>
		<div class="p-3">
			<div class="flex items-baseline justify-between">
				<div>
					<span class="text-2xl font-bold tabular-nums">{output.currentWeight}</span>
					<span class="ml-1 text-sm text-muted-foreground">{output.weightUnit}</span>
				</div>
				{#if output.remainingToGoal !== null && output.remainingToGoal !== undefined}
					<span class="text-xs text-muted-foreground">
						{output.remainingToGoal > 0 ? `${output.remainingToGoal} to go` : 'Goal reached!'}
					</span>
				{/if}
			</div>

			<div class="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-border">
				<div class="flex flex-col items-center bg-card p-2">
					<span
						class="text-sm font-medium tabular-nums {(output.totalChange ?? 0) < 0
							? 'text-emerald-500'
							: (output.totalChange ?? 0) > 0
								? 'text-amber-500'
								: 'text-foreground'}"
					>
						{formatChange(output.totalChange)}
					</span>
					<span class="text-[10px] text-muted-foreground">Total</span>
				</div>
				<div class="flex flex-col items-center bg-card p-2">
					<span
						class="text-sm font-medium tabular-nums {(output.weeklyChange ?? 0) < 0
							? 'text-emerald-500'
							: (output.weeklyChange ?? 0) > 0
								? 'text-amber-500'
								: 'text-foreground'}"
					>
						{formatChange(output.weeklyChange)}
					</span>
					<span class="text-[10px] text-muted-foreground">7 days</span>
				</div>
				<div class="flex flex-col items-center bg-card p-2">
					<span
						class="text-sm font-medium tabular-nums {(output.monthlyChange ?? 0) < 0
							? 'text-emerald-500'
							: (output.monthlyChange ?? 0) > 0
								? 'text-amber-500'
								: 'text-foreground'}"
					>
						{formatChange(output.monthlyChange)}
					</span>
					<span class="text-[10px] text-muted-foreground">30 days</span>
				</div>
			</div>
		</div>
	</div>
{:else if output.operation === 'query_weight' && output.entries && output.entries.length > 0}
	<div class="mt-2 overflow-hidden rounded-xl border bg-card shadow-sm">
		<div class="border-b bg-muted/30 px-3 py-2">
			<span class="flex items-center gap-2 text-sm font-medium">
				<ScaleIcon class="size-4 text-muted-foreground" />
				Recent weigh-ins
			</span>
		</div>
		<div class="divide-y divide-border">
			{#each output.entries.slice(0, 5) as entry, i (entry.id)}
				{@const prevEntry = output.entries?.[i + 1]}
				{@const change = prevEntry
					? parseFloat((entry.weight - prevEntry.weight).toFixed(1))
					: null}
				<div class="flex items-center justify-between px-3 py-2">
					<span class="text-sm text-muted-foreground">{getDisplayDate(new Date(entry.date))}</span>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium tabular-nums">{entry.weight} {output.weightUnit}</span>
						{#if change !== null}
							<span
								class="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold {change <
								0
									? 'bg-emerald-500/10 text-emerald-500'
									: change > 0
										? 'bg-amber-500/10 text-amber-500'
										: 'bg-muted text-muted-foreground'}"
							>
								{#if change < 0}
									<TrendingDownIcon class="size-3" />
								{:else if change > 0}
									<TrendingUpIcon class="size-3" />
								{/if}
								{formatChange(change)}
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{:else if output.operation === 'query_weight' && output.success}
	<div
		class="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
	>
		<ScaleIcon class="size-4" />
		No weight entries found
	</div>
{/if}
