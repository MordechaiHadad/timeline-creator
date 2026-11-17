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
	import DropdownMenu from '$lib/components/DropdownMenu.svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import TimelineControls from '$lib/components/TimelineControls.svelte';
	import TimelineSidebar from '$lib/components/TimelineSidebar.svelte';
	import { theme, type ThemeMode } from '$lib/state/theme.svelte';
	import type { TimelineData, TimeConfig } from '$lib/types';

	type ZoomControls = {
		zoomIn: () => void;
		zoomOut: () => void;
		reset: () => void;
		exportPng: () => void;
	};

	let {
		data,
		timeConfig,
		editable,
		embedded,
		sidebarCollapsed,
		onToggleSidebar,
		onTitleChange,
		onSettings,
		onExportPng,
		onExportJsonToClipboard,
		onExportJsonToFile,
		onImportJsonFromFile,
		onImportJsonFromPaste,
		onNewTimeline,
		onAddEvent,
		onAddPeriod,
		onEventClick,
		onPeriodClick,
		zoomRef = $bindable(null)
	}: {
		data: TimelineData;
		timeConfig: TimeConfig;
		editable: boolean;
		embedded: boolean;
		sidebarCollapsed: boolean;
		onToggleSidebar: () => void;
		onTitleChange: (title: string) => void;
		onSettings: () => void;
		onExportPng: () => void;
		onExportJsonToClipboard: () => void;
		onExportJsonToFile: () => void;
		onImportJsonFromFile: () => void;
		onImportJsonFromPaste: () => void;
		onNewTimeline: () => void;
		onAddEvent: () => void;
		onAddPeriod: () => void;
		onEventClick: (id: string) => void;
		onPeriodClick: (id: string) => void;
		zoomRef?: ZoomControls | null;
	} = $props();

	const themeOptions: Array<{ mode: ThemeMode; icon: typeof Sun; label: string }> = [
		{ mode: 'light', icon: Sun, label: 'Light theme' },
		{ mode: 'dark', icon: Moon, label: 'Dark theme' },
		{ mode: 'system', icon: Monitor, label: 'System theme' }
	];

	function saveTitle(element: HTMLElement) {
		const title = element.textContent?.trim();
		if (title) onTitleChange(title);
		else element.textContent = data.title;
	}
</script>

<div class="hidden min-h-0 flex-1 flex-col lg:flex">
	<header
		class="relative z-20 flex items-center justify-between gap-3 border-b border-black/10 bg-white/55 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-white/10 dark:bg-zinc-950/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
	>
		<div class="flex min-w-0 items-center gap-2.5">
			<h1
				contenteditable={editable}
				class="-mx-1 max-w-[42vw] truncate rounded px-1 text-sm font-semibold tracking-tight text-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500 dark:text-zinc-100"
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
			<span class="ui-pill shrink-0">
				{data.events.length} events, {data.periods.length} periods
			</span>
		</div>

		<div class="flex items-center gap-1.5">
			<TimelineControls
				onZoomIn={() => zoomRef?.zoomIn()}
				onZoomOut={() => zoomRef?.zoomOut()}
				onReset={() => zoomRef?.reset()}
			/>
			<span class="mx-0.5 h-5 w-px bg-black/10 dark:bg-white/10"></span>
			<DropdownMenu
				triggerLabel="Export"
				triggerIcon={Download}
				items={embedded
					? [{ icon: Download, label: 'PNG Image', onclick: onExportPng }]
					: [
							{ icon: Download, label: 'PNG Image', onclick: onExportPng },
							{ icon: Copy, label: 'JSON to Clipboard', onclick: onExportJsonToClipboard },
							{ icon: Download, label: 'Timeline File', onclick: onExportJsonToFile }
						]}
			/>
			{#if !embedded}
				<DropdownMenu
					triggerLabel="Import"
					triggerIcon={Upload}
					items={[
						{ icon: Upload, label: 'Timeline File', onclick: onImportJsonFromFile },
						{ icon: ClipboardPaste, label: 'Paste JSON', onclick: onImportJsonFromPaste }
					]}
				/>
			{/if}
			<button onclick={onSettings} class="ui-btn" title="Time settings">
				<Settings size={14} />
				{timeConfig.name}
			</button>
			{#if !embedded}
				<button onclick={onNewTimeline} class="ui-btn" title="New timeline">
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
				onclick={onToggleSidebar}
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

	<div class="flex min-h-0 flex-1">
		<TimelineSidebar {data} {timeConfig} collapsed={sidebarCollapsed} {onAddEvent} {onAddPeriod} />

		<main class="min-w-0 flex-1 p-3">
			<Timeline {data} {timeConfig} {onEventClick} {onPeriodClick} bind:zoomRef />
		</main>
	</div>
</div>
