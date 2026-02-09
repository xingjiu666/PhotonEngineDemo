# PhotonEngine Demo

PhotonEngine SDK 功能演示项目，展示灯效生成、音频采集、屏幕采集、GIF 管理和设备通信等完整功能。

## 技术栈

- Electron 33 + Vue 3 + TypeScript
- Vite 6 + Element Plus
- @photon-engine/core + @photon-engine/electron

## 功能

- **Canvas 动画** — 13 种内置灯效，实时预览，动态配置
- **音乐律动** — 音频设备选择，8 种音乐灯效，颜色模式切换
- **屏幕同步** — 屏幕/窗口源选择，3 种同步模式
- **GIF 动画** — 导入 GIF/图片序列/HEF 文件，列表管理
- **设备映射** — 广播/独立模式，鼠标拖拽调整映射区域

## 运行

```bash
# 安装依赖
pnpm install

# 启动开发
pnpm run dev
```

## 项目结构

```
├── electron/
│   ├── main.ts          # Electron 主进程（setupPhotonEngine）
│   └── preload.ts       # 预加载脚本
├── src/
│   ├── main.ts          # Vue 入口 + 路由
│   ├── engine.ts        # PhotonEngine 单例
│   ├── App.vue          # 主布局
│   ├── components/
│   │   ├── EffectPreview.vue   # Canvas 预览
│   │   └── PlayControls.vue    # 播放控制栏
│   └── views/
│       ├── CanvasEffects.vue   # Canvas 动画页
│       ├── MusicEffects.vue    # 音乐律动页
│       ├── ScreenEffects.vue   # 屏幕同步页
│       ├── GifEffects.vue      # GIF 动画页
│       └── DeviceMapping.vue   # 设备映射页
└── package.json
```
