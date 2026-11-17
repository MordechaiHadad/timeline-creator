<script lang="ts">
	import type { Component } from 'svelte';
	import { Ellipsis, Plus } from '@lucide/svelte';
	import DropdownMenu from '$lib/components/DropdownMenu.svelte';
	import EventForm from '$lib/components/EventForm.svelte';
	import PeriodForm from '$lib/components/PeriodForm.svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import TimelineControls from '$lib/components/TimelineControls.svelte';
	import { timeline } from '$lib/state/timeline.svelte';
	import { formatCustomDateShort } from '$lib/time';
	import type { TimeConfig, TimelineData } from '$lib/types';

	type ZoomControls = {
		zoomIn: () => void;
		zoomOut: () => void;
		reset: () => void;
		exportPng: () => void;
	};

	type MenuAction = {
		icon: Component;
		label: string;
		onclick: () => void;
	};

	let {
		data,
		timeConfig,
		editable,
		actions,
		onTitleChange,
		onEventSubmit,
		onPeriodSubmit,
		onEventDelete,
		onPeriodDelete,
		zoomRef = $bindable(null)
	}: {
		data: TimelineData;
		timeConfig: TimeConfig;
		editable: boolean;
		actions: MenuAction[];
		onTitleChange: (title: string) => void;
		onEventSubmit: (data: {
			date: Date;
			label: string;
			description: string;
			color: string;
		}) => void;
		onPeriodSubmit: (data: { start: Date; end: Date; label: string; color: string }) => void;
		onEventDelete: () => void;
		onPeriodDelete: () => void;
		zoomRef?: ZoomControls | null;
	} = $props();

	let view = $state<'canvas' | 'agenda'>('canvas');
	let editorDialog = $state<HTMLDialogElement | null>(null);
	let editorKind = $state<'event' | 'period' | null>(null);

	function saveTitle(element: HTMLElement) {
		const title = element.textContent?.trim();
		if (title) onTitleChange(title);
		else element.textContent = data.title;
	}

	function openEventEditor(id: string) {
		const event = data.events.find((item) => item.id === id);
		if (!event) return;
		timeline.setEditingEvent(event);
		timeline.setEditingPeriod(null);
		editorKind = 'event';
		editorDialog?.showModal();
	}

	function openPeriodEditor(id: string) {
		const period = data.periods.find((item) => item.id === id);
		if (!period) return;
		timeline.setEditingPeriod(period);
		timeline.setEditingEvent(null);
		editorKind = 'period';
		editorDialog?.showModal();
	}

	function closeEditor() {
		timeline.setEditingEvent(null);
		timeline.setEditingPeriod(null);
		editorKind = null;
		editorDialog?.close();
	}

	function submitEvent(values: Parameters<typeof onEventSubmit>[0]) {
		onEventSubmit(values);
		editorKind = null;
		editorDialog?.close();
	}

	function submitPeriod(values: Parameters<typeof onPeriodSubmit>[0]) {
		onPeriodSubmit(values);
		editorKind = null;
		editorDialog?.close();
	}

	function deleteEvent() {
		onEventDelete();
		editorKind = null;
		editorDialog?.close();
	}

	function deletePeriod() {
		onPeriodDelete();
		editorKind = null;
		editorDialog?.close();
	}

	function addEvent() {
		timeline.setEditingEvent(null);
		timeline.setEditingPeriod(null);
		editorKind = 'event';
		editorDialog?.showModal();
	}

	function addPeriod() {
		timeline.setEditingPeriod(null);
		timeline.setEditingEvent(null);
		editorKind = 'period';
		editorDialog?.showModal();
	}
</script>

<div class="flex min-h-0 flex-1 flex-col lg:hidden">
	<header
		class="relative z-20 flex items-center justify-between gap-4 border-b border-black/10 bg-white/55 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
	>
		<div class="flex min-w-0 items-center gap-2">
			<h1
				contenteditable={editable}
				class="-mx-1 max-w-[72vw] truncate rounded px-1 text-sm font-semibold tracking-tight outline-none focus:ring-1 focus:ring-indigo-500"
				onblur={(event) => saveTitle(event.currentTarget)}
				onkeydown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						event.currentTarget.blur();
					}
				}}
			>
				{data.title}
			</h1>
		</div>

		<DropdownMenu triggerLabel="" triggerIcon={Ellipsis} items={actions} />
	</header>

	<div class="border-b border-black/10 px-3 py-2 dark:border-white/10">
		<div
			class="flex w-full items-center gap-0.5 rounded-md border border-black/10 bg-white/60 p-0.5 dark:border-white/10 dark:bg-white/5"
			role="group"
			aria-label="Timeline view"
		>
			<button
				class="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded px-2 text-xs font-medium {view ===
				'canvas'
					? 'bg-white text-zinc-900 shadow-sm dark:bg-white/15 dark:text-white'
					: 'text-zinc-500 dark:text-zinc-400'}"
				aria-pressed={view === 'canvas'}
				onclick={() => (view = 'canvas')}
			>
				Canvas
			</button>
			<button
				class="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded px-2 text-xs font-medium {view ===
				'agenda'
					? 'bg-white text-zinc-900 shadow-sm dark:bg-white/15 dark:text-white'
					: 'text-zinc-500 dark:text-zinc-400'}"
				aria-pressed={view === 'agenda'}
				onclick={() => (view = 'agenda')}
			>
				Agenda
			</button>
		</div>
	</div>

	{#if view === 'canvas'}
		<main class="min-h-0 flex-1 p-3">
			<Timeline
				{data}
				{timeConfig}
				onEventClick={openEventEditor}
				onPeriodClick={openPeriodEditor}
				bind:zoomRef
			/>
		</main>
		<div class="flex justify-end border-t border-black/10 px-3 py-2 dark:border-white/10">
			<TimelineControls
				onZoomIn={() => zoomRef?.zoomIn()}
				onZoomOut={() => zoomRef?.zoomOut()}
				onReset={() => zoomRef?.reset()}
			/>
		</div>
	{:else}
		<main class="min-h-0 flex-1 overflow-y-auto p-3">
			<div class="flex flex-col">
				<section class="flex flex-col gap-1.5">
					<div class="flex items-center justify-between gap-1 px-1">
						<h2
							class="text-[10px] font-bold tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400"
						>
							Events
						</h2>
						<button
							onclick={addEvent}
							class="ui-btn size-6 px-0"
							title="Add event"
							aria-label="Add event"
						>
							<Plus size={12} />
						</button>
					</div>

					<div class="flex flex-col gap-0.5">
						{#if data.events.length === 0}
							<p class="py-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
								No events yet
							</p>
						{:else}
							{#each data.events as event (event.id)}
								<button
									class="group flex items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-black/10 hover:bg-white/70 dark:hover:border-white/10 dark:hover:bg-white/5"
									aria-label={`${event.label}, ${formatCustomDateShort(event.date, timeConfig)}`}
									onclick={() => openEventEditor(event.id)}
								>
									<span
										class="size-2.5 shrink-0 rounded-full"
										style="background-color: {event.color}"
									></span>
									<span class="min-w-0 flex-1">
										<strong class="block truncate text-xs font-medium">{event.label}</strong>
										<small class="text-[10px] text-zinc-400 dark:text-zinc-500">
											{formatCustomDateShort(event.date, timeConfig)}
										</small>
									</span>
								</button>
							{/each}
						{/if}
					</div>
				</section>

				<section class="flex flex-col gap-1.5 border-t border-black/10 pt-3 dark:border-white/10">
					<div class="flex items-center justify-between gap-1 px-1">
						<h2
							class="text-[10px] font-bold tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400"
						>
							Periods
						</h2>
						<button
							onclick={addPeriod}
							class="ui-btn size-6 px-0"
							title="Add period"
							aria-label="Add period"
						>
							<Plus size={12} />
						</button>
					</div>

					<div class="flex flex-col gap-0.5 pb-10">
						{#if data.periods.length === 0}
							<p class="py-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
								No periods yet
							</p>
						{:else}
							{#each data.periods as period (period.id)}
								<button
									class="group flex items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-black/10 hover:bg-white/70 dark:hover:border-white/10 dark:hover:bg-white/5"
									aria-label={`${period.label}, ${formatCustomDateShort(period.start, timeConfig)} to ${formatCustomDateShort(period.end, timeConfig)}`}
									onclick={() => openPeriodEditor(period.id)}
								>
									<span
										class="size-2.5 shrink-0 rounded-[3px]"
										style="background-color: {period.color}"
									></span>
									<span class="min-w-0 flex-1">
										<strong class="block truncate text-xs font-medium">{period.label}</strong>
										<small class="text-[10px] text-zinc-400 dark:text-zinc-500">
											{formatCustomDateShort(period.start, timeConfig)} to {formatCustomDateShort(
												period.end,
												timeConfig
											)}
										</small>
									</span>
								</button>
							{/each}
						{/if}
					</div>
				</section>
			</div>
		</main>
	{/if}
</div>

<dialog
	bind:this={editorDialog}
	aria-labelledby={editorKind === 'event' ? 'mobile-event-title' : 'mobile-period-title'}
	oncancel={(event) => {
		event.preventDefault();
		closeEditor();
	}}
	class="ui-panel fixed inset-x-0 bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-lg rounded-b-none p-4 lg:hidden"
>
	{#if editorKind === 'event'}
		<EventForm
			idPrefix="mobile-event"
			event={timeline.editingEvent}
			{timeConfig}
			onSubmit={submitEvent}
			onDelete={deleteEvent}
			onCancel={closeEditor}
		/>
	{:else if editorKind === 'period'}
		<PeriodForm
			idPrefix="mobile-period"
			period={timeline.editingPeriod}
			{timeConfig}
			onSubmit={submitPeriod}
			onDelete={deletePeriod}
			onCancel={closeEditor}
		/>
	{/if}
</dialog>
