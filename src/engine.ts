/**
 * PhotonEngine 实例管理（单例）
 */
import {
  PhotonEngine,
  type EngineStateSnapshot,
  type EffectMeta,
  type FrameData,
  type DeviceInfo,
} from '@photon-engine/core';

export type { EngineStateSnapshot, EffectMeta, FrameData, DeviceInfo };

let engine: PhotonEngine | null = null;

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

export function destroyEngine(): void {
  engine?.destroy();
  engine = null;
}
