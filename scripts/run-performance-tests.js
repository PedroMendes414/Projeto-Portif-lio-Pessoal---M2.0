const { spawn } = require("child_process");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const port = process.env.PORT || "3000";
const baseUrl = process.env.K6_BASE_URL || `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["src/server.js"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: port
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let serverReady = false;

server.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (chunk.toString().includes("Cashback Marketplace API running")) {
    serverReady = true;
  }
});

server.stderr.on("data", (chunk) => process.stderr.write(chunk));

server.on("exit", (code) => {
  if (!serverReady && code !== null) {
    console.error(`API server exited before k6 execution with code ${code}`);
  }
});

waitForServer()
  .then(() => runK6())
  .then((code) => {
    shutdown(() => process.exit(code));
  })
  .catch((error) => {
    console.error(error.message);
    shutdown(() => process.exit(1));
  });

function waitForServer() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timeoutMs = 15000;

    const check = async () => {
      try {
        const response = await fetch(`${baseUrl}/health`);
        if (response.ok) {
          resolve();
          return;
        }
      } catch (error) {
        // Keep polling until timeout.
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`API server was not ready at ${baseUrl} within ${timeoutMs}ms`));
        return;
      }

      setTimeout(check, 300);
    };

    check();
  });
}

function runK6() {
  return new Promise((resolve, reject) => {
    const k6 = spawn("k6", ["run", "tests/performance/cashback-api.k6.js"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        K6_BASE_URL: baseUrl
      },
      stdio: "inherit"
    });

    k6.on("error", (error) => {
      reject(new Error(`Failed to start k6. Is it installed and available in PATH? ${error.message}`));
    });
    k6.on("exit", (code) => resolve(code || 0));
  });
}

function shutdown(callback) {
  if (server.exitCode !== null) {
    callback();
    return;
  }

  server.once("exit", callback);
  server.kill();
}
