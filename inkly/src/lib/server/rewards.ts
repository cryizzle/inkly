import { and, asc, desc, eq } from 'drizzle-orm';
import type { ReadingEntry, RewardCompletion, RewardMilestone, WritingEntry } from '$lib/types';
import { getDb } from './db';
import { deriveWritingEntries } from './calculations';
import { readingEntries, rewardCompletions, rewardMilestones, writingEntries } from './schema';
import { addDays } from './time';
import { generateSlidingCycleCompletions } from './cycle-engine';

function toMilestones(): RewardMilestone[] {
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

function getWriting(): WritingEntry[] {
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

function getReading(): ReadingEntry[] {
	return getDb()
		.select()
		.from(readingEntries)
		.orderBy(asc(readingEntries.finishedAt), asc(readingEntries.id))
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

function autoRepeatableCompletion(
	milestoneId: number,
	completedAt: string,
	periodStart: string,
	sourceRef: string
): Omit<RewardCompletion, 'id'> {
	return {
		milestoneId,
		completedAt,
		periodStart,
		periodEnd: addDays(periodStart, 29),
		sourceType: 'auto',
		sourceRef
	};
}

function generateEditingStreakCompletions(entries: WritingEntry[], target: number, milestoneId: number) {
	const derived = deriveWritingEntries(entries);
	return derived
		.filter((entry) => entry.editingStreak === target)
		.map((entry) => autoRepeatableCompletion(milestoneId, entry.date, addDays(entry.date, -(target - 1)), `writing:${entry.id}`));
}

function generateEditingCycleCompletions(entries: WritingEntry[], target: number, milestoneId: number) {
	if (!entries.length) return [];

	return generateSlidingCycleCompletions(
		[...entries].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => ({
			id: entry.id,
			date: entry.date
		})),
		target,
		(completedAt, periodStart, entry) =>
			autoRepeatableCompletion(milestoneId, completedAt, periodStart, `writing:${entry.id}`)
	);
}

function getCompletedReadingEntries(entries: ReadingEntry[]) {
	return entries
		.filter((entry) => entry.status === 'Read' && !!entry.finishedAt)
		.sort((a, b) => (a.finishedAt ?? '').localeCompare(b.finishedAt ?? ''));
}

function generateReadingCycleCompletions(entries: ReadingEntry[], target: number, milestoneId: number) {
	const qualifying = getCompletedReadingEntries(entries);
	if (!qualifying.length) return [];

	return generateSlidingCycleCompletions(
		qualifying.map((entry) => ({
			id: entry.id,
			date: entry.finishedAt!
		})),
		target,
		(completedAt, periodStart, entry) =>
			autoRepeatableCompletion(milestoneId, completedAt, periodStart, `reading:${entry.id}`)
	);
}

export async function recalculateRewards() {
	const db = getDb();
	const milestones = toMilestones();
	const writing = getWriting();
	const reading = getReading();
	const writingDerived = deriveWritingEntries(writing);
	const allReadingCompleted = getCompletedReadingEntries(reading);

	db.delete(rewardCompletions).where(eq(rewardCompletions.sourceType, 'auto')).run();

	for (const milestone of milestones) {
		if (milestone.kind === 'manual') {
			continue;
		}

		if (milestone.isRepeatable) {
			let completions: Omit<RewardCompletion, 'id'>[] = [];
			if (milestone.metricType === 'editing_streak' && milestone.targetValue) {
				completions = generateEditingStreakCompletions(writing, milestone.targetValue, milestone.id);
			}

			if (milestone.metricType === 'editing_days_in_cycle' && milestone.targetValue) {
				completions = generateEditingCycleCompletions(writing, milestone.targetValue, milestone.id);
			}

			if (milestone.metricType === 'books_finished' && milestone.targetValue) {
				completions = generateReadingCycleCompletions(reading, milestone.targetValue, milestone.id);
			}

			if (milestone.metricType === 'novels_in_cycle' && milestone.targetValue) {
				completions = generateReadingCycleCompletions(reading, milestone.targetValue, milestone.id);
			}

			if (completions.length) {
				db.insert(rewardCompletions).values(completions).run();
			}

			continue;
		}

		let completedAt: string | null = null;
		let earned = false;

		if (milestone.metricType === 'cumulative_abs_words' && milestone.targetValue) {
			const last = writingDerived.at(-1);
			earned = (last?.cumulativeAbs ?? 0) >= milestone.targetValue;
			completedAt = earned ? writingDerived.find((entry) => entry.cumulativeAbs >= milestone.targetValue!)?.date ?? null : null;
		}

		if (milestone.metricType === 'books_finished' && milestone.targetValue) {
			earned = allReadingCompleted.length >= milestone.targetValue;
			completedAt = earned ? allReadingCompleted[milestone.targetValue - 1]?.finishedAt ?? null : null;
		}

		db.update(rewardMilestones)
			.set({
				status: earned ? 'earned' : 'pending',
				completedAt
			})
			.where(and(eq(rewardMilestones.id, milestone.id), eq(rewardMilestones.kind, 'auto')))
			.run();
	}
}

export function listRewardCompletions() {
	return getDb()
		.select()
		.from(rewardCompletions)
		.orderBy(desc(rewardCompletions.completedAt), desc(rewardCompletions.id))
		.all()
		.map((row) => ({
			id: row.id,
			milestoneId: row.milestoneId,
			completedAt: row.completedAt,
			periodStart: row.periodStart,
			periodEnd: row.periodEnd,
			sourceType: row.sourceType as RewardCompletion['sourceType'],
			sourceRef: row.sourceRef
		}));
}
