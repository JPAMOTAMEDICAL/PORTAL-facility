import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const mode = process.argv[2] ?? "dev";
const host = process.env.HOST ?? "0.0.0.0";
const preferredPort = Number(process.env.PORT ?? process.env.DEFAULT_PORT ?? 3000);
const maxAttempts = 25;

function canListen(port, currentHost) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen(port, currentHost, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + maxAttempts; port += 1) {
    if (await canListen(port, host)) {
      return port;
    }
  }

  throw new Error(`Unable to find an available port starting at ${startPort}.`);
}

const port = await findAvailablePort(preferredPort);
console.log(`[jpmwoms] Starting ${mode} server on http://${host}:${port}`);

const child = spawn(
  process.execPath,
  [nextBin, mode, "--hostname", host, "--port", String(port)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(port),
      HOST: host,
    },
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});