# SOC THINK · Three.js WebGPU 原创三维实操项目

版本 1.0 · 2026-11-02 · Three.js 0.186.0

## 一键运行（本地开发环境）

需要 Node.js 20.19+、npm、支持 WebGL2 的现代浏览器。若浏览器同时支持 WebGPU，则自动模式会优先尝试 WebGPU；否则回退 WebGL2。

```bash
npm ci
npm run dev
```

终端会提供本地地址，通常为 http://127.0.0.1:5173 。浏览器打开后应显示动态三维实例、实际后端、即时FPS。

打包：
```bash
npm run build
```

## 项目内容

- `index.html`：独立页面与控制组件
- `src/main.js`：Three.js WebGPURenderer、实例变换与动画、后端报告
- `package.json` / `package-lock.json`：安装与版本依据
- `PERFORMANCE_LOG_TEMPLATE.csv`：个人实验记录模板

## 实操目标

1. 分别将实例数量调整为 64、256、1024。
2. 比较“WebGPU优先”和“强制WebGL2”两种模式，并**记录实际后端**。
3. 固定同一设备和窗口条件下重复 3 次，每次至少观察 30 秒。
4. 调整几何体分布、材质和相机位置，独立实现一个新场景。
5. 使用其他一台真实设备运行，记录遇到的兼容性问题。

## 关于 FPS 的重要限制

即时FPS不是精密基准：它受浏览器刷新率、后台负载、GPU驱动、温度、DPR和实例位置影响。两次测试若都显示WebGL2就不能声称比较了不同API性能。指标必须配合实际设备、浏览器与画面质量记录。

## 技术原始依据

- https://threejs.org/manual/pages/webgpurenderer
- https://threejs.org/docs/pages/WebGPURenderer.html
- https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API

本站独立制作教学案例，未取得Three.js官方课程认证。代码请按本站数字内容使用条款用于个人学习及工程修改，完整教程、商标和课程体系不得冒称官方或第三方授权。
