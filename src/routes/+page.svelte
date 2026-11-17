<script lang="ts">
	import {
		Settings,
		FilePlus,
		Download,
		Copy,
		Upload,
		ClipboardPaste,
		Sun,
		Moon,
		Monitor
	} from '@lucide/svelte';
	import { browser } from '$app/environment';
	import type { Component } from 'svelte';
	import TimelineDesktop from '$lib/components/TimelineDesktop.svelte';
	import TimelineMobile from '$lib/components/TimelineMobile.svelte';
	import EventForm from '$lib/components/EventForm.svelte';
	import PeriodForm from '$lib/components/PeriodForm.svelte';
	import TimeConfigForm from '$lib/components/TimeConfigForm.svelte';
	import { createStorage } from '$lib/host/storage';
	import { timeline } from '$lib/state/timeline.svelte';
	import { theme, type ThemeMode } from '$lib/state/theme.svelte';
	import type { TimeConfig } from '$lib/types';
	import { toast } from 'svelte-sonner';

	if (browser) timeline.init(createStorage());

	const embedded = $derived(timeline.embedded);
	const editable = $derived(timeline.status !== 'loading' && timeline.status !== 'load-error');

	const SIDEBAR_KEY = 'timeline-sidebar-collapsed';
	let sidebarCollapsed = $state(browser ? localStorage.getItem(SIDEBAR_KEY) === 'true' : false);

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed));
	}

	const themeOptions: Array<{ mode: ThemeMode; icon: typeof Sun; label: string }> = [
		{ mode: 'light', icon: Sun, label: 'Light theme' },
		{ mode: 'dark', icon: Moon, label: 'Dark theme' },
		{ mode: 'system', icon: Monitor, label: 'System theme' }
	];

	type MenuAction = {
		icon: Component;
		label: string;
		onclick: () => void;
		section?: string;
		active?: boolean;
	};

	let pasteJsonText = $state('');
	let desktopZoomControls = $state<{
		zoomIn: () => void;
		zoomOut: () => void;
		reset: () => void;
		exportPng: () => void;
	} | null>(null);
	let eventDialog = $state<HTMLDialogElement | null>(null);
	let periodDialog = $state<HTMLDialogElement | null>(null);
	let timeConfigDialog = $state<HTMLDialogElement | null>(null);
	let pasteJsonDialog = $state<HTMLDialogElement | null>(null);

	const mobileActions = $derived<MenuAction[]>([
		{
			icon: Settings,
			label: 'Time settings',
			onclick: () => timeConfigDialog?.showModal(),
			section: 'Timeline'
		},
		...(embedded
			? []
			: [
					{
						icon: FilePlus,
						label: 'New timeline',
						onclick: startNewTimeline,
						section: 'Timeline'
					}
				]),
		{
			icon: Download,
			label: 'PNG Image',
			onclick: () => desktopZoomControls?.exportPng(),
			section: 'Export'
		},
		...(embedded
			? []
			: [
					{
						icon: Copy,
						label: 'JSON to Clipboard',
						onclick: exportJsonToClipboard,
						section: 'Export'
					},
					{ icon: Download, label: 'Timeline File', onclick: exportJsonToFile, section: 'Export' },
					{
						icon: Upload,
						label: 'Import Timeline File',
						onclick: importJsonFromFile,
						section: 'Import'
					},
					{
						icon: ClipboardPaste,
						label: 'Paste JSON',
						onclick: importJsonFromPaste,
						section: 'Import'
					}
				]),
		...themeOptions.map((option) => ({
			icon: option.icon,
			label: option.label,
			onclick: () => theme.set(option.mode),
			section: 'Appearance',
			active: theme.mode === option.mode
		}))
	]);

	function openAddEvent() {
		timeline.setEditingEvent(null);
		eventDialog?.showModal();
	}

	function openAddPeriod() {
		timeline.setEditingPeriod(null);
		periodDialog?.showModal();
	}

	function startNewTimeline() {
		if (confirm('Clear all events and periods? This cannot be undone.')) {
			timeline.clearAll();
		}
	}

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
	}

	function handlePeriodSubmit(data: { start: Date; end: Date; label: string; color: string }) {
		const { start, end } = data.start > data.end ? { start: data.end, end: data.start } : data;
		if (timeline.editingPeriod) {
			timeline.updatePeriod(timeline.editingPeriod.id, {
				start,
				end,
				label: data.label,
				color: data.color
			});
		} else {
			timeline.addPeriod({
				start,
				end,
				label: data.label,
				color: data.color
			});
		}
		timeline.setEditingPeriod(null);
	}

	function handleEventDelete() {
		if (!timeline.editingEvent) return;
		timeline.deleteEvent(timeline.editingEvent.id);
		timeline.setEditingEvent(null);
	}

	function handlePeriodDelete() {
		if (!timeline.editingPeriod) return;
		timeline.deletePeriod(timeline.editingPeriod.id);
		timeline.setEditingPeriod(null);
	}

	function handleTimeConfigSubmit(config: TimeConfig) {
		timeline.setTimeConfig(config);
		timeConfigDialog?.close();
	}

	async function exportJsonToClipboard() {
		try {
			await navigator.clipboard.writeText(timeline.exportJson());
			toast.success('Copied timeline to clipboard');
		} catch {
			toast.error('Could not copy timeline');
		}
	}

	function exportJsonToFile() {
		const blob = new Blob([timeline.exportJson()], { type: 'application/json' });
		const blobUrl = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = blobUrl;
		a.download = `${timeline.data.title.replace(/[^a-zA-Z0-9]/g, '_') || 'timeline'}.timeline`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
		toast.success('Timeline exported');
	}

	function importJsonFromFile() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.timeline,.json';
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const text = await file.text();
				timeline.loadFromJson(text);
				toast.success('Timeline imported');
			} catch {
				toast.error('Invalid timeline file');
			}
		};
		input.click();
	}

	function importJsonFromPaste() {
		pasteJsonText = '';
		pasteJsonDialog?.showModal();
	}

	function handlePasteJsonSubmit() {
		try {
			timeline.loadFromJson(pasteJsonText);
			pasteJsonDialog?.close();
			toast.success('Timeline imported');
		} catch {
			toast.error('Invalid timeline file');
		}
	}

	function handleEventClick(id: string) {
		const event = timeline.data.events.find((e) => e.id === id);
		if (event) {
			timeline.setEditingEvent(event);
			eventDialog?.showModal();
		}
	}

	function handlePeriodClick(id: string) {
		const period = timeline.data.periods.find((p) => p.id === id);
		if (period) {
			timeline.setEditingPeriod(period);
			periodDialog?.showModal();
		}
	}
</script>

<div class="flex h-dvh flex-col overflow-x-hidden text-zinc-900 dark:text-zinc-100">
	{#if timeline.status === 'conflict' && timeline.conflictContent !== null}
		<div
			class="flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 backdrop-blur-xl dark:text-amber-200"
		>
			<span>This file changed in your vault while you were editing.</span>
			<div class="flex gap-2">
				<button
					onclick={() => timeline.resolveConflict('reload')}
					class="rounded border border-amber-500/30 bg-white/70 px-2 py-1 text-[11px] font-medium hover:bg-amber-500/15 dark:bg-white/5"
				>
					Reload file
				</button>
				<button
					onclick={() => timeline.resolveConflict('keep')}
					class="rounded bg-amber-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-amber-500"
				>
					Keep mine
				</button>
			</div>
		</div>
	{/if}

	{#if timeline.status === 'save-error'}
		<div
			class="flex items-center justify-between gap-3 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-700 backdrop-blur-xl dark:text-red-300"
		>
			<span>{timeline.errorMessage}</span>
			<button
				onclick={() => timeline.retrySave()}
				class="rounded border border-red-500/30 bg-white/70 px-2 py-1 text-[11px] font-medium hover:bg-red-500/15 dark:bg-white/5"
			>
				Retry
			</button>
		</div>
	{/if}

	{#if timeline.status === 'load-error'}
		<div class="flex flex-1 items-center justify-center p-8">
			<div class="max-w-sm text-center">
				<p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
					Could not open this timeline
				</p>
				<p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{timeline.errorMessage}</p>
			</div>
		</div>
	{:else if timeline.status === 'loading' && embedded}
		<div class="flex flex-1 items-center justify-center p-8">
			<p class="text-sm text-zinc-500 dark:text-zinc-400">Waiting for Obsidian...</p>
		</div>
	{:else}
		<TimelineDesktop
			data={timeline.data}
			timeConfig={timeline.timeConfig}
			{editable}
			{embedded}
			{sidebarCollapsed}
			onToggleSidebar={toggleSidebar}
			onTitleChange={(title) => timeline.setTitle(title)}
			onSettings={() => timeConfigDialog?.showModal()}
			onExportPng={() => desktopZoomControls?.exportPng()}
			onExportJsonToClipboard={exportJsonToClipboard}
			onExportJsonToFile={exportJsonToFile}
			onImportJsonFromFile={importJsonFromFile}
			onImportJsonFromPaste={importJsonFromPaste}
			onNewTimeline={startNewTimeline}
			onAddEvent={openAddEvent}
			onAddPeriod={openAddPeriod}
			onEventClick={handleEventClick}
			onPeriodClick={handlePeriodClick}
			bind:zoomRef={desktopZoomControls}
		/>
		<TimelineMobile
			data={timeline.data}
			timeConfig={timeline.timeConfig}
			{editable}
			actions={mobileActions}
			onTitleChange={(title) => timeline.setTitle(title)}
			onEventSubmit={handleEventSubmit}
			onPeriodSubmit={handlePeriodSubmit}
			onEventDelete={handleEventDelete}
			onPeriodDelete={handlePeriodDelete}
		/>
	{/if}

	<dialog bind:this={eventDialog} aria-labelledby="desktop-event-title" class="ui-panel w-80 p-4">
		<EventForm
			idPrefix="desktop-event"
			event={timeline.editingEvent}
			timeConfig={timeline.timeConfig}
			onSubmit={(data) => {
				handleEventSubmit(data);
				eventDialog?.close();
			}}
			onDelete={() => {
				handleEventDelete();
				eventDialog?.close();
			}}
			onCancel={() => {
				timeline.setEditingEvent(null);
				eventDialog?.close();
			}}
		/>
	</dialog>

	<dialog bind:this={periodDialog} aria-labelledby="desktop-period-title" class="ui-panel w-80 p-4">
		<PeriodForm
			idPrefix="desktop-period"
			period={timeline.editingPeriod}
			timeConfig={timeline.timeConfig}
			onSubmit={(data) => {
				handlePeriodSubmit(data);
				periodDialog?.close();
			}}
			onDelete={() => {
				handlePeriodDelete();
				periodDialog?.close();
			}}
			onCancel={() => {
				timeline.setEditingPeriod(null);
				periodDialog?.close();
			}}
		/>
	</dialog>

	<dialog
		bind:this={timeConfigDialog}
		class="ui-panel fixed inset-x-0 bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-lg rounded-b-none p-4 lg:inset-0 lg:m-auto lg:max-h-[calc(100dvh-2rem)] lg:w-80 lg:max-w-[calc(100vw-2rem)] lg:rounded-lg"
	>
		<TimeConfigForm
			config={timeline.timeConfig}
			onSubmit={handleTimeConfigSubmit}
			onCancel={() => timeConfigDialog?.close()}
		/>
	</dialog>

	<dialog
		bind:this={pasteJsonDialog}
		class="ui-panel fixed inset-x-0 bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-lg rounded-b-none p-4 lg:inset-0 lg:m-auto lg:max-h-[calc(100dvh-2rem)] lg:w-96 lg:max-w-[calc(100vw-2rem)] lg:rounded-lg"
	>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handlePasteJsonSubmit();
			}}
			class="flex flex-col gap-3"
		>
			<h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Import Timeline File</h3>
			<textarea
				bind:value={pasteJsonText}
				class="ui-field h-40 resize-none font-mono text-xs"
				placeholder="Paste your timeline JSON here..."
			></textarea>
			<div class="flex justify-end gap-2">
				<button type="button" onclick={() => pasteJsonDialog?.close()} class="ui-btn">
					Cancel
				</button>
				<button type="submit" class="ui-btn-primary">Import</button>
			</div>
		</form>
	</dialog>
</div>
