import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('inklyDesktop', {
	platform: process.platform
});
