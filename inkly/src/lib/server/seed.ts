import { eq } from 'drizzle-orm';
import { loadSeedCsv } from './csv';
import { getDb, getSqlite } from './db';
import { appSettings, readingEntries, rewardMilestones, writingEntries } from './schema';
import type { ReadingStatus, RewardKind, RewardMetricType, RewardStatus } from '$lib/types';
import { recalculateRewards } from './rewards';

function createTables() {
	const sqlite = getSqlite();
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS reward_milestones (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			category TEXT NOT NULL,
			title TEXT NOT NULL,
			reward_eur REAL NOT NULL,
			kind TEXT NOT NULL,
			metric_type TEXT NOT NULL,
			target_value INTEGER,
			is_repeatable INTEGER NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'pending',
			completed_at TEXT
		);
		CREATE TABLE IF NOT EXISTS reward_completions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			milestone_id INTEGER NOT NULL,
			completed_at TEXT NOT NULL,
			period_start TEXT,
			period_end TEXT,
			source_type TEXT NOT NULL,
			source_ref TEXT
		);
		CREATE TABLE IF NOT EXISTS writing_entries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT NOT NULL UNIQUE,
			ending_word_count INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS reading_entries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			status TEXT NOT NULL,
			verified_comp INTEGER NOT NULL DEFAULT 0,
			title TEXT NOT NULL,
			author TEXT NOT NULL,
			genre_text TEXT,
			remarks TEXT,
			similarities TEXT,
			liked TEXT,
			disliked TEXT,
			finished_at TEXT
		);
		CREATE TABLE IF NOT EXISTS app_settings (
			id INTEGER PRIMARY KEY,
			active_writing_cycle_start_date TEXT,
			active_reading_cycle_start_date TEXT
		);
	`);

	try {
		sqlite.exec(`ALTER TABLE reading_entries ADD COLUMN verified_comp INTEGER NOT NULL DEFAULT 0;`);
	} catch (error) {
		// Existing databases already have the column.
	}

	const writingColumns = sqlite.prepare(`PRAGMA table_info(writing_entries)`).all() as Array<{ name: string }>;
	if (writingColumns.some((column) => column.name === 'notes')) {
		sqlite.exec(`
			ALTER TABLE writing_entries RENAME TO writing_entries_old;
			CREATE TABLE writing_entries (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				date TEXT NOT NULL UNIQUE,
				ending_word_count INTEGER NOT NULL
			);
			INSERT INTO writing_entries (id, date, ending_word_count)
			SELECT id, date, ending_word_count FROM writing_entries_old;
			DROP TABLE writing_entries_old;
		`);
	}

	const rewardColumns = sqlite.prepare(`PRAGMA table_info(reward_milestones)`).all() as Array<{ name: string }>;
	if (rewardColumns.some((column) => column.name === 'target_format')) {
		sqlite.exec(`
			ALTER TABLE reward_milestones RENAME TO reward_milestones_old;
			CREATE TABLE reward_milestones (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				category TEXT NOT NULL,
				title TEXT NOT NULL,
				reward_eur REAL NOT NULL,
				kind TEXT NOT NULL,
				metric_type TEXT NOT NULL,
				target_value INTEGER,
				is_repeatable INTEGER NOT NULL DEFAULT 0,
				status TEXT NOT NULL DEFAULT 'pending',
				completed_at TEXT
			);
			INSERT INTO reward_milestones (
				id, category, title, reward_eur, kind, metric_type, target_value, is_repeatable, status, completed_at
			)
			SELECT
				id, category, title, reward_eur, kind, metric_type, target_value, is_repeatable, status, completed_at
			FROM reward_milestones_old;
			DROP TABLE reward_milestones_old;
		`);
	}

	if (rewardColumns.some((column) => column.name === 'sort_order') || rewardColumns.some((column) => column.name === 'notes')) {
		sqlite.exec(`
			ALTER TABLE reward_milestones RENAME TO reward_milestones_old;
			CREATE TABLE reward_milestones (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				category TEXT NOT NULL,
				title TEXT NOT NULL,
				reward_eur REAL NOT NULL,
				kind TEXT NOT NULL,
				metric_type TEXT NOT NULL,
				target_value INTEGER,
				is_repeatable INTEGER NOT NULL DEFAULT 0,
				status TEXT NOT NULL DEFAULT 'pending',
				completed_at TEXT
			);
			INSERT INTO reward_milestones (
				id, category, title, reward_eur, kind, metric_type, target_value, is_repeatable, status, completed_at
			)
			SELECT
				id, category, title, reward_eur, kind, metric_type, target_value, is_repeatable, status, completed_at
			FROM reward_milestones_old;
			DROP TABLE reward_milestones_old;
		`);
	}

	const readingColumns = sqlite.prepare(`PRAGMA table_info(reading_entries)`).all() as Array<{ name: string }>;
	if (readingColumns.some((column) => column.name === 'format')) {
		sqlite.exec(`
			ALTER TABLE reading_entries RENAME TO reading_entries_old;
			CREATE TABLE reading_entries (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				status TEXT NOT NULL,
				verified_comp INTEGER NOT NULL DEFAULT 0,
				title TEXT NOT NULL,
				author TEXT NOT NULL,
				genre_text TEXT,
				remarks TEXT,
				similarities TEXT,
				liked TEXT,
				disliked TEXT,
				finished_at TEXT
			);
			INSERT INTO reading_entries (
				id, status, verified_comp, title, author, genre_text, remarks, similarities, liked, disliked, finished_at
			)
			SELECT
				id, status, COALESCE(verified_comp, 0), title, author, genre_text, remarks, similarities, liked, disliked, finished_at
			FROM reading_entries_old;
			DROP TABLE reading_entries_old;
		`);
	}

	if (readingColumns.some((column) => column.name === 'started_at') && !readingColumns.some((column) => column.name === 'format')) {
		sqlite.exec(`
			ALTER TABLE reading_entries RENAME TO reading_entries_old;
			CREATE TABLE reading_entries (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				status TEXT NOT NULL,
				verified_comp INTEGER NOT NULL DEFAULT 0,
				title TEXT NOT NULL,
				author TEXT NOT NULL,
				genre_text TEXT,
				remarks TEXT,
				similarities TEXT,
				liked TEXT,
				disliked TEXT,
				finished_at TEXT
			);
			INSERT INTO reading_entries (
				id, status, verified_comp, title, author, genre_text, remarks, similarities, liked, disliked, finished_at
			)
			SELECT
				id, status, COALESCE(verified_comp, 0), title, author, genre_text, remarks, similarities, liked, disliked, finished_at
			FROM reading_entries_old;
			DROP TABLE reading_entries_old;
		`);
	}
}

export async function seedDatabaseIfEmpty() {
	const db = getDb();
	const existing = db.select({ id: rewardMilestones.id }).from(rewardMilestones).limit(1).all();

	if (existing.length) {
		if (!db.select({ id: appSettings.id }).from(appSettings).where(eq(appSettings.id, 1)).get()) {
			db.insert(appSettings).values({ id: 1 }).run();
		}
		return;
	}

	const rewards = loadSeedCsv<{
		category: string;
		title: string;
		reward_eur: string;
		kind: RewardKind;
		metric_type: RewardMetricType;
		target_value: string;
		is_repeatable: string;
		status: RewardStatus;
		completed_at: string;
	}>('reward_milestones.csv');

	const writing = loadSeedCsv<{
		date: string;
		ending_word_count: string;
	}>('writing_entries.csv');

	const reading = loadSeedCsv<{
		status: ReadingStatus;
		verified_comp: string;
		title: string;
		author: string;
		genre_text: string;
		remarks: string;
		similarities: string;
		liked: string;
		disliked: string;
		finished_at: string;
	}>('reading_entries.csv');

	db.insert(rewardMilestones)
		.values(
			rewards.map((row) => ({
				category: row.category,
				title: row.title,
				rewardEur: Number(row.reward_eur),
				kind: row.kind,
				metricType: row.metric_type,
				targetValue: row.target_value ? Number(row.target_value) : null,
				isRepeatable: row.is_repeatable === '1',
				status: row.status,
				completedAt: row.completed_at || null
			}))
		)
		.run();

	db.insert(writingEntries)
		.values(
			writing.map((row) => ({
				date: row.date,
				endingWordCount: Number(row.ending_word_count)
			}))
		)
		.run();

	db.insert(readingEntries)
		.values(
			reading.map((row) => ({
				status: row.status,
				verifiedComp: row.verified_comp === '1',
				title: row.title,
				author: row.author,
				genreText: row.genre_text || null,
				remarks: row.remarks || null,
				similarities: row.similarities || null,
				liked: row.liked || null,
				disliked: row.disliked || null,
				finishedAt: row.finished_at || null
			}))
		)
		.run();

	db.insert(appSettings).values({ id: 1 }).run();
}

export async function initializeSchemaAndSeed() {
	createTables();
	await seedDatabaseIfEmpty();
	await recalculateRewards();
}
