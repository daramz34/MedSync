import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const proxy = { "/api": { target: "http://127.0.0.1:8000", changeOrigin: true } };
const allowedHosts = [".ngrok-free.app", ".ngrok-free.dev", ".ngrok.app", ".ngrok.io"];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174, allowedHosts, proxy },
  preview: { port: 5174, allowedHosts, proxy },
});