<script lang="ts">
	import MetricCard from '$lib/components/MetricCard.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import ProgressCard from '$lib/components/ProgressCard.svelte';
	import type { ReadingStats } from '$lib/types';

	const PAGE_SIZE = 10;

	let {
		data
	}: {
		data: { stats: ReadingStats; sort: 'asc' | 'desc'; activePage: number; readPage: number; today: string };
	} = $props();
	let editingId = $state<number | null>(null);
	let expandedId = $state<number | null>(null);
	let showRead = $state(false);
	let showCreateModal = $state(false);
	const nextSort = $derived(data.sort === 'desc' ? 'asc' : 'desc');

	function sortDate(entry: ReadingStats['entries'][number]) {
		return entry.finishedAt ?? '';
	}

	const sortedEntries = $derived(
		[...data.stats.entries].sort((a, b) =>
			data.sort === 'asc'
				? sortDate(a).localeCompare(sortDate(b))
				: sortDate(b).localeCompare(sortDate(a))
		)
	);
	const activeEntries = $derived(
		[...data.stats.entries]
			.filter((entry) => entry.status !== 'Read')
			.sort((a, b) => {
				const rank = { Reading: 0, 'Want to Read': 1, DNF: 2, Read: 3 } as const;
				const rankDiff = rank[a.status] - rank[b.status];
				if (rankDiff !== 0) return rankDiff;
				return a.title.localeCompare(b.title);
			})
	);
	const readEntries = $derived(
		[...sortedEntries].filter((entry) => entry.status === 'Read')
	);
	const activeTotalPages = $derived(Math.max(1, Math.ceil(activeEntries.length / PAGE_SIZE)));
	const currentActivePage = $derived(Math.min(data.activePage, activeTotalPages));
	const paginatedActiveEntries = $derived(
		activeEntries.slice((currentActivePage - 1) * PAGE_SIZE, currentActivePage * PAGE_SIZE)
	);
	const readTotalPages = $derived(Math.max(1, Math.ceil(readEntries.length / PAGE_SIZE)));
	const currentReadPage = $derived(Math.min(data.readPage, readTotalPages));
	const paginatedReadEntries = $derived(
		readEntries.slice((currentReadPage - 1) * PAGE_SIZE, currentReadPage * PAGE_SIZE)
	);

	function statusClass(status: string) {
		if (status === 'Read') return 'complete';
		if (status === 'Reading') return 'reading';
		if (status === 'Want to Read') return 'want';
		if (status === 'DNF') return 'dnf';
		return '';
	}
</script>

<section class="stack">
	<div class="section-title">
		<h1 class="display" style="margin: 0;">Reading Progress</h1>
	</div>

	<div class="grid three">
		<MetricCard label="Completed books" value={String(data.stats.completedBooks)} />
		<MetricCard label="Verified comps" value={String(data.stats.entries.filter((entry) => entry.verifiedComp).length)} />
		<MetricCard label="Tracked titles" value={String(data.stats.entries.length)} />
	</div>

	<ProgressCard
		title="3 novels within 30 days"
		current={data.stats.currentReadingCycle.currentCount}
		target={data.stats.currentReadingCycle.target}
		startDate={data.stats.currentReadingCycle.startDate}
		endDate={data.stats.currentReadingCycle.endDate}
	/>

	<section class="card" style="padding: 1.25rem;">
		<div class="section-title">
			<h2 class="display" style="margin: 0;">Current reading list</h2>
			<div class="muted">{activeEntries.length} books</div>
		</div>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th style="width: 4rem;">Open</th>
						<th>Status</th>
						<th>Title</th>
						<th>Author</th>
						<th><a href={`/reading?sort=${nextSort}&activePage=${currentActivePage}&readPage=${currentReadPage}`}>Date {data.sort === 'desc' ? '↓' : '↑'}</a></th>
						<th style="width: 4rem;">Edit</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedActiveEntries as entry}
						<tr>
							<td>
								<button
									class="button subtle"
									type="button"
									onclick={() => (expandedId = expandedId === entry.id ? null : entry.id)}
								>
									{expandedId === entry.id ? '▾' : '▸'}
								</button>
							</td>
							<td><span class={`status-pill ${statusClass(entry.status)}`}>{entry.status}</span></td>
							<td>
								<div class="display" style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.4rem;">
									<span>{entry.title}</span>
									{#if entry.verifiedComp}
										<span title="Verified comp" aria-label="Verified comp">★</span>
									{/if}
								</div>
								<div class="muted">{entry.genreText}</div>
							</td>
							<td>{entry.author}</td>
							<td>
								{entry.finishedAt ?? '-'}
							</td>
							<td>
								<button class="button subtle" type="button" onclick={() => (editingId = editingId === entry.id ? null : entry.id)}>
									&#9998;
								</button>
							</td>
						</tr>
						{#if expandedId === entry.id}
							<tr>
								<td colspan="6" style="background: rgba(138, 90, 46, 0.05);">
									<div class="stack" style="padding: 0.3rem 0;">
										<div>
											<div class="eyebrow">Remarks</div>
											<div>{entry.remarks || '—'}</div>
										</div>
										<div>
											<div class="eyebrow">Similarities</div>
											<div>{entry.similarities || '—'}</div>
										</div>
										<div>
											<div class="eyebrow">Liked</div>
											<div>{entry.liked || '—'}</div>
										</div>
										<div>
											<div class="eyebrow">Disliked</div>
											<div>{entry.disliked || '—'}</div>
										</div>
									</div>
								</td>
							</tr>
						{/if}
						{#if editingId === entry.id}
							<tr>
								<td colspan="6" style="background: rgba(138, 90, 46, 0.05);">
									<form id={`reading-update-${entry.id}`} method="POST" action="?/update" class="stack">
										<input type="hidden" name="id" value={entry.id} />
										<div class="field-grid">
											<label class="span-9"><span class="eyebrow">Title</span><input name="title" value={entry.title} /></label>
											<label class="span-3"><span class="eyebrow">Author</span><input name="author" value={entry.author} /></label>
											<label class="span-3"><span class="eyebrow">Genre</span><input name="genreText" value={entry.genreText ?? ''} /></label>
											<label class="span-3"><span class="eyebrow">Status</span><select name="status"><option value="Want to Read" selected={entry.status === 'Want to Read'}>Want to Read</option><option value="Reading" selected={entry.status === 'Reading'}>Reading</option><option value="Read" selected={entry.status === 'Read'}>Read</option><option value="DNF" selected={entry.status === 'DNF'}>DNF</option></select></label>
											<label class="span-3"><span class="eyebrow">Finished date</span><input name="finishedAt" type="date" value={entry.finishedAt ?? ''} /></label>
											<label class="span-3"><span class="eyebrow">Verified comp</span><select name="verifiedComp"><option value="false" selected={!entry.verifiedComp}>No</option><option value="true" selected={entry.verifiedComp}>Yes</option></select></label>
											<label class="span-12"><span class="eyebrow">Remarks</span><textarea name="remarks">{entry.remarks ?? ''}</textarea></label>
											<label class="span-6"><span class="eyebrow">Similarities</span><textarea name="similarities">{entry.similarities ?? ''}</textarea></label>
											<label class="span-3"><span class="eyebrow">Liked</span><textarea name="liked">{entry.liked ?? ''}</textarea></label>
											<label class="span-3"><span class="eyebrow">Disliked</span><textarea name="disliked">{entry.disliked ?? ''}</textarea></label>
										</div>
									</form>
									<form id={`reading-delete-${entry.id}`} method="POST" action="?/delete">
										<input type="hidden" name="id" value={entry.id} />
									</form>
									<div class="button-row" style="justify-content: flex-end; margin-top: 1rem;">
										<button class="button" type="submit" form={`reading-update-${entry.id}`}>Save</button>
										<button class="button" type="submit" form={`reading-delete-${entry.id}`}>Delete book</button>
										<button class="button subtle" type="button" onclick={() => (editingId = null)}>Close</button>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
		<Pagination
			currentPage={currentActivePage}
			totalPages={activeTotalPages}
			paramName="activePage"
			preserve={{ sort: data.sort, readPage: String(currentReadPage) }}
		/>
		<div class="button-row" style="justify-content: flex-end; margin-top: 1rem;">
			<button class="button primary" type="button" onclick={() => (showCreateModal = true)}>Add book</button>
		</div>
	</section>

	<section class="card" style="padding: 1.25rem;">
		<div class="section-title">
			<h2 class="display" style="margin: 0;">Finished books</h2>
			<button class="button subtle" type="button" onclick={() => (showRead = !showRead)}>
				{showRead ? 'Hide books' : 'Show books'}
			</button>
		</div>
		{#if showRead}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th style="width: 4rem;">Open</th>
							<th>Status</th>
							<th>Title</th>
							<th>Author</th>
							<th><a href={`/reading?sort=${nextSort}&activePage=${currentActivePage}&readPage=${currentReadPage}`}>Date {data.sort === 'desc' ? '↓' : '↑'}</a></th>
							<th style="width: 4rem;">Edit</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedReadEntries as entry}
							<tr>
								<td>
									<button
										class="button subtle"
										type="button"
										onclick={() => (expandedId = expandedId === entry.id ? null : entry.id)}
									>
										{expandedId === entry.id ? '▾' : '▸'}
									</button>
								</td>
								<td><span class={`status-pill ${statusClass(entry.status)}`}>{entry.status}</span></td>
								<td>
									<div class="display" style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.4rem;">
										<span>{entry.title}</span>
										{#if entry.verifiedComp}
											<span title="Verified comp" aria-label="Verified comp">★</span>
										{/if}
									</div>
									<div class="muted">{entry.genreText}</div>
								</td>
								<td>{entry.author}</td>
								<td>{entry.finishedAt ?? '-'}</td>
								<td>
									<button class="button subtle" type="button" onclick={() => (editingId = editingId === entry.id ? null : entry.id)}>
										&#9998;
									</button>
								</td>
							</tr>
							{#if expandedId === entry.id}
								<tr>
									<td colspan="6" style="background: rgba(138, 90, 46, 0.05);">
										<div class="stack" style="padding: 0.3rem 0;">
											<div>
												<div class="eyebrow">Remarks</div>
												<div>{entry.remarks || '—'}</div>
											</div>
											<div>
												<div class="eyebrow">Similarities</div>
												<div>{entry.similarities || '—'}</div>
											</div>
											<div>
												<div class="eyebrow">Liked</div>
												<div>{entry.liked || '—'}</div>
											</div>
											<div>
												<div class="eyebrow">Disliked</div>
												<div>{entry.disliked || '—'}</div>
											</div>
										</div>
									</td>
								</tr>
							{/if}
							{#if editingId === entry.id}
								<tr>
									<td colspan="6" style="background: rgba(138, 90, 46, 0.05);">
										<form id={`reading-update-${entry.id}`} method="POST" action="?/update" class="stack">
											<input type="hidden" name="id" value={entry.id} />
											<label><span class="eyebrow">Status</span><select name="status"><option value="Want to Read" selected={entry.status === 'Want to Read'}>Want to Read</option><option value="Reading" selected={entry.status === 'Reading'}>Reading</option><option value="Read" selected={entry.status === 'Read'}>Read</option><option value="DNF" selected={entry.status === 'DNF'}>DNF</option></select></label>
											<label><span class="eyebrow">Verified comp</span><select name="verifiedComp"><option value="false" selected={!entry.verifiedComp}>No</option><option value="true" selected={entry.verifiedComp}>Yes</option></select></label>
											<label><span class="eyebrow">Title</span><input name="title" value={entry.title} /></label>
											<label><span class="eyebrow">Author</span><input name="author" value={entry.author} /></label>
											<label><span class="eyebrow">Genre</span><input name="genreText" value={entry.genreText ?? ''} /></label>
											<label><span class="eyebrow">Finished</span><input name="finishedAt" type="date" value={entry.finishedAt ?? ''} /></label>
											<label><span class="eyebrow">Remarks</span><textarea name="remarks">{entry.remarks ?? ''}</textarea></label>
											<label><span class="eyebrow">Similarities</span><textarea name="similarities">{entry.similarities ?? ''}</textarea></label>
											<label><span class="eyebrow">Liked</span><textarea name="liked">{entry.liked ?? ''}</textarea></label>
											<label><span class="eyebrow">Disliked</span><textarea name="disliked">{entry.disliked ?? ''}</textarea></label>
										</form>
										<form id={`reading-delete-${entry.id}`} method="POST" action="?/delete">
											<input type="hidden" name="id" value={entry.id} />
										</form>
										<div class="button-row" style="justify-content: flex-end; margin-top: 1rem;">
											<button class="button" type="submit" form={`reading-update-${entry.id}`}>Save</button>
											<button class="button" type="submit" form={`reading-delete-${entry.id}`}>Delete book</button>
											<button class="button subtle" type="button" onclick={() => (editingId = null)}>Close</button>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
			<Pagination
				currentPage={currentReadPage}
				totalPages={readTotalPages}
				paramName="readPage"
				preserve={{ sort: data.sort, activePage: String(currentActivePage) }}
			/>
		{:else}
			<div class="empty-state">Finished books are tucked away here, newest first when you open them.</div>
		{/if}
	</section>

	{#if showCreateModal}
		<div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (showCreateModal = false)}>
			<section class="card modal-card">
				<div class="section-title">
					<h2 class="display" style="margin: 0;">Add a book</h2>
					<button class="button subtle" type="button" onclick={() => (showCreateModal = false)}>Close</button>
				</div>
				<form method="POST" action="?/create" class="stack">
					<div class="field-grid">
						<label class="span-9"><span class="eyebrow">Title</span><input name="title" required /></label>
						<label class="span-3"><span class="eyebrow">Author</span><input name="author" required /></label>
						<label class="span-3"><span class="eyebrow">Genre</span><input name="genreText" /></label>
						<label class="span-3"><span class="eyebrow">Status</span><select name="status"><option>Want to Read</option><option>Reading</option><option>Read</option><option>DNF</option></select></label>
						<label class="span-3"><span class="eyebrow">Finished date</span><input name="finishedAt" type="date" value={data.today} /></label>
						<label class="span-3"><span class="eyebrow">Verified comp</span><select name="verifiedComp"><option value="false">No</option><option value="true">Yes</option></select></label>
						<label class="span-12"><span class="eyebrow">Remarks</span><textarea name="remarks"></textarea></label>
						<label class="span-6"><span class="eyebrow">Similarities to my writing</span><textarea name="similarities"></textarea></label>
						<label class="span-3"><span class="eyebrow">Liked</span><textarea name="liked"></textarea></label>
						<label class="span-3"><span class="eyebrow">Disliked</span><textarea name="disliked"></textarea></label>
					</div>
					<div class="button-row" style="justify-content: flex-end;">
						<button class="button subtle" type="button" onclick={() => (showCreateModal = false)}>Cancel</button>
						<button class="button primary" type="submit">Save book</button>
					</div>
				</form>
			</section>
		</div>
	{/if}
</section>
