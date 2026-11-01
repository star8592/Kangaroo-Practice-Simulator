import {NextResponse} from "next/server";
import {getCareerGuide,careerGuideToMarkdown} from "@/lib/career-original-guides";

export const runtime="nodejs";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const guide=getCareerGuide(id);
  if(!guide||guide.deliveryState!=="free-original-material")
    return new NextResponse("未找到可公开交付的原创教程",{status:404,
      headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
  const markdown=careerGuideToMarkdown(guide);
  return new NextResponse(markdown,{
    status:200,headers:{
      "Content-Type":"text/markdown; charset=utf-8",
      "Content-Disposition":"attachment; filename=\"socthink-"+guide.id+".md\"; filename*=UTF-8''"+encodeURIComponent(guide.fileName),
      "Cache-Control":"public, max-age=3600",
      "X-Content-Type-Options":"nosniff",
    },
  });
}
