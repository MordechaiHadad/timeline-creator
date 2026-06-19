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
	const VIEWBOX_HEIGHT = 400;
	const MARGIN = { top: 60, right: 40, bottom: 40, left: 40 };
	const PERIOD_HEIGHT = 40;
	const PERIOD_Y = 80;
	const EVENT_Y = 200;

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
		if (!svgEl) return;

		const svg = d3.select(svgEl);
		svg.selectAll('*').remove();

		const [domainStart, domainEnd] = getExtent();
		const innerWidth = VIEWBOX_WIDTH - MARGIN.left - MARGIN.right;

		const xScale = d3.scaleTime().domain([domainStart, domainEnd]).range([0, innerWidth]);

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
				clone.setAttribute('width', String(VIEWBOX_WIDTH * 3));
				clone.setAttribute('height', String(VIEWBOX_HEIGHT * 3));

				const serializer = new XMLSerializer();
				const svgString = serializer.serializeToString(clone);
				const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
				const url = URL.createObjectURL(svgBlob);

				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					canvas.width = VIEWBOX_WIDTH * 3;
					canvas.height = VIEWBOX_HEIGHT * 3;
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

		const axisGroup = g
			.append('g')
			.attr('class', 'axis')
			.attr('transform', `translate(${MARGIN.left},${VIEWBOX_HEIGHT - MARGIN.bottom})`);

		const axis = d3
			.axisBottom(xScale)
			.ticks(10)
			.tickSize(-VIEWBOX_HEIGHT + MARGIN.top + MARGIN.bottom)
			.tickFormat((d) => formatAxisTick(d as Date));

		axisGroup.call(axis);
		axisGroup.select('.domain').remove();
		axisGroup.selectAll('.tick line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '2,2');
		axisGroup.selectAll('.tick text').attr('fill', '#6b7280').attr('font-size', '12px');

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

		const eventGroup = g.append('g').attr('class', 'events');

		data.events.forEach((event) => {
			const x = xScale(event.date);
			const eg = eventGroup
				.append('g')
				.attr('class', 'event')
				.style('cursor', 'pointer')
				.on('click', () => onEventClick?.(event.id));

			eg.append('line')
				.attr('x1', MARGIN.left + x)
				.attr('y1', PERIOD_Y + PERIOD_HEIGHT + 10)
				.attr('x2', MARGIN.left + x)
				.attr('y2', EVENT_Y - 10)
				.attr('stroke', event.color)
				.attr('stroke-width', 1.5)
				.attr('stroke-dasharray', '4,4');

			eg.append('circle')
				.attr('cx', MARGIN.left + x)
				.attr('cy', EVENT_Y)
				.attr('r', 8)
				.attr('fill', event.color)
				.attr('stroke', '#fff')
				.attr('stroke-width', 2);

			eg.append('text')
				.attr('x', MARGIN.left + x)
				.attr('y', EVENT_Y + 24)
				.attr('text-anchor', 'middle')
				.attr('fill', '#374151')
				.attr('font-size', '12px')
				.attr('font-weight', '600')
				.text(event.label);

			const customYear = Math.round(realToCustom(event.date, timeConfig));
			eg.append('text')
				.attr('x', MARGIN.left + x)
				.attr('y', EVENT_Y + 40)
				.attr('text-anchor', 'middle')
				.attr('fill', '#9ca3af')
				.attr('font-size', '10px')
				.text(String(customYear));
		});

		const baselineY = EVENT_Y + 55;
		g.append('line')
			.attr('x1', MARGIN.left)
			.attr('y1', baselineY)
			.attr('x2', MARGIN.left + innerWidth)
			.attr('y2', baselineY)
			.attr('stroke', '#d1d5db')
			.attr('stroke-width', 2);
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
</script>

<div
	bind:this={containerEl}
	class="h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-white"
>
	<svg
		bind:this={svgEl}
		viewBox="0 0 {VIEWBOX_WIDTH} {VIEWBOX_HEIGHT}"
		class="h-full w-full"
		preserveAspectRatio="xMidYMid meet"
	></svg>
</div>
