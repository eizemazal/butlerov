import path from "path";
import {defineConfig} from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve("src/main.ts"),
            name: "butlerov",
            formats: ['es', 'umd'],
            fileName: (format) => `butlerov.${format}.cjs`
        }
    },
    plugins: [
        dts({
            insertTypesEntry: true,
            outDir: 'dist',
            include: ['src/main.ts']
        })
    ]
});
