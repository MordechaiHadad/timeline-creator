<script lang="ts">
	import type { TimelineEvent, TimeConfig } from '$lib/types';
	import { dateToCustomInput, parseCustomDateString, formatRealDate } from '$lib/time';
	import { nextColor } from '$lib/color';

	let {
		event = null,
		timeConfig,
		onSubmit,
		onCancel
	}: {
		event: TimelineEvent | null;
		timeConfig: TimeConfig;
		onSubmit: (data: { date: Date; label: string; description: string; color: string }) => void;
		onCancel: () => void;
	} = $props();

	let dateInput = $state('');
	let label = $state('');
	let description = $state('');
	let color = $state('#3b82f6');

	$effect(() => {
		if (event) {
			dateInput = dateToCustomInput(event.date, timeConfig);
			label = event.label;
			description = event.description;
			color = event.color;
		} else {
			dateInput = dateToCustomInput(new Date(), timeConfig);
			label = '';
			description = '';
			color = nextColor();
		}
	});

	let realDatePreview = $derived.by(() => {
		const parsed = parseCustomDateString(dateInput, timeConfig);
		if (!parsed) return 'Invalid date';
		return formatRealDate(parsed);
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		const parsed = parseCustomDateString(dateInput, timeConfig);
		if (!parsed) return;
		onSubmit({ date: parsed, label, description, color });
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-3">
	<h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
		{event ? 'Edit Event' : 'Add Event'}
	</h3>

	<div class="flex flex-col gap-1">
		<label for="event-date" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
			Date ({timeConfig.name} calendar)
		</label>
		<input
			id="event-date"
			type="text"
			bind:value={dateInput}
			required
			placeholder={timeConfig.precision === 'year' ? 'e.g. 5000' : 'e.g. 5000-03-15'}
			class="ui-field"
		/>
		<p class="text-[10px] text-zinc-400 dark:text-zinc-500">
			Real date: {realDatePreview}
		</p>
	</div>

	<div class="flex flex-col gap-1">
		<label for="event-label" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
			Label
		</label>
		<input
			id="event-label"
			type="text"
			bind:value={label}
			required
			placeholder="e.g. Moon Landing"
			class="ui-field"
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="event-desc" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
			Description
		</label>
		<textarea
			id="event-desc"
			bind:value={description}
			rows="2"
			placeholder="Optional description"
			class="ui-field resize-none"
		></textarea>
	</div>

	<div class="flex flex-col gap-1">
		<label for="event-color" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
			Color
		</label>
		<div class="flex items-center gap-2">
			<input
				id="event-color"
				type="color"
				bind:value={color}
				class="h-8 w-8 cursor-pointer rounded border border-black/10 dark:border-white/10"
			/>
			<span class="text-xs text-zinc-500 dark:text-zinc-400">{color}</span>
		</div>
	</div>

	<div class="flex justify-end gap-2">
		<button type="button" onclick={onCancel} class="ui-btn">Cancel</button>
		<button type="submit" class="ui-btn-primary">
			{event ? 'Update' : 'Add'}
		</button>
	</div>
</form>
