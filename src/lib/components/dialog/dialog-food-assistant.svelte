<script lang="ts">
	import { Markdown } from '$lib/components/markdown';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { Message, MessagePart } from '$lib/messages';
	import type { AssistantContext } from '$lib/server/assistant';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import ChefHatIcon from '@lucide/svelte/icons/chef-hat';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import XIcon from '@lucide/svelte/icons/x';
	import { DefaultChatTransport, readUIMessageStream } from 'ai';
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import DialogFoodAssistantCard from './dialog-food-assistant-card.svelte';
	import ResponsiveDialog from './dialog-responsive.svelte';

	class StreamParser extends DefaultChatTransport<Message> {
		public parseStream(stream: ReadableStream<Uint8Array>) {
			return this.processResponseStream(stream);
		}
	}

	type MealData = {
		name: string;
		calories: number;
		servings?: number;
		protein?: number;
		carbs?: number;
		fat?: number;
	};

	let {
		open = $bindable(false),
		context,
		onLogMeal
	}: {
		open?: boolean;
		context: AssistantContext;
		onLogMeal?: (meal: MealData) => void;
	} = $props();

	let mode = $state<'select' | 'chat'>('select');
	let selectedMode = $state<'ingredients' | 'menu' | 'ask' | null>(null);
	let imagePreview = $state<string | null>(null);
	let imageData = $state<{ base64: string; mimeType: string } | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let messagesContainer = $state<HTMLDivElement | null>(null);
	let input = $state('');
	let messages = $state<Message[]>([]);
	let isStreaming = $state(false);

	const remainingCalories = $derived(Math.max(0, context.calorieGoal - context.caloriesConsumed));

	function reset() {
		mode = 'select';
		selectedMode = null;
		imagePreview = null;
		imageData = null;
		input = '';
		messages = [];
		isStreaming = false;
	}

	$effect(() => {
		if (!open) {
			setTimeout(reset, 300);
		}
	});

	$effect(() => {
		if (messages.length > 0 && messagesContainer) {
			tick().then(() => {
				messagesContainer?.scrollTo({
					top: messagesContainer.scrollHeight,
					behavior: 'smooth'
				});
			});
		}
	});

	function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	async function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (!target.files || !target.files[0]) return;

		const file = target.files[0];
		imagePreview = URL.createObjectURL(file);

		const base64 = await fileToBase64(file);
		const mimeType = file.type || 'image/jpeg';
		imageData = { base64, mimeType };
	}

	function clearImage() {
		imagePreview = null;
		imageData = null;
		if (fileInput) fileInput.value = '';
	}

	function selectMode(type: 'ingredients' | 'menu' | 'ask') {
		selectedMode = type;
		mode = 'chat';

		if (type === 'ingredients') {
			input = imageData ? "Here's what I have. What can I make?" : '';
		} else if (type === 'menu') {
			input = imageData ? "Here's the menu. What should I order?" : '';
		} else {
			input = '';
		}
	}

	async function handleSend(e?: Event) {
		e?.preventDefault();
		if (!input.trim() && !imageData) return;
		if (isStreaming) return;

		const userText = input.trim();
		const currentImageData = imageData;
		const userParts: MessagePart[] = [];

		if (currentImageData) {
			userParts.push({
				type: 'file',
				url: currentImageData.base64,
				mediaType: currentImageData.mimeType
			});
		}
		if (userText) {
			userParts.push({ type: 'text', text: userText });
		}

		const userMessage: Message = {
			id: crypto.randomUUID(),
			role: 'user',
			parts: userParts
		};
		messages = [...messages, userMessage];

		input = '';
		isStreaming = true;

		if (imageData) {
			imageData = null;
			imagePreview = null;
		}

		try {
			const response = await fetch('/api/assistant', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages, context })
			});

			if (!response.ok) {
				throw new Error(`Failed to get response: ${response.statusText}`);
			}

			if (!response.body) {
				throw new Error('Response body is null');
			}

			const parser = new StreamParser();
			const chunkStream = parser.parseStream(response.body);

			try {
				for await (const message of readUIMessageStream<Message>({
					stream: chunkStream,
					terminateOnError: true,
					onError: (error) => console.error('Stream parse error:', error)
				})) {
					const idx = messages.findIndex((m) => m.id === message.id);
					if (idx === -1) {
						messages = [...messages, message];
					} else {
						messages[idx] = message;
						messages = [...messages];
					}
				}
			} catch (streamErr) {
				if (!(streamErr instanceof TypeError && String(streamErr).includes('cancel'))) {
					throw streamErr;
				}
			}
		} catch (err) {
			console.error('Chat error:', err);
			toast.error('Something went wrong. Please try again.');
		} finally {
			isStreaming = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function getMessageText(msg: Message): string {
		if (!msg.parts) return '';
		return (
			msg.parts
				.filter((p) => p.type === 'text')
				.map((p) => p.text)
				.join('\n') || ''
		);
	}

	function hasRenderableContent(msg: Message): boolean {
		return (
			msg.parts?.some((p) => (p.type === 'text' && p.text) || p.type === 'tool-suggestFood') ??
			false
		);
	}

	const modeOptions = [
		{
			id: 'ingredients' as const,
			icon: ChefHatIcon,
			title: 'What can I make?',
			description: 'Upload a photo of ingredients',
			color: 'text-emerald-500',
			bgColor: 'bg-emerald-500/10'
		},
		{
			id: 'menu' as const,
			icon: MenuIcon,
			title: 'Help me order',
			description: 'Upload a restaurant menu',
			color: 'text-blue-500',
			bgColor: 'bg-blue-500/10'
		},
		{
			id: 'ask' as const,
			icon: MessageCircleIcon,
			title: 'Just ask',
			description: 'Get meal suggestions',
			color: 'text-violet-500',
			bgColor: 'bg-violet-500/10'
		}
	];
</script>

<ResponsiveDialog
	bind:open
	title="Food Assistant"
	subtitle="Get personalized meal suggestions"
	contentClass="sm:max-w-lg h-[80vh] sm:h-[600px] flex flex-col overflow-hidden"
	onBack={mode === 'chat' ? reset : undefined}
>
	<div class="flex flex-col flex-1 min-h-0">
		{#if mode === 'select'}
			<div class="flex flex-1 flex-col py-4">
				<div class="mb-6 rounded-xl bg-linear-to-r from-primary/10 to-primary/5 p-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Remaining today
							</p>
							<p class="text-2xl font-bold tabular-nums">
								{remainingCalories.toLocaleString()}
								<span class="text-sm font-medium text-muted-foreground">kcal</span>
							</p>
						</div>
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
						>
							<SparklesIcon class="size-6" />
						</div>
					</div>
				</div>

				<div class="mb-4">
					<p class="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Have a photo?
					</p>
					{#if imagePreview}
						<div class="relative">
							<div class="relative aspect-video overflow-hidden rounded-xl border">
								<img src={imagePreview} alt="Preview" class="h-full w-full object-cover" />
								<div
									class="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
								>
									<ImageIcon class="size-3" />
									Ready to analyze
								</div>
							</div>
							<button
								type="button"
								class="absolute -right-2 -top-2 rounded-full border bg-background p-1.5 shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
								onclick={clearImage}
							>
								<XIcon class="size-3" />
							</button>
						</div>
					{:else}
						<button
							type="button"
							class="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 p-4 transition-all hover:border-primary/50 hover:bg-muted/40"
							onclick={() => fileInput?.click()}
						>
							<div class="rounded-full bg-muted p-2">
								<CameraIcon class="size-5 text-muted-foreground" />
							</div>
							<div class="text-left">
								<p class="text-sm font-medium">Upload a photo</p>
								<p class="text-xs text-muted-foreground">Ingredients, menu, or food</p>
							</div>
						</button>
					{/if}
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/heic"
						capture="environment"
						bind:this={fileInput}
						onchange={handleFileSelect}
						class="hidden"
					/>
				</div>

				<p class="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					What would you like help with?
				</p>
				<div class="grid gap-2">
					{#each modeOptions as option (option.id)}
						<button
							type="button"
							class="group flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/30 hover:bg-muted/50"
							onclick={() => selectMode(option.id)}
						>
							<div class={`rounded-lg p-2 ${option.bgColor}`}>
								<option.icon class={`size-5 ${option.color}`} />
							</div>
							<div class="flex-1">
								<p class="font-medium">{option.title}</p>
								<p class="text-xs text-muted-foreground">{option.description}</p>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="flex flex-1 flex-col overflow-hidden">
				<div
					bind:this={messagesContainer}
					class="flex-1 space-y-4 overflow-y-auto"
					style="scrollbar-width: thin;"
				>
					{#if messages.length === 0 && !isStreaming}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<div class="mb-3 rounded-full bg-muted p-3">
								<SparklesIcon class="size-6 text-muted-foreground" />
							</div>
							<p class="font-medium">Ask me anything about food!</p>
							<p class="text-sm text-muted-foreground">
								{#if selectedMode === 'ingredients'}
									Tell me what ingredients you have
								{:else if selectedMode === 'menu'}
									Share the menu you're looking at
								{:else}
									I'll help you find the perfect meal
								{/if}
							</p>
						</div>
					{/if}

					{#each messages as message (message.id)}
						<div class={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
							{#if message.role === 'user'}
								<div
									class="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2 text-primary-foreground shadow-xs"
								>
									<p class="whitespace-pre-wrap text-sm">{getMessageText(message)}</p>
								</div>
							{:else}
								<div class="flex gap-2 max-w-[85%]">
									<div
										class="shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center mt-1"
									>
										<SparklesIcon class="size-4 text-muted-foreground" />
									</div>
									<div class="flex flex-col gap-2 min-w-0">
										<div class="rounded-2xl rounded-tl-md bg-muted/50 px-4 py-3 shadow-sm">
											{#if hasRenderableContent(message)}
												{#each message.parts as part, i (i)}
													{#if part.type === 'text' && part.text}
														<Markdown source={part.text} class="text-sm leading-relaxed" />
													{:else if part.type === 'tool-suggestFood' && part.state === 'input-available'}
														<DialogFoodAssistantCard
															name={part.input.name}
															calories={part.input.calories}
															protein={part.input.protein}
															carbs={part.input.carbs}
															fat={part.input.fat}
															onLog={() => onLogMeal?.(part.input as MealData)}
														/>
													{/if}
												{/each}
											{:else}
												<div class="flex items-center gap-2">
													<Loader2Icon class="size-4 animate-spin text-muted-foreground" />
													<span class="text-sm text-muted-foreground">Thinking...</span>
												</div>
											{/if}
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<div class="shrink-0 pt-2">
					{#if imagePreview && messages.length === 0}
						<div class="mb-2 flex items-center gap-2">
							<div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
								<img src={imagePreview} alt="Attached" class="h-full w-full object-cover" />
							</div>
							<span class="text-xs text-muted-foreground">Image attached</span>
							<button
								type="button"
								class="ml-auto text-xs text-muted-foreground hover:text-destructive"
								onclick={clearImage}
							>
								Remove
							</button>
						</div>
					{/if}
					<form onsubmit={handleSend} class="flex items-end gap-2">
						<div class="relative flex-1">
							<Textarea
								bind:value={input}
								placeholder={selectedMode === 'ingredients'
									? 'What ingredients do you have?'
									: selectedMode === 'menu'
										? 'Describe the menu or your preferences...'
										: 'What are you in the mood for?'}
								class="max-h-[120px] min-h-[44px] resize-none pr-12 text-base"
								rows={1}
								onkeydown={handleKeydown}
								disabled={isStreaming}
							/>
						</div>
						<Button
							type="submit"
							size="icon"
							class="h-11 w-11 shrink-0 rounded-xl"
							disabled={(!input.trim() && !imageData) || isStreaming}
						>
							{#if isStreaming}
								<Loader2Icon class="size-5 animate-spin" />
							{:else}
								<ArrowUpIcon class="size-5" />
							{/if}
						</Button>
					</form>
				</div>
			</div>
		{/if}
	</div>
</ResponsiveDialog>
