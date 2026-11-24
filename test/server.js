// local server: static files + /api/shift with the mock chain
const http = require("http"), fs = require("fs"), path = require("path");
const M = require("./mock")({ dark: process.env.DARK === "1" }); const A = require("../api/shift");
const root = path.join(__dirname, ".."), types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff": "font/woff", ".jpg": "image/jpeg", ".png": "image/png" };
const srv = http.createServer((req, res) => {
  if (req.url.startsWith("/api/shift")) return A(req, res);
  let p = decodeURIComponent(req.url.split("?")[0].split("#")[0]); if (p === "/") p = "/index.html"; if (!path.extname(p)) p += ".html";
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { res.statusCode = 404; return res.end("nf"); }
  res.setHeader("content-type", types[path.extname(f)] || "application/octet-stream"); fs.createReadStream(f).pipe(res);
});
module.exports = { srv, M }; if (require.main === module) srv.listen(+process.env.PORT || 4430, () => console.log("up"));
