"use client";

import {useEffect,useRef,useState} from "react";
import style from "@/app/skill-labs/webgpu-basics/webgpu.module.css";

type BackendMode="auto"|"webgl";
type BackendLabel="初始化中"|"WebGPU"|"WebGL2"|"不可用";

export default function WebGpuOrbitLab(){
  const host=useRef<HTMLDivElement>(null);
  const speedRef=useRef(0.4);
  const [speed,setSpeed]=useState(0.4);
  const [count,setCount]=useState(256);
  const [mode,setMode]=useState<BackendMode>("auto");
  const [backend,setBackend]=useState<BackendLabel>("初始化中");
  const [fps,setFps]=useState<number|null>(null);
  const [error,setError]=useState("");

  useEffect(()=>{speedRef.current=speed;},[speed]);
  useEffect(()=>{
    let disposed=false;
    let resizeObserver:ResizeObserver|null=null;
    let renderer:import("three/webgpu").WebGPURenderer|null=null;
    let mesh:import("three/webgpu").InstancedMesh|null=null;


    async function boot(){
      const THREE=await import("three/webgpu");
      if(disposed||!host.current)return;
      const scene=new THREE.Scene();
      scene.background=new THREE.Color("#08182c");
      scene.fog=new THREE.Fog("#08182c",14,58);
      const camera=new THREE.PerspectiveCamera(48,1,0.1,100);
      camera.position.set(0,1.4,23);
      camera.lookAt(0,0,0);
      const light=new THREE.DirectionalLight("#defaff",2.5);
      light.position.set(4,8,12);
      scene.add(light,new THREE.AmbientLight("#83aaf8",1.35));
      const geometry=new THREE.IcosahedronGeometry(0.36,1);
      const material=new THREE.MeshStandardNodeMaterial({metalness:0.38,roughness:0.32});
      const objects=new THREE.InstancedMesh(geometry,material,count);
      const dummy=new THREE.Object3D();
      const color=new THREE.Color();
      const diameter=Math.sqrt(count);
      for(let i=0;i<count;i++){
        const fraction=i/count;
        const angle=i*2.3999632;
        const radius=2.0+4.4*Math.sqrt(fraction);
        dummy.position.set(Math.cos(angle)*radius,(i%Math.max(5,Math.round(diameter)))*0.26-0.13*diameter,Math.sin(angle)*radius*0.55);
        dummy.rotation.set(i*0.13,i*0.21,angle*0.2);
        dummy.scale.setScalar(0.42+0.55*(0.5+0.5*Math.sin(i*1.77)));
        dummy.updateMatrix();
        objects.setMatrixAt(i,dummy.matrix);
        color.setHSL(0.49+0.25*fraction,0.72,0.54);
        objects.setColorAt(i,color);
      }
      objects.instanceMatrix.needsUpdate=true;
      objects.instanceColor!.needsUpdate=true;
      scene.add(objects);
      const next=new THREE.WebGPURenderer({antialias:true,forceWebGL:mode==="webgl"});
      await next.init();
      if(disposed){void next.dispose().catch(error => console.warn("3D backend cleanup:",error));geometry.dispose();material.dispose();return;}
      renderer=next;
      mesh=objects;
      const element=next.domElement;
      element.setAttribute("aria-label","原创三维实例化场景");
      host.current?.appendChild(element);
      setBackend(("isWebGPUBackend" in next.backend && next.backend.isWebGPUBackend === true)?"WebGPU":"WebGL2");
      function onResize(){
        if(!host.current)return;
        const width=Math.max(280,host.current.clientWidth);
        const height=Math.max(280,host.current.clientHeight);
        camera.aspect=width/height;
        camera.updateProjectionMatrix();
        next.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
        next.setSize(width,height);
      }
      onResize();
      resizeObserver=new ResizeObserver(onResize);
      resizeObserver.observe(host.current!);
      let lastMeasure=performance.now(),frames=0;
      next.setAnimationLoop((time:number)=>{
        if(disposed)return;
        objects.rotation.y+=0.006*speedRef.current;
        objects.rotation.x=Math.sin(time*0.00012)*0.10;
        next.render(scene,camera);
        frames++;
        const now=performance.now();
        if(now-lastMeasure>=1400){
          setFps(Math.round(frames*1000/(now-lastMeasure)));
          lastMeasure=now;frames=0;
        }
      });
    }
    boot().catch((cause:unknown)=>{
      if(!disposed){
        setBackend("不可用");
        setError(cause instanceof Error?cause.message:"无法初始化渲染环境");
      }
    });

    return ()=>{
      disposed=true;
      resizeObserver?.disconnect();
      if(renderer){
        renderer.setAnimationLoop(null);
        renderer.domElement.remove();
        void renderer.dispose().catch(error => console.warn("3D backend cleanup:",error));
      }
      if(mesh){
        mesh.geometry.dispose();
        const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
        for(const item of materials)item.dispose();
      }
    };
  },[count,mode]);

  return <section className={style.lab} aria-labelledby="lab-title">
    <div className={style.labHeading}>
      <div><span>LIVE GRAPHICS LAB</span><h2 id="lab-title">交互式实例化场景</h2>
        <p>同一场景，切换后端和实例数量，观察渲染差异。</p></div>
      <div className={style.metrics} role="status" aria-live="polite">
        <div><span>实际后端</span><strong>{backend}</strong></div>
        <div><span>即时帧率</span><strong>{fps===null?"—":fps+" fps"}</strong></div>
      </div>
    </div>
    <div className={style.stage} ref={host}>
      {backend==="不可用"&&<div className={style.error}><strong>当前浏览器无法启动图形后端</strong><p>{error||"请检查浏览器或设备图形支持。"}</p><p>仍然可以阅读教程和下载源码，在其他受支持设备上练习。</p></div>}
      {backend==="初始化中"&&<div className={style.loading}>正在检测图形后端…</div>}
    </div>
    <div className={style.controlGrid}>
      <label>实际渲染模式
        <select value={mode} onChange={event=>{setBackend("初始化中");setFps(null);setError("");setMode(event.target.value as BackendMode);}}>
          <option value="auto">WebGPU 优先（允许 WebGL2 回退）</option>
          <option value="webgl">强制 WebGL2</option>
        </select>
      </label>
      <label>实例数量
        <select value={count} onChange={event=>{setBackend("初始化中");setFps(null);setError("");setCount(Number(event.target.value));}}>
          <option value={64}>64 实例</option><option value={256}>256 实例</option><option value={1024}>1024 实例</option>
        </select>
      </label>
      <label>旋转速度 <strong>{speed.toFixed(1)}×</strong>
        <input aria-label="调整旋转速度" type="range" min="0" max="2" step="0.1" value={speed} onChange={event=>setSpeed(Number(event.target.value))}/>
      </label>
    </div>
    <p className={style.caveat}>FPS 仅为当前浏览器交互观察值，不是稳定性能基准。如果两种模式都显示 WebGL2，就没有测到 WebGPU。<strong>请记录实际后端，不能假定 WebGPU 一定更快。</strong></p>
  </section>;
}
