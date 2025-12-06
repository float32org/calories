<script lang="ts">
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { generateChartColor } from '$lib/utils/colors';
	import { formatTime } from '$lib/utils/format';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { slide } from 'svelte/transition';

	type Meal = {
		id: string;
		name: string;
		calories: number;
		servings?: number;
		protein?: number | null;
		carbs?: number | null;
		fat?: number | null;
		timestamp: number;
	};

	let {
		meal,
		index,
		onEdit,
		onDelete
	}: {
		meal: Meal;
		index: number;
		onEdit: (meal: Meal) => void;
		onDelete: (id: string) => void;
	} = $props();
</script>

<div
	transition:slide={{ duration: 200 }}
	class="group relative overflow-hidden rounded-2xl bg-muted/30 transition-colors hover:bg-muted/50"
>
	<div class="flex items-stretch">
		<div
			class="w-1 shrink-0 rounded-l-2xl"
			style="background-color: {generateChartColor(index)}"
		></div>
		<div class="flex min-w-0 flex-1 flex-col justify-center p-2 pl-3">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0 flex-1">
					<h3 class="line-clamp-1 font-bold leading-snug text-foreground">
						{meal.name}
					</h3>
					<p class="text-[11px] text-muted-foreground">
						{formatTime(meal.timestamp)}
					</p>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger
						class="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
					>
						<EllipsisIcon class="size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onclick={() => onEdit(meal)}>
							<PencilIcon class="size-4" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							class="text-destructive focus:text-destructive"
							onclick={() => onDelete(meal.id)}
						>
							<Trash2Icon class="size-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-1">
					<span
						class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
						style="background: oklch(0.65 0.12 250 / 0.15); color: oklch(0.65 0.12 250)"
					>
						{meal.protein ?? 0}g P
					</span>
					<span
						class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
						style="background: oklch(0.75 0.14 70 / 0.15); color: oklch(0.75 0.14 70)"
					>
						{meal.carbs ?? 0}g C
					</span>
					<span
						class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
						style="background: oklch(0.65 0.16 15 / 0.15); color: oklch(0.65 0.16 15)"
					>
						{meal.fat ?? 0}g F
					</span>
				</div>
				<div class="flex items-baseline gap-0.5 rounded-lg bg-foreground/5 px-2 py-1">
					<span class="text-base font-bold tabular-nums leading-none">{meal.calories}</span>
					<span class="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
						kcal
					</span>
				</div>
			</div>
		</div>
	</div>
</div>
