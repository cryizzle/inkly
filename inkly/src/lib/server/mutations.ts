import { eq } from 'drizzle-orm';
import type { ReadingStatus, RewardKind, RewardMetricType } from '$lib/types';
import { getDb } from './db';
import { recalculateRewards } from './rewards';
import { readingEntries, rewardMilestones, writingEntries } from './schema';
import { toLocalIsoDate } from './current-date';

function emptyToNull(value: FormDataEntryValue | null) {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function stringValue(value: FormDataEntryValue | null, fallback = '') {
	return typeof value === 'string' ? value.trim() || fallback : fallback;
}

export async function createWritingEntry(formData: FormData) {
	const db = getDb();
	db.insert(writingEntries)
		.values({
			date: stringValue(formData.get('date')),
			endingWordCount: Number(stringValue(formData.get('endingWordCount'), '0'))
		})
		.onConflictDoUpdate({
			target: writingEntries.date,
			set: {
				endingWordCount: Number(stringValue(formData.get('endingWordCount'), '0'))
			}
		})
		.run();
	await recalculateRewards();
}

export async function updateWritingEntry(formData: FormData) {
	const db = getDb();
	const id = Number(stringValue(formData.get('id'), '0'));
	const date = stringValue(formData.get('date'));
	const endingWordCount = Number(stringValue(formData.get('endingWordCount'), '0'));
	const existing = db.select().from(writingEntries).where(eq(writingEntries.date, date)).get();

	if (existing && existing.id !== id) {
		db.update(writingEntries).set({ endingWordCount }).where(eq(writingEntries.id, existing.id)).run();
		db.delete(writingEntries).where(eq(writingEntries.id, id)).run();
	} else {
		db.update(writingEntries)
			.set({
				date,
				endingWordCount
			})
			.where(eq(writingEntries.id, id))
			.run();
	}
	await recalculateRewards();
}

export async function deleteWritingEntry(formData: FormData) {
	const db = getDb();
	db.delete(writingEntries)
		.where(eq(writingEntries.id, Number(stringValue(formData.get('id'), '0'))))
		.run();
	await recalculateRewards();
}

export async function createReadingEntry(formData: FormData) {
	const db = getDb();
	db.insert(readingEntries)
		.values({
			status: stringValue(formData.get('status')) as ReadingStatus,
			verifiedComp: stringValue(formData.get('verifiedComp')) === 'true',
			title: stringValue(formData.get('title')),
			author: stringValue(formData.get('author')),
			genreText: emptyToNull(formData.get('genreText')),
			remarks: emptyToNull(formData.get('remarks')),
			similarities: emptyToNull(formData.get('similarities')),
			liked: emptyToNull(formData.get('liked')),
			disliked: emptyToNull(formData.get('disliked')),
			finishedAt: emptyToNull(formData.get('finishedAt'))
		})
		.run();
	await recalculateRewards();
}

export async function updateReadingEntry(formData: FormData) {
	const db = getDb();
	db.update(readingEntries)
		.set({
			status: stringValue(formData.get('status')) as ReadingStatus,
			verifiedComp: stringValue(formData.get('verifiedComp')) === 'true',
			title: stringValue(formData.get('title')),
			author: stringValue(formData.get('author')),
			genreText: emptyToNull(formData.get('genreText')),
			remarks: emptyToNull(formData.get('remarks')),
			similarities: emptyToNull(formData.get('similarities')),
			liked: emptyToNull(formData.get('liked')),
			disliked: emptyToNull(formData.get('disliked')),
			finishedAt: emptyToNull(formData.get('finishedAt'))
		})
		.where(eq(readingEntries.id, Number(stringValue(formData.get('id'), '0'))))
		.run();
	await recalculateRewards();
}

export async function deleteReadingEntry(formData: FormData) {
	const db = getDb();
	db.delete(readingEntries)
		.where(eq(readingEntries.id, Number(stringValue(formData.get('id'), '0'))))
		.run();
	await recalculateRewards();
}

export async function createRewardMilestone(formData: FormData) {
	const db = getDb();
	db.insert(rewardMilestones)
		.values({
			category: stringValue(formData.get('category')),
			title: stringValue(formData.get('title')),
			rewardEur: Number(stringValue(formData.get('rewardEur'), '0')),
			kind: stringValue(formData.get('kind'), 'manual') as RewardKind,
			metricType: stringValue(formData.get('metricType'), 'manual') as RewardMetricType,
			targetValue: Number(stringValue(formData.get('targetValue'), '0')) || null,
			isRepeatable: stringValue(formData.get('isRepeatable')) === 'true',
			status: 'pending',
			completedAt: null
		})
		.run();
	await recalculateRewards();
}

export async function updateRewardMilestone(formData: FormData) {
	const db = getDb();
	db.update(rewardMilestones)
		.set({
			category: stringValue(formData.get('category')),
			title: stringValue(formData.get('title')),
			rewardEur: Number(stringValue(formData.get('rewardEur'), '0')),
			kind: stringValue(formData.get('kind'), 'manual') as RewardKind,
			metricType: stringValue(formData.get('metricType'), 'manual') as RewardMetricType,
			targetValue: Number(stringValue(formData.get('targetValue'), '0')) || null,
			isRepeatable: stringValue(formData.get('isRepeatable')) === 'true'
		})
		.where(eq(rewardMilestones.id, Number(stringValue(formData.get('id'), '0'))))
		.run();
	await recalculateRewards();
}

export async function toggleManualReward(formData: FormData) {
	const db = getDb();
	const id = Number(stringValue(formData.get('id'), '0'));
	const completedAt = emptyToNull(formData.get('completedAt')) ?? toLocalIsoDate();
	const shouldComplete = stringValue(formData.get('shouldComplete')) === 'true';

	db.update(rewardMilestones)
		.set({
			status: shouldComplete ? 'earned' : 'pending',
			completedAt: shouldComplete ? completedAt : null
		})
		.where(eq(rewardMilestones.id, id))
		.run();

	await recalculateRewards();
}

export async function deleteRewardMilestone(formData: FormData) {
	const db = getDb();
	db.delete(rewardMilestones)
		.where(eq(rewardMilestones.id, Number(stringValue(formData.get('id'), '0'))))
		.run();
	await recalculateRewards();
}
