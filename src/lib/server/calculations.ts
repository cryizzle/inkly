import type {
	CycleProgress,
	ReadingEntry,
	ReadingStats,
	RewardCompletion,
	RewardMilestone,
	RewardMilestoneProgress,
	WritingEntry,
	WritingEntryDerived,
	WritingStats
} from '$lib/types';
import { diffDays } from './time';
import { toLocalIsoDate } from './current-date';
import { calculateSlidingCycleProgress } from './cycle-engine';

export function deriveWritingEntries(entries: WritingEntry[]): WritingEntryDerived[] {
	const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
	let previousEnding: number | null = null;
	let cumulativeAbs = 0;
	let streak = 0;
	let previousDate: string | null = null;

	return sorted.map((entry) => {
		const startingWordCount = previousEnding;
		const diff = startingWordCount === null ? 0 : entry.endingWordCount - startingWordCount;
		const diffAbs = Math.abs(diff);
		cumulativeAbs += diffAbs;
		streak =
			previousDate && diffDays(previousDate, entry.date) === 1
				? streak >= 5
					? 1
					: streak + 1
				: 1;

		const derived: WritingEntryDerived = {
			...entry,
			startingWordCount,
			diff,
			diffAbs,
			cumulativeAbs,
			editingStreak: streak
		};

		previousEnding = entry.endingWordCount;
		previousDate = entry.date;
		return derived;
	});
}

export function calculateWritingCycle(
	entries: WritingEntryDerived[],
	target = 15,
	referenceDate = toLocalIsoDate()
): CycleProgress {
	return calculateSlidingCycleProgress(
		entries.map((entry) => entry.date),
		target,
		referenceDate
	);
}

export function getWritingStats(entries: WritingEntry[], referenceDate = toLocalIsoDate()): WritingStats {
	const derived = deriveWritingEntries(entries);
	const latest = derived.at(-1);
	return {
		entries: derived,
		currentEndingWordCount: latest?.endingWordCount ?? 0,
		currentStreak: latest?.editingStreak ?? 0,
		cumulativeAbsWords: latest?.cumulativeAbs ?? 0,
		totalEditingDays: derived.length,
		cycle: calculateWritingCycle(derived, 15, referenceDate)
	};
}

function getCompletedReadingEntries(entries: ReadingEntry[]) {
	return [...entries]
		.filter((entry) => entry.status === 'Read');
}

function getQualifyingReadingEntries(entries: ReadingEntry[]) {
	return [...entries]
		.filter((entry) => entry.status === 'Read' && !!entry.finishedAt)
		.sort((a, b) => (a.finishedAt ?? '').localeCompare(b.finishedAt ?? ''));
}

export function calculateReadingCycle(
	entries: ReadingEntry[],
	target: number,
	referenceDate = toLocalIsoDate()
) {
	return calculateSlidingCycleProgress(
		getQualifyingReadingEntries(entries).map((entry) => entry.finishedAt!),
		target,
		referenceDate
	);
}

export function getReadingStats(entries: ReadingEntry[], referenceDate = toLocalIsoDate()): ReadingStats {
	const completed = getCompletedReadingEntries(entries);

	return {
		entries: [...entries].sort((a, b) =>
			(a.finishedAt ?? a.title).localeCompare(b.finishedAt ?? b.title)
		),
		completedBooks: completed.length,
		currentReadingCycle: calculateReadingCycle(entries, 3, referenceDate)
	};
}

export function buildRewardProgress(
	milestones: RewardMilestone[],
	completions: RewardCompletion[],
	writingStats: WritingStats,
	readingStats: ReadingStats
): RewardMilestoneProgress[] {
	const completionMap = completions.reduce<Map<number, RewardCompletion[]>>((map, completion) => {
		const bucket = map.get(completion.milestoneId) ?? [];
		bucket.push(completion);
		map.set(completion.milestoneId, bucket);
		return map;
	}, new Map());

	return milestones
		.map((milestone) => {
			const ownCompletions = completionMap.get(milestone.id) ?? [];
			let progressValue: number | null = null;
			let progressLabel = milestone.kind === 'manual' ? 'Manual milestone' : 'Awaiting data';

			switch (milestone.metricType) {
				case 'editing_streak':
					progressValue = writingStats.currentStreak;
					progressLabel = `${writingStats.currentStreak} day streak`;
					break;
				case 'editing_days_in_cycle':
					progressValue = writingStats.cycle.currentCount;
					progressLabel = `${writingStats.cycle.currentCount}/${milestone.targetValue ?? 15} editing days`;
					break;
				case 'cumulative_abs_words':
					progressValue = writingStats.cumulativeAbsWords;
					progressLabel = `${writingStats.cumulativeAbsWords.toLocaleString()} words changed`;
					break;
				case 'books_finished':
					progressValue = readingStats.completedBooks;
					progressLabel = `${readingStats.completedBooks} books finished`;
					break;
				case 'novels_in_cycle':
					progressValue = readingStats.currentReadingCycle.currentCount;
					progressLabel = `${readingStats.currentReadingCycle.currentCount}/${milestone.targetValue ?? 3} novels this cycle`;
					break;
				default:
					break;
			}

			return {
				...milestone,
				progressValue,
				progressLabel,
				completionCount: ownCompletions.length,
				latestCompletion: ownCompletions.at(-1)?.completedAt ?? milestone.completedAt,
				status: milestone.isRepeatable ? 'pending' : milestone.status
			};
		})
		.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
}
