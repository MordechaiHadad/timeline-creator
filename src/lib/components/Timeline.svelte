<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import type { TimelineData, TimeConfig } from '$lib/types';
	import { makeDate, formatCustomYear, formatCustomDateShort } from '$lib/time';
	import { theme } from '$lib/state/theme.svelte';

	let {
		data,
		timeConfig,
		onEventClick,
		onPeriodClick,
		zoomRef = $bindable(null)
	}: {
		data: TimelineData;
		timeConfig: TimeConfig;
		onEventClick?: (id: string) => void;
		onPeriodClick?: (id: string) => void;
		zoomRef?: {
			zoomIn: () => void;
			zoomOut: () => void;
			reset: () => void;
			exportPng: () => void;
		} | null;
	} = $props();

	const VIEWBOX_WIDTH = 1200;
	const VIEWBOX_BASE_HEIGHT = 400;
	const MARGIN = { top: 10, right: 40, bottom: 40, left: 40 };
	const PERIOD_Y = 6;
	const PERIOD_HEIGHT = 34;
	const PERIOD_ROW_HEIGHT = 38;
	const BANNER_HEIGHT = 34;
	const EVENT_GAP = 28;
	const STAGGER = 40;
	const MAX_VIEWBOX_WIDTH = 2000;
	const MAX_VIEWBOX_HEIGHT = 600;
	const FONT_FAMILY =
		"ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

	const palette = $derived(
		theme.resolved === 'dark'
			? {
					text: '#f3f3f6',
					muted: '#a0a0ac',
					axis: '#5c5c69',
					dotRing: '#0a0a0d',
					chip: 'rgba(255, 255, 255, 0.06)',
					chipBorder: 'rgba(255, 255, 255, 0.1)',
					background: '#0f0f13'
				}
			: {
					text: '#17171b',
					muted: '#6d6d78',
					axis: '#b6b7c0',
					dotRing: '#ffffff',
					chip: 'rgba(255, 255, 255, 0.72)',
					chipBorder: 'rgba(18, 18, 24, 0.1)',
					background: '#f7f7fa'
				}
	);

	let svgEl: SVGSVGElement;
	let containerEl: HTMLDivElement;
	let width = $state(0);
	let height = $state(0);

	function getExtent() {
		const allDates: Date[] = [
			...data.events.map((e) => e.date),
			...data.periods.flatMap((p) => [p.start, p.end])
		];
		if (allDates.length === 0) {
			return [makeDate(2000, 0, 1), makeDate(2025, 0, 1)] as const;
		}
		const min = d3.min(allDates)!;
		const max = d3.max(allDates)!;
		const padding = (max.getTime() - min.getTime()) * 0.05 || 365 * 24 * 60 * 60 * 1000;
		return [new Date(min.getTime() - padding), new Date(max.getTime() + padding)] as const;
	}

	function render() {
		if (!svgEl || !containerEl) return;

		const colors = palette;
		const [domainStart, domainEnd] = getExtent();
		const domainWidth = domainEnd.getTime() - domainStart.getTime();
		const baseInnerWidth = VIEWBOX_WIDTH - MARGIN.left - MARGIN.right;

		const sorted = [...data.events].sort((a, b) => a.date.getTime() - b.date.getTime());
		let scaleFactor = 1;
		for (let i = 0; i < sorted.length - 1; i++) {
			const e1 = sorted[i];
			const e2 = sorted[i + 1];
			const dateGap = e2.date.getTime() - e1.date.getTime();
			if (dateGap <= 0) continue;
			const d1 = formatCustomDateShort(e1.date, timeConfig);
			const d2 = formatCustomDateShort(e2.date, timeConfig);
			const w1 = Math.max(e1.label.length * 7, d1.length * 5.5);
			const w2 = Math.max(e2.label.length * 7, d2.length * 5.5);
			const needed = (w1 + w2) / 2 + 8;
			const current = (baseInnerWidth * dateGap) / domainWidth;
			if (current < needed) {
				scaleFactor = Math.max(scaleFactor, needed / current);
			}
		}

		const cappedFactor = Math.min(scaleFactor, MAX_VIEWBOX_WIDTH / VIEWBOX_WIDTH);
		const innerWidth = baseInnerWidth * cappedFactor;
		const viewBoxWidth = Math.round(VIEWBOX_WIDTH + (innerWidth - baseInnerWidth));

		const xScale = d3.scaleTime().domain([domainStart, domainEnd]).range([0, innerWidth]);

		const sortedPeriods = [...data.periods].sort((a, b) => a.start.getTime() - b.start.getTime());
		const periodRows: number[] = [];
		const rowEnds: number[] = [];
		sortedPeriods.forEach((period) => {
			const start = xScale(period.start);
			const end = Math.max(xScale(period.end), start);
			let row = rowEnds.findIndex((rowEnd) => start > rowEnd + 4);
			if (row === -1) {
				row = rowEnds.length;
				rowEnds.push(end);
			} else {
				rowEnds[row] = Math.max(rowEnds[row], end);
			}
			periodRows.push(row);
		});

		const periodRowCount = Math.max(rowEnds.length, 1);
		const axisY = PERIOD_Y + periodRowCount * PERIOD_ROW_HEIGHT + 8;
		const eventY = axisY + EVENT_GAP;

		const eventSlots = data.events.map((event) => {
			const dateText = formatCustomDateShort(event.date, timeConfig);
			return {
				event,
				x: xScale(event.date),
				maxWidth: Math.max(event.label.length * 8, dateText.length * 6),
				dateText
			};
		});

		eventSlots.sort((a, b) => a.x - b.x);

		const labelOffsets: number[] = new Array(eventSlots.length).fill(0);

		let clusterStart = 0;
		while (clusterStart < eventSlots.length) {
			let clusterEnd = clusterStart + 1;
			while (clusterEnd < eventSlots.length) {
				const prev = eventSlots[clusterEnd - 1];
				const curr = eventSlots[clusterEnd];
				if (curr.x - prev.x < (prev.maxWidth + curr.maxWidth) / 2 + 8) {
					clusterEnd++;
				} else {
					break;
				}
			}
			if (clusterEnd - clusterStart >= 2) {
				for (let k = clusterStart; k < clusterEnd; k++) {
					labelOffsets[k] = (k - clusterStart) * STAGGER;
				}
			}
			clusterStart = clusterEnd;
		}

		const maxOffset = Math.max(...labelOffsets);
		const contentBottom = eventY + 6 + BANNER_HEIGHT + maxOffset;
		const viewBoxHeight = Math.min(
			Math.max(VIEWBOX_BASE_HEIGHT, contentBottom + MARGIN.bottom + 10),
			MAX_VIEWBOX_HEIGHT
		);

		const svg = d3.select(svgEl);
		svg.selectAll('*').remove();
		svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`).attr('font-family', FONT_FAMILY);

		if (viewBoxWidth > VIEWBOX_WIDTH && height > 0) {
			svgEl.style.width = `${height * (viewBoxWidth / viewBoxHeight)}px`;
		} else {
			svgEl.style.width = '';
		}

		const g = svg.append('g').attr('class', 'timeline-content');

		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.5, 20])
			.on('zoom', (event) => {
				g.attr('transform', event.transform);
			});

		svg.call(zoom);

		zoomRef = {
			zoomIn: () => {
				svg.transition().duration(300).call(zoom.scaleBy, 1.5);
			},
			zoomOut: () => {
				svg.transition().duration(300).call(zoom.scaleBy, 0.67);
			},
			reset: () => {
				svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
			},
			exportPng: () => {
				const svgNode = svgEl;
				const clone = svgNode.cloneNode(true) as SVGSVGElement;
				clone.removeAttribute('class');
				const contentGroup = clone.querySelector('.timeline-content');
				if (contentGroup) {
					contentGroup.removeAttribute('transform');
				}
				const vb = clone.getAttribute('viewBox');
				const parts = vb?.split(' ') || ['0', '0', '1200', '400'];
				const w = parseInt(parts[2]) || VIEWBOX_WIDTH;
				const h = parseInt(parts[3]) || viewBoxHeight;
				const scale = Math.max(3, Math.ceil(8000 / Math.max(w, h)));
				clone.setAttribute('width', String(w * scale));
				clone.setAttribute('height', String(h * scale));
				const serializer = new XMLSerializer();
				const svgString = serializer.serializeToString(clone);
				const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
				const url = URL.createObjectURL(svgBlob);
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					canvas.width = w * scale;
					canvas.height = h * scale;
					const ctx = canvas.getContext('2d')!;
					ctx.fillStyle = colors.background;
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
					URL.revokeObjectURL(url);
					canvas.toBlob((blob) => {
						if (!blob) return;
						const a = document.createElement('a');
						const blobUrl = URL.createObjectURL(blob);
						a.href = blobUrl;
						a.download = `${data.title.replace(/[^a-zA-Z0-9]/g, '_') || 'timeline'}.png`;
						a.click();
						setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
					}, 'image/png');
				};
				img.onerror = () => URL.revokeObjectURL(url);
				img.src = url;
			}
		};

		const periodGroup = g.append('g').attr('class', 'periods');

		sortedPeriods.forEach((period, index) => {
			const x1 = xScale(period.start);
			const x2 = Math.max(xScale(period.end), x1);
			const barWidth = x2 - x1;
			const y = PERIOD_Y + periodRows[index] * PERIOD_ROW_HEIGHT;
			const range = `${formatCustomDateShort(period.start, timeConfig)} to ${formatCustomDateShort(period.end, timeConfig)}`;

			const group = periodGroup
				.append('g')
				.attr('class', 'period')
				.style('cursor', 'pointer')
				.on('click', () => onPeriodClick?.(period.id));

			group
				.append('rect')
				.attr('x', MARGIN.left + x1)
				.attr('y', y)
				.attr('width', Math.max(barWidth, 2))
				.attr('height', PERIOD_HEIGHT)
				.attr('rx', 5)
				.attr('fill', period.color)
				.attr('fill-opacity', 0.14)
				.attr('stroke', period.color)
				.attr('stroke-opacity', 0.5)
				.attr('stroke-width', 1)
				.append('title')
				.text(`${period.label}, ${range}`);

			const centerX = MARGIN.left + x1 + barWidth / 2;

			if (barWidth > period.label.length * 6 + 12) {
				group
					.append('text')
					.attr('x', centerX)
					.attr('y', y + 13)
					.attr('text-anchor', 'middle')
					.attr('fill', period.color)
					.attr('font-size', '11px')
					.attr('font-weight', '600')
					.text(period.label);
			}

			if (barWidth > range.length * 4.8 + 12) {
				group
					.append('text')
					.attr('x', centerX)
					.attr('y', y + 26)
					.attr('text-anchor', 'middle')
					.attr('fill', period.color)
					.attr('fill-opacity', 0.75)
					.attr('font-size', '9px')
					.text(range);
			}
		});

		const axisGroup = g
			.append('g')
			.attr('class', 'axis')
			.attr('transform', `translate(${MARGIN.left},${axisY})`);

		const axis = d3
			.axisBottom(xScale)
			.ticks(10)
			.tickSize(6)
			.tickFormat((d) => formatCustomYear(d as Date, timeConfig));

		axisGroup.call(axis);
		axisGroup.select('.domain').attr('stroke', colors.axis).attr('stroke-width', 1);
		axisGroup.selectAll('.tick line').attr('stroke', colors.axis);
		axisGroup
			.selectAll('.tick text')
			.attr('fill', colors.muted)
			.attr('font-size', '11px')
			.attr('font-weight', '600')
			.attr('dy', '0.25em');

		const eventGroup = g.append('g').attr('class', 'events');

		eventSlots.forEach(({ event, x, maxWidth, dateText }, idx) => {
			const offset = labelOffsets[idx];
			const bannerWidth = maxWidth + 20;
			const desiredX = MARGIN.left + x - bannerWidth / 2;
			const bannerX = Math.max(
				MARGIN.left,
				Math.min(desiredX, viewBoxWidth - MARGIN.right - bannerWidth)
			);
			const bannerY = eventY + 6 + offset;

			const eg = eventGroup
				.append('g')
				.attr('class', 'event')
				.style('cursor', 'pointer')
				.on('click', () => onEventClick?.(event.id));

			eg.append('line')
				.attr('x1', MARGIN.left + x)
				.attr('y1', axisY + 6)
				.attr('x2', MARGIN.left + x)
				.attr('y2', eventY)
				.attr('stroke', event.color)
				.attr('stroke-width', 1)
				.attr('stroke-dasharray', '3,3')
				.attr('stroke-opacity', 0.65);

			eg.append('circle')
				.attr('cx', MARGIN.left + x)
				.attr('cy', eventY)
				.attr('r', 5.5)
				.attr('fill', event.color)
				.attr('stroke', colors.dotRing)
				.attr('stroke-width', 2);

			eg.append('rect')
				.attr('x', bannerX)
				.attr('y', bannerY)
				.attr('width', bannerWidth)
				.attr('height', BANNER_HEIGHT)
				.attr('rx', 4)
				.attr('fill', colors.chip)
				.attr('stroke', colors.chipBorder)
				.attr('stroke-width', 1)
				.append('title')
				.text(`${event.label}, ${dateText}`);

			eg.append('text')
				.attr('x', bannerX + bannerWidth / 2)
				.attr('y', bannerY + 14)
				.attr('text-anchor', 'middle')
				.attr('fill', colors.text)
				.attr('font-size', '12px')
				.attr('font-weight', '600')
				.text(event.label);

			eg.append('text')
				.attr('x', bannerX + bannerWidth / 2)
				.attr('y', bannerY + 27)
				.attr('text-anchor', 'middle')
				.attr('fill', colors.muted)
				.attr('font-size', '9px')
				.text(dateText);
		});
	}

	onMount(() => {
		const observer = new ResizeObserver(() => {
			if (containerEl) {
				width = containerEl.clientWidth;
				height = containerEl.clientHeight;
			}
		});
		observer.observe(containerEl);

		render();

		return () => observer.disconnect();
	});

	$effect(() => {
		void data.events;
		void data.periods;
		void timeConfig.epoch;
		void timeConfig.scale;
		void timeConfig.precision;
		void theme.resolved;
		render();
	});

	$effect(() => {
		void width;
		void height;
		if (!svgEl) return;
		const vb = svgEl.getAttribute('viewBox');
		if (!vb) return;
		const parts = vb.split(' ');
		const vbw = parseInt(parts[2]) || VIEWBOX_WIDTH;
		if (vbw > VIEWBOX_WIDTH && height > 0) {
			const vbh = parseInt(parts[3]) || VIEWBOX_BASE_HEIGHT;
			svgEl.style.width = `${height * (vbw / vbh)}px`;
		} else {
			svgEl.style.width = '';
		}
	});
</script>

<div
	bind:this={containerEl}
	class="h-full w-full overflow-x-auto overflow-y-hidden rounded-lg border border-black/10 bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_50px_rgba(20,20,30,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_60px_rgba(0,0,0,0.4)]"
>
	<svg
		bind:this={svgEl}
		viewBox="0 0 {VIEWBOX_WIDTH} {VIEWBOX_BASE_HEIGHT}"
		class="h-full w-full"
		preserveAspectRatio="xMinYMid slice"
	></svg>
</div>
