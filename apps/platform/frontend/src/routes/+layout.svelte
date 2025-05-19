<script lang="ts">
	import '../app.css';
	import TopAppBar from '$lib/components/TopAppBar.svelte';
	import { onMount } from 'svelte';

	// mainElement definido no bind:this
	let mainElement: HTMLElement;

	// Essa função roda quando a tela é inicializada
	onMount(() => {
		// Arrumo o padding da pagina
		const updateMainPadding = () => {
			const topAppBar = document.getElementById('topAppBar');
			if (topAppBar && mainElement) {
				const topAppBarHeight = topAppBar.offsetHeight;
				mainElement.style.paddingTop = `${topAppBarHeight}px`;
			}
		};

		updateMainPadding();

		window.addEventListener('resize', updateMainPadding);

		return () => {
			window.removeEventListener('resize', updateMainPadding);
		};
	});
</script>

<div class="bg-background text-text flex min-h-screen flex-col">
	<TopAppBar />

	<main bind:this={mainElement} class="flex flex-1 flex-col overflow-y-auto">
		<slot />
	</main>
</div>

<style>
	/* You can add layout-specific styles here if needed,
     but Tailwind classes are preferred for consistency. */
</style>
