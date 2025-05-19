<script lang="ts">
	import { Navbar, NavBrand, NavUl, NavLi, DarkMode } from 'flowbite-svelte';
	import { CogOutline } from 'flowbite-svelte-icons';
	import { page } from '$app/state';

	// Reactive state: is the current page /create-pathway?
	const isCreatePathway = $derived(page.url.pathname === '/create-pathway');

	// Reactive derived values for dynamic classes
	const navPadding = $derived(isCreatePathway ? 'py-1' : 'py-2.5');
	const logoSize = $derived(isCreatePathway ? 'h-5 sm:h-7' : 'h-6 sm:h-9');
	const brandTextSize = $derived(isCreatePathway ? 'text-lg' : 'text-xl'); // Renamed for clarity
	const settingsLinkPadding = $derived(isCreatePathway ? 'p-2' : 'p-2.5'); // Renamed for clarity
	const settingsIconSize = $derived(isCreatePathway ? 'h-4 w-4' : 'h-5 w-5'); // Renamed for clarity

	// No $effect needed here, $derived handles reactivity with page.url.pathname automatically.
</script>

<Navbar
	id="topAppBar"
	class={`bg-background border-secondary fixed start-0 top-0 z-20 w-full border-b px-2 ${navPadding} transition-all duration-300 ease-in-out sm:px-4`}
>
	<NavBrand href="/dashboard">
		<img
			src="/favicon.png"
			class={`me-3 ${logoSize} transition-all duration-300 ease-in-out`}
			alt="My Logo"
		/>
		<span
			class={`text-text self-center font-semibold whitespace-nowrap ${brandTextSize} transition-all duration-300 ease-in-out`}
		>
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
			class={`text-text hover:bg-secondary focus:ring-primary/20 rounded-lg ${settingsLinkPadding} text-sm transition-all duration-300 ease-in-out focus:ring-4 focus:outline-none`}
			aria-label="Settings"
		>
			<CogOutline class={`${settingsIconSize} transition-all duration-300 ease-in-out`} />
		</a>
	</div>
</Navbar>
