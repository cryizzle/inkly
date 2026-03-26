export type RewardKind = 'manual' | 'auto';
export type RewardMetricType =
	| 'manual'
	| 'editing_streak'
	| 'editing_days_in_cycle'
	| 'cumulative_abs_words'
	| 'books_finished'
	| 'novels_in_cycle';

export type RewardStatus = 'pending' | 'earned';
export type CompletionSourceType = 'auto' | 'manual';
export type ReadingStatus = 'Want to Read' | 'Reading' | 'Read' | 'DNF';
export type ReadingFormat = 'novel';

export interface RewardMilestone {
	id: number;
	category: string;
	title: string;
	rewardEur: number;
	kind: RewardKind;
	metricType: RewardMetricType;
	targetValue: number | null;
	isRepeatable: boolean;
	status: RewardStatus;
	completedAt: string | null;
	notes: string | null;
}

export interface RewardCompletion {
	id: number;
	milestoneId: number;
	completedAt: string;
	periodStart: string | null;
	periodEnd: string | null;
	sourceType: CompletionSourceType;
	sourceRef: string | null;
}

export interface WritingEntry {
	id: number;
	date: string;
	endingWordCount: number;
}

export interface WritingEntryDerived extends WritingEntry {
	startingWordCount: number | null;
	diff: number;
	diffAbs: number;
	cumulativeAbs: number;
	editingStreak: number;
}

export interface CycleProgress {
	startDate: string | null;
	endDate: string | null;
	currentCount: number;
	target: number;
	progressPct: number;
}

export interface WritingStats {
	entries: WritingEntryDerived[];
	currentEndingWordCount: number;
	currentStreak: number;
	cumulativeAbsWords: number;
	totalEditingDays: number;
	cycle: CycleProgress;
}

export interface ReadingEntry {
	id: number;
	status: ReadingStatus;
	verifiedComp: boolean;
	title: string;
	author: string;
	genreText: string | null;
	remarks: string | null;
	similarities: string | null;
	liked: string | null;
	disliked: string | null;
	finishedAt: string | null;
}

export interface ReadingStats {
	entries: ReadingEntry[];
	completedBooks: number;
	currentReadingCycle: CycleProgress;
}

export interface RewardMilestoneProgress extends RewardMilestone {
	progressValue: number | null;
	progressLabel: string;
	completionCount: number;
	latestCompletion: string | null;
}

export interface DashboardSummary {
	writing: WritingStats;
	reading: ReadingStats;
	rewards: {
		totalEarnedValue: number;
		completedMilestones: number;
		recentCompletions: Array<RewardCompletion & { milestoneTitle: string }>;
		activeMilestones: RewardMilestoneProgress[];
	};
}
