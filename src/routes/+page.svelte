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
		Monitor,
		PanelLeftClose,
		PanelLeftOpen
	} from '@lucide/svelte';
	import { browser } from '$app/environment';
	import DropdownMenu from '$lib/components/DropdownMenu.svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import TimelineControls from '$lib/components/TimelineControls.svelte';
	import TimelineSidebar from '$lib/components/TimelineSidebar.svelte';
	import EventForm from '$lib/components/EventForm.svelte';
	import PeriodForm from '$lib/components/PeriodForm.svelte';
	import TimeConfigForm from '$lib/components/TimeConfigForm.svelte';
	import { createStorage } from '$lib/host/storage';
	import { timeline, type TimelineStatus } from '$lib/state/timeline.svelte';
	import { theme, type ThemeMode } from '$lib/state/theme.svelte';
	import type { TimeConfig } from '$lib/types';

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

	function statusLabel(status: TimelineStatus): string {
		switch (status) {
			case 'loading':
				return 'Waiting for Obsidian';
			case 'saving':
				return 'Saving';
			case 'saved':
				return 'Saved';
			case 'conflict':
				return 'File changed';
			case 'save-error':
				return 'Save failed';
			case 'load-error':
				return 'Open failed';
		}
	}

	function statusColor(status: TimelineStatus): string {
		if (status === 'conflict' || status === 'save-error' || status === 'load-error') {
			return 'text-amber-600 dark:text-amber-400';
		}
		if (status === 'saving' || status === 'loading') return 'text-zinc-500 dark:text-zinc-400';
		return 'text-emerald-600 dark:text-emerald-400';
	}

	let pasteJsonText = $state('');
	let jsonStatus = $state('');
	let jsonStatusIsError = $state(false);
	let zoomControls = $state<{
		zoomIn: () => void;
		zoomOut: () => void;
		reset: () => void;
		exportPng: () => void;
	} | null>(null);
	let eventDialog = $state<HTMLDialogElement | null>(null);
	let periodDialog = $state<HTMLDialogElement | null>(null);
	let timeConfigDialog = $state<HTMLDialogElement | null>(null);
	let pasteJsonDialog = $state<HTMLDialogElement | null>(null);

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
		eventDialog?.close();
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
		periodDialog?.close();
	}

	function handleTimeConfigSubmit(config: TimeConfig) {
		timeline.setTimeConfig(config);
		timeConfigDialog?.close();
	}

	function flashStatus(msg: string, isError = false) {
		jsonStatus = msg;
		jsonStatusIsError = isError;
		setTimeout(() => (jsonStatus = ''), 2000);
	}

	async function exportJsonToClipboard() {
		try {
			await navigator.clipboard.writeText(timeline.exportJson());
			flashStatus('Copied!');
		} catch {
			flashStatus('Copy failed', true);
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
				flashStatus('Loaded!');
			} catch {
				alert('Invalid timeline file');
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
			flashStatus('Loaded!');
		} catch {
			alert('Invalid timeline file');
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

<div class="flex h-screen flex-col overflow-x-hidden text-zinc-900 dark:text-zinc-100">
	<header
		class="relative z-20 flex items-center justify-between gap-3 border-b border-black/10 bg-white/55 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-white/10 dark:bg-zinc-950/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
	>
		<div class="flex min-w-0 items-center gap-2.5">
			<h1
				contenteditable={editable}
				class="-mx-1 max-w-[42vw] truncate rounded px-1 text-sm font-semibold tracking-tight text-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500 dark:text-zinc-100"
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
			<span class="ui-pill shrink-0">
				{timeline.data.events.length} events, {timeline.data.periods.length} periods
			</span>
		</div>

		<div class="flex items-center gap-1.5">
			<TimelineControls
				onZoomIn={() => zoomControls?.zoomIn()}
				onZoomOut={() => zoomControls?.zoomOut()}
				onReset={() => zoomControls?.reset()}
			/>
			<span class="mx-0.5 h-5 w-px bg-black/10 dark:bg-white/10"></span>
			<DropdownMenu
				triggerLabel="Export"
				triggerIcon={Download}
				items={embedded
					? [{ icon: Download, label: 'PNG Image', onclick: () => zoomControls?.exportPng() }]
					: [
							{ icon: Download, label: 'PNG Image', onclick: () => zoomControls?.exportPng() },
							{ icon: Copy, label: 'JSON to Clipboard', onclick: exportJsonToClipboard },
							{ icon: Download, label: 'Timeline File', onclick: exportJsonToFile }
						]}
			/>
			{#if !embedded}
				<DropdownMenu
					triggerLabel="Import"
					triggerIcon={Upload}
					items={[
						{ icon: Upload, label: 'Timeline File', onclick: importJsonFromFile },
						{ icon: ClipboardPaste, label: 'Paste JSON', onclick: importJsonFromPaste }
					]}
				/>
			{/if}
			{#if jsonStatus}
				<span
					class="text-[10px] font-medium {jsonStatusIsError
						? 'text-red-600 dark:text-red-400'
						: 'text-emerald-600 dark:text-emerald-400'}"
				>
					{jsonStatus}
				</span>
			{/if}
			{#if embedded}
				<span class="text-[10px] font-medium {statusColor(timeline.status)}">
					{statusLabel(timeline.status)}
				</span>
			{/if}
			<button onclick={() => timeConfigDialog?.showModal()} class="ui-btn" title="Time settings">
				<Settings size={14} />
				{timeline.timeConfig.name}
			</button>
			{#if !embedded}
				<button
					onclick={() => {
						if (confirm('Clear all events and periods? This cannot be undone.')) {
							timeline.clearAll();
						}
					}}
					class="ui-btn"
					title="New timeline"
				>
					<FilePlus size={14} />
					New
				</button>
			{/if}
			<span class="mx-0.5 h-5 w-px bg-black/10 dark:bg-white/10"></span>
			<div
				class="flex items-center gap-0.5 rounded-md border border-black/10 bg-white/60 p-0.5 dark:border-white/10 dark:bg-white/5"
				role="group"
				aria-label="Theme"
			>
				{#each themeOptions as option (option.mode)}
					<button
						onclick={() => theme.set(option.mode)}
						class="grid size-6 place-items-center rounded transition-colors {theme.mode ===
						option.mode
							? 'bg-white text-zinc-900 shadow-sm dark:bg-white/15 dark:text-white'
							: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}"
						title={option.label}
						aria-label={option.label}
						aria-pressed={theme.mode === option.mode}
					>
						<option.icon size={13} />
					</button>
				{/each}
			</div>
			<button
				onclick={toggleSidebar}
				class="ui-btn px-2"
				title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
				aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
				aria-expanded={!sidebarCollapsed}
			>
				{#if sidebarCollapsed}
					<PanelLeftOpen size={15} />
				{:else}
					<PanelLeftClose size={15} />
				{/if}
			</button>
		</div>
	</header>

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
		<div class="flex min-h-0 flex-1">
			<TimelineSidebar
				data={timeline.data}
				timeConfig={timeline.timeConfig}
				collapsed={sidebarCollapsed}
				onAddEvent={() => {
					eventDialog?.showModal();
				}}
				onAddPeriod={() => {
					periodDialog?.showModal();
				}}
			/>

			<main class="min-w-0 flex-1 p-3">
				<Timeline
					data={timeline.data}
					timeConfig={timeline.timeConfig}
					onEventClick={handleEventClick}
					onPeriodClick={handlePeriodClick}
					bind:zoomRef={zoomControls}
				/>
			</main>
		</div>
	{/if}

	<dialog bind:this={eventDialog} class="ui-panel w-80 p-4">
		<EventForm
			event={timeline.editingEvent}
			timeConfig={timeline.timeConfig}
			onSubmit={handleEventSubmit}
			onCancel={() => {
				timeline.setEditingEvent(null);
				eventDialog?.close();
			}}
		/>
	</dialog>

	<dialog bind:this={periodDialog} class="ui-panel w-80 p-4">
		<PeriodForm
			period={timeline.editingPeriod}
			timeConfig={timeline.timeConfig}
			onSubmit={handlePeriodSubmit}
			onCancel={() => {
				timeline.setEditingPeriod(null);
				periodDialog?.close();
			}}
		/>
	</dialog>

	<dialog bind:this={timeConfigDialog} class="ui-panel w-80 p-4">
		<TimeConfigForm
			config={timeline.timeConfig}
			onSubmit={handleTimeConfigSubmit}
			onCancel={() => timeConfigDialog?.close()}
		/>
	</dialog>

	<dialog bind:this={pasteJsonDialog} class="ui-panel w-96 p-4">
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
