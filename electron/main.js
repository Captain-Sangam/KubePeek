// Electron main process for KubePeek.
//
// Rather than porting the Next.js app to a renderer bundle, we keep Next.js
// intact and run its production standalone server as a child process on a
// free localhost port, then point a BrowserWindow at it. This means the same
// code powers the Docker image and the native app.

const { app, BrowserWindow, shell, utilityProcess } = require('electron');
const net = require('net');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
let serverPort = 0;

// GUI apps launched from Finder don't inherit the shell PATH. EKS exec-auth
// (`aws eks get-token`) and other credential helpers live in these dirs, so we
// prepend them or cluster connections silently fail when launched from Finder.
function fixPath() {
  const extra = ['/usr/local/bin', '/opt/homebrew/bin', path.join(app.getPath('home'), '.local', 'bin')];
  const current = (process.env.PATH || '').split(':');
  const merged = [...new Set([...current, ...extra])].filter(Boolean);
  process.env.PATH = merged.join(':');
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function startServer(port) {
  // In dev we don't spawn — the Next dev server is already running (see the
  // `dev` npm script) and ELECTRON_START_URL points at it.
  if (process.env.ELECTRON_START_URL) return;

  // utilityProcess (not child_process.spawn + ELECTRON_RUN_AS_NODE): a spawned
  // Electron-as-node child gets its own "exec" Dock icon on macOS.
  const serverJs = path.join(process.resourcesPath, 'server', 'server.js');
  serverProcess = utilityProcess.fork(serverJs, [], {
    serviceName: 'kubepeek-next-server',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
    },
    stdio: 'inherit',
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0) console.error(`Next server exited with code ${code}`);
    serverProcess = null;
  });
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.destroy();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Timed out waiting for the server to start'));
        } else {
          setTimeout(attempt, 300);
        }
      });
    };
    attempt();
  });
}

async function createWindow() {
  const startUrl = process.env.ELECTRON_START_URL || `http://127.0.0.1:${serverPort}`;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    show: false, // shown on ready-to-show; avoids a white window while the server boots
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open external links in the default browser rather than a new window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await waitForServer(startUrl);
  await mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  fixPath();
  serverPort = await findFreePort();
  startServer(serverPort);
  await createWindow();
}).catch((err) => {
  console.error('Startup failed:', err);
  app.quit();
});

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

app.on('before-quit', stopServer);

// Single-window app whose backend dies with the window: closing it quits on
// every platform. (The old darwin keep-alive killed the server but left the
// app running; reopening from the Dock then hung on a dead server — white
// window until force quit.)
app.on('window-all-closed', () => {
  app.quit();
});
