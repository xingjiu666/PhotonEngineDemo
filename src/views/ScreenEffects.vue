<template>
  <div class="screen-page">
    <h3>屏幕同步灯效</h3>
    <p class="desc">捕获屏幕或窗口画面，灯光与屏幕内容实时联动。</p>

    <!-- 屏幕源选择 -->
    <div class="section">
      <div class="section-header">
        <h4>屏幕源</h4>
        <el-button :icon="Refresh" size="small" @click="refreshSources">刷新</el-button>
      </div>
      <div class="source-grid">
        <div
          v-for="source in sources"
          :key="source.id"
          class="source-card"
          :class="{ active: selectedSource === source.id }"
          @click="selectSource(source)"
        >
          <img v-if="source.thumbnail" :src="source.thumbnail" class="source-thumb" />
          <div v-else class="source-thumb placeholder">
            <el-icon><Monitor /></el-icon>
          </div>
          <span class="source-name">{{ source.name }}</span>
          <el-tag size="small" :type="source.type === 'screen' ? 'primary' : 'info'">
            {{ source.type === 'screen' ? '屏幕' : '窗口' }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 灯效选择 -->
    <div class="section">
      <h4>同步模式</h4>
      <div class="effect-grid">
        <div
          v-for="effect in effects"
          :key="effect.id"
          class="effect-card"
          :class="{ active: currentEffectId === effect.id }"
          @click="selectEffect(effect)"
        >
          <span class="effect-icon">{{ effect.icon || '🖥️' }}</span>
          <span class="effect-name">{{ effect.name }}</span>
          <span class="effect-desc">{{ effect.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Refresh, Monitor } from '@element-plus/icons-vue';
import { getEngine, type EffectMeta } from '@/engine';

interface ScreenSource {
  id: string;
  name: string;
  thumbnail?: string;
  type: 'screen' | 'window';
}

const engine = getEngine();
const effects = ref<EffectMeta[]>([]);
const sources = ref<ScreenSource[]>([]);
const selectedSource = ref('');
const currentEffectId = ref('');

onMounted(async () => {
  effects.value = engine.getEffectsByCategory('screen' as any);
  await refreshSources();
});

async function refreshSources() {
  sources.value = (await engine.getScreenSources()) as ScreenSource[];
}

async function selectSource(source: ScreenSource) {
  selectedSource.value = source.id;
  await engine.setScreenSource(source.id);

  // 如果还没选灯效，默认选 average
  if (!currentEffectId.value && effects.value.length > 0) {
    await selectEffect(effects.value[0]);
  }
}

async function selectEffect(effect: EffectMeta) {
  currentEffectId.value = effect.id;
  await engine.setEffect(effect.id);
  engine.play();
}
</script>

<style scoped>
.screen-page h3 { margin-bottom: 4px; }
.desc { color: var(--el-text-color-secondary); font-size: 13px; margin-bottom: 16px; }
.section { margin-bottom: 20px; padding: 16px; background: var(--el-bg-color); border-radius: 8px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section h4 { margin-bottom: 12px; }
.source-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.source-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px; border-radius: 8px; background: var(--el-fill-color-light);
  border: 2px solid transparent; cursor: pointer; transition: all 0.2s;
}
.source-card:hover { border-color: var(--el-color-primary-light-5); }
.source-card.active { border-color: var(--el-color-primary); }
.source-thumb { width: 100%; height: 90px; object-fit: cover; border-radius: 4px; background: #1a1a2e; }
.source-thumb.placeholder { display: flex; align-items: center; justify-content: center; font-size: 32px; color: #666; }
.source-name { font-size: 12px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.effect-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.effect-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 14px 8px; border-radius: 8px; background: var(--el-fill-color-light);
  border: 2px solid transparent; cursor: pointer; transition: all 0.2s;
}
.effect-card:hover { border-color: var(--el-color-primary-light-5); }
.effect-card.active { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.effect-icon { font-size: 24px; }
.effect-name { font-size: 13px; font-weight: 500; }
.effect-desc { font-size: 11px; color: var(--el-text-color-secondary); text-align: center; }
</style>
