<template>
  <div class="effect-preview">
    <canvas ref="canvasRef" :width="width" :height="height" class="preview-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { getEngine } from '@/engine';

const props = withDefaults(defineProps<{ width?: number; height?: number }>(), {
  width: 640,
  height: 360,
});

const canvasRef = ref<HTMLCanvasElement>();
let unsubFrame: (() => void) | null = null;

onMounted(() => {
  const ctx = canvasRef.value?.getContext('2d');
  if (!ctx) return;

  unsubFrame = getEngine().onFrame((frame) => {
    ctx.putImageData(frame.imageData, 0, 0);
  });
});

onUnmounted(() => {
  unsubFrame?.();
});
</script>

<style scoped>
.effect-preview {
  border-radius: 8px;
  overflow: hidden;
  background: #0a0a14;
  line-height: 0;
}
.preview-canvas {
  width: 100%;
  height: auto;
  display: block;
}
</style>
