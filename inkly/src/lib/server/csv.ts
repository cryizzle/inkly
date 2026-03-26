import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

function seedPath(fileName: string) {
	return join(process.cwd(), 'resources', 'seed', fileName);
}

export function loadSeedCsv<T>(fileName: string) {
	const raw = readFileSync(seedPath(fileName), 'utf8');
	return parse(raw, {
		columns: true,
		skip_empty_lines: true,
		trim: true
	}) as T[];
}
