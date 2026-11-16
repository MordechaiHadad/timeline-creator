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
	<button onclick={onZoomIn} class="ui-btn w-8 px-0" title="Zoom in" aria-label="Zoom in">
		<ZoomIn size={16} />
	</button>
	<button onclick={onZoomOut} class="ui-btn w-8 px-0" title="Zoom out" aria-label="Zoom out">
		<ZoomOut size={16} />
	</button>
	<button onclick={onReset} class="ui-btn" title="Reset zoom">
		<RotateCcw size={14} />
		Reset
	</button>
</div>
