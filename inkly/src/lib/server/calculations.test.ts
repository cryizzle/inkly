import { describe, expect, it } from 'vitest';
import { calculateReadingCycle, deriveWritingEntries, getWritingStats } from './calculations';
import type { ReadingEntry, WritingEntry } from '$lib/types';

describe('writing calculations', () => {
	it('derives starting counts, diffs, abs values, and streaks', () => {
		const entries: WritingEntry[] = [
			{ id: 1, date: '2026-03-20', endingWordCount: 1000 },
			{ id: 2, date: '2026-03-21', endingWordCount: 900 },
			{ id: 3, date: '2026-03-23', endingWordCount: 950 }
		];

		const derived = deriveWritingEntries(entries);
		expect(derived[0].startingWordCount).toBeNull();
		expect(derived[1].startingWordCount).toBe(1000);
		expect(derived[1].diff).toBe(-100);
		expect(derived[1].diffAbs).toBe(100);
		expect(derived[1].editingStreak).toBe(2);
		expect(derived[2].editingStreak).toBe(1);
	});

	it('resets the displayed editing streak after five consecutive days', () => {
		const entries: WritingEntry[] = Array.from({ length: 6 }, (_, index) => ({
			id: index + 1,
			date: `2026-03-0${index + 1}`,
			endingWordCount: 1000 + index
		}));

		const derived = deriveWritingEntries(entries);
		expect(derived.map((entry) => entry.editingStreak)).toEqual([1, 2, 3, 4, 5, 1]);
	});

	it('restarts the 15-in-30 cycle after completion', () => {
		const entries = Array.from({ length: 16 }, (_, index) => ({
			id: index + 1,
			date: `2026-03-${String(index + 1).padStart(2, '0')}`,
			endingWordCount: 1000 + index
		}));

		const stats = getWritingStats(entries);
		expect(stats.cycle.startDate).toBe('2026-03-16');
		expect(stats.cycle.currentCount).toBe(1);
	});

	it('does not count the completion day into the next writing cycle', () => {
		const entries: WritingEntry[] = [
			{ id: 1, date: '2026-02-08', endingWordCount: 1 },
			{ id: 2, date: '2026-02-09', endingWordCount: 2 },
			{ id: 3, date: '2026-02-10', endingWordCount: 3 },
			{ id: 4, date: '2026-02-11', endingWordCount: 4 },
			{ id: 5, date: '2026-02-12', endingWordCount: 5 },
			{ id: 6, date: '2026-02-15', endingWordCount: 6 },
			{ id: 7, date: '2026-02-16', endingWordCount: 7 },
			{ id: 8, date: '2026-02-17', endingWordCount: 8 },
			{ id: 9, date: '2026-02-18', endingWordCount: 9 },
			{ id: 10, date: '2026-02-19', endingWordCount: 10 },
			{ id: 11, date: '2026-02-20', endingWordCount: 11 },
			{ id: 12, date: '2026-02-22', endingWordCount: 12 },
			{ id: 13, date: '2026-02-23', endingWordCount: 13 },
			{ id: 14, date: '2026-02-24', endingWordCount: 14 },
			{ id: 15, date: '2026-02-25', endingWordCount: 15 },
			{ id: 16, date: '2026-02-26', endingWordCount: 16 },
			{ id: 17, date: '2026-02-27', endingWordCount: 17 },
			{ id: 18, date: '2026-03-02', endingWordCount: 18 },
			{ id: 19, date: '2026-03-03', endingWordCount: 19 },
			{ id: 20, date: '2026-03-05', endingWordCount: 20 },
			{ id: 21, date: '2026-03-08', endingWordCount: 21 },
			{ id: 22, date: '2026-03-09', endingWordCount: 22 },
			{ id: 23, date: '2026-03-11', endingWordCount: 23 },
			{ id: 24, date: '2026-03-12', endingWordCount: 24 },
			{ id: 25, date: '2026-03-13', endingWordCount: 25 },
			{ id: 26, date: '2026-03-14', endingWordCount: 26 },
			{ id: 27, date: '2026-03-15', endingWordCount: 27 },
			{ id: 28, date: '2026-03-16', endingWordCount: 28 },
			{ id: 29, date: '2026-03-18', endingWordCount: 29 },
			{ id: 30, date: '2026-03-19', endingWordCount: 30 },
			{ id: 31, date: '2026-03-20', endingWordCount: 31 },
			{ id: 32, date: '2026-03-21', endingWordCount: 32 },
			{ id: 33, date: '2026-03-22', endingWordCount: 33 },
			{ id: 34, date: '2026-03-23', endingWordCount: 34 }
		];

		const stats = getWritingStats(entries);
		expect(stats.cycle.startDate).toBe('2026-03-20');
		expect(stats.cycle.currentCount).toBe(4);
	});
});

describe('reading cycle calculations', () => {
	it('counts only completed novels and restarts on completion', () => {
		const entries: ReadingEntry[] = [
			{
				id: 1,
				status: 'Read',
				verifiedComp: false,
				title: 'One',
				author: 'A',
				genreText: null,
				remarks: null,
				similarities: null,
				liked: null,
				disliked: null,
				finishedAt: '2026-01-05'
			},
			{
				id: 2,
				status: 'Read',
				verifiedComp: false,
				title: 'Two',
				author: 'A',
				genreText: null,
				remarks: null,
				similarities: null,
				liked: null,
				disliked: null,
				finishedAt: '2026-01-10'
			},
			{
				id: 3,
				status: 'Read',
				verifiedComp: false,
				title: 'Three',
				author: 'A',
				genreText: null,
				remarks: null,
				similarities: null,
				liked: null,
				disliked: null,
				finishedAt: '2026-01-15'
			},
			{
				id: 4,
				status: 'Reading',
				verifiedComp: false,
				title: 'Four',
				author: 'A',
				genreText: null,
				remarks: null,
				similarities: null,
				liked: null,
				disliked: null,
				finishedAt: null
			}
		];

		const cycle = calculateReadingCycle(entries, 3);
		expect(cycle.startDate).toBe('2026-01-16');
		expect(cycle.currentCount).toBe(0);
	});
});
