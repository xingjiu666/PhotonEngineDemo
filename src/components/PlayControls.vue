<template>
  <div class="play-controls">
    <el-button
      :type="state.isPlaying ? 'danger' : 'primary'"
      :icon="state.isPlaying ? 'VideoPause' : 'VideoPlay'"
      circle
      size="large"
      @click="togglePlay"
    />

    <div class="control-item">
      <span class="label">速度</span>
      <el-slider v-model="speed" :min="1" :max="100" :step="1" style="width: 120px" @change="onSpeedChange" />
      <span class="value">{{ speed }}</span>
    </div>

    <div class="control-item">
      <span class="label">亮度</span>
      <el-slider v-model="brightness" :min="0" :max="100" :step="1" style="width: 120px" @change="onBrightnessChange" />
      <span class="value">{{ brightness }}%</span>
    </div>

    <div class="control-item">
      <span class="label">FPS</span>
      <el-slider v-model="fps" :min="10" :max="60" :step="5" style="width: 100px" @change="onFpsChange" />
      <span class="value">{{ fps }}</span>
    </div>

    <div class="status">
      <el-tag :type="state.isPlaying ? 'success' : 'info'" size="small">
        {{ state.isPlaying ? '播放中' : '已暂停' }}
      </el-tag>
      <el-tag v-if="state.effectId" size="small" type="warning">
        {{ state.effectId }}
      </el-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { getEngine, type EngineStateSnapshot } from '@/engine';

const state = reactive<{ isPlaying: boolean; effectId: string | null }>({
  isPlaying: false,
  effectId: null,
});

const speed = ref(50);
const brightness = ref(80);
const fps = ref(30);

let unsubscribe: (() => void) | null = null;

onMounted(() => {
  unsubscribe = getEngine().subscribe((s: EngineStateSnapshot) => {
    state.isPlaying = s.isPlaying;
    state.effectId = s.effectId;
    speed.value = s.speed;
    brightness.value = s.brightness;
    fps.value = s.fps;
  });
});

onUnmounted(() => {
  unsubscribe?.();
});

function togglePlay() {
  const engine = getEngine();
  if (state.isPlaying) {
    engine.pause();
  } else {
    engine.play();
  }
}

function onSpeedChange(val: number) {
  getEngine().setSpeed(val);
}

function onBrightnessChange(val: number) {
  getEngine().setBrightness(val);
}

function onFpsChange(val: number) {
  getEngine().setFPS(val);
}
</script>

<style scoped>
.play-controls {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
.value {
  font-size: 13px;
  color: var(--el-text-color-primary);
  min-width: 36px;
  text-align: right;
}
.status {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
</style>
