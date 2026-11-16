<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import type { Context } from './context.js';
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
		class={twMerge(
			'fixed z-[1000] [margin-block-start:4px] flex flex-col [position-area:block-end] [position-try-fallbacks:flip-block,flip-inline]',
			className
		)}
		transition:transition
		style:position-anchor="--dropdown-{context.uid}"
	>
		{@render children()}
	</div>
{/if}
