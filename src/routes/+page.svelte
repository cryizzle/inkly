<script lang="ts">
	import LineChart from '$lib/components/LineChart.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import ProgressCard from '$lib/components/ProgressCard.svelte';
	import type { DashboardSummary } from '$lib/types';

	let { data }: { data: { summary: DashboardSummary } } = $props();
	let period = $state<'month' | 'all'>('month');

	const filteredWritingEntries = $derived.by(() => {
		if (period === 'all') {
			return data.summary.writing.entries;
		}

		const latestDate = data.summary.writing.entries.at(-1)?.date;
		if (!latestDate) {
			return [];
		}

		const latestTime = new Date(`${latestDate}T00:00:00Z`).getTime();
		const monthAgo = latestTime - 29 * 24 * 60 * 60 * 1000;

		return data.summary.writing.entries.filter((entry) => {
			const entryTime = new Date(`${entry.date}T00:00:00Z`).getTime();
			return entryTime >= monthAgo;
		});
	});

	const writingCounts = $derived(filteredWritingEntries.map((entry) => entry.endingWordCount));
	const writingDiffs = $derived(filteredWritingEntries.map((entry) => entry.diffAbs));
	const xStartLabel = $derived(filteredWritingEntries.at(0)?.date ?? '');
	const xEndLabel = $derived(filteredWritingEntries.at(-1)?.date ?? '');
</script>

<section class="stack">
	<div class="grid four">
		<MetricCard
			label="Current Word Count"
			value={data.summary.writing.currentEndingWordCount.toLocaleString()}
			detail={`${data.summary.writing.totalEditingDays} logged writing days`}
		/>
		<MetricCard
			label="Editing Streak"
			value={`${data.summary.writing.currentStreak} ${data.summary.writing.currentStreak === 1 ? 'day' : 'days'}`}
			detail={`${data.summary.writing.cumulativeAbsWords.toLocaleString()} cumulative words changed`}
		/>
		<MetricCard
			label="Completed Books"
			value={String(data.summary.reading.completedBooks)}
			detail={`${data.summary.reading.entries.filter((entry) => entry.verifiedComp).length} verified comps`}
		/>
		<MetricCard
			label="Rewards Earned"
			value={`EUR ${data.summary.rewards.totalEarnedValue.toLocaleString()}`}
			detail={`${data.summary.rewards.completedMilestones} milestones completed`}
		/>
	</div>

	<section class="card" style="padding: 1.2rem;">
		<div class="section-title">
			<h2 class="display" style="margin: 0;">Monthly achievements</h2>
		</div>
		<div class="grid two">
			<ProgressCard
				title="Writing"
				current={data.summary.writing.cycle.currentCount}
				target={data.summary.writing.cycle.target}
				startDate={data.summary.writing.cycle.startDate}
				endDate={data.summary.writing.cycle.endDate}
			/>
			<ProgressCard
				title="Reading"
				current={data.summary.reading.currentReadingCycle.currentCount}
				target={data.summary.reading.currentReadingCycle.target}
				startDate={data.summary.reading.currentReadingCycle.startDate}
				endDate={data.summary.reading.currentReadingCycle.endDate}
			/>
		</div>
	</section>

	<section class="card" style="padding: 1.2rem;">
		<div class="section-title">
			<h2 class="display" style="margin: 0;">Writing graphs</h2>
			<div class="button-row">
				<button class={`button ${period === 'month' ? 'primary' : 'subtle'}`} type="button" onclick={() => (period = 'month')}>
					Last month
				</button>
				<button class={`button ${period === 'all' ? 'primary' : 'subtle'}`} type="button" onclick={() => (period = 'all')}>
					All time
				</button>
			</div>
		</div>
		<div class="grid two">
			<LineChart
				values={writingCounts}
				label="Ending word count"
				yAxisLabel="Words"
				xStartLabel={xStartLabel}
				xEndLabel={xEndLabel}
			/>
			<LineChart
				values={writingDiffs}
				label="Daily change"
				yAxisLabel="Words changed"
				xStartLabel={xStartLabel}
				xEndLabel={xEndLabel}
				color="#58724d"
				fill="rgba(88, 114, 77, 0.14)"
			/>
		</div>
	</section>

	<section class="card" style="padding: 1.2rem;">
		<div class="section-title">
			<h2 class="display" style="margin: 0;">Recent reward completions</h2>
		</div>
		{#if data.summary.rewards.recentCompletions.length}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Milestone</th>
							<th>Reward</th>
							<th>Date</th>
						</tr>
					</thead>
					<tbody>
				{#each data.summary.rewards.recentCompletions as completion}
						<tr>
							<td>{completion.milestoneTitle}</td>
							<td>{completion.rewardEur === null ? '-' : `EUR ${completion.rewardEur}`}</td>
							<td>{completion.completedAt}</td>
						</tr>
				{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="empty-state">No reward completions yet.</div>
		{/if}
	</section>
</section>
