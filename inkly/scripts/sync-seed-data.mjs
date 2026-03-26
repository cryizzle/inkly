import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

const projectRoot = process.cwd();
const sourceFiles = {
	rewards: '/Users/crystaltee/Downloads/Antiphase - Reward Milestones.csv',
	writing: '/Users/crystaltee/Downloads/Antiphase - Progress.csv',
	reading: '/Users/crystaltee/Downloads/Antiphase - Comps.csv'
};

const readingDateOverrides = new Map([
	[
		"The Girl in his Shadow",
		{
			finished_at: '2026-03-14',
			verified_comp: '1'
		}
	],
	[
		'Normal People',
		{
			finished_at: '2026-02-25',
			verified_comp: '0'
		}
	],
	[
		'Lessons in Chemistry',
		{
			finished_at: '2026-03-08',
			verified_comp: '0'
		}
	],
	[
		'The Runaway Heiress',
		{
			finished_at: '2026-02-19',
			verified_comp: '0'
		}
	],
	[
		'Forever your Rogue',
		{
			finished_at: '2026-02-15',
			verified_comp: '0'
		}
	],
	[
		"A Lady's Guide to Fortune-Hunting",
		{
			finished_at: '',
			verified_comp: '0'
		}
	],
	[
		'The Chemistry of Familiar Objects',
		{
			finished_at: '',
			verified_comp: '0'
		}
	]
]);

function normalizeTitle(value) {
	return String(value || '')
		.replace(/\(COMP\)/gi, '')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

const rewardSeedPath = join(projectRoot, 'resources', 'seed', 'reward_milestones.csv');
const writingSeedPath = join(projectRoot, 'resources', 'seed', 'writing_entries.csv');
const readingSeedPath = join(projectRoot, 'resources', 'seed', 'reading_entries.csv');

mkdirSync(join(projectRoot, 'resources', 'seed'), { recursive: true });

function readCsv(filePath) {
	return parse(readFileSync(filePath, 'utf8'), {
		columns: true,
		skip_empty_lines: true,
		trim: true
	});
}

function csvEscape(value) {
	if (value === null || value === undefined) return '';
	const stringValue = String(value);
	if (/[",\n]/.test(stringValue)) {
		return `"${stringValue.replace(/"/g, '""')}"`;
	}
	return stringValue;
}

function writeCsv(filePath, headers, rows) {
	const lines = [headers.join(',')];
	for (const row of rows) {
		lines.push(headers.map((header) => csvEscape(row[header])).join(','));
	}
	writeFileSync(filePath, `${lines.join('\n')}\n`);
}

function titleToMetric(title, category) {
	const lower = title.toLowerCase();
	if (category === 'Word Count') return 'cumulative_abs_words';
	if (lower.includes('consecutive editing days')) return 'editing_streak';
	if (lower.includes('15 total editing days')) return 'editing_days_in_cycle';
	if (lower.includes('finish three novels')) return 'novels_in_cycle';
	if (lower.includes('books completed')) return 'books_finished';
	if (lower.includes('finish one novel')) return 'books_finished';
	return 'manual';
}

function titleToTargetValue(title) {
	const normalized = title.toLowerCase().replace(/,/g, '');
	const wordMap = [
		['one', 1],
		['three', 3],
		['five', 5],
		['ten', 10],
		['fifteen', 15],
		['twenty', 20]
	];
	for (const [word, value] of wordMap) {
		if (normalized.includes(word)) return value;
	}

	const match = normalized.match(/(\d+)/);
	return match ? Number(match[1]) : '';
}

function normalizeDate(input) {
	if (!input) return '';
	const trimmed = String(input).trim();
	if (!trimmed) return '';

	if (trimmed.includes('/')) {
		const [day, month, year] = trimmed.split('/').map((part) => part.trim());
		return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	}

	const namedMonth = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
	if (namedMonth) {
		const [, monthName, day, year] = namedMonth;
		const monthIndex = [
			'january',
			'february',
			'march',
			'april',
			'may',
			'june',
			'july',
			'august',
			'september',
			'october',
			'november',
			'december'
		].indexOf(monthName.toLowerCase());

		if (monthIndex >= 0) {
			return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
		}
	}

	const value = new Date(`${trimmed} UTC`);
	if (Number.isNaN(value.getTime())) return '';
	return value.toISOString().slice(0, 10);
}

const rewardRows = readCsv(sourceFiles.rewards);
const normalizedRewards = [];
let repeatable = false;
let sortOrder = 10;

for (const row of rewardRows) {
	const category = row['Category']?.trim();
	const title = row['Milestone']?.trim();
	if (!category && !title) continue;
	if (title?.toLowerCase().includes('audiobook')) continue;

	if (category === 'Repeatable milestones') {
		repeatable = true;
		continue;
	}

	if (category === 'Category' && title === 'Milestone') continue;

	const completedAt = normalizeDate(row['Completed Date']);
	const metricType = titleToMetric(title, category);
	const kind = metricType === 'manual' ? 'manual' : 'auto';

	normalizedRewards.push({
		category,
		title,
		reward_eur: Number(row['Reward (EUR)'] || 0),
		kind,
		metric_type: metricType,
		target_value: metricType === 'manual' ? '' : titleToTargetValue(title),
		is_repeatable: repeatable ? 1 : 0,
		status: completedAt ? 'earned' : 'pending',
		completed_at: completedAt,
		notes: '',
		sort_order: sortOrder
	});

	sortOrder += 10;
}

const writingRows = readCsv(sourceFiles.writing).map((row) => ({
	date: normalizeDate(row['Date']),
	ending_word_count: Number(String(row['Ending Word Count']).replace(/[,\s"]/g, '').replace(/\.00$/, ''))
}));

const readingRows = readCsv(sourceFiles.reading).map((row) => {
	const title = row['Title']?.trim() || '';
	const override = [...readingDateOverrides.entries()].find(
		([candidateTitle]) => normalizeTitle(candidateTitle) === normalizeTitle(title)
	)?.[1];

	return {
		status: row['Status']?.trim() || 'Want to Read',
		verified_comp: override?.verified_comp || '0',
		title,
		author: row['Author']?.trim() || '',
		genre_text: row['Genre']?.trim() || '',
		remarks: row['Remarks'] ?? '',
		similarities: row['Similiarities to my writing'] ?? '',
		liked: row['Liked'] ?? '',
		disliked: row['Disliked'] ?? '',
		finished_at: override?.finished_at || ''
	};
});

writeCsv(
	rewardSeedPath,
	[
		'category',
		'title',
		'reward_eur',
		'kind',
		'metric_type',
		'target_value',
		'is_repeatable',
		'status',
		'completed_at',
		'notes'
	],
	normalizedRewards
);

writeCsv(writingSeedPath, ['date', 'ending_word_count'], writingRows);
writeCsv(
	readingSeedPath,
	[
		'status',
		'verified_comp',
		'title',
		'author',
		'genre_text',
		'remarks',
		'similarities',
		'liked',
		'disliked',
		'finished_at'
	],
	readingRows
);

console.log('Seed files synced from Antiphase CSV exports.');
