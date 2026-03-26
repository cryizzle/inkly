<script lang="ts">
	let {
		title,
		current,
		target,
		startDate,
		endDate
	}: {
		title: string;
		current: number;
		target: number;
		startDate: string | null;
		endDate: string | null;
	} = $props();

	const progress = $derived(target ? Math.min(100, Math.round((current / target) * 100)) : 0);
</script>

<article class="card" style="padding: 1.2rem;">
	<div class="section-title" style="margin-bottom: 0.6rem;">
		<div>
			<div class="eyebrow">
				{#if startDate && endDate}
					{startDate} to {endDate}
				{:else}
					No cycle started yet
				{/if}
			</div>
			<h3 class="display" style="margin: 0.2rem 0 0;">{title}</h3>
		</div>
		<div class="status-pill pending">{current}/{target}</div>
	</div>
	<div
		style={`height: 12px; border-radius: 999px; background:
			repeating-linear-gradient(
				90deg,
				rgba(138, 90, 46, 0.08) 0%,
				rgba(138, 90, 46, 0.08) calc(${100 / Math.max(target, 1)}% - 1px),
				rgba(97, 70, 35, 0.18) calc(${100 / Math.max(target, 1)}% - 1px),
				rgba(97, 70, 35, 0.18) ${100 / Math.max(target, 1)}%
			);
			overflow: hidden;`}
	>
		<div
			style={`height: 100%; width: ${progress}%; background: linear-gradient(90deg, #8a5a2e, #b27a3c);`}
		></div>
	</div>
</article>
