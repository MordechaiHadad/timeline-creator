import type { TimeConfig } from '$lib/types';

export const DEFAULT_TIME_CONFIG: TimeConfig = {
	name: 'Gregorian',
	epoch: 0,
	scale: 1,
	precision: 'date'
};

const YEAR_OFFSET = 10000;

export function makeDate(year: number, month: number, day: number): Date {
	return new Date(year + YEAR_OFFSET, month, day);
}

export function formatRealDate(date: Date): string {
	const realYear = date.getFullYear() - YEAR_OFFSET;
	const month = date.toLocaleDateString('en-US', { month: 'short' });
	const day = date.getDate();
	return `${month} ${day}, ${realYear}`;
}

export function formatStoredDate(date: Date): string {
	const year = date.getFullYear() - YEAR_OFFSET;
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function parseStoredDate(value: unknown): Date | null {
	if (typeof value !== 'string') return null;
	const match = value.trim().match(/^(-?\d+)-(\d{1,2})-(\d{1,2})$/);
	if (!match) return null;
	const year = Number.parseInt(match[1], 10);
	const month = Number.parseInt(match[2], 10);
	const day = Number.parseInt(match[3], 10);
	if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
	const date = new Date(year + YEAR_OFFSET, month - 1, day);
	if (Number.isNaN(date.getTime())) return null;
	if (date.getFullYear() !== year + YEAR_OFFSET) return null;
	if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
	return date;
}

export function customToReal(customYear: number, config: TimeConfig, month = 0, day = 1): Date {
	const realYear = Math.round(config.epoch + customYear * config.scale);
	return new Date(realYear + YEAR_OFFSET, month, day);
}

export function realToCustom(date: Date, config: TimeConfig): number {
	const realYear = date.getFullYear() - YEAR_OFFSET;
	return (realYear - config.epoch) / config.scale;
}

export function formatCustomYear(date: Date, config: TimeConfig): string {
	const custom = realToCustom(date, config);
	if (config.scale === 1 && Number.isInteger(custom)) {
		return String(Math.round(custom));
	}
	return custom.toFixed(1);
}

export function formatCustomDateShort(date: Date, config: TimeConfig): string {
	const year = Math.round(realToCustom(date, config));
	if (config.precision === 'year') {
		return String(year);
	}
	const month = date.toLocaleDateString('en-US', { month: 'short' });
	const day = date.getDate();
	return `${year} ${month} ${day}`;
}

export function parseCustomDateString(input: string, config: TimeConfig): Date | null {
	const trimmed = input.trim();

	if (config.precision === 'year') {
		const yearMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)$/);
		if (!yearMatch) return null;
		const customYear = parseFloat(yearMatch[1]);
		return customToReal(customYear, config);
	}

	const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?$/);
	if (!match) return null;

	const customYear = parseFloat(match[1]);
	const month = match[2] ? parseInt(match[2], 10) - 1 : 0;
	const day = match[3] ? parseInt(match[3], 10) : 1;

	const date = customToReal(customYear, config, month, day);
	if (date.getMonth() !== month || date.getDate() !== day) return null;
	return date;
}

export function dateToCustomInput(date: Date, config: TimeConfig): string {
	const year = Math.round(realToCustom(date, config));
	if (config.precision === 'year') {
		return String(year);
	}
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
