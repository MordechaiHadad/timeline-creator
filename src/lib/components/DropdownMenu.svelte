<script lang="ts">
	import type { Component } from 'svelte';
	import { ChevronDown } from '@lucide/svelte';
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
	<Dropdown.Trigger
		class="flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
	>
		<TriggerIcon size={14} />
		{triggerLabel}
		<ChevronDown size={12} />
	</Dropdown.Trigger>
	<Dropdown.Content class="w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
		{#each items as item (item.label)}
			<Dropdown.Item
				onselect={item.onclick}
				class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
			>
				<item.icon size={14} />
				{item.label}
			</Dropdown.Item>
		{/each}
	</Dropdown.Content>
</Dropdown>
