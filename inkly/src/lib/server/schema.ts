import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const rewardMilestones = sqliteTable('reward_milestones', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	category: text('category').notNull(),
	title: text('title').notNull(),
	rewardEur: real('reward_eur').notNull(),
	kind: text('kind').notNull(),
	metricType: text('metric_type').notNull(),
	targetValue: integer('target_value'),
	isRepeatable: integer('is_repeatable', { mode: 'boolean' }).notNull().default(false),
	status: text('status').notNull().default('pending'),
	completedAt: text('completed_at'),
	notes: text('notes')
});

export const rewardCompletions = sqliteTable('reward_completions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	milestoneId: integer('milestone_id').notNull(),
	completedAt: text('completed_at').notNull(),
	periodStart: text('period_start'),
	periodEnd: text('period_end'),
	sourceType: text('source_type').notNull(),
	sourceRef: text('source_ref')
});

export const writingEntries = sqliteTable('writing_entries', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	date: text('date').notNull().unique(),
	endingWordCount: integer('ending_word_count').notNull()
});

export const readingEntries = sqliteTable('reading_entries', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	status: text('status').notNull(),
	verifiedComp: integer('verified_comp', { mode: 'boolean' }).notNull().default(false),
	title: text('title').notNull(),
	author: text('author').notNull(),
	genreText: text('genre_text'),
	remarks: text('remarks'),
	similarities: text('similarities'),
	liked: text('liked'),
	disliked: text('disliked'),
	finishedAt: text('finished_at')
});

export const appSettings = sqliteTable('app_settings', {
	id: integer('id').primaryKey(),
	activeWritingCycleStartDate: text('active_writing_cycle_start_date'),
	activeReadingCycleStartDate: text('active_reading_cycle_start_date')
});
