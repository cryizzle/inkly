<script lang="ts">
	import Pagination from '$lib/components/Pagination.svelte';
	import type { RewardCompletion, RewardMilestoneProgress } from '$lib/types';

	const PAGE_SIZE = 10;

	let {
		data
	}: {
		data: {
			milestones: RewardMilestoneProgress[];
			activePage: number;
			earnedPage: number;
			completionPage: number;
			completions: (RewardCompletion & { milestoneTitle: string; rewardEur: number | null })[];
		};
	} = $props();

	let editingId = $state<number | null>(null);
	let showEarned = $state(false);
	let showCreateModal = $state(false);

	const activeMilestones = $derived(
		data.milestones.filter((milestone) => milestone.isRepeatable || milestone.status !== 'earned')
	);
	const earnedMilestones = $derived(
		data.milestones
			.filter((milestone) => !milestone.isRepeatable && milestone.status === 'earned')
			.sort((left, right) => {
				const leftDate = left.latestCompletion ?? left.completedAt;
				const rightDate = right.latestCompletion ?? right.completedAt;
				if (!leftDate && !rightDate) return 0;
				if (!leftDate) return 1;
				if (!rightDate) return -1;
				return rightDate.localeCompare(leftDate);
			})
	);
	const activeTotalPages = $derived(Math.max(1, Math.ceil(activeMilestones.length / PAGE_SIZE)));
	const currentActivePage = $derived(Math.min(data.activePage, activeTotalPages));
	const paginatedActiveMilestones = $derived(
		activeMilestones.slice((currentActivePage - 1) * PAGE_SIZE, currentActivePage * PAGE_SIZE)
	);
	const earnedTotalPages = $derived(Math.max(1, Math.ceil(earnedMilestones.length / PAGE_SIZE)));
	const currentEarnedPage = $derived(Math.min(data.earnedPage, earnedTotalPages));
	const paginatedEarnedMilestones = $derived(
		earnedMilestones.slice((currentEarnedPage - 1) * PAGE_SIZE, currentEarnedPage * PAGE_SIZE)
	);
	const completionTotalPages = $derived(Math.max(1, Math.ceil(data.completions.length / PAGE_SIZE)));
	const currentCompletionPage = $derived(Math.min(data.completionPage, completionTotalPages));
	const paginatedCompletions = $derived(
		data.completions.slice((currentCompletionPage - 1) * PAGE_SIZE, currentCompletionPage * PAGE_SIZE)
	);

	const metricOptions = [
		{ value: 'manual', label: 'Manual' },
		{ value: 'editing_streak', label: 'Editing streak' },
		{ value: 'editing_days_in_cycle', label: 'Editing days in cycle' },
		{ value: 'cumulative_abs_words', label: 'Cumulative words changed' },
		{ value: 'books_finished', label: 'Books finished' },
		{ value: 'novels_in_cycle', label: 'Novels in cycle' }
	];
</script>

<section class="stack">
	<div class="section-title">
		<h1 class="display" style="margin: 0;">Reward Milestones</h1>
	</div>

	<section class="card" style="padding: 1.25rem;">
		<div class="section-title">
			<h2 class="display" style="margin: 0;">Active milestones</h2>
			<div class="muted">{activeMilestones.length} visible</div>
		</div>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Status</th>
						<th>Milestone</th>
						<th>Progress</th>
						<th>Reward</th>
						<th style="width: 4rem;">Complete</th>
						<th style="width: 4rem;">Edit</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedActiveMilestones as milestone}
						<tr>
							<td>
								<span class={`status-pill ${milestone.status === 'earned' ? 'complete' : milestone.kind === 'manual' ? 'manual' : 'pending'}`}>
									{milestone.isRepeatable ? 'repeatable' : milestone.status}
								</span>
							</td>
							<td>
								<div class="display" style="font-size: 1.2rem;">{milestone.title}</div>
								<div class="muted">{milestone.category}</div>
							</td>
							<td>
								<div>{milestone.progressLabel}</div>
								{#if milestone.latestCompletion}
									<div class="muted">Latest: {milestone.latestCompletion}</div>
								{/if}
								{#if milestone.isRepeatable}
									<div class="muted">{milestone.completionCount} completions</div>
								{/if}
							</td>
							<td>EUR {milestone.rewardEur}</td>
							<td>
								{#if milestone.kind === 'manual' && !milestone.isRepeatable}
									<form method="POST" action="?/toggleManual">
										<input type="hidden" name="id" value={milestone.id} />
										<input type="hidden" name="completedAt" value={milestone.completedAt ?? ''} />
										<input type="hidden" name="shouldComplete" value="true" />
										<button class="button subtle" type="submit" aria-label="Mark complete">&#10003;</button>
									</form>
								{/if}
							</td>
							<td>
								<button class="button subtle" type="button" onclick={() => (editingId = editingId === milestone.id ? null : milestone.id)}>
									&#9998;
								</button>
							</td>
						</tr>
						{#if editingId === milestone.id}
							<tr>
								<td colspan="6" style="background: rgba(138, 90, 46, 0.05);">
									<form id={`reward-update-${milestone.id}`} method="POST" action="?/update" class="stack">
											<input type="hidden" name="id" value={milestone.id} />
											<input type="hidden" name="kind" value={milestone.kind} />
											<input type="hidden" name="metricType" value={milestone.metricType} />
											<input type="hidden" name="isRepeatable" value={String(milestone.isRepeatable)} />
											<label><span class="eyebrow">Title</span><input name="title" value={milestone.title} /></label>
											<label><span class="eyebrow">Category</span><input name="category" value={milestone.category} /></label>
											<label><span class="eyebrow">Reward</span><input name="rewardEur" type="number" step="0.01" value={milestone.rewardEur} /></label>
											<label><span class="eyebrow">Target</span><input name="targetValue" type="number" value={milestone.targetValue ?? ''} /></label>
									</form>
									<form id={`reward-delete-${milestone.id}`} method="POST" action="?/delete">
										<input type="hidden" name="id" value={milestone.id} />
									</form>
									<div class="button-row" style="justify-content: flex-end; margin-top: 1rem;">
										<button class="button" type="submit" form={`reward-update-${milestone.id}`}>Save</button>
										<button class="button" type="submit" form={`reward-delete-${milestone.id}`}>Delete milestone</button>
										<button class="button subtle" type="button" onclick={() => (editingId = null)}>Close</button>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
		<Pagination currentPage={currentActivePage} totalPages={activeTotalPages} paramName="activePage" preserve={{ earnedPage: String(currentEarnedPage) }} />
		<div class="button-row" style="justify-content: flex-end; margin-top: 1rem;">
			<button class="button primary" type="button" onclick={() => (showCreateModal = true)}>Add milestone</button>
		</div>
	</section>

	<section class="card" style="padding: 1.25rem;">
		<div class="section-title">
			<h2 class="display" style="margin: 0;">Completed milestones</h2>
			<button class="button subtle" type="button" onclick={() => (showEarned = !showEarned)}>
				{showEarned ? 'Hide milestones' : 'Show milestones'}
			</button>
		</div>
		{#if showEarned}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Status</th>
							<th>Milestone</th>
							<th>Progress</th>
							<th>Reward</th>
							<th style="width: 4rem;">Edit</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedEarnedMilestones as milestone}
							<tr>
								<td>
									<span class="status-pill complete">{milestone.status}</span>
								</td>
								<td>
									<div class="display" style="font-size: 1.2rem;">{milestone.title}</div>
									<div class="muted">{milestone.category}</div>
								</td>
								<td>
									<div>{milestone.progressLabel}</div>
									{#if milestone.latestCompletion}
										<div class="muted">Latest: {milestone.latestCompletion}</div>
									{/if}
									{#if milestone.isRepeatable}
										<div class="muted">{milestone.completionCount} completions</div>
									{/if}
								</td>
								<td>EUR {milestone.rewardEur}</td>
								<td>
									<button class="button subtle" type="button" onclick={() => (editingId = editingId === milestone.id ? null : milestone.id)}>
										&#9998;
									</button>
								</td>
							</tr>
							{#if editingId === milestone.id}
								<tr>
									<td colspan="5" style="background: rgba(138, 90, 46, 0.05);">
										<form id={`reward-update-${milestone.id}`} method="POST" action="?/update" class="stack">
											<input type="hidden" name="id" value={milestone.id} />
											<input type="hidden" name="kind" value={milestone.kind} />
											<input type="hidden" name="metricType" value={milestone.metricType} />
											<input type="hidden" name="isRepeatable" value={String(milestone.isRepeatable)} />
											<label><span class="eyebrow">Title</span><input name="title" value={milestone.title} /></label>
											<label><span class="eyebrow">Category</span><input name="category" value={milestone.category} /></label>
											<label><span class="eyebrow">Reward</span><input name="rewardEur" type="number" step="0.01" value={milestone.rewardEur} /></label>
											<label><span class="eyebrow">Target</span><input name="targetValue" type="number" value={milestone.targetValue ?? ''} /></label>
										</form>
										<form id={`reward-delete-${milestone.id}`} method="POST" action="?/delete">
											<input type="hidden" name="id" value={milestone.id} />
										</form>
										{#if milestone.kind === 'manual'}
											<form id={`reward-toggle-${milestone.id}`} method="POST" action="?/toggleManual">
												<input type="hidden" name="id" value={milestone.id} />
												<input type="hidden" name="completedAt" value={milestone.completedAt ?? ''} />
												<input type="hidden" name="shouldComplete" value={milestone.status === 'earned' ? 'false' : 'true'} />
											</form>
										{/if}
										<div class="button-row" style="justify-content: flex-end; margin-top: 1rem;">
											<button class="button" type="submit" form={`reward-update-${milestone.id}`}>Save</button>
											{#if milestone.kind === 'manual'}
												<button class="button subtle" type="submit" form={`reward-toggle-${milestone.id}`}>
													Mark pending
												</button>
											{/if}
											<button class="button" type="submit" form={`reward-delete-${milestone.id}`}>Delete milestone</button>
											<button class="button subtle" type="button" onclick={() => (editingId = null)}>Close</button>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
			<Pagination currentPage={currentEarnedPage} totalPages={earnedTotalPages} paramName="earnedPage" preserve={{ activePage: String(currentActivePage) }} />
		{:else}
			<div class="empty-state">Completed milestones are tucked away here until you want to review them.</div>
		{/if}
	</section>

	<section class="card" style="padding: 1.25rem;">
		<h2 class="display" style="margin-top: 0;">Completion history</h2>
		{#if data.completions.length}
			<div class="table-wrap">
				<table>
					<thead>
						<tr><th>Milestone</th><th>Reward</th><th>Date</th><th>Source</th><th>Window</th></tr>
					</thead>
					<tbody>
						{#each paginatedCompletions as completion}
							<tr>
								<td>{completion.milestoneTitle}</td>
								<td>{completion.rewardEur === null ? '-' : `EUR ${completion.rewardEur}`}</td>
								<td>{completion.completedAt}</td>
								<td>{completion.sourceType}</td>
								<td>{completion.periodStart ?? '-'} to {completion.periodEnd ?? '-'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<Pagination
				currentPage={currentCompletionPage}
				totalPages={completionTotalPages}
				paramName="completionPage"
				preserve={{ activePage: String(currentActivePage), earnedPage: String(currentEarnedPage) }}
			/>
		{:else}
			<div class="empty-state">Auto-earned rewards will appear here as you log progress.</div>
		{/if}
	</section>

	{#if showCreateModal}
		<div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (showCreateModal = false)}>
			<section class="card modal-card">
				<div class="section-title">
					<h2 class="display" style="margin: 0;">Add a milestone</h2>
					<button class="button subtle" type="button" onclick={() => (showCreateModal = false)}>Close</button>
				</div>
				<form method="POST" action="?/create" class="stack">
					<div class="field-grid">
						<label class="span-3"><span class="eyebrow">Category</span><input name="category" required /></label>
						<label class="span-6"><span class="eyebrow">Title</span><input name="title" required /></label>
						<label class="span-3"><span class="eyebrow">Reward (EUR)</span><input name="rewardEur" type="number" min="0" step="0.01" required /></label>
						<label class="span-3"><span class="eyebrow">Kind</span><select name="kind"><option value="manual">Manual</option><option value="auto">Auto</option></select></label>
						<label class="span-3"><span class="eyebrow">Metric</span><select name="metricType">{#each metricOptions as option}<option value={option.value}>{option.label}</option>{/each}</select></label>
						<label class="span-3"><span class="eyebrow">Target value</span><input name="targetValue" type="number" min="0" /></label>
						<label class="span-3"><span class="eyebrow">Repeatable</span><select name="isRepeatable"><option value="false">No</option><option value="true">Yes</option></select></label>
					</div>
					<div class="button-row" style="justify-content: flex-end;">
						<button class="button subtle" type="button" onclick={() => (showCreateModal = false)}>Cancel</button>
						<button class="button primary" type="submit">Add milestone</button>
					</div>
				</form>
			</section>
		</div>
	{/if}
</section>
