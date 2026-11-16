import { describe, expect, test } from 'bun:test';
import { makeDate, parseCustomDateString } from '../src/lib/time';
import { parseState, serializeState, type TimelineState } from '../src/lib/timeline-file';

const state: TimelineState = {
	data: {
		title: 'Test Timeline',
		events: [
			{
				id: 'event-a',
				date: makeDate(1969, 6, 20),
				label: 'Moon Landing',
				description: 'Apollo 11',
				color: '#3b82f6'
			}
		],
		periods: [
			{
				id: 'period-a',
				start: makeDate(1961, 3, 12),
				end: makeDate(1975, 3, 24),
				label: 'Space Race',
				color: '#6366f1'
			}
		]
	},
	timeConfig: { name: 'Gregorian', epoch: 0, scale: 1, precision: 'date' }
};

describe('timeline file', () => {
	test('round-trips state', () => {
		const parsed = parseState(serializeState(state));
		expect(parsed.data.title).toBe(state.data.title);
		expect(parsed.data.events[0].date.getTime()).toBe(state.data.events[0].date.getTime());
		expect(parsed.data.periods[0].start.getTime()).toBe(state.data.periods[0].start.getTime());
		expect(parsed.timeConfig).toEqual(state.timeConfig);
	});

	test('rejects malformed payloads', () => {
		expect(() => parseState('{}')).toThrow();
		expect(() => parseState('not json')).toThrow();

		const noDate = JSON.parse(serializeState(state));
		noDate.data.events[0].date = null;
		expect(() => parseState(JSON.stringify(noDate))).toThrow();

		const zeroScale = JSON.parse(serializeState(state));
		zeroScale.timeConfig.scale = 0;
		expect(() => parseState(JSON.stringify(zeroScale))).toThrow();
	});

	test('fixes missing and duplicate ids', () => {
		const raw = JSON.parse(serializeState(state));
		raw.data.events.push({ ...raw.data.events[0] });
		raw.data.events[0].id = '';
		const parsed = parseState(JSON.stringify(raw));
		expect(parsed.data.events).toHaveLength(2);
		expect(new Set(parsed.data.events.map((event) => event.id)).size).toBe(2);
	});

	test('swaps periods that end before they start', () => {
		const raw = JSON.parse(serializeState(state));
		const originalStart = raw.data.periods[0].start;
		raw.data.periods[0].start = raw.data.periods[0].end;
		raw.data.periods[0].end = originalStart;
		const parsed = parseState(JSON.stringify(raw));
		expect(parsed.data.periods[0].start.getTime()).toBeLessThanOrEqual(
			parsed.data.periods[0].end.getTime()
		);
	});
});

describe('custom date parsing', () => {
	const config = { name: 'Gregorian', epoch: 0, scale: 1, precision: 'date' as const };

	test('rejects impossible dates', () => {
		expect(parseCustomDateString('2026-02-31', config)).toBeNull();
		expect(parseCustomDateString('2026-13-01', config)).toBeNull();
		expect(parseCustomDateString('2026-00-10', config)).toBeNull();
		expect(parseCustomDateString('2026-02-28', config)).not.toBeNull();
	});
});
