<script lang="ts">
	import { Settings, FilePlus, Download } from '@lucide/svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import TimelineControls from '$lib/components/TimelineControls.svelte';
	import TimelineSidebar from '$lib/components/TimelineSidebar.svelte';
	import EventForm from '$lib/components/EventForm.svelte';
	import PeriodForm from '$lib/components/PeriodForm.svelte';
	import TimeConfigForm from '$lib/components/TimeConfigForm.svelte';
	import { timeline } from '$lib/state/timeline.svelte';
	import type { TimeConfig } from '$lib/types';

	timeline.initPersistence();

	let showEventForm = $state(false);
	let showPeriodForm = $state(false);
	let showTimeConfig = $state(false);
	let zoomControls = $state<{ zoomIn: () => void; zoomOut: () => void; reset: () => void; exportPng: () => void } | null>(
		null
	);

	function handleEventSubmit(data: {
		date: Date;
		label: string;
		description: string;
		color: string;
	}) {
		if (timeline.editingEvent) {
			timeline.updateEvent(timeline.editingEvent.id, {
				date: data.date,
				label: data.label,
				description: data.description,
				color: data.color
			});
		} else {
			timeline.addEvent({
				date: data.date,
				label: data.label,
				description: data.description,
				color: data.color
			});
		}
		timeline.setEditingEvent(null);
		showEventForm = false;
	}

	function handlePeriodSubmit(data: { start: Date; end: Date; label: string; color: string }) {
		if (timeline.editingPeriod) {
			timeline.updatePeriod(timeline.editingPeriod.id, {
				start: data.start,
				end: data.end,
				label: data.label,
				color: data.color
			});
		} else {
			timeline.addPeriod({
				start: data.start,
				end: data.end,
				label: data.label,
				color: data.color
			});
		}
		timeline.setEditingPeriod(null);
		showPeriodForm = false;
	}

	function handleTimeConfigSubmit(config: TimeConfig) {
		timeline.setTimeConfig(config);
		showTimeConfig = false;
	}

	function handleEventClick(id: string) {
		const event = timeline.data.events.find((e) => e.id === id);
		if (event) {
			timeline.setEditingEvent(event);
			showEventForm = true;
		}
	}

	function handlePeriodClick(id: string) {
		const period = timeline.data.periods.find((p) => p.id === id);
		if (period) {
			timeline.setEditingPeriod(period);
			showPeriodForm = true;
		}
	}
</script>

<div class="flex h-screen flex-col bg-gray-100">
	<header class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
		<div class="flex items-center gap-3">
			<h1
				contenteditable
				class="text-lg font-bold text-gray-900 outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 -mx-1"
				onblur={(e) => {
					const text = e.currentTarget.textContent?.trim();
					if (text) timeline.setTitle(text);
					else e.currentTarget.textContent = timeline.data.title;
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						(e.currentTarget as HTMLElement).blur();
					}
				}}
			>
				{timeline.data.title}
			</h1>
			<span class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
				{timeline.data.events.length} events, {timeline.data.periods.length} periods
			</span>
			{#if timeline.timeConfig.name !== 'Gregorian'}
				<span class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
					{timeline.timeConfig.name}
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<TimelineControls
				onZoomIn={() => zoomControls?.zoomIn()}
				onZoomOut={() => zoomControls?.zoomOut()}
				onReset={() => zoomControls?.reset()}
			/>
			<div class="mx-1 h-5 w-px bg-gray-200"></div>
			<button
				onclick={() => zoomControls?.exportPng()}
				class="flex h-8 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
				title="Export as PNG"
			>
				<Download size={14} />
			</button>
			<button
				onclick={() => (showTimeConfig = true)}
				class="flex h-8 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
				title="Time settings"
			>
				<Settings size={14} />
				{timeline.timeConfig.name}
			</button>
			<button
				onclick={() => {
					if (confirm('Clear all events and periods? This cannot be undone.')) {
						timeline.clearAll();
					}
				}}
				class="flex h-8 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
				title="New timeline"
			>
				<FilePlus size={14} />
				New
			</button>
		</div>
	</header>

	<div class="flex min-h-0 flex-1">
		<TimelineSidebar
			data={timeline.data}
			timeConfig={timeline.timeConfig}
			onAddEvent={() => {
				showEventForm = true;
			}}
			onAddPeriod={() => {
				showPeriodForm = true;
			}}
		/>

		<main class="flex-1 p-4">
			<Timeline
				data={timeline.data}
				timeConfig={timeline.timeConfig}
				onEventClick={handleEventClick}
				onPeriodClick={handlePeriodClick}
				bind:zoomRef={zoomControls}
			/>
		</main>
	</div>

	{#if showEventForm}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
			<div class="w-80 rounded-xl bg-white p-4 shadow-xl">
				<EventForm
					event={timeline.editingEvent}
					timeConfig={timeline.timeConfig}
					onSubmit={handleEventSubmit}
					onCancel={() => {
						timeline.setEditingEvent(null);
						showEventForm = false;
					}}
				/>
			</div>
		</div>
	{/if}

	{#if showPeriodForm}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
			<div class="w-80 rounded-xl bg-white p-4 shadow-xl">
				<PeriodForm
					period={timeline.editingPeriod}
					timeConfig={timeline.timeConfig}
					onSubmit={handlePeriodSubmit}
					onCancel={() => {
						timeline.setEditingPeriod(null);
						showPeriodForm = false;
					}}
				/>
			</div>
		</div>
	{/if}

	{#if showTimeConfig}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
			<div class="w-80 rounded-xl bg-white p-4 shadow-xl">
				<TimeConfigForm
					config={timeline.timeConfig}
					onSubmit={handleTimeConfigSubmit}
					onCancel={() => (showTimeConfig = false)}
				/>
			</div>
		</div>
	{/if}
</div>
