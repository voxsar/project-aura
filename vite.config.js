import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
	plugins: [
		laravel({
			input: ['resources/js/project-aura-new/src/index.css', 'resources/js/project-aura-new/src/main.tsx'],
			refresh: true,
		}),
		react(),
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './resources/js/project-aura-new/src'),
		},
	},
	build: {
		minify: false,
	},
});
