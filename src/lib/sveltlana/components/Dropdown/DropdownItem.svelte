<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import type { Context } from './context';
	import { toggle } from './functions';

	type Props = {
		autoCloseOnClick?: boolean;
		class?: string;
		onselect?: (context: Context) => void;
		children: Snippet;
		disabled?: boolean;
	};

	let {
		autoCloseOnClick = true,
		class: className = '',
		onselect = () => {},
		children,
		disabled = false
	}: Props = $props();

	let context: Context = getContext('dropdown');

	const handleClick = () => {
		onselect(context);
		if (!autoCloseOnClick) return;
		toggle(context);
		context.onCollapse(context.isExpanded);
	};

	const onHover = (event: MouseEvent) => {
		const target = event.currentTarget as HTMLElement;
		target.setAttribute('data-active', '');
	};

	const onHoverOut = (event: MouseEvent) => {
		const target = event.currentTarget as HTMLElement;
		target.removeAttribute('data-active');
	};
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<button
	class={className}
	onclick={handleClick}
	onmouseover={onHover}
	onmouseout={onHoverOut}
	tabindex="-1"
	{disabled}
>
	{@render children()}
</button>
