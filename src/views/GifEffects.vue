<template>
  <div class="gif-page">
    <h3>GIF 动画灯效</h3>
    <p class="desc">导入 GIF 动画或图片序列作为灯效，支持 HEF 文件导入导出。</p>

    <!-- 导入操作 -->
    <div class="section">
      <h4>导入</h4>
      <div class="import-row">
        <el-button type="primary" @click="importGif">
          <el-icon><Upload /></el-icon>
          导入 GIF
        </el-button>
        <el-button @click="importHef">
          <el-icon><FolderOpened /></el-icon>
          导入 HEF
        </el-button>
        <el-button @click="importImages">
          <el-icon><PictureFilled /></el-icon>
          导入图片序列
        </el-button>
      </div>
      <input ref="gifInput" type="file" accept=".gif" hidden @change="onGifSelected" />
      <input ref="hefInput" type="file" accept=".hef" hidden @change="onHefSelected" />
      <input ref="imgInput" type="file" accept="image/*" multiple hidden @change="onImagesSelected" />
    </div>

    <!-- GIF 列表 -->
    <div class="section">
      <div class="section-header">
        <h4>已导入 ({{ gifList.length }})</h4>
        <el-button size="small" @click="refreshList">刷新</el-button>
      </div>

      <el-empty v-if="gifList.length === 0" description="暂无 GIF 灯效" />

      <div v-else class="gif-grid">
        <div
          v-for="gif in gifList"
          :key="gif.id"
          class="gif-card"
          :class="{ active: currentGifId === gif.id }"
          @click="playGif(gif)"
        >
          <img v-if="gif.thumbnail" :src="gif.thumbnail" class="gif-thumb" />
          <div class="gif-info">
            <span class="gif-name">{{ gif.name }}</span>
            <span class="gif-meta">{{ gif.frameCount }} 帧 · {{ Math.round(gif.duration / 1000) }}s</span>
          </div>
          <div class="gif-actions">
            <el-button size="small" text @click.stop="exportGif(gif)">
              <el-icon><Download /></el-icon>
            </el-button>
            <el-button size="small" text type="danger" @click.stop="deleteGif(gif)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Upload, FolderOpened, PictureFilled, Download, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getEngine } from '@/engine';

interface GifEffect {
  id: string;
  name: string;
  thumbnail: string;
  frameCount: number;
  duration: number;
  importedAt: number;
}

const engine = getEngine();
const gifList = ref<GifEffect[]>([]);
const currentGifId = ref('');
const gifInput = ref<HTMLInputElement>();
const hefInput = ref<HTMLInputElement>();
const imgInput = ref<HTMLInputElement>();

onMounted(() => refreshList());

async function refreshList() {
  gifList.value = await engine.getGifEffects();
}

function importGif() { gifInput.value?.click(); }
function importHef() { hefInput.value?.click(); }
function importImages() { imgInput.value?.click(); }

async function onGifSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const result = await engine.importGif(file);
  if (result) {
    ElMessage.success(`导入成功: ${result.name}`);
    await refreshList();
  } else {
    ElMessage.error('导入失败');
  }
}

async function onHefSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const result = await engine.importHef(file);
  if (result) {
    ElMessage.success(`导入成功: ${result.name}`);
    await refreshList();
  } else {
    ElMessage.error('导入失败');
  }
}

async function onImagesSelected(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || []);
  if (files.length === 0) return;
  const result = await engine.importImages(files, `图片序列-${files.length}张`, 15, true);
  if (result) {
    ElMessage.success(`导入成功: ${result.name}`);
    await refreshList();
  } else {
    ElMessage.error('导入失败');
  }
}

async function playGif(gif: GifEffect) {
  currentGifId.value = gif.id;
  await engine.setEffect(gif.id);
  engine.play();
}

async function exportGif(gif: GifEffect) {
  await engine.exportGif(gif.id);
  ElMessage.success('导出成功');
}

async function deleteGif(gif: GifEffect) {
  await ElMessageBox.confirm(`确定删除 "${gif.name}" 吗？`, '删除确认');
  engine.deleteGif(gif.id);
  ElMessage.success('已删除');
  await refreshList();
}
</script>

<style scoped>
.gif-page h3 { margin-bottom: 4px; }
.desc { color: var(--el-text-color-secondary); font-size: 13px; margin-bottom: 16px; }
.section { margin-bottom: 20px; padding: 16px; background: var(--el-bg-color); border-radius: 8px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section h4 { margin-bottom: 12px; }
.import-row { display: flex; gap: 10px; }
.gif-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.gif-card {
  display: flex; flex-direction: column; border-radius: 8px; overflow: hidden;
  background: var(--el-fill-color-light); border: 2px solid transparent; cursor: pointer; transition: all 0.2s;
}
.gif-card:hover { border-color: var(--el-color-primary-light-5); }
.gif-card.active { border-color: var(--el-color-primary); }
.gif-thumb { width: 100%; height: 100px; object-fit: cover; background: #1a1a2e; }
.gif-info { padding: 8px 10px 4px; }
.gif-name { font-size: 13px; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gif-meta { font-size: 11px; color: var(--el-text-color-secondary); }
.gif-actions { display: flex; justify-content: flex-end; padding: 2px 6px 6px; }
</style>
