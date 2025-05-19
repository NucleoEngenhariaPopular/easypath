<script lang="ts">
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { isMenuSideBarOpen } from '$lib/store';

	const navItems = [
		{ id: 'home', label: 'Dashboard', href: '/dashboard', icon: '🔳' },
		{ id: 'profile', label: 'Perfil', href: '/profile', icon: '👤' },
		{ id: 'settings', label: 'Configurações', href: '/settings', icon: '⚙️' }
	];

	const user = {
		name: 'Moderator',
		email: 'moderator@example.com',
		avatar: 'https://i.pravatar.cc/100?img=5'
	};

	function toggleMenuSideBar() {
		$isMenuSideBarOpen = !$isMenuSideBarOpen;
	}
</script>

<div class="flex h-full">
	{#if $isMenuSideBarOpen}
		<aside
			class=" m-2 flex w-72 flex-col rounded-r-2xl border-r shadow-lg transition-all"
			transition:slide={{ duration: 300, easing: quintOut, axis: 'x' }}
			style="--tw-border-opacity: 1; border-color: var(--color-secondary-200); background-color: var(--color-background-100); color: var(--color-text-500);"
		>
			<!-- User Info -->
			<div
				class="flex items-center gap-3 border-b p-4"
				style="border-color: var(--color-secondary-200);"
			>
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
					style="
                background-color: var(--color-secondary-100);
                color: var(--color-text-500);"
				>
					<span class="material-icons">person</span>
				</div>
				<div>
					<div class="text-lg font-semibold" style="color: var(--color-text-900);">{user.name}</div>
					<div class="text-xs" style="color: var(--color-text-400);">{user.email}</div>
				</div>
				<button
					on:click={toggleMenuSideBar}
					class="ml-auto rounded-full p-2 transition hover:brightness-110"
					style="color: var(--color-text-400);"
				>
					<span class="text-xl">&larr;</span>
				</button>
			</div>

			<!-- Navigation -->
			<nav class="flex-1 space-y-2 p-4">
				{#each navItems as item (item.id)}
					<a
						href={item.href}
						class="flex items-center gap-3 rounded-lg p-3 font-medium transition hover:bg-[var(--color-secondary-100)]"
						style="color: var(--color-text-700);"
						title={item.label}
					>
						<span class="text-xl">{item.icon}</span>
						<span>{item.label}</span>
					</a>
				{/each}
			</nav>
		</aside>
	{:else}
		<aside
			class="m-2 flex w-20 flex-col items-center rounded-r-2xl border-r shadow-lg transition-all"
			style="background-color: var(--color-background-100); color: var(--color-text-500); border-color: var(--color-secondary-200);"
		>
			<button
				on:click={toggleMenuSideBar}
				class="mt-4 rounded-full p-2 transition hover:brightness-110"
				style="color: var(--color-text-400);"
				aria-label="Open sidebar"
				title="Abrir menu"
			>
				<span class="text-xl">&rarr;</span>
			</button>
			<nav class="mt-8 flex flex-col items-center space-y-6">
				{#each navItems as item (item.id)}
					<a
						href={item.href}
						class="rounded-lg p-2 transition hover:bg-[var(--color-secondary-100)]"
						style="color: var(--color-text-700);"
						title={item.label}
					>
						<span class="text-xl">{item.icon}</span>
					</a>
				{/each}
			</nav>
		</aside>
	{/if}
</div>
