import type { Actions, PageServerLoad } from './$types';
import { getReadingStats } from '$lib/server/calculations';
import { listReadingEntries } from '$lib/server/data';
import { createReadingEntry, deleteReadingEntry, updateReadingEntry } from '$lib/server/mutations';

function parsePage(value: string | null) {
	const page = Number(value);
	return Number.isInteger(page) && page > 0 ? page : 1;
}

export const load: PageServerLoad = async ({ url }) => {
	const sort = url.searchParams.get('sort') === 'asc' ? 'asc' : 'desc';
	const activePage = parsePage(url.searchParams.get('activePage'));
	const readPage = parsePage(url.searchParams.get('readPage'));
	const today = new Date().toISOString().slice(0, 10);
	return {
		stats: getReadingStats(listReadingEntries()),
		sort,
		activePage,
		readPage,
		today
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		await createReadingEntry(await request.formData());
	},
	update: async ({ request }) => {
		await updateReadingEntry(await request.formData());
	},
	delete: async ({ request }) => {
		await deleteReadingEntry(await request.formData());
	}
};
