<script lang="ts">
	import { getDisplayDate } from '$lib/utils/format';
	import CheckIcon from '@lucide/svelte/icons/check';
	import DropletIcon from '@lucide/svelte/icons/droplet';
	import TargetIcon from '@lucide/svelte/icons/target';

	type LogWaterOutput = {
		success: boolean;
		logged: number;
		total: number;
		waterUnit: string;
		waterGoal: number;
		remaining: number;
		percentComplete: number;
		goalReached: boolean;
		date: string;
		error?: string;
	};

	let { output }: { output: LogWaterOutput } = $props();
</script>

{#if output.error}
	<div class="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
		{output.error}
	</div>
{:else if output.success}
	<div class="mt-2 overflow-hidden rounded-xl border bg-card shadow-sm">
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
			<span class="flex items-center gap-2 text-sm font-medium">
				<CheckIcon class="size-4 text-emerald-500" />
				Water logged
			</span>
			<span class="text-xs text-muted-foreground">{getDisplayDate(new Date(output.date))}</span>
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
{/if}
