<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import type { Context } from './context';
	import { toggle } from './functions';

	let {
		class: className = '',
		children,
		disabled = false
	}: {
		class?: string;
		children: Snippet;
		disabled?: boolean;
	} = $props();

	let context: Context = getContext('dropdown');

	const handleClick = () => {
		toggle(context);
		context.onExpand(context.isExpanded);
	};

	const handleEnter = (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (context.isExpanded && context.currentIndex > -1) return;
			else handleClick();
		}
	};
</script>

<button
	onclick={handleClick}
	class={className}
	onkeydown={handleEnter}
	{disabled}
	style:anchor-name="--dropdown-{context.uid}"
>
	{@render children()}
</button>
