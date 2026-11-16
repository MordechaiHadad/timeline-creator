import { PROTOCOL_VERSION, isHostMessage, type SiteMessage } from './protocol';

export type SaveResult =
	| { ok: true; revision: string }
	| { ok: false; message?: string; conflict?: { content: string; revision: string } };

export type StorageHandlers = {
	onOpen(content: string | null, revision: string): void;
	onExternalChange(content: string, revision: string): void;
	onError(message: string): void;
};

export type TimelineStorage = {
	readonly kind: 'local' | 'host' | 'mock';
	start(handlers: StorageHandlers): void;
	save(content: string, baseRevision: string): Promise<SaveResult>;
};

const STORAGE_KEY = 'timeline-creator-state';
const MOCK_STORAGE_KEY = 'timeline-creator-mock';

type HostParent = {
	postMessage(message: unknown, targetOrigin: string): void;
};

type HostListener = {
	addEventListener(type: 'message', handler: (event: MessageEvent) => void): void;
};

function createSaveRequestId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `save-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readStoredContent(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function createLocalStorage(): TimelineStorage {
	return {
		kind: 'local',
		start(handlers) {
			handlers.onOpen(readStoredContent(STORAGE_KEY), 'local');
		},
		async save(content) {
			try {
				localStorage.setItem(STORAGE_KEY, content);
				return { ok: true, revision: 'local' };
			} catch (error) {
				return {
					ok: false,
					message: error instanceof Error ? error.message : 'Could not save to local storage'
				};
			}
		}
	};
}

export function createMockStorage(): TimelineStorage {
	let revision = '0';
	return {
		kind: 'mock',
		start(handlers) {
			handlers.onOpen(readStoredContent(MOCK_STORAGE_KEY), revision);
		},
		async save(content) {
			revision = String(Number(revision) + 1);
			try {
				localStorage.setItem(MOCK_STORAGE_KEY, content);
			} catch {
				return { ok: false, message: 'Could not save mock file' };
			}
			return { ok: true, revision };
		}
	};
}

export function createHostStorage(options: {
	token: string;
	parent: HostParent;
	listen: HostListener;
	saveTimeoutMs?: number;
	openTimeoutMs?: number;
}): TimelineStorage {
	let handlers: StorageHandlers | null = null;
	let started = false;
	let opened = false;
	let readyTimer: ReturnType<typeof setInterval> | null = null;
	let openTimer: ReturnType<typeof setTimeout> | null = null;
	const pending = new Map<
		string,
		{ resolve: (result: SaveResult) => void; timer: ReturnType<typeof setTimeout> }
	>();

	function post(message: SiteMessage) {
		options.parent.postMessage(message, '*');
	}

	function sendReady() {
		if (opened || !options.token) return;
		post({ v: PROTOCOL_VERSION, type: 'ready', token: options.token });
	}

	function clearHostTimers() {
		if (readyTimer) clearInterval(readyTimer);
		if (openTimer) clearTimeout(openTimer);
		readyTimer = null;
		openTimer = null;
	}

	function settle(requestId: string, result: SaveResult) {
		const entry = pending.get(requestId);
		if (!entry) return;
		clearTimeout(entry.timer);
		pending.delete(requestId);
		entry.resolve(result);
	}

	function handleMessage(event: MessageEvent) {
		if (!isHostMessage(event.data, options.token)) return;
		const message = event.data;
		switch (message.type) {
			case 'open':
				opened = true;
				clearHostTimers();
				handlers?.onOpen(message.content, message.revision);
				break;
			case 'external-change':
				handlers?.onExternalChange(message.content, message.revision);
				break;
			case 'saved':
				settle(message.requestId, { ok: true, revision: message.revision });
				break;
			case 'conflict':
				settle(message.requestId, {
					ok: false,
					conflict: { content: message.content, revision: message.revision }
				});
				break;
			case 'save-error':
				settle(message.requestId, { ok: false, message: message.message });
				break;
		}
	}

	return {
		kind: 'host',
		start(nextHandlers) {
			if (started) return;
			started = true;
			handlers = nextHandlers;
			if (!options.token) {
				nextHandlers.onError('Missing host token');
				return;
			}
			options.listen.addEventListener('message', handleMessage);
			sendReady();
			readyTimer = setInterval(sendReady, 500);
			openTimer = setTimeout(() => {
				if (opened) return;
				clearHostTimers();
				nextHandlers.onError('No response from Obsidian');
			}, options.openTimeoutMs ?? 15000);
		},
		save(content, baseRevision) {
			return new Promise<SaveResult>((resolve) => {
				const requestId = createSaveRequestId();
				const timer = setTimeout(() => {
					if (!pending.delete(requestId)) return;
					resolve({ ok: false, message: 'Save timed out' });
				}, options.saveTimeoutMs ?? 10000);
				pending.set(requestId, { resolve, timer });
				post({
					v: PROTOCOL_VERSION,
					type: 'save',
					token: options.token,
					requestId,
					content,
					baseRevision
				});
			});
		}
	};
}

export function createStorage(): TimelineStorage {
	if (typeof window === 'undefined') return createLocalStorage();
	const params = new URLSearchParams(window.location.search);
	if (params.get('mockHost') === '1') return createMockStorage();
	if (params.get('embed') === 'obsidian') {
		return createHostStorage({
			token: params.get('token') ?? '',
			parent: window.parent,
			listen: window
		});
	}
	return createLocalStorage();
}
