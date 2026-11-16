<script lang="ts">
	import './layout.css';
	import { browser } from '$app/environment';
	import { theme } from '$lib/state/theme.svelte';

	let { children } = $props();

	if (browser) theme.init();
</script>

<svelte:head>
	<title>Timeline Creator</title>
</svelte:head>
{@render children()}
