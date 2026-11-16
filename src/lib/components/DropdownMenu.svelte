<script lang="ts">
	import type { Component } from 'svelte';
	import { ChevronDown } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import Dropdown from '$lib/sveltlana/components/Dropdown';

	type Props = {
		triggerLabel: string;
		triggerIcon: Component;
		items: Array<{
			icon: Component;
			label: string;
			onclick: () => void;
		}>;
	};

	let { triggerLabel, triggerIcon: TriggerIcon, items }: Props = $props();
</script>

<Dropdown>
	<Dropdown.Trigger class="ui-btn">
		<TriggerIcon size={14} />
		{triggerLabel}
		<ChevronDown size={12} />
	</Dropdown.Trigger>
	<Dropdown.Content
		transition={fade}
		class="w-48 rounded-lg border border-black/10 bg-white/90 py-1 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95"
	>
		{#each items as item (item.label)}
			<Dropdown.Item
				onselect={item.onclick}
				class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5"
			>
				<item.icon size={14} />
				{item.label}
			</Dropdown.Item>
		{/each}
	</Dropdown.Content>
</Dropdown>
