<script lang="ts">
	import type { TimelinePeriod, TimeConfig } from '$lib/types';
	import { dateToCustomInput, parseCustomDateString } from '$lib/time';

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

	const initialPeriod = period;
	const initialConfig = timeConfig;
	const defaultDate = initialConfig.precision === 'year'
		? String(new Date().getFullYear())
		: new Date().toISOString().split('T')[0];

	let startInput = $state(
		initialPeriod ? dateToCustomInput(initialPeriod.start, initialConfig) : defaultDate
	);
	let endInput = $state(
		initialPeriod ? dateToCustomInput(initialPeriod.end, initialConfig) : defaultDate
	);
	let label = $state(initialPeriod?.label ?? '');
	function randomColor(): string {
		const colors = ['#3b82f6','#ef4444','#10b981','#8b5cf6','#f59e0b','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48','#0ea5e9','#a855f7','#d946ef'];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	let color = $state(initialPeriod?.color ?? randomColor());

	let realStartPreview = $derived(() => {
		const parsed = parseCustomDateString(startInput, initialConfig);
		if (!parsed) return 'Invalid';
		return parsed.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	});

	let realEndPreview = $derived(() => {
		const parsed = parseCustomDateString(endInput, initialConfig);
		if (!parsed) return 'Invalid';
		return parsed.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		const parsedStart = parseCustomDateString(startInput, initialConfig);
		const parsedEnd = parseCustomDateString(endInput, initialConfig);
		if (!parsedStart || !parsedEnd) return;
		onSubmit({ start: parsedStart, end: parsedEnd, label, color });
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-3">
	<h3 class="text-sm font-semibold text-gray-900">
		{period ? 'Edit Period' : 'Add Period'}
	</h3>

	<div class="flex flex-col gap-1">
		<label for="period-start" class="text-xs font-medium text-gray-600">
			Start Date ({timeConfig.name} calendar)
		</label>
		<input
			id="period-start"
			type="text"
			bind:value={startInput}
			required
			placeholder={timeConfig.precision === 'year' ? 'e.g. 5000' : 'e.g. 5000-01-01'}
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		/>
		<p class="text-[10px] text-gray-400">Real date: {realStartPreview()}</p>
	</div>

	<div class="flex flex-col gap-1">
		<label for="period-end" class="text-xs font-medium text-gray-600">
			End Date ({timeConfig.name} calendar)
		</label>
		<input
			id="period-end"
			type="text"
			bind:value={endInput}
			required
			placeholder={timeConfig.precision === 'year' ? 'e.g. 5010' : 'e.g. 5010-12-31'}
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		/>
		<p class="text-[10px] text-gray-400">Real date: {realEndPreview()}</p>
	</div>

	<div class="flex flex-col gap-1">
		<label for="period-label" class="text-xs font-medium text-gray-600">Label</label>
		<input
			id="period-label"
			type="text"
			bind:value={label}
			required
			placeholder="e.g. Space Race"
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="period-color" class="text-xs font-medium text-gray-600">Color</label>
		<div class="flex items-center gap-2">
			<input
				id="period-color"
				type="color"
				bind:value={color}
				class="h-8 w-8 cursor-pointer rounded border border-gray-200"
			/>
			<span class="text-xs text-gray-500">{color}</span>
		</div>
	</div>

	<div class="flex justify-end gap-2 pt-1">
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
			{period ? 'Update' : 'Add'}
		</button>
	</div>
</form>
