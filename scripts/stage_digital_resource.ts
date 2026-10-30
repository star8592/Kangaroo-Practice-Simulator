/** Safely stage an ORIGINAL or licensed <=100MiB digital deliverable.
 * This tool NEVER inserts a SKU, approves rights, enables sales or touches
 * WeChat Pay. The item remains unpublished until independent review.
 */
import {createHash} from "node:crypto";
import {constants,createReadStream} from "node:fs";
import {open,mkdir,link,stat,lstat,unlink,realpath} from "node:fs/promises";
import {basename,isAbsolute,join,resolve,sep} from "node:path";
import {randomBytes} from "node:crypto";
import {MAX_DIGITAL_RESOURCE_BYTES,validateDigitalResourceFile,
  readVerifiedDigitalResource} from "../src/lib/digital-resource-file";

async function main(){
  const [source,resourceId,displayName,mimeType,...options]=process.argv.slice(2);
  if(!source || !resourceId || !displayName || !mimeType ||
     !/^[A-Za-z0-9_.-]{4,120}$/.test(resourceId) ||
     options.some(x=>x!=="--stage") || options.length>1)
    throw new Error("USAGE: tsx scripts/stage_digital_resource.ts SOURCE RESOURCE_ID FILE_NAME MIME [--stage]");
  const root=process.env.SOCTHINK_DIGITAL_FILES_DIR;
  if(!root || !isAbsolute(root))throw new Error("PRIVATE_STORAGE_ROOT_REQUIRED");
  const candidate=resolve(root);
  const cwd=resolve(process.cwd());
  if(candidate===cwd || candidate.startsWith(join(cwd,"public")+sep))
    throw new Error("PUBLIC_STORAGE_FORBIDDEN");
  const sourcePath=await realpath(source);
  const info=await stat(sourcePath);
  if(!info.isFile() || info.size<=0 || info.size>MAX_DIGITAL_RESOURCE_BYTES)
    throw new Error("SOURCE_INVALID_OR_TOO_LARGE");
  const filename=basename(displayName);
  if(filename!==displayName)throw new Error("UNSAFE_DISPLAY_FILENAME");
  const h=createHash("sha256");
  let measured=0;
  for await(const chunk of createReadStream(sourcePath)){
    measured+=(chunk as Buffer).length;
    if(measured>MAX_DIGITAL_RESOURCE_BYTES)throw new Error("SOURCE_TOO_LARGE");
    h.update(chunk as Buffer);
  }
  if(measured!==info.size)throw new Error("SOURCE_CHANGED");
  const sha256=h.digest("hex");
  const meta={sha256,size_bytes:measured,file_name:filename,mime_type:mimeType};
  validateDigitalResourceFile(meta);
  if(options.includes("--stage")){
    await mkdir(candidate,{recursive:true,mode:0o700});
    const realRoot=await realpath(candidate);
    if(realRoot===cwd || realRoot.startsWith(join(cwd,"public")+sep))
      throw new Error("PUBLIC_STORAGE_FORBIDDEN");
    const prefix=join(realRoot,sha256.slice(0,2));
    await mkdir(prefix,{recursive:true,mode:0o700});
    const prefixStat=await lstat(prefix);
    if(!prefixStat.isDirectory() || prefixStat.isSymbolicLink())
      throw new Error("UNSAFE_PRIVATE_RESOURCE_DIRECTORY");
    const destination=join(prefix,sha256+".bin");
    const temp=join(prefix,"."+randomBytes(12).toString("hex")+".pending");
    const input=await open(sourcePath,constants.O_RDONLY|constants.O_NOFOLLOW);
    let output;
    try{
      output=await open(temp,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY,0o600);
      const buffer=Buffer.allocUnsafe(1024*1024);
      let offset=0;
      for(;;){
        const {bytesRead}=await input.read(buffer,0,buffer.length,offset);
        if(!bytesRead)break;
        let written=0;
        while(written<bytesRead){
          const result=await output.write(buffer, written,bytesRead-written);
          if(result.bytesWritten<=0)throw new Error("INCOMPLETE_FILE_WRITE");
          written+=result.bytesWritten;
        }
        offset+=bytesRead;
        if(offset>MAX_DIGITAL_RESOURCE_BYTES)throw new Error("SOURCE_TOO_LARGE");
      }
      await output.sync();
      if(offset!==measured)throw new Error("SOURCE_CHANGED");
    }finally{await input.close();await output?.close();}
    let linked=false;
    try{
      // Atomic no-overwrite hard link. Two publishers cannot replace the
      // content of an immutable SHA-addressed asset.
      try{
        await link(temp,destination);
        linked=true;
      }catch(error){
        if((error as NodeJS.ErrnoException).code!=="EEXIST")throw error;
        // A repeat staging of identical bytes is an idempotent success.
        // A corrupt existing digest path will still fail verification.
      }
      await readVerifiedDigitalResource(meta);
    }catch(e){
      if(linked)await unlink(destination).catch(()=>{});
      throw e;
    }finally{await unlink(temp).catch(()=>{});}
  }
  console.log("DIGITAL_ASSET_STAGING="+(options.includes("--stage")?"STAGED":"CHECK_ONLY"));
  // Metadata is nonsecret; only a reviewed operator may attach this to the
  // private billing_resource_assets table (approval flags remain FALSE).
  console.log(JSON.stringify({resource_id:resourceId,...meta,
    rights_approved:false,delivery_verified:false}));
}
main().catch(e=>{console.error("DIGITAL_ASSET_STAGE_ERROR",e instanceof Error?e.message:"UNKNOWN");process.exitCode=1;});
