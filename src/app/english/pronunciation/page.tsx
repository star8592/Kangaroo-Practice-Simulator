import type {Metadata} from "next";
import EnglishStudioPage from "@/components/EnglishStudioPage";
import {englishProduct} from "@/lib/english-products";
const product=englishProduct("pronunciation");
export const metadata:Metadata={title:product.name+" · "+product.product+"｜SOC THINK",description:product.summary,alternates:{canonical:product.href}};
export default function Page(){return <EnglishStudioPage studio="pronunciation"/>;}
