<template>
  <div class="canvas-page">
    <h3>Canvas 动画灯效</h3>
    <p class="desc">选择一个灯效，引擎会实时在上方 Canvas 中渲染预览。</p>

    <!-- 灯效网格 -->
    <div class="effect-grid">
      <div
        v-for="effect in effects"
        :key="effect.id"
        class="effect-card"
        :class="{ active: currentEffectId === effect.id }"
        @click="selectEffect(effect)"
      >
        <span class="effect-icon">{{ effect.icon || '🎨' }}</span>
        <span class="effect-name">{{ effect.name }}</span>
      </div>
    </div>

    <!-- 当前灯效配置 -->
    <div v-if="currentDetail?.configSchema" class="config-section">
      <h4>灯效配置</h4>
      <el-form label-width="100px" size="small">
        <el-form-item
          v-for="(item, key) in currentDetail.configSchema"
          :key="key"
          :label="item.label"
        >
          <!-- 数值 -->
          <el-slider
            v-if="item.type === 'number'"
            :model-value="(currentConfig[key] as number) ?? item.default"
            :min="item.min"
            :max="item.max"
            :step="item.step || 1"
            style="width: 200px"
            @update:model-value="(val: number) => updateConfig(key, val)"
          />
          <!-- 颜色 -->
          <el-color-picker
            v-else-if="item.type === 'color'"
            :model-value="(currentConfig[key] as string) ?? item.default"
            @update:model-value="(val: string | null) => updateConfig(key, val)"
          />
          <!-- 布尔 -->
          <el-switch
            v-else-if="item.type === 'boolean'"
            :model-value="(currentConfig[key] as boolean) ?? item.default"
            @update:model-value="(val: boolean) => updateConfig(key, val)"
          />
          <!-- 选择 -->
          <el-select
            v-else-if="item.type === 'select'"
            :model-value="(currentConfig[key] as string) ?? item.default"
            style="width: 160px"
            @update:model-value="(val: string) => updateConfig(key, val)"
          >
            <el-option
              v-for="opt in item.options"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getEngine, type EffectMeta } from '@/engine';

const engine = getEngine();
const effects = ref<EffectMeta[]>([]);
const currentEffectId = ref('');
const currentConfig = ref<Record<string, unknown>>({});

const currentDetail = computed(() => {
  if (!currentEffectId.value) return null;
  return engine.getEffectDetail(currentEffectId.value);
});

onMounted(() => {
  effects.value = engine.getEffectsByCategory('canvas' as any);

  // 默认选中第一个
  const cur = engine.getCurrentEffect();
  if (cur) {
    currentEffectId.value = cur.id;
    currentConfig.value = cur.config;
  } else if (effects.value.length > 0) {
    selectEffect(effects.value[0]);
  }
});

async function selectEffect(effect: EffectMeta) {
  currentEffectId.value = effect.id;
  const defaults = engine.getEffectDefaultConfig(effect.id);
  currentConfig.value = { ...defaults };
  await engine.setEffect(effect.id, currentConfig.value);
  engine.play();
}

function updateConfig(key: string, value: unknown) {
  currentConfig.value = { ...currentConfig.value, [key]: value };
  engine.updateEffectConfig({ [key]: value });
}
</script>

<style scoped>
.canvas-page h3 {
  margin-bottom: 4px;
}
.desc {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-bottom: 16px;
}
.effect-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
  margin-bottom: 24px;
}
.effect-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border-radius: 8px;
  background: var(--el-bg-color);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.effect-card:hover {
  border-color: var(--el-color-primary-light-5);
}
.effect-card.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.effect-icon {
  font-size: 24px;
}
.effect-name {
  font-size: 12px;
  text-align: center;
  color: var(--el-text-color-primary);
}
.config-section {
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
}
.config-section h4 {
  margin-bottom: 12px;
}
</style>
