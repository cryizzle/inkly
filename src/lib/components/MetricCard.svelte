<script lang="ts">
	let {
		label,
		value,
		detail
	}: {
		label: string;
		value: string;
		detail?: string;
	} = $props();
</script>

<article class="card" style="padding: 1.2rem;">
	<div class="eyebrow">{label}</div>
	<div class="metric-value">{value}</div>
	{#if detail}
		<p class="muted" style="margin-bottom: 0;">{detail}</p>
	{/if}
</article>
