import type { Context } from './context.js';

export const toggle = (context: Context) => {
	context.currentIndex = -1;
	context.isExpanded = !context.isExpanded;
};
