type Callback = (event: Event) => void;

export type OnClickOutsideOptions = {
	callback: Callback;
	capture?: boolean;
	detectTouch?: boolean;
	include?: (node: Element, target: Node | null) => boolean;
};

/**
 * Svelte action that calls `callback` when the user clicks/touches outside `node`.
 * - treats clicks/touches inside `node` (including children) as inside
 * - supports Shadow DOM via event.composedPath()
 * - allows custom `include` to mark additional targets as inside (e.g. portals)
 *
 * Usage:
 * <div use:onClickOutside={{ callback: fn }}>
 */
export function onClickOutside(
	node: Element,
	optsOrHandler: Callback | Partial<OnClickOutsideOptions>
) {
	let options: OnClickOutsideOptions;
	if (typeof optsOrHandler === 'function')
		options = { callback: optsOrHandler } as OnClickOutsideOptions;
	else options = { callback: (() => {}) as Callback, ...optsOrHandler } as OnClickOutsideOptions;

	let capture = options.capture ?? true;
	let detectTouch = options.detectTouch ?? true;

	if (!node.isConnected) return;

	const listener = (event: Event) => {
		const target = event.target as Node | null;
		if (!target) return;

		// If composedPath is available, use it to correctly handle Shadow DOM
		type EvWithPath = Event & { composedPath?: () => EventTarget[] };
		const ev = event as EvWithPath;
		if (typeof ev.composedPath === 'function') {
			const path = ev.composedPath();
			if (path && path.includes(node)) return;
		}

		if (options.include && options.include(node, target)) return;

		if (node.contains(target)) return;

		options.callback(event);
	};

	if (typeof document !== 'undefined') {
		document.addEventListener('pointerdown', listener, capture);
		if (detectTouch) document.addEventListener('touchstart', listener, { passive: true, capture });
		document.addEventListener('click', listener, true);
	}

	return {
		update(newOptsOrHandler: Callback | Partial<OnClickOutsideOptions>) {
			if (typeof newOptsOrHandler === 'function') options.callback = newOptsOrHandler;
			else options = { ...options, ...newOptsOrHandler } as OnClickOutsideOptions;

			capture = options.capture ?? true;
			detectTouch = options.detectTouch ?? true;
		},
		destroy() {
			if (typeof document === 'undefined') return;
			document.removeEventListener('pointerdown', listener, capture);
			if (detectTouch)
				document.removeEventListener('touchstart', listener, {
					passive: true,
					capture
				} as EventListenerOptions);
			document.removeEventListener('click', listener, true);
		}
	};
}

export default onClickOutside;
