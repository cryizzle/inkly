import { asc, desc, eq } from 'drizzle-orm';
import type { DashboardSummary, ReadingEntry, RewardMilestone, WritingEntry } from '$lib/types';
import { buildRewardProgress, getReadingStats, getWritingStats } from './calculations';
import { toLocalIsoDate } from './current-date';
import { getDb } from './db';
import { listRewardCompletions } from './rewards';
import { readingEntries, rewardMilestones, writingEntries } from './schema';

export function listWritingEntries(): WritingEntry[] {
	return getDb()
		.select()
		.from(writingEntries)
		.orderBy(asc(writingEntries.date))
		.all()
		.map((row) => ({
			id: row.id,
			date: row.date,
			endingWordCount: row.endingWordCount
		}));
}

export function listReadingEntries(): ReadingEntry[] {
	return getDb()
		.select()
		.from(readingEntries)
		.orderBy(desc(readingEntries.finishedAt), desc(readingEntries.id))
		.all()
		.map((row) => ({
			id: row.id,
			status: row.status as ReadingEntry['status'],
			verifiedComp: row.verifiedComp,
			title: row.title,
			author: row.author,
			genreText: row.genreText,
			remarks: row.remarks,
			similarities: row.similarities,
			liked: row.liked,
			disliked: row.disliked,
			finishedAt: row.finishedAt
		}));
}

export function listRewardMilestones(): RewardMilestone[] {
	return getDb()
		.select()
		.from(rewardMilestones)
		.orderBy(asc(rewardMilestones.category), asc(rewardMilestones.id))
		.all()
		.map((row) => ({
			id: row.id,
			category: row.category,
			title: row.title,
			rewardEur: row.rewardEur,
			kind: row.kind as RewardMilestone['kind'],
			metricType: row.metricType as RewardMilestone['metricType'],
			targetValue: row.targetValue,
			isRepeatable: row.isRepeatable,
			status: row.status as RewardMilestone['status'],
			completedAt: row.completedAt
		}));
}

export function getDashboardSummary(): DashboardSummary {
	const today = toLocalIsoDate();
	const writing = getWritingStats(listWritingEntries(), today);
	const reading = getReadingStats(listReadingEntries(), today);
	const rewards = buildRewardProgress(listRewardMilestones(), listRewardCompletions(), writing, reading);
	const milestoneTitleById = new Map(rewards.map((milestone) => [milestone.id, milestone.title]));
	const recentCompletions = listRewardCompletions()
		.slice(0, 6)
		.map((completion) => ({
			...completion,
			milestoneTitle: milestoneTitleById.get(completion.milestoneId) ?? `Milestone ${completion.milestoneId}`
		}));
	const totalEarnedValue = rewards
		.filter((milestone) => milestone.status === 'earned')
		.reduce((sum, milestone) => sum + milestone.rewardEur, 0);

	return {
		writing,
		reading,
		rewards: {
			totalEarnedValue,
			completedMilestones: rewards.filter((milestone) => milestone.status === 'earned').length,
			recentCompletions,
			activeMilestones: rewards
		}
	};
}
