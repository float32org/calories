<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { signOut } from '$lib/auth';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import GoalIcon from '@lucide/svelte/icons/goal';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import UserIcon from '@lucide/svelte/icons/user';
	import type { User } from 'better-auth';

	let {
		user,
		onGoalsClick,
		onProfileClick
	}: { user: User; onGoalsClick?: () => void; onProfileClick?: () => void } = $props();
</script>

<DropdownMenu>
	<DropdownMenuTrigger>
		{#snippet child({ props })}
			<Avatar
				class="size-8 rounded-md"
				aria-label="User menu for {user?.name || 'User'}"
				{...props}
			>
				{#if user && user.image}
					<AvatarImage src={user.image} alt={user.name || 'User avatar'} />
				{/if}
				<AvatarFallback class="size-8 rounded-md">
					{user?.name?.[0] || '?'}
				</AvatarFallback>
			</Avatar>
		{/snippet}
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end" preventScroll={false}>
		<DropdownMenuItem onclick={onGoalsClick}>
			<GoalIcon class="size-4" />
			<span>Goals</span>
		</DropdownMenuItem>
		<DropdownMenuItem onclick={onProfileClick}>
			<UserIcon class="size-4" />
			<span>Profile</span>
		</DropdownMenuItem>
		<DropdownMenuItem onclick={() => goto(resolve('/settings'))}>
			<SettingsIcon class="size-4" />
			<span>Settings</span>
		</DropdownMenuItem>
		<DropdownMenuItem
			onclick={async () => {
				await signOut();
				goto(resolve('/signin'), { invalidateAll: true });
			}}
		>
			<LogOutIcon class="size-4" />
			<span>Sign out</span>
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
