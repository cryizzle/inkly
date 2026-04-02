import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { appSettings, readingEntries, rewardCompletions, rewardMilestones, writingEntries } from './schema';
import { getDataRoot } from './runtime-paths';

let sqlite: Database.Database | null = null;
let initialized: Promise<void> | null = null;

function getDbPath() {
	return join(getDataRoot(), 'inkly.sqlite');
}

export function getSqlite() {
	if (!sqlite) {
		const dbPath = getDbPath();
		mkdirSync(dirname(dbPath), { recursive: true });
		sqlite = new Database(dbPath);
		sqlite.pragma('journal_mode = WAL');
	}

	return sqlite;
}

export function getDb() {
	return drizzle(getSqlite(), {
		schema: {
			rewardMilestones,
			rewardCompletions,
			writingEntries,
			readingEntries,
			appSettings
		}
	});
}

export function ensureInitialized(run: () => Promise<void>) {
	if (!initialized) {
		initialized = run();
	}

	return initialized;
}

export function resetDbForTests() {
	if (sqlite) {
		sqlite.close();
	}
	sqlite = null;
	initialized = null;
}
