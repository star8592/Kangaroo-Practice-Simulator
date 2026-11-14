import {NextRequest,NextResponse} from "next/server";
import {ClassroomFailure,actor,tx,writeOrigin} from "@/lib/classroom-web-core";
import {teacherHandler,assignmentTeacherHandler} from "@/lib/classroom-web-teacher";
import {studentHandler} from "@/lib/classroom-web-student";
import {assessmentHandler} from "@/lib/classroom-web-assessment";

/** SOC THINK native classroom API. Runs in the already deployed Next.js Web
 * process on port 3000. It does not launch a second Rust/Node HTTP service.
 */
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
type Context={params:Promise<{path:string[]}>};
async function handle(req:NextRequest,context:Context):Promise<Response>{
  try{
    const {path}=await context.params;
    if(!Array.isArray(path)||path.length<1||path.length>9||
      path.some(p=>!p||p.length>160||!/^[-_a-zA-Z0-9]+$/.test(p)))
      throw new ClassroomFailure(404,"课堂接口不存在");
    if(path.length===1&&path[0]==="health"&&req.method==="GET"){
      return NextResponse.json(await tx({},async db=>{
        await db.query("SELECT 1");
        return {status:"ok",service:"socthink-web-classroom",
          auth:"socthink-unified-wechat",storage:"shared-postgresql-18",
          readiness:"postgres-select-1-v1",runtime:"existing-nextjs"};
      }),{headers});
    }
    if(req.method==="POST")writeOrigin(req);
    if(req.method!=="POST"&&req.method!=="GET")
      throw new ClassroomFailure(405,"不支持的请求方法");
    const user=actor(req);
    if(path.length===1&&path[0]==="me"&&req.method==="GET"){
      return NextResponse.json({account_id:user.accountId,is_admin:user.admin},{headers});
    }
    const result=await teacherHandler(req,path,user) ??
      await assignmentTeacherHandler(req,path,user) ??
      await studentHandler(req,path,user) ??
      await assessmentHandler(req,path,user);
    if(result===undefined)throw new ClassroomFailure(404,"课堂接口不存在");
    if(result instanceof Response)return result;
    return NextResponse.json(result,{headers});
  }catch(err){
    if(err instanceof ClassroomFailure)
      return NextResponse.json({error:err.message},{status:err.status,headers});
    // Do not leak SQL, DB credentials, student data, OAuth cookies or audio.
    console.error("classroom_web_request_failed",err instanceof Error?err.name:"unknown");
    return NextResponse.json({error:"课堂暂时不可用，请稍后重试"},{status:503,headers});
  }
}
export async function GET(req:NextRequest,ctx:Context){return handle(req,ctx)}
export async function POST(req:NextRequest,ctx:Context){return handle(req,ctx)}
