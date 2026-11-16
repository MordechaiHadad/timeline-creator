<script lang="ts">
	import { Settings, FilePlus, Download, Copy, Upload, ClipboardPaste } from '@lucide/svelte';
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
	import type { TimeConfig } from '$lib/types';

	if (browser) timeline.init(createStorage());

	const embedded = $derived(timeline.embedded);
	const editable = $derived(timeline.status !== 'loading' && timeline.status !== 'load-error');

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
			return 'text-amber-600';
		}
		if (status === 'saving' || status === 'loading') return 'text-gray-500';
		return 'text-green-600';
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

<div class="flex h-screen flex-col overflow-x-hidden bg-gray-100">
	<header class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
		<div class="flex items-center gap-3">
			<h1
				contenteditable={editable}
				class="-mx-1 rounded px-1 text-lg font-bold text-gray-900 outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1"
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
			<div class="h-5 w-px bg-gray-200"></div>
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
					class="text-[10px] font-medium {jsonStatusIsError ? 'text-red-600' : 'text-green-600'}"
				>
					{jsonStatus}
				</span>
			{/if}
			{#if embedded}
				<span class="text-[10px] font-medium {statusColor(timeline.status)}">
					{statusLabel(timeline.status)}
				</span>
			{/if}
			<button
				onclick={() => timeConfigDialog?.showModal()}
				class="flex h-8 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
				title="Time settings"
			>
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
					class="flex h-8 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
					title="New timeline"
				>
					<FilePlus size={14} />
					New
				</button>
			{/if}
		</div>
	</header>

	{#if timeline.status === 'conflict' && timeline.conflictContent !== null}
		<div
			class="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-800"
		>
			<span>This file changed in your vault while you were editing.</span>
			<div class="flex gap-2">
				<button
					onclick={() => timeline.resolveConflict('reload')}
					class="rounded border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium hover:bg-amber-100"
				>
					Reload file
				</button>
				<button
					onclick={() => timeline.resolveConflict('keep')}
					class="rounded bg-amber-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-amber-700"
				>
					Keep mine
				</button>
			</div>
		</div>
	{/if}

	{#if timeline.status === 'save-error'}
		<div
			class="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700"
		>
			<span>{timeline.errorMessage}</span>
			<button
				onclick={() => timeline.retrySave()}
				class="rounded border border-red-300 bg-white px-2 py-1 text-[11px] font-medium hover:bg-red-100"
			>
				Retry
			</button>
		</div>
	{/if}

	{#if timeline.status === 'load-error'}
		<div class="flex flex-1 items-center justify-center p-8">
			<div class="max-w-sm text-center">
				<p class="text-sm font-semibold text-gray-900">Could not open this timeline</p>
				<p class="mt-1 text-xs text-gray-500">{timeline.errorMessage}</p>
			</div>
		</div>
	{:else if timeline.status === 'loading' && embedded}
		<div class="flex flex-1 items-center justify-center p-8">
			<p class="text-sm text-gray-500">Waiting for Obsidian...</p>
		</div>
	{:else}
		<div class="flex min-h-0 flex-1">
			<TimelineSidebar
				data={timeline.data}
				timeConfig={timeline.timeConfig}
				onAddEvent={() => {
					eventDialog?.showModal();
				}}
				onAddPeriod={() => {
					periodDialog?.showModal();
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
	{/if}

	<dialog bind:this={eventDialog} class="w-80 rounded-xl bg-white p-4 shadow-xl">
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

	<dialog bind:this={periodDialog} class="w-80 rounded-xl bg-white p-4 shadow-xl">
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

	<dialog bind:this={timeConfigDialog} class="w-80 rounded-xl bg-white p-4 shadow-xl">
		<TimeConfigForm
			config={timeline.timeConfig}
			onSubmit={handleTimeConfigSubmit}
			onCancel={() => timeConfigDialog?.close()}
		/>
	</dialog>

	<dialog bind:this={pasteJsonDialog} class="w-96 rounded-xl bg-white p-4 shadow-xl">
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handlePasteJsonSubmit();
			}}
			class="flex flex-col gap-3"
		>
			<h3 class="text-sm font-semibold text-gray-900">Import Timeline File</h3>
			<textarea
				bind:value={pasteJsonText}
				class="h-40 w-full resize-none rounded-lg border border-gray-200 p-2 font-mono text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
				placeholder="Paste your timeline JSON here..."
			></textarea>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					onclick={() => pasteJsonDialog?.close()}
					class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
				>
					Import
				</button>
			</div>
		</form>
	</dialog>
</div>
