<script lang="ts">
	import type { User } from 'better-auth';
	import HeaderUserMenu from './header-user-menu.svelte';

	let { user }: { user: User } = $props();
</script>

<header
	class="bg-background/80 fixed inset-x-0 top-0 z-10 flex h-14 items-center justify-between gap-4 px-4 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
>
	<div class="flex items-center gap-4"></div>
	<div class="flex items-center gap-2">
		<HeaderUserMenu {user} />
	</div>
</header>
