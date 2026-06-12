<script lang="ts">
	let {
		currentPage,
		totalPages,
		paramName = 'page',
		preserve = {}
	}: {
		currentPage: number;
		totalPages: number;
		paramName?: string;
		preserve?: Record<string, string>;
	} = $props();

	function hrefFor(page: number) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(preserve)) {
			if (value) {
				params.set(key, value);
			}
		}
		params.set(paramName, String(page));
		return `?${params.toString()}`;
	}

	const pages = $derived(Array.from({ length: totalPages }, (_, index) => index + 1));
</script>

{#if totalPages > 1}
	<nav class="pagination" aria-label="Pagination">
		<div class="muted">Page {currentPage} of {totalPages}</div>
		<div class="button-row">
			{#if currentPage > 1}
				<a class="button subtle" href={hrefFor(currentPage - 1)}>Previous</a>
			{/if}
			{#each pages as page}
				<a class={`button ${page === currentPage ? 'primary' : 'subtle'}`} href={hrefFor(page)}>{page}</a>
			{/each}
			{#if currentPage < totalPages}
				<a class="button subtle" href={hrefFor(currentPage + 1)}>Next</a>
			{/if}
		</div>
	</nav>
{/if}
