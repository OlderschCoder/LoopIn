import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const DEMO_MIME: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

// Serves the embedded Expo web export (public/demo) directly in dev.
// Vite's dev server refuses to serve URLs containing a literal "/node_modules/"
// segment (it falls through to the SPA HTML fallback), and the Expo asset paths
// contain that segment. This middleware bypasses that interception and provides
// SPA fallback to the export's index.html for client-side routes.
function serveDemoStatic(base: string): PluginOption {
  const demoRoot = path.resolve(import.meta.dirname, "public", "demo");
  return {
    name: "serve-demo-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        try {
          const url = new URL(req.url || "/", "http://localhost");
          let pathname = decodeURIComponent(url.pathname);
          if (base !== "/" && pathname.startsWith(base)) {
            pathname = "/" + pathname.slice(base.length);
          }
          pathname = pathname.replace(/\/{2,}/g, "/");
          if (pathname !== "/demo" && !pathname.startsWith("/demo/")) {
            return next();
          }
          const rel = pathname.replace(/^\/demo\/?/, "");
          let filePath = path.join(demoRoot, rel);
          const relCheck = path.relative(demoRoot, filePath);
          if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
            return next();
          }
          const isFile = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
          if (!isFile) {
            // Directory or unknown client route -> SPA fallback.
            filePath = path.join(demoRoot, "index.html");
          }
          const ext = path.extname(filePath).toLowerCase();
          res.setHeader("Content-Type", DEMO_MIME[ext] || "application/octet-stream");
          res.setHeader("Cache-Control", "no-cache");
          fs.createReadStream(filePath).pipe(res);
        } catch {
          next();
        }
      });
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    serveDemoStatic(basePath),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
