<script lang="ts">
	import { SvelteFlow, Controls, Background, MiniMap, BackgroundVariant } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	let nodeIdCounter = $state(2);

	let nodes = $state.raw([
		{
			id: '1',
			type: 'input',
			data: { label: 'Start' },
			position: { x: 0, y: 0 }
		}
	]);

	let edges = $state.raw([]);

	const nodeTypes = [
		{ value: 'default', label: 'Default Node' },
		{ value: 'input', label: 'Input Node' },
		{ value: 'output', label: 'Output Node' }
	];

	let selectedNodeType = $state(nodeTypes[0].value);

	function addNode() {
		const newNode = {
			id: String(++nodeIdCounter),
			type: selectedNodeType,
			data: { label: `Node ${nodeIdCounter}` },
			position: {
				x: Math.random() * 500,
				y: Math.random() * 300
			}
		};

		nodes = [...nodes, newNode];
	}

	function clearFlow() {
		if (confirm('Are you sure you want to clear the flow?')) {
			nodes = [];
			edges = [];
			nodeIdCounter = 0;
		}
	}
</script>

<!-- Container -->
<div
	class="flex h-screen overflow-hidden bg-[var(--color-background-900)] text-[var(--color-text-500)]"
>
	<!-- Sidebar -->
	<aside
		class="z-10 flex w-64 flex-col gap-4 border-r p-4 shadow-lg"
		style="
			background-color: var(--color-background-100);
			color: var(--color-text-500);
			border-color: var(--color-secondary-200);
		"
	>
		<h2 class="text-text-500 text-xl font-bold">Creation Flow</h2>

		<div>
			<label class="mb-1 block text-sm font-medium" style="color: var(--color-text-400);"
				>Node Type</label
			>
			<select
				bind:value={selectedNodeType}
				class="w-full rounded-md border p-2 text-sm"
				style="
					background-color: var(--color-background-200);
					color: var(--color-text-700);
					border-color: var(--color-secondary-300);
				"
			>
				{#each nodeTypes as type}
					<option value={type.value}>{type.label}</option>
				{/each}
			</select>
		</div>

		<button
			onclick={addNode}
			class="bg-primary-600 hover:bg-primary-700 rounded px-4 py-2 text-sm font-medium text-white transition-colors"
		>
			+ Add Node
		</button>

		<button
			onclick={clearFlow}
			class="bg-secondary-200 hover:bg-secondary-300 rounded px-4 py-2 text-sm font-medium text-white transition-colors"
		>
			Clear Flow
		</button>

		<!-- Stats -->
		<div class="mt-auto text-sm" style="color: var(--color-text-400);">
			<p>Nodes: {nodes.length}</p>
			<p>Edges: {edges.length}</p>
		</div>
	</aside>

	<!-- Canvas Area -->
	<main class="relative flex-1">
		<SvelteFlow bind:nodes bind:edges fitView class="h-full">
			<Controls class="!bg-[var(--color-background-200)] !text-[var(--color-text-500)]" />
			<Background
				variant={BackgroundVariant.Dots}
				gap={12}
				size={1}
				bgColor="var(--color-secondary-200)"
			/>
			<MiniMap class="!bg-[var(--color-background-200)]" />
		</SvelteFlow>
	</main>
</div>

<style>
	:global(.dark) {
		color-scheme: dark;
	}
</style>
