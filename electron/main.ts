import { app, BrowserWindow, session, Tray, Menu, nativeImage } from 'electron';
import { setupPhotonEngine } from '@photon-engine/electron';
import { registerHPDevices } from '@photon-engine/comm';
import path from 'node:path';

// 屏蔽安全警告（开发环境）
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let cleanup: (() => void) | undefined;
let isQuitting = false;

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
      backgroundThrottling: false, // 禁用后台节流，最小化时灯效持续运行
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 关闭窗口时最小化到托盘，而非退出
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.hide();
    }
  });

  win.on('closed', () => {
    win = null;
  });
}

function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC || path.join(__dirname, '..', 'public'), 'vite.svg');
  let icon = nativeImage.createFromPath(iconPath);
  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(icon);
  tray.setToolTip('PhotonEngine Demo');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        win?.show();
        win?.focus();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // 单击托盘图标切换窗口显示
  tray.on('click', () => {
    if (win?.isVisible()) {
      win.hide();
    } else {
      win?.show();
      win?.focus();
    }
  });
}

// 单例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // 允许屏幕采集权限
    session.defaultSession.setPermissionCheckHandler(() => true);
    session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(true));

    // 注册设备（必须在 setupPhotonEngine 之前）
    registerHPDevices([
      { vendorId: 0x457b, productId: 0x175c, usagePage: 0xff00, usage: 0x01 },
    ]);

    // 初始化 PhotonEngine
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
    createTray();
  });

  // 窗口全部关闭时不退出，保持托盘运行
  app.on('window-all-closed', () => {
    // 不调用 app.quit()，应用在托盘中继续运行
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('will-quit', () => {
    cleanup?.();
    tray?.destroy();
  });
}
