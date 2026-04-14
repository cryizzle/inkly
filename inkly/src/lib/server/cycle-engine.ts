import type { CycleProgress, RewardCompletion } from '$lib/types';
import { addDays, diffDays, isWithinCycle } from './time';

interface DatedValue {
	date: string;
}

function trimExpiredDates<T extends DatedValue>(items: T[], referenceDate: string) {
	while (items.length && !isWithinCycle(referenceDate, items[0].date)) {
		items.shift();
	}
}

export function calculateSlidingCycleProgress(
	dates: string[],
	target: number,
	referenceDate: string
): CycleProgress {
	if (!dates.length) {
		return {
			startDate: null,
			endDate: null,
			currentCount: 0,
			target,
			progressPct: 0
		};
	}

	const activeDates: DatedValue[] = [];
	let nextCycleStart: string | null = null;

	for (const date of dates) {
		trimExpiredDates(activeDates, date);
		activeDates.push({ date });

		if (activeDates.length >= target) {
			nextCycleStart = addDays(date, 1);
			activeDates.length = 0;
		}
	}

	trimExpiredDates(activeDates, referenceDate);

	let cycleStart = activeDates[0]?.date ?? null;
	if (
		!cycleStart &&
		nextCycleStart &&
		diffDays(nextCycleStart, referenceDate) >= 0 &&
		diffDays(nextCycleStart, referenceDate) < 30
	) {
		cycleStart = nextCycleStart;
	}

	const currentCount = activeDates.length;

	return {
		startDate: cycleStart,
		endDate: cycleStart ? addDays(cycleStart, 29) : null,
		currentCount,
		target,
		progressPct: Math.min(100, Math.round((currentCount / target) * 100))
	};
}

export function generateSlidingCycleCompletions<T extends DatedValue>(
	items: T[],
	target: number,
	buildCompletion: (completedAt: string, periodStart: string, item: T) => Omit<RewardCompletion, 'id'>
) {
	const completions: Array<Omit<RewardCompletion, 'id'>> = [];
	const activeItems: T[] = [];

	for (const item of items) {
		trimExpiredDates(activeItems, item.date);
		activeItems.push(item);

		if (activeItems.length >= target) {
			completions.push(buildCompletion(item.date, activeItems[0].date, item));
			activeItems.length = 0;
		}
	}

	return completions;
}
