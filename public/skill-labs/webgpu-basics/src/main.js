import * as THREE from 'three/webgpu';

const stage=document.querySelector('#stage');
const backend=document.querySelector('#backend');
const fps=document.querySelector('#fps');
const countSelect=document.querySelector('#count');
const modeSelect=document.querySelector('#mode');
const speedInput=document.querySelector('#speed');
const speedLabel=document.querySelector('#speedLabel');
let generation=0;
let active=null;

speedInput.addEventListener('input',()=>speedLabel.textContent=Number(speedInput.value).toFixed(1)+'×');
countSelect.addEventListener('change',reset);
modeSelect.addEventListener('change',reset);
window.addEventListener('pagehide',destroy);

function destroy(){
  generation++;
  if(!active)return;
  const item=active;active=null;
  item.observer.disconnect();
  item.renderer.setAnimationLoop(null);
  item.renderer.domElement.remove();
  item.mesh.geometry.dispose();
  item.mesh.material.dispose();
  void item.renderer.dispose().catch(error=>console.warn("3D cleanup",error));
}

async function reset(){
  destroy();
  const token=++generation;
  backend.textContent='初始化中';fps.textContent='—';
  const label=document.querySelector('#message');
  label.textContent='正在初始化三维图形…';
  label.style.display='block';
  const count=Number(countSelect.value);
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#08182c');
  scene.fog=new THREE.Fog('#08182c',14,58);
  const camera=new THREE.PerspectiveCamera(48,1,0.1,100);
  camera.position.set(0,1.4,23);
  camera.lookAt(0,0,0);
  const light=new THREE.DirectionalLight('#defaff',2.5);
  light.position.set(4,8,12);
  scene.add(light,new THREE.AmbientLight('#83aaf8',1.35));
  const geometry=new THREE.IcosahedronGeometry(0.36,1);
  const material=new THREE.MeshStandardNodeMaterial({metalness:0.38,roughness:0.32});
  const mesh=new THREE.InstancedMesh(geometry,material,count);
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  const diameter=Math.sqrt(count);
  for(let i=0;i<count;i++){
    const fraction=i/count;
    const angle=i*2.3999632;
    const radius=2+4.4*Math.sqrt(fraction);
    dummy.position.set(Math.cos(angle)*radius,(i%Math.max(5,Math.round(diameter)))*0.26-0.13*diameter,Math.sin(angle)*radius*0.55);
    dummy.rotation.set(i*0.13,i*0.21,angle*0.2);
    dummy.scale.setScalar(0.42+0.55*(0.5+0.5*Math.sin(i*1.77)));
    dummy.updateMatrix();
    mesh.setMatrixAt(i,dummy.matrix);
    color.setHSL(0.49+0.25*fraction,0.72,0.54);
    mesh.setColorAt(i,color);
  }
  mesh.instanceMatrix.needsUpdate=true;
  mesh.instanceColor.needsUpdate=true;
  scene.add(mesh);
  const renderer=new THREE.WebGPURenderer({antialias:true,forceWebGL:modeSelect.value==='webgl'});
  try{
    await renderer.init();
    if(token!==generation){void renderer.dispose().catch(error=>console.warn("3D cleanup",error));geometry.dispose();material.dispose();return;}
    stage.appendChild(renderer.domElement);
    label.style.display='none';
    backend.textContent=renderer.backend.isWebGPUBackend?'WebGPU':'WebGL2';
    function fit(){
      const w=Math.max(280,stage.clientWidth),h=Math.max(300,stage.clientHeight);
      camera.aspect=w/h;camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
      renderer.setSize(w,h);
    }
    const observer=new ResizeObserver(fit);observer.observe(stage);fit();
    active={renderer,mesh,observer};
    let last=performance.now(),frames=0;
    renderer.setAnimationLoop((time)=>{
      mesh.rotation.y+=0.006*Number(speedInput.value);
      mesh.rotation.x=Math.sin(time*0.00012)*0.10;
      renderer.render(scene,camera);
      frames++;
      const now=performance.now();
      if(now-last>=1400){fps.textContent=Math.round(frames*1000/(now-last));frames=0;last=now;}
    });
  }catch(error){
    void renderer.dispose().catch(error=>console.warn("3D cleanup",error));geometry.dispose();material.dispose();
    if(token===generation){backend.textContent='不可用';label.textContent='图形初始化失败：'+String(error);}
  }
}
reset();
