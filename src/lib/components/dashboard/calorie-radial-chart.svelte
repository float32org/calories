<script lang="ts">
	import { fade } from 'svelte/transition';

	type Meal = {
		id: string;
		name: string;
		calories: number;
		color?: string;
	};

	let {
		meals = [],
		goal = 2000,
		size = 300,
		thickness = 20
	}: {
		meals: Meal[];
		goal: number;
		size?: number;
		thickness?: number;
	} = $props();

	const CENTER = size / 2;
	const RADIUS = size / 2 - thickness;

	// Generate consistently spaced segments
	let segments = $derived.by(() => {
		let currentAngle = 0;
		const gapSize = meals.length > 1 ? 2 : 0; // Degrees of gap

		// If we have meals, map them.
		return meals.map((meal, i) => {
			// Calculate this meal's share of the *filled* portion (not total goal)
			// to make segments proportional to each other within the progress arc?
			// Actually, usually radial charts show relative size to goal.
			// Let's stick to: (meal.cals / goal) * 360.

			const percentage = Math.min(meal.calories / goal, 1);
			const angleSize = percentage * 360;

			const start = currentAngle;
			const end = currentAngle + angleSize - (meals.length > 1 ? gapSize : 0);

			currentAngle += angleSize;

			return {
				...meal,
				start,
				end,
				largeArc: angleSize > 180 ? 1 : 0,
				color: `var(--chart-${(i % 5) + 1})`
			};
		});
	});

	let totalCalories = $derived(meals.reduce((acc, m) => acc + m.calories, 0));
	let remaining = $derived(Math.max(0, goal - totalCalories));

	// Function to create arc path
	function describeArc(startAngle: number, endAngle: number) {
		const start = polarToCartesian(CENTER, CENTER, RADIUS, endAngle);
		const end = polarToCartesian(CENTER, CENTER, RADIUS, startAngle);
		const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

		return ['M', start.x, start.y, 'A', RADIUS, RADIUS, 0, largeArcFlag, 0, end.x, end.y].join(' ');
	}

	function polarToCartesian(
		centerX: number,
		centerY: number,
		radius: number,
		angleInDegrees: number
	) {
		const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
		return {
			x: centerX + radius * Math.cos(angleInRadians),
			y: centerY + radius * Math.sin(angleInRadians)
		};
	}
</script>

<div class="relative flex items-center justify-center" style="width: {size}px; height: {size}px;">
	<svg
		width={size}
		height={size}
		viewBox="0 0 {size} {size}"
		class="rotate-0 transform transition-all duration-500 ease-out"
	>
		<!-- Background Circle -->
		<circle
			cx={CENTER}
			cy={CENTER}
			r={RADIUS}
			fill="none"
			stroke="var(--muted)"
			stroke-width={thickness}
			stroke-linecap="round"
		/>

		<!-- Segments -->
		{#each segments as segment (segment.id)}
			<path
				d={describeArc(segment.start, segment.end)}
				fill="none"
				stroke={segment.color}
				stroke-width={thickness}
				stroke-linecap="round"
				class="transition-all duration-1000 ease-out"
				in:fade={{ duration: 500 }}
			/>
		{/each}
	</svg>

	<!-- Center Content -->
	<div class="absolute inset-0 flex flex-col items-center justify-center text-center">
		<span class="text-sm font-medium text-muted-foreground">Remaining</span>
		<span class="text-4xl font-bold tracking-tighter text-foreground">{remaining}</span>
		<span class="text-xs text-muted-foreground font-medium mt-1">kcal</span>
	</div>
</div>
