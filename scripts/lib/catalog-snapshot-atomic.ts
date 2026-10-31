import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {ResourceListing} from "../../src/lib/resource-catalog";

export type TrainingCatalogSnapshot = {
  version: 1;
  generatedAt: string;
  rows: readonly ResourceListing[];
};

/**
 * Durable same-filesystem atomic replacement. The receiving Rust process
 * reloads on SIGHUP; this writer never restarts a service or opens a socket.
 */
export function writeCatalogSnapshotAtomic(output: string, snapshot: TrainingCatalogSnapshot) {
  if (!path.isAbsolute(output) || !output.endsWith(".json")) {
    throw new Error("Catalog snapshot output must be an absolute .json path");
  }
  if (snapshot.version !== 1 || snapshot.rows.length < 1) {
    throw new Error("Refusing empty or incompatible training catalog");
  }
  const ids = new Set(snapshot.rows.map(x=>x.id));
  if (ids.size !== snapshot.rows.length) throw new Error("Duplicate training catalog IDs");
  const data = Buffer.from(JSON.stringify(snapshot)+"\n","utf8");
  if (data.length > 64*1024*1024) throw new Error("Catalog snapshot exceeds 64 MiB");
  const parent = path.dirname(output);
  if (!fs.statSync(parent).isDirectory()) throw new Error("Catalog output parent is not a directory");
  const temporary = path.join(parent, "."+path.basename(output)+"."+
    process.pid+"."+crypto.randomBytes(9).toString("hex")+".tmp");
  let fd: number | undefined;
  try {
    fd = fs.openSync(temporary,"wx",0o600);
    fs.writeFileSync(fd,data);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temporary,output);
    const dirFd = fs.openSync(parent,"r");
    try {fs.fsyncSync(dirFd);} finally {fs.closeSync(dirFd);}
  } catch(error) {
    if(fd!==undefined) fs.closeSync(fd);
    try {fs.unlinkSync(temporary);}catch{}
    throw error;
  }
  return {rows:snapshot.rows.length,bytes:data.length,sha256:crypto.createHash("sha256").update(data).digest("hex")};
}
