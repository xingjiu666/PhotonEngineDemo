<template>
  <el-container class="app-layout">
    <!-- 侧边导航 -->
    <el-aside width="180px" class="app-aside">
      <div class="logo">
        <span class="logo-icon">⚡</span>
        <span class="logo-text">PhotonEngine</span>
      </div>
      <el-menu :default-active="activeMenu" router class="side-menu">
        <el-menu-item index="/canvas">
          <el-icon><Brush /></el-icon>
          <span>Canvas 动画</span>
        </el-menu-item>
        <el-menu-item index="/music">
          <el-icon><Headset /></el-icon>
          <span>音乐律动</span>
        </el-menu-item>
        <el-menu-item index="/screen">
          <el-icon><Monitor /></el-icon>
          <span>屏幕同步</span>
        </el-menu-item>
        <el-menu-item index="/gif">
          <el-icon><Picture /></el-icon>
          <span>GIF 动画</span>
        </el-menu-item>
        <el-menu-item index="/device">
          <el-icon><Connection /></el-icon>
          <span>设备映射</span>
        </el-menu-item>
      </el-menu>

      <!-- 底部设备状态 -->
      <div class="device-status">
        <el-icon><Cpu /></el-icon>
        <span>设备: {{ deviceCount }} 台</span>
      </div>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 播放控制栏 -->
      <el-header height="60px" class="app-header">
        <PlayControls />
      </el-header>

      <el-main class="app-main">
        <!-- 预览区 -->
        <div class="preview-section">
          <EffectPreview :width="640" :height="360" />
        </div>

        <!-- 页面内容 -->
        <div class="page-section">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { Brush, Headset, Monitor, Picture, Connection, Cpu } from '@element-plus/icons-vue';
import PlayControls from './components/PlayControls.vue';
import EffectPreview from './components/EffectPreview.vue';
import { getEngine, initEngine } from './engine';

const route = useRoute();
const activeMenu = computed(() => route.path);
const deviceCount = ref(0);

let unsubDevice: (() => void) | null = null;

onMounted(async () => {
  // 初始化引擎并恢复上次的灯效/播放状态
  await initEngine();

  unsubDevice = getEngine().onDeviceChange((devices) => {
    deviceCount.value = devices.length;
  });
});

onUnmounted(() => {
  unsubDevice?.();
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html, body, #app {
  height: 100%;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}
</style>

<style scoped>
.app-layout {
  height: 100vh;
}
.app-aside {
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.logo-icon {
  font-size: 22px;
}
.side-menu {
  border-right: none;
  flex: 1;
}
.device-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-top: 1px solid var(--el-border-color-lighter);
}
.app-header {
  padding: 0;
  height: auto !important;
}
.app-main {
  padding: 20px;
  background: var(--el-fill-color-blank);
  overflow-y: auto;
}
.preview-section {
  max-width: 640px;
  margin-bottom: 20px;
}
.page-section {
  /* page content area */
}
</style>
