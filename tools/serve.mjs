// Serveur local de prévisualisation du site (comme GitHub Pages) : node tools/serve.mjs [port]
// Sert le dossier du site, avec les requêtes partielles (Range) dont les vidéos ont besoin.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.argv[2] ?? 8080);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".mp4": "video/mp4", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".ico": "image/x-icon" };

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(root, url.endsWith("/") ? url + "index.html" : url);
  if ( !file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory() ) {
    res.writeHead(404); return res.end("Not found");
  }
  const size = fs.statSync(file).size;
  const type = types[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
  if ( range ) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Site : http://localhost:${port}/`));
