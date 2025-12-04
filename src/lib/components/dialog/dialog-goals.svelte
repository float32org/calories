<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		InputGroup,
		InputGroupAddon,
		InputGroupInput,
		InputGroupText
	} from '$lib/components/ui/input-group';
	import { Label } from '$lib/components/ui/label';
	import { getProfile, updateProfile } from '$lib/remote/profile.remote';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import { toast } from 'svelte-sonner';
	import ResponsiveDialog from './dialog-responsive.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const initialProfile = await getProfile();

	const profile = $derived(getProfile().current ?? initialProfile);

	const units = $derived(profile?.units ?? 'imperial');

	let calorieGoal = $state('');
	let waterGoal = $state('');
	let weightGoal = $state('');
	let saving = $state(false);

	const weightUnit = $derived(units === 'imperial' ? 'lbs' : 'kg');
	const waterUnit = $derived(units === 'imperial' ? 'oz' : 'ml');

	$effect(() => {
		if (open && profile) {
			calorieGoal = String(profile.calorieGoal ?? 2200);
			waterGoal = String(profile.waterGoal ?? (units === 'imperial' ? 64 : 2000));
			weightGoal = profile.weightGoal ? String(profile.weightGoal) : '';
		}
	});

	async function handleSave() {
		if (!calorieGoal) return;

		saving = true;

		try {
			await updateProfile({
				calorieGoal: parseInt(calorieGoal),
				waterGoal: parseInt(waterGoal),
				...(weightGoal && { weightGoal: parseFloat(weightGoal) })
			}).updates(getProfile());
			open = false;
		} catch (err) {
			console.error('Failed to save settings:', err);
			toast.error('Failed to save settings');
		} finally {
			saving = false;
		}
	}
</script>

<ResponsiveDialog
	bind:open
	title="Goals"
	subtitle="Set your nutrition targets"
	contentClass="sm:max-w-md"
>
	<div class="space-y-6 py-4">
		<div class="space-y-2">
			<Label for="weightGoal">Goal Weight</Label>
			<InputGroup>
				<InputGroupInput
					id="weightGoal"
					type="number"
					step="0.1"
					placeholder="Enter goal weight"
					bind:value={weightGoal}
				/>
				<InputGroupAddon>
					<InputGroupText>{weightUnit}</InputGroupText>
				</InputGroupAddon>
			</InputGroup>
		</div>

		<div class="space-y-2">
			<Label for="calorieGoal">Daily Calorie Goal</Label>
			<InputGroup>
				<InputGroupInput
					id="calorieGoal"
					type="number"
					placeholder="2200"
					bind:value={calorieGoal}
				/>
				<InputGroupAddon>
					<InputGroupText>kcal</InputGroupText>
				</InputGroupAddon>
			</InputGroup>
		</div>

		<div class="space-y-2">
			<Label for="waterGoal">Daily Water Goal</Label>
			<InputGroup>
				<InputGroupInput id="waterGoal" type="number" placeholder="64" bind:value={waterGoal} />
				<InputGroupAddon>
					<InputGroupText>{waterUnit}</InputGroupText>
				</InputGroupAddon>
			</InputGroup>
		</div>

		<Button onclick={handleSave} disabled={!calorieGoal || saving} class="w-full">
			{#if saving}
				<Loader2Icon class="mr-2 size-4 animate-spin" />
				Saving...
			{:else}
				Save Settings
			{/if}
		</Button>
	</div>
</ResponsiveDialog>
