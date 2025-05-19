<script lang="ts">
	import '../app.css';
	import TopAppBar from '$lib/components/TopAppBar.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children } = $props();

	let mainElement: HTMLElement;

	function updateMainPadding() {
		const topAppBar = document.getElementById('topAppBar');
		if (topAppBar && mainElement) {
			const topAppBarHeight = topAppBar.offsetHeight;
			mainElement.style.paddingTop = `${topAppBarHeight}px`;
		}
	}

	onMount(() => {
		updateMainPadding();
		window.addEventListener('resize', updateMainPadding);
		return () => {
			window.removeEventListener('resize', updateMainPadding);
		};
	});

	// Create a derived value that depends on page.url.pathname
	let currentPath = $derived(page.url.pathname);

	$effect(() => {
		// This will run every time currentPath changes
		console.log(currentPath);
		updateMainPadding();
	});
</script>

<div class="bg-background text-text flex min-h-screen flex-col">
	<TopAppBar />
	<main bind:this={mainElement} class="flex flex-1 flex-col overflow-y-auto">
		{@render children?.()}
	</main>
</div>
