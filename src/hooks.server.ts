import type { Handle } from '@sveltejs/kit';
import { ensureInitialized } from '$lib/server/db';
import { initializeSchemaAndSeed } from '$lib/server/seed';
import { recalculateRewards } from '$lib/server/rewards';

async function initializeApp() {
	await initializeSchemaAndSeed();
	await recalculateRewards();
}

export const handle: Handle = async ({ event, resolve }) => {
	await ensureInitialized(initializeApp);
	event.locals.dbReady = true;
	return resolve(event);
};
