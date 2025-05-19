<script lang="ts">
	import { Navbar, NavBrand, NavUl, NavLi, DarkMode } from 'flowbite-svelte';
	import { CogOutline } from 'flowbite-svelte-icons';
	import { page } from '$app/state';

	// Use $state and $derived for reactive values
	let isCreatePathway = $derived(page.url.pathname === '/create-pathway');

	// Use $derived for computed values
	let navPadding = $derived(isCreatePathway ? 'py-1' : 'py-2.5');
	let logoSize = $derived(isCreatePathway ? 'h-5 sm:h-7' : 'h-6 sm:h-9');
	let textSize = $derived(isCreatePathway ? 'text-lg' : 'text-xl');
	let settingsPadding = $derived(isCreatePathway ? 'p-2' : 'p-2.5');
	let iconSize = $derived(isCreatePathway ? 'h-4 w-4' : 'h-5 w-5');

	// Add an effect to ensure updates
	$effect(() => {
		// This will run whenever page.url.pathname changes
		isCreatePathway = page.url.pathname === '/create-pathway';
	});
</script>

<Navbar
	id="topAppBar"
	class={`bg-background border-secondary fixed start-0 top-0 z-20 w-full border-b px-2 ${navPadding} sm:px-4`}
>
	<NavBrand href="/dashboard">
		<img src="/favicon.png" class={`me-3 ${logoSize}`} alt="My Logo" />
		<span class={`text-text self-center font-semibold whitespace-nowrap ${textSize}`}>
			EasyPath
		</span>
	</NavBrand>

	{#if !isCreatePathway}
		<NavUl class="md:order-1">
			<NavLi href="/" class="text-text hover:text-accent dark:text-white">Home</NavLi>
			<NavLi href="/about" class="text-text hover:text-accent">About</NavLi>
			<NavLi class="text-text/70 hidden text-sm md:block">Website Information</NavLi>
		</NavUl>
	{/if}

	<div class="flex items-center md:order-2 rtl:space-x-reverse">
		<DarkMode />
		<a
			href="/settings"
			class={`text-text hover:bg-secondary focus:ring-primary/20 rounded-lg ${settingsPadding} text-sm focus:ring-4 focus:outline-none`}
		>
			<CogOutline class={iconSize} />
		</a>
	</div>
</Navbar>
