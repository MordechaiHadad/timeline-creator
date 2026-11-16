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

	let name = $state('');
	let epoch = $state(0);
	let scale = $state(1);
	let precision = $state<'year' | 'date'>('date');

	$effect(() => {
		name = config.name;
		epoch = config.epoch;
		scale = config.scale;
		precision = config.precision;
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		onSubmit({ name, epoch, scale, precision });
	}

	let preview = $derived.by(() => {
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
	<h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Time Configuration</h3>

	<div class="flex flex-col gap-1">
		<label for="tc-name" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
			Calendar Name
		</label>
		<input
			id="tc-name"
			type="text"
			bind:value={name}
			required
			placeholder="e.g. MDW, Star Date, etc."
			class="ui-field"
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="tc-epoch" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
			Epoch (real year = custom year 0)
		</label>
		<input id="tc-epoch" type="number" bind:value={epoch} required class="ui-field" />
		<p class="text-[10px] text-zinc-400 dark:text-zinc-500">
			The real-world year that corresponds to year 0 in your calendar
		</p>
	</div>

	<div class="flex flex-col gap-1">
		<label for="tc-scale" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
			Scale (real years per custom year)
		</label>
		<input
			id="tc-scale"
			type="number"
			step="0.01"
			min="0.01"
			bind:value={scale}
			required
			class="ui-field"
		/>
		<p class="text-[10px] text-zinc-400 dark:text-zinc-500">
			How many real years pass per 1 year in your calendar (1 = same speed)
		</p>
	</div>

	<div class="flex flex-col gap-1">
		<p class="text-xs font-medium text-zinc-600 dark:text-zinc-400">Date Precision</p>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={() => (precision = 'year')}
				class="ui-btn flex-1 {precision === 'year'
					? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:border-indigo-400/40 dark:bg-indigo-400/15 dark:text-indigo-300'
					: ''}"
			>
				Year only
			</button>
			<button
				type="button"
				onclick={() => (precision = 'date')}
				class="ui-btn flex-1 {precision === 'date'
					? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:border-indigo-400/40 dark:bg-indigo-400/15 dark:text-indigo-300'
					: ''}"
			>
				Year + Month + Day
			</button>
		</div>
		<p class="text-[10px] text-zinc-400 dark:text-zinc-500">
			{precision === 'year'
				? 'Dates will only use years (e.g. 5000). Months and days are ignored.'
				: 'Dates use full precision (e.g. 5000-03-15).'}
		</p>
	</div>

	<div
		class="rounded-md border border-black/10 bg-black/5 p-2 dark:border-white/10 dark:bg-white/5"
	>
		<p
			class="mb-1 text-[10px] font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
		>
			Preview
		</p>
		<div class="flex flex-col gap-0.5">
			{#each preview as row (row.label)}
				<div class="flex justify-between text-[11px]">
					<span class="text-zinc-600 dark:text-zinc-400">{row.label}</span>
					<span class="font-mono text-zinc-900 dark:text-zinc-100">= year {row.real}</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="flex justify-end gap-2">
		<button type="button" onclick={onCancel} class="ui-btn">Cancel</button>
		<button type="submit" class="ui-btn-primary">Save</button>
	</div>
</form>
