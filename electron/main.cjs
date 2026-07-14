const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const { scanNetworks, connectNetwork } = require("./network.cjs");

let serverProcess;
let mainWindow;
let examActive = false;
let pendingUpdateInfo = null;
let downloadedUpdateInfo = null;
let updateDialogOpen = false;
let autoUpdater;

const RELEASE_WORKFLOW_URL =
  "https://github.com/Venkey3011/ADHI-ARENA-V2/actions/workflows/release.yml";

function downloadedUpdatePath() {
  return path.join(app.getPath("userData"), "downloaded-update.json");
}

function persistDownloadedUpdate(info) {
  if (!info?.version) return;
  try {
    fs.writeFileSync(
      downloadedUpdatePath(),
      JSON.stringify({ version: info.version, savedAt: new Date().toISOString() }),
      "utf8",
    );
  } catch {
    // Update persistence is best-effort; the updater cache remains authoritative.
  }
}

function loadPersistedDownloadedUpdate() {
  try {
    const raw = fs.readFileSync(downloadedUpdatePath(), "utf8");
    const saved = JSON.parse(raw);
    return saved?.version ? saved : null;
  } catch {
    return null;
  }
}

function clearPersistedDownloadedUpdate() {
  try {
    fs.rmSync(downloadedUpdatePath(), { force: true });
  } catch {
    // Ignore cleanup failures; the next successful update will overwrite it.
  }
}

function sendDownloadedUpdateStatus(message) {
  if (!downloadedUpdateInfo) return;
  sendUpdateStatus({
    state: examActive ? "deferred" : "downloaded",
    version: downloadedUpdateInfo.version,
    percent: 100,
    message:
      message ||
      (examActive
        ? "Installation deferred until the active test ends."
        : "Downloaded. Click Install to restart and update."),
  });
}

function applyExamLock(active) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  examActive = Boolean(active);
  mainWindow.setContentProtection(examActive);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);
  mainWindow.setAlwaysOnTop(examActive, examActive ? "screen-saver" : "normal");
  mainWindow.setFullScreen(examActive);
  mainWindow.setKiosk(examActive);

  if (examActive) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function unpackedPath(...parts) {
  if (!app.isPackaged) return path.join(__dirname, "..", ...parts);
  return path.join(process.resourcesPath, "app.asar.unpacked", ...parts);
}

function waitForServer(port, attempts = 80) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(`http://127.0.0.1:${port}/api/health`, (response) => {
        response.resume();
        if (response.statusCode === 200) resolve();
        else retry();
      });
      request.on("error", retry);
      request.setTimeout(500, () => request.destroy());
    };
    const retry = () => {
      if (--attempts <= 0) reject(new Error("The local application server did not start."));
      else setTimeout(check, 250);
    };
    check();
  });
}

function installZoomControls(window) {
  const minimumZoom = 0.5;
  const fittedZoom = 1;
  const zoomStep = 0.1;

  const applyZoom = (zoomFactor) => {
    const clamped = Math.min(fittedZoom, Math.max(minimumZoom, zoomFactor));
    window.webContents.setZoomFactor(Number(clamped.toFixed(2)));
  };

  // Chromium remembers zoom per origin. Always open ADHI ARENA at its intended fit.
  window.webContents.on("did-finish-load", () => applyZoom(fittedZoom));

  window.webContents.on("before-input-event", (event, input) => {
    if (!(input.control || input.meta) || input.type !== "keyDown") return;

    const key = String(input.key || "").toLowerCase();
    const code = String(input.code || "").toLowerCase();
    const isZoomIn = key === "+" || key === "=" || code === "numpadadd";
    const isZoomOut = key === "-" || code === "numpadsubtract";
    const isReset = key === "0" || code === "numpad0";
    if (!isZoomIn && !isZoomOut && !isReset) return;

    event.preventDefault();
    if (isReset) {
      applyZoom(fittedZoom);
    } else {
      const direction = isZoomIn ? 1 : -1;
      applyZoom(window.webContents.getZoomFactor() + direction * zoomStep);
    }
  });

  // Handles Ctrl + mouse wheel and touchpad zoom requests.
  window.webContents.on("zoom-changed", (event, zoomDirection) => {
    event.preventDefault();
    const direction = zoomDirection === "in" ? 1 : -1;
    applyZoom(window.webContents.getZoomFactor() + direction * zoomStep);
  });
}

function installExamWindowLock(window) {
  window.on("close", (event) => {
    if (!examActive) return;
    event.preventDefault();
    window.show();
    window.focus();
  });

  window.on("minimize", (event) => {
    if (!examActive) return;
    event.preventDefault();
    window.restore();
    window.focus();
  });

  window.on("leave-full-screen", () => {
    if (!examActive) return;
    setImmediate(() => applyExamLock(true));
  });

  window.on("blur", () => {
    if (!examActive) return;
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed() || !examActive) return;
      mainWindow.show();
      mainWindow.focus();
    }, 100);
  });

  window.webContents.on("before-input-event", (event, input) => {
    if (!examActive || input.type !== "keyDown") return;

    const key = String(input.key || "").toLowerCase();
    const code = String(input.code || "").toLowerCase();
    const hasModifier = input.control || input.meta || input.alt;
    const blockedKeys = new Set([
      "escape",
      "f11",
      "f4",
      "tab",
      "browserback",
      "browserforward",
      "mediaplaypause",
      "volumeup",
      "volumedown",
      "volumemute",
    ]);
    const blockedCodes = new Set(["f11", "f4", "tab", "escape"]);
    const blockedModifierKeys = new Set(["r", "w", "q", "n", "t", "f4", "tab", "escape"]);

    if (
      blockedKeys.has(key) ||
      blockedCodes.has(code) ||
      (hasModifier && blockedModifierKeys.has(key))
    ) {
      event.preventDefault();
      window.focus();
    }
  });
}

function sendUpdateStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updates:status", payload);
  }
}

async function offerUpdateDownload() {
  if (!pendingUpdateInfo || examActive || updateDialogOpen || !mainWindow) return;
  updateDialogOpen = true;
  try {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "ADHI ARENA Update Available",
      message: `Version ${pendingUpdateInfo.version} is available.`,
      detail:
        "This update was released by the ADHI ARENA administrator. Download it now? You can continue using the app while it downloads.",
      buttons: ["Download Update", "Later"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (result.response === 0) {
      sendUpdateStatus({ state: "downloading", version: pendingUpdateInfo.version, percent: 0 });
      await autoUpdater.downloadUpdate();
      if (!downloadedUpdateInfo && pendingUpdateInfo) {
        downloadedUpdateInfo = pendingUpdateInfo;
        sendUpdateStatus({
          state: "downloaded",
          version: pendingUpdateInfo.version,
          percent: 100,
          message: "Downloaded. Click Install to restart and update.",
        });
      }
    } else {
      sendUpdateStatus({ state: "available", version: pendingUpdateInfo.version });
    }
  } catch (error) {
    sendUpdateStatus({ state: "error", message: error?.message || "Update download failed." });
  } finally {
    updateDialogOpen = false;
  }
}

async function offerRestartForUpdate() {
  if (!downloadedUpdateInfo || examActive || updateDialogOpen || !mainWindow) return;
  updateDialogOpen = true;
  try {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "question",
      title: "Restart ADHI ARENA",
      message: `Update ${downloadedUpdateInfo.version} is ready to install.`,
      detail: "Allow ADHI ARENA to restart now and complete the update?",
      buttons: ["Restart and Install", "Later"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (result.response === 0) {
      sendUpdateStatus({ state: "installing", version: downloadedUpdateInfo.version });
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
    } else {
      sendUpdateStatus({ state: "downloaded", version: downloadedUpdateInfo.version });
    }
  } finally {
    updateDialogOpen = false;
  }
}

async function downloadPendingUpdate() {
  if (downloadedUpdateInfo) {
    sendDownloadedUpdateStatus();
    return { ok: true, state: "downloaded" };
  }

  if (!pendingUpdateInfo) {
    const result = await autoUpdater.checkForUpdates();
    if (result?.updateInfo?.version && result.updateInfo.version !== app.getVersion()) {
      pendingUpdateInfo = result.updateInfo;
    }
  }

  if (!pendingUpdateInfo) {
    return { ok: false, message: "No update is available right now." };
  }

  sendUpdateStatus({ state: "downloading", version: pendingUpdateInfo.version, percent: 0 });
  await autoUpdater.downloadUpdate();

  if (!downloadedUpdateInfo && pendingUpdateInfo) {
    downloadedUpdateInfo = pendingUpdateInfo;
    persistDownloadedUpdate(downloadedUpdateInfo);
  }

  sendDownloadedUpdateStatus();
  return { ok: true, state: "downloaded" };
}

function setupAutoUpdater(window) {
  if (!app.isPackaged) {
    sendUpdateStatus({ state: "development", message: "Updates are checked in installed builds." });
    return;
  }

  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (error) {
    sendUpdateStatus({ state: "error", message: "The update service is unavailable." });
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;

  const persistedUpdate = loadPersistedDownloadedUpdate();
  if (persistedUpdate?.version && persistedUpdate.version !== app.getVersion()) {
    downloadedUpdateInfo = persistedUpdate;
    setTimeout(() => sendDownloadedUpdateStatus(), 1_000);
  } else if (persistedUpdate?.version === app.getVersion()) {
    clearPersistedDownloadedUpdate();
  }

  autoUpdater.on("checking-for-update", () => sendUpdateStatus({ state: "checking" }));
  autoUpdater.on("update-not-available", (info) => {
    pendingUpdateInfo = null;
    if (!downloadedUpdateInfo) clearPersistedDownloadedUpdate();
    sendUpdateStatus({ state: "current", version: info?.version || app.getVersion() });
  });
  autoUpdater.on("update-available", (info) => {
    pendingUpdateInfo = info;
    if (downloadedUpdateInfo?.version === info.version) {
      sendDownloadedUpdateStatus();
      return;
    }
    sendUpdateStatus({
      state: examActive ? "deferred" : "available",
      version: info.version,
      message: examActive ? "Update deferred until the active test ends." : undefined,
    });
  });
  autoUpdater.on("download-progress", (progress) =>
    sendUpdateStatus({
      state: "downloading",
      version: pendingUpdateInfo?.version,
      percent: Math.round(progress.percent || 0),
    }),
  );
  autoUpdater.on("update-downloaded", (info) => {
    downloadedUpdateInfo = info;
    persistDownloadedUpdate(info);
    sendDownloadedUpdateStatus();
  });
  autoUpdater.on("error", (error) =>
    sendUpdateStatus({ state: "error", message: error?.message || "Unable to check for updates." }),
  );

  setTimeout(() => autoUpdater.checkForUpdates().catch(() => undefined), 5_000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => undefined), 4 * 60 * 60 * 1000).unref();
}

ipcMain.handle("network:scan", () => scanNetworks());
ipcMain.handle("network:connect", (_event, request) => connectNetwork(request));
ipcMain.handle("network:open-location-settings", () => shell.openExternal("ms-settings:privacy-location"));
ipcMain.handle("updates:version", () => app.getVersion());
ipcMain.handle("updates:open-admin-release-page", () => shell.openExternal(RELEASE_WORKFLOW_URL));
ipcMain.handle("updates:check", async () => {
  if (!app.isPackaged) return { ok: false, message: "Update checks are available in installed builds." };
  if (!autoUpdater) return { ok: false, message: "The update service is not ready." };
  try {
    if (downloadedUpdateInfo) {
      sendDownloadedUpdateStatus();
      return { ok: true };
    }
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error?.message || "Unable to check for updates." };
  }
});
ipcMain.handle("updates:download", async () => {
  if (!app.isPackaged) return { ok: false, message: "Update downloads are available in installed builds." };
  if (!autoUpdater) return { ok: false, message: "The update service is not ready." };
  if (examActive) return { ok: false, message: "Finish the active test before downloading the update." };
  try {
    return await downloadPendingUpdate();
  } catch (error) {
    const message = error?.message || "Update download failed.";
    sendUpdateStatus({ state: "available", version: pendingUpdateInfo?.version, message });
    return { ok: false, message };
  }
});
ipcMain.handle("updates:install", async () => {
  if (!app.isPackaged) return { ok: false, message: "Update installation is available in installed builds." };
  if (!autoUpdater) return { ok: false, message: "The update service is not ready." };
  if (examActive) return { ok: false, message: "Finish the active test before installing the update." };
  if (!downloadedUpdateInfo) return { ok: false, message: "No downloaded update is ready to install." };

  sendUpdateStatus({ state: "installing", version: downloadedUpdateInfo.version });
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return { ok: true };
});
ipcMain.on("exam:set-active", (_event, active) => {
  applyExamLock(Boolean(active));
  if (!examActive) {
    if (downloadedUpdateInfo) {
      sendDownloadedUpdateStatus();
    }
    else if (pendingUpdateInfo) {
      sendUpdateStatus({ state: "available", version: pendingUpdateInfo.version });
    }
  }
});

async function createWindow() {
  const port = await findAvailablePort();
  const serverEntry = unpackedPath("dist-server", "server.cjs");
  const staticDirectory = unpackedPath("dist");

  serverProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOST: "127.0.0.1",
      APP_STATIC_DIR: staticDirectory,
    },
    stdio: "ignore",
    windowsHide: true,
  });

  serverProcess.on("exit", (code) => {
    if (code && !app.isQuitting) {
      dialog.showErrorBox("Adhi Arena", `The local server stopped unexpectedly (code ${code}).`);
    }
  });

  await waitForServer(port);

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow = window;
  installZoomControls(window);
  installExamWindowLock(window);
  window.once("ready-to-show", () => window.show());
  await window.loadURL(`http://127.0.0.1:${port}`);
  setupAutoUpdater(window);
}

app.whenReady().then(() => {
  createWindow().catch((error) => {
    dialog.showErrorBox("Unable to start Adhi Arena", error.message);
    app.quit();
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});

app.on("window-all-closed", () => app.quit());
