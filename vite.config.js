import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	root: resolve(__dirname, 'src/renderer'),
	base: './',
	build: {
		outDir: resolve(__dirname, 'dist/renderer'),
		emptyOutDir: true,
	},
	server: {
		hmr: false,
	},
});
