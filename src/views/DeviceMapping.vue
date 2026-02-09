<template>
  <div class="device-mapping">
    <!-- 左侧：设备列表 -->
    <div class="device-panel">
      <div class="panel-header">
        <span class="panel-title">设备列表 ({{ devices.length }})</span>
        <el-button size="small" text @click="scanDevices">
          <el-icon><Search /></el-icon>
        </el-button>
      </div>

      <!-- 模式切换 -->
      <div class="mode-switch">
        <el-radio-group v-model="mappingMode" size="small" @change="onModeChange">
          <el-radio-button value="broadcast">广播</el-radio-button>
          <el-radio-button value="individual">独立</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 设备列表 -->
      <div class="device-list">
        <div
          v-for="m in mappings"
          :key="m.deviceId"
          class="device-card"
          :class="{ selected: selectedDeviceId === m.deviceId, disabled: !m.enabled }"
          @click="selectDevice(m.deviceId)"
        >
          <div class="device-color" :style="{ background: m.color }" />
          <div class="device-info">
            <span class="device-name">{{ m.deviceName }}</span>
            <span class="device-rect">
              {{ m.selection ? `${Math.round(m.selection.width)}×${Math.round(m.selection.height)}` : '全画布' }}
            </span>
          </div>
          <el-switch
            :model-value="m.enabled"
            size="small"
            @change="(val: boolean) => toggleDevice(m.deviceId, val)"
            @click.stop
          />
        </div>

        <el-empty v-if="mappings.length === 0" description="未发现设备" :image-size="60" />
      </div>

      <div class="panel-footer">
        <el-button size="small" @click="resetAllMappings">重置全部映射</el-button>
      </div>
    </div>

    <!-- 右侧：映射编辑器 -->
    <div class="editor-panel">
      <div class="panel-header">
        <span class="panel-title">映射编辑</span>
        <div class="zoom-controls">
          <el-button size="small" text @click="zoom = Math.max(0.5, zoom - 0.1)">-</el-button>
          <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
          <el-button size="small" text @click="zoom = Math.min(2, zoom + 0.1)">+</el-button>
          <el-button size="small" text @click="zoom = 1">适应</el-button>
        </div>
      </div>

      <!-- 编辑画布 -->
      <div class="editor-viewport">
        <div
          ref="editorRef"
          class="editor-canvas"
          :style="{ width: CW + 'px', height: CH + 'px', transform: `scale(${zoom})` }"
          @mousedown="handleCanvasMouseDown"
        >
          <!-- 灯效预览背景 -->
          <canvas ref="bgCanvasRef" :width="CW" :height="CH" class="bg-canvas" />

          <!-- 设备映射框 -->
          <div
            v-for="m in enabledMappings"
            :key="m.deviceId"
            class="device-frame"
            :class="{ selected: selectedDeviceId === m.deviceId, dragging: draggingId === m.deviceId }"
            :style="frameStyle(m)"
            @mousedown.stop="startDrag(m.deviceId, $event)"
          >
            <div class="frame-label" :style="{ background: m.color }">{{ m.deviceName }}</div>
            <div class="frame-size">
              {{ Math.round((m.selection?.width ?? CW)) }}×{{ Math.round((m.selection?.height ?? CH)) }}
            </div>
            <!-- 四角 resize 手柄 -->
            <div class="handle nw" @mousedown.stop="startResize(m.deviceId, 'nw', $event)" />
            <div class="handle ne" @mousedown.stop="startResize(m.deviceId, 'ne', $event)" />
            <div class="handle sw" @mousedown.stop="startResize(m.deviceId, 'sw', $event)" />
            <div class="handle se" @mousedown.stop="startResize(m.deviceId, 'se', $event)" />
          </div>

          <!-- 绘制中的选区 -->
          <div v-if="isDrawing" class="drawing-rect" :style="drawingStyle" />
        </div>
      </div>

      <!-- 状态栏 -->
      <div class="status-bar">
        <span>{{ selectedDeviceName }}</span>
        <span>{{ selectedDeviceRect }}</span>
        <span>画布 {{ CW }}×{{ CH }}</span>
        <span v-if="mappingMode === 'individual' && selectedDeviceId" class="hint">
          在画布上拖拽绘制选区，或拖动已有框调整
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { getEngine } from '@/engine';

// ==================== 常量 ====================
const CW = 640;
const CH = 360;
const MIN_SIZE = 30;

interface SelectionRect { x: number; y: number; width: number; height: number }
interface Mapping {
  deviceId: string;
  deviceName: string;
  enabled: boolean;
  color: string;
  lightAreas: { areaId: number; rows: number; cols: number }[];
  selection: SelectionRect | null;
}

// ==================== State ====================
const engine = getEngine();
const devices = ref<any[]>([]);
const mappings = ref<Mapping[]>([]);
const mappingMode = ref<'broadcast' | 'individual'>('broadcast');
const selectedDeviceId = ref<string | null>(null);
const zoom = ref(1);
const editorRef = ref<HTMLDivElement>();
const bgCanvasRef = ref<HTMLCanvasElement>();

const enabledMappings = computed(() => mappings.value.filter((m) => m.enabled));
const selectedMapping = computed(() => mappings.value.find((m) => m.deviceId === selectedDeviceId.value));
const selectedDeviceName = computed(() => selectedMapping.value?.deviceName ?? '未选择设备');
const selectedDeviceRect = computed(() => {
  const sel = selectedMapping.value?.selection;
  return sel ? `${Math.round(sel.x)},${Math.round(sel.y)} ${Math.round(sel.width)}×${Math.round(sel.height)}` : '全画布';
});

// ==================== 预览更新 ====================
let previewTimer: ReturnType<typeof setInterval> | null = null;
let unsubDevice: (() => void) | null = null;
let unsubState: (() => void) | null = null;
let unsubFrame: (() => void) | null = null;

onMounted(() => {
  unsubDevice = engine.onDeviceChange((d) => {
    devices.value = d;
    refreshMappings();
  });

  unsubState = engine.subscribe((state) => {
    mappingMode.value = state.mappingMode as 'broadcast' | 'individual';
  });

  // 将灯效帧绘制到背景 canvas
  unsubFrame = engine.onFrame((frame) => {
    const ctx = bgCanvasRef.value?.getContext('2d');
    if (ctx) ctx.putImageData(frame.imageData, 0, 0);
  });
});

onUnmounted(() => {
  unsubDevice?.();
  unsubState?.();
  unsubFrame?.();
  if (previewTimer) clearInterval(previewTimer);
});

function refreshMappings() {
  mappings.value = engine.getDeviceLightMappings() as Mapping[];
}

// ==================== 操作 ====================
function scanDevices() { engine.getDeviceBridge().scan(); }
function selectDevice(id: string) { selectedDeviceId.value = id; }

function onModeChange(mode: 'broadcast' | 'individual') {
  engine.setMappingMode(mode);
}

function toggleDevice(id: string, enabled: boolean) {
  engine.setDeviceEnabled(id, enabled);
  refreshMappings();
}

function resetAllMappings() {
  mappings.value.forEach((m) => {
    engine.setDeviceSelection(m.deviceId, null);
  });
  engine.setGlobalSelection(null);
  refreshMappings();
}

function frameStyle(m: Mapping) {
  const sel = m.selection ?? { x: 0, y: 0, width: CW, height: CH };
  return {
    left: sel.x + 'px',
    top: sel.y + 'px',
    width: sel.width + 'px',
    height: sel.height + 'px',
    borderColor: m.color,
  };
}

// ==================== 坐标工具 ====================
function canvasXY(e: MouseEvent): { x: number; y: number } {
  const rect = editorRef.value?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return {
    x: Math.max(0, Math.min(CW, (e.clientX - rect.left) / zoom.value)),
    y: Math.max(0, Math.min(CH, (e.clientY - rect.top) / zoom.value)),
  };
}

function clampRect(r: SelectionRect): SelectionRect {
  let { x, y, width, height } = r;
  x = Math.max(0, x);
  y = Math.max(0, y);
  width = Math.max(MIN_SIZE, Math.min(width, CW - x));
  height = Math.max(MIN_SIZE, Math.min(height, CH - y));
  return { x, y, width, height };
}

function applySelection(deviceId: string, sel: SelectionRect) {
  if (mappingMode.value === 'broadcast') {
    engine.setGlobalSelection(sel);
  } else {
    engine.setDeviceSelection(deviceId, sel);
  }
  refreshMappings();
}

// ==================== 拖拽移动 ====================
const draggingId = ref<string | null>(null);
const dragOrigin = reactive({ mx: 0, my: 0, sx: 0, sy: 0 });

function startDrag(deviceId: string, e: MouseEvent) {
  if (mappingMode.value === 'broadcast') return;
  draggingId.value = deviceId;
  selectedDeviceId.value = deviceId;

  const m = mappings.value.find((m) => m.deviceId === deviceId);
  const sel = m?.selection ?? { x: 0, y: 0, width: CW, height: CH };
  dragOrigin.mx = e.clientX;
  dragOrigin.my = e.clientY;
  dragOrigin.sx = sel.x;
  dragOrigin.sy = sel.y;

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(e: MouseEvent) {
  if (!draggingId.value) return;
  const dx = (e.clientX - dragOrigin.mx) / zoom.value;
  const dy = (e.clientY - dragOrigin.my) / zoom.value;

  const m = mappings.value.find((m) => m.deviceId === draggingId.value);
  const sel = m?.selection ?? { x: 0, y: 0, width: CW, height: CH };

  const newX = Math.max(0, Math.min(CW - sel.width, dragOrigin.sx + dx));
  const newY = Math.max(0, Math.min(CH - sel.height, dragOrigin.sy + dy));

  applySelection(draggingId.value!, { x: newX, y: newY, width: sel.width, height: sel.height });
}

function onDragEnd() {
  draggingId.value = null;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
}

// ==================== 调整大小 ====================
type Handle = 'nw' | 'ne' | 'sw' | 'se';
const resizingId = ref<string | null>(null);
const resizeDir = ref<Handle | null>(null);
const resizeOrigin = reactive({ mx: 0, my: 0, rect: { x: 0, y: 0, width: 0, height: 0 } });

function startResize(deviceId: string, handle: Handle, e: MouseEvent) {
  if (mappingMode.value === 'broadcast') return;
  resizingId.value = deviceId;
  resizeDir.value = handle;
  selectedDeviceId.value = deviceId;

  const m = mappings.value.find((m) => m.deviceId === deviceId);
  const sel = m?.selection ?? { x: 0, y: 0, width: CW, height: CH };
  resizeOrigin.mx = e.clientX;
  resizeOrigin.my = e.clientY;
  resizeOrigin.rect = { ...sel };

  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeEnd);
}

function onResizeMove(e: MouseEvent) {
  if (!resizingId.value || !resizeDir.value) return;
  const dx = (e.clientX - resizeOrigin.mx) / zoom.value;
  const dy = (e.clientY - resizeOrigin.my) / zoom.value;
  const r = { ...resizeOrigin.rect };

  switch (resizeDir.value) {
    case 'nw': r.x += dx; r.y += dy; r.width -= dx; r.height -= dy; break;
    case 'ne': r.y += dy; r.width += dx; r.height -= dy; break;
    case 'sw': r.x += dx; r.width -= dx; r.height += dy; break;
    case 'se': r.width += dx; r.height += dy; break;
  }

  applySelection(resizingId.value!, clampRect(r));
}

function onResizeEnd() {
  resizingId.value = null;
  resizeDir.value = null;
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
}

// ==================== 绘制新选区 ====================
const isDrawing = ref(false);
const drawStart = reactive({ x: 0, y: 0 });
const drawCurrent = reactive({ x: 0, y: 0 });

const drawingStyle = computed(() => {
  const x = Math.min(drawStart.x, drawCurrent.x);
  const y = Math.min(drawStart.y, drawCurrent.y);
  const w = Math.abs(drawCurrent.x - drawStart.x);
  const h = Math.abs(drawCurrent.y - drawStart.y);
  return { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' };
});

function handleCanvasMouseDown(e: MouseEvent) {
  if (mappingMode.value === 'broadcast') return;
  if (!selectedDeviceId.value) return;
  if (draggingId.value || resizingId.value) return;

  const pos = canvasXY(e);
  isDrawing.value = true;
  drawStart.x = pos.x;
  drawStart.y = pos.y;
  drawCurrent.x = pos.x;
  drawCurrent.y = pos.y;

  document.addEventListener('mousemove', onDrawMove);
  document.addEventListener('mouseup', onDrawEnd);
}

function onDrawMove(e: MouseEvent) {
  if (!isDrawing.value) return;
  const pos = canvasXY(e);
  drawCurrent.x = pos.x;
  drawCurrent.y = pos.y;
}

function onDrawEnd() {
  if (!isDrawing.value || !selectedDeviceId.value) return;

  const x = Math.min(drawStart.x, drawCurrent.x);
  const y = Math.min(drawStart.y, drawCurrent.y);
  const w = Math.abs(drawCurrent.x - drawStart.x);
  const h = Math.abs(drawCurrent.y - drawStart.y);

  if (w > MIN_SIZE && h > MIN_SIZE) {
    applySelection(selectedDeviceId.value, clampRect({ x, y, width: w, height: h }));
  }

  isDrawing.value = false;
  document.removeEventListener('mousemove', onDrawMove);
  document.removeEventListener('mouseup', onDrawEnd);
}
</script>

<style scoped>
.device-mapping {
  display: flex;
  gap: 16px;
  height: 480px;
}

/* ===== 左侧设备面板 ===== */
.device-panel {
  display: flex;
  flex-direction: column;
  width: 240px;
  flex-shrink: 0;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.panel-title { font-size: 13px; font-weight: 600; }
.mode-switch { padding: 8px 14px; border-bottom: 1px solid var(--el-border-color-lighter); }
.device-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.panel-footer { padding: 10px 14px; border-top: 1px solid var(--el-border-color-lighter); }

.device-card {
  display: flex; align-items: center; gap: 8px;
  padding: 10px; border-radius: 6px; cursor: pointer;
  border: 2px solid transparent; transition: all 0.15s;
  background: var(--el-fill-color-light);
}
.device-card:hover { border-color: var(--el-color-primary-light-5); }
.device-card.selected { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.device-card.disabled { opacity: 0.45; }
.device-color { width: 4px; height: 28px; border-radius: 2px; flex-shrink: 0; }
.device-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.device-name { font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.device-rect { font-size: 10px; color: var(--el-text-color-secondary); font-family: monospace; }

/* ===== 右侧编辑面板 ===== */
.editor-panel {
  flex: 1; display: flex; flex-direction: column; min-width: 0;
  background: var(--el-bg-color); border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}
.zoom-controls { display: flex; align-items: center; gap: 4px; }
.zoom-value { font-size: 12px; color: var(--el-text-color-secondary); min-width: 40px; text-align: center; font-family: monospace; }
.editor-viewport {
  flex: 1; display: flex; justify-content: center; align-items: center;
  overflow: hidden; background: #111; margin: 0 12px; border-radius: 6px;
}
.editor-canvas {
  position: relative; transform-origin: center; border-radius: 4px; overflow: hidden;
}
.bg-canvas { display: block; }

/* ===== 设备映射框 ===== */
.device-frame {
  position: absolute; border: 2px solid; border-radius: 4px;
  background: rgba(255,255,255,0.06); cursor: move;
  display: flex; flex-direction: column; transition: box-shadow 0.15s;
}
.device-frame:hover, .device-frame.selected { box-shadow: 0 0 10px rgba(255,255,255,0.2); }
.device-frame.dragging { opacity: 0.7; }
.frame-label {
  height: 18px; display: flex; align-items: center; justify-content: center;
  border-radius: 2px 2px 0 0; color: #fff; font-size: 9px; font-weight: 600;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 0 4px;
}
.frame-size {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.4); font-size: 10px; font-family: monospace;
}

/* resize 手柄 */
.handle {
  position: absolute; width: 10px; height: 10px;
  background: var(--el-color-primary); border: 2px solid #fff;
  border-radius: 50%; opacity: 0; transition: opacity 0.15s;
}
.device-frame:hover .handle, .device-frame.selected .handle { opacity: 1; }
.handle.nw { top: -5px; left: -5px; cursor: nw-resize; }
.handle.ne { top: -5px; right: -5px; cursor: ne-resize; }
.handle.sw { bottom: -5px; left: -5px; cursor: sw-resize; }
.handle.se { bottom: -5px; right: -5px; cursor: se-resize; }

/* 绘制中的选区 */
.drawing-rect {
  position: absolute; border: 2px dashed var(--el-color-primary);
  background: rgba(64, 158, 255, 0.1); pointer-events: none;
}

/* 状态栏 */
.status-bar {
  display: flex; gap: 16px; padding: 8px 14px;
  border-top: 1px solid var(--el-border-color-lighter);
  font-size: 11px; color: var(--el-text-color-secondary); font-family: monospace;
}
.hint { color: var(--el-color-primary); font-family: inherit; }
</style>
