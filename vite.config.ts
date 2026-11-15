import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
    license: { fileName: "THIRD_PARTY_LICENSES.md" },
    rolldownOptions: {
      output: {
        postBanner: "/*! Third-party licenses: /THIRD_PARTY_LICENSES.md */"
      }
    }
  }
});
