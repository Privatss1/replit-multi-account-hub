const { app, BrowserWindow, shell, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const os = require("os");
const fs = require("fs");

let mainWindow = null;
let serverProcess = null;
let tray = null;
const PORT = 7891;

// Data directory in AppData
const DATA_DIR = path.join(app.getPath("userData"), "ReplitHub");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, "server.cjs");
    serverProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        PORT: String(PORT),
        DATA_DIR,
        UPLOADS_DIR,
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    serverProcess.stdout.on("data", (d) => {
      const msg = d.toString();
      if (msg.includes("READY")) resolve();
    });

    serverProcess.stderr.on("data", (d) => {
      console.error("[server]", d.toString());
    });

    serverProcess.on("error", reject);

    // Fallback resolve after 4s
    setTimeout(resolve, 4000);
  });
}

function waitForServer(retries = 20) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get(`http://localhost:${PORT}/api/healthz`, (res) => {
        if (res.statusCode === 200) resolve();
        else retry();
      });
      req.on("error", retry);
      req.end();
    };
    const retry = () => {
      attempts++;
      if (attempts >= retries) return reject(new Error("Server did not start"));
      setTimeout(check, 300);
    };
    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Replit Hub",
    backgroundColor: "#0f1117",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("close", (e) => {
    if (process.platform !== "darwin" && !app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  // Simple tray icon (16x16 orange square)
  const iconPath = path.join(__dirname, "assets", "icon.png");
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: "Open Replit Hub", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: "Data Folder", click: () => shell.openPath(DATA_DIR) },
    { type: "separator" },
    { label: "Quit", click: () => { app.isQuiting = true; app.quit(); } },
  ]);
  tray.setToolTip("Replit Hub");
  tray.setContextMenu(menu);
  tray.on("double-click", () => { mainWindow?.show(); mainWindow?.focus(); });
}

app.whenReady().then(async () => {
  try {
    await startServer();
    await waitForServer();
  } catch (e) {
    console.error("Server start failed:", e);
  }
  createWindow();
  createTray();
});

app.on("window-all-closed", () => {
  // Keep running in tray on Windows
  if (process.platform === "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow) mainWindow.show();
});

app.on("before-quit", () => {
  app.isQuiting = true;
  if (serverProcess) serverProcess.kill();
});
