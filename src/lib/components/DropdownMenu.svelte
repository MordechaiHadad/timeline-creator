<script lang="ts">
	import type { Component } from 'svelte';
	import { Check, ChevronDown } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import Dropdown from '$lib/sveltlana/components/Dropdown';

	type Props = {
		triggerLabel: string;
		triggerIcon: Component;
		items: Array<{
			icon: Component;
			label: string;
			onclick: () => void;
			section?: string;
			active?: boolean;
		}>;
	};

	let { triggerLabel, triggerIcon: TriggerIcon, items }: Props = $props();
</script>

<Dropdown>
	<Dropdown.Trigger class="ui-btn">
		<TriggerIcon size={14} />
		{#if triggerLabel}
			{triggerLabel}
			<ChevronDown size={12} />
		{:else}
			<span class="sr-only">Open menu</span>
		{/if}
	</Dropdown.Trigger>
	<Dropdown.Content
		transition={fade}
		class="w-48 rounded-lg border border-black/10 bg-white/90 py-1 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95"
	>
		{#each items as item, index (item.label)}
			{#if item.section && (index === 0 || item.section !== items[index - 1].section)}
				{#if index > 0}
					<div role="separator" class="my-1 border-t border-black/10 dark:border-white/10"></div>
				{/if}
				<p
					class="px-3 py-1 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500"
				>
					{item.section}
				</p>
			{/if}
			<Dropdown.Item
				onselect={item.onclick}
				ariaPressed={item.active}
				class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5 {item.active
					? 'bg-black/5 font-medium text-zinc-900 dark:bg-white/10 dark:text-zinc-100'
					: ''}"
			>
				<item.icon size={14} />
				<span class="flex-1">{item.label}</span>
				{#if item.active}<Check size={12} />{/if}
			</Dropdown.Item>
		{/each}
	</Dropdown.Content>
</Dropdown>
