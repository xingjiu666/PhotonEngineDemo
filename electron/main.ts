import { app, BrowserWindow, session } from 'electron';
import { setupPhotonEngine } from '@photon-engine/electron';
import { registerHPDevices } from '@photon-engine/comm';
import path from 'node:path';

// 屏蔽安全警告（开发环境）
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
let win: BrowserWindow | null = null;
let cleanup: (() => void) | undefined;

function createWindow() {
  win = new BrowserWindow({
    title: 'PhotonEngine Demo',
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  // 允许屏幕采集权限
  session.defaultSession.setPermissionCheckHandler(() => true);
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(true));

  // 注册设备（必须在 setupPhotonEngine 之前）
  registerHPDevices([
    { vendorId: 0x457b, productId: 0x175c, usagePage: 0xff00, usage: 0x01 },
  ]);

  // 初始化 PhotonEngine（设备通信需要 node-hid）
  try {
    const HID = require('node-hid');
    cleanup = setupPhotonEngine({
      hidModule: HID,
      scanInterval: 3000,
      debug: true,
    });
  } catch {
    console.warn('[Demo] node-hid 未安装，设备通信不可用');
    cleanup = setupPhotonEngine({ debug: true });
  }

  createWindow();
});

app.on('window-all-closed', () => {
  cleanup?.();
  app.quit();
});
