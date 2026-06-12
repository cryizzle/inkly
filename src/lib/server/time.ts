const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: string, amount: number) {
	const value = new Date(`${date}T00:00:00Z`);
	value.setUTCDate(value.getUTCDate() + amount);
	return value.toISOString().slice(0, 10);
}

export function diffDays(start: string, end: string) {
	const startTime = new Date(`${start}T00:00:00Z`).getTime();
	const endTime = new Date(`${end}T00:00:00Z`).getTime();
	return Math.round((endTime - startTime) / DAY_MS);
}

export function isWithinCycle(date: string, cycleStart: string) {
	return diffDays(cycleStart, date) >= 0 && diffDays(cycleStart, date) < 30;
}

export function maxDate(a: string | null, b: string | null) {
	if (!a) return b;
	if (!b) return a;
	return a > b ? a : b;
}
