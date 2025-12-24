import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      outDir: "dist",
      include: ["src/index.ts", "src/VueButlerov.vue"]
    })
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "VueButlerov",
      formats: ["es", "cjs", "umd"],
      fileName: (format) => {
        if (format === "es") return "index.es.js";
        if (format === "cjs") return "index.js";
        return `vue-butlerov.${format}.js`;
      }
    },
    rollupOptions: {
      external: ["vue", "@butlerov-chemistry/core"],
      output: {
        globals: {
          vue: "Vue",
          "@butlerov-chemistry/core": "ButlerovCore"
        },
        exports: "default"
      }
    }
  }
});