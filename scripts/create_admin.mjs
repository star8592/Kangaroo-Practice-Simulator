#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const a=Object.fromEntries(process.argv.slice(2).flatMap((x,i,v)=>x.startsWith('--')&&v[i+1]&&!v[i+1].startsWith('--')?[[x.slice(2),v[i+1]]]:[]));
for(const k of ['username','name','pin'])if(!a[k]){console.error(`missing --${k}`);process.exit(2)}
if(a.pin.length<6){console.error('admin PIN must be at least 6 characters');process.exit(2)}
const file=path.join(process.cwd(),'private/users/users.json');fs.mkdirSync(path.dirname(file),{recursive:true});const users=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
if(users.some(u=>u.username?.toLowerCase()===a.username.toLowerCase())){console.error('username exists');process.exit(3)}
const salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(a.pin,salt,32).toString('hex');
const u={id:`adm_${crypto.randomBytes(8).toString('hex')}`,username:a.username.trim(),candidateNo:`ADMIN-${a.username.trim()}`,name:a.name.trim(),grade:0,pinHash:`scrypt$${salt}$${hash}`,createdAt:Date.now(),active:true,role:'admin',sessionVersion:1};
users.push(u);const tmp=`${file}.tmp`;fs.writeFileSync(tmp,JSON.stringify(users,null,2));fs.renameSync(tmp,file);console.log(JSON.stringify({id:u.id,username:u.username,name:u.name,role:u.role},null,2));
