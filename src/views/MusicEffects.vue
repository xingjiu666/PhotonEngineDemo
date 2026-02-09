<template>
  <div class="music-page">
    <h3>音乐律动灯效</h3>
    <p class="desc">选择音频设备并切换音乐灯效，灯光将跟随音乐节奏变化。</p>

    <!-- 音频设备选择 -->
    <div class="section">
      <h4>音频设备</h4>
      <div class="device-row">
        <el-select v-model="selectedDevice" placeholder="选择音频设备" style="flex: 1" @change="onDeviceChange">
          <el-option-group v-for="group in deviceGroups" :key="group.label" :label="group.label">
            <el-option v-for="d in group.devices" :key="d.id" :label="d.label" :value="d.id" />
          </el-option-group>
        </el-select>
        <el-button :icon="Refresh" @click="refreshDevices" />
      </div>
    </div>

    <!-- 颜色模式 -->
    <div class="section">
      <h4>颜色模式</h4>
      <el-radio-group v-model="colorMode" @change="onColorModeChange">
        <el-radio-button value="rainbow">彩虹</el-radio-button>
        <el-radio-button value="solid">单色</el-radio-button>
        <el-radio-button value="gradient">渐变</el-radio-button>
      </el-radio-group>

      <div v-if="colorMode === 'solid'" style="margin-top: 12px">
        <el-color-picker v-model="solidColor" @change="onColorModeChange" />
      </div>
    </div>

    <!-- 灯效选择 -->
    <div class="section">
      <h4>灯效列表</h4>
      <div class="effect-grid">
        <div
          v-for="effect in effects"
          :key="effect.id"
          class="effect-card"
          :class="{ active: currentEffectId === effect.id }"
          @click="selectEffect(effect)"
        >
          <span class="effect-icon">{{ effect.icon || '🎵' }}</span>
          <span class="effect-name">{{ effect.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { getEngine, type EffectMeta } from '@/engine';

interface AudioDevice {
  id: string;
  label: string;
  type: string;
}

const engine = getEngine();
const effects = ref<EffectMeta[]>([]);
const currentEffectId = ref('');
const devices = ref<AudioDevice[]>([]);
const selectedDevice = ref('');
const colorMode = ref<'rainbow' | 'solid' | 'gradient'>('rainbow');
const solidColor = ref('#00ff00');

const deviceGroups = computed(() => {
  const groups: { label: string; devices: AudioDevice[] }[] = [];
  const loopback = devices.value.filter((d) => d.type === 'loopback');
  const mic = devices.value.filter((d) => d.type === 'microphone');
  const speaker = devices.value.filter((d) => d.type === 'speaker');
  if (loopback.length) groups.push({ label: '系统音频', devices: loopback });
  if (mic.length) groups.push({ label: '麦克风', devices: mic });
  if (speaker.length) groups.push({ label: '扬声器', devices: speaker });
  return groups;
});

onMounted(async () => {
  effects.value = engine.getEffectsByCategory('music' as any);
  await refreshDevices();
});

async function refreshDevices() {
  devices.value = (await engine.getAudioDevices()) as AudioDevice[];
}

async function onDeviceChange(deviceId: string) {
  await engine.setAudioDevice(deviceId);
}

async function selectEffect(effect: EffectMeta) {
  currentEffectId.value = effect.id;
  await engine.setEffect(effect.id, {
    colorConfig: {
      mode: colorMode.value,
      solidColor: solidColor.value,
      gradientColors: ['#ff0000', '#ffff00', '#00ff00'],
    },
  });
  engine.play();
}

function onColorModeChange() {
  engine.updateEffectConfig({
    colorConfig: {
      mode: colorMode.value,
      solidColor: solidColor.value,
      gradientColors: ['#ff0000', '#ffff00', '#00ff00'],
    },
  });
}
</script>

<style scoped>
.music-page h3 { margin-bottom: 4px; }
.desc { color: var(--el-text-color-secondary); font-size: 13px; margin-bottom: 16px; }
.section { margin-bottom: 20px; padding: 16px; background: var(--el-bg-color); border-radius: 8px; }
.section h4 { margin-bottom: 12px; }
.device-row { display: flex; gap: 8px; }
.effect-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
.effect-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px; border-radius: 8px; background: var(--el-fill-color-light);
  border: 2px solid transparent; cursor: pointer; transition: all 0.2s;
}
.effect-card:hover { border-color: var(--el-color-primary-light-5); }
.effect-card.active { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.effect-icon { font-size: 24px; }
.effect-name { font-size: 12px; text-align: center; }
</style>
