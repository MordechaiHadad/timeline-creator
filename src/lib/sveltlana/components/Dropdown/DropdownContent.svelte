<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import type { Context } from './context';
	import { slide } from 'svelte/transition';
	import { twMerge } from 'tailwind-merge';

	let {
		class: className = '',
		children,
		transition = slide
	}: { class?: string; children: Snippet; transition?: typeof slide } = $props();

	let context: Context = getContext('dropdown');
</script>

{#if context.isExpanded}
	<div
		id="dropdown-content"
		class={twMerge('z-50 flex flex-col', className)}
		transition:transition
		style:position-anchor="--dropdown-{context.uid}"
	>
		{@render children()}
	</div>
{/if}

<style>
	:global(#dropdown-content) {
		position: fixed;
		position-area: bottom;
		position-try-fallbacks: flip-block, flip-inline;
		margin-top: 4px;
	}
</style>
