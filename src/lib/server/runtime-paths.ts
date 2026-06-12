import { join } from 'node:path';

export function getAppRoot() {
	return process.env.INKLY_APP_ROOT ?? process.cwd();
}

export function getDataRoot() {
	return process.env.INKLY_DATA_DIR ?? join(getAppRoot(), 'data');
}

export function getResourcesRoot() {
	return process.env.INKLY_RESOURCES_DIR ?? join(getAppRoot(), 'resources');
}
