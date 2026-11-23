import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        game: fileURLToPath(new URL("./index.html", import.meta.url)),
        comparador: fileURLToPath(
          new URL("./comparador/index.html", import.meta.url),
        ),
      },
    },
  },
});
