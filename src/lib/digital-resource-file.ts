import {createHash} from "node:crypto";
import {constants} from "node:fs";
import {lstat,open,realpath,type FileHandle} from "node:fs/promises";
import {isAbsolute,join,resolve,sep} from "node:path";

export type DigitalResourceFile = Readonly<{
  sha256:string;
  size_bytes:string|number;
  file_name:string;
  mime_type:string;
}>;

export const MAX_DIGITAL_RESOURCE_BYTES=100*1024*1024;
const unsafeFileName=(name:string)=>
  Array.from(name).some(c=>{const n=c.codePointAt(0)??0;return n<=31||n===127;}) ||
  name.includes("/") || name.includes("\\");

const ALLOWED_MIMES=new Set([
  "application/pdf","application/zip","application/octet-stream",
  "text/plain","text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

/** Asset lookup is server-owned. No request body or query can supply a path. */
export function validateDigitalResourceFile(asset:DigitalResourceFile):number{
  const size=Number(asset.size_bytes);
  if(!/^[a-f0-9]{64}$/.test(asset.sha256) ||
     !Number.isSafeInteger(size)||size<=0||size>MAX_DIGITAL_RESOURCE_BYTES ||
     !asset.file_name || asset.file_name.length>180 ||
     unsafeFileName(asset.file_name) ||
     asset.file_name==="." || asset.file_name===".." ||
     !ALLOWED_MIMES.has(asset.mime_type))
    throw new Error("INVALID_PRIVATE_RESOURCE_METADATA");
  return size;
}

/** The digest is verified AGAIN before bytes leave the server.
 * Reading a <=100MiB bounded file prevents a check/use swap after validation.
 */
async function openPrivateResource(asset:DigitalResourceFile):Promise<FileHandle>{
  const expectedSize=validateDigitalResourceFile(asset);
  const root=process.env.SOCTHINK_DIGITAL_FILES_DIR?.trim()||"";
  if(!root || !isAbsolute(root))throw new Error("DIGITAL_RESOURCE_STORAGE_NOT_CONFIGURED");
  const safeRoot=await realpath(root);
  const cwd=resolve(process.cwd());
  if(safeRoot===cwd || safeRoot.startsWith(join(cwd,"public")+sep))
    throw new Error("PUBLIC_RESOURCE_STORAGE_FORBIDDEN");
  const prefix=join(safeRoot,asset.sha256.slice(0,2));
  const prefixStat=await lstat(prefix);
  if(!prefixStat.isDirectory() || prefixStat.isSymbolicLink())
    throw new Error("UNSAFE_RESOURCE_PREFIX");
  const filePath=join(prefix,asset.sha256+".bin");
  const file=await open(filePath,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    const stat=await file.stat();
    if(!stat.isFile() || stat.size!==expectedSize ||
       stat.size>MAX_DIGITAL_RESOURCE_BYTES)
      throw new Error("DIGITAL_RESOURCE_SIZE_MISMATCH");
    return file;
  }catch(error){await file.close();throw error;}
}

/** Hash a private asset in 1MiB chunks without allocating the entire file.
 * Checkout and asset staging use this; download separately reads exact bytes
 * before serving so integrity is checked on both sides of the transaction.
 */
export async function verifyDigitalResourceIntegrity(asset:DigitalResourceFile):Promise<void>{
  const size=validateDigitalResourceFile(asset);
  const file=await openPrivateResource(asset);
  try{
    const hash=createHash("sha256");
    const chunk=Buffer.allocUnsafe(1024*1024);
    let position=0;
    while(position<size){
      const read=await file.read(chunk,0,Math.min(chunk.length,size-position),position);
      if(read.bytesRead<=0)throw new Error("DIGITAL_RESOURCE_TRUNCATED");
      hash.update(chunk.subarray(0,read.bytesRead));
      position+=read.bytesRead;
    }
    if(hash.digest("hex")!==asset.sha256)
      throw new Error("DIGITAL_RESOURCE_HASH_MISMATCH");
  }finally{await file.close();}
}

/** Cheap inventory probe for the public offer list (full hash checks happen
 * at order creation and at every download).
 */
export async function resourceFileSizeMatches(asset:DigitalResourceFile):Promise<boolean>{
  try{
    const file=await openPrivateResource(asset);
    await file.close();
    return true;
  }catch{return false;}
}

export async function readVerifiedDigitalResource(asset:DigitalResourceFile):Promise<Buffer>{
  const expectedSize=validateDigitalResourceFile(asset);
  const file=await openPrivateResource(asset);
  try{
    const bytes=await file.readFile();
    if(bytes.length!==expectedSize ||
       createHash("sha256").update(bytes).digest("hex")!==asset.sha256)
      throw new Error("DIGITAL_RESOURCE_HASH_MISMATCH");
    return bytes;
  }finally{await file.close();}
}

export function attachmentFilename(fileName:string):string{
  if(!fileName || unsafeFileName(fileName) || fileName.length>180)
    throw new Error("INVALID_ATTACHMENT_FILENAME");
  const ascii="download"+(/\.[A-Za-z0-9]{1,12}$/.exec(fileName)?.[0]||".bin");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
