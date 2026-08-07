const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.error("Missing .next/standalone — run `next build` first (output: standalone).");
  process.exit(1);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log("copied", path.relative(root, src), "->", path.relative(root, dest));
}

copyDir(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
copyDir(path.join(root, "public"), path.join(standalone, "public"));

const envProd = path.join(root, ".env.production");
if (fs.existsSync(envProd)) {
  fs.copyFileSync(envProd, path.join(standalone, ".env.production"));
  console.log("copied .env.production -> standalone/");
}

console.log("standalone ready.");
