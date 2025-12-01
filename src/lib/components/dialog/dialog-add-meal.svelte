<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { analyzeMealImage } from '$lib/remote/meals.remote';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import CheckIcon from '@lucide/svelte/icons/check';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import XIcon from '@lucide/svelte/icons/x';
	import { toast } from 'svelte-sonner';
	import ResponsiveDialog from './dialog-responsive.svelte';

	type MealData = {
		name: string;
		calories: number;
		protein?: number;
		carbs?: number;
		fat?: number;
		sodium?: number;
		cholesterol?: number;
		fiber?: number;
		sugar?: number;
		imageKey?: string;
	};

	let {
		open = $bindable(false),
		onAdd
	}: {
		open?: boolean;
		onAdd?: (meal: MealData) => void;
	} = $props();

	let name = $state('');
	let calories = $state('');
	let protein = $state('');
	let carbs = $state('');
	let fat = $state('');
	let imagePreview = $state<string | null>(null);
	let imageKey = $state<string | null>(null);
	let analyzing = $state(false);
	let analyzed = $state(false);
	let fileInput: HTMLInputElement;

	function reset() {
		name = '';
		calories = '';
		protein = '';
		carbs = '';
		fat = '';
		imagePreview = null;
		imageKey = null;
		analyzing = false;
		analyzed = false;
	}

	function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				// Return just the base64 part (remove data:image/...;base64, prefix)
				resolve(result);
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	async function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (!target.files || !target.files[0]) return;

		const file = target.files[0];

		imagePreview = URL.createObjectURL(file);
		analyzing = true;
		analyzed = false;

		try {
			const base64 = await fileToBase64(file);
			const mimeType = file.type || 'image/jpeg';

			const result = await analyzeMealImage({
				imageData: base64,
				mimeType,
				fileName: file.name
			});

			name = result.name;
			calories = String(result.calories);
			protein = String(result.protein);
			carbs = String(result.carbs);
			fat = String(result.fat);
			imageKey = result.imageKey;
			analyzed = true;

			toast.success('Meal analyzed!', {
				description: `${result.name} - ${result.calories} kcal`
			});
		} catch (err: unknown) {
			console.error('Analysis failed', err);
			const message = err instanceof Error ? err.message : 'Failed to analyze meal';
			toast.error(message);
			imagePreview = null;
			imageKey = null;
		} finally {
			analyzing = false;
		}
	}

	function clearImage() {
		imagePreview = null;
		imageKey = null;
		analyzed = false;
		if (fileInput) fileInput.value = '';
	}

	function handleSubmit() {
		if (!name || !calories) return;

		onAdd?.({
			name,
			calories: parseInt(calories),
			protein: protein ? parseInt(protein) : undefined,
			carbs: carbs ? parseInt(carbs) : undefined,
			fat: fat ? parseInt(fat) : undefined,
			imageKey: imageKey || undefined
		});

		open = false;
		reset();
	}
</script>

<ResponsiveDialog
	bind:open
	title="Log Meal"
	subtitle="Snap a photo for instant AI analysis."
	contentClass="sm:max-w-md"
>
	<div class="space-y-5 py-4">
		<!-- Image Upload Area -->
		<div class="relative">
			<button
				type="button"
				class="border-muted-foreground/25 hover:border-primary/50 bg-muted/30 hover:bg-muted/50 relative flex aspect-4/3 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all"
				onclick={() => fileInput?.click()}
				disabled={analyzing}
			>
				{#if imagePreview}
					<img src={imagePreview} alt="Preview" class="h-full w-full object-cover" />
					{#if analyzed}
						<div
							class="absolute top-3 left-3 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"
						>
							<SparklesIcon class="size-3" />
							AI Analyzed
						</div>
					{/if}
				{:else}
					<div
						class="bg-primary/10 text-primary mb-3 flex h-14 w-14 items-center justify-center rounded-full"
					>
						<CameraIcon class="size-7" />
					</div>
					<p class="text-foreground font-medium">Take a photo</p>
					<p class="text-muted-foreground text-xs mt-1">AI will analyze nutrition instantly</p>
				{/if}

				{#if analyzing}
					<div
						class="bg-background/90 absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm"
					>
						<div class="relative">
							<Loader2Icon class="text-primary size-10 animate-spin" />
							<SparklesIcon class="text-primary absolute -top-1 -right-1 size-4 animate-pulse" />
						</div>
						<p class="text-foreground mt-4 font-medium">Analyzing with AI...</p>
						<p class="text-muted-foreground text-xs mt-1">Estimating nutrition facts</p>
					</div>
				{/if}

				<input
					type="file"
					accept="image/jpeg,image/png,image/webp,image/heic"
					capture="environment"
					bind:this={fileInput}
					onchange={handleFileSelect}
					class="hidden"
				/>
			</button>

			{#if imagePreview && !analyzing}
				<button
					type="button"
					class="absolute top-2 right-2 bg-background/80 hover:bg-destructive hover:text-white p-1.5 rounded-full transition-colors"
					onclick={clearImage}
				>
					<XIcon class="size-4" />
				</button>
			{/if}
		</div>

		<!-- Form Fields -->
		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="name">Meal Name</Label>
				<Input
					id="name"
					type="text"
					placeholder="e.g., Grilled Chicken Salad"
					bind:value={name}
					class="text-base h-12"
				/>
			</div>

			<div class="space-y-2">
				<Label for="calories">Calories</Label>
				<div class="relative">
					<Input
						id="calories"
						type="number"
						inputmode="numeric"
						placeholder="0"
						bind:value={calories}
						class="text-xl font-bold h-14 pr-16"
					/>
					<div
						class="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none"
					>
						<FlameIcon class="size-5 {calories ? 'text-orange-500' : ''}" />
						<span class="text-sm font-medium">kcal</span>
					</div>
				</div>
			</div>

			<!-- Macros -->
			<div class="grid grid-cols-3 gap-3">
				<div class="space-y-1.5">
					<Label for="protein" class="text-xs text-muted-foreground">Protein</Label>
					<div class="relative">
						<Input
							id="protein"
							type="number"
							inputmode="numeric"
							placeholder="0"
							bind:value={protein}
							class="text-center pr-6"
						/>
						<span
							class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none"
							>g</span
						>
					</div>
				</div>
				<div class="space-y-1.5">
					<Label for="carbs" class="text-xs text-muted-foreground">Carbs</Label>
					<div class="relative">
						<Input
							id="carbs"
							type="number"
							inputmode="numeric"
							placeholder="0"
							bind:value={carbs}
							class="text-center pr-6"
						/>
						<span
							class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none"
							>g</span
						>
					</div>
				</div>
				<div class="space-y-1.5">
					<Label for="fat" class="text-xs text-muted-foreground">Fat</Label>
					<div class="relative">
						<Input
							id="fat"
							type="number"
							inputmode="numeric"
							placeholder="0"
							bind:value={fat}
							class="text-center pr-6"
						/>
						<span
							class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none"
							>g</span
						>
					</div>
				</div>
			</div>
		</div>

		<!-- Submit Button -->
		<Button
			onclick={handleSubmit}
			disabled={!name || !calories || analyzing}
			class="w-full h-14 text-base font-bold"
		>
			{#if analyzing}
				<Loader2Icon class="mr-2 size-5 animate-spin" />
				Analyzing...
			{:else}
				<CheckIcon class="mr-2 size-5" />
				Log Meal
			{/if}
		</Button>
	</div>
</ResponsiveDialog>
