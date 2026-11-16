<script lang="ts">
	import type { TimelinePeriod, TimeConfig } from '$lib/types';
	import { dateToCustomInput, parseCustomDateString, formatRealDate } from '$lib/time';
	import { nextColor } from '$lib/color';

	let {
		period = null,
		timeConfig,
		onSubmit,
		onCancel
	}: {
		period: TimelinePeriod | null;
		timeConfig: TimeConfig;
		onSubmit: (data: { start: Date; end: Date; label: string; color: string }) => void;
		onCancel: () => void;
	} = $props();

	let startInput = $state('');
	let endInput = $state('');
	let label = $state('');
	let color = $state('#3b82f6');

	$effect(() => {
		if (period) {
			startInput = dateToCustomInput(period.start, timeConfig);
			endInput = dateToCustomInput(period.end, timeConfig);
			label = period.label;
			color = period.color;
		} else {
			const defaultDate = dateToCustomInput(new Date(), timeConfig);
			startInput = defaultDate;
			endInput = defaultDate;
			label = '';
			color = nextColor();
		}
	});

	let realStartPreview = $derived.by(() => {
		const parsed = parseCustomDateString(startInput, timeConfig);
		if (!parsed) return 'Invalid';
		return formatRealDate(parsed);
	});

	let realEndPreview = $derived.by(() => {
		const parsed = parseCustomDateString(endInput, timeConfig);
		if (!parsed) return 'Invalid';
		return formatRealDate(parsed);
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		const parsedStart = parseCustomDateString(startInput, timeConfig);
		const parsedEnd = parseCustomDateString(endInput, timeConfig);
		if (!parsedStart || !parsedEnd) return;
		onSubmit({ start: parsedStart, end: parsedEnd, label, color });
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-3">
	<h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
		{period ? 'Edit Period' : 'Add Period'}
	</h3>

	<div class="flex flex-col gap-1">
		<label for="period-start" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
			Start Date ({timeConfig.name} calendar)
		</label>
		<input
			id="period-start"
			type="text"
			bind:value={startInput}
			required
			placeholder={timeConfig.precision === 'year' ? 'e.g. 5000' : 'e.g. 5000-01-01'}
			class="ui-field"
		/>
		<p class="text-[10px] text-zinc-400 dark:text-zinc-500">Real date: {realStartPreview}</p>
	</div>

	<div class="flex flex-col gap-1">
		<label for="period-end" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
			End Date ({timeConfig.name} calendar)
		</label>
		<input
			id="period-end"
			type="text"
			bind:value={endInput}
			required
			placeholder={timeConfig.precision === 'year' ? 'e.g. 5010' : 'e.g. 5010-12-31'}
			class="ui-field"
		/>
		<p class="text-[10px] text-zinc-400 dark:text-zinc-500">Real date: {realEndPreview}</p>
	</div>

	<div class="flex flex-col gap-1">
		<label for="period-label" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
			Label
		</label>
		<input
			id="period-label"
			type="text"
			bind:value={label}
			required
			placeholder="e.g. Space Race"
			class="ui-field"
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="period-color" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
			Color
		</label>
		<div class="flex items-center gap-2">
			<input
				id="period-color"
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
			{period ? 'Update' : 'Add'}
		</button>
	</div>
</form>
