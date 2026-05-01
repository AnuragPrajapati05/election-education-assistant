import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");
const indexPath = path.join(distDir, "index.html");
const port = Number(process.env.PORT || 8080);

export const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return contentTypes[ext] || "application/octet-stream";
}

export function resolveRequestPath(reqPath) {
  if (!reqPath || reqPath.includes("\0")) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(reqPath.split("?")[0] || "/");
  } catch {
    return null;
  }

  const normalizedSeparators = decodedPath.replace(/\\/g, "/");
  const segments = normalizedSeparators.split("/");
  if (segments.includes("..")) return null;

  const normalized = path.posix.normalize(normalizedSeparators.startsWith("/") ? normalizedSeparators : `/${normalizedSeparators}`);
  return normalized === "/" ? "/index.html" : normalized;
}

export function resolveStaticFilePath(reqPath) {
  const safePath = resolveRequestPath(reqPath);
  if (!safePath) return null;

  const filePath = path.resolve(distDir, safePath.slice(1));
  const relative = path.relative(distDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

  return filePath;
}

export function sendFile(res, filePath, headOnly = false) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": getContentType(filePath),
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    ...securityHeaders,
  });
  if (headOnly) {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

export function createStaticServer() {
  return http.createServer(async (req, res) => {
    if (!["GET", "HEAD"].includes(req.method || "GET")) {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8", ...securityHeaders });
      res.end("Method not allowed.");
      return;
    }

    const filePath = resolveStaticFilePath(req.url || "/");
    if (!filePath) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8", ...securityHeaders });
      res.end("Invalid request path.");
      return;
    }

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        return sendFile(res, filePath, req.method === "HEAD");
      }
    } catch {
      // Fall back to SPA entry below.
    }

    if (existsSync(indexPath)) {
      return sendFile(res, indexPath, req.method === "HEAD");
    }

    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8", ...securityHeaders });
    res.end("Build output not found.");
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  createStaticServer().listen(port, "0.0.0.0", () => {
    console.log(`Static frontend listening on ${port}`);
  });
}
