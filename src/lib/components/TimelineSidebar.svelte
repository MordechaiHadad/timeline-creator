<script lang="ts">
	import { X, Plus } from '@lucide/svelte';
	import type { TimelineData, TimeConfig } from '$lib/types';
	import { timeline } from '$lib/state/timeline.svelte';
	import { formatCustomDateShort } from '$lib/time';

	let {
		data,
		timeConfig,
		onAddEvent,
		onAddPeriod
	}: {
		data: TimelineData;
		timeConfig: TimeConfig;
		onAddEvent: () => void;
		onAddPeriod: () => void;
	} = $props();

	function handleEditEvent(id: string) {
		const event = data.events.find((e) => e.id === id);
		if (event) {
			timeline.setEditingEvent(event);
			onAddEvent();
		}
	}

	function handleEditPeriod(id: string) {
		const period = data.periods.find((p) => p.id === id);
		if (period) {
			timeline.setEditingPeriod(period);
			onAddPeriod();
		}
	}
</script>

<aside class="flex h-full w-72 flex-col border-r border-gray-200 bg-gray-50">
	<div class="border-b border-gray-200 px-4 py-3">
		<h2 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Events</h2>
		<button
			onclick={() => {
				timeline.setEditingEvent(null);
				onAddEvent();
			}}
			class="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-white hover:text-gray-900"
		>
			<Plus size={12} />
			Add Event
		</button>
	</div>

	<div class="flex-1 overflow-y-auto px-4 py-2">
		{#if data.events.length === 0}
			<p class="py-4 text-center text-xs text-gray-400">No events yet</p>
		{:else}
			<div class="space-y-1">
				{#each data.events as event (event.id)}
					<div
						class="group flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white"
						onclick={() => handleEditEvent(event.id)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && handleEditEvent(event.id)}
					>
						<span
							class="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
							style="background-color: {event.color}"
						></span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-xs font-medium text-gray-900">{event.label}</p>
							<p class="text-[10px] text-gray-400">
								{formatCustomDateShort(event.date, timeConfig)}
							</p>
						</div>
						<button
							onclick={(e) => {
								e.stopPropagation();
								timeline.deleteEvent(event.id);
							}}
							class="shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-red-500"
							title="Delete event"
						>
							<X size={12} />
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="border-t border-b border-gray-200 px-4 py-3">
		<h2 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Periods</h2>
		<button
			onclick={() => {
				timeline.setEditingPeriod(null);
				onAddPeriod();
			}}
			class="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-white hover:text-gray-900"
		>
			<Plus size={12} />
			Add Period
		</button>
	</div>

	<div class="flex-1 overflow-y-auto px-4 py-2">
		{#if data.periods.length === 0}
			<p class="py-4 text-center text-xs text-gray-400">No periods yet</p>
		{:else}
			<div class="space-y-1">
				{#each data.periods as period (period.id)}
					<div
						class="group flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white"
						onclick={() => handleEditPeriod(period.id)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && handleEditPeriod(period.id)}
					>
						<span
							class="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
							style="background-color: {period.color}"
						></span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-xs font-medium text-gray-900">{period.label}</p>
							<p class="text-[10px] text-gray-400">
								{formatCustomDateShort(period.start, timeConfig)} - {formatCustomDateShort(
									period.end,
									timeConfig
								)}
							</p>
						</div>
						<button
							onclick={(e) => {
								e.stopPropagation();
								timeline.deletePeriod(period.id);
							}}
							class="shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-red-500"
							title="Delete period"
						>
							<X size={12} />
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</aside>
