<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { writable } from 'svelte/store';

	const sidebarOpen = writable(true);

	const caminhos = [
		{ id: 'a1', name: 'Caminho A' },
		{ id: 'a2', name: 'Caminho A' },
		{ id: 'a3', name: 'Caminho A' }
	];

	const menuIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>`;
	const plusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>`;

	function openSidebar() {
		sidebarOpen.set(true);
	}
	function closeSidebar() {
		sidebarOpen.set(false);
	}
</script>

<svelte:head>
	<title>EasyPath - Dashboard</title>
</svelte:head>

<div class="bg-background text-text flex h-screen">
	<!-- Sidebar: hidden on mobile, toggled with menu button -->
	{#if $sidebarOpen}
		<Sidebar />
	{/if}

	<div class="relative flex-1 overflow-y-auto p-6 md:p-10">
		<div class="mb-8 flex items-center justify-between">
			<h1 class="text-text-emphasis text-3xl font-bold">Dashboard</h1>
			<!-- Menu button: only visible on mobile -->
			<button
				class="focus:ring-primary rounded-md p-2 hover:bg-gray-700 focus:ring-2 focus:outline-none md:hidden"
				aria-label="Abrir menu lateral"
				on:click={openSidebar}
			>
				{@html menuIcon}
			</button>
		</div>

		<div>
			<h2 class="text-text-secondary mb-2 text-2xl font-semibold">Caminhos</h2>
			<p class="text-text-muted mb-6 text-sm">
				Escolha um caminho para começar ou adicione um novo.
			</p>
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{#each caminhos as caminho}
					<div
						class="bg-card-background flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl p-6 shadow-lg transition-all duration-200 outline-none hover:scale-105 hover:shadow-xl focus:scale-105"
						tabindex="0"
						role="button"
						aria-label={'Abrir ' + caminho.name}
					>
						<span class="mb-2 text-5xl">🛣️</span>
						<h3 class="text-card-text text-lg font-medium">{caminho.name}</h3>
					</div>
				{/each}

				<a href="/create-pathway">
					<div
						class="bg-card-background hover:border-primary flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-600 p-6 shadow-lg transition-all duration-200 outline-none hover:scale-105 hover:shadow-xl focus:scale-105"
						tabindex="0"
						role="button"
						aria-label="Adicionar novo caminho"
					>
						{@html plusIcon}
						<p class="text-text-muted mt-2 text-sm">Adicionar</p>
					</div>
				</a>
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	.bg-background {
		background-color: var(--color-background, #1a202c);
	}
	.text-text {
		color: var(--color-text, #e2e8f0);
	}
	.text-text-emphasis {
		color: var(--color-primary-text, var(--color-text, #e2e8f0));
	}
	.text-text-secondary {
		color: var(--color-text-secondary, #a0aec0);
	}
	.text-text-muted {
		color: var(--color-text-muted, #718096);
	}
	.bg-card-background {
		background-color: var(--color-secondary, #2d3748);
	}
	.text-card-text {
		color: var(--color-text-on-secondary, var(--color-text, #e2e8f0));
	}
	.hover\:border-primary:hover {
		border-color: var(--color-primary);
	}
	.focus\:ring-primary:focus {
		--tw-ring-color: var(--color-primary);
	}
	/* Add scale effect for card hover/focus */
	.hover\:scale-105:hover,
	.focus\:scale-105:focus {
		transform: scale(1.05);
	}
</style>
