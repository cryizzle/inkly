<script lang="ts">
	import LineChart from '$lib/components/LineChart.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import ProgressCard from '$lib/components/ProgressCard.svelte';
	import type { WritingStats } from '$lib/types';

	const PAGE_SIZE = 10;

	let { data }: { data: { stats: WritingStats; sort: 'asc' | 'desc'; page: number; today: string } } = $props();
	let editingId = $state<number | null>(null);
	let period = $state<'month' | 'all'>('month');
	const nextSort = $derived(data.sort === 'desc' ? 'asc' : 'desc');

	const filteredEntries = $derived.by(() => {
		if (period === 'all') {
			return data.stats.entries;
		}

		const latestDate = data.stats.entries.at(-1)?.date;
		if (!latestDate) {
			return [];
		}

		const latestTime = new Date(`${latestDate}T00:00:00Z`).getTime();
		const monthAgo = latestTime - 29 * 24 * 60 * 60 * 1000;

		return data.stats.entries.filter((entry) => {
			const entryTime = new Date(`${entry.date}T00:00:00Z`).getTime();
			return entryTime >= monthAgo;
		});
	});

	const wordCounts = $derived(filteredEntries.map((entry) => entry.endingWordCount));
	const diffs = $derived(filteredEntries.map((entry) => entry.diffAbs));
	const xStartLabel = $derived(filteredEntries.at(0)?.date ?? '');
	const xEndLabel = $derived(filteredEntries.at(-1)?.date ?? '');
	const sortedEntries = $derived(
		[...data.stats.entries].sort((a, b) =>
			data.sort === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
		)
	);
	const totalPages = $derived(Math.max(1, Math.ceil(sortedEntries.length / PAGE_SIZE)));
	const currentPage = $derived(Math.min(data.page, totalPages));
	const paginatedEntries = $derived(
		sortedEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
	);
</script>

<section class="stack">
	<div class="section-title">
		<h1 class="display" style="margin: 0;">Manuscript Progress</h1>
	</div>

	<section class="card" style="padding: 1.25rem;">
		<h2 class="display" style="margin-top: 0;">Log progress</h2>
		<form method="POST" action="?/create" class="stack">
			<div class="field-grid" style="align-items: end;">
				<label class="span-3"><span class="eyebrow">Date</span><input name="date" type="date" value={data.today} required /></label>
				<label class="span-4"
					><span class="eyebrow">Ending word count</span><input name="endingWordCount" type="number" min="0" value={data.stats.currentEndingWordCount} required /></label
				>
				<div class="span-5">
					<div class="button-row" style="justify-content: flex-end;">
						<button class="button primary" type="submit">Save entry</button>
					</div>
				</div>
			</div>
		</form>
	</section>

	<div class="grid three">
		<MetricCard label="Current count" value={data.stats.currentEndingWordCount.toLocaleString()} />
		<MetricCard
			label="Current streak"
			value={`${data.stats.currentStreak} ${data.stats.currentStreak === 1 ? 'day' : 'days'}`}
		/>
		<MetricCard label="Cumulative change" value={data.stats.cumulativeAbsWords.toLocaleString()} />
	</div>

	<section class="card" style="padding: 1.2rem;">
		<div class="section-title">
			<h2 class="display" style="margin: 0;">Monthly achievements</h2>
		</div>
		<ProgressCard
			title="Writing"
			current={data.stats.cycle.currentCount}
			target={data.stats.cycle.target}
			startDate={data.stats.cycle.startDate}
			endDate={data.stats.cycle.endDate}
		/>
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
				values={wordCounts}
				label="Ending word count"
				yAxisLabel="Words"
				xStartLabel={xStartLabel}
				xEndLabel={xEndLabel}
			/>
		<LineChart
			values={diffs}
			label="Daily change"
			yAxisLabel="Words changed"
			xStartLabel={xStartLabel}
			xEndLabel={xEndLabel}
				color="#58724d"
				fill="rgba(88, 114, 77, 0.14)"
			/>
		</div>
	</section>

	<section class="card" style="padding: 1.25rem;">
		<div class="section-title">
			<h2 class="display" style="margin: 0;">Writing log</h2>
			<div class="muted">{sortedEntries.length} entries</div>
		</div>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th><a href={`/writing?sort=${nextSort}&page=${currentPage}`}>Date {data.sort === 'desc' ? '↓' : '↑'}</a></th>
						<th>Starting</th>
						<th>Ending</th>
						<th>Diff</th>
						<th>Abs</th>
						<th>Cumulative</th>
						<th>Streak</th>
						<th style="width: 4rem;">Edit</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedEntries as entry}
						<tr>
							<td>{entry.date}</td>
							<td>{entry.startingWordCount?.toLocaleString() ?? '-'}</td>
							<td>{entry.endingWordCount.toLocaleString()}</td>
							<td>{entry.diff.toLocaleString()}</td>
							<td>{entry.diffAbs.toLocaleString()}</td>
							<td>{entry.cumulativeAbs.toLocaleString()}</td>
							<td>{entry.editingStreak}</td>
							<td>
								<button class="button subtle" type="button" onclick={() => (editingId = editingId === entry.id ? null : entry.id)}>
									&#9998;
								</button>
							</td>
						</tr>
						{#if editingId === entry.id}
							<tr>
								<td colspan="8" style="background: rgba(138, 90, 46, 0.05);">
									<form id={`writing-update-${entry.id}`} method="POST" action="?/update" class="stack">
										<input type="hidden" name="id" value={entry.id} />
										<div class="field-grid" style="align-items: end;">
											<label class="span-3"
												><span class="eyebrow">Date</span><input name="date" type="date" value={entry.date} /></label
											>
											<label class="span-4"
												><span class="eyebrow">Ending word count</span><input name="endingWordCount" type="number" value={entry.endingWordCount} /></label
											>
											<div class="span-5">
												<div class="button-row" style="justify-content: flex-end;">
													<button class="button" type="submit" form={`writing-update-${entry.id}`}>Save</button>
													<button class="button" type="submit" form={`writing-delete-${entry.id}`}>Delete entry</button>
													<button class="button subtle" type="button" onclick={() => (editingId = null)}>Close</button>
												</div>
											</div>
										</div>
									</form>
									<form id={`writing-delete-${entry.id}`} method="POST" action="?/delete">
										<input type="hidden" name="id" value={entry.id} />
									</form>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
		<Pagination currentPage={currentPage} totalPages={totalPages} preserve={{ sort: data.sort }} />
	</section>
</section>
