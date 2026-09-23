export type CubeNetCell={label:string;x:number;y:number};
type V=[number,number,number];
type O={r:V;u:V;n:V};
export type CubeNetAnalysis={
  valid:boolean;
  reason:"ok"|"need-six"|"disconnected"|"orientation-conflict"|"face-overlap";
  overlaps:string[][];
  faceByNormal:Record<string,string>;
};

const neg=([a,b,c]:V):V=>[-a,-b,-c];
const key=([a,b,c]:V)=>a+","+b+","+c;
const same=(a:V,b:V)=>a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2];

function step(o:O,dx:number,dy:number):O{
  if(dx===1) return {r:neg(o.n),u:o.u,n:o.r};
  if(dx===-1) return {r:o.n,u:o.u,n:neg(o.r)};
  if(dy===-1) return {r:o.r,u:neg(o.n),n:o.u};
  return {r:o.r,u:o.n,n:neg(o.u)};
}

export function analyzeCubeNet(cells:CubeNetCell[]):CubeNetAnalysis{
  if(cells.length!==6) return {valid:false,reason:"need-six",overlaps:[],faceByNormal:{}};
  const pos=new Map(cells.map(c=>[c.x+","+c.y,c]));
  const first=cells[0];
  const orientation=new Map<string,O>();
  orientation.set(first.label,{r:[1,0,0],u:[0,1,0],n:[0,0,1]});
  const queue=[first];
  const dirs:[[number,number],[number,number],[number,number],[number,number]]=[[1,0],[-1,0],[0,-1],[0,1]];

  while(queue.length){
    const cell=queue.shift()!;
    const o=orientation.get(cell.label)!;
    for(const [dx,dy] of dirs){
      const next=pos.get((cell.x+dx)+","+(cell.y+dy));
      if(!next) continue;
      const expected=step(o,dx,dy);
      const existing=orientation.get(next.label);
      if(existing){
        if(!same(existing.r,expected.r)||!same(existing.u,expected.u)||!same(existing.n,expected.n))
          return {valid:false,reason:"orientation-conflict",overlaps:[],faceByNormal:{}};
      }else{
        orientation.set(next.label,expected);
        queue.push(next);
      }
    }
  }

  if(orientation.size!==6) return {valid:false,reason:"disconnected",overlaps:[],faceByNormal:{}};

  const byNormal=new Map<string,string[]>();
  for(const [label,o] of orientation){
    const k=key(o.n); byNormal.set(k,[...(byNormal.get(k)||[]),label]);
  }
  const overlaps=[...byNormal.values()].filter(labels=>labels.length>1);
  if(overlaps.length) return {valid:false,reason:"face-overlap",overlaps,faceByNormal:{}};
  const faceByNormal:Object=Object.fromEntries([...orientation.entries()].map(([label,o])=>[key(o.n),label]));
  return {valid:true,reason:"ok",overlaps:[],faceByNormal:faceByNormal as Record<string,string>};
}

export const isCubeNet=(cells:CubeNetCell[])=>analyzeCubeNet(cells).valid;

export function validCubeNetRemovals(cells:CubeNetCell[]){
  if(cells.length!==7) return [] as string[];
  return cells.filter(cell=>isCubeNet(cells.filter(c=>c.label!==cell.label))).map(c=>c.label);
}
