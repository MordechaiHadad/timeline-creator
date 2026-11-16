import { describe, expect, test } from 'bun:test';
import { createHostStorage } from '../src/lib/host/storage';
import { PROTOCOL_VERSION } from '../src/lib/host/protocol';

function createFakePort() {
	const messages: unknown[] = [];
	const listeners = new Set<(event: MessageEvent) => void>();
	return {
		messages,
		postMessage(message: unknown) {
			messages.push(message);
		},
		addEventListener(_type: 'message', handler: (event: MessageEvent) => void) {
			listeners.add(handler);
		},
		emit(data: unknown) {
			for (const listener of listeners) listener({ data } as MessageEvent);
		}
	};
}

const token = 'test-token';

function createStorage() {
	const parent = createFakePort();
	const listen = createFakePort();
	const storage = createHostStorage({
		token,
		parent,
		listen,
		openTimeoutMs: 100,
		saveTimeoutMs: 50
	});
	return { parent, listen, storage };
}

describe('host storage', () => {
	test('sends ready, opens a file and saves with a revision', async () => {
		const { parent, listen, storage } = createStorage();
		let opened: string | null = null;
		let openRevision = '';
		storage.start({
			onOpen(content, revision) {
				opened = content;
				openRevision = revision;
			},
			onExternalChange() {},
			onError(message) {
				throw new Error(message);
			}
		});

		expect(parent.messages[0]).toMatchObject({
			v: PROTOCOL_VERSION,
			type: 'ready',
			token
		});

		listen.emit({
			v: PROTOCOL_VERSION,
			type: 'open',
			token,
			content: '{"format":"timeline"}',
			revision: '1',
			fileName: 'a.timeline'
		});
		expect(opened).toBe('{"format":"timeline"}');
		expect(openRevision).toBe('1');

		const savePromise = storage.save('next', '1');
		const saveMessage = parent.messages.at(-1) as { requestId: string };
		expect(saveMessage).toMatchObject({ type: 'save', content: 'next', baseRevision: '1' });

		listen.emit({
			v: PROTOCOL_VERSION,
			type: 'saved',
			token,
			requestId: saveMessage.requestId,
			revision: '2'
		});
		expect(await savePromise).toEqual({ ok: true, revision: '2' });
	});

	test('reports a conflict', async () => {
		const { parent, listen, storage } = createStorage();
		storage.start({
			onOpen() {},
			onExternalChange() {},
			onError() {}
		});

		const savePromise = storage.save('mine', '1');
		const saveMessage = parent.messages.at(-1) as { requestId: string };
		listen.emit({
			v: PROTOCOL_VERSION,
			type: 'conflict',
			token,
			requestId: saveMessage.requestId,
			content: 'theirs',
			revision: '2'
		});
		expect(await savePromise).toEqual({
			ok: false,
			conflict: { content: 'theirs', revision: '2' }
		});
	});

	test('ignores messages with the wrong token', () => {
		const { listen, storage } = createStorage();
		let openCount = 0;
		storage.start({
			onOpen() {
				openCount += 1;
			},
			onExternalChange() {},
			onError() {}
		});

		listen.emit({
			v: PROTOCOL_VERSION,
			type: 'open',
			token: 'wrong',
			content: 'bad',
			revision: '1',
			fileName: 'a.timeline'
		});
		expect(openCount).toBe(0);
	});

	test('times out a save that gets no answer', async () => {
		const { storage } = createStorage();
		storage.start({
			onOpen() {},
			onExternalChange() {},
			onError() {}
		});
		expect(await storage.save('lost', '1')).toEqual({ ok: false, message: 'Save timed out' });
	});
});
