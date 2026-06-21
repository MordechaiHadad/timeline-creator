<script lang="ts">
	import { Settings, FilePlus, Download, Copy, Upload, ClipboardPaste, ChevronDown } from '@lucide/svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import TimelineControls from '$lib/components/TimelineControls.svelte';
	import TimelineSidebar from '$lib/components/TimelineSidebar.svelte';
	import EventForm from '$lib/components/EventForm.svelte';
	import PeriodForm from '$lib/components/PeriodForm.svelte';
	import TimeConfigForm from '$lib/components/TimeConfigForm.svelte';
	import { timeline } from '$lib/state/timeline.svelte';
	import type { TimeConfig } from '$lib/types';

	timeline.initPersistence();

	let pasteJsonText = $state('');
	let jsonStatus = $state('');
	let showExportMenu = $state(false);
	let showImportMenu = $state(false);
	let zoomControls = $state<{ zoomIn: () => void; zoomOut: () => void; reset: () => void; exportPng: () => void } | null>(
		null
	);
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
		periodDialog?.close();
	}

	function handleTimeConfigSubmit(config: TimeConfig) {
		timeline.setTimeConfig(config);
		timeConfigDialog?.close();
	}

	function flashStatus(msg: string) {
		jsonStatus = msg;
		setTimeout(() => (jsonStatus = ''), 2000);
	}

	function closeMenus() {
		showExportMenu = false;
		showImportMenu = false;
	}

	function exportJsonToClipboard() {
		navigator.clipboard.writeText(timeline.exportJson());
		flashStatus('Copied!');
	}

	function exportJsonToFile() {
		const blob = new Blob([timeline.exportJson()], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `${timeline.data.title.replace(/[^a-zA-Z0-9]/g, '_') || 'timeline'}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function importJsonFromFile() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const text = await file.text();
				timeline.loadFromJson(text);
				flashStatus('Loaded!');
			} catch {
				alert('Invalid JSON file');
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
			alert('Invalid JSON');
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
			<div class="h-5 w-px bg-gray-200"></div>
			<div class="relative">
				<button
					onclick={() => { closeMenus(); showExportMenu = !showExportMenu; }}
					class="flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
				>
					<Download size={14} />
					Export
					<ChevronDown size={12} />
				</button>
				{#if showExportMenu}
					<div
						onclick={closeMenus}
						onkeydown={(e) => { if (e.key === 'Escape') closeMenus(); }}
						class="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
						role="menu"
						tabindex="0"
					>
						<button
							onclick={() => zoomControls?.exportPng()}
							class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
							role="menuitem"
						>
							<Download size={14} />
							PNG Image
						</button>
						<button
							onclick={exportJsonToClipboard}
							class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
							role="menuitem"
						>
							<Copy size={14} />
							JSON to Clipboard
						</button>
						<button
							onclick={exportJsonToFile}
							class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
							role="menuitem"
						>
							<Download size={14} />
							JSON File
						</button>
					</div>
				{/if}
			</div>
			<div class="relative">
				<button
					onclick={() => { closeMenus(); showImportMenu = !showImportMenu; }}
					class="flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
				>
					<Upload size={14} />
					Import
					<ChevronDown size={12} />
				</button>
				{#if showImportMenu}
					<div
						onclick={closeMenus}
						onkeydown={(e) => { if (e.key === 'Escape') closeMenus(); }}
						class="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
						role="menu"
						tabindex="0"
					>
						<button
							onclick={importJsonFromFile}
							class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
							role="menuitem"
						>
							<Upload size={14} />
							JSON from File
						</button>
						<button
							onclick={importJsonFromPaste}
							class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
							role="menuitem"
						>
							<ClipboardPaste size={14} />
							JSON from Text
						</button>
					</div>
				{/if}
			</div>
			{#if jsonStatus}
				<span class="text-[10px] font-medium text-green-600">{jsonStatus}</span>
			{/if}
			<button
				onclick={() => timeConfigDialog?.showModal()}
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

	<dialog
		bind:this={eventDialog}
		class="w-80 rounded-xl bg-white p-4 shadow-xl"
	>
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

	<dialog
		bind:this={periodDialog}
		class="w-80 rounded-xl bg-white p-4 shadow-xl"
	>
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

	<dialog
		bind:this={timeConfigDialog}
		class="w-80 rounded-xl bg-white p-4 shadow-xl"
	>
		<TimeConfigForm
			config={timeline.timeConfig}
			onSubmit={handleTimeConfigSubmit}
			onCancel={() => timeConfigDialog?.close()}
		/>
	</dialog>

	<dialog
		bind:this={pasteJsonDialog}
		class="w-96 rounded-xl bg-white p-4 shadow-xl"
	>
		<form method="dialog" class="flex flex-col gap-3">
			<h3 class="text-sm font-semibold text-gray-900">Import JSON</h3>
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
					onclick={handlePasteJsonSubmit}
					class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
				>
					Import
				</button>
			</div>
		</form>
	</dialog>
</div>
