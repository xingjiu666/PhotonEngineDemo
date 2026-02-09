/**
 * PhotonEngine 实例管理（单例）+ 状态持久化
 */
import {
  PhotonEngine,
  type EngineStateSnapshot,
  type EffectMeta,
  type FrameData,
  type DeviceInfo,
} from '@photon-engine/core';

export type { EngineStateSnapshot, EffectMeta, FrameData, DeviceInfo };

const STORAGE_KEY = 'photon-engine-demo-state';

let engine: PhotonEngine | null = null;
let initialized = false;

export function getEngine(): PhotonEngine {
  if (!engine) {
    engine = new PhotonEngine({
      width: 640,
      height: 360,
      fps: 30,
      brightness: 80,
    });

    // 触发初始设备扫描
    engine.getDeviceBridge().scan();
  }
  return engine;
}

/**
 * 初始化引擎并恢复上次的状态
 * 应在 App.vue onMounted 中调用一次
 */
export async function initEngine(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const eng = getEngine();

  // 恢复上次保存的状态
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const snapshot = JSON.parse(saved) as Partial<EngineStateSnapshot>;
      await eng.restoreSnapshot(snapshot);
    } catch {
      console.warn('[Demo] 恢复状态失败，使用默认配置');
    }
  }

  // 定期保存状态（每 3 秒）
  setInterval(() => {
    saveState();
  }, 3000);

  // 页面卸载前保存
  window.addEventListener('beforeunload', () => {
    saveState();
  });
}

/**
 * 保存当前引擎状态到 localStorage
 */
export function saveState(): void {
  if (!engine) return;
  try {
    const snapshot = engine.getSnapshot();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

export function destroyEngine(): void {
  saveState();
  engine?.destroy();
  engine = null;
  initialized = false;
}
