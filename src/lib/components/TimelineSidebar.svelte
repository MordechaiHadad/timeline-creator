<script lang="ts">
	import { X, Plus } from '@lucide/svelte';
	import type { TimelineData, TimeConfig } from '$lib/types';
	import { timeline } from '$lib/state/timeline.svelte';
	import { formatCustomDateShort } from '$lib/time';

	let {
		data,
		timeConfig,
		collapsed = false,
		onAddEvent,
		onAddPeriod
	}: {
		data: TimelineData;
		timeConfig: TimeConfig;
		collapsed?: boolean;
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

<aside
	class="flex h-full shrink-0 flex-col gap-3 overflow-hidden border-r border-black/10 bg-white/40 p-2.5 backdrop-blur-xl transition-[width] duration-300 dark:border-white/10 dark:bg-white/[0.03] {collapsed
		? 'w-16'
		: 'w-64'}"
	aria-label="Events and periods"
>
	<section class="flex min-h-0 flex-1 flex-col gap-1.5">
		<div class="flex items-center gap-1 px-1 {collapsed ? 'justify-center' : 'justify-between'}">
			{#if !collapsed}
				<h2
					class="text-[10px] font-bold tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400"
				>
					Events
				</h2>
			{/if}
			<button
				onclick={() => {
					timeline.setEditingEvent(null);
					onAddEvent();
				}}
				class="ui-btn size-6 px-0"
				title="Add event"
				aria-label="Add event"
			>
				<Plus size={12} />
			</button>
		</div>

		<div class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
			{#if data.events.length === 0}
				{#if !collapsed}
					<p class="py-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">No events yet</p>
				{/if}
			{:else}
				{#each data.events as event (event.id)}
					<div
						class="group flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent py-1.5 transition-colors hover:border-black/10 hover:bg-white/70 dark:hover:border-white/10 dark:hover:bg-white/5 {collapsed
							? 'justify-center px-1'
							: 'px-2'}"
						onclick={() => handleEditEvent(event.id)}
						role="button"
						tabindex="0"
						title={collapsed ? event.label : undefined}
						aria-label={`${event.label}, ${formatCustomDateShort(event.date, timeConfig)}`}
						onkeydown={(e) => e.key === 'Enter' && handleEditEvent(event.id)}
					>
						<span
							class="inline-block size-2.5 shrink-0 rounded-full"
							style="background-color: {event.color}"
						></span>
						{#if !collapsed}
							<div class="min-w-0 flex-1">
								<p class="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
									{event.label}
								</p>
								<p class="text-[10px] text-zinc-400 dark:text-zinc-500">
									{formatCustomDateShort(event.date, timeConfig)}
								</p>
							</div>
							<button
								onclick={(e) => {
									e.stopPropagation();
									timeline.deleteEvent(event.id);
								}}
								class="shrink-0 rounded p-0.5 text-zinc-400 opacity-0 transition-colors group-hover:opacity-100 hover:text-red-500 focus-visible:opacity-100"
								title="Delete event"
								aria-label={`Delete ${event.label}`}
							>
								<X size={12} />
							</button>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</section>

	<section
		class="flex min-h-0 flex-1 flex-col gap-1.5 border-t border-black/10 pt-3 dark:border-white/10"
	>
		<div class="flex items-center gap-1 px-1 {collapsed ? 'justify-center' : 'justify-between'}">
			{#if !collapsed}
				<h2
					class="text-[10px] font-bold tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400"
				>
					Periods
				</h2>
			{/if}
			<button
				onclick={() => {
					timeline.setEditingPeriod(null);
					onAddPeriod();
				}}
				class="ui-btn size-6 px-0"
				title="Add period"
				aria-label="Add period"
			>
				<Plus size={12} />
			</button>
		</div>

		<div class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
			{#if data.periods.length === 0}
				{#if !collapsed}
					<p class="py-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
						No periods yet
					</p>
				{/if}
			{:else}
				{#each data.periods as period (period.id)}
					<div
						class="group flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent py-1.5 transition-colors hover:border-black/10 hover:bg-white/70 dark:hover:border-white/10 dark:hover:bg-white/5 {collapsed
							? 'justify-center px-1'
							: 'px-2'}"
						onclick={() => handleEditPeriod(period.id)}
						role="button"
						tabindex="0"
						title={collapsed ? period.label : undefined}
						aria-label={`${period.label}, ${formatCustomDateShort(period.start, timeConfig)} to ${formatCustomDateShort(period.end, timeConfig)}`}
						onkeydown={(e) => e.key === 'Enter' && handleEditPeriod(period.id)}
					>
						<span
							class="inline-block size-2.5 shrink-0 rounded-[3px]"
							style="background-color: {period.color}"
						></span>
						{#if !collapsed}
							<div class="min-w-0 flex-1">
								<p class="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
									{period.label}
								</p>
								<p class="text-[10px] text-zinc-400 dark:text-zinc-500">
									{formatCustomDateShort(period.start, timeConfig)} to {formatCustomDateShort(
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
								class="shrink-0 rounded p-0.5 text-zinc-400 opacity-0 transition-colors group-hover:opacity-100 hover:text-red-500 focus-visible:opacity-100"
								title="Delete period"
								aria-label={`Delete ${period.label}`}
							>
								<X size={12} />
							</button>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</section>
</aside>
