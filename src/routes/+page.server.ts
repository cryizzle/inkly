import type { PageServerLoad } from './$types';
import { getDashboardSummary } from '$lib/server/data';

export const load: PageServerLoad = async () => {
	return {
		summary: getDashboardSummary()
	};
};
