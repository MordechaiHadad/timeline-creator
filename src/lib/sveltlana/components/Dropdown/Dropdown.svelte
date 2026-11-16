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

		const target = self?.querySelector('.dropdown-content') as HTMLElement | undefined;
		const length = target?.children.length ?? 0;
		if (!target || length === 0) return;

		const isArrowUp = event.key === 'ArrowUp';
		const direction = isArrowUp ? -1 : 1;
		const activeIndex = getActiveItemIndex(target);
		const startIndex = activeIndex === -1 ? (isArrowUp ? length : -1) : activeIndex;
		let activeItemIndex = (startIndex + direction + length) % length;
		let activeItemElement = target.children[activeItemIndex] as HTMLElement;

		let attempts = 0;
		while (activeItemElement.hasAttribute('data-seperator') && attempts < length) {
			activeItemIndex = (activeItemIndex + direction + length) % length;
			activeItemElement = target.children[activeItemIndex] as HTMLElement;
			attempts++;
		}
		if (activeItemElement.hasAttribute('data-seperator')) return;

		if (currentItem) setInactiveItem(currentItem);
		currentItem = activeItemElement;
		setActiveItem(activeItemElement);
		context.currentIndex = activeItemIndex;
	};

	const getActiveItemIndex = (target: HTMLElement) => {
		const activeItem = target.querySelector('[data-active]');
		return activeItem ? Array.from(target.children).indexOf(activeItem) : -1;
	};

	const setActiveItem = (element: HTMLElement) => {
		const parent = element.parentElement;
		if (!parent) return;
		parent.scrollTop = element.offsetTop;
		element.setAttribute('data-active', '');
	};

	const setInactiveItem = (element: HTMLElement | undefined) => {
		element?.removeAttribute('data-active');
	};
</script>

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
