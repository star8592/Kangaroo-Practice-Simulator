import fs from "node:fs";
import path from "node:path";

const MIME: Record<string,string> = {
 ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",
};

export function embedLocalReportImages(html:string, root=path.join(process.cwd(),"public","local-assets")):string {
  let allBytes=0;
  const cache=new Map<string,string>();
  return html.replace(/<img\b[^>]*>/gi,tag=>{
    const attribute=/\ssrc="([^"]+)"/i.exec(tag);
    const url=attribute?.[1]||"";
    if(!url.startsWith("/local-assets/"))return tag;
    if(url.includes("?")||url.includes("#"))throw Error("REPORT_IMAGE_URL_INVALID");
    let relative:string;
    try{relative=decodeURIComponent(url.slice("/local-assets/".length))}
    catch{throw Error("REPORT_IMAGE_BAD_ENCODING")}
    if(!relative||relative.includes("\\")||
      relative.split("/").some(part=>!part||part==="."||part===".."))
      throw Error("REPORT_IMAGE_PATH_INVALID");
    const mime=MIME[path.extname(relative).toLowerCase()];
    if(!mime)throw Error("REPORT_IMAGE_TYPE_INVALID");
    let realRoot:string,target:string;
    try{
      realRoot=fs.realpathSync(root);
      target=fs.realpathSync(path.join(realRoot,relative));
    }catch{throw Error("REPORT_IMAGE_NOT_AVAILABLE")}
    const child=path.relative(realRoot,target);
    if(!child||child===".."||child.startsWith(".."+path.sep)||path.isAbsolute(child))
      throw Error("REPORT_IMAGE_PATH_OUTSIDE_ROOT");
    const meta=fs.statSync(target);
    if(!meta.isFile()||meta.size<1||meta.size>12*1024*1024)
      throw Error("REPORT_IMAGE_SIZE_INVALID");
    let data=cache.get(target);
    if(!data){
      allBytes+=meta.size;
      if(allBytes>60*1024*1024)throw Error("REPORT_IMAGES_TOO_LARGE");
      data="data:"+mime+";base64,"+fs.readFileSync(target).toString("base64");
      cache.set(target,data);
    }
    return tag.replace(/\s+srcset="[^"]*"/gi,"").replace(attribute![0],' src="'+data+'"');
  });
}
