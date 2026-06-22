<script lang="ts">
	import type { TimeConfig } from '$lib/types';

	let {
		config,
		onSubmit,
		onCancel
	}: {
		config: TimeConfig;
		onSubmit: (config: TimeConfig) => void;
		onCancel: () => void;
	} = $props();

	let name = $state(config.name);
	let epoch = $state(config.epoch);
	let scale = $state(config.scale);
	let precision = $state<'year' | 'date'>(config.precision);

	function handleSubmit(e: Event) {
		e.preventDefault();
		onSubmit({ name, epoch, scale, precision });
	}

	let preview = $derived(() => {
		const examples = [
			{ custom: 0, label: 'Year 0' },
			{ custom: 1000, label: 'Year 1000' },
			{ custom: 2024, label: 'Year 2024' },
			{ custom: -500, label: 'Year -500' }
		];
		return examples.map((ex) => ({
			...ex,
			real: Math.round(epoch + ex.custom * scale)
		}));
	});
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-3">
	<h3 class="text-sm font-semibold text-gray-900">Time Configuration</h3>

	<div class="flex flex-col gap-1">
		<label for="tc-name" class="text-xs font-medium text-gray-600">Calendar Name</label>
		<input
			id="tc-name"
			type="text"
			bind:value={name}
			required
			placeholder="e.g. MDW, Star Date, etc."
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="tc-epoch" class="text-xs font-medium text-gray-600">
			Epoch (real year = custom year 0)
		</label>
		<input
			id="tc-epoch"
			type="number"
			bind:value={epoch}
			required
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		/>
		<p class="text-[10px] text-gray-400">
			The real-world year that corresponds to year 0 in your calendar
		</p>
	</div>

	<div class="flex flex-col gap-1">
		<label for="tc-scale" class="text-xs font-medium text-gray-600">
			Scale (real years per custom year)
		</label>
		<input
			id="tc-scale"
			type="number"
			step="0.01"
			min="0.01"
			bind:value={scale}
			required
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		/>
		<p class="text-[10px] text-gray-400">
			How many real years pass per 1 year in your calendar (1 = same speed)
		</p>
	</div>

	<div class="flex flex-col gap-1">
		<p class="text-xs font-medium text-gray-600">Date Precision</p>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={() => (precision = 'year')}
				class="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors {precision ===
				'year'
					? 'border-blue-500 bg-blue-50 text-blue-700'
					: 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
			>
				Year only
			</button>
			<button
				type="button"
				onclick={() => (precision = 'date')}
				class="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors {precision ===
				'date'
					? 'border-blue-500 bg-blue-50 text-blue-700'
					: 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
			>
				Year + Month + Day
			</button>
		</div>
		<p class="text-[10px] text-gray-400">
			{precision === 'year'
				? 'Dates will only use years (e.g. 5000). Months and days are ignored.'
				: 'Dates use full precision (e.g. 5000-03-15).'}
		</p>
	</div>

	<div class="rounded-lg bg-gray-50 p-2">
		<p class="mb-1 text-[10px] font-medium text-gray-500 uppercase">Preview</p>
		<div class="flex flex-col gap-0.5">
			{#each preview() as row}
				<div class="flex justify-between text-[11px]">
					<span class="text-gray-600">{row.label}</span>
					<span class="font-mono text-gray-900">= year {row.real}</span>
				</div>
			{/each}
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
			Save
		</button>
	</div>
</form>
