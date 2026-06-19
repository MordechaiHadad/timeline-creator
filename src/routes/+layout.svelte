<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Timeline Creator</title>
</svelte:head>
{@render children()}
