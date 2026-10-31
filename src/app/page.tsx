import PublicHome from "@/components/PublicHome";
import { SITE_BRAND } from "@/lib/site-brand";

export const metadata = { alternates: { canonical: "/" } };

// Only verified public facts; no fabricated organization details or social links.
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://socthink.cn/#organization",
  "name": SITE_BRAND.nameEn,
  "url": "https://socthink.cn/",
  "description": SITE_BRAND.description,
};

export default function Home() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{
      __html: JSON.stringify(organization).replace(/</g, "\\u003c"),
    }} />
    <PublicHome/>
  </>;
}
