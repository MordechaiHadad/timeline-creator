import { formatStoredDate, parseStoredDate } from '$lib/time';
import type { TimelineData, TimelineEvent, TimelinePeriod, TimeConfig } from '$lib/types';

export type TimelineState = { data: TimelineData; timeConfig: TimeConfig };

export const TIMELINE_FORMAT = 'timeline';
export const TIMELINE_VERSION = 1;

function prepareDates(value: unknown): unknown {
	if (value instanceof Date) return { __date: value.toISOString() };
	if (value && typeof value === 'object' && 'toISOString' in value)
		return { __date: (value as { toISOString: () => string }).toISOString() };
	if (Array.isArray(value)) return value.map(prepareDates);
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) out[key] = prepareDates(item);
		return out;
	}
	return value;
}

export function serializeState(state: TimelineState): string {
	return JSON.stringify(prepareDates(state));
}

export function serializeTimeline(state: TimelineState): string {
	const file = {
		format: TIMELINE_FORMAT,
		version: TIMELINE_VERSION,
		title: state.data.title,
		timeConfig: { ...state.timeConfig },
		events: state.data.events.map((event) => ({
			id: event.id,
			date: formatStoredDate(event.date),
			label: event.label,
			description: event.description,
			color: event.color
		})),
		periods: state.data.periods.map((period) => ({
			id: period.id,
			start: formatStoredDate(period.start),
			end: formatStoredDate(period.end),
			label: period.label,
			color: period.color
		}))
	};
	return `${JSON.stringify(file, null, 2)}\n`;
}

function deserialize(raw: string): unknown {
	return JSON.parse(raw, (_key, value) =>
		value && typeof value === 'object' && value.__date ? new Date(value.__date) : value
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDate(value: unknown): Date | null {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
	return value;
}

function parseTimeConfig(value: unknown): TimeConfig | null {
	if (!isRecord(value)) return null;
	const { name, epoch, scale, precision } = value;
	if (typeof name !== 'string' || typeof epoch !== 'number' || !Number.isFinite(epoch)) return null;
	if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) return null;
	if (precision !== 'year' && precision !== 'date') return null;
	return { name, epoch, scale, precision };
}

export function createId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ensureUniqueId(id: unknown, seen: Set<string>): string {
	const unique = typeof id === 'string' && id.length > 0 && !seen.has(id) ? id : createId();
	seen.add(unique);
	return unique;
}

function parseEvents(value: unknown[]): TimelineEvent[] {
	const seen = new Set<string>();
	return value.map((item) => {
		if (!isRecord(item)) throw new Error('Invalid event');
		const date = parseDate(item.date);
		if (!date || typeof item.label !== 'string') throw new Error('Invalid event');
		return {
			id: ensureUniqueId(item.id, seen),
			date,
			label: item.label,
			description: typeof item.description === 'string' ? item.description : '',
			color: typeof item.color === 'string' ? item.color : '#3b82f6'
		};
	});
}

function parsePeriods(value: unknown[]): TimelinePeriod[] {
	const seen = new Set<string>();
	return value.map((item) => {
		if (!isRecord(item)) throw new Error('Invalid period');
		const start = parseDate(item.start);
		const end = parseDate(item.end);
		if (!start || !end || typeof item.label !== 'string') throw new Error('Invalid period');
		return {
			id: ensureUniqueId(item.id, seen),
			start: start > end ? end : start,
			end: start > end ? start : end,
			label: item.label,
			color: typeof item.color === 'string' ? item.color : '#3b82f6'
		};
	});
}

function parseFileEvents(value: unknown[]): TimelineEvent[] {
	const seen = new Set<string>();
	return value.map((item) => {
		if (!isRecord(item)) throw new Error('Invalid event');
		const date = parseStoredDate(item.date);
		if (!date || typeof item.label !== 'string') throw new Error('Invalid event');
		return {
			id: ensureUniqueId(item.id, seen),
			date,
			label: item.label,
			description: typeof item.description === 'string' ? item.description : '',
			color: typeof item.color === 'string' ? item.color : '#3b82f6'
		};
	});
}

function parseFilePeriods(value: unknown[]): TimelinePeriod[] {
	const seen = new Set<string>();
	return value.map((item) => {
		if (!isRecord(item)) throw new Error('Invalid period');
		const start = parseStoredDate(item.start);
		const end = parseStoredDate(item.end);
		if (!start || !end || typeof item.label !== 'string') throw new Error('Invalid period');
		return {
			id: ensureUniqueId(item.id, seen),
			start: start > end ? end : start,
			end: start > end ? start : end,
			label: item.label,
			color: typeof item.color === 'string' ? item.color : '#3b82f6'
		};
	});
}

function parseLegacyState(parsed: unknown): TimelineState {
	if (!isRecord(parsed) || !isRecord(parsed.data)) throw new Error('Invalid timeline');
	const timeConfig = parseTimeConfig(parsed.timeConfig);
	const { title, events, periods } = parsed.data;
	if (!timeConfig || typeof title !== 'string' || !Array.isArray(events) || !Array.isArray(periods))
		throw new Error('Invalid timeline');
	return {
		data: { title, events: parseEvents(events), periods: parsePeriods(periods) },
		timeConfig
	};
}

function parseTimelineFile(parsed: Record<string, unknown>): TimelineState {
	if (parsed.format !== TIMELINE_FORMAT) throw new Error('Invalid timeline');
	if (parsed.version !== TIMELINE_VERSION) {
		if (typeof parsed.version === 'number' && parsed.version > TIMELINE_VERSION) {
			throw new Error('This timeline was created by a newer version');
		}
		throw new Error('Invalid timeline');
	}
	const timeConfig = parseTimeConfig(parsed.timeConfig);
	const { title, events, periods } = parsed;
	if (!timeConfig || typeof title !== 'string' || !Array.isArray(events) || !Array.isArray(periods))
		throw new Error('Invalid timeline');
	return {
		data: { title, events: parseFileEvents(events), periods: parseFilePeriods(periods) },
		timeConfig
	};
}

export function parseState(raw: string): TimelineState {
	const parsed = deserialize(raw);
	if (!isRecord(parsed)) throw new Error('Invalid timeline');
	if (parsed.format === TIMELINE_FORMAT || parsed.version !== undefined) {
		return parseTimelineFile(parsed);
	}
	return parseLegacyState(parsed);
}
