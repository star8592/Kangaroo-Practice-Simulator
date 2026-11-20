import path from "node:path";
import {readFile,access} from "node:fs/promises";
import type {NextRequest} from "next/server";
import {
 type Actor,ClassroomFailure,id,teacher,tx
} from "@/lib/classroom-web-core";

const BOOK_ID="kids-box-student-1";
const SOURCE_SHA="67e8ae9405469552379e29e18a1b2058865f12beb99907b3a2d88c5da50ac31d";
const ROOT=()=>path.join(
 process.env.SOCTHINK_TEACHER_BOOKS_DIR?.trim()||"/var/lib/socthink/teacher-books",BOOK_ID
);
type BookSection={id:string;title:string;unit_number:number|null;
 start_pdf_page:number;end_pdf_page:number;page_count:number;pages:number[];
 printed_start_page:number|null;ocr_review_status:string;audio_source_status:string};
type BookManifest={id:string;title:string;source_sha256:string;source_pdf_pages:number;
 source_type:string;sections:BookSection[]};
async function manifest():Promise<BookManifest>{
 try{
  const data=JSON.parse(await readFile(path.join(ROOT(),"metadata/book_manifest.json"),"utf8")) as BookManifest;
  if(data.id!==BOOK_ID||data.source_sha256!==SOURCE_SHA||
    data.source_pdf_pages!==94||data.sections.length!==18)
   throw new Error("Book manifest checksum and page coverage mismatch");
  return data;
 }catch{throw new ClassroomFailure(503,"教材库正在初始化，请稍后再试")}
}
const safeSection=(x:string)=>/^(?:unit-\d{2}|review-\d{2}|front|word-list|back)$/.test(x);
async function pageDraft(p:number){
 try{
  const data=JSON.parse(await readFile(
   path.join(ROOT(),"ocr","page-"+String(p).padStart(3,"0")+".json"),"utf8")) as
   {text_draft:string;confidence:number;source_sha256:string};
  if(data.source_sha256!==SOURCE_SHA)throw new Error("Revision mismatch");
  return {pdf_page:p,confidence:data.confidence,text_draft:data.text_draft,
   review_status:"unverified_ocr_draft",student_scoring_ready:false};
 }catch{
  return {pdf_page:p,confidence:null,text_draft:"",
   review_status:"not_available",student_scoring_ready:false};
 }
}
function privateMedia(data:Buffer,type:string,name?:string):Response{
 return new Response(new Uint8Array(data),{headers:{
  "Content-Type":type,"Cache-Control":"private, no-store",
  "X-Content-Type-Options":"nosniff",
  "Content-Length":String(data.byteLength),
  ...(name?{"Content-Disposition":'inline; filename="'+name+'"'}:{})
 }});
}
/** The exact user-supplied book is teacher-only, never under Next public assets.
 * Students get only teacher-approved words/sentences through ordinary homework.
 */
export async function teacherBookHandler(req:NextRequest,p:string[],a:Actor):
 Promise<unknown|Response|undefined>{
 if(p[0]!=="tenants"||p[2]!=="classes"||p[4]!=="books"||p.length<5)
  return undefined;
 if(req.method!=="GET")throw new ClassroomFailure(405,"教材库只支持读取");
 const tenant=id(p[1]),cl=id(p[3]);
 return tx({tenant,account:a.accountId},async db=>{
  await teacher(db,a,tenant,cl);
  const book=await manifest();
  const overview={id:BOOK_ID,title:book.title,total_pdf_pages:book.source_pdf_pages,
    source_type:"scanned_pdf",unit_count:12,section_count:18,
    audio_available:false,private_teacher_only:true,
    ocr_drafts_require_manual_review:true};
  if(p.length===5)return {books:[overview]};
  if(p[5]!==BOOK_ID)throw new ClassroomFailure(404,"教材不存在");
  if(p.length===6){
   const sections=await Promise.all(book.sections.map(async x=>{
    const pdfPath=path.join(ROOT(),"sections",x.id+".pdf");
    const sectionPdfReady=await access(pdfPath).then(()=>true).catch(()=>false);
    return {
     id:x.id,title:x.title,unit_number:x.unit_number,
     start_pdf_page:x.start_pdf_page,end_pdf_page:x.end_pdf_page,
     printed_start_page:x.printed_start_page,
     page_count:x.page_count,pages:x.pages,
     section_pdf_ready:sectionPdfReady,
     ocr_review_status:"not_reviewed",audio_source_status:"not_supplied"
    };
   }));
   return {...overview,sections};
  }
  if(p[6]==="pages"&&(p.length===8||p.length===9)){
   const page=Number(p[7]);
   if(!Number.isInteger(page)||page<1||page>94||String(page)!==p[7])
    throw new ClassroomFailure(404,"页码不存在");
   if(p.length===9&&p[8]==="ocr")return pageDraft(page);
   if(p.length!==8)throw new ClassroomFailure(404,"教材接口不存在");
   const key="raw-"+String(page-1).padStart(3,"0")+".jpg";
   const original=await readFile(path.join(ROOT(),"images",key)).catch(()=>null);
   if(original)return privateMedia(original,"image/jpeg");
   // Faithful, optimized browser previews permit all pages to be served
   // privately even if the much larger source scans are retained on Z890.
   const webp="view-"+String(page-1).padStart(3,"0")+".webp";
   const optimized=await readFile(path.join(ROOT(),"optimized_images",webp)).catch(()=>null);
   if(!optimized)throw new ClassroomFailure(404,"教材页暂时不可用");
   return privateMedia(optimized,"image/webp");
  }
  if(p[6]==="sections"&&p.length===8&&safeSection(p[7])){
   const sec=book.sections.find(s=>s.id===p[7]);
   if(!sec)throw new ClassroomFailure(404,"教材单元不存在");
   const bytes=await readFile(path.join(ROOT(),"sections",sec.id+".pdf")).catch(()=>null);
   if(!bytes)throw new ClassroomFailure(404,"该教材单元尚未准备好");
   return privateMedia(bytes,"application/pdf",sec.id+".pdf");
  }
  throw new ClassroomFailure(404,"教材接口不存在");
 });
}
