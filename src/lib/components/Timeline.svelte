<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import type { TimelineData, TimeConfig } from '$lib/types';
	import { realToCustom, makeDate } from '$lib/time';

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
		zoomRef?: { zoomIn: () => void; zoomOut: () => void; reset: () => void; exportPng: () => void } | null;
	} = $props();

	const VIEWBOX_WIDTH = 1200;
	const VIEWBOX_BASE_HEIGHT = 400;
	const MARGIN = { top: 10, right: 40, bottom: 40, left: 40 };
	const PERIOD_HEIGHT = 25;
	const PERIOD_Y = 5;
	const AXIS_Y = 40;
	const EVENT_Y = 65;
	const STAGGER = 28;
	const MAX_VIEWBOX_WIDTH = 2000;
	const MAX_VIEWBOX_HEIGHT = 600;

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

	function formatAxisTick(date: Date): string {
		const custom = realToCustom(date, timeConfig);
		if (timeConfig.scale === 1 && Number.isInteger(custom)) {
			return String(Math.round(custom));
		}
		return custom.toFixed(1);
	}

	function render() {
		if (!svgEl || !containerEl) return;

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
			const y1 = String(Math.round(realToCustom(e1.date, timeConfig)));
			const y2 = String(Math.round(realToCustom(e2.date, timeConfig)));
			const w1 = Math.max(e1.label.length * 7, y1.length * 6);
			const w2 = Math.max(e2.label.length * 7, y2.length * 6);
			const needed = (w1 + w2) / 2 + 8;
			const current = baseInnerWidth * dateGap / domainWidth;
			if (current < needed) {
				scaleFactor = Math.max(scaleFactor, needed / current);
			}
		}

		const cappedFactor = Math.min(scaleFactor, MAX_VIEWBOX_WIDTH / VIEWBOX_WIDTH);
		const innerWidth = baseInnerWidth * cappedFactor;
		const viewBoxWidth = Math.round(VIEWBOX_WIDTH + (innerWidth - baseInnerWidth));

		const xScale = d3.scaleTime().domain([domainStart, domainEnd]).range([0, innerWidth]);

		const eventSlots = data.events.map((event) => {
			const x = xScale(event.date);
			const customYear = Math.round(realToCustom(event.date, timeConfig));
			const yearText = String(customYear);
			return { event, x, maxWidth: Math.max(event.label.length * 8, yearText.length * 7), yearText };
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
		const viewBoxHeight = Math.min(
			Math.max(VIEWBOX_BASE_HEIGHT, EVENT_Y + 55 + maxOffset + MARGIN.bottom + 10),
			MAX_VIEWBOX_HEIGHT
		);

		const svg = d3.select(svgEl);
		svg.selectAll('*').remove();
		svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);

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

		currentZoom = zoom;
		currentSvg = svg;

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
				const vb = clone.getAttribute('viewBox');
				const parts = vb?.split(' ') || ['0', '0', '1200', '400'];
				const w = parseInt(parts[2]) || VIEWBOX_WIDTH;
				const h = parseInt(parts[3]) || viewBoxHeight;
				clone.setAttribute('width', String(w * 3));
				clone.setAttribute('height', String(h * 3));
				const serializer = new XMLSerializer();
				const svgString = serializer.serializeToString(clone);
				const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
				const url = URL.createObjectURL(svgBlob);
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					canvas.width = w * 3;
					canvas.height = h * 3;
					const ctx = canvas.getContext('2d')!;
					ctx.fillStyle = '#ffffff';
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
					URL.revokeObjectURL(url);
					canvas.toBlob((blob) => {
						if (!blob) return;
						const a = document.createElement('a');
						a.href = URL.createObjectURL(blob);
						a.download = `${data.title.replace(/[^a-zA-Z0-9]/g, '_') || 'timeline'}.png`;
						a.click();
						URL.revokeObjectURL(a.href);
					}, 'image/png');
				};
				img.src = url;
			}
		};

		const periodGroup = g.append('g').attr('class', 'periods');

		data.periods.forEach((period) => {
			const x1 = xScale(period.start);
			const x2 = xScale(period.end);
			const rect = periodGroup
				.append('g')
				.attr('class', 'period')
				.style('cursor', 'pointer')
				.on('click', () => onPeriodClick?.(period.id));

			rect
				.append('rect')
				.attr('x', MARGIN.left + x1)
				.attr('y', PERIOD_Y)
				.attr('width', Math.max(x2 - x1, 2))
				.attr('height', PERIOD_HEIGHT)
				.attr('rx', 4)
				.attr('fill', period.color)
				.attr('opacity', 0.25)
				.attr('stroke', period.color)
				.attr('stroke-width', 1.5);

			const label = period.label;
			const textWidth = label.length * 7;
			if (textWidth < x2 - x1 - 8) {
				rect
					.append('text')
					.attr('x', MARGIN.left + x1 + (x2 - x1) / 2)
					.attr('y', PERIOD_Y + PERIOD_HEIGHT / 2 + 1)
					.attr('text-anchor', 'middle')
					.attr('dominant-baseline', 'middle')
					.attr('fill', period.color)
					.attr('font-size', '11px')
					.attr('font-weight', '600')
					.text(label);
			}
		});

		const axisGroup = g
			.append('g')
			.attr('class', 'axis')
			.attr('transform', `translate(${MARGIN.left},${AXIS_Y})`);

		const axis = d3
			.axisBottom(xScale)
			.ticks(10)
			.tickSize(6)
			.tickFormat((d) => formatAxisTick(d as Date));

		axisGroup.call(axis);
		axisGroup.select('.domain').attr('stroke', '#9ca3af').attr('stroke-width', 1);
		axisGroup.selectAll('.tick line').attr('stroke', '#9ca3af');
		axisGroup.selectAll('.tick text')
			.attr('fill', '#374151')
			.attr('font-size', '11px')
			.attr('font-weight', '700')
			.attr('dy', '0.25em');

		const eventGroup = g.append('g').attr('class', 'events');

		eventSlots.forEach(({ event, x, maxWidth, yearText }, idx) => {
			const offset = labelOffsets[idx];
			const eg = eventGroup
				.append('g')
				.attr('class', 'event')
				.style('cursor', 'pointer')
				.on('click', () => onEventClick?.(event.id));

			eg.append('line')
				.attr('x1', MARGIN.left + x)
				.attr('y1', AXIS_Y + 6)
				.attr('x2', MARGIN.left + x)
				.attr('y2', EVENT_Y)
				.attr('stroke', event.color)
				.attr('stroke-width', 1.5)
				.attr('stroke-dasharray', '4,4');

			eg.append('circle')
				.attr('cx', MARGIN.left + x)
				.attr('cy', EVENT_Y)
				.attr('r', 6)
				.attr('fill', event.color)
				.attr('stroke', '#fff')
				.attr('stroke-width', 2);

			const bgWidth = maxWidth + 20;
			eg.append('rect')
				.attr('x', MARGIN.left + x - bgWidth / 2)
				.attr('y', EVENT_Y + 6 + offset)
				.attr('width', bgWidth)
				.attr('height', 35)
				.attr('rx', 3)
				.attr('fill', event.color)
				.attr('opacity', 0.08);

			eg.append('text')
				.attr('x', MARGIN.left + x)
				.attr('y', EVENT_Y + 20 + offset)
				.attr('text-anchor', 'middle')
				.attr('fill', '#374151')
				.attr('font-size', '12px')
				.attr('font-weight', '600')
				.text(event.label);

			eg.append('text')
				.attr('x', MARGIN.left + x)
				.attr('y', EVENT_Y + 36 + offset)
				.attr('text-anchor', 'middle')
				.attr('fill', '#9ca3af')
				.attr('font-size', '10px')
				.text(yearText);
		});


	}

	let currentZoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
	let currentSvg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;

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
		data.events;
		data.periods;
		timeConfig.epoch;
		timeConfig.scale;
		render();
	});

	$effect(() => {
		width;
		height;
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
	class="h-full w-full overflow-x-auto overflow-y-hidden rounded-xl border border-gray-200 bg-white"
>
	<svg
		bind:this={svgEl}
		viewBox="0 0 {VIEWBOX_WIDTH} {VIEWBOX_BASE_HEIGHT}"
		class="h-full w-full"
		preserveAspectRatio="xMinYMid slice"
	></svg>
</div>
