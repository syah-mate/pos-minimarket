const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");
const { app } = require("electron");

function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const l = raw.trim();
    if (!l || l.startsWith("#")) continue;
    const eq = l.indexOf("=");
    if (eq === -1) continue;
    let v = l.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[l.slice(0, eq).trim()] = v;
  }
  return out;
}

function waitForServer(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const ping = () => {
      const req = http.get({ host: "127.0.0.1", port, path: "/" }, () => resolve());
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("Next server did not start in time"));
        else setTimeout(ping, 300);
      });
    };
    ping();
  });
}

async function startNextServer(port) {
  const serverDir = path.join(process.resourcesPath, "standalone");
  const serverJs = path.join(serverDir, "server.js");

  const fileEnv = {
    ...loadEnvFile(path.join(process.resourcesPath, ".env.production")),
    ...loadEnvFile(path.join(app.getPath("userData"), ".env")),
  };

  const child = spawn(process.execPath, [serverJs], {
    cwd: serverDir,
    env: {
      ...fileEnv,
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
    },
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (code && code !== 0) console.error("Next server exited with code", code);
  });

  await waitForServer(port);
  return () => {
    try {
      child.kill();
    } catch (_) {}
  };
}

module.exports = { startNextServer };
