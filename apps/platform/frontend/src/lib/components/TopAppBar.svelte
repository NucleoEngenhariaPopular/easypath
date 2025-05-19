<script lang="ts">
	import { Navbar, NavBrand, NavUl, NavLi, DarkMode } from 'flowbite-svelte';
	import { CogOutline } from 'flowbite-svelte-icons';
	import { page } from '$app/stores';

	// Reactive variable to check if we're on the create-pathway page
	$: isCreatePathway = $page.url.pathname === '/create-pathway';

	// Computed class values
	$: navPadding = isCreatePathway ? 'py-1' : 'py-2.5';
	$: logoSize = isCreatePathway ? 'h-5 sm:h-7' : 'h-6 sm:h-9';
	$: textSize = isCreatePathway ? 'text-lg' : 'text-xl';
	$: settingsPadding = isCreatePathway ? 'p-2' : 'p-2.5';
	$: iconSize = isCreatePathway ? 'h-4 w-4' : 'h-5 w-5';
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
