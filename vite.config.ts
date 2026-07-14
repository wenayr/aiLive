import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDirectory = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    plugins: [react()],
    resolve: {
        // wenay-react2 is a local sibling package and has its own development
        // dependency tree. Every JSX/hook consumer must resolve to this app's
        // one React runtime, otherwise ModalProvider and the root renderer use
        // different dispatchers.
        dedupe: ['react', 'react-dom', 'wenay-common2'],
        alias: {
            react: resolve(rootDirectory, 'node_modules/react'),
            'react-dom': resolve(rootDirectory, 'node_modules/react-dom'),
            'wenay-common2': resolve(rootDirectory, 'node_modules/wenay-common2'),
        },
    },
    server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        proxy: {
            '/socket.io': {
                target: 'http://127.0.0.1:4311',
                ws: true,
            },
            '/api': {
                target: 'http://127.0.0.1:4311',
            },
        },
    },
    build: {
        outDir: 'dist/web',
        emptyOutDir: true,
    },
})
