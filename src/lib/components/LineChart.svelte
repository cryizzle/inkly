<script lang="ts">
	let {
		values,
		label,
		yAxisLabel,
		xStartLabel = '',
		xEndLabel = '',
		color = '#8a5a2e',
		fill = 'rgba(138, 90, 46, 0.12)'
	}: {
		values: number[];
		label: string;
		yAxisLabel: string;
		xStartLabel?: string;
		xEndLabel?: string;
		color?: string;
		fill?: string;
	} = $props();

	const width = 640;
	const height = 220;
	const padding = 28;

	const min = $derived(values.length ? Math.min(...values) : 0);
	const max = $derived(values.length ? Math.max(...values) : 1);
	const range = $derived(Math.max(1, max - min));
	const points = $derived(
		values.map((value, index) => {
			const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
			const y = height - padding - ((value - min) / range) * (height - padding * 2);
			return `${x},${y}`;
		})
	);
	const area = $derived(
		values.length
			? [`${padding},${height - padding}`, ...points, `${width - padding},${height - padding}`].join(' ')
			: ''
	);
</script>

<div class="card" style="padding: 1rem;">
	<div class="section-title" style="margin-bottom: 0.7rem;">
		<div class="eyebrow">{label}</div>
		<div class="muted" style="font-family: var(--font-ui); font-size: 0.85rem;">{yAxisLabel}</div>
	</div>
	{#if values.length}
		<svg viewBox={`0 0 ${width} ${height}`} class="chart" role="img" aria-label={label}>
			<line
				x1={padding}
				y1={padding}
				x2={padding}
				y2={height - padding}
				stroke="rgba(97, 70, 35, 0.15)"
				stroke-width="1"
			/>
			<line
				x1={padding}
				y1={height - padding}
				x2={width - padding}
				y2={height - padding}
				stroke="rgba(97, 70, 35, 0.15)"
				stroke-width="1"
			/>
			<polygon points={area} fill={fill}></polygon>
			<polyline
				points={points.join(' ')}
				fill="none"
				stroke={color}
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			></polyline>
		</svg>
		<div
			style="display: grid; grid-template-columns: auto 1fr auto; gap: 0.7rem; align-items: center; font-family: var(--font-ui); font-size: 0.82rem; color: var(--ink-soft);"
		>
			<span>{xStartLabel}</span>
			<div style="display: flex; justify-content: center; gap: 0.8rem;">
				<span>Min {min.toLocaleString()}</span>
				<span>Max {max.toLocaleString()}</span>
			</div>
			<span>{xEndLabel}</span>
		</div>
	{:else}
		<div class="empty-state">No data yet.</div>
	{/if}
</div>
