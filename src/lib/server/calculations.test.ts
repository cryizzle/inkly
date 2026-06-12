import { describe, expect, it } from 'vitest';
import {
	calculateReadingCycle,
	calculateWritingCycle,
	deriveWritingEntries,
	getWritingStats
} from './calculations';
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

	it('starts a new writing cycle only after the target is reached', () => {
		const entries = Array.from({ length: 16 }, (_, index) => ({
			id: index + 1,
			date: `2026-03-${String(index + 1).padStart(2, '0')}`,
			endingWordCount: 1000 + index
		}));

		const stats = getWritingStats(entries, '2026-03-16');
		expect(stats.cycle.startDate).toBe('2026-03-16');
		expect(stats.cycle.currentCount).toBe(1);
	});

	it('slides the writing window forward when older editing days fall out before completion', () => {
		const entries: WritingEntry[] = [
			{ id: 1, date: '2026-01-01', endingWordCount: 1 },
			{ id: 2, date: '2026-01-10', endingWordCount: 2 }
		];

		const cycle = calculateWritingCycle(deriveWritingEntries(entries), 3, '2026-01-31');
		expect(cycle.startDate).toBe('2026-01-10');
		expect(cycle.endDate).toBe('2026-02-08');
		expect(cycle.currentCount).toBe(1);
	});
});

describe('reading cycle calculations', () => {
	it('starts a new reading cycle only after the target is reached', () => {
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

		const cycle = calculateReadingCycle(entries, 3, '2026-01-16');
		expect(cycle.startDate).toBe('2026-01-16');
		expect(cycle.endDate).toBe('2026-02-14');
		expect(cycle.currentCount).toBe(0);
	});

	it('shows the next writing cycle immediately after a successful completion even with zero progress', () => {
		const entries = Array.from({ length: 15 }, (_, index) => ({
			id: index + 1,
			date: `2026-03-${String(index + 1).padStart(2, '0')}`,
			endingWordCount: 1000 + index
		}));

		const stats = getWritingStats(entries, '2026-03-16');
		expect(stats.cycle.startDate).toBe('2026-03-16');
		expect(stats.cycle.endDate).toBe('2026-04-14');
		expect(stats.cycle.currentCount).toBe(0);
	});

	it('slides the reading window forward when an older finished book falls out before completion', () => {
		const entries: ReadingEntry[] = [
			{
				id: 1,
				status: 'Read',
				verifiedComp: true,
				title: 'The Girl in His Shadow',
				author: 'Audrey Blake',
				genreText: null,
				remarks: null,
				similarities: null,
				liked: null,
				disliked: null,
				finishedAt: '2026-03-14'
			},
			{
				id: 2,
				status: 'Read',
				verifiedComp: false,
				title: 'Book Two',
				author: 'A',
				genreText: null,
				remarks: null,
				similarities: null,
				liked: null,
				disliked: null,
				finishedAt: '2026-03-20'
			},
			{
				id: 3,
				status: 'Want to Read',
				verifiedComp: false,
				title: 'Book Three',
				author: 'A',
				genreText: null,
				remarks: null,
				similarities: null,
				liked: null,
				disliked: null,
				finishedAt: null
			}
		];

		const cycle = calculateReadingCycle(entries, 3, '2026-04-13');
		expect(cycle.startDate).toBe('2026-03-20');
		expect(cycle.endDate).toBe('2026-04-18');
		expect(cycle.currentCount).toBe(1);
	});
});
