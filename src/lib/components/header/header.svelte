<script lang="ts">
	import { resolve } from '$app/paths';
	import HamburgerIcon from '@lucide/svelte/icons/hamburger';
	import type { User } from 'better-auth';
	import HeaderUserMenu from './header-user-menu.svelte';

	let { user }: { user: User } = $props();
</script>

<header class="bg-background sticky top-0 z-50 w-full px-4 transition-all">
	<div class="flex h-14 w-full items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<a href={resolve('/')} class="flex items-center gap-2 font-medium">
				<div
					class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
				>
					<HamburgerIcon class="size-4" />
				</div>
				Calories
			</a>
		</div>
		<div class="flex items-center gap-2">
			<HeaderUserMenu {user} />
		</div>
	</div>
</header>
