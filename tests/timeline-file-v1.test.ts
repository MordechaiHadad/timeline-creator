import { describe, expect, test } from 'bun:test';
import { makeDate } from '../src/lib/time';
import {
	parseState,
	serializeState,
	serializeTimeline,
	TIMELINE_FORMAT,
	TIMELINE_VERSION,
	type TimelineState
} from '../src/lib/timeline-file';

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

describe('timeline file v1', () => {
	test('writes a clean file shape', () => {
		const raw = JSON.parse(serializeTimeline(state));
		expect(raw.format).toBe(TIMELINE_FORMAT);
		expect(raw.version).toBe(TIMELINE_VERSION);
		expect(raw.events[0].date).toBe('1969-07-20');
		expect(raw.periods[0].start).toBe('1961-04-12');
		expect(raw.data).toBeUndefined();
		expect(raw.events[0].date).not.toHaveProperty('__date');
	});

	test('round-trips a file', () => {
		const parsed = parseState(serializeTimeline(state));
		expect(parsed.data.title).toBe(state.data.title);
		expect(parsed.data.events[0].date.getTime()).toBe(state.data.events[0].date.getTime());
		expect(parsed.data.periods[0].end.getTime()).toBe(state.data.periods[0].end.getTime());
		expect(parsed.timeConfig).toEqual(state.timeConfig);
	});

	test('migrates the legacy envelope', () => {
		const parsed = parseState(serializeState(state));
		expect(parsed.data.events[0].date.getTime()).toBe(state.data.events[0].date.getTime());
		expect(parsed.data.periods[0].start.getTime()).toBe(state.data.periods[0].start.getTime());
	});

	test('rejects files from a newer version', () => {
		const raw = JSON.parse(serializeTimeline(state));
		raw.version = TIMELINE_VERSION + 1;
		expect(() => parseState(JSON.stringify(raw))).toThrow();
	});

	test('rejects impossible dates', () => {
		const raw = JSON.parse(serializeTimeline(state));
		raw.events[0].date = '2026-02-31';
		expect(() => parseState(JSON.stringify(raw))).toThrow();
	});

	test('round-trips extended years', () => {
		const extended: TimelineState = {
			data: {
				title: 'Extended',
				events: [
					{
						id: 'event-a',
						date: makeDate(-44, 2, 15),
						label: 'Old',
						description: '',
						color: '#3b82f6'
					},
					{
						id: 'event-b',
						date: makeDate(12000, 0, 1),
						label: 'Future',
						description: '',
						color: '#3b82f6'
					}
				],
				periods: []
			},
			timeConfig: { name: 'Gregorian', epoch: 0, scale: 1, precision: 'date' }
		};
		const parsed = parseState(serializeTimeline(extended));
		expect(parsed.data.events[0].date.getTime()).toBe(extended.data.events[0].date.getTime());
		expect(parsed.data.events[1].date.getTime()).toBe(extended.data.events[1].date.getTime());
	});
});
