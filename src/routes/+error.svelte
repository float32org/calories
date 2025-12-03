<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Header } from '$lib/components/header';
	import { Button } from '$lib/components/ui/button';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import HomeIcon from '@lucide/svelte/icons/home';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	const errors: Record<number, { title: string; message: string }> = {
		404: { title: 'Page Not Found', message: "The page you're looking for doesn't exist." },
		403: { title: 'Access Denied', message: "You don't have permission to view this page." },
		500: { title: 'Server Error', message: 'Something went wrong on our end.' }
	};

	const errorInfo = $derived(
		errors[page.status] || {
			title: 'Something Went Wrong',
			message: page.error?.message || 'An unexpected error occurred.'
		}
	);

	const user = $derived(page.data?.user);
</script>

<svelte:head>
	<title>{errorInfo.title}</title>
</svelte:head>

<div class="flex h-dvh flex-col bg-background">
	<Header {user} />

	<main class="flex flex-1 flex-col items-center justify-center px-6">
		<div class="mx-auto flex w-full max-w-md flex-col items-center text-center">
			<div class="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
				<AlertCircleIcon class="size-8 text-muted-foreground" />
			</div>

			<p class="mb-1 text-sm font-medium text-muted-foreground">Error {page.status}</p>

			<h1 class="mb-2 text-xl font-bold tracking-tight">
				{errorInfo.title}
			</h1>

			<p class="mb-6 text-sm text-muted-foreground">
				{errorInfo.message}
			</p>

			<div class="flex gap-3">
				<Button variant="outline" onclick={() => window.location.reload()}>
					<RefreshCwIcon class="size-4" />
					Try again
				</Button>
				<Button onclick={() => goto(resolve('/'))}>
					<HomeIcon class="size-4" />
					Go home
				</Button>
			</div>
		</div>
	</main>
</div>
