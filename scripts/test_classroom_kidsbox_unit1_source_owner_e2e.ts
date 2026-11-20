#!/usr/bin/env npx tsx
/**
 * Isolated native Next.js classroom E2E: one synthetic owner, one teacher,
 * one class, five independently signed fake-WeChat parents, real OpenPronounce.
 * Disposable PG18 with FORCE RLS. Never touches production or real identities.
 *
 * ACCENTLAB_MIGRATIONS_DIR=/path/to/AccentLab/migrations \
 * ACCENTLAB_E2E_CANARY=/path/to/synthetic.webm npx tsx scripts/test_classroom_native_full_e2e.ts
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import net from "node:net";
import {spawnSync} from "node:child_process";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"soc-classroom-e2e-"));
fs.chmodSync(root,0o700);
const data=path.join(root,"data"),socket=path.join(root,"sock"),users=path.join(root,"users"),recordings=path.join(root,"recordings");
for(const p of [socket,users,recordings])fs.mkdirSync(p,{mode:0o700});
process.env.SOCTHINK_USER_DATA_DIR=users;
process.env.SOCTHINK_CLASSROOM_RECORDINGS_DIR=recordings;
process.env.SOCTHINK_TEACHER_BOOKS_DIR='/mnt/disk2/socthink-content-private/books';
const migrationDir=process.env.ACCENTLAB_MIGRATIONS_DIR||"";
const canaryPath=process.env.ACCENTLAB_E2E_CANARY||"";
if(!migrationDir||!canaryPath||!fs.existsSync(canaryPath))throw Error("Provide isolated migration directory and existing synthetic WebM");
const PG="/usr/lib/postgresql/18/bin",L="/usr/bin/psql";
function run(bin:string,args:string[],opts:Record<string,unknown>={}):string{
 const out=spawnSync(bin,args,{encoding:"utf8",timeout:120000,...opts});
 if(out.status!==0)throw Error([bin,args.join(" "),out.stderr,out.stdout].join("\n").slice(0,14000));
 return String(out.stdout||"").trim();
}
async function freePort():Promise<number>{
 const s=net.createServer();
 await new Promise<void>(resolve=>s.listen(0,"127.0.0.1",resolve));
 const address=s.address();
 if(typeof address==="string"||!address)throw Error("No test TCP port");
 const port=address.port;
 await new Promise<void>((resolve,reject)=>s.close(err=>err?reject(err):resolve()));
 return port;
}
async function main(){
const port=await freePort();
let started=false,success=false;
let closePool:(()=>Promise<void>)|null=null;
try {
  run(PG+"/initdb",["-D",data,"--no-instructions","--auth-local=trust","--auth-host=reject","--locale=C"]);
  fs.writeFileSync(path.join(data,"pg_hba.conf"),[
    "# Disposable loopback-only synthetic test instance",
    "local all all trust",
    "host all all 127.0.0.1/32 scram-sha-256",
    "host all all ::1/128 reject"
  ].join("\n")+"\n");
  run(PG+"/pg_ctl",["-D",data,"-l",path.join(root,"pg.log"),"-o",
    "-c listen_addresses=127.0.0.1 -c unix_socket_directories="+socket+" -p "+port,"-w","start"]);
  started=true;
  const adminCmd=(query:string)=>run(L,["-X","-v","ON_ERROR_STOP=1","-h",socket,"-p",String(port),"-d","postgres","-c",query]);
  for(let version=1;version<=7;version++){
    const filename="000"+version+"_"+
      ["accent_lab_core","accent_classroom_homework","accent_teacher_expected_roster",
       "accent_parent_join_approval","accent_class_wall_public_alias",
       "accent_assignment_claimed_at","accent_teacher_approval"][version-1]+".sql";
    run(L,["-X","-q","-v","ON_ERROR_STOP=1","-h",socket,"-p",String(port),"-d","postgres","-f",path.join(migrationDir,filename)]);
  }
  run(L,["-X","-q","-v","ON_ERROR_STOP=1","-h",socket,"-p",String(port),"-d","postgres",
    "-f",path.resolve(process.cwd(),"ops/db/20261114_accent_teacher_admin_direct_grant.sql")]);
  // R56 additive metadata migration; this test stays isolated from production.
  run(L,["-X","-q","-v","ON_ERROR_STOP=1","-h",socket,"-p",String(port),"-d","postgres",
    "-f",path.resolve(process.cwd(),"ops/db/20261119_accent_roleplay_speakers.sql")]);
  // Existing standalone class-invitation feature, required for unenrolled child flow.
  run(L,["-X","-q","-v","ON_ERROR_STOP=1","-h",socket,"-p",String(port),"-d","postgres",
    "-f",path.resolve(process.cwd(),"ops/db/20261117_accent_independent_class_invitations.sql")]);
  run(L,["-X","-q","-v","ON_ERROR_STOP=1","-h",socket,"-p",String(port),"-d","postgres",
    "-f",path.resolve(process.cwd(),"ops/db/20261120_accent_word_homework.sql")]);
  run(L,["-X","-q","-v","ON_ERROR_STOP=1","-h",socket,"-p",String(port),"-d","postgres",
    "-f",path.resolve(process.cwd(),"ops/db/20261120_accent_teacher_book_page_reviews.sql")]);

  const role="classroom_e2e_app";
  const password=crypto.randomBytes(18).toString("hex");
  adminCmd("CREATE ROLE "+role+" LOGIN PASSWORD '"+password+"' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
  adminCmd("GRANT USAGE ON SCHEMA accent TO "+role+"; GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA accent TO "+role+"; GRANT DELETE ON accent.class_expected_roster TO "+role);
  process.env.SOCTHINK_CLASSROOM_DATABASE_URL="postgresql://"+role+":"+password+"@127.0.0.1:"+port+"/postgres";
  const {NextRequest}=await import("next/server");
  const {GET,POST}=await import("../src/app/english/pronunciation/classroom-api/[...path]/route");
  const {createParentSessionToken,authenticateOrCreateWechatParent,PARENT_SESSION_COOKIE}=await import("../src/lib/parent-auth");
  const {bindSiteOwner}=await import("../src/lib/site-owner");
  const {learnerId,classroomPool}=await import("../src/lib/classroom-web-core");
  closePool=()=>classroomPool().end();
  const nonce=crypto.randomBytes(6).toString("hex");
  const owner=authenticateOrCreateWechatParent({wechatId:"test-owner-"+nonce,name:"虚拟管理员"});
  const teacher=owner; // Isolated owner-as-teacher bypasses external platform-grants dependency
  const students=Array.from({length:5},(_,i)=>authenticateOrCreateWechatParent({
    wechatId:"test-student-"+(i+1)+"-"+nonce,name:"虚拟家长"+(i+1)
  }));
  bindSiteOwner({parent:owner,email:"isolated-owner@example.test",adminId:"isolated-fixture-admin"});
  const people=[owner,teacher,...students];
  const cookies=new Map(people.map(p=>[p.id,PARENT_SESSION_COOKIE+"="+createParentSessionToken(p.id)]));
  const BASE="https://socthink.cn/english/pronunciation/classroom-api/";
  async function api(who:typeof people[number]|null,method:"GET"|"POST",segments:string[],body?:Record<string,unknown>|Uint8Array,extra:Record<string,string>={},search?:string){
    const headers:Record<string,string>={"host":"socthink.cn","accept":"application/json",...extra};
    if(who)headers.cookie=cookies.get(who.id)!;
    if(method==="POST")headers.origin="https://socthink.cn";
    let wire:BodyInit|undefined;
    if(body instanceof Uint8Array){
      headers["content-type"]="audio/webm";
      headers["x-request-id"]=extra["x-request-id"]||crypto.randomUUID();
      wire=Buffer.from(body);
    }else if(body){
      headers["content-type"]="application/json";
      wire=JSON.stringify(body);
    }
    const req=new NextRequest(BASE+segments.join("/")+(search?"?q="+encodeURIComponent(search):""),{method,headers,body:wire});
    const response=method==="POST"?await POST(req,{params:Promise.resolve({path:segments})}):
      await GET(req,{params:Promise.resolve({path:segments})});
    let json:ReturnType<typeof JSON.parse>;
    if(response.headers.get("content-type")?.includes("application/json")){
      json=await response.json();
    }else json=await response.arrayBuffer();
    return {code:response.status,json};
  }
  function ok(result:Awaited<ReturnType<typeof api>>,code=200,label=""){
    if(result.code!==code)throw Error("FAIL "+label+": HTTP "+result.code+" "+JSON.stringify(result.json).slice(0,900));
    console.log("PASS",label,"HTTP",result.code);
    return result.json;
  }
  ok(await api(null,"GET",["health"]),200,"Native Web app healthy against disposable PG18");
  ok(await api(null,"GET",["me"]),401,"No cookie denied");
  const now=ok(await api(teacher,"GET",["teacher","access"]),200,"Verified owner has classroom role");
  if(!now.approved)throw Error("Owner classroom role not recognized");
  const created=ok(await api(teacher,"POST",["teacher","onboard"],{class_name:"虚拟五人英语班"}),200,"Teacher creates one class");
  if(created.original_sentences!==9)throw Error("Expected nine original sentences");
  const tenant=created.tenant_id,cl=created.class_id;
  const base=["tenants",tenant,"classes",cl];
  // User-provided scanned textbook remains teacher-only and source-bound.
  const unauthedBook=await api(null,"GET",[...base,"books"]);
  if(unauthedBook.code!==401)throw Error("Guest can list private textbook");
  const childBook=await api(students[0],"GET",[...base,"books"]);
  if(childBook.code!==403&&childBook.code!==503)throw Error("Child can access teacher textbook");
  const myBooks=ok(await api(teacher,"GET",[...base,"books"]),200,
   "Authenticated teacher sees private Kid's Box book library");
  if(myBooks.books.length!==1||myBooks.books[0].unit_count!==12||
     !myBooks.books[0].private_teacher_only)throw Error("Wrong book availability");
  const detail=ok(await api(teacher,"GET",[...base,"books","kids-box-student-1"]),200,
   "Teacher reads exact source-derived 94 page / 12-unit index");
  if(detail.total_pdf_pages!==94||detail.sections.length!==18||
     detail.sections.filter((x:{unit_number:number|null})=>x.unit_number!==null).length!==12)
    throw Error("Incomplete textbook manifest");
  const scanned=ok(await api(teacher,"GET",[...base,"books","kids-box-student-1","pages","9"]),200,
   "Teacher accesses secured original page image");
  if(!(scanned instanceof ArrayBuffer)||scanned.byteLength<200_000)
   throw Error("Page 9 original image missing");
  // Production may use faithful 900px WEBP previews while keeping the
  // 200DPI original on Z890: verify fallback never needs public static assets.
  const mainBooksRoot=process.env.SOCTHINK_TEACHER_BOOKS_DIR!;
  const optimizedRoot=path.join(root,"private-books");
  const fixtureDir=path.join(optimizedRoot,"kids-box-student-1");
  for(const folder of ["metadata","optimized_images"])
   fs.mkdirSync(path.join(fixtureDir,folder),{recursive:true,mode:0o700});
  const originalBookRoot=path.join(mainBooksRoot,"kids-box-student-1");
  fs.copyFileSync(path.join(originalBookRoot,"metadata","book_manifest.json"),
    path.join(fixtureDir,"metadata","book_manifest.json"));
  fs.copyFileSync(path.join(originalBookRoot,"optimized_images","view-008.webp"),
    path.join(fixtureDir,"optimized_images","view-008.webp"));
  process.env.SOCTHINK_TEACHER_BOOKS_DIR=optimizedRoot;
  const fallback=ok(await api(teacher,"GET",[...base,"books","kids-box-student-1","pages","9"]),200,
   "Private optimized WEBP page if source JPG is absent on server");
  if(!(fallback instanceof ArrayBuffer)||fallback.byteLength<25_000 ||
     Buffer.from(fallback).toString("ascii",0,4)!=="RIFF" ||
     Buffer.from(fallback).toString("ascii",8,12)!=="WEBP")
    throw Error("Optimized private page was not served as WEBP");
  process.env.SOCTHINK_TEACHER_BOOKS_DIR=mainBooksRoot;

  const draft=ok(await api(teacher,"GET",[...base,"books","kids-box-student-1","pages","10","ocr"]),200,
   "Teacher sees unverified OCR, not a scoring target");
  if(draft.student_scoring_ready!==false||draft.review_status!=="unverified_ocr_draft"||
     !draft.text_draft)throw Error("OCR was incorrectly marked verified");
  // R60: suggestions are teacher-only and direct evidence from the user's
  // supplied scan; neither picture-only pages nor audio-only stories fabricate transcripts.
  const source9=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","9","ocr"]),200,
   "Teacher sees original scan page 2 without fabricated dialogue");
  if(source9.source_note?.candidate_text!=="")throw Error("Picture-only page invented dialogue");
  if(!draft.source_note||draft.source_note.printed_page!==3||
     draft.source_note.candidate_text!==["What's your name?","Goodbye"].join(String.fromCharCode(10))||
     !draft.source_note.templates.includes("Hello, I'm ...")||
     draft.student_scoring_ready!==false)
    throw Error("Page 3 source note not faithful to scanned textbook");
  const source12=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","12","ocr"]),200,
   "Teacher sees exact printed seven colour words, no automatic published assignment");
  if(JSON.stringify(source12.source_note?.practice_words)!==
     JSON.stringify(["blue","green","orange","pink","purple","red","yellow"])||
     source12.review_status!=="unverified_ocr_draft")
    throw Error("Page 5 colour-word source evidence mismatch");
  const source14=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","14","ocr"]),200,
   "Teacher sees story page with no invented original script");
  if(source14.source_note?.candidate_text!==""||
     !source14.source_note?.requires_official_audio)
    throw Error("Picture story has fabricated script");
  const unauthSource=await api(students[0],"GET",
   [...base,"books","kids-box-student-1","pages","12","ocr"]);
  if(unauthSource.code!==403&&unauthSource.code!==503)
    throw Error("Student exposed private source-derived metadata");
  console.log("KIDSBOX_R60_UNIT1_SOURCE_EVIDENCE_PASS pages=9-14 colors=7 story_no_fake_script=YES");

  // R61: Unit 2 text is sourced directly from the user's six scan pages,
  // not a guessed chant/story transcript or a model-generated textbook.
  const u2First=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","15","ocr"]),200,
   "Unit 2 page 8 has no fabricated dialogue");
  if(u2First.source_note?.unit_number!==2||
     u2First.source_note?.candidate_text!=="")
    throw Error("Unit 2 opening illustration inferred non-existent spoken text");
  const u2Words=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","16","ocr"]),200,
   "Teacher sees exact six classroom objects from printed page 9");
  if(u2Words.source_note?.unit_number!==2||
     JSON.stringify(u2Words.source_note?.practice_words)!==
     JSON.stringify(["book","chair","eraser","pen","pencil","table"])||
     !u2Words.source_note?.candidate_text.includes("Four purple chairs.")||
     !u2Words.source_note?.candidate_text.includes("No. Six orange chairs.")||
     u2Words.review_status!=="unverified_ocr_draft"||
     u2Words.student_scoring_ready!==false)
    throw Error("Unit 2 source-backed page 9 wording/review state mismatch");
  const u2Question=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","17","ocr"]),200,
   "Teacher sees incomplete unit 2 He/She templates");
  if(!u2Question.source_note?.templates.includes("He's ...")||
     !u2Question.source_note?.templates.includes("She's ..."))
    throw Error("Unit 2 incomplete speaking frames misreported");
  const u2Greeting=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","18","ocr"]),200,
   "Teacher sees printed page 11 greeting exchange");
  if(!u2Greeting.source_note?.candidate_text.includes("I'm fine, thank you."))
    throw Error("Unit 2 genuine greeting text missing");
  const u2Color=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","19","ocr"]),200,
   "Teacher sees printed page 12 colour question and phonics");
  if(!u2Color.source_note?.read_questions.includes("What colour is the bag?")||
     !u2Color.source_note?.phonics.includes("Michael monkey"))
    throw Error("Unit 2 colour and phonics evidence missing");
  const u2Story=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","20","ocr"]),200,
   "Unit 2 page 13 comic is not assigned invented spoken dialogue");
  if(u2Story.source_note?.candidate_text!==""||
     u2Story.source_note?.requires_official_audio!==true)
    throw Error("Unit 2 six-panel story falsely assigned script/audio");
  const u2Next=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","21","ocr"]),200,
   "Next verified unit has separate source note, no cross-unit contamination");
  if(u2Next.source_note?.unit_number!==3)
   throw Error("Source note not scoped to the correct reviewed unit");
  const u2Student=await api(students[0],"GET",
   [...base,"books","kids-box-student-1","pages","16","ocr"]);
  if(u2Student.code!==403&&u2Student.code!==503)
   throw Error("Student exposed unit 2 private teacher evidence");
  console.log("R61_UNIT2_SOURCE_BACKED_E2E_PASS pages=15-20 six_words=6 audio_not_fabricated=YES");

  // R62 data-only source upgrade: the unchanged R61 book router must read new
  // Unit 3 notes only when provided as verified private book metadata.
  const u3Opening=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","21","ocr"]),200,
    "Unit 3 opening picture does not generate guessed dialogue");
  if(u3Opening.source_note?.unit_number!==3||
     u3Opening.source_note?.candidate_text!=="")
    throw Error("Unit 3 invented dialogue for picture-only page");
  const u3Words=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","22","ocr"]),200,
    "Teacher sees 10 exact toy/colour words from printed book page 15");
  if(JSON.stringify(u3Words.source_note?.practice_words)!==
     JSON.stringify(["ball","bike","black","brown","car","computer",
                     "doll","grey","train","white"])||
     u3Words.student_scoring_ready!==false||
     u3Words.review_status!=="unverified_ocr_draft")
    throw Error("Unit 3 P15 list or unverified status changed");
  const u3Prepositions=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","23","ocr"]),200,
    "Teacher sees four printed position words and phrase");
  if(JSON.stringify(u3Prepositions.source_note?.practice_words)!==
     JSON.stringify(["in","on","under","next to"]))
    throw Error("Unit 3 P16 position words differ from scan");
  const u3Dialogue=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","24","ocr"]),200,
    "Teacher sees actual position question and answer");
  if(!u3Dialogue.source_note?.candidate_text.includes("Is Monty under the chair?")||
     !u3Dialogue.source_note?.candidate_text.includes("No, he isn't."))
    throw Error("Unit 3 P17 printed dialogue missing");
  const u3Phonics=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","25","ocr"]),200,
    "Teacher sees T/Tommy tortoise as only phonics clue");
  if(!u3Phonics.source_note?.phonics.includes("Tommy tortoise"))
    throw Error("Unit 3 P18 phonics source mismatch");
  const u3Story=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","26","ocr"]),200,
    "Unit 3 six-panel comic has no invented original audio or script");
  if(u3Story.source_note?.candidate_text!==""||
     u3Story.source_note?.requires_official_audio!==true)
    throw Error("Unit 3 fictional story audio/text leak");
  // R63: the same private R61 book API reads Unit 4 verified source notes.
  const u4Opening=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","27","ocr"]),200,
    "Unit 4 opening artwork has no invented dialogue");
  if(u4Opening.source_note?.unit_number!==4||
     u4Opening.source_note?.candidate_text!=="")
    throw Error("Unit 4 picture-only page invented dialogue");
  const u4Family=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","28","ocr"]),200,
    "Teacher sees six printed Unit 4 family words");
  if(JSON.stringify(u4Family.source_note?.practice_words)!==
     JSON.stringify(["mother","father","brother","sister","grandmother","grandfather"])||
     u4Family.review_status!=="unverified_ocr_draft"||
     u4Family.student_scoring_ready!==false)
    throw Error("Unit 4 family words or unverified state mismatch");
  const u4Adj=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","29","ocr"]),200,
    "Teacher sees six printed Unit 4 adjectives");
  if(JSON.stringify(u4Adj.source_note?.practice_words)!==
     JSON.stringify(["old","young","ugly","beautiful","happy","sad"]))
    throw Error("Unit 4 printed adjectives mismatch");
  const u4Song=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","30","ocr"]),200,
    "Unit 4 song has no fabricated original lyrics");
  if(u4Song.source_note?.candidate_text!==""||
     u4Song.source_note?.requires_official_audio!==true)
    throw Error("Unit 4 fake song transcript");
  const u4Bertie=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","31","ocr"]),200,
    "Teacher sees printed B Bertie bat and fixed correction dialogue");
  if(!u4Bertie.source_note?.phonics.includes("Bertie bat")||
     !u4Bertie.source_note?.candidate_text.includes("She's beautiful.")||
     !u4Bertie.source_note?.candidate_text.includes("No, she isn't. She's ugly."))
    throw Error("Unit 4 phonics or printed correction dialogue missing");
  const u4Story=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","32","ocr"]),200,
    "Unit 4 six-panel story has no fabricated spoken lines");
  if(u4Story.source_note?.candidate_text!==""||
     u4Story.source_note?.requires_official_audio!==true)
    throw Error("Unit 4 fabricated story audio/transcript");
  const review1NotReady=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","33","ocr"]),200,
    "Review 1 stays unsupported until a separate verified source reader exists");
  if(review1NotReady.source_note!==null)
    throw Error("Unreviewed Review 1 impersonates verified unit source");
  // R64: Unit 5 verified private source, same unchanged router and safety boundary.
  const u5Opening=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","35","ocr"]),200,
    "Unit 5 opening picture does not invent pet conversation");
  if(u5Opening.source_note?.unit_number!==5||
     u5Opening.source_note?.candidate_text!=="")
    throw Error("Unit 5 opening image falsely assigned dialogue");
  const u5Pets=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","36","ocr"]),200,
    "Teacher sees six pets from printed Unit 5 page 29");
  if(JSON.stringify(u5Pets.source_note?.practice_words)!==
     JSON.stringify(["bird","cat","dog","fish","horse","mouse"])||
     u5Pets.review_status!=="unverified_ocr_draft"||
     u5Pets.student_scoring_ready!==false)
    throw Error("Unit 5 pet words or unverified review state mismatch");
  const u5Adjectives=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","37","ocr"]),200,
    "Teacher sees six printed pet adjectives");
  if(JSON.stringify(u5Adjectives.source_note?.practice_words)!==
     JSON.stringify(["big","small","long","short","clean","dirty"]))
    throw Error("Unit 5 adjective words not source faithful");
  const u5Song=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","38","ocr"]),200,
    "Unit 5 song and action page does not invent lyrics");
  if(u5Song.source_note?.candidate_text!==""||
     u5Song.source_note?.requires_official_audio!==true)
    throw Error("Unit 5 song invented transcript");
  const u5Penny=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","39","ocr"]),200,
    "Teacher sees Penny penguin and printed guess-game examples");
  if(!u5Penny.source_note?.phonics.includes("Penny penguin")||
     !u5Penny.source_note?.candidate_text.includes("It's beautiful and orange.")||
     !u5Penny.source_note?.candidate_text.includes("Number two. The fish."))
    throw Error("Unit 5 P phonics or printed guessing lines missing");
  const u5Story=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","40","ocr"]),200,
    "Unit 5 six-panel story has no fictional original dialogue");
  if(u5Story.source_note?.candidate_text!==""||
     u5Story.source_note?.requires_official_audio!==true)
    throw Error("Unit 5 fake story audio/text");
  const u6NotReady=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","41","ocr"]),200,
    "Next not-yet-reviewed unit has no verified private hint");
  if(u6NotReady.source_note!==null)
    throw Error("Unverified Unit 6 falsely marked verified source");
  // R65: Unit 6 original scanned page evidence, including the difference
  // between an incomplete grammar template and a printed fixed dialogue.
  const u6Open=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","41","ocr"]),200,
    "Unit 6 picture labels do not invent a recorded dialogue");
  if(u6Open.source_note?.unit_number!==6||
     u6Open.source_note?.candidate_text!=="")
    throw Error("Unit 6 face illustration misreported as original speech");
  const u6Parts=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","42","ocr"]),200,
    "Teacher sees six original Unit 6 face words");
  if(JSON.stringify(u6Parts.source_note?.practice_words)!==
     JSON.stringify(["face","ears","eyes","mouth","nose","teeth"])||
     u6Parts.review_status!=="unverified_ocr_draft"||
     u6Parts.student_scoring_ready!==false)
    throw Error("Unit 6 printed word order or teacher-review guard mismatch");
  const u6Grammar=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","43","ocr"]),200,
    "Incomplete have-got templates do not become invented full answers");
  if(!u6Grammar.source_note?.templates.includes("I've got ...")||
     !u6Grammar.source_note?.templates.includes("Have you got ...?")||
     !u6Grammar.source_note?.candidate_text.includes("No, I haven't."))
    throw Error("Unit 6 source-printed templates or fixed replies missing");
  const u6Song=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","44","ocr"]),200,
    "Unit 6 monster song has no invented original lyrics");
  if(u6Song.source_note?.candidate_text!==""||
     u6Song.source_note?.requires_official_audio!==true)
    throw Error("Unit 6 fake song audio/transcript");
  const u6Henry=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","45","ocr"]),200,
    "H Henry horse and exact fixed original question are preserved");
  if(!u6Henry.source_note?.phonics.includes("Henry horse")||
     !u6Henry.source_note?.read_questions.includes("Have you got a black dog?")||
     !u6Henry.source_note?.candidate_text.includes("Yes, I have."))
    throw Error("Unit 6 phonics or printed dialogue mismatch");
  const u6Story=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","46","ocr"]),200,
    "Unit 6 story and yes/no activity lack invented original answers");
  if(u6Story.source_note?.candidate_text!==""||
     u6Story.source_note?.requires_official_audio!==true)
    throw Error("Unit 6 story audio/yes-no answers fabricated");
  const u7NotReady=ok(await api(teacher,"GET",
    [...base,"books","kids-box-student-1","pages","47","ocr"]),200,
    "Unit 7 remains without verified teacher notes");
  if(u7NotReady.source_note!==null)
    throw Error("Unreviewed Unit 7 mislabelled verified");
  const studentUnit6=await api(students[0],"GET",
    [...base,"books","kids-box-student-1","pages","42","ocr"]);
  if(studentUnit6.code!==403&&studentUnit6.code!==503)
    throw Error("Student accessed private Unit 6 face words");
  console.log("R65_UNIT6_PRIVATE_SOURCE_E2E_PASS pages=41-46 parts=6 fixed_dialogue=YES no_fake_story=YES");
  const studentUnit5=await api(students[0],"GET",
    [...base,"books","kids-box-student-1","pages","36","ocr"]);
  if(studentUnit5.code!==403&&studentUnit5.code!==503)
    throw Error("Student accessed teacher-only Unit 5 notes");
  console.log("R64_UNIT5_PRIVATE_SOURCE_E2E_PASS pages=35-40 pets=6 adjectives=6 no_fake_story=YES");
  const studentUnit4=await api(students[0],"GET",
    [...base,"books","kids-box-student-1","pages","28","ocr"]);
  if(studentUnit4.code!==403&&studentUnit4.code!==503)
    throw Error("Student exposed Unit 4 private teacher notes");
  console.log("R63_UNIT4_PRIVATE_SOURCE_E2E_PASS pages=27-32 family=6 adjectives=6 no_fake_story=YES");
  const studentUnit3=await api(students[0],"GET",
    [...base,"books","kids-box-student-1","pages","22","ocr"]);
  if(studentUnit3.code!==403&&studentUnit3.code!==503)
    throw Error("Student exposed Unit 3 private teacher metadata");
  console.log("R62_UNIT3_PRIVATE_SOURCE_E2E_PASS pages=21-26 toy_words=10 positions=4 no_fake_story=YES");



  const rawTeacherReview="Hello, I'm a teacher. What is your name?";
  const childEdit=await api(students[0],"POST",
   [...base,"books","kids-box-student-1","pages","10","review"],
   {text:rawTeacherReview,expected_version:0,confirmed_original:true});
  if(childEdit.code!==403&&childEdit.code!==503)
   throw Error("Student edited teacher-only source page");
  const unconfirmed=await api(teacher,"POST",
   [...base,"books","kids-box-student-1","pages","10","review"],
   {text:rawTeacherReview,expected_version:0,confirmed_original:false});
  if(unconfirmed.code!==400)throw Error("Unconfirmed OCR review saved");
  const savedPage=ok(await api(teacher,"POST",
   [...base,"books","kids-box-student-1","pages","10","review"],
   {text:rawTeacherReview,expected_version:0,confirmed_original:true}),200,
   "Teacher persists verified original-book page to class-scoped PG18");
  if(savedPage.reviewed_version!==1)throw Error("Initial page review version incorrect");
  const restoredPage=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","10","ocr"]),200,
   "Teacher reopens book page and gets persisted verified text");
  if(restoredPage.review_status!=="teacher_verified"||
     restoredPage.reviewed_version!==1||
     restoredPage.text_draft!==rawTeacherReview||
     restoredPage.student_scoring_ready!==false)
    throw Error("Page review overwritten or incorrectly counted as automatically publishable");
  const stale=await api(teacher,"POST",
   [...base,"books","kids-box-student-1","pages","10","review"],
   {text:"Conflicting edit",expected_version:0,confirmed_original:true});
  if(stale.code!==409)throw Error("Stale teacher editor overwrote saved review");
  const updatedReview=ok(await api(teacher,"POST",
   [...base,"books","kids-box-student-1","pages","10","review"],
   {text:"Hello, I'm a pupil. What's your name?",expected_version:1,confirmed_original:true}),200,
   "Teacher can update reviewed page with optimistic locking");
  if(updatedReview.reviewed_version!==2)throw Error("Reviewed page version not incremented");
  const separatePage=ok(await api(teacher,"GET",
   [...base,"books","kids-box-student-1","pages","11","ocr"]),200,
   "Review of page 10 does not mark page 11 teacher-verified");
  if(separatePage.review_status==="teacher_verified")throw Error("One page review leaked to other page");
  console.log("KIDSBOX_REVIEW_PERSISTENCE_PASS saved=1 revised=2 conflict=409 student=denied");

  const unitPdf=ok(await api(teacher,"GET",[...base,"books","kids-box-student-1","sections","unit-01"]),200,
   "Teacher may preview private six-page original unit PDF");
  if(!(unitPdf instanceof ArrayBuffer)||unitPdf.byteLength<3_000_000)
   throw Error("Unit 1 page archive missing");
  console.log("KIDS_BOX_PRIVATE_LIBRARY_E2E_PASS pages=94 units=12 sections=18 guest=denied child=denied OCR=unverified");
  const classes=ok(await api(teacher,"GET",["teacher","classes"]),200,"Teacher lists own class");
  if(classes.classes.length!==1)throw Error("Expected exactly one class");
  const catalog=ok(await api(teacher,"GET",[...base,"catalog"]),200,"Teacher sees nine sentences");
  if(catalog.items.length!==9)throw Error("Catalog must contain 9 sentences");
  // Guard against self-publishing, malformed uploads and duplicate material.
  const outsider=await api(students[0],"POST",[...base,"materials"],{
    title:"Malicious material",sentences:["Student must not create a teacher assignment."],
    rights_confirmed:true
  });
  if(outsider.code!==403&&outsider.code!==503)throw Error("Non-teacher was able to upload classroom materials; status="+outsider.code);
  const invalidDuplicates=await api(teacher,"POST",[...base,"materials"],{
    title:"Duplicate sentences",sentences:[
      "The same sentence must not appear twice in one teacher upload.",
      "The same sentence must not appear twice in one teacher upload."
    ],rights_confirmed:true
  });
  if(invalidDuplicates.code!==400)throw Error("Duplicate teacher sentences were accepted");
  const tooMany=await api(teacher,"POST",[...base,"materials"],{
    title:"Too many sentences",sentences:Array.from({length:81},(_,i)=>
      "This teacher sentence is numbered "+i+" for a batch size boundary check."),
    rights_confirmed:true
  });
  if(tooMany.code!==400)throw Error("Above 80 sentence upload limit was accepted");
  console.log("PASS Material role permission and input boundaries");
  const customText="My teacher wants every student to read this exact sentence aloud.";
  const rejected=await api(teacher,"POST",[...base,"materials"],{
    title:"Chapter 3",sentences:[customText],rights_confirmed:false
  });
  if(rejected.code!==400)throw Error("Missing material rights confirmation accepted");
  const material=ok(await api(teacher,"POST",[...base,"materials"],{
    title:"Chapter 3 uploaded English text",sentences:[customText],rights_confirmed:true
  }),200,"Teacher imports their own exact sentence material");
  const updated=ok(await api(teacher,"GET",[...base,"catalog"]),200,"Teacher reads uploaded material in the same catalog");
  const first=updated.items.find((row:{sentence_set_id:string})=>row.sentence_set_id===material.set_id);
  if(!first||first.sentence!==customText)throw Error("Imported teacher sentence not returned exactly");
  const roster=students.map((_,i)=>"模拟学生"+(i+1));
  ok(await api(teacher,"POST",[...base,"expected-roster"],{names:roster}),200,"Teacher imports five student names");
  const invalidRole=await api(teacher,"POST",[...base,"assignments"],{
    title:"错误角色",sentence_set_id:material.set_id,sentence_ids:[first.id],
    speaker_labels:["<script>"]
  });
  if(invalidRole.code!==400)throw Error("Invalid teacher speaker label accepted");
  const invalidRoleCount=await api(teacher,"POST",[...base,"assignments"],{
    title:"角色数量不一致",sentence_set_id:material.set_id,sentence_ids:[first.id],
    speaker_labels:["A","B"]
  });
  if(invalidRoleCount.code!==400)throw Error("Mismatched speaker label count accepted");
  const assignment=ok(await api(teacher,"POST",[...base,"assignments"],{
    title:"虚拟课堂角色对话作业",sentence_set_id:material.set_id,sentence_ids:[first.id],
    speaker_labels:["A"]
  }),200,"Teacher publishes uploaded roleplay line via WeChat invitation");
  const link=String(assignment.share_url);
  const match=link.match(/\/a\/[0-9a-f-]{36}\/([0-9a-f]{64})$/i);
  if(!match||!link.startsWith("https://socthink.cn/"))throw Error("Invalid teacher share link");
  const share=match[1],assignmentId=assignment.assignment_id;
  // R57 words are first-class items, not short fake sentences.
  const deniedEmpty=await api(teacher,"POST",[...base,"word-assignments"],{
    title:"无效词表",words:[],rights_confirmed:true
  });
  if(deniedEmpty.code!==400)throw Error("Empty word assignment accepted");
  const deniedTranslation=await api(teacher,"POST",[...base,"word-assignments"],{
    title:"注入测试",words:["school <b>"],rights_confirmed:true
  });
  if(deniedTranslation.code!==400)throw Error("Markup word target accepted");
  const createdWords=ok(await api(teacher,"POST",[...base,"word-assignments"],{
    title:"五年级生词专项",words:["school","beautiful"],rights_confirmed:true
  }),200,"Teacher creates separate vocabulary assignment");
  const matchWord=String(createdWords.share_url).match(new RegExp("/w/[0-9a-f-]{36}/([0-9a-f]{64})$","i"));
  if(!matchWord)throw Error("Wrong vocabulary share URL");
  const wordToken=matchWord[1];
  const beforeJoin=ok(await api(students[0],"GET",["tenants",tenant,"w",wordToken]),200,
    "Unenrolled student sees no teacher words");
  if(beforeJoin.status!=="join_required"||beforeJoin.items.length)
    throw Error("Word list exposed before class admission");
  const wordAssignmentId=createdWords.assignment_id;
  const audio=new Uint8Array(fs.readFileSync(canaryPath));
  if(audio.length<1024||audio.length>2*1024*1024)throw Error("Canary outside 1KB..2MB");
  const originalFetch=globalThis.fetch;
  globalThis.fetch=((input:RequestInfo|URL,init?:RequestInit)=>{
    const src=String(input);
    // Test-only redirect to the already-live local OpenPronounce; never mock its scores.
    if(src==="http://127.0.0.1:18099/pronunciation")
      return originalFetch("http://127.0.0.1:8099/pronunciation",init);
    return originalFetch(input,init);
  }) as typeof fetch;
  const studentAttempts:string[]=[];
  for(let i=0;i<students.length;i++){
    const student=students[i];
    const name=roster[i];
    const join=ok(await api(student,"POST",["tenants",tenant,"a",share,"join"],{
      student_name:name,grade_label:"五年级"
    }),200,"Student "+(i+1)+" applies");
    if(join.status!=="pending")throw Error("Student unexpectedly auto-approved");
    const pending=ok(await api(teacher,"GET",[...base,"join-requests"]),200,"Teacher sees join request "+(i+1));
    const reqRow=pending.requests.find((x:{student_name:string})=>x.student_name===name);
    if(!reqRow)throw Error("Missing pending student "+(i+1));
    ok(await api(teacher,"POST",[...base,"join-requests",reqRow.id,"decision"],{
      approve:true,assigned_class_id:cl
    }),200,"Teacher approves student "+(i+1));
    const homework=ok(await api(student,"GET",["tenants",tenant,"a",share]),200,"Student "+(i+1)+" reads assignment");
    if(homework.items.length!==1||homework.items[0].sentence_id!==first.id||
       homework.items[0].sentence!==customText||homework.items[0].speaker!=="A")
      throw Error("Student sees wrong text or lost role label");
    ok(await api(student,"POST",["tenants",tenant,"a",share,"claim"]),200,"Student "+(i+1)+" claims homework");
    const attempt=ok(await api(student,"POST",
      ["tenants",tenant,"a",share,"items",first.id,"attempts"],audio),200,
      "Student "+(i+1)+" gets REAL OpenPronounce score");
    if(typeof attempt.score!=="number"||attempt.score<0||attempt.score>100||!attempt.submitted)
      throw Error("Invalid model score or submission state");
    studentAttempts.push(attempt.attempt_id);
    const mine=ok(await api(student,"GET",["tenants",tenant,"assignments",assignmentId,"my-attempts"]),200,
      "Student "+(i+1)+" views own result");
    if(mine.attempt_count!==1||!mine.submitted)throw Error("Student own result not saved");
  }
  // Five enrolled students score the TWO exact teacher-provided words.
  let firstWordAttempt="";
  for(let i=0;i<students.length;i++){
    const student=students[i];
    const wordSheet=ok(await api(student,"GET",["tenants",tenant,"w",wordToken]),200,
      "Student "+(i+1)+" opens real word homework");
    if(wordSheet.items.length!==2||wordSheet.items[0].word!=="school"||
       wordSheet.items[1].word!=="beautiful")
      throw Error("Word targets corrupted or word score fabricated");
    for(const [j,item] of wordSheet.items.entries()){
      const repeatKey=i===0&&j===0?crypto.randomUUID():undefined;
      const result=ok(await api(student,"POST",
       ["tenants",tenant,"w",wordToken,"items",item.item_id,"attempts"],audio,
       repeatKey?{"x-request-id":repeatKey}:{}),200,
       "Student "+(i+1)+" scores original word "+item.word);
      if(repeatKey){
       const repeat=ok(await api(student,"POST",
        ["tenants",tenant,"w",wordToken,"items",item.item_id,"attempts"],audio,
        {"x-request-id":repeatKey}),200,"Identical word recording request idempotency");
       if(!repeat.duplicate||repeat.attempt_id!==result.attempt_id||
          repeat.score!==result.score)
         throw Error("Duplicate request incorrectly re-scored or wrote another attempt");
       // Reusing an idempotency key for a DIFFERENT word must not silently
       // return the previous word's score as the new item's result.
       const wrongWord=await api(student,"POST",
        ["tenants",tenant,"w",wordToken,"items",wordSheet.items[1].item_id,"attempts"],
        audio,{"x-request-id":repeatKey});
       if(wrongWord.code!==409)throw Error("Cross-item request ID was not rejected");
      }
      if(!Number.isFinite(result.score)||result.score<0||result.score>100||
         result.submitted!==(j===1))
        throw Error("Word scorer failed to return authentic grade or completion state");
      if(i===0&&j===0)firstWordAttempt=result.attempt_id;
    }
    const done=ok(await api(student,"GET",["tenants",tenant,"w",wordToken]),200,
      "Student "+(i+1)+" sees word completion");
    if(!done.submitted||done.attempts.length!==2)
      throw Error("Word homework receipt incomplete");
  }
  const wordsReport=ok(await api(teacher,"GET",
    ["tenants",tenant,"word-assignments",wordAssignmentId,"report"]),200,
    "Teacher views a separate 5-student word-score report");
  if(wordsReport.submitted!==5||wordsReport.total!==5||
      wordsReport.items.length!==2||wordsReport.attempt_history.length!==10||
      wordsReport.students.some((x:{completed_words:number})=>x.completed_words!==2))
    throw Error("Teacher word report inconsistent");
  const foreignAudio=await api(students[1],"GET",["tenants",tenant,"word-recordings",firstWordAttempt]);
  if(foreignAudio.code!==403&&foreignAudio.code!==503)
    throw Error("Another student accessed private word recording");
  const ownWordAudio=await api(students[0],"GET",["tenants",tenant,"word-recordings",firstWordAttempt]);
  if(ownWordAudio.code!==200)throw Error("Owner cannot replay own word recording: "+ownWordAudio.code);
  const historyWords=ok(await api(teacher,"GET",[...base,"word-assignments"]),200,
   "Teacher lists only independent vocabulary assignments");
  if(historyWords.assignments.length!==1||historyWords.assignments[0].submitted!==5)
   throw Error("Word history missing 5 completed students");
  const newLink=ok(await api(teacher,"POST",
   ["tenants",tenant,"word-assignments",wordAssignmentId,"renew"],{}),200,
   "Teacher safely rotates a lost vocabulary share link");
  const expired=await api(students[0],"GET",["tenants",tenant,"w",wordToken]);
  if(expired.code!==404)throw Error("Old word share token still works after renewal");
  const newToken=String(newLink.share_url).split("/").at(-1)!;
  const newlyOpen=ok(await api(students[0],"GET",["tenants",tenant,"w",newToken]),200,
   "New word link still opens the same saved assignment");
  if(!newlyOpen.submitted)throw Error("Renewal lost existing word grades");
  ok(await api(teacher,"POST",["tenants",tenant,"word-assignments",wordAssignmentId,"close"],{}),200,
   "Teacher closes vocabulary share link");
  const stopped=await api(students[0],"GET",["tenants",tenant,"w",newToken]);
  if(stopped.code!==404)throw Error("Closed word share token still works");
  console.log("R57_WORD_HOMEWORK_REAL_SCORER_E2E_PASS students=5 words=2 scored=10 submitted=5 duplicate=safe renewal=safe");
  const report=ok(await api(teacher,"GET",["tenants",tenant,"assignments",assignmentId,"report"]),200,
    "Teacher obtains 5-student summary");
  if(report.total!==5||report.submitted!==5||report.students.length!==5)
    throw Error("Expected exactly 5/5 completed, got "+JSON.stringify(report).slice(0,1000));
  console.log("NATIVE_CLASSROOM_FIVE_STUDENT_REPORT_PASS total="+report.total+" completed="+report.submitted);
  console.log("R56_ROLE_LABEL_NOT_IN_SCORE_TARGET_PASS speaker=A, text="+customText);
  const records=ok(await api(teacher,"GET",[...base,"assignments","list"]),200,
    "Teacher views permanent assignment history and statistics");
  if(records.assignments.length!==1||records.assignments[0].submitted!==5||
     records.assignments[0].enrolled_total!==5||
     typeof records.assignments[0].average_best_score!=="number")
    throw Error("Assignment history metrics missing or inconsistent");
  console.log("PASS Uploaded-material homework appears in historical metrics");
  const forbidden=await api(students[1],"GET",["tenants",tenant,"recordings",studentAttempts[0]]);
  if(forbidden.code!==403&&forbidden.code!==503)throw Error("Other student may access private recording: "+forbidden.code);
  console.log("PASS Recording private across students");
  const ownAudio=await api(students[0],"GET",["tenants",tenant,"recordings",studentAttempts[0]]);
  if(ownAudio.code!==200)throw Error("Own private recording unavailable: "+ownAudio.code);
  console.log("PASS Student privately downloads own recording");
  ok(await api(teacher,"POST",["tenants",tenant,"assignments",assignmentId,"feedback"],{
    student_id:learnerId(students[0].id),attempt_id:studentAttempts[0],word_position:0,comment:"音量稳定，继续练习。"
  }),200,"Teacher writes feedback");
  const wall=ok(await api(students[0],"GET",["tenants",tenant,"a",share,"wall"]),200,"Student sees class wall");
  if(wall.submitted!==5)throw Error("Class wall must show five submissions");
  ok(await api(teacher,"POST",["tenants",tenant,"assignments",assignmentId,"close"]),200,
    "Teacher closes uploaded-material assignment");
  const closed=ok(await api(teacher,"GET",[...base,"assignments","list"]),200,
    "Closed historical homework remains in teacher history");
  if(closed.assignments[0]?.lifecycle!=="closed"||closed.assignments[0]?.submitted!==5)
    throw Error("Closed homework disappeared or statistics were lost");
  console.log("R56_OWNER_AS_TEACHER_ISOLATED_E2E teacher=owner; external platform grants bypassed only in disposable test");
  console.log("SOCTHINK_CLASSROOM_TEACHER_MATERIALS_HISTORY_E2E_PASS teacher=1 students=5 custom_sentence=true scored=5 history=true closed=true");
  success=true;
}finally {
  if(closePool){
    try{await closePool();console.log("ISOLATED_PG_POOL_CLOSED_PASS");}
    catch(err){success=false;console.error("ISOLATED_PG_POOL_CLOSE_FAIL",String(err));}
  }
  if(started){
    const stop=spawnSync(PG+"/pg_ctl",["-D",data,"-m","immediate","-w","stop"],
      {encoding:"utf8",timeout:20000});
    if(stop.status!==0)console.error("TEST_POSTGRES_STOP_ERROR",String(stop.stderr||"").slice(0,700));
  }
  fs.rmSync(root,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  console.log("ISOLATED_TEST_STORAGE_CLEANED",success);
}
}
main().catch(err=>{console.error("CLASSROOM_NATIVE_E2E_FAIL",err instanceof Error?err.message:String(err));process.exitCode=1});
