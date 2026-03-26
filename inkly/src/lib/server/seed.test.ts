import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

let cwd: string;

beforeEach(() => {
	cwd = mkdtempSync(join(tmpdir(), 'inkly-test-'));
	process.chdir(cwd);
});

describe('database initialization', () => {
	it('seeds only once when the database is empty', async () => {
		const { cpSync } = await import('node:fs');
		cpSync('/Users/crystaltee/Documents/Playground/inkly/resources', join(cwd, 'resources'), {
			recursive: true
		});

		const dbModule = await import('./db');
		const seedModule = await import('./seed');
		const dataModule = await import('./data');

		dbModule.resetDbForTests();
		await seedModule.initializeSchemaAndSeed();
		const firstCount = dataModule.listRewardMilestones().length;

		await seedModule.initializeSchemaAndSeed();
		const secondCount = dataModule.listRewardMilestones().length;

		expect(firstCount).toBeGreaterThan(0);
		expect(secondCount).toBe(firstCount);

		dbModule.resetDbForTests();
		rmSync(cwd, { recursive: true, force: true });
	});
});
