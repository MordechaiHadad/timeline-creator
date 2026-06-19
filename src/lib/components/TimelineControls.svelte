<script lang="ts">
	import { ZoomIn, ZoomOut, RotateCcw } from '@lucide/svelte';

	let {
		onZoomIn,
		onZoomOut,
		onReset
	}: {
		onZoomIn: () => void;
		onZoomOut: () => void;
		onReset: () => void;
	} = $props();
</script>

<div class="flex items-center gap-1">
	<button
		onclick={onZoomIn}
		class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
		title="Zoom in"
	>
		<ZoomIn size={16} />
	</button>
	<button
		onclick={onZoomOut}
		class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
		title="Zoom out"
	>
		<ZoomOut size={16} />
	</button>
	<button
		onclick={onReset}
		class="flex h-8 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
		title="Reset zoom"
	>
		<RotateCcw size={14} />
		Reset
	</button>
</div>
