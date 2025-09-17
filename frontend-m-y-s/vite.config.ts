import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    proxy: {
      // Proxy todas las requests que empiecen con /api
      "/api": {
        target:
          "https://xk6ko24swikqzpofezhia5op6m0syjwq.lambda-url.sa-east-1.on.aws/", // Tu servidor backend
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      // Para tu Lambda de AWS
      "/lambda": {
        target:
          "https://smmhah3p3nfodmp4soxyupgd0uxcj.lambda-url.sa-east-1.on.aws",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/lambda/, ""),
      },
    },
  },
});
