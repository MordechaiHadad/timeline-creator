<script lang="ts">
	import type { TimelineEvent, TimeConfig } from '$lib/types';
	import { dateToCustomInput, parseCustomDateString } from '$lib/time';
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

	const defaultDate = timeConfig.precision === 'year'
		? String(new Date().getFullYear())
		: new Date().toISOString().split('T')[0];

	let dateInput = $state(
		event ? dateToCustomInput(event.date, timeConfig) : defaultDate
	);
	let label = $state(event?.label ?? '');
	let description = $state(event?.description ?? '');
	let color = $state(event?.color ?? nextColor());

	let realDatePreview = $derived(() => {
		const parsed = parseCustomDateString(dateInput, timeConfig);
		if (!parsed) return 'Invalid date';
		return parsed.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		const parsed = parseCustomDateString(dateInput, timeConfig);
		if (!parsed) return;
		onSubmit({ date: parsed, label, description, color });
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-3">
	<h3 class="text-sm font-semibold text-gray-900">
		{event ? 'Edit Event' : 'Add Event'}
	</h3>

	<div class="flex flex-col gap-1">
		<label for="event-date" class="text-xs font-medium text-gray-600">
			Date ({timeConfig.name} calendar)
		</label>
		<input
			id="event-date"
			type="text"
			bind:value={dateInput}
			required
			placeholder={timeConfig.precision === 'year' ? 'e.g. 5000' : 'e.g. 5000-03-15'}
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		/>
		<p class="text-[10px] text-gray-400">
			Real date: {realDatePreview()}
		</p>
	</div>

	<div class="flex flex-col gap-1">
		<label for="event-label" class="text-xs font-medium text-gray-600">Label</label>
		<input
			id="event-label"
			type="text"
			bind:value={label}
			required
			placeholder="e.g. Moon Landing"
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="event-desc" class="text-xs font-medium text-gray-600">Description</label>
		<textarea
			id="event-desc"
			bind:value={description}
			rows="2"
			placeholder="Optional description"
			class="resize-none rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		></textarea>
	</div>

	<div class="flex flex-col gap-1">
		<label for="event-color" class="text-xs font-medium text-gray-600">Color</label>
		<div class="flex items-center gap-2">
			<input
				id="event-color"
				type="color"
				bind:value={color}
				class="h-8 w-8 cursor-pointer rounded border border-gray-200"
			/>
			<span class="text-xs text-gray-500">{color}</span>
		</div>
	</div>

	<div class="flex justify-end gap-2">
		<button
			type="button"
			onclick={onCancel}
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
		>
			Cancel
		</button>
		<button
			type="submit"
			class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
		>
			{event ? 'Update' : 'Add'}
		</button>
	</div>
</form>
