import type { TimelineStorage } from '$lib/host/storage';
import type { TimelineData, TimelineEvent, TimelinePeriod, TimeConfig } from '$lib/types';
import { DEFAULT_TIME_CONFIG, makeDate } from '$lib/time';
import { createId, parseState, serializeTimeline, type TimelineState } from '$lib/timeline-file';

export type TimelineStatus =
	'loading' | 'saved' | 'saving' | 'conflict' | 'save-error' | 'load-error';

const SAVE_DELAY_MS = 0;

function emptyState(): TimelineState {
	return {
		data: { title: 'Untitled Timeline', events: [], periods: [] },
		timeConfig: { ...DEFAULT_TIME_CONFIG }
	};
}

const defaultEvents: TimelineEvent[] = [
	{
		id: createId(),
		date: makeDate(1969, 6, 20),
		label: 'Moon Landing',
		description: 'Apollo 11 lands on the Moon',
		color: '#3b82f6'
	},
	{
		id: createId(),
		date: makeDate(1989, 10, 9),
		label: 'Fall of the Berlin Wall',
		description: 'The Berlin Wall falls, marking the end of the Cold War',
		color: '#ef4444'
	},
	{
		id: createId(),
		date: makeDate(1991, 7, 6),
		label: 'World Wide Web',
		description: 'Tim Berners-Lee publishes the first website',
		color: '#10b981'
	},
	{
		id: createId(),
		date: makeDate(2007, 5, 29),
		label: 'iPhone Launch',
		description: 'Apple releases the first iPhone',
		color: '#8b5cf6'
	},
	{
		id: createId(),
		date: makeDate(2020, 2, 11),
		label: 'COVID-19 Pandemic',
		description: 'WHO declares COVID-19 a global pandemic',
		color: '#f59e0b'
	}
];

const defaultPeriods: TimelinePeriod[] = [
	{
		id: createId(),
		start: makeDate(1961, 3, 12),
		end: makeDate(1975, 3, 24),
		label: 'Space Race',
		color: '#6366f1'
	},
	{
		id: createId(),
		start: makeDate(1991, 11, 26),
		end: makeDate(2001, 8, 11),
		label: 'Post-Cold War Era',
		color: '#14b8a6'
	},
	{
		id: createId(),
		start: makeDate(2000, 0, 1),
		end: makeDate(2010, 11, 31),
		label: 'Rise of the Internet',
		color: '#f97316'
	}
];

function createTimelineState() {
	let data = $state<TimelineData>({
		title: 'World History Timeline',
		events: defaultEvents,
		periods: defaultPeriods
	});

	let timeConfig = $state<TimeConfig>({ ...DEFAULT_TIME_CONFIG });
	let editingEvent = $state<TimelineEvent | null>(null);
	let editingPeriod = $state<TimelinePeriod | null>(null);
	let storageKind = $state<'local' | 'host' | 'mock'>('local');
	let status = $state<TimelineStatus>('loading');
	let errorMessage = $state('');
	let conflictContent = $state<string | null>(null);

	let storage: TimelineStorage | null = null;
	let initialized = false;
	let ready = false;
	let suspended = false;
	let saving = false;
	let lastSaved = '';
	let revision = '';
	let conflictRevision = '';
	let pending: string | null = null;
	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	function currentContent(): string {
		return serializeTimeline({ data, timeConfig });
	}

	function applyContent(content: string) {
		const parsed = parseState(content);
		data = parsed.data;
		timeConfig = parsed.timeConfig;
		editingEvent = null;
		editingPeriod = null;
	}

	async function flush() {
		if (!storage || saving || pending === null) return;
		const content = pending;
		pending = null;
		saving = true;
		const result = await storage.save(content, revision);
		saving = false;
		if (result.ok) {
			lastSaved = content;
			revision = result.revision;
			status = 'saved';
		} else if (result.conflict) {
			conflictContent = result.conflict.content;
			conflictRevision = result.conflict.revision;
			status = 'conflict';
			suspended = true;
		} else {
			if (pending === null) pending = content;
			errorMessage = result.message ?? 'Could not save the file.';
			status = 'save-error';
			return;
		}
		if (pending !== null && !suspended) void flush();
	}

	function flushNow() {
		if (saveTimer) {
			clearTimeout(saveTimer);
			saveTimer = null;
		}
		if (ready && !suspended) {
			const content = currentContent();
			if (content !== lastSaved) pending = content;
		}
		if (pending !== null) void flush();
	}

	function init(nextStorage: TimelineStorage) {
		if (initialized) return;
		initialized = true;
		storage = nextStorage;
		storageKind = nextStorage.kind;

		nextStorage.start({
			onOpen(content, nextRevision) {
				revision = nextRevision;
				try {
					if (content === null || content.trim() === '') {
						if (nextStorage.kind === 'local') {
							data = {
								title: 'World History Timeline',
								events: defaultEvents,
								periods: defaultPeriods
							};
							timeConfig = { ...DEFAULT_TIME_CONFIG };
						} else {
							const empty = emptyState();
							data = empty.data;
							timeConfig = empty.timeConfig;
						}
					} else {
						applyContent(content);
					}
				} catch {
					errorMessage = 'This file is not a valid timeline.';
					status = 'load-error';
					suspended = true;
					return;
				}
				lastSaved = currentContent();
				ready = true;
				suspended = false;
				status = 'saved';
			},
			onExternalChange(content, nextRevision) {
				conflictRevision = nextRevision;
				const incoming = content.trim();
				const current = currentContent().trim();
				if (incoming === current) {
					revision = nextRevision;
					return;
				}
				if (!suspended && current === lastSaved.trim()) {
					try {
						applyContent(content);
						lastSaved = currentContent();
						revision = nextRevision;
						status = 'saved';
					} catch {
						conflictContent = content;
						status = 'conflict';
						suspended = true;
					}
					return;
				}
				conflictContent = content;
				status = 'conflict';
				suspended = true;
			},
			onError(message) {
				errorMessage = message;
				status = 'load-error';
				suspended = true;
			}
		});

		$effect(() => {
			const content = currentContent();
			if (!ready || suspended) return;
			if (content === lastSaved) return;
			pending = content;
			status = 'saving';
			if (saveTimer) clearTimeout(saveTimer);
			saveTimer = setTimeout(() => {
				saveTimer = null;
				void flush();
			}, SAVE_DELAY_MS);
		});

		if (typeof window !== 'undefined') {
			window.addEventListener('pagehide', flushNow);
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'hidden') flushNow();
			});
		}
	}

	function retrySave() {
		if (pending === null) return;
		status = 'saving';
		void flush();
	}

	function resolveConflict(action: 'reload' | 'keep') {
		if (conflictContent === null) return;
		if (action === 'reload') {
			try {
				applyContent(conflictContent);
				lastSaved = currentContent();
				revision = conflictRevision;
				conflictContent = null;
				pending = null;
				suspended = false;
				status = 'saved';
			} catch {
				errorMessage = 'The changed file is not a valid timeline.';
				conflictContent = null;
				status = 'load-error';
				suspended = true;
			}
			return;
		}
		revision = conflictRevision;
		conflictContent = null;
		suspended = false;
		pending = currentContent();
		status = 'saving';
		void flush();
	}

	return {
		get data() {
			return data;
		},
		get timeConfig() {
			return timeConfig;
		},
		get editingEvent() {
			return editingEvent;
		},
		get editingPeriod() {
			return editingPeriod;
		},
		get status() {
			return status;
		},
		get errorMessage() {
			return errorMessage;
		},
		get conflictContent() {
			return conflictContent;
		},
		get embedded() {
			return storageKind !== 'local';
		},
		setTimeConfig(config: TimeConfig) {
			timeConfig = { ...config };
		},
		setEditingEvent(event: TimelineEvent | null) {
			editingEvent = event;
		},
		setEditingPeriod(period: TimelinePeriod | null) {
			editingPeriod = period;
		},
		clearAll() {
			data = { title: 'New Timeline', events: [], periods: [] };
			timeConfig = { ...DEFAULT_TIME_CONFIG };
			editingEvent = null;
			editingPeriod = null;
		},
		addEvent(event: Omit<TimelineEvent, 'id'>) {
			data.events = [...data.events, { ...event, id: createId() }];
		},
		updateEvent(id: string, updates: Partial<TimelineEvent>) {
			data.events = data.events.map((event) =>
				event.id === id ? { ...event, ...updates } : event
			);
		},
		deleteEvent(id: string) {
			data.events = data.events.filter((event) => event.id !== id);
			if (editingEvent?.id === id) editingEvent = null;
		},
		addPeriod(period: Omit<TimelinePeriod, 'id'>) {
			data.periods = [...data.periods, { ...period, id: createId() }];
		},
		updatePeriod(id: string, updates: Partial<TimelinePeriod>) {
			data.periods = data.periods.map((period) =>
				period.id === id ? { ...period, ...updates } : period
			);
		},
		deletePeriod(id: string) {
			data.periods = data.periods.filter((period) => period.id !== id);
			if (editingPeriod?.id === id) editingPeriod = null;
		},
		setTitle(title: string) {
			data.title = title;
		},
		exportJson(): string {
			return currentContent();
		},
		loadFromJson(json: string): void {
			applyContent(json);
			lastSaved = '';
		},
		init,
		retrySave,
		resolveConflict,
		flushNow
	};
}

export const timeline = createTimelineState();
