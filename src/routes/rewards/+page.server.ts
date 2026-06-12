import type { Actions, PageServerLoad } from './$types';
import { buildRewardProgress, getReadingStats, getWritingStats } from '$lib/server/calculations';
import { toLocalIsoDate } from '$lib/server/current-date';
import { listReadingEntries, listRewardMilestones, listWritingEntries } from '$lib/server/data';
import {
	createRewardMilestone,
	deleteRewardMilestone,
	toggleManualReward,
	updateRewardMilestone
} from '$lib/server/mutations';
import { listRewardCompletions } from '$lib/server/rewards';

function parsePage(value: string | null) {
	const page = Number(value);
	return Number.isInteger(page) && page > 0 ? page : 1;
}

export const load: PageServerLoad = async ({ url }) => {
	const today = toLocalIsoDate();
	const writing = getWritingStats(listWritingEntries(), today);
	const reading = getReadingStats(listReadingEntries(), today);
	const milestones = buildRewardProgress(listRewardMilestones(), listRewardCompletions(), writing, reading);
	const milestoneTitleById = new Map(milestones.map((milestone) => [milestone.id, milestone.title]));

	return {
		milestones,
		activePage: parsePage(url.searchParams.get('activePage')),
		earnedPage: parsePage(url.searchParams.get('earnedPage')),
		completionPage: parsePage(url.searchParams.get('completionPage')),
		completions: listRewardCompletions().map((completion) => ({
			...completion,
			milestoneTitle: milestoneTitleById.get(completion.milestoneId) ?? `Milestone ${completion.milestoneId}`
		}))
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		await createRewardMilestone(await request.formData());
	},
	update: async ({ request }) => {
		await updateRewardMilestone(await request.formData());
	},
	delete: async ({ request }) => {
		await deleteRewardMilestone(await request.formData());
	},
	toggleManual: async ({ request }) => {
		await toggleManualReward(await request.formData());
	}
};
