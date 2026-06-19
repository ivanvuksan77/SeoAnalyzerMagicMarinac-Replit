import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

// Reliable __dirname for both tsx (dev) and esbuild ESM bundle (prod).
// import.meta.dirname can be undefined in some esbuild configurations,
// so we fall back to fileURLToPath(import.meta.url) which is always set.
const _dirname: string =
  typeof import.meta.dirname === "string"
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function parseCookieLang(cookieHeader: string | undefined): "en" | "hr" | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)lang=([^;]+)/);
  if (!match) return null;
  const val = match[1].trim();
  if (val === "hr") return "hr";
  if (val === "en") return "en";
  return null;
}

function detectLang(req: express.Request): "en" | "hr" {
  const fromCookie = parseCookieLang(req.headers.cookie);
  if (fromCookie) return fromCookie;
  const acceptLang = (req.headers["accept-language"] || "") as string;
  if (acceptLang.toLowerCase().includes("hr")) return "hr";
  return "en";
}

async function loadStaticContent(lang: "en" | "hr"): Promise<string> {
  const filename = `${lang}.html`;
  const candidates = [
    path.resolve(_dirname, "static_content", filename),
    path.resolve(_dirname, "..", "server", "static_content", filename),
    path.resolve(_dirname, "..", "static_content", filename),
    path.resolve(process.cwd(), "server", "static_content", filename),
    path.resolve(process.cwd(), "static_content", filename),
  ];
  for (const candidate of candidates) {
    try {
      const content = await fs.promises.readFile(candidate, "utf-8");
      console.log(`[static-content] loaded ${filename} from ${candidate}`);
      return content;
    } catch {
      // try next candidate
    }
  }
  console.warn(`[static-content] Could not load ${filename}. Tried:\n${candidates.map(c => "  " + c).join("\n")}`);
  return "";
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);

      const lang = detectLang(req);
      const staticContent = await loadStaticContent(lang);
      const finalPage = page.replace("<!--static-content-->", staticContent);

      res.status(200).set({ "Content-Type": "text/html" }).end(finalPage);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(_dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Ensure static_content is co-located with the bundle so loadStaticContent
  // always finds it via candidate 1 — regardless of cwd or deployment layout.
  const staticContentDst = path.resolve(_dirname, "static_content");
  if (!fs.existsSync(staticContentDst)) {
    const copyCandidates = [
      path.resolve(_dirname, "..", "server", "static_content"),
      path.resolve(process.cwd(), "server", "static_content"),
    ];
    let copied = false;
    for (const src of copyCandidates) {
      if (fs.existsSync(src)) {
        try {
          fs.cpSync(src, staticContentDst, { recursive: true });
          console.log(`[static-content] copied from ${src} → ${staticContentDst}`);
          copied = true;
        } catch (e) {
          console.warn(`[static-content] copy failed from ${src}: ${e}`);
        }
        break;
      }
    }
    if (!copied) {
      console.warn(`[static-content] no source found to copy. Tried:\n${copyCandidates.map(c => "  " + c).join("\n")}`);
    }
  } else {
    console.log(`[static-content] dist/static_content already present, skipping copy`);
  }

  app.use(express.static(distPath, { index: false }));

  app.use("*", async (req, res) => {
    try {
      const html = await fs.promises.readFile(
        path.resolve(distPath, "index.html"),
        "utf-8",
      );
      const lang = detectLang(req);
      const staticContent = await loadStaticContent(lang);
      const page = html.replace("<!--static-content-->", staticContent);
      res.status(200).set({ "Content-Type": "text/html" }).send(page);
    } catch {
      res.status(500).send("Internal server error");
    }
  });
}
