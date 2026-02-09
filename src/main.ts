import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import { createRouter, createWebHashHistory } from 'vue-router';

// 路由
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/canvas' },
    { path: '/canvas', component: () => import('./views/CanvasEffects.vue') },
    { path: '/music', component: () => import('./views/MusicEffects.vue') },
    { path: '/screen', component: () => import('./views/ScreenEffects.vue') },
    { path: '/gif', component: () => import('./views/GifEffects.vue') },
    { path: '/device', component: () => import('./views/DeviceMapping.vue') },
  ],
});

const app = createApp(App);

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(ElementPlus);
app.use(router);
app.mount('#app');
