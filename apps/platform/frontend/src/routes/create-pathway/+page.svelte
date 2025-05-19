<script lang="ts">
	import FloatingTopBar from '$lib/components/FloatingTopBar.svelte';
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

	function clearNodes() {
		if (confirm('Are you sure you want to clear the flow?')) {
			nodes = [];
			edges = [];
			nodeIdCounter = 0;
		}
	}
</script>

<FloatingTopBar {addNode} {clearNodes} />

<!-- Container -->
<div
	class="flex h-screen overflow-hidden bg-[var(--color-background-900)] text-[var(--color-text-500)]"
>
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
