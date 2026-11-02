export const WEBGPU_COURSE = {
  title: "Three.js × WebGPU：交互式 3D 与性能实战",
  description: "原创中文3D开发实训。浏览器直接操作三维场景，切换WebGPU/WebGL2后端、调整实例数量，学习如何做可复现的跨设备渲染测量。",
  slug: "webgpu-basics",
  createdAt: "2026-11-02",
  updatedAt: "2026-11-02",
  version: "1.0",
  prerequisite: "JavaScript ES Modules、基础向量概念、Node.js 20+",
  duration: "建议3—5小时",
  downloadable: "/skill-labs/webgpu-basics/orbit-lab.zip",
  topics: [
    {
      title: "01｜区分 WebGPU、WebGL2 和 Three.js",
      paragraphs: [
        "WebGPU 是浏览器提供的底层图形与计算接口；Three.js 是上层三维引擎。它们不属于同一抽象层次：本课程使用 Three.js 的 WebGPURenderer，以 WebGPU 作为优先后端，设备不支持时可回退 WebGL2，而不是在每台手机上假称使用了 WebGPU。",
        "WebGPU 需要受信任的 HTTPS 或本机安全上下文，并非所有浏览器与 GPU 都可用。首次打开场景时先检查“实际渲染后端”指示，再进行结果记录。本课程以 Three.js r186 示例工程为基准，后续升级依赖时应重新核实 API。",
        "官方迁移文档指出原来的 ShaderMaterial、onBeforeCompile 和老 EffectComposer 不能机械迁移到 WebGPURenderer，需要理解 TSL 节点材质与新版后处理架构。只改 import 不等于迁移成功。"
      ],
      task: "在桌面与手机各打开一次实验，分别记录页面显示的后端与浏览器版本。"
    },
    {
      title: "02｜从几何体到可控的三维相机",
      paragraphs: [
        "一个基本渲染循环包含 Scene、PerspectiveCamera、Geometry、Material、Mesh 和 Renderer。相机的视场角、近远裁剪面与渲染窗口宽高比共同决定可见范围；改变画布大小后必须同步更新相机 aspect 与 projection matrix。",
        "本实验把一组正二十面体放在螺旋排列的三维坐标中，按时间改变整体旋转。所有几何位置都由公式生成，没有搬运第三方 3D 模型。你可以修改半径、层数、颜色与运动方式，比较画面构图和性能的变化。"
      ],
      task: "修改源码中的相机位置和物体分布，让场景保持不遮挡，同时解释改变了哪些投影参数。"
    },
    {
      title: "03｜为什么 InstancedMesh 能减少提交开销",
      paragraphs: [
        "大量共享几何和材质的小物体若各自创建一个 Mesh，会产生大量对象管理与绘制提交。InstancedMesh 将每个实例的变换矩阵装入一个批次，通常能降低 CPU 到 GPU 的提交开销，但 GPU 顶点/像素工作量仍随可见物体数量增长。",
        "实验提供 64、256、1024 三档实例数量，分别进行持续测量。不要把一次 FPS 的随机涨落写成性能提升：需要固定浏览器缩放、DPR、窗口大小、后台负载、浏览器版本与设备，并多次取样。",
        "实例数量越大并不保证越好看或越流畅。业务设计应从用户体验所需的细节数量反推；可见性裁剪、LOD、实例化和着色器复杂度需要综合选择。"
      ],
      task: "比较64与1024实例时实际帧率，记录同一设备三次结果，并标明是否存在后台程序干扰。"
    },
    {
      title: "04｜材质、光照与性能的取舍",
      paragraphs: [
        "MeshStandardNodeMaterial 基于物理表面参数，其中 roughness 影响高光扩散、metalness 影响材质的金属特征；光照和色彩空间也会影响最终视觉。课程使用独立设定的不同实例色彩来展示这一机制。",
        "复杂材质、阴影贴图和高分辨率后处理并不是越多越好。实际作品应分离“几何复杂度”和“着色计算量”两个变量，在保持视觉目标的前提下测试。否则无法解释性能变化究竟由哪种改动造成。"
      ],
      task: "固定实例数量，只调整粗糙度和金属度，保存对比截图并描述差异。"
    },
    {
      title: "05｜同一场景如何比较不同后端",
      paragraphs: [
        "切换为“强制 WebGL2”时，使用的是同一个 Three.js WebGPURenderer 的 WebGL2 后端，而不是另一个 WebGLRenderer。这让基础场景代码尽量一致，但不同后端并非完全等价：纹理、混合、后处理和驱动差异可能改变结果。",
        "若自动模式也回退为 WebGL2，则这台设备上没有形成 WebGPU 与 WebGL2 的对照，不能把两组 WebGL2 数据伪称跨API实验。页面会显示实际后端，记录时必须保留它。",
        "浏览器内显示的 FPS 是交互时段的粗略估算，用来判断明显变化；不是实验室级 benchmark，也不能作为所有设备性能排名。正式报告还需要 GPU timing、p95 帧时、运行温度、机器功耗等更多证据。"
      ],
      task: "切换两种模式，确认标签是否不同；如果相同，解释为什么本机不能证明 WebGPU 更快。"
    },
    {
      title: "06｜面向真实移动设备的设计",
      paragraphs: [
        "手机屏幕小、DPR 高且可能发生频繁降频。课程演示将渲染像素比限制在合理范围，并在尺寸变化时更新相机。实际移动产品还应设计触摸操作、画面降级、后台暂停、输入元素可点击区域，以及设备性能分档。",
        "内存消耗既包括 JS 对象，也包括 GPU 缓冲、纹理和帧缓冲。切换场景或离开页面时应停止动画，释放几何材质与 renderer。只从屏幕上删掉 canvas 不等于 GPU 资源已经销毁。",
        "兼容性要从实际设备测起。Android Chrome、iOS Safari、Windows Chrome、Linux Chrome 的 WebGPU 可用性与驱动路径可能不同，不应推断一机通过就代表全平台通过。"
      ],
      task: "在真实手机上验证旋转、滑块、切换模式、离开页面后资源清理，记录至少一个可重现的兼容性事实。"
    },
    {
      title: "07｜做一次可信的性能记录",
      paragraphs: [
        "建立实验表：设备/GPU、操作系统、浏览器和Three.js版本、实际后端、窗口像素尺寸、DPR、实例数量、测试时长、FPS分布、是否触发降频，以及后台应用状态。",
        "同一组条件至少重复三次，不要从波动的即时FPS挑一个最高值对外宣传。先报告原始观察结果，再讨论因果解释。切记不同后端的显示精度、光照、渲染质量要尽量保持一致。",
        "如果无法使用GPU时间戳查询，至少保存浏览器性能记录、脚本版本、实验操作说明和原始样本。对外销售的性能优化教程，必须能让买家在自己的设备上复验。"
      ],
      task: "输出一份表格，比较两档实例数量在两种可用模式中的结果，并写清测试限制。"
    },
    {
      title: "08｜项目交付与作品验收",
      paragraphs: [
        "综合作品要求：一个原创三维场景，至少一个可操作控件、明确的实际后端显示、可复现源码与 README、一次桌面和手机测试，以及至少三例失败或兼容性处理记录。不要仅交一张漂亮渲染图。",
        "本站参考评分：视觉与交互25%、结构与正确性35%、跨端适配20%、实测与可复现性20%。这是原创学习项目评分参考，不是 Three.js 官方认证，也不是企业招聘真题。",
        "压缩包内含独立 Vite 演示项目；安装依赖并运行后，你可以完整修改渲染场景。完成作品后再考虑进一步学习 TSL、计算着色器、后处理、空间交互与行业应用。"
      ],
      task: "提交完整源码、运行截图、性能对照表与 README，确保另一位学习者能够独立复现。"
    }
  ],
  sources: [
    {title:"Three.js WebGPURenderer 官方技术指南",href:"https://threejs.org/manual/pages/webgpurenderer"},
    {title:"Three.js WebGPURenderer API",href:"https://threejs.org/docs/pages/WebGPURenderer.html"},
    {title:"MDN WebGPU 浏览器兼容与安全上下文",href:"https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API"}
  ]
} as const;
