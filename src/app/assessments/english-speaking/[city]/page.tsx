import {notFound,redirect} from "next/navigation";
import {SPEAKING_REGIONS,cityDefault,regionPath} from "@/lib/english-speaking-regions";
export const dynamicParams=false;
export function generateStaticParams(){return [...new Set(SPEAKING_REGIONS.map(r=>r.city))].map(city=>({city}));}
export default async function CityAlias({params}:{params:Promise<{city:string}>}){
 const {city}=await params;const region=cityDefault(city);if(!region)notFound();redirect(regionPath(region));
}
