import type { TimelineData, TimelineEvent, TimelinePeriod, TimeConfig } from '$lib/types';
import { DEFAULT_TIME_CONFIG, makeDate } from '$lib/time';
import { createId, parseState, serializeState, type TimelineState } from '$lib/timeline-file';

const STORAGE_KEY = 'timeline-creator-state';

function loadState(): TimelineState | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return parseState(raw);
	} catch {
		return null;
	}
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
	const saved = loadState();

	let data = $state<TimelineData>(
		saved?.data ?? {
			title: 'World History Timeline',
			events: defaultEvents,
			periods: defaultPeriods
		}
	);

	let timeConfig = $state<TimeConfig>(saved?.timeConfig ?? { ...DEFAULT_TIME_CONFIG });
	let editingEvent = $state<TimelineEvent | null>(null);
	let editingPeriod = $state<TimelinePeriod | null>(null);

	function initPersistence() {
		$effect(() => {
			const payload = serializeState({ data, timeConfig });
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, payload);
			}
		});
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
			data.events = data.events.map((e) => (e.id === id ? { ...e, ...updates } : e));
		},
		deleteEvent(id: string) {
			data.events = data.events.filter((e) => e.id !== id);
			if (editingEvent?.id === id) editingEvent = null;
		},
		addPeriod(period: Omit<TimelinePeriod, 'id'>) {
			data.periods = [...data.periods, { ...period, id: createId() }];
		},
		updatePeriod(id: string, updates: Partial<TimelinePeriod>) {
			data.periods = data.periods.map((p) => (p.id === id ? { ...p, ...updates } : p));
		},
		deletePeriod(id: string) {
			data.periods = data.periods.filter((p) => p.id !== id);
			if (editingPeriod?.id === id) editingPeriod = null;
		},
		setTitle(title: string) {
			data.title = title;
		},
		exportJson(): string {
			return serializeState({ data, timeConfig });
		},
		loadFromJson(json: string): void {
			const parsed = parseState(json);
			data = parsed.data;
			timeConfig = parsed.timeConfig;
			editingEvent = null;
			editingPeriod = null;
		},
		initPersistence
	};
}

export const timeline = createTimelineState();
