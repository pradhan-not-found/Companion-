import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { bytecodePlugin, defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    // Main-process code ships as V8 bytecode, not readable JavaScript.
    plugins: [externalizeDepsPlugin({ exclude: ["electron-store"] }), bytecodePlugin({ transformArrowFunctions: false })],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "src/main/main.ts")
        },
        // CommonJS output is required for bytecode compilation.
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs"
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.ts")
        },
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs"
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/renderer/index.html")
      }
    }
  }
});
