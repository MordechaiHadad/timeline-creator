<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import type { Context } from './context';
	import { twMerge } from 'tailwind-merge';
	import { toggle } from './functions';
	import { onClickOutside } from '../../actions/onClickOutside';

	type Props = {
		closeOnOutsideClick?: boolean;
		class?: string;
		onexpand?: (isExpanded: boolean) => void;
		oncollapse?: (isExpanded: boolean) => void;
		children: Snippet;
	};
	let self: HTMLElement | undefined = $state(undefined);
	let currentItem: HTMLElement | undefined = $state(undefined);

	let {
		closeOnOutsideClick = true,
		class: className = '',
		onexpand = () => {},
		children,
		oncollapse = () => {}
	}: Props = $props();

	const uid = crypto.randomUUID();

	let context: Context = $state({
		uid,
		isExpanded: false,
		currentIndex: -1,
		onExpand: onexpand,
		onCollapse: oncollapse
	});

	setContext('dropdown', context);

	const handleKeys = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			toggle(context);
			oncollapse(context.isExpanded);
		}
		navigateDropdownItems(event);
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (context.isExpanded && context.currentIndex > -1) currentItem?.click();
		}
	};

	// TODO: Make this function support groups of items
	const navigateDropdownItems = (event: KeyboardEvent) => {
		const targets = ['ArrowUp', 'ArrowDown'];
		if (!targets.includes(event.key)) return;
		event.preventDefault();
		let itemsIndex = context.currentIndex;

		let target = self.querySelector('#dropdown-content') as HTMLElement;

		if (!target) return;

		const length = target.children.length;
		itemsIndex = getActiveItemIndex();
		currentItem = target.children[itemsIndex] as HTMLElement;

		const isArrowUp = event.key === 'ArrowUp';
		const edgeIndex = isArrowUp ? 0 : length - 1;

		if (itemsIndex === edgeIndex) itemsIndex = isArrowUp ? length : -1;

		const direction = isArrowUp ? -1 : 1;
		let activeItemIndex = itemsIndex + direction;
		let activeItemElement = target.children[activeItemIndex] as HTMLElement;

		if (!activeItemElement) return;

		while (activeItemElement.hasAttribute('data-seperator')) {
			activeItemIndex = (activeItemIndex + direction + length) % length;
			activeItemElement = target.children[activeItemIndex] as HTMLElement;
		}

		setActiveItem(activeItemElement);
		itemsIndex = activeItemIndex;
		setInactiveItem(currentItem);
		currentItem = activeItemElement;
		context.currentIndex = itemsIndex;
	};

	const getActiveItemIndex = () => {
		const activeItem = self?.querySelector('[data-active]');
		const target = self?.querySelector('#dropdown-content') as HTMLElement;
		const items = Array.from(target.children);
		const index = activeItem ? items.indexOf(activeItem) : -1;
		return index;
	};

	const setActiveItem = (element: HTMLElement) => {
		const parent = element.parentElement;
		if (!parent) return;
		parent.scrollTop = element.offsetTop;
		element.setAttribute('data-active', '');
	};

	const setInactiveItem = (element: HTMLElement) => {
		if (!element && element === currentItem) return;
		element.removeAttribute('data-active');
	};
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div
	class={twMerge('relative inline-block', className)}
	role="button"
	bind:this={self}
	tabindex="-1"
	onkeydown={handleKeys}
	use:onClickOutside={{
		callback: () => {
			if (closeOnOutsideClick && context.isExpanded) {
				toggle(context);
				oncollapse(context.isExpanded);
			}
		}
	}}
>
	{@render children()}
</div>
