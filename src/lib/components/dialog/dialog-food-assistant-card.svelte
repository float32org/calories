<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import CheckIcon from '@lucide/svelte/icons/check';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import PlusIcon from '@lucide/svelte/icons/plus';

	let {
		name,
		calories,
		protein,
		carbs,
		fat,
		onLog
	}: {
		name: string;
		calories: number;
		protein: number;
		carbs: number;
		fat: number;
		onLog: () => void;
	} = $props();

	let logged = $state(false);

	function handleLog() {
		onLog();
		logged = true;
	}
</script>

<div class="mt-2 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
	<div class="border-b bg-muted/30 p-3">
		<div class="flex items-start justify-between gap-2">
			<h4 class="font-semibold leading-tight">{name}</h4>
			<div
				class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
			>
				<FlameIcon class="mr-1 size-3" />
				{calories}
			</div>
		</div>
	</div>
	<div class="grid grid-cols-3 gap-px bg-border p-px text-center text-xs">
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
	<div class="bg-muted/30 p-2">
		<Button
			variant={logged ? 'outline' : 'default'}
			size="sm"
			class="w-full gap-2"
			onclick={handleLog}
			disabled={logged}
		>
			{#if logged}
				<CheckIcon class="size-4" />
				Logged
			{:else}
				<PlusIcon class="size-4" />
				Log this meal
			{/if}
		</Button>
	</div>
</div>
