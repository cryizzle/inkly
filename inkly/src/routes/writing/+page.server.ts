import type { Actions, PageServerLoad } from './$types';
import { getWritingStats } from '$lib/server/calculations';
import { listWritingEntries } from '$lib/server/data';
import { createWritingEntry, deleteWritingEntry, updateWritingEntry } from '$lib/server/mutations';

function parsePage(value: string | null) {
	const page = Number(value);
	return Number.isInteger(page) && page > 0 ? page : 1;
}

export const load: PageServerLoad = async ({ url }) => {
	const sort = url.searchParams.get('sort') === 'asc' ? 'asc' : 'desc';
	const page = parsePage(url.searchParams.get('page'));
	const today = new Date().toISOString().slice(0, 10);
	return {
		stats: getWritingStats(listWritingEntries()),
		sort,
		page,
		today
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		await createWritingEntry(await request.formData());
	},
	update: async ({ request }) => {
		await updateWritingEntry(await request.formData());
	},
	delete: async ({ request }) => {
		await deleteWritingEntry(await request.formData());
	}
};
