import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  attachmentFilename,readVerifiedDigitalResource,resourceFileSizeMatches,
  validateDigitalResourceFile,MAX_DIGITAL_RESOURCE_BYTES
} from "../src/lib/digital-resource-file";

async function run(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-file-safety-"));
  const before=process.env.SOCTHINK_DIGITAL_FILES_DIR;
  process.env.SOCTHINK_DIGITAL_FILES_DIR=root;
  try{
    const bytes=Buffer.from("Only original verified training materials can be served.\n","utf8");
    const sha256=createHash("sha256").update(bytes).digest("hex");
    const folder=path.join(root,sha256.slice(0,2));
    const file=path.join(folder,sha256+".bin");
    fs.mkdirSync(folder,{recursive:true,mode:0o700});
    fs.writeFileSync(file,bytes,{mode:0o600});
    const meta={sha256,size_bytes:bytes.length,file_name:"小学复习笔记.txt",mime_type:"text/plain"};
    assert.equal(validateDigitalResourceFile(meta),bytes.length);
    assert.equal(await resourceFileSizeMatches(meta),true);
    assert.deepEqual(await readVerifiedDigitalResource(meta),bytes);
    assert.match(attachmentFilename(meta.file_name),/filename\*=UTF-8''/);
    assert.throws(()=>validateDigitalResourceFile({...meta,file_name:"../secrets"}));
    assert.throws(()=>validateDigitalResourceFile({...meta,file_name:"line\nfeed"}));
    assert.throws(()=>validateDigitalResourceFile({...meta,mime_type:"text/html"}));
    assert.throws(()=>validateDigitalResourceFile({...meta,size_bytes:MAX_DIGITAL_RESOURCE_BYTES+1}));
    assert.throws(()=>validateDigitalResourceFile({...meta,sha256:"../../etc/passwd"}));
    fs.writeFileSync(file,Buffer.alloc(bytes.length,47));
    assert.equal(await resourceFileSizeMatches(meta),true);
    await assert.rejects(()=>readVerifiedDigitalResource(meta),/HASH_MISMATCH/);
    fs.unlinkSync(file);
    fs.symlinkSync(path.join(root,"some-private-file"),file);
    assert.equal(await resourceFileSizeMatches(meta),false);
    await assert.rejects(()=>readVerifiedDigitalResource(meta));
    fs.unlinkSync(file);
    fs.writeFileSync(file,bytes);
    assert.deepEqual(await readVerifiedDigitalResource(meta),bytes);
    delete process.env.SOCTHINK_DIGITAL_FILES_DIR;
    assert.equal(await resourceFileSizeMatches(meta),false);
    await assert.rejects(()=>readVerifiedDigitalResource(meta),/STORAGE_NOT_CONFIGURED/);
    console.log("DIGITAL_RESOURCE_FILE=PASS private_sha256 tamper symlink filename size fail_closed");
  }finally{
    if(before===undefined)delete process.env.SOCTHINK_DIGITAL_FILES_DIR;
    else process.env.SOCTHINK_DIGITAL_FILES_DIR=before;
    fs.rmSync(root,{recursive:true,force:true});
  }
}
run().catch(e=>{console.error("DIGITAL_RESOURCE_FILE_FAIL",e);process.exitCode=1;});
