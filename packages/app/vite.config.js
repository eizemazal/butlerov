import path from "path";
import { defineConfig } from "vite";
import vuePlugin from "@vitejs/plugin-vue";
import { fileURLToPath } from "url";

export default defineConfig({
    root: path.resolve("src/renderer"),
    publicDir: "public",
    server: {
        port: 8080,
    },
    open: false,
    build: {
        outDir: path.resolve("build/renderer"),
        emptyOutDir: true,
    },
    plugins: [vuePlugin()],
    test: {
        environment: 'happy-dom',
        pool: "vmThreads"
    },
    resolve: {
        alias: {
            '@butlerov-chemistry/vue': fileURLToPath(new URL('../vue/src', import.meta.url))
        }
    }
});
