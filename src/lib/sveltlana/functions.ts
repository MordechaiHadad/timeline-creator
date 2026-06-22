import type { Orientation, Alignment } from './types.js';

export const getDynamicPosition = (node: HTMLElement, orientation: Orientation): Alignment => {
	let position: Alignment = 'top';

	const rect = node.getBoundingClientRect();
	const windowHeight = window.innerHeight;
	const windowWidth = window.innerWidth;
	if (orientation === 'vertical') {
		if (rect.top + rect.height > windowHeight) {
			if (rect.right + rect.width > windowWidth) position = 'top-left';
			else if (rect.left + rect.width > windowHeight) position = 'top-right';
			else position = 'top';
		} else {
			if (rect.right + rect.width > windowWidth) position = 'bottom-left';
			else if (rect.left + rect.width > windowHeight) position = 'bottom-right';
			else position = 'bottom';
		}
	} else if (orientation === 'horizontal') {
		if (rect.right + rect.width > windowWidth) {
			if (rect.top + rect.height > windowHeight) position = 'top-left';
			else if (rect.bottom + rect.height > windowHeight) position = 'bottom-left';
			else position = 'left';
		} else {
			if (rect.top + rect.height > windowHeight) position = 'bottom-right';
			else if (rect.bottom + rect.height > windowHeight) position = 'top-right';
			else position = 'right';
		}
	}

	return position;
};
