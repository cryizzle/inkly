import { app, BrowserWindow, shell } from 'electron';
import { createServer as createNetServer } from 'node:net';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

let mainWindow: BrowserWindow | null = null;
let desktopServer: http.Server | null = null;
let isQuitting = false;

process.on('uncaughtException', (error) => {
	console.error('[ink.ly] uncaughtException', error);
});

process.on('unhandledRejection', (error) => {
	console.error('[ink.ly] unhandledRejection', error);
});

function getAppRoot() {
	return app.getAppPath();
}

function getResourcesDir() {
	return path.join(getAppRoot(), 'resources');
}

function getDataDir() {
	return path.join(app.getPath('userData'), 'data');
}

function getPreloadPath() {
	return path.join(getAppRoot(), 'electron-dist', 'preload.js');
}

function findOpenPort() {
	return new Promise<number>((resolve, reject) => {
		const tester = createNetServer();
		tester.unref();
		tester.on('error', reject);
		tester.listen(0, '127.0.0.1', () => {
			const address = tester.address();
			tester.close(() => {
				if (address && typeof address === 'object') {
					resolve(address.port);
					return;
				}

				reject(new Error('Unable to allocate a desktop app port.'));
			});
		});
	});
}

async function startServer() {
	const port = await findOpenPort();
	const url = `http://127.0.0.1:${port}`;

	process.env.HOST = '127.0.0.1';
	process.env.PORT = String(port);
	process.env.INKLY_DATA_DIR = getDataDir();
	process.env.INKLY_RESOURCES_DIR = getResourcesDir();
	process.env.INKLY_APP_ROOT = getAppRoot();

	const { handler } = await import(pathToFileURL(path.join(getAppRoot(), 'build', 'handler.js')).href);

	desktopServer = http.createServer((request, response) => {
		Promise.resolve(handler(request, response)).catch((error: unknown) => {
			console.error('[ink.ly] request handler failed', error);
			response.statusCode = 500;
			response.end('Internal Server Error');
		});
	});

	await new Promise<void>((resolve, reject) => {
		desktopServer?.once('error', reject);
		desktopServer?.listen(port, '127.0.0.1', () => {
			desktopServer?.off('error', reject);
			resolve();
		});
	});

	return url;
}

async function createWindow() {
	const devServerUrl = process.env.INKLY_DEV_SERVER_URL;
	const appUrl = devServerUrl || (await startServer());

	mainWindow = new BrowserWindow({
		width: 1480,
		height: 980,
		minWidth: 1180,
		minHeight: 760,
		backgroundColor: '#f8f1cf',
		title: 'ink.ly',
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			preload: getPreloadPath()
		}
	});

	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});

	await mainWindow.loadURL(appUrl);

	if (!app.isPackaged && devServerUrl) {
		mainWindow.webContents.openDevTools({ mode: 'detach' });
	}
}

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('before-quit', () => {
	isQuitting = true;
	if (desktopServer) {
		desktopServer.close();
		desktopServer = null;
	}
});

app.on('render-process-gone', (_event, _webContents, details) => {
	console.error('[ink.ly] render-process-gone', details);
});

app.whenReady().then(async () => {
	await createWindow();

	app.on('activate', async () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			await createWindow();
		}
	});
}).catch((error: unknown) => {
	console.error('[ink.ly] desktop boot failed', error);
	if (!isQuitting) {
		app.quit();
	}
});
