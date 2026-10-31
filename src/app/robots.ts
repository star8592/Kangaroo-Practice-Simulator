import type { MetadataRoute } from "next";

// Public content is discoverable; authorization, not robots, protects private data.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/parent/",
        "/student/",
        "/report/",
        "/result",
        "/review",
        "/login",
        "/verification",
        "/exam/",
        "/arithmetic/session/",
        "/arithmetic/discovery/",
      ],
    },
    sitemap: "https://socthink.cn/sitemap.xml",
  };
}
